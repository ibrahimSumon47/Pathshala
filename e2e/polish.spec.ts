import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

test('the command palette finds a course and opens it', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/courses');
  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('textbox').fill('javascript');
  await expect(dialog.getByText('First Steps in JavaScript')).toBeVisible();
  await dialog.getByText('First Steps in JavaScript').click();
  await expect(page).toHaveURL(/\/en\/courses\/javascript-first-steps$/);
});

test('a reader moves between lessons with the keyboard', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/learn/javascript-first-steps');
  await expect(page.getByText(/Alt \+ ← \/ →/)).toBeVisible();
  const before = page.url();
  await page.keyboard.press('Alt+ArrowRight');
  await expect.poll(() => page.url()).not.toBe(before);
});

test('notes and earnings download as CSV', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/dashboard/notes');
  const [notes] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download CSV' }).click()]);
  expect(notes.suggestedFilename()).toBe('pathshala-notes.csv');

  await page.getByRole('banner').locator('summary').click();
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio/earnings');
  await expect(page.getByRole('heading', { level: 1, name: 'Payout statements' })).toBeVisible();
  const [earnings] = await Promise.all([page.waitForEvent('download'), page.getByRole('link', { name: 'Download CSV' }).click()]);
  expect(earnings.suggestedFilename()).toBe('pathshala-earnings.csv');
});

test('an operator gets order search, coupon performance and moderation', async ({ page }) => {
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/admin/orders');
  await expect(page.getByRole('heading', { level: 1, name: 'Orders' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Platform' })).toBeVisible();
  await page.getByRole('searchbox').fill('PS-');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page).toHaveURL(/q=PS-/);

  await page.goto('/en/admin/coupons');
  await expect(page.getByRole('heading', { level: 1, name: 'Coupons and campaigns' })).toBeVisible();

  await page.goto('/en/admin');
  await expect(page.getByRole('heading', { name: 'Reviews and questions' })).toBeVisible();
  await expect(page.getByText('Recent lesson questions')).toBeVisible();
});
