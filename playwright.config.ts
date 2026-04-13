import { defineConfig } from '@playwright/test';

const hostedBaseUrl = process.env.PLAYWRIGHT_BASE_URL;
const useHostedTarget = Boolean(hostedBaseUrl);

export default defineConfig({
  testDir: './test/e2e',
  timeout: 180_000,
  use: {
    baseURL: hostedBaseUrl || 'http://localhost:3000',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
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