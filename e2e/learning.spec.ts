import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

test('a student reaches the learning room, live room and certificate', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: /First Steps in JavaScript/ }).first()).toBeVisible();

  await page.getByRole('link', { name: /First Steps in JavaScript/ }).first().click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('First Steps in JavaScript');
  await expect(page.getByText('Your first exercise')).toBeVisible();
  await page.getByRole('link', { name: /A short quiz/ }).click();
  await page.getByLabel('const', { exact: true }).check();
  await page.getByLabel('"hello"', { exact: true }).check();
  await page.getByLabel("'pathshala'", { exact: true }).check();
  await page.getByRole('button', { name: 'Submit answers' }).click();
  await expect(page.getByText(/Last score: 3\/3/)).toBeVisible();

  await page.goto('/en/live/javascript-first-steps');
  await expect(page.getByRole('heading', { name: /First Steps in JavaScript/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Join the class' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add to calendar (.ics)' }).first()).toHaveAttribute('href', /\/api\/sessions\/.+\/calendar/);

  await page.goto('/en/dashboard');
  await page.getByRole('link', { name: 'Certificate' }).click();
  await expect(page.getByText('Certificate of completion')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
});

test('a student cannot open the admin area', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  const response = await page.goto('/en/admin');
  expect(response?.status()).toBe(404);
});

test('an enrolled student sees the live class and attendance state', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/live/javascript-first-steps');
  await expect(page.getByText(/Questions and answers/).first()).toBeVisible();
  await expect(page.locator('iframe')).toBeVisible();
});
