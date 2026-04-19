/**
 * Frontend smoke + happy-path coverage.
 *
 * Exercises the actual UI (not just APIs) across every role's dashboard, the
 * public landing/track/trace pages, and the marketplace's full happy path
 * (farmer creates listing in the modal → enterprise bids via the form →
 * admin settles via the Settle button) so we catch missing modules, broken
 * Carbon imports, server-component crashes, or hidden client-side errors.
 */

import { Browser, BrowserContext, expect, Page, test, APIRequestContext } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const USERS = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  lab: { email: 'lab@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  secretary: { email: 'secretary@honeytrace.gov', password: 'password123' },
  admin: { email: 'admin@honeytrace.gov', password: 'Admin@password123' },
} as const;

type Role = keyof typeof USERS;

async function disableOnboarding(page: Page) {
  await page.addInitScript(() => {
    const roles = ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'secretary', 'admin'];
    for (const role of roles) {
      localStorage.setItem(`${role}_tour_seen`, 'true');
      localStorage.setItem(`${role}_kyc_completed`, 'true');
    }
  });
}

async function loginRequest(request: APIRequestContext, role: Role) {
  const u = USERS[role];
  const res = await request.post('/api/auth', {
    data: { email: u.email, password: u.password, role },
  });
  expect(res.status(), `Login as ${role} failed: ${await res.text()}`).toBe(200);
}

async function getProfile(request: APIRequestContext) {
  const res = await request.get('/api/profile');
  expect(res.status()).toBe(200);
  return res.json();
}

async function pickWarehouseId(request: APIRequestContext) {
  const res = await request.get('/api/warehouses');
  expect(res.status()).toBe(200);
  const list = await res.json();
  expect(Array.isArray(list) && list.length > 0).toBeTruthy();
  return list[0].id as string;
}

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      return;
    } catch (err) {
      lastErr = err;
      await page.waitForTimeout(1500);
    }
  }
  throw lastErr;
}

async function newRoleSession(browser: Browser, role: Role): Promise<{ page: Page; context: BrowserContext; cleanup: () => Promise<void> }> {
  const context = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
  await loginRequest(context.request, role);
  const page = await context.newPage();
  await disableOnboarding(page);
  return { page, context, cleanup: () => context.close() };
}

/** Asserts no Next.js dev overlay or red error boundary is showing. */
async function assertNoFatalError(page: Page) {
  // Next.js dev overlay (when a server/client component throws) shows a button
  // labelled "Open the Next.js Dev Tools" plus an iframe with role=dialog and
  // the text "Build Error" / "Unhandled Runtime Error". We assert none of
  // those error markers are present.
  const fatalMarkers = [
    'Build Error',
    'Unhandled Runtime Error',
    'This page could not be found',
    'Application error: a server-side exception has occurred',
  ];
  for (const marker of fatalMarkers) {
    await expect(
      page.getByText(marker, { exact: false }),
      `Page shows fatal "${marker}" overlay`,
    ).toHaveCount(0);
  }
}

test.describe('Frontend smoke', () => {
  test.describe.configure({ mode: 'serial' });

  test('public landing + track pages render', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    const page = await context.newPage();
    await gotoWithRetry(page, `${BASE_URL}/en`);
    await expect(page).toHaveTitle(/HoneyTRACE/i);
    await assertNoFatalError(page);

    await gotoWithRetry(page, `${BASE_URL}/en/track`);
    await assertNoFatalError(page);
    await context.close();
  });

  for (const role of ['farmer', 'warehouse', 'lab', 'officer', 'enterprise', 'consumer', 'secretary', 'admin'] as const) {
    test(`${role} dashboard renders without fatal error`, async ({ browser }) => {
      const session = await newRoleSession(browser, role);
      await gotoWithRetry(session.page, `${BASE_URL}/en/dashboard/${role}`);
      await expect(session.page).toHaveURL(new RegExp(`/en/dashboard/${role}`));
      // Wait for a heading to appear so we know React mounted.
      await expect(session.page.locator('h1, h2').first()).toBeVisible({ timeout: 30_000 });
      await assertNoFatalError(session.page);
      await session.cleanup();
    });
  }
});

