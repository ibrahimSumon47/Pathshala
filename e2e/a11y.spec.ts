import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

async function violations(page: Parameters<typeof signIn>[0]) {
  // Entrance motion fades text in; scan the settled page, not a blended frame.
  await page.waitForTimeout(900);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
}

test('landing, catalogue, course detail, policy and sign-in have zero axe violations', async ({ page }) => {
  await page.goto('/en');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/courses');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/courses/spoken-english-daily');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/refund-policy');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/sign-in');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/register');
  expect(await violations(page)).toEqual([]);
});

test('the signed-in learner pages have zero axe violations', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  expect(await violations(page)).toEqual([]);

  for (const path of [
    '/en/dashboard/profile',
    '/en/dashboard/settings',
    '/en/dashboard/notes',
    '/en/dashboard/wishlist',
    '/en/cart',
    '/en/dashboard/notifications',
    '/en/dashboard/saved-searches',
  ]) {
    await page.goto(path);
    expect(await violations(page), path).toEqual([]);
  }

  // The public teacher page reached from a course card.
  await page.goto('/en/courses/javascript-first-steps');
  await page.getByRole('link', { name: 'Rafiqul Islam', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Rafiqul Islam' })).toBeVisible();
  expect(await violations(page)).toEqual([]);
});

test('the operator money and moderation pages have zero axe violations', async ({ page }) => {
  await signIn(page, accounts.admin.email, accounts.admin.password);
  for (const path of [
    '/en/admin/orders',
    '/en/admin/coupons',
    '/en/admin/payouts',
    '/en/admin/refunds',
    '/en/studio/earnings',
    '/en/studio/community',
    '/en/studio/questions',
    '/en/studio/promotions',
  ]) {
    await page.goto(path);
    expect(await violations(page), path).toEqual([]);
  }
});
