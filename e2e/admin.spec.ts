import { expect, test } from '@playwright/test';
import { accounts, signIn } from './helpers';

test('an admin sees reports, approvals and the audit log', async ({ page }) => {
  await signIn(page, accounts.admin.email, accounts.admin.password);
  await page.goto('/en/admin');

  await expect(page.getByRole('heading', { level: 1 })).toContainText('Admin');
  await expect(page.getByRole('region', { name: 'Operating report' })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Courses' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Audit log' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute('href', '/api/admin/audit/export');

  const csv = await page.request.get('/api/admin/audit/export');
  expect(csv.status()).toBe(200);
  expect(csv.headers()['content-type']).toContain('text/csv');
  expect(await csv.text()).toContain('"action"');
});