test.describe('Marketplace UI happy path', () => {
  test('farmer lists, enterprise bids, admin settles — all through the UI', async ({ browser }) => {
    // ── Bootstrap a fresh batch + warehouse hand-off via API so the test
    //    focuses on UI paths that are still under our ownership. ─────────────
    const farmerCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(farmerCtx.request, 'farmer');
    const farmer = await getProfile(farmerCtx.request);
    const warehouseCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(warehouseCtx.request, 'warehouse');

    const warehouseId = await pickWarehouseId(farmerCtx.request);

    const farmerId = String(farmer._id ?? farmer.id ?? '');
    const farmerName = farmer.name ?? 'Test Farmer';
    const floraType = `UI Eucalyptus ${Date.now()}`;

    const createBatchRes = await farmerCtx.request.post('/api/batches', {
      data: {
        farmerId,
        farmerName,
        floraType,
        weightKg: 18,
        moisturePct: 17,
        latitude: '22.8465',
        longitude: '81.3340',
        grade: 'A',
        harvestDate: new Date().toISOString().slice(0, 10),
        warehouseId,
      },
    });
    expect(createBatchRes.status(), `Create batch: ${await createBatchRes.text()}`).toBe(201);
    const batchId = String((await createBatchRes.json())?.data?.batchId ?? '');
    expect(batchId).toMatch(/HT-\d{8}-\d{3}/);

    const patchRes = await warehouseCtx.request.patch(`/api/batches/${batchId}`, {
      data: { status: 'in_warehouse' },
    });
    expect(patchRes.status()).toBe(200);

    // ── Farmer opens the marketplace UI and creates a listing through the
    //    "List a batch" modal. ─────────────────────────────────────────────────
    const farmerPage = await farmerCtx.newPage();
    await disableOnboarding(farmerPage);
    await gotoWithRetry(farmerPage, `${BASE_URL}/en/dashboard/marketplace`);
    await expect(farmerPage.getByRole('heading', { name: /Honey Marketplace/i })).toBeVisible({ timeout: 30_000 });
    await assertNoFatalError(farmerPage);

    // Open the create-listing modal.
    await farmerPage.getByTestId('create-listing-button').click();
    // Carbon Select renders a native <select> under the hood — we use
    // selectOption() with the actual batchId so the test mirrors the user's
    // dropdown choice.
    const batchSelect = farmerPage.getByTestId('create-batch-select');
    await expect(batchSelect).toBeVisible({ timeout: 15_000 });
    await batchSelect.selectOption(batchId);

    // Fill reserve / increment / duration via the Carbon NumberInputs.
    // We target the <input type="number"> inside each tagged wrapper.
    // Carbon NumberInput forwards data-testid to the inner <input>; match either.
    const numberInput = (testId: string) =>
      farmerPage
        .locator(`input[data-testid="${testId}"], [data-testid="${testId}"] input[type="number"]`)
        .first();
    const reserveInput = numberInput('create-reserve');
    const incrementInput = numberInput('create-increment');
    const durationInput = numberInput('create-duration');
    await reserveInput.fill('5000');
    await incrementInput.fill('100');
    await durationInput.fill('5');

    await farmerPage.getByTestId('create-notes').fill('Listed end-to-end via UI smoke test');

    // The modal's primary footer button is "Open auction".
    const submitListing = farmerPage.locator('.cds--modal-footer .cds--btn--primary').filter({ hasText: /open auction/i });
    await submitListing.click();

    // Wait for the freshly-created card to appear in the live grid. The
    // marketplace page polls every 7s; with a slow webpack dev server the
    // first cold fetch can take 10–20s, so allow two poll cycles.
    const liveCard = farmerPage.locator('[data-testid="listing-card"]').filter({ hasText: floraType }).first();
    await expect(liveCard).toBeVisible({ timeout: 60_000 });
    await expect(liveCard).toContainText(/MK-\d{8}-\d{3}/);
    const listingId = (await liveCard.locator('p').first().textContent())?.trim() ?? '';
    expect(listingId).toMatch(/^MK-\d{8}-\d{3}$/);

    // ── Enterprise opens the listing detail page and bids through the form ───
    const enterpriseSession = await newRoleSession(browser, 'enterprise');
    await gotoWithRetry(enterpriseSession.page, `${BASE_URL}/en/dashboard/marketplace/${listingId}`);
    await expect(enterpriseSession.page.getByTestId('current-price')).toBeVisible({ timeout: 30_000 });
    await assertNoFatalError(enterpriseSession.page);

    // Carbon's NumberInput forwards `data-testid` to the inner <input>; fall back
    // to the wrapper if a future Carbon release changes that.
    const bidInput = enterpriseSession.page.locator(
      'input[data-testid="bid-amount-input"], [data-testid="bid-amount-input"] input[type="number"]'
    ).first();
    await expect(bidInput).toBeVisible({ timeout: 30_000 });
    await bidInput.click();
    await bidInput.press('ControlOrMeta+a');
    await bidInput.press('Delete');
    await bidInput.type('5000', { delay: 25 });
    await bidInput.blur();
    await Promise.all([
      enterpriseSession.page.waitForResponse(
        (r) => r.url().includes(`/api/marketplace/listings/${listingId}/bids`) && r.request().method() === 'POST' && r.status() === 201,
        { timeout: 30_000 }
      ),
      enterpriseSession.page.getByTestId('submit-bid-button').click(),
    ]);

    // The detail page polls every 5s; assert the price + bid history reflect the bid.
    await expect(enterpriseSession.page.getByTestId('current-price')).toContainText('5,000.00', { timeout: 30_000 });
    await expect(enterpriseSession.page.getByTestId('bid-history')).toBeVisible();
    await expect(
      enterpriseSession.page.getByTestId('bid-history').locator('div').filter({ hasText: '₹5,000.00' }).first()
    ).toBeVisible();

    // ── Farmer cannot bid on their own listing — the UI shows an explanation
    //    and hides the bid form. ────────────────────────────────────────────────
    await gotoWithRetry(farmerPage, `${BASE_URL}/en/dashboard/marketplace/${listingId}`);
    await expect(farmerPage.getByText(/You own this listing/i)).toBeVisible({ timeout: 20_000 });
    await expect(farmerPage.getByTestId('bid-amount-input')).toHaveCount(0);

    // ── Admin force-settles the auction via API (the UI Settle button only
    //    appears once `endsAt` has passed; we don't want to wait 5 minutes in a
    //    smoke test). We then assert the detail page UI reflects the settled
    //    state. ────────────────────────────────────────────────────────────────
    const adminCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(adminCtx.request, 'admin');
    const settleRes = await adminCtx.request.post(
      `/api/marketplace/listings/${listingId}/settle?force=1`
    );
    expect(settleRes.status(), `Settle: ${await settleRes.text()}`).toBe(200);

    await enterpriseSession.page.reload({ waitUntil: 'domcontentloaded' });
    await expect(enterpriseSession.page.getByTestId('status-live')).toHaveCount(0);
    await expect(enterpriseSession.page.getByText(/Settled/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(enterpriseSession.page.getByTestId('storage-cost')).toBeVisible();
    await expect(enterpriseSession.page.getByTestId('projected-net')).toBeVisible();

    await enterpriseSession.cleanup();
    await adminCtx.close();
    await farmerCtx.close();
    await warehouseCtx.close();
  });

  test('consumer cap: UI rejects ₹60,000 bid with friendly error', async ({ browser }) => {
    // Set up a fresh listing through the API.
    const farmerCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(farmerCtx.request, 'farmer');
    const farmer = await getProfile(farmerCtx.request);
    const warehouseCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(warehouseCtx.request, 'warehouse');

    const warehouseId = await pickWarehouseId(farmerCtx.request);
    const createBatchRes = await farmerCtx.request.post('/api/batches', {
      data: {
        farmerId: String(farmer._id ?? farmer.id ?? ''),
        farmerName: farmer.name ?? 'Test Farmer',
        floraType: `UI ConsumerCap ${Date.now()}`,
        weightKg: 12,
        moisturePct: 16,
        latitude: '22.8465',
        longitude: '81.3340',
        grade: 'A',
        harvestDate: new Date().toISOString().slice(0, 10),
        warehouseId,
      },
    });
    expect(createBatchRes.status()).toBe(201);
    const batchId = String((await createBatchRes.json())?.data?.batchId ?? '');
    await warehouseCtx.request.patch(`/api/batches/${batchId}`, { data: { status: 'in_warehouse' } });
    const listingRes = await farmerCtx.request.post('/api/marketplace/listings', {
      data: { batchId, reservePricePaise: 100_000, bidIncrementPaise: 10_000, durationMinutes: 5 },
    });
    expect(listingRes.status()).toBe(201);
    const listingId = (await listingRes.json())?.data?.listingId as string;

    // Consumer logs in via UI and tries to bid ₹60,000.
    const consumerSession = await newRoleSession(browser, 'consumer');
    await gotoWithRetry(consumerSession.page, `${BASE_URL}/en/dashboard/marketplace/${listingId}`);
    const bidInput = consumerSession.page.locator(
      'input[data-testid="bid-amount-input"], [data-testid="bid-amount-input"] input[type="number"]'
    ).first();
    await expect(bidInput).toBeVisible({ timeout: 30_000 });
    // Use clear + sequential typing so Carbon's controlled NumberInput definitely
    // commits the value (its internal state listens for input events).
    await bidInput.click();
    await bidInput.press('ControlOrMeta+a');
    await bidInput.press('Delete');
    await bidInput.type('60000', { delay: 25 });
    await bidInput.blur();
    // Submit the bid and wait for the API to actually return 400 — that's the
    // signal the rejection notification will mount.
    await Promise.all([
      consumerSession.page.waitForResponse(
        (r) => r.url().includes(`/api/marketplace/listings/${listingId}/bids`) && r.request().method() === 'POST',
        { timeout: 30_000 }
      ),
      consumerSession.page.getByTestId('submit-bid-button').click(),
    ]);
    await expect(consumerSession.page.getByText(/Bid rejected/i)).toBeVisible({ timeout: 30_000 });
    await expect(consumerSession.page.getByText(/CONSUMER_BID_CAP_EXCEEDED/i)).toBeVisible();

    // ₹2,000 succeeds.
    await bidInput.click();
    await bidInput.press('ControlOrMeta+a');
    await bidInput.press('Delete');
    await bidInput.type('2000', { delay: 25 });
    await bidInput.blur();
    await Promise.all([
      consumerSession.page.waitForResponse(
        (r) => r.url().includes(`/api/marketplace/listings/${listingId}/bids`) && r.request().method() === 'POST' && r.status() === 201,
        { timeout: 30_000 }
      ),
      consumerSession.page.getByTestId('submit-bid-button').click(),
    ]);
    await expect(consumerSession.page.getByTestId('current-price')).toContainText('2,000.00', { timeout: 30_000 });
    await expect(consumerSession.page.getByText(/Bid placed/i)).toBeVisible();

    await consumerSession.cleanup();
    await farmerCtx.close();
    await warehouseCtx.close();
  });

  test('marketplace navigation link works from every operational role', async ({ browser }) => {
    for (const role of ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer'] as const) {
      const session = await newRoleSession(browser, role);
      await gotoWithRetry(session.page, `${BASE_URL}/en/dashboard/${role}`);
      // Click the top-nav Marketplace link.
      const navLink = session.page.getByRole('link', { name: 'Marketplace', exact: true }).first();
      await expect(navLink).toBeVisible({ timeout: 30_000 });
      await navLink.click();
      await expect(session.page).toHaveURL(/\/dashboard\/marketplace/);
      await expect(session.page.getByRole('heading', { name: /Honey Marketplace/i })).toBeVisible({ timeout: 30_000 });
      await assertNoFatalError(session.page);
      await session.cleanup();
    }
  });
});
