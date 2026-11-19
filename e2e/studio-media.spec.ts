import { expect, test, type Page } from '@playwright/test';
import { accounts, signIn } from './helpers';

/**
 * Load a page until a just-saved change shows. Production occasionally answers the first
 * request after a write with the previous render, so reloading for a moment is honest about
 * the platform; a save that never lands still fails here after the budget.
 */
async function loadUntil(page: Page, url: string, ready: () => Promise<boolean>): Promise<void> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await page.goto(url);
    if (await ready().catch(() => false)) return;
    await page.waitForTimeout(750);
  }
  throw new Error(`The saved change never appeared on ${url}`);
}

/**
 * A real 1×1 PNG. The server sniffs the file signature instead of the declared type, so the
 * upload has to be an actual image; the colour is irrelevant to what the page asserts.
 */
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

test('an instructor uploads a cover and a preview picture, sees them publicly, then removes one', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const slug = `e2e-media-${suffix}`;
  const title = `E2E Media Course ${suffix}`;

  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio');
  await page.locator('#titleEn').fill(title);
  await page.getByLabel('Subtitle (English)', { exact: true }).fill('A course that carries its own pictures');
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Price (taka)').fill('500');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/en\/studio\/[a-f0-9]{24}$/);
  const studioPath = new URL(page.url()).pathname;

  // The upload goes through the real multipart form, so the server action and the image
  // store are exercised exactly as a teacher would use them.
  await page.setInputFiles('#course-cover', { name: 'cover.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Save cover' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const coverUrl = await page.locator('figure img[alt="Cover image"]').getAttribute('src');
  expect(coverUrl).toMatch(/^\/api\/media\/[a-f0-9]{24}$/);

  await page.setInputFiles('#course-preview-image', { name: 'preview.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Add preview image' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const previewUrl = await page.locator('figure img[alt="A look inside the course"]').first().getAttribute('src');
  expect(previewUrl).toMatch(/^\/api\/media\/[a-f0-9]{24}$/);
  // Two uploads must be two rows, even when the bytes are identical.
  expect(previewUrl).not.toBe(coverUrl);

  const sectionForm = page.locator('details').filter({ hasText: 'Add section' }).first();
  await sectionForm.locator('summary').click();
  await sectionForm.locator('#sectionTitleEn').fill('Pictures in place');
  await sectionForm.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const lessonForm = page.locator('details').filter({ hasText: 'Add lesson' }).first();
  await lessonForm.locator('summary').click();
  await lessonForm.locator('input[name="titleEn"]').fill('One short lesson');
  await lessonForm.locator('textarea[name="bodyHtml"]').fill('<p>Enough to publish.</p>');
  await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'One short lesson' })).toBeVisible();

  await page.locator('#outcomesEn').fill(
    'Upload a cover\nAdd a preview picture\nSee both on the public page\nRemove one picture\nKeep the other\nPublish a real course',
  );
  await page.getByRole('checkbox', { name: 'Publish this course' }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible();

  // A reader who has never signed in sees the same pictures on the public page.
  const publicPage = await page.goto(`/en/courses/${slug}`);
  expect(publicPage?.status()).toBe(200);
  await expect(page.locator(`header img[src="${coverUrl}"]`)).toBeVisible();

  const inside = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Inside the course' }) });
  await expect(inside.getByRole('heading', { name: 'Inside the course' })).toBeVisible();
  await expect(inside.locator(`img[src="${previewUrl}"]`)).toBeVisible();

  const served = await page.request.get(previewUrl!);
  expect(served.status()).toBe(200);
  expect(served.headers()['content-type']).toContain('image/png');
  expect(served.headers()['cache-control']).toContain('immutable');

  // Remove just the preview picture, from the panel that shows it.
  await page.goto(studioPath);
  const previewCard = page.locator('figure').filter({ has: page.locator(`img[src="${previewUrl}"]`) });
  await previewCard.getByRole('button', { name: 'Remove', exact: true }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect(page.locator(`img[src="${previewUrl}"]`)).toHaveCount(0);

  await page.goto(`/en/courses/${slug}`);
  await expect(page.locator(`img[src="${previewUrl}"]`)).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Inside the course' })).toHaveCount(0);
  await expect(page.locator(`header img[src="${coverUrl}"]`)).toBeVisible();
  // Removing the picture deletes its bytes rather than leaving an orphan row. The plain URL
  // can still answer from the one-year immutable edge cache, so ask a fresh URL that reaches
  // the route instead of the cache.
  const gone = await page.request.get(`${previewUrl}?after=remove`);
  expect(gone.status()).toBe(404);

  // Leave the database as clean as the test found it: clearing the cover deletes its bytes.
  await page.goto(studioPath);
  await page.getByLabel('Remove cover').check();
  await page.getByRole('button', { name: 'Save cover' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.locator(`img[src="${coverUrl}"]`)).toHaveCount(0);
});

test('an instructor sets a preview video and a lesson video, and both reach the learner', async ({ page }) => {
  // Two studio saves, a public page, a preview lesson and the learning room outrun the 45s default.
  test.setTimeout(90_000);
  const suffix = Date.now().toString(36);
  const slug = `e2e-preview-${suffix}`;
  const title = `E2E Preview Course ${suffix}`;
  const lessonVideo = 'https://media.example.com/lessons/first-recording.mp4';
  const promoFile = 'https://media.example.com/course-tour.mp4';
  const promoPage = 'https://media.example.com/course-tour';

  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio');
  await page.locator('#titleEn').fill(title);
  await page.getByLabel('Subtitle (English)', { exact: true }).fill('A course with a video preview');
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Price (taka)').fill('500');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/en\/studio\/[a-f0-9]{24}$/);
  const studioPath = new URL(page.url()).pathname;

  const sectionForm = page.locator('details').filter({ hasText: 'Add section' }).first();
  await sectionForm.locator('summary').click();
  await sectionForm.locator('#sectionTitleEn').fill('Recorded lessons');
  await sectionForm.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const lessonForm = page.locator('details').filter({ hasText: 'Add lesson' }).first();
  await lessonForm.locator('summary').click();
  await lessonForm.locator('input[name="titleEn"]').fill('One recorded lesson');
  // Exact, because the attachment's "File type" select also contains "type".
  await lessonForm.getByLabel('Type', { exact: true }).selectOption('video');
  await lessonForm.locator('textarea[name="bodyHtml"]').fill('<p>Watch, then try it yourself.</p>');
  await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'One recorded lesson' })).toBeVisible();

  await page.locator('#promoVideoUrl').fill(promoFile);
  await page.locator('#outcomesEn').fill(
    'Record a first lesson\nAttach a video to it\nOffer a free preview\nShow a course preview video\nPublish the course\nWatch it as a learner',
  );
  await page.getByRole('checkbox', { name: 'Publish this course' }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();
  // Read the saved values from a stored render, not the form that still holds what was typed.
  await loadUntil(
    page,
    studioPath,
    async () =>
      (await page.getByText('Published', { exact: true }).count()) > 0 &&
      (await page.locator('#promoVideoUrl').inputValue()) === promoFile,
  );

  // The per-lesson controls live on the row itself, not in a separate editor page.
  const lessonRow = page.getByRole('listitem').filter({ hasText: 'One recorded lesson' });
  await lessonRow.locator('summary').click();
  await lessonRow.locator('input[name="videoUrl"]').fill(lessonVideo);
  await lessonRow.getByRole('checkbox', { name: 'Free to preview' }).check();
  await lessonRow.getByRole('button', { name: 'Save this lesson' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();

  // The disclosure is closed after a reload, so address the stored inputs directly.
  const storedRow = page.getByRole('listitem').filter({ hasText: 'One recorded lesson' });
  await loadUntil(page, studioPath, async () => await storedRow.locator('input[name="isPreview"]').isChecked());
  await expect(storedRow.locator('input[name="videoUrl"]')).toHaveValue(lessonVideo);
  await expect(storedRow).toContainText('· preview');

  // A direct video file plays in the page; the flagged lesson is readable signed out.
  const publicPath = `/en/courses/${slug}`;
  await loadUntil(
    page,
    publicPath,
    async () =>
      (await page.locator(`video[src="${promoFile}"]`).count()) > 0 &&
      (await page.getByRole('link', { name: 'Preview', exact: true }).count()) > 0,
  );

  const previewLink = page.getByRole('link', { name: 'Preview', exact: true });
  await previewLink.click();
  await expect(page).toHaveURL(new RegExp(`/en/courses/${slug}/preview/[a-f0-9]{24}$`));
  await expect(page.getByRole('heading', { level: 1 })).toContainText('One recorded lesson');
  await expect(page.getByText('Free preview')).toBeVisible();
  await expect(page.getByText('Watch, then try it yourself.')).toBeVisible();

  // The owner opens the learning room the same way an enrolled learner would.
  await page.goto(`/en/learn/${slug}`);
  await expect(page.getByRole('heading', { name: 'One recorded lesson' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Watch the video' })).toHaveAttribute('href', lessonVideo);

  // Turning the flag off removes the public preview, and a page link replaces the player.
  await page.goto(studioPath);
  const reopenedRow = page.getByRole('listitem').filter({ hasText: 'One recorded lesson' });
  await reopenedRow.locator('summary').click();
  await reopenedRow.getByRole('checkbox', { name: 'Free to preview' }).uncheck();
  await reopenedRow.getByRole('button', { name: 'Save this lesson' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const uncheckedRow = page.getByRole('listitem').filter({ hasText: 'One recorded lesson' });
  await loadUntil(page, studioPath, async () => !(await uncheckedRow.locator('input[name="isPreview"]').isChecked()));
  await expect(uncheckedRow).not.toContainText('· preview');

  await page.locator('#promoVideoUrl').fill(promoPage);
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page).toHaveURL(/\?saved=1$/);
  await expect(page.getByText('Changes saved.')).toBeVisible();

  await loadUntil(
    page,
    publicPath,
    async () =>
      (await page.getByRole('link', { name: 'Watch the preview video' }).count()) > 0 &&
      (await page.getByRole('link', { name: 'Preview', exact: true }).count()) === 0,
  );
  await expect(page.locator('video')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Watch the preview video' })).toHaveAttribute('href', promoPage);
});
