import { expect, Browser, Page, test } from '@playwright/test';

const USERS = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  lab: { email: 'lab@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  secretary: { email: 'secretary@honeytrace.gov', password: 'password123' },
} as const;

type Role = keyof typeof USERS;

function baseUrlOrThrow(): string {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  if (!baseUrl) {
    throw new Error('PLAYWRIGHT_BASE_URL is required for hosted E2E tests.');
  }
  return baseUrl;
}

async function createRolePage(browser: Browser, role: Role, baseUrl: string): Promise<{ page: Page; cleanup: () => Promise<void> }> {
  const context = await browser.newContext({
    baseURL: baseUrl,
    ignoreHTTPSErrors: true,
  });

  await context.addInitScript(() => {
    const roles = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'secretary', 'admin'];
    for (const r of roles) {
      localStorage.setItem(`${r}_tour_seen`, 'true');
      localStorage.setItem(`${r}_kyc_completed`, 'true');
    }
  });

  const user = USERS[role];
  let authResponse;
  let lastAuthError: unknown;
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      authResponse = await context.request.post('/api/auth', {
        data: { email: user.email, password: user.password, role },
      });
      lastAuthError = undefined;
      break;
    } catch (err) {
      lastAuthError = err;
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
    }
  }

  if (lastAuthError) {
    throw lastAuthError;
  }

  expect(authResponse.status()).toBe(200);

  const page = await context.newPage();
  const targetUrl = `${baseUrl}/en/dashboard/${role}`;

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
      lastError = undefined;
      break;
    } catch (err) {
      lastError = err;
      await page.waitForTimeout(1000 * attempt);
    }
  }

  if (lastError) throw lastError;

  await expect(page).toHaveURL(new RegExp(`/en/dashboard/${role}$`), { timeout: 60000 });
  return {
    page,
    cleanup: async () => {
      await context.close();
    },
  };
}

test('hosted all user roles execute workflows', async ({ browser }) => {
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL;
  test.skip(!baseUrl, 'PLAYWRIGHT_BASE_URL is not set; hosted test skipped.');

  const safeBaseUrl = baseUrlOrThrow();

  // Farmer
  const farmerSession = await createRolePage(browser, 'farmer', safeBaseUrl);
  const farmerPage = farmerSession.page;
  const createResponse = await farmerPage.context().request.post('/api/batches', {
    data: {
      farmerId: 'F-001',
      farmerName: 'Ramesh Kumar',
      floraType: `Mustard Hosted ${Date.now()}`,
      weightKg: 18,
      moisturePct: 16,
      latitude: '22.8465',
      longitude: '81.3340',
      grade: 'A',
      harvestDate: new Date().toISOString().slice(0, 10),
    },
  });
  expect(createResponse.status()).toBe(201);
  const createPayload = await createResponse.json();
  const batchId = createPayload?.data?.id as string;
  expect(batchId).toMatch(/HT-\d{8}-\d{3}/);

  await farmerPage.reload({ waitUntil: 'domcontentloaded' });
  await expect(farmerPage.getByText(batchId)).toBeVisible({ timeout: 20000 });

  await farmerSession.cleanup();

  // Warehouse
  const warehouseSession = await createRolePage(browser, 'warehouse', safeBaseUrl);
  const warehousePage = warehouseSession.page;
  const incomingButton = warehousePage.getByRole('button', { name: /record incoming batch/i }).first();
  await expect(incomingButton).toBeVisible();
  const patchResponse = await warehousePage.context().request.patch(`/api/batches/${batchId}`, {
    data: { status: 'in_warehouse' },
  });
  expect(patchResponse.status()).toBe(200);
  await warehouseSession.cleanup();

  // Lab
  const labSession = await createRolePage(browser, 'lab', safeBaseUrl);
  const labPage = labSession.page;
  let availableLabBatchIds: string[] = [];
  await expect
    .poll(async () => {
      availableLabBatchIds = await labPage.locator('#batch-select option').evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value && value.trim().length > 0)
      );
      return availableLabBatchIds.length;
    }, { timeout: 45000 })
    .toBeGreaterThan(0);

  const labBatchId = availableLabBatchIds[0];

  await labPage.selectOption('#batch-select', labBatchId);
  await labPage.fill('#fssai', '10016011000892');
  await labPage.fill('#nabl-cert', 'T-4521');
  await labPage.fill('#moisture', '16');
  await labPage.fill('#hmf', '20');
  await labPage.fill('#pollen', '100');
  await labPage.fill('#acidity', '20');
  await labPage.fill('#diastase', '12');
  await labPage.fill('#sucrose', '3');
  await labPage.fill('#reducing-sugars', '66');
  await labPage.fill('#conductivity', '0.4');
  await labPage.getByRole('button', { name: /publish/i }).click();
  await expect(labPage.getByRole('row', { name: new RegExp(labBatchId) })).toContainText(/certified/i, { timeout: 20000 });
  await labSession.cleanup();

  // Officer
  const officerSession = await createRolePage(browser, 'officer', safeBaseUrl);
  const officerPage = officerSession.page;
  await officerPage.getByRole('button', { name: /approve batch/i }).first().click();
  const officerModal = officerPage.locator('.cds--modal.is-visible').first();
  await expect(officerModal).toBeVisible();
  await officerModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await officerModal.isVisible()) {
    await officerModal.locator('button.cds--modal-close').click();
  }
  await officerSession.cleanup();

  // Enterprise
  const enterpriseSession = await createRolePage(browser, 'enterprise', safeBaseUrl);
  const enterprisePage = enterpriseSession.page;
  await enterprisePage.getByRole('button', { name: /digitally sign procurement/i }).first().click();
  const enterpriseModal = enterprisePage.locator('.cds--modal.is-visible').first();
  await expect(enterpriseModal).toBeVisible();
  await enterpriseModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await enterpriseModal.isVisible()) {
    await enterpriseModal.locator('button.cds--modal-close').click();
  }
  await enterpriseSession.cleanup();

  // Consumer
  const consumerSession = await createRolePage(browser, 'consumer', safeBaseUrl);
  const consumerPage = consumerSession.page;
  await consumerPage.fill('#batch-search', labBatchId);
  await consumerPage.getByRole('button', { name: /^Search$/ }).click();
  await expect(consumerPage.getByText(new RegExp(`ID:\\s*${labBatchId}`))).toBeVisible();
  await consumerSession.cleanup();

  // Secretary
  const secretarySession = await createRolePage(browser, 'secretary', safeBaseUrl);
  const secretaryPage = secretarySession.page;
  await expect(secretaryPage.getByRole('button', { name: /initiate disbursal/i })).toBeVisible();
  await secretaryPage.getByRole('button', { name: /initiate disbursal/i }).click();
  await secretarySession.cleanup();
});
