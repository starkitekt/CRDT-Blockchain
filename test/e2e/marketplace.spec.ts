import { expect, Browser, Page, test, APIRequestContext } from '@playwright/test';

const USERS = {
  farmer: { email: 'farmer@honeytrace.gov', password: 'password123' },
  warehouse: { email: 'warehouse@honeytrace.gov', password: 'password123' },
  enterprise: { email: 'enterprise@honeytrace.gov', password: 'password123' },
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  officer: { email: 'officer@honeytrace.gov', password: 'password123' },
  admin: { email: 'admin@honeytrace.gov', password: 'Admin@password123' },
} as const;

type Role = keyof typeof USERS;

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

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
  expect(res.status(), `GET /api/profile: ${await res.text()}`).toBe(200);
  return res.json();
}

async function pickWarehouseId(request: APIRequestContext) {
  const res = await request.get('/api/warehouses');
  expect(res.status(), `GET /api/warehouses: ${await res.text()}`).toBe(200);
  const warehouses = await res.json();
  expect(Array.isArray(warehouses) && warehouses.length > 0, 'No warehouses seeded').toBeTruthy();
  return warehouses[0].id as string;
}

async function createBatchAsFarmer(
  farmerCtx: APIRequestContext,
  warehouseId: string,
  farmer: { _id?: string; id?: string; name?: string },
  floraType: string,
) {
  const farmerId = String(farmer._id ?? farmer.id ?? '');
  const farmerName = farmer.name ?? 'Test Farmer';
  expect(farmerId, 'farmer id missing from profile').not.toBe('');
  const res = await farmerCtx.post('/api/batches', {
    data: {
      farmerId,
      farmerName,
      floraType,
      weightKg: 22,
      moisturePct: 17,
      latitude: '22.8465',
      longitude: '81.3340',
      grade: 'A',
      harvestDate: new Date().toISOString().slice(0, 10),
      warehouseId,
    },
  });
  expect(res.status(), `Create batch: ${await res.text()}`).toBe(201);
  const body = await res.json();
  // `data.id` is the mongo _id; `data.batchId` is the human-friendly HT-… id.
  return String(body?.data?.batchId ?? '');
}

async function gotoWithRetry(page: Page, url: string, attempts = 3) {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120_000 });
      return;
    } catch (err) {
      lastErr = err;
      await page.waitForTimeout(2_000);
    }
  }
  throw lastErr;
}

async function loginAndOpenMarketplace(browser: Browser, role: Role) {
  const context = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
  await loginRequest(context.request, role);
  const page = await context.newPage();
  await disableOnboarding(page);
  await gotoWithRetry(page, `${BASE_URL}/en/dashboard/marketplace`);
  await expect(page).toHaveURL(/\/en\/dashboard\/marketplace/);
  return {
    page,
    context,
    cleanup: async () => context.close(),
  };
}

test.describe('Marketplace', () => {
  test('end-to-end: list, bid, settle', async ({ browser }) => {
    // ── Set up farmer + warehouse contexts and grab seeded ids ────────────────
    const farmerCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(farmerCtx.request, 'farmer');
    const farmerProfile = await getProfile(farmerCtx.request);

    const warehouseCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(warehouseCtx.request, 'warehouse');

    const warehouseId = await pickWarehouseId(farmerCtx.request);
    expect(warehouseId).toBeTruthy();

    // ── 1. Farmer creates a batch ─────────────────────────────────────────────
    const batchId: string = await createBatchAsFarmer(
      farmerCtx.request,
      warehouseId,
      farmerProfile,
      `Eucalyptus MK ${Date.now()}`,
    );
    expect(batchId).toMatch(/HT-\d{8}-\d{3}/);

    // ── 2. Warehouse marks the batch as in_warehouse ──────────────────────────
    const patchRes = await warehouseCtx.request.patch(`/api/batches/${batchId}`, {
      data: { status: 'in_warehouse' },
    });
    expect(patchRes.status(), `PATCH batch: ${await patchRes.text()}`).toBe(200);

    // ── 3. Farmer creates a marketplace listing ───────────────────────────────
    const createListingRes = await farmerCtx.request.post('/api/marketplace/listings', {
      data: {
        batchId,
        reservePricePaise: 500_000, // ₹5,000
        bidIncrementPaise: 10_000,  // ₹100
        durationMinutes: 5,
        notes: 'E2E auction',
      },
    });
    expect(createListingRes.status(), `Create listing: ${await createListingRes.text()}`).toBe(201);
    const listing = (await createListingRes.json()).data;
    const listingId: string = listing.listingId;
    expect(listingId).toMatch(/^MK-\d{8}-\d{3}$/);
    expect(listing.status).toBe('live');
    expect(listing.reservePricePaise).toBe(500_000);

    // ── 4. Farmer dashboard renders the listing card ──────────────────────────
    const farmerPage = await farmerCtx.newPage();
    await disableOnboarding(farmerPage);
    await gotoWithRetry(farmerPage, `${BASE_URL}/en/dashboard/marketplace`);
    // Carbon Tabs renders every TabPanel in the DOM, so the same listing
    // can appear in multiple panels. We only need the visible one.
    const farmerCard = farmerPage.locator(`[data-listing-id="${listingId}"]`).first();
    await expect(farmerCard).toBeVisible({ timeout: 20_000 });
    await expect(farmerCard).toContainText(listingId);
    await expect(farmerCard).toContainText(/Eucalyptus/);

    // ── 5. Enterprise places a bid via API and verifies the marketplace UI ────
    const enterpriseSession = await loginAndOpenMarketplace(browser, 'enterprise');
    const enterprisePage = enterpriseSession.page;
    const enterpriseCard = enterprisePage.locator(`[data-listing-id="${listingId}"]`).first();
    await expect(enterpriseCard).toBeVisible({ timeout: 30_000 });

    const bidRes = await enterpriseSession.context.request.post(
      `/api/marketplace/listings/${listingId}/bids`,
      { data: { amountPaise: 500_000 } }
    );
    expect(bidRes.status(), `Place bid: ${await bidRes.text()}`).toBe(201);

    // Detail page reflects the bid.
    await gotoWithRetry(
      enterprisePage,
      `${BASE_URL}/en/dashboard/marketplace/${listingId}`,
    );
    await expect(enterprisePage).toHaveURL(new RegExp(`/dashboard/marketplace/${listingId}`));
    await expect(enterprisePage.getByTestId('current-price')).toContainText('5,000.00', { timeout: 30_000 });
    await expect(enterprisePage.getByTestId('bid-history')).toBeVisible({ timeout: 30_000 });

    // ── 6. Bid history endpoint mirrors UI state ──────────────────────────────
    const bidsRes = await enterpriseSession.context.request.get(`/api/marketplace/listings/${listingId}/bids`);
    expect(bidsRes.status()).toBe(200);
    const bidsBody = await bidsRes.json();
    expect(Array.isArray(bidsBody)).toBe(true);
    expect(bidsBody.length).toBeGreaterThan(0);
    expect(bidsBody[0].amountPaise).toBe(500_000);
    expect(bidsBody[0].isWinning).toBe(true);

    // ── 7. Bidding own listing as farmer is rejected (RBAC: 403) ──────────────
    const ownBidRes = await farmerCtx.request.post(`/api/marketplace/listings/${listingId}/bids`, {
      data: { amountPaise: 600_000 },
    });
    expect([400, 403]).toContain(ownBidRes.status());

    // ── 8. Admin force-settles the auction immediately ────────────────────────
    const adminCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(adminCtx.request, 'admin');
    const settleRes = await adminCtx.request.post(
      `/api/marketplace/listings/${listingId}/settle?force=1`
    );
    expect(settleRes.status(), `Settle: ${await settleRes.text()}`).toBe(200);
    const settleBody = await settleRes.json();
    expect(settleBody.data.status).toBe('settled');
    expect(settleBody.data.netToFarmerPaise).toBeGreaterThanOrEqual(0);
    expect(settleBody.data.currentPricePaise).toBe(500_000);

    // ── 9. Listing detail UI reflects settled state ───────────────────────────
    await enterprisePage.reload({ waitUntil: 'domcontentloaded' });
    await expect(enterprisePage.getByText(/Settled/i).first()).toBeVisible({ timeout: 20_000 });
    await expect(enterprisePage.getByTestId('storage-cost')).toBeVisible();

    // ── 10. The settled listing surfaces under the "Settled" tab ──────────────
    // First, sanity-check the API directly so we know server-side state is correct
    // independent of any UI rendering quirks.
    const settledListRes = await enterpriseSession.context.request.get(
      '/api/marketplace/listings?status=settled'
    );
    expect(settledListRes.status()).toBe(200);
    const settledList = await settledListRes.json();
    const settledIds = (Array.isArray(settledList) ? settledList : []).map(
      (l: { listingId: string }) => l.listingId
    );
    expect(settledIds).toContain(listingId);

    // Then verify the UI surfaces it under the Settled tab via the deep-link
    // query parameter. This avoids flakiness around Carbon's tab overflow
    // controls and the slide-in notifications panel intercepting clicks.
    await gotoWithRetry(enterprisePage, `${BASE_URL}/en/dashboard/marketplace?tab=settled`);
    await expect(
      enterprisePage.getByRole('heading', { name: /Honey Marketplace/i })
    ).toBeVisible({ timeout: 30_000 });

    await expect(
      enterprisePage.locator(`[data-listing-id="${listingId}"]`).first()
    ).toBeVisible({ timeout: 30_000 });

    await enterpriseSession.cleanup();
    await adminCtx.close();
    await farmerCtx.close();
    await warehouseCtx.close();
  });

  test('marketplace nav link is exposed on every operational role', async ({ browser }) => {
    for (const role of ['farmer', 'warehouse', 'enterprise', 'consumer', 'officer'] as const) {
      const session = await loginAndOpenMarketplace(browser, role);
      await expect(session.page).toHaveURL(/\/dashboard\/marketplace/);
      await expect(session.page.getByRole('heading', { name: /Honey Marketplace/i })).toBeVisible({
        timeout: 30_000,
      });
      await session.cleanup();
    }
  });

  test('consumer bid above the cap is rejected; modest bid succeeds', async ({ browser }) => {
    const farmerCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(farmerCtx.request, 'farmer');
    const farmerProfile = await getProfile(farmerCtx.request);

    const warehouseCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(warehouseCtx.request, 'warehouse');

    const warehouseId = await pickWarehouseId(farmerCtx.request);
    const batchId: string = await createBatchAsFarmer(
      farmerCtx.request,
      warehouseId,
      farmerProfile,
      `Litchi Cap ${Date.now()}`,
    );

    const patchRes = await warehouseCtx.request.patch(`/api/batches/${batchId}`, {
      data: { status: 'in_warehouse' },
    });
    expect(patchRes.status()).toBe(200);

    const listingRes = await farmerCtx.request.post('/api/marketplace/listings', {
      data: {
        batchId,
        reservePricePaise: 100_000, // ₹1,000
        bidIncrementPaise: 10_000,
        durationMinutes: 5,
      },
    });
    expect(listingRes.status()).toBe(201);
    const listingId = (await listingRes.json())?.data?.listingId as string;
    expect(listingId).toMatch(/^MK-\d{8}-\d{3}$/);

    const consumerCtx = await browser.newContext({ baseURL: BASE_URL, ignoreHTTPSErrors: true });
    await loginRequest(consumerCtx.request, 'consumer');
    const overcapRes = await consumerCtx.request.post(`/api/marketplace/listings/${listingId}/bids`, {
      data: { amountPaise: 60_000 * 100 }, // ₹60,000 > ₹50,000 cap
    });
    expect(overcapRes.status()).toBe(400);
    const overcapBody = await overcapRes.json();
    expect(overcapBody.error).toBe('CONSUMER_BID_CAP_EXCEEDED');

    const okBidRes = await consumerCtx.request.post(`/api/marketplace/listings/${listingId}/bids`, {
      data: { amountPaise: 2_000 * 100 }, // ₹2,000 — clears the ₹1,000 reserve
    });
    expect(okBidRes.status(), `Consumer bid: ${await okBidRes.text()}`).toBe(201);

    await consumerCtx.close();
    await warehouseCtx.close();
    await farmerCtx.close();
  });
});
