/**
 * Visual audit script — captures the actual rendered marketplace pages and
 * key dashboards, plus computed styles for the dashboard-container, page
 * header, and primary cards. We use this to diagnose padding / typography
 * regressions before changing CSS.
 */
import { test, expect, Page } from '@playwright/test';
import path from 'node:path';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
const OUT = path.resolve('test/e2e/visual-audit-out');

const USERS = {
  consumer: { email: 'consumer@honeytrace.gov', password: 'password123' },
  farmer:   { email: 'farmer@honeytrace.gov',   password: 'password123' },
  warehouse:{ email: 'warehouse@honeytrace.gov',password: 'password123' },
  lab:      { email: 'lab@honeytrace.gov',      password: 'password123' },
  officer:  { email: 'officer@honeytrace.gov',  password: 'password123' },
  enterprise:{email: 'enterprise@honeytrace.gov',password:'password123' },
  admin:    { email: 'admin@honeytrace.gov',    password: 'Admin@password123' },
} as const;

type Role = keyof typeof USERS;

async function login(page: Page, role: Role): Promise<boolean> {
  const u = USERS[role];
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await page.request.post('/api/auth', { data: { email: u.email, password: u.password, role } });
    if (res.status() === 200) return true;
    await page.waitForTimeout(800);
  }
  // eslint-disable-next-line no-console
  console.warn(`login ${role} failed after retries — skipping`);
  return false;
}

async function probe(page: Page, label: string) {
  return page.evaluate((label) => {
    const grab = (sel: string) => {
      const el = document.querySelector(sel);
      if (!el) return { sel, found: false };
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        sel,
        found: true,
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
        padding: cs.padding,
        margin: cs.margin,
        gap: cs.gap,
        fontSize: cs.fontSize,
        fontFamily: cs.fontFamily.split(',')[0],
        background: cs.backgroundColor,
        boxShadow: cs.boxShadow.slice(0, 60),
        borderRadius: cs.borderRadius,
      };
    };
    return {
      label,
      viewport: { w: window.innerWidth, h: window.innerHeight },
      dashboardContainer: grab('.dashboard-container'),
      pageHeader: grab('.page-header') || grab('header'),
      glassPanel: grab('.glass-panel'),
      listingCard: grab('[class*="listing-card"]'),
      kpiCard: grab('.kpi-card, .fd-kpi-card, .wd-kpi-card'),
      h1: grab('h1'),
      h2: grab('h2'),
    };
  }, label);
}

test.describe.configure({ mode: 'serial' });

test('audit marketplace + dashboards', async ({ browser }) => {
  test.setTimeout(420_000);
  const ctx = await browser.newContext({ baseURL: BASE_URL, viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  // Force-disable onboarding tours so the dashboards render in their normal state.
  await page.addInitScript(() => {
    for (const r of ['farmer','warehouse','lab','officer','enterprise','consumer','secretary','admin']) {
      localStorage.setItem(`${r}_tour_seen`,'true');
      localStorage.setItem(`${r}_kyc_completed`,'true');
    }
  });

  const reports: unknown[] = [];

  // 1) consumer marketplace listing detail (matches user's screenshot)
  await login(page, 'consumer');
  await page.goto('/en/dashboard/marketplace', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${OUT}/01-marketplace.png`, fullPage: true });
  reports.push(await probe(page, 'marketplace'));

  // Click first listing card (look for a /marketplace/MK- link)
  const link = page.locator('a[href*="/dashboard/marketplace/MK-"]').first();
  if (await link.count()) {
    await link.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/02-listing-detail.png`, fullPage: true });
    reports.push(await probe(page, 'listing-detail'));
  }

  const sweep: Array<{ role: Role; path: string; out: string }> = [
    { role: 'farmer',     path: '/en/dashboard/farmer',     out: '03-farmer.png' },
    { role: 'warehouse',  path: '/en/dashboard/warehouse',  out: '04-warehouse.png' },
    { role: 'enterprise', path: '/en/dashboard/enterprise', out: '05-enterprise.png' },
    { role: 'lab',        path: '/en/dashboard/lab',        out: '06-lab.png' },
    { role: 'officer',    path: '/en/dashboard/officer',    out: '07-officer.png' },
    { role: 'admin',      path: '/en/dashboard/admin',      out: '08-admin.png' },
  ];
  for (const step of sweep) {
    await ctx.clearCookies();
    const ok = await login(page, step.role);
    if (!ok) continue;
    await page.goto(step.path, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${step.out}`, fullPage: true });
    reports.push(await probe(page, step.role));
  }

  // eslint-disable-next-line no-console
  console.log('\n=== VISUAL AUDIT REPORT ===\n' + JSON.stringify(reports, null, 2));
  await ctx.close();
});
