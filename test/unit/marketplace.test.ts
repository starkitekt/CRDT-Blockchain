import { describe, expect, it } from 'vitest';
import {
  computeStorageCostPaise,
  computeMinNextBidPaise,
  shouldExtendForAntiSnipe,
  DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
  CONSUMER_BID_CAP_PAISE,
} from '../../src/lib/services/marketplace.pricing';

describe('marketplace storage cost', () => {
  it('returns 0 when warehouse received the batch in the future', () => {
    const future = new Date(Date.now() + 60_000);
    const cost = computeStorageCostPaise({
      ratePaisePerKgPerDay: 50,
      weightKg: 20,
      storageStartAt: future,
    });
    expect(cost).toBe(0);
  });

  it('computes cost linearly across whole days', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const end = new Date('2026-01-04T00:00:00Z'); // 3 days later
    const cost = computeStorageCostPaise({
      ratePaisePerKgPerDay: 100,
      weightKg: 10,
      storageStartAt: start,
      asOf: end,
    });
    // 100 paise/kg/day × 10 kg × 3 days = 3000 paise = ₹30
    expect(cost).toBe(3000);
  });

  it('handles fractional days at second granularity', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    // 12 hours = 0.5 days
    const end = new Date('2026-01-01T12:00:00Z');
    const cost = computeStorageCostPaise({
      ratePaisePerKgPerDay: 200,
      weightKg: 5,
      storageStartAt: start,
      asOf: end,
    });
    // 200 × 5 × 0.5 = 500 paise
    expect(cost).toBe(500);
  });

  it('uses zero rate gracefully', () => {
    const cost = computeStorageCostPaise({
      ratePaisePerKgPerDay: 0,
      weightKg: 100,
      storageStartAt: new Date('2026-01-01T00:00:00Z'),
      asOf: new Date('2026-12-31T00:00:00Z'),
    });
    expect(cost).toBe(0);
  });

  it('exposes safe defaults', () => {
    expect(DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY).toBeGreaterThan(0);
    expect(CONSUMER_BID_CAP_PAISE).toBe(50_000 * 100);
  });
});

describe('min next bid', () => {
  it('uses reserve when no bids exist', () => {
    expect(
      computeMinNextBidPaise({
        reservePricePaise: 50000,
        currentPricePaise: 50000,
        bidIncrementPaise: 1000,
        bidCount: 0,
      })
    ).toBe(50000);
  });

  it('adds increment to current price after first bid', () => {
    expect(
      computeMinNextBidPaise({
        reservePricePaise: 50000,
        currentPricePaise: 75000,
        bidIncrementPaise: 1500,
        bidCount: 1,
      })
    ).toBe(76500);
  });
});

describe('anti-snipe', () => {
  const now = 1_700_000_000_000;

  it('extends when bid lands inside the window', () => {
    expect(
      shouldExtendForAntiSnipe({
        endsAtMs: now + 30_000,
        bidAtMs: now,
        windowSec: 60,
      })
    ).toBe(true);
  });

  it('does not extend a bid placed before the window opens', () => {
    expect(
      shouldExtendForAntiSnipe({
        endsAtMs: now + 5 * 60_000,
        bidAtMs: now,
        windowSec: 60,
      })
    ).toBe(false);
  });

  it('does not extend bids placed after the auction ended', () => {
    expect(
      shouldExtendForAntiSnipe({
        endsAtMs: now - 1,
        bidAtMs: now,
        windowSec: 60,
      })
    ).toBe(false);
  });

  it('disables extension when window is zero', () => {
    expect(
      shouldExtendForAntiSnipe({
        endsAtMs: now + 1000,
        bidAtMs: now,
        windowSec: 0,
      })
    ).toBe(false);
  });
});
