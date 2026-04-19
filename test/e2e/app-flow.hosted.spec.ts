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

  expect(authResponse).toBeDefined();
  expect(authResponse!.status()).toBe(200);

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

  // Farmer — fetch the real farmer profile + a valid warehouse so the
  // batch creation API mirrors what the UI submits in the local spec.
  const farmerSession = await createRolePage(browser, 'farmer', safeBaseUrl);
  const farmerPage = farmerSession.page;
  const profileRes = await farmerPage.context().request.get('/api/profile');
  expect(profileRes.status(), `GET /api/profile: ${await profileRes.text()}`).toBe(200);
  const profile = await profileRes.json();
  const farmerId = String(profile?._id ?? profile?.id ?? '');
  const farmerName = profile?.name ?? 'Test Farmer';
  expect(farmerId, 'farmer id missing from profile').not.toBe('');
  const warehousesRes = await farmerPage.context().request.get('/api/warehouses');
  expect(warehousesRes.status()).toBe(200);
  const warehouses = await warehousesRes.json();
  expect(Array.isArray(warehouses) && warehouses.length > 0, 'No warehouses seeded').toBeTruthy();
  const warehouseId = String(warehouses[0].id);

  const createResponse = await farmerPage.context().request.post('/api/batches', {
    data: {
      farmerId,
      farmerName,
      floraType: `Mustard Hosted ${Date.now()}`,
      weightKg: 18,
      moisturePct: 16,
      latitude: '22.8465',
      longitude: '81.3340',
      grade: 'A',
      harvestDate: new Date().toISOString().slice(0, 10),
      warehouseId,
    },
  });
  expect(createResponse.status(), `Create batch: ${await createResponse.text()}`).toBe(201);
  const createPayload = await createResponse.json();
  const batchId = String(createPayload?.data?.batchId ?? '');
  expect(batchId).toMatch(/HT-\d{8}-\d{3}/);

  await farmerPage.reload({ waitUntil: 'domcontentloaded' });
  // The same batchId is rendered in both the KPI strip and the table; we
  // only need at least one occurrence to confirm the batch persisted.
  await expect(farmerPage.getByText(batchId).first()).toBeVisible({ timeout: 20000 });

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

  // Lab — wait for the auth/session to hydrate, then publish the freshly
  // created batch.
  const labSession = await createRolePage(browser, 'lab', safeBaseUrl);
  const labPage = labSession.page;
  await expect.poll(
    async () =>
      labPage.evaluate(async () => {
        const res = await fetch('/api/auth', { method: 'GET' });
        if (!res.ok) return '';
        const body = await res.json().catch(() => null);
        return body?.user?.userId ?? '';
      }),
    { timeout: 30_000 }
  ).not.toBe('');
  await labPage.reload({ waitUntil: 'domcontentloaded' });
  let availableLabBatchIds: string[] = [];
  await expect
    .poll(async () => {
      availableLabBatchIds = await labPage.locator('#batch-select option').evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value && value.trim().length > 0)
      );
      return availableLabBatchIds.includes(batchId);
    }, { timeout: 45000 })
    .toBe(true);
  const labBatchId = batchId;

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
  // publishLabResult moves the batch to `in_testing`; the officer
  // approval below promotes it to `certified`. Match either state.
  // handlePublish silently bails (showing "Session not ready") when
  // useCurrentUser hasn't hydrated yet; retry through a reload + refill
  // cycle.
  const publishButton = labPage.getByRole('button', { name: /publish/i });
  const sessionNotReady = labPage.getByText(/Session not ready/i);
  let publishRes;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const labPublishResponse = labPage.waitForResponse(
      (resp) => resp.url().includes('/api/lab') && resp.request().method() === 'POST',
      { timeout: 20_000 },
    );
    await publishButton.click();
    try {
      publishRes = await labPublishResponse;
      break;
    } catch {
      if (await sessionNotReady.isVisible().catch(() => false)) {
        await labPage.reload({ waitUntil: 'domcontentloaded' });
        await labPage.waitForTimeout(2_000);
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
        continue;
      }
      throw new Error('Publish click did not trigger /api/lab POST');
    }
  }
  if (!publishRes) throw new Error('Publish never produced an /api/lab POST');
  expect(publishRes.status(), `Lab publish failed: ${await publishRes.text().catch(() => '')}`).toBeLessThan(400);
  await expect(labPage.getByRole('row', { name: new RegExp(labBatchId) }))
    .toContainText(/in testing|certified/i, { timeout: 30000 });
  await labSession.cleanup();

  // Officer
  const officerSession = await createRolePage(browser, 'officer', safeBaseUrl);
  const officerPage = officerSession.page;
  const approveBtn = officerPage.getByRole('button', { name: /approve batch/i }).first();
  await expect(approveBtn).toBeVisible({ timeout: 30_000 });
  await approveBtn.click();
  const officerModal = officerPage.locator('.cds--modal.is-visible').first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(officerModal).toBeVisible({ timeout: 10_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error('Officer modal failed to open');
      await approveBtn.click();
    }
  }
  await officerModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await officerModal.isVisible().catch(() => false)) {
    await officerModal.locator('button.cds--modal-close').click().catch(() => {});
  }
  await officerSession.cleanup();

  // Enterprise — open Details (or Certificate) modal to confirm
  // procurement-side traceability is reachable from the UI.
  const enterpriseSession = await createRolePage(browser, 'enterprise', safeBaseUrl);
  const enterprisePage = enterpriseSession.page;
  const detailsButton = enterprisePage.getByRole('button', { name: /^Details$/ }).first();
  const certButton = enterprisePage.getByRole('button', { name: /^Certificate$/ }).first();
  const enterpriseAction = (await detailsButton.count()) > 0 ? detailsButton : certButton;
  await expect(enterpriseAction).toBeVisible({ timeout: 30_000 });
  await enterpriseAction.click();
  const enterpriseModal = enterprisePage.locator('.cds--modal.is-visible').first();
  await expect(enterpriseModal).toBeVisible({ timeout: 15_000 });
  const enterpriseClose = enterpriseModal.locator('button.cds--modal-close').first();
  if ((await enterpriseClose.count()) > 0) {
    await enterpriseClose.click();
  }
  await enterpriseSession.cleanup();

  // Consumer — search and verify the batch traceability card. The QR
  // sibling card mounts the moment searchId is non-empty, which can
  // interrupt typing; retry until the verify button is enabled.
  const consumerSession = await createRolePage(browser, 'consumer', safeBaseUrl);
  const consumerPage = consumerSession.page;
  const searchInput = consumerPage.locator('#batch-search');
  await expect(searchInput).toBeVisible();
  const verifyButton = consumerPage.getByRole('button', { name: /^(Verify|Search)$/i });
  let verifyEnabled = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await searchInput.click();
    await consumerPage.keyboard.press('ControlOrMeta+a');
    await consumerPage.keyboard.press('Delete');
    await searchInput.fill(labBatchId);
    if (
      (await searchInput.inputValue().catch(() => '')) === labBatchId &&
      (await verifyButton.isEnabled().catch(() => false))
    ) {
      verifyEnabled = true;
      break;
    }
    await searchInput.click();
    await consumerPage.keyboard.press('ControlOrMeta+a');
    await consumerPage.keyboard.press('Delete');
    await consumerPage.keyboard.insertText(labBatchId);
    if (
      (await searchInput.inputValue().catch(() => '')) === labBatchId &&
      (await verifyButton.isEnabled().catch(() => false))
    ) {
      verifyEnabled = true;
      break;
    }
    await consumerPage.waitForTimeout(500);
  }
  expect(verifyEnabled, 'Verify button must enable after typing batchId').toBe(true);
  const traceResponse = consumerPage.waitForResponse(
    (resp) => resp.url().includes(`/api/trace/${labBatchId}`),
    { timeout: 30_000 },
  );
  await verifyButton.click();
  const traceRes = await traceResponse;
  expect(traceRes.status()).toBeLessThan(400);
  await expect(consumerPage.getByText(/Natural Purity/i)).toBeVisible({ timeout: 20_000 });
  await consumerSession.cleanup();

  // Secretary
  const secretarySession = await createRolePage(browser, 'secretary', safeBaseUrl);
  const secretaryPage = secretarySession.page;
  await expect(secretaryPage.getByRole('button', { name: /initiate disbursal/i })).toBeVisible();
  await secretaryPage.getByRole('button', { name: /initiate disbursal/i }).click();
  await secretarySession.cleanup();
});
