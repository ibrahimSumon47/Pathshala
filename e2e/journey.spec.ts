import { expect, test, type Page } from '@playwright/test';
import { accounts, signIn } from './helpers';

const PASSWORD = 'production-learner-pass-2026';

/** Register a unique learner and return the address that now has an account. */
async function registerLearner(page: Page): Promise<string> {
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@pathshala.dev`;
  await page.goto('/en/register');
  await page.locator('#signup-name').fill('Production Learner');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/en\/sign-in\?registered=1/);
  await expect(page.getByRole('status')).toContainText('Account created');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  return email;
}

/** Fulfilment is asynchronous: wait for the signed webhook to flip the order to paid. */
async function expectPaid(page: Page): Promise<void> {
  await expect
    .poll(async () => {
      const body = (await page.textContent('body')) ?? '';
      if (body.includes('Payment complete')) return 'paid';
      await page.reload();
      return 'pending';
    }, { timeout: 60_000, intervals: [1500, 2000, 3000] })
    .toBe('paid');
}

test('a new learner enrols, finishes every lesson and earns a publicly verifiable certificate', async ({ page, browser }) => {
  await registerLearner(page);

  await page.goto('/en/courses/javascript-first-steps');
  await page.getByRole('button', { name: 'Enrol in this course' }).click();
  await expect(page).toHaveURL(/\/en\/learn\/javascript-first-steps/);

  await page.getByRole('link', { name: /How to work through this course/ }).click();
  await page.getByRole('button', { name: 'Mark lesson complete' }).click();
  await expect(page.getByText(/Progress · 20%/)).toBeVisible();

  await page.getByRole('link', { name: /Your first exercise/ }).click();
  await page.getByRole('button', { name: 'Mark lesson complete' }).click();
  await expect(page.getByText(/Progress · 40%/)).toBeVisible();

  await page.getByRole('link', { name: /Working with numbers/ }).click();
  await page.getByRole('button', { name: 'Mark lesson complete' }).click();
  await expect(page.getByText(/Progress · 60%/)).toBeVisible();

  await page.getByRole('link', { name: /Shaping a list/ }).click();
  await page.getByRole('button', { name: 'Mark lesson complete' }).click();
  await expect(page.getByText(/Progress · 80%/)).toBeVisible();

  await page.getByRole('link', { name: /A short quiz/ }).click();
  await page.getByLabel('const', { exact: true }).check();
  await page.getByLabel('"hello"', { exact: true }).check();
  await page.getByLabel("'pathshala'", { exact: true }).check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByText('Passed. Nice work.')).toBeVisible();
  await expect(page.getByText(/Progress · 100%/)).toBeVisible();

  await page.goto('/en/dashboard');
  const certificateLink = page.getByRole('link', { name: 'Certificate' });
  await expect(certificateLink).toBeVisible();
  const certificatePath = await certificateLink.getAttribute('href');
  expect(certificatePath).toMatch(/^\/en\/verify\/[A-Z0-9]{10,20}$/);

  const publicContext = await browser.newContext();
  const visitor = await publicContext.newPage();
  const response = await visitor.goto(certificatePath!);
  expect(response?.status()).toBe(200);
  await expect(visitor.getByRole('heading', { name: 'Certificate of completion' })).toBeVisible();
  await expect(visitor.getByText('Production Learner')).toBeVisible();
  await expect(visitor.getByRole('img', { name: /QR code/ })).toBeVisible();
  await publicContext.close();
});

test('a signed-out visitor cannot open a private route', async ({ page }) => {
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/sign-in/);
  await page.goto('/en/admin');
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test('a learner buys a course with PayBridge test mode and with Stripe test mode', async ({ page }) => {
  const email = await registerLearner(page);

  await page.goto('/en/courses/excel-for-office');
  await page.getByLabel('Have a coupon?').fill('EARLYBIRD');
  await page.getByRole('button', { name: 'Buy this course' }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//);
  await expect(page.getByText('−')).toBeVisible();
  await expect(page.getByText('EARLYBIRD').first()).toBeVisible();
  await page.getByRole('button', { name: 'Pay with PayBridge (test)' }).click();
  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByRole('button', { name: /Pay .* in test mode/ }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//);
  await expectPaid(page);
  await expect(page.getByText('PayBridge (test)')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start learning' })).toBeVisible();

  await page.goto('/en/courses/spoken-english-daily');
  await page.getByRole('button', { name: 'Buy this course' }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//);
  await page.getByRole('button', { name: 'Pay with Stripe (test)' }).click();
  await expect(page).toHaveURL(/checkout\.stripe\.com/);
  const stripe = page.frameLocator('iframe').first();
  await stripe.getByRole('textbox', { name: 'Card number' }).fill('4242 4242 4242 4242');
  await stripe.getByRole('textbox', { name: /Expiration/ }).fill('12 / 34');
  await stripe.getByRole('textbox', { name: 'Security code' }).fill('123');
  await stripe.getByRole('textbox', { name: 'Name on card' }).fill('Nusrat Jahan');
  await stripe.getByRole('textbox', { name: 'Email' }).fill(email);
  await stripe.getByRole('combobox', { name: 'Country' }).selectOption({ label: 'Bangladesh' });
  const postal = stripe.getByRole('textbox').last();
  if (await postal.isVisible().catch(() => false)) await postal.fill('1207');
  await stripe.getByRole('button', { name: 'Pay', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//, { timeout: 90_000 });
  await expectPaid(page);
  await expect(page.getByText('Stripe (test)')).toBeVisible();
});

test('an instructor publishes a course and an admin controls its status', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const slug = `e2e-studio-${suffix}`;
  const title = `E2E Studio Course ${suffix}`;

  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio');
  await page.locator('#titleEn').fill(title);
  await page.getByLabel('Subtitle (English)', { exact: true }).fill('A course created by the production flow test');
  await page.getByLabel('Slug').fill(slug);
  await page.getByLabel('Price (taka)').fill('500');
  await page.getByRole('button', { name: 'Create draft' }).click();
  await expect(page).toHaveURL(/\/en\/studio\/[a-f0-9]{24}/);

  const sectionForm = page.locator('details').filter({ hasText: 'Add section' }).first();
  await sectionForm.locator('summary').click();
  await sectionForm.locator('#sectionTitleEn').fill('Getting started');
  await sectionForm.getByRole('button', { name: 'Add section' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();

  const lessonForm = page.locator('details').filter({ hasText: 'Add lesson' }).first();
  await lessonForm.locator('summary').click();
  await lessonForm.locator('input[name="titleEn"]').fill('Your first step');
  await lessonForm.locator('textarea[name="bodyHtml"]').fill('<p>Read this, then mark the lesson complete.</p>');
  await lessonForm.getByRole('button', { name: 'Add lesson' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Your first step' })).toBeVisible();

  // Publishing now needs the depth a public course page promises.
  await page.locator('#outcomesEn').fill(
    'Write a first JavaScript line\nRead a value from the page\nHandle a click\nStore a list of items\nDebug with the console\nFinish a small tool',
  );
  await page.getByRole('checkbox', { name: 'Publish this course' }).check();
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText('Published', { exact: true }).first()).toBeVisible();

  const publicPage = await page.goto(`/en/courses/${slug}`);
  expect(publicPage?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 })).toContainText(title);

  await page.goto('/en/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/^https:\/\/[^/]+\/$/);
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/admin');

  const courseRow = page.getByRole('row', { name: new RegExp(title) });
  await expect(courseRow).toBeVisible();
  await courseRow.getByRole('button', { name: 'Unpublish' }).click();
  await expect(page).toHaveURL(/\/en\/admin\?saved=1/);
  await expect(page.getByRole('row', { name: new RegExp(title) })).toContainText('draft');

  await page.getByRole('row', { name: new RegExp(title) }).getByRole('button', { name: 'Publish' }).click();
  await expect(page).toHaveURL(/\/en\/admin\?saved=1/);
  await expect(page.getByRole('row', { name: new RegExp(title) })).toContainText('published');
  await expect(page.getByRole('row', { name: /course\.status/ }).first()).toBeVisible();
});
