import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

const HEADLINE = 'Teaching by making things small first';

test('a teacher edits the profile and the public page shows it', async ({ page }) => {
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  await page.goto('/en/dashboard/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'Your profile' })).toBeVisible();

  await page.locator('#headlineEn').fill(HEADLINE);
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Profile saved.')).toBeVisible();
  await expect(page.getByText(HEADLINE).first()).toBeVisible();

  await page.getByRole('link', { name: 'See the public profile' }).click();
  await expect(page).toHaveURL(/\/en\/instructors\/[a-f0-9]{24}$/);
  await expect(page.getByRole('heading', { level: 1, name: 'Rafiqul Islam' })).toBeVisible();
  await expect(page.getByText(HEADLINE)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Courses by this teacher' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Steps in JavaScript' })).toBeVisible();
});

test('a course card links to the teacher profile', async ({ page }) => {
  await page.goto('/en/courses/javascript-first-steps');
  await page.getByRole('link', { name: 'Rafiqul Islam', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/instructors\/[a-f0-9]{24}$/);
  await expect(page.getByText('Lives in Dhaka')).toBeVisible();
});

test('the header logs a learner out from a public page', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await page.goto('/en/courses');
  const header = page.getByRole('banner');
  await header.getByRole('button', { name: 'Log out' }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe('/');
  await expect(page.getByRole('banner').getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('banner').getByRole('link', { name: 'Profile' })).toHaveCount(0);

  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/sign-in/);
});
