import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { accounts, signIn } from './helpers';

async function logOut(page: Page): Promise<void> {
  const header = page.getByRole('banner');
  await header.locator('summary').click();
  await header.getByRole('button', { name: 'Log out' }).click();
  await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible();
}

test('a teacher reads the roster, reorders a lesson and saves a bank question', async ({ page }) => {
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio');
  const card = page.locator('div[class*="courseCard"]').filter({ hasText: 'First Steps in JavaScript' });
  await card.getByRole('link', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'First Steps in JavaScript' })).toBeVisible();

  await page.getByRole('link', { name: 'Student roster' }).click();
  await expect(page.getByRole('heading', { level: 1, name: /Student roster/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /Nusrat Jahan/ })).toBeVisible();
  const [attendance] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download live attendance CSV' }).click(),
  ]);
  expect(attendance.suggestedFilename()).toBe('pathshala-live-attendance.csv');
  const [roster] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('link', { name: 'Download roster CSV' }).click(),
  ]);
  expect(roster.suggestedFilename()).toBe('pathshala-roster.csv');

  await page.getByLabel('Status').selectOption('completed');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page).toHaveURL(/status=completed/);
  await expect(page.getByRole('cell', { name: /Nusrat Jahan/ })).toBeVisible();
  await page.getByLabel('Status').selectOption('active');
  await page.getByRole('button', { name: 'Apply filters' }).click();
  await expect(page.getByRole('cell', { name: /Nusrat Jahan/ })).toHaveCount(0);
  await page.getByRole('link', { name: 'Clear filters' }).click();
  await expect(page.getByRole('cell', { name: /Nusrat Jahan/ })).toBeVisible();

  await page.getByRole('link', { name: '← Back to course' }).click();
  const curriculum = page.getByRole('heading', { name: /Curriculum/ }).locator('..');
  await expect(curriculum.getByRole('listitem').first()).toContainText('How to work through this course');
  await page.getByRole('button', { name: 'Move down: How to work through this course' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await expect(curriculum.getByRole('listitem').first()).toContainText('Your first exercise');
  await page.getByRole('button', { name: 'Move up: How to work through this course' }).click();
  await expect(curriculum.getByRole('listitem').first()).toContainText('How to work through this course');

  await page.getByRole('link', { name: /A short quiz/ }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'A short quiz' })).toBeVisible();
  await page.getByRole('button', { name: 'Save to question bank' }).first().click();
  await expect(page.getByText(/Saved to the question bank|already in your bank/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Question bank' })).toBeVisible();
  await expect(page.getByText('Which keyword declares a variable that cannot be reassigned?').last()).toBeVisible();

  await page.getByRole('link', { name: '← Back to course' }).click();
  const capacityForm = page.locator('form').filter({ has: page.getByRole('button', { name: 'Update seats' }) }).first();
  await capacityForm.getByLabel('Seats (0 = no cap)').fill('12');
  await capacityForm.getByRole('button', { name: 'Update seats' }).click();
  await expect(page.getByText('Changes saved.')).toBeVisible();
  await page.getByText('Schedule a live class').click();
  await expect(page.getByLabel('Seats (0 = no cap)')).toHaveCount(2);
});

test('a learner answers the completion survey and can change it', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/dashboard/surveys');
  await expect(page.getByRole('heading', { level: 1, name: 'Course surveys' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'First Steps in JavaScript' })).toBeVisible();

  await page.getByLabel('How hard was the course').selectOption('2');
  await page.getByLabel('How was the pace').selectOption('4');
  await page.getByLabel('How confident do you feel now').selectOption('5');
  const comment = `E2E survey ${Date.now().toString().slice(-6)}`;
  await page.getByLabel('Anything else? (optional)').fill(comment);
  await page.getByRole('button', { name: /Save survey|Update answer/ }).click();
  await expect(page.getByText('Thank you — your survey is saved.')).toBeVisible();
  await expect(page.getByLabel('Anything else? (optional)')).toHaveValue(comment);
});

test('an operator revokes and restores a certificate and sees the coupon timeline', async ({ page }) => {
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/admin');
  await page.getByRole('link', { name: 'Certificates' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Certificates' })).toBeVisible();

  const row = page.locator('tbody tr').first();
  const action = row.getByRole('button');
  const before = await action.textContent();
  await action.click();
  await expect(page.getByText('Certificate state saved.')).toBeVisible();
  await expect(row.getByRole('button')).not.toHaveText(before ?? '');
  await row.getByRole('button').click();
  await expect(page.getByText('Certificate state saved.')).toBeVisible();
  await expect(row.getByRole('button')).toHaveText(before ?? '');

  await page.goto('/en/admin/coupons');
  await expect(page.getByRole('heading', { level: 2, name: 'Redemption timeline' })).toBeVisible();
});

test('an empty catalogue search offers subjects and saves the search', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  const query = `no-such-course-${Date.now().toString().slice(-6)}`;
  await page.goto(`/en/courses?q=${query}`);
  await expect(page.getByRole('heading', { name: 'No courses match these filters' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Try a nearby subject' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Programming/ })).toBeVisible();

  await page.getByRole('button', { name: 'Save this search' }).click();
  await expect(page).toHaveURL(/\/en\/dashboard\/saved-searches/);
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
  const row = page.locator('li').filter({ hasText: query });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Remove' }).click();
  await expect(page.locator('li').filter({ hasText: query })).toHaveCount(0);
});

test('a survey comment reaches the teacher roster and can be moderated', async ({ page }) => {
  const comment = 'The projects made the ideas click.';
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/dashboard/surveys');
  await page.getByLabel('How hard was the course').selectOption('2');
  await page.getByLabel('How was the pace').selectOption('4');
  await page.getByLabel('How confident do you feel now').selectOption('5');
  await page.getByLabel('Anything else? (optional)').fill(comment);
  await page.getByRole('button', { name: /Save survey|Update answer/ }).click();
  await expect(page.getByText('Thank you — your survey is saved.')).toBeVisible();

  await logOut(page);
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/studio');
  const card = page.locator('div[class*="courseCard"]').filter({ hasText: 'First Steps in JavaScript' });
  await card.getByRole('link', { name: 'Edit' }).click();
  await page.getByRole('link', { name: 'Student roster' }).click();
  await expect(page.getByText(comment)).toBeVisible();

  await logOut(page);
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/admin');
  let row = page.locator('tr').filter({ hasText: comment }).first();
  await row.getByRole('checkbox').check();
  await row.locator('xpath=ancestor::form').getByRole('button', { name: 'Hide selected' }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();

  row = page.locator('tr').filter({ hasText: comment }).first();
  await row.getByRole('checkbox').check();
  await row.locator('xpath=ancestor::form').getByRole('button', { name: 'Restore selected' }).click();
  await expect(page.getByText('Saved.', { exact: true })).toBeVisible();
});
