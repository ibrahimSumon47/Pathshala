import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

async function violations(page: Parameters<typeof signIn>[0]) {
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
});

test('the signed-in learner pages have zero axe violations', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  expect(await violations(page)).toEqual([]);

  for (const path of ['/en/dashboard/settings', '/en/dashboard/notes', '/en/dashboard/wishlist', '/en/cart', '/en/dashboard/notifications']) {
    await page.goto(path);
    expect(await violations(page), path).toEqual([]);
  }
});
