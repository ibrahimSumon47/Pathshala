import { expect, test } from '@playwright/test';
import { signIn } from './helpers';

test('the public catalogue, search and course detail work in production', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Learn in your language, at your own pace.');

  await page.goto('/en/courses');
  await page.getByRole('searchbox').fill('JavaScript');
  await page.getByRole('button', { name: 'Show' }).click();
  await expect(page.getByRole('heading', { name: 'First Steps in JavaScript' })).toBeVisible();

  await page.getByRole('link', { name: 'View course →' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('First Steps in JavaScript');
  await expect(page.getByText('Build small programs that run in the browser')).toBeVisible();
});

test('a new learner can register, then sign in', async ({ page }) => {
  const email = `e2e-${Date.now()}@pathshala.dev`;
  await page.goto('/en/sign-in');
  await page.getByLabel('Full name').fill('Production Learner');
  await page.getByLabel('Email').nth(1).fill(email);
  await page.getByLabel('Password').nth(1).fill('production-learner-pass-2026');
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page.getByRole('status')).toContainText('Account created');
  await page.getByLabel('Email').first().fill(email);
  await page.getByLabel('Password').first().fill('production-learner-pass-2026');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await expect(page).toHaveURL(/\/en\/dashboard/);
  await expect(page.getByText(email)).toBeVisible();
});

test('a signed-out visitor can verify a seeded certificate by its public code', async ({ page }) => {
  await signIn(page, 'student@pathshala.dev', 'student-demo-2026');
  await page.goto('/en/dashboard');
  const certificateLink = page.getByRole('link', { name: 'Certificate' });
  const certificatePath = await certificateLink.getAttribute('href');
  expect(certificatePath).toMatch(/^\/en\/verify\/[A-Z0-9]{10,20}$/);
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/^https:\/\/[^/]+\/$/);
  const response = await page.goto(certificatePath!);
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Certificate of completion')).toBeVisible();
  await expect(page.getByText('Nusrat Jahan')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
});
