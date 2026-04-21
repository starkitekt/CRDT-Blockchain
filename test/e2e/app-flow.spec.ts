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
  // The harvest form requires a GPS lock before "Submit to Ledger" enables.
  // Granting geolocation unconditionally lets this test run against either the
  // built-in webServer or an externally-managed PLAYWRIGHT_BASE_URL.
  await context.grantPermissions(['geolocation']);
  await context.setGeolocation({ latitude: 22.8465, longitude: 81.3340 });
  await disableOnboarding(page);
  await page.goto('/en');
  await expect(page).toHaveTitle(/HoneyTRACE/i);

  // 1) Farmer: create a new harvest through the modal form.
  await loginViaUi(page, 'farmer');
  const recordHarvestButton = page.getByRole('button', { name: /record new harvest/i });
  await expect(recordHarvestButton).toBeVisible();
  // openModal() triggers GET /api/warehouses; race that against the modal
  // animation so we can fail fast if the API never resolves on a slow dev
  // server. We retry the click once if either the modal or the warehouse
  // request fails to land.
  const originField = page.locator('#origin-field');
  let warehousesLoaded = false;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const warehousesPromise = page
      .waitForResponse(
        (resp) => resp.url().includes('/api/warehouses') && resp.request().method() === 'GET',
        { timeout: 30_000 },
      )
      .catch(() => null);
    await recordHarvestButton.click();
    try {
      await expect(originField).toBeVisible({ timeout: 15_000 });
      const wResp = await warehousesPromise;
      if (wResp && wResp.status() < 400) {
        warehousesLoaded = true;
        break;
      }
    } catch {
      // fall through to retry
    }
    if (attempt === 2) {
      throw new Error('Record-harvest modal failed to open or warehouses failed to load');
    }
    // Close the modal (if open) before retrying so a fresh open re-fires loadWarehouses.
    const cancelBtn = page.getByRole('button', { name: /^Cancel$/ }).first();
    if (await cancelBtn.isVisible().catch(() => false)) {
      await cancelBtn.click().catch(() => {});
    }
    await page.waitForTimeout(500);
  }
  expect(warehousesLoaded, 'GET /api/warehouses must succeed before submitting').toBe(true);
  await originField.fill(`Mustard Test ${Date.now()}`);
  await page.locator('#weight-field').fill('18');
  await page.locator('#moisture-content').fill('16');
  await expect(page.getByText(/GPS LOCK/i)).toBeVisible({ timeout: 15000 });
  // Pick the first real warehouse so the submit button enables.
  const warehouseSelect = page.locator('#warehouse-select');
  await expect(warehouseSelect).toBeEnabled({ timeout: 30_000 });
  const warehouseValues = await warehouseSelect.locator('option').evaluateAll((opts) =>
    opts.map((o) => (o as HTMLOptionElement).value).filter((v) => v && v.trim().length > 0)
  );
  expect(warehouseValues.length).toBeGreaterThan(0);
  await warehouseSelect.selectOption(warehouseValues[0]);
  const submitButton = page.locator('.cds--modal-footer .cds--btn--primary').last();
  await expect(submitButton).toBeEnabled({ timeout: 15000 });
  // Capture the batch ID from the POST /api/batches response so subsequent
  // role steps target the freshly-created batch instead of an older one in
  // the table that happens to share the HT-YYYYMMDD-NNN prefix.
  const batchCreatePromise = page.waitForResponse(
    (resp) => resp.url().includes('/api/batches') && resp.request().method() === 'POST' && resp.status() < 400,
    { timeout: 30_000 },
  );
  await submitButton.click();
  const batchCreateResponse = await batchCreatePromise;
  const batchCreateBody = await batchCreateResponse.json();
  const batchId: string = batchCreateBody?.data?.batchId
    ?? batchCreateBody?.batch?.batchId
    ?? batchCreateBody?.batchId
    ?? batchCreateBody?.data?.id
    ?? batchCreateBody?.id;
  expect(batchId, 'Created batchId should be returned by API').toMatch(/HT-\d{8}-\d{3}/);
  // The harvest modal closes after a successful submit, then a "Batch
  // Registered" QR-code modal appears. Dismiss it before continuing.
  const qrDialog = page.getByRole('dialog', { name: /Batch Registered/i });
  await expect(qrDialog).toBeVisible({ timeout: 30_000 });
  await qrDialog.locator('button.cds--modal-close').first().click();
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 15_000 });

  // 2) Warehouse: mark the batch as incoming.
  await loginViaUi(page, 'warehouse');
  const incomingButton = page.getByRole('button', { name: /record incoming batch/i }).first();
  await expect(incomingButton).toBeVisible();
  await incomingButton.click();
  const incomingBatchInput = page.locator('#incoming-batch-id');
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(incomingBatchInput).toBeVisible({ timeout: 10_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error('Incoming-batch modal failed to open');
      await incomingButton.click();
    }
  }
  const warehouseModal = page.locator('.cds--modal.is-visible').last();
  await incomingBatchInput.fill(batchId);
  // Capture the inbound POST so we can confirm the API succeeded before
  // asserting on UI state (Carbon's animation can leave the modal in DOM
  // briefly even after `isOpen` flips to false).
  const incomingResponsePromise = page.waitForResponse(
    (resp) =>
      resp.url().includes(`/api/batches/${batchId}`) && resp.request().method() === 'PATCH',
    { timeout: 60_000 },
  );
  await warehouseModal.locator('.cds--modal-footer .cds--btn--primary').click();
  const incomingResponse = await incomingResponsePromise;
  expect(incomingResponse.status(), `Incoming batch failed: ${await incomingResponse.text().catch(() => '')}`).toBeLessThan(400);
  await expect(page.locator('.cds--modal.is-visible')).toHaveCount(0, { timeout: 30_000 });

  // 3) Lab: publish analysis from frontend form.
  await loginViaUi(page, 'lab');
  // useCurrentUser hydrates via GET /api/auth on mount; handlePublish
  // silently bails (showing "Session not ready") if currentUser.userId is
  // still empty when we click. Poll /api/auth from the page until it
  // returns a userId, then reload so the React hook re-fetches against
  // a confirmed-warm cookie/session.
  await expect.poll(
    async () =>
      page.evaluate(async () => {
        const res = await fetch('/api/auth', { method: 'GET' });
        if (!res.ok) return '';
        const body = await res.json().catch(() => null);
        return body?.user?.userId ?? '';
      }),
    { timeout: 30_000 }
  ).not.toBe('');
  await page.reload({ waitUntil: 'domcontentloaded' });
  let availableLabBatchIds: string[] = [];
  await expect
    .poll(async () => {
      availableLabBatchIds = await page.locator('#batch-select option').evaluateAll((options) =>
        options
          .map((option) => (option as HTMLOptionElement).value)
          .filter((value) => value && value.trim().length > 0)
      );
      return availableLabBatchIds.includes(batchId);
    }, { timeout: 20_000 })
    .toBe(true);
  const labBatchId = batchId;
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
  // Watch for the POST /api/lab response to confirm publishing succeeded
  // before asserting on UI state. handlePublish silently bails when the
  // useCurrentUser hook hasn't hydrated yet (showing "Session not ready"
  // inline). Retry up to 3 publish clicks, reloading + refilling between
  // attempts so the React component re-runs its effect against the now-
  // warm /api/auth response.
  const publishButton = page.getByRole('button', { name: /publish/i });
  const sessionNotReady = page.getByText(/Session not ready/i);
  let publishRes: Awaited<ReturnType<typeof page.waitForResponse>> | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const labPublishResponse = page.waitForResponse(
      (resp) => resp.url().includes('/api/lab') && resp.request().method() === 'POST',
      { timeout: 20_000 },
    );
    await publishButton.click();
    try {
      publishRes = await labPublishResponse;
      break;
    } catch {
      // No POST landed; UI likely showed "Session not ready". Reload and refill.
      if (await sessionNotReady.isVisible().catch(() => false)) {
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(2_000);
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
        continue;
      }
      throw new Error('Publish click did not trigger /api/lab POST');
    }
  }
  if (!publishRes) throw new Error('Publish never produced an /api/lab POST');
  expect(publishRes.status(), `Lab publish failed: ${await publishRes.text().catch(() => '')}`).toBeLessThan(400);
  await expect(page.getByRole('row', { name: new RegExp(labBatchId) }))
    .toContainText(/in testing|certified/i, { timeout: 30_000 });

  // 4) Officer: approve via signing payload action.
  await loginViaUi(page, 'officer');
  const approveButton = page.getByRole('button', { name: /approve batch/i }).first();
  await expect(approveButton).toBeVisible();
  await approveButton.click();
  const officerModal = page.locator('.cds--modal.is-visible').first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(officerModal).toBeVisible({ timeout: 10_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error('Officer modal failed to open');
      await approveButton.click();
    }
  }
  await officerModal.locator('.cds--modal-footer .cds--btn--primary').click();
  if (await officerModal.isVisible()) {
    await officerModal.locator('button.cds--modal-close').click();
  }

  // 5) Enterprise: open a batch's detail / certificate modal to confirm
  // procurement-side traceability is reachable from the UI.
  await loginViaUi(page, 'enterprise');
  const detailsButton = page.getByRole('button', { name: /^Details$/ }).first();
  const certificateButton = page.getByRole('button', { name: /^Certificate$/ }).first();
  const enterpriseAction = (await detailsButton.count()) > 0 ? detailsButton : certificateButton;
  await expect(enterpriseAction).toBeVisible({ timeout: 15_000 });
  await enterpriseAction.click();
  const enterpriseModal = page.getByRole('dialog').last();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await expect(enterpriseModal).toBeVisible({ timeout: 10_000 });
      break;
    } catch {
      if (attempt === 2) throw new Error('Enterprise modal failed to open');
      await enterpriseAction.click();
    }
  }
  const enterpriseClose = enterpriseModal.locator('button.cds--modal-close').first();
  if ((await enterpriseClose.count()) > 0) {
    await enterpriseClose.click();
    await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 10_000 });
  }

  // 6) Consumer: search and verify batch traceability card. The QR card
  // sibling re-renders on every keystroke, so we sync the React state via
  // its internal valueTracker (the standard hack for React-controlled
  // inputs) and dispatch a single 'input' event.
  await loginViaUi(page, 'consumer');
  const searchInput = page.locator('#batch-search');
  await expect(searchInput).toBeVisible();
  // The QR card mounts the moment searchId is non-empty, which can
  // interrupt typing. Retry fill+keyboard.type combinations until both
  // the input value AND the verify button reflect the full batch id.
  const verifyButton = page.getByRole('button', { name: /^(Verify|Search)$/i });
  let verifyEnabled = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await searchInput.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await searchInput.fill(labBatchId);
    if (
      (await searchInput.inputValue().catch(() => '')) === labBatchId &&
      (await verifyButton.isEnabled().catch(() => false))
    ) {
      verifyEnabled = true;
      break;
    }
    // Fall back to keyboard.insertText so React processes a single change.
    await searchInput.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.insertText(labBatchId);
    if (
      (await searchInput.inputValue().catch(() => '')) === labBatchId &&
      (await verifyButton.isEnabled().catch(() => false))
    ) {
      verifyEnabled = true;
      break;
    }
    await page.waitForTimeout(500);
  }
  expect(verifyEnabled, 'Verify button must enable after typing batchId').toBe(true);
  // The /api/trace endpoint is the most reliable signal that the consumer
  // verification request landed; assert against its response.
  const traceResponse = page.waitForResponse(
    (resp) => resp.url().includes(`/api/trace/${labBatchId}`),
    { timeout: 30_000 },
  );
  await verifyButton.click();
  const traceRes = await traceResponse;
  expect(traceRes.status()).toBeLessThan(400);
  // The Verify button re-enables once isSearching flips back, and the
  // result pane (purity tile + flora type) renders once batchData arrives.
  await expect(page.getByText(/Natural Purity/i)).toBeVisible({ timeout: 20_000 });

  // 7) Secretary: verify policy action control is usable from UI.
  await loginViaUi(page, 'secretary');
  await expect(page.getByRole('button', { name: /initiate disbursal/i })).toBeVisible();
  await page.getByRole('button', { name: /initiate disbursal/i }).click();
});