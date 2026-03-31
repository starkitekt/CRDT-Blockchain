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

  await page.goto(`/en/dashboard/${role}`);
  await expect(page).toHaveURL(new RegExp(`/en/dashboard/${role}$`), { timeout: 60000 });
}

test('all user roles sign in and execute frontend workflows', async ({ page, context }) => {
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 22.8465, longitude: 81.3340 });
  await disableOnboarding(page);
  await page.goto('/en');
  await expect(page).toHaveTitle(/HoneyTRACE/i);

  // 1) Farmer: create a new harvest through the modal form.
  await loginViaUi(page, 'farmer');
  const recordHarvestButton = page.getByRole('button', { name: /record new harvest/i });
  await expect(recordHarvestButton).toBeVisible();
  await recordHarvestButton.click();
  const farmerModal = page.getByRole('dialog').last();
  await expect(farmerModal).toBeVisible();
  await farmerModal.locator('#origin-field').fill(`Mustard Test ${Date.now()}`);
  await farmerModal.locator('#weight-field').fill('18');
  await farmerModal.locator('#moisture-content').fill('16');
  await expect(farmerModal.getByText(/GPS LOCK/i)).toBeVisible({ timeout: 15000 });
  await farmerModal.locator('.cds--modal-footer .cds--btn--primary').click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const farmerPageText = (await page.locator('body').innerText()) || '';
  const batchIdMatch = farmerPageText.match(/HT-\d{8}-\d{3}/);
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