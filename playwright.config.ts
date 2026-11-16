import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:59802';

/**
 * End-to-end checks run against the production build. When E2E_BASE_URL is set the
 * suite targets an already-running deployment; otherwise it starts `next start` locally.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'pnpm --filter @pathshala/web exec next start -p 59802',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
        env: {
          MONGODB_URI: 'mongodb://127.0.0.1:27018/pathshala',
          APP_URL: baseURL,
          AUTH_TRUST_HOST: 'true',
        },
      },
});
