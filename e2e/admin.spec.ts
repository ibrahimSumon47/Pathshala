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

  // The export above wrote an audit row, so reload before choosing it from the filter.
  await page.reload();
  await page.getByLabel('Filter by action', { exact: true }).selectOption('audit.export');
  await page.getByRole('button', { name: 'Apply filter' }).click();
  await expect(page).toHaveURL(/audit=audit\.export/);
  await expect(page.getByRole('cell', { name: 'audit.export' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Export CSV' })).toHaveAttribute(
    'href',
    '/api/admin/audit/export?action=audit.export',
  );
  const filteredCsv = await page.request.get('/api/admin/audit/export?action=audit.export');
  expect(filteredCsv.status()).toBe(200);
  expect(await filteredCsv.text()).toContain('audit.export');
});
