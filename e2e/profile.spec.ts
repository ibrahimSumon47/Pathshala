import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

const HEADLINE = 'Teaching by making things small first';

test('a teacher edits the profile and the public page shows it', async ({ page }) => {
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/dashboard/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Rafiqul Islam' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What your courses earned' })).toBeVisible();
  await expect(page.getByText('Earned so far')).toBeVisible();

  await page.locator('#headlineEn').fill(HEADLINE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await expect(page.getByText(HEADLINE).first()).toBeVisible();

  await page.getByRole('link', { name: 'View public profile' }).click();
  await expect(page).toHaveURL(/\/en\/instructors\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Rafiqul Islam' })).toBeVisible();
  await expect(page.getByText(HEADLINE)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Courses by this teacher' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Steps in JavaScript' })).toBeVisible();
});

test('an operator sees platform earnings rather than a teacher desk', async ({ page }) => {
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/dashboard/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Tania Rahman' })).toBeVisible();
  await expect(page.getByText('Operator', { exact: true }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'The platform share' })).toBeVisible();
  await expect(page.getByText('Platform earnings')).toBeVisible();
  await expect(page.getByText('20% of every sale')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Admin console' }).first()).toBeVisible();
  await expect(page.getByRole('heading', { name: 'What your courses earned' })).toHaveCount(0);

  await page.getByRole('link', { name: 'Open the admin console' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Admin', exact: true })).toBeVisible();
  await expect(page.getByText('Platform share (20%)')).toBeVisible();
});

test('a learner sees a learning trail, not a money desk', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/dashboard/profile');
  await expect(page.getByRole('heading', { name: 'Your learning trail' })).toBeVisible();
  await expect(page.getByText('Courses joined')).toBeVisible();
  await expect(page.getByText('Earned so far')).toHaveCount(0);
  await expect(page.getByText('Platform earnings')).toHaveCount(0);
});

test('a course card links to the teacher profile', async ({ page }) => {
  await page.goto('/en/courses/javascript-first-steps');
  await page.getByRole('link', { name: 'Rafiqul Islam', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/instructors\/[a-f0-9]{24}$/);
  await expect(page.getByText('Lives in Dhaka')).toBeVisible();
});

test('the account menu logs a learner out from a public page', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/courses');
  const header = page.getByRole('banner');
  await header.locator('summary').click();
  await header.getByRole('button', { name: 'Log out' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('banner').locator('summary')).toHaveCount(0);

  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/sign-in/);
});
