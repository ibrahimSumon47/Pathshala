import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

test('the catalogue searches both scripts and takes filters from the URL', async ({ page }) => {
  await page.goto(`/bn/courses?q=${encodeURIComponent('ইংরেজি')}`);
  await expect(page.getByRole('heading', { name: 'প্রতিদিনের ইংরেজি কথা' })).toBeVisible();

  await page.goto('/en/courses?price=free&sort=rating');
  await expect(page.getByLabel('Price')).toHaveValue('free');
  await expect(page.getByLabel('Sort')).toHaveValue('rating');
  await expect(page.locator('article, li').getByRole('heading', { name: 'First Steps in JavaScript' })).toBeVisible();

  await page.goto('/en/courses?sort=price-asc');
  const firstCard = page.locator('ul li h2').first();
  await expect(firstCard).toHaveText('First Steps in JavaScript');
  await expect(page.getByLabel('Sort')).toHaveValue('price-asc');

  await page.goto('/en/courses?price=over-1500');
  await expect(page.getByRole('heading', { name: 'Design with Type' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Excel for Office Work' })).toHaveCount(0);
});

test('the landing page shows a shelf built from real ratings', async ({ page }) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', { name: 'Best rated right now' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Everyday Spoken English' })).toBeVisible();
  await expect(page.getByText('★ 5.0 (1)').first()).toBeVisible();
});

test('a signed-in learner gets courses from their own subjects', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  await expect(page.getByRole('heading', { name: 'More in your subjects' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'First Steps in JavaScript' })).toHaveCount(0);
});
