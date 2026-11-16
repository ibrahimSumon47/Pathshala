import { expect, test } from '@playwright/test';

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

test('a signed-out visitor can verify a certificate by its public code', async ({ page }) => {
  await page.goto('/en/dashboard');
  await expect(page).toHaveURL(/\/en\/sign-in/);

  const response = await page.goto('/en/verify/TP8VTU59XX');
  expect(response?.status()).toBe(200);
  await expect(page.getByText('Certificate of completion')).toBeVisible();
  await expect(page.getByText('Nusrat Jahan')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR code/ })).toBeVisible();
});
