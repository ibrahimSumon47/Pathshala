import { expect, type Page } from '@playwright/test';

/** Sign in through the real credentials form and wait for the dashboard. */
export async function signIn(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/en/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
}

export const accounts = {
  student: { email: 'student@pathshala.dev', password: 'student-demo-2026' },
  instructor: { email: 'instructor@pathshala.dev', password: 'instructor-demo-2026' },
  admin: { email: 'admin@pathshala.dev', password: 'admin-demo-2026' },
};
