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

test('landing, catalogue and sign-in have zero axe violations', async ({ page }) => {
  await page.goto('/en');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/courses');
  expect(await violations(page)).toEqual([]);

  await page.goto('/en/sign-in');
  expect(await violations(page)).toEqual([]);
});

test('the student dashboard has zero axe violations', async ({ page }) => {
  await signIn(page, accounts.student.email, accounts.student.password);
  expect(await violations(page)).toEqual([]);
});
