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

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: 'Close search' }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
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

test('a teacher replies to a review and announces to learners', async ({ page }) => {
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio/community');
  await expect(page.getByRole('heading', { level: 1, name: 'Reviews and announcements' })).toBeVisible();

  const review = page.locator('li').filter({ hasText: 'First Steps in JavaScript' }).first();
  await review.getByLabel('Your reply').fill('Thank you — I added a worked example for this lesson.');
  await review.getByRole('button', { name: /Post reply|Replace reply/ }).click();
  await expect(page.getByText('Reply saved.')).toBeVisible();
  await expect(page.getByText('Instructor reply')).toBeVisible();

  await page.getByLabel('Course').selectOption({ label: 'First Steps in JavaScript' });
  await page.getByLabel('Message').fill('A new practice set is now in the last lesson.');
  await page.getByRole('button', { name: 'Send announcement' }).click();
  await expect(page.getByText(/Announcement added to [0-9]+ inbox/)).toBeVisible();

  await page.goto('/en/courses/javascript-first-steps');
  await expect(page.getByText('Instructor reply').first()).toBeVisible();

  await page.goto('/en/studio/questions');
  await expect(page.getByRole('heading', { level: 1, name: 'Lesson questions' })).toBeVisible();

  const code = `E2E-${Date.now().toString().slice(-6)}`;
  await page.goto('/en/studio/promotions');
  await expect(page.getByRole('heading', { level: 1, name: 'Promo codes' })).toBeVisible();
  await page.getByLabel('Course').selectOption({ label: 'First Steps in JavaScript' });
  await page.getByLabel('Code', { exact: true }).fill(code);
  await page.getByLabel('Value', { exact: true }).fill('15');
  await page.getByRole('button', { name: 'Create code' }).click();
  await expect(page.getByText(`${code} is ready at checkout.`)).toBeVisible();
  await expect(page.getByRole('cell', { name: code, exact: true })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'At limit' })).toBeVisible();
});

test('a learner saves a search and removes it', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/dashboard/saved-searches');
  await expect(page.getByRole('heading', { level: 1, name: 'Saved searches' })).toBeVisible();

  const label = `E2E search ${Date.now().toString().slice(-6)}`;
  await page.getByLabel('Name').fill(label);
  await page.getByLabel('What are you looking for').fill('JavaScript');
  await page.getByRole('button', { name: 'Save search' }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  await expect(page.getByText(label)).toBeVisible();

  await page.getByRole('button', { name: 'Check for new courses' }).click();
  await expect(page.getByText(/new courses? found\./)).toBeVisible();

  const row = page.locator('li').filter({ hasText: label });
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(page.getByText(label)).toBeHidden();
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
  await expect(page.getByRole('button', { name: 'Hide selected' }).first()).toBeVisible();

  await page.goto('/en/admin/refunds');
  await expect(page.getByRole('heading', { level: 1, name: 'Refund requests' })).toBeVisible();

  await page.goto('/en/admin/payouts');
  await expect(page.getByRole('heading', { level: 1, name: 'Teacher payouts' })).toBeVisible();
  const row = page.locator('tbody tr').first();
  const firstAction = row.getByRole('button').first();
  const wasOpen = (await firstAction.textContent())?.includes('Mark paid');
  await firstAction.click();
  await expect(page.getByText('Payout state saved.')).toBeVisible();
  await expect(row.getByRole('button').first()).toHaveText(wasOpen ? 'Reopen' : 'Mark paid');
  await row.getByRole('button').first().click();
  await expect(page.getByText('Payout state saved.')).toBeVisible();
});
