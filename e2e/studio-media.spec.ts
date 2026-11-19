import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

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
