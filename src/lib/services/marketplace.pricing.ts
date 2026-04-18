/**
 * Pure pricing helpers for the marketplace.
 * No I/O, no Mongoose, no env dependency — safe to unit-test in isolation.
 */

/** Default storage tariff if a warehouse hasn't configured one: ₹0.50 / kg / day. */
export const DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY = 50;

/** Consumer single-bid safety cap: ₹50,000. */
export const CONSUMER_BID_CAP_PAISE = 50_000 * 100;

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Storage cost (paise) = ratePaisePerKgPerDay × weightKg × max(0, daysElapsed)
 *
 * `daysElapsed` is the fractional number of days between
 * `storageStartAt` and `asOf`, so cost grows continuously rather than in
 * 24h jumps.
 */
export function computeStorageCostPaise(args: {
  ratePaisePerKgPerDay: number;
  weightKg: number;
  storageStartAt: Date | string;
  asOf?: Date;
}): number {
  const { ratePaisePerKgPerDay, weightKg } = args;
  const start = new Date(args.storageStartAt).getTime();
  const end = (args.asOf ?? new Date()).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return 0;
  const days = Math.max(0, (end - start) / MS_PER_DAY);
  return Math.round(ratePaisePerKgPerDay * weightKg * days);
}

/**
 * Minimum next acceptable bid in paise.
 * The first bid must meet the reserve; subsequent bids must clear the
 * current price by at least `bidIncrementPaise`.
 */
export function computeMinNextBidPaise(args: {
  reservePricePaise: number;
  currentPricePaise: number;
  bidIncrementPaise: number;
  bidCount: number;
}): number {
  if (args.bidCount === 0) return args.reservePricePaise;
  return args.currentPricePaise + args.bidIncrementPaise;
}

/**
 * Returns true when the given bid time is within the listing's anti-snipe
 * window of `endsAt`. Used to decide whether to extend the auction.
 */
export function shouldExtendForAntiSnipe(args: {
  endsAtMs: number;
  bidAtMs: number;
  windowSec: number;
}): boolean {
  if (args.windowSec <= 0) return false;
  const remaining = args.endsAtMs - args.bidAtMs;
  return remaining > 0 && remaining <= args.windowSec * 1000;
}
