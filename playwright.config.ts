import { defineConfig } from '@playwright/test';

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const useHostedTarget = Boolean(hostedBaseUrl);

export default defineConfig({
  testDir: './test/e2e',
  // The hosted dev server compiles routes on-demand which can take >60s for
  // a cold /api/auth or /[locale]/dashboard/<role>. Bump the per-test
  // budget so the multi-role flow has headroom.
  timeout: 600_000,
  expect: { timeout: 30_000 },
  use: {
    baseURL: hostedBaseUrl || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    actionTimeout: 60_000,
    navigationTimeout: 120_000,
  },
  webServer: useHostedTarget
    ? undefined
    : {
        command: 'npm run build && npm run start',
        url: 'http://localhost:3000/api/health',
        timeout: 300_000,
        reuseExistingServer: true,
      },
});