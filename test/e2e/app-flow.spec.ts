import { expect, Page, test } from '@playwright/test';

const USERS = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  lab: { email: 'lab@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  secretary: { email: 'secretary@honeytrace.gov', password: 'password123' },
} as const;

async function disableOnboarding(page: Page) {
  await page.addInitScript(() => {
    const roles = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'secretary', 'admin'];
    for (const role of roles) {
      localStorage.setItem(`${role}_tour_seen`, 'true');
      localStorage.setItem(`${role}_kyc_completed`, 'true');
    }
  });
}

async function loginViaUi(page: Page, role: keyof typeof USERS) {
  const user = USERS[role];
  const authResponse = await page.request.post('/api/auth', {
    data: { email: user.email, password: user.password, role },
  });
  expect(authResponse.status()).toBe(200);

  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
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

  if (lastError) {
    throw lastError;
  }

  await expect(page).toHaveURL(new RegExp(`/en/dashboard/${role}$`), { timeout: 60000 });
}

test('all user roles sign in and execute frontend workflows', async ({ page, context }) => {
  if (!process.env.PLAYWRIGHT_BASE_URL) {
    await context.grantPermissions(['geolocation']);
    await context.setGeolocation({ latitude: 22.8465, longitude: 81.3340 });
  }
  await disableOnboarding(page);
  await page.goto('/en');
  await expect(page).toHaveTitle(/HoneyTRACE/i);

  // 1) Farmer: create a new harvest through the modal form.
  await loginViaUi(page, 'farmer');
  const recordHarvestButton = page.getByRole('button', { name: /record new harvest/i });
  await expect(recordHarvestButton).toBeVisible();
  await recordHarvestButton.click();
  const originField = page.locator('#origin-field');
  if (!(await originField.isVisible())) {
    await recordHarvestButton.click({ force: true });
  }
  await expect(originField).toBeVisible({ timeout: 15000 });
  await originField.fill(`Mustard Test ${Date.now()}`);
  await page.locator('#weight-field').fill('18');
  await page.locator('#moisture-content').fill('16');
  await expect(page.getByText(/GPS LOCK/i)).toBeVisible({ timeout: 15000 });
  await page.locator('.cds--modal-footer .cds--btn--primary').last().click();
  const farmerDialog = page.getByRole('dialog').first();
  if (await farmerDialog.isVisible()) {
    const closeButton = farmerDialog.locator('button.cds--modal-close');
    if ((await closeButton.count()) > 0) {
      await closeButton.first().click();
    }
  }
  let detectedBatchId = '';
  await expect
    .poll(async () => {
      const text = (await page.locator('body').innerText()) || '';
      detectedBatchId = text.match(/HT-\d{8}-\d{3}/)?.[0] ?? '';
      return detectedBatchId;
    }, { timeout: 30000 })
    .toMatch(/HT-\d{8}-\d{3}/);
  const batchIdMatch = detectedBatchId.match(/HT-\d{8}-\d{3}/);
  expect(batchIdMatch).not.toBeNull();
  const batchId = batchIdMatch![0];

  // 2) Warehouse: mark the batch as incoming.
  await loginViaUi(page, 'warehouse');
  const incomingButton = page.getByRole('button', { name: /record incoming batch/i }).first();
  await expect(incomingButton).toBeVisible();
  await incomingButton.click();
  const warehouseModal = page.getByRole('dialog').last();
  await expect(warehouseModal).toBeVisible();
  await warehouseModal.locator('#incoming-batch-id').fill(batchId);
  await warehouseModal.locator('.cds--modal-footer .cds--btn--primary').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  // 3) Lab: publish analysis from frontend form.
  await loginViaUi(page, 'lab');
    const availableLabBatchIds = await page.locator('#batch-select option').evaluateAll((options) =>
      options
        .map((option) => (option as HTMLOptionElement).value)
        .filter((value) => value && value.trim().length > 0)
    );
    expect(availableLabBatchIds.length).toBeGreaterThan(0);
    const labBatchId = availableLabBatchIds[0];
    await page.selectOption('#batch-select', labBatchId);
  await page.fill('#fssai', '10016011000892');
  await page.fill('#nabl-cert', 'T-4521');
  await page.fill('#moisture', '16');
  await page.fill('#hmf', '20');
  await page.fill('#pollen', '100');
  await page.fill('#acidity', '20');
  await page.fill('#diastase', '12');
  await page.fill('#sucrose', '3');
  await page.fill('#reducing-sugars', '66');
  await page.fill('#conductivity', '0.4');
  await page.getByRole('button', { name: /publish/i }).click();
    await expect(page.getByRole('row', { name: new RegExp(labBatchId) })).toContainText(/certified/i, { timeout: 20000 });

  // 4) Officer: approve via signing payload action.
  await loginViaUi(page, 'officer');
  await page.getByRole('button', { name: /approve batch/i }).first().click();
  const officerModal = page.locator('.cds--modal.is-visible').first();
  await expect(officerModal).toBeVisible();
  await officerModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await officerModal.isVisible()) {
    await officerModal.locator('button.cds--modal-close').click();
  }

  // 5) Enterprise: digitally sign procurement for a certified batch.
  await loginViaUi(page, 'enterprise');
  await page.getByRole('button', { name: /digitally sign procurement/i }).first().click();
  const enterpriseModal = page.locator('.cds--modal.is-visible').first();
  await expect(enterpriseModal).toBeVisible();
  await enterpriseModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await enterpriseModal.isVisible()) {
    await enterpriseModal.locator('button.cds--modal-close').click();
  }

  // 6) Consumer: search and verify batch traceability card.
  await loginViaUi(page, 'consumer');
    await page.fill('#batch-search', labBatchId);
  await page.getByRole('button', { name: /^Search$/ }).click();
    await expect(page.getByText(new RegExp(`ID:\\s*${labBatchId}`))).toBeVisible();

  // 7) Secretary: verify policy action control is usable from UI.
  await loginViaUi(page, 'secretary');
  await expect(page.getByRole('button', { name: /initiate disbursal/i })).toBeVisible();
  await page.getByRole('button', { name: /initiate disbursal/i }).click();
});