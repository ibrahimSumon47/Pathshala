import { expect, test, type Page } from '@playwright/test';
import { accounts, signIn } from './helpers';

const PASSWORD = 'production-learner-pass-2026';

/** Register a unique learner so settings and deletion do not touch the seeded accounts. */
async function registerLearner(page: Page): Promise<string> {
  const email = `e2e-learner-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@pathshala.dev`;
  await page.goto('/en/sign-in');
  await page.locator('#signup-name').fill('Settings Learner');
  await page.locator('#signup-email').fill(email);
  await page.locator('#signup-password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Account created');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  return email;
}

test('a learner edits the profile, changes the password and deletes the account', async ({ page }) => {
  const email = await registerLearner(page);
  await page.goto('/en/dashboard/settings');
  await expect(page.getByRole('heading', { name: 'Profile and settings' })).toBeVisible();

  await page.locator('#name').fill('Renamed Learner');
  await page.locator('form').filter({ has: page.locator('#name') }).getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();

  await page.locator('#current').fill(PASSWORD);
  await page.locator('#next').fill('a-new-learner-pass-2027');
  await page.locator('#confirm').fill('a-new-learner-pass-2027');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Password changed.')).toBeVisible();

  await page.goto('/en/dashboard');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/^https:\/\/[^/]+\/$/);
  await signIn(page, email, 'a-new-learner-pass-2027');

  await page.goto('/en/dashboard/settings');
  await page.locator('#delete-password').fill('a-new-learner-pass-2027');
  await page.locator('#confirmation').fill('DELETE');
  await page.getByRole('button', { name: 'Delete my account' }).click();
  await expect(page).toHaveURL(/\/en\/sign-in\?deleted=1/);

  // The old password must not open a deleted account.
  await page.locator('#email').fill(email);
  await page.locator('#password').fill('a-new-learner-pass-2027');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/sign-in/);
});

test('a learner fills the cart, pays once and downloads the invoice PDF', async ({ page }) => {
  test.setTimeout(120_000);
  await registerLearner(page);

  await page.goto('/en/courses/spoken-english-daily');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/en\/cart/);
  await page.goto('/en/courses/excel-for-office');
  await page.getByRole('button', { name: 'Add to cart' }).click();
  await expect(page).toHaveURL(/\/en\/cart/);
  await expect(page.getByRole('heading', { name: '2 courses' })).toBeVisible();

  await page.getByLabel('Coupon').fill('EARLYBIRD');
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.getByText('EARLYBIRD').first()).toBeVisible();
  await page.getByRole('button', { name: 'Buy all of these' }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//);
  await expect(page.getByRole('heading', { name: '2 courses' })).toBeVisible();

  await page.getByRole('button', { name: 'Pay with PayBridge (test)' }).click();
  await expect(page).toHaveURL(/\/checkout\//);
  await page.getByRole('button', { name: /Pay .* in test mode/ }).click();
  await expect(page).toHaveURL(/\/en\/checkout\//);
  await expect
    .poll(async () => ((await page.textContent('body')) ?? '').includes('Payment complete'), { timeout: 60_000 })
    .toBe(true);

  // One payment must open both courses.
  await page.goto('/en/dashboard');
  await expect(page.getByText('Everyday Spoken English').first()).toBeVisible();
  await expect(page.getByText('Excel for Office Work').first()).toBeVisible();

  await page.goto('/en/dashboard/orders');
  const invoice = page.getByRole('link', { name: 'Invoice (PDF)' }).first();
  const href = await invoice.getAttribute('href');
  expect(href).toMatch(/^\/api\/orders\/PS-\d{8}-[A-F0-9]{8}\/invoice$/);
  const response = await page.request.get(href!);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toContain('application/pdf');
  const body = await response.body();
  expect(body.subarray(0, 5).toString()).toBe('%PDF-');
  expect(body.toString('latin1')).toContain('Test mode: no real money was charged.');
});

test('the seeded learner sees saved courses, notes and bookmarks', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);

  await page.goto('/en/dashboard/wishlist');
  await expect(page.getByRole('heading', { name: 'Saved for later' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Everyday Spoken English' })).toBeVisible();

  await page.goto('/en/dashboard/notes');
  await expect(page.getByRole('heading', { name: 'Notes and bookmarks' })).toBeVisible();
  await expect(page.getByText('কনস্ট দিয়ে শুরু করা যায়')).toBeVisible();

  await page.goto('/en/dashboard/notifications');
  await expect(page.getByRole('heading', { name: 'Messages' })).toBeVisible();
  await page.goto('/en/cart');
  await expect(page.getByRole('heading', { name: 'Buy several at once' })).toBeVisible();
});
