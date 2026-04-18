import { ethers } from 'ethers';
import { connectDB } from '../mongodb';
import { Listing, IListing } from '../models/Listing';
import { Bid } from '../models/Bid';
import { Batch } from '../models/Batch';
import { User } from '../models/User';
import { Notification } from '../models/Notification';
import { getNextSeq } from '../models/Counter';
import { auditLog } from '../audit';
import { anchorBatchOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';
import type { CreateListingInput, PlaceBidInput } from '../validation/marketplace.schema';
import {
  computeStorageCostPaise,
  computeMinNextBidPaise,
  shouldExtendForAntiSnipe,
  DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
  CONSUMER_BID_CAP_PAISE,
} from './marketplace.pricing';

// Re-export so existing callers keep working
export {
  computeStorageCostPaise,
  computeMinNextBidPaise,
  shouldExtendForAntiSnipe,
  DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
  CONSUMER_BID_CAP_PAISE,
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatListingId(seq: number): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `MK-${y}${m}${d}-${String(seq).padStart(3, '0')}`;
}

function stripInternal<T extends Record<string, unknown> & { _id?: unknown }>(
  doc: T
): T & { id: string } {
  const rest = { ...doc };
  const id = doc._id != null ? String(doc._id) : '';
  delete rest._id;
  return { ...rest, id } as T & { id: string };
}

function chainPayloadFor(listing: IListing) {
  return {
    listingId: listing.listingId,
    batchId: listing.batchId,
    farmerId: listing.farmerId,
    warehouseId: listing.warehouseId,
    weightKg: listing.weightKg,
    finalPricePaise: listing.currentPricePaise,
    storageCostPaise: listing.storageCostPaise,
    netToFarmerPaise: listing.netToFarmerPaise ?? null,
    winnerId: listing.highestBidderId ?? null,
    settledAt: (listing.settledAt ?? new Date()).toISOString(),
    kind: 'auction_settlement',
  };
}

function computeChainHash(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data, Object.keys(data).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

async function notify(userId: string | undefined, type: string, title: string, message: string, batchId?: string) {
  if (!userId) return;
  try {
    await Notification.findOneAndUpdate(
      { userId: String(userId), type, batchId: batchId ?? null },
      {
        $setOnInsert: {
          userId: String(userId),
          type,
          title,
          message,
          batchId: batchId ?? null,
          isRead: false,
          createdAt: new Date(),
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
  } catch (err) {
    console.error('[marketplace.service] notify failed:', err);
  }
}

// ── Batch eligibility ────────────────────────────────────────────────────────

const ELIGIBLE_BATCH_STATUSES = new Set(['certified', 'approved', 'in_warehouse', 'stored']);

// ── Listing lifecycle ────────────────────────────────────────────────────────

export async function createListing(
  input: CreateListingInput,
  actorId: string,
  actorRole: string
) {
  await connectDB();

  if (actorRole !== 'farmer' && actorRole !== 'admin') {
    throw new Error('FORBIDDEN_LISTER_ROLE');
  }

  const batch = await Batch.findOne({ batchId: input.batchId }).lean<{
    batchId?: string;
    farmerId?: string;
    farmerName?: string;
    warehouseId?: string;
    weightKg?: number;
    floraType?: string;
    grade?: 'A' | 'B';
    status?: string;
    warehouseReceivedAt?: Date | string;
  }>();
  if (!batch) throw new Error('BATCH_NOT_FOUND');
  if (!ELIGIBLE_BATCH_STATUSES.has(String(batch.status ?? ''))) {
    throw new Error('BATCH_NOT_ELIGIBLE');
  }
  if (actorRole === 'farmer' && String(batch.farmerId) !== String(actorId)) {
    throw new Error('NOT_BATCH_OWNER');
  }

  const existingActive = await Listing.findOne({
    batchId: input.batchId,
    status: { $in: ['live', 'settled'] },
  }).lean();
  if (existingActive) throw new Error('LISTING_ALREADY_EXISTS');

  if (!batch.warehouseId) throw new Error('BATCH_HAS_NO_WAREHOUSE');
  const warehouse = await User.findOne({ _id: batch.warehouseId, role: 'warehouse' }).lean<{
    name?: string;
    storageRatePerKgPerDayPaise?: number;
  }>();
  if (!warehouse) throw new Error('WAREHOUSE_NOT_FOUND');

  const ratePaise =
    typeof warehouse.storageRatePerKgPerDayPaise === 'number' && warehouse.storageRatePerKgPerDayPaise >= 0
      ? warehouse.storageRatePerKgPerDayPaise
      : DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY;

  const storageStartAt = batch.warehouseReceivedAt
    ? new Date(batch.warehouseReceivedAt)
    : new Date();

  const seq = await getNextSeq('listing');
  const listingId = formatListingId(seq);
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + input.durationMinutes * 60 * 1000);

  const listing = await Listing.create({
    listingId,
    batchId: input.batchId,
    farmerId: String(batch.farmerId),
    farmerName: batch.farmerName ?? 'Unknown farmer',
    warehouseId: String(batch.warehouseId),
    warehouseName: warehouse.name ?? 'Warehouse',
    weightKg: Number(batch.weightKg ?? 0),
    floraType: batch.floraType ?? 'Unknown',
    grade: (batch.grade as 'A' | 'B') ?? 'B',
    reservePricePaise: input.reservePricePaise,
    currentPricePaise: input.reservePricePaise,
    bidIncrementPaise: input.bidIncrementPaise,
    storageRatePerKgPerDayPaise: ratePaise,
    storageStartAt,
    storageCostPaise: computeStorageCostPaise({
      ratePaisePerKgPerDay: ratePaise,
      weightKg: Number(batch.weightKg ?? 0),
      storageStartAt,
    }),
    bidCount: 0,
    startsAt,
    endsAt,
    antiSnipeWindowSec: 60,
    antiSnipeExtendSec: 60,
    status: 'live',
    notes: input.notes,
  });

  await notify(
    String(batch.warehouseId),
    'BATCH_CREATED',
    'Batch listed for auction',
    `Batch ${input.batchId} from ${batch.farmerName ?? 'farmer'} is now live in the marketplace.`,
    input.batchId
  );

  await auditLog({
    entityType: 'listing',
    entityId: listingId,
    action: 'create',
    actorUserId: actorId,
    actorRole,
    metadata: { batchId: input.batchId, reservePricePaise: input.reservePricePaise },
  });

  return enrichListingForResponse(listing.toObject() as IListing);
}

function enrichListingForResponse(listing: IListing) {
  const liveStorageCost = computeStorageCostPaise({
    ratePaisePerKgPerDay: listing.storageRatePerKgPerDayPaise,
    weightKg: listing.weightKg,
    storageStartAt: listing.storageStartAt,
    asOf:
      listing.status === 'live' ? new Date() : (listing.settledAt ?? new Date(listing.endsAt)),
  });

  const projectedNet = Math.max(0, listing.currentPricePaise - liveStorageCost);

  return {
    ...stripInternal(listing as unknown as Record<string, unknown>),
    storageCostPaiseLive: liveStorageCost,
    projectedNetToFarmerPaise: projectedNet,
    minNextBidPaise: computeMinNextBidPaise({
      reservePricePaise: listing.reservePricePaise,
      currentPricePaise: listing.currentPricePaise,
      bidIncrementPaise: listing.bidIncrementPaise,
      bidCount: listing.bidCount,
    }),
    timeRemainingMs: Math.max(0, new Date(listing.endsAt).getTime() - Date.now()),
  };
}

export type ListingFilter = {
  status?: 'live' | 'settled' | 'cancelled' | 'unsold';
  farmerId?: string;
  bidderId?: string;
  warehouseId?: string;
};

export async function listListings(filter: ListingFilter = {}) {
  await connectDB();

  const query: Record<string, unknown> = {};
  if (filter.status) query.status = filter.status;
  if (filter.farmerId) query.farmerId = filter.farmerId;
  if (filter.warehouseId) query.warehouseId = filter.warehouseId;

  if (filter.bidderId) {
    const bids = await Bid.find({ bidderId: filter.bidderId }).select('listingId').lean();
    const ids = Array.from(new Set(bids.map((b) => b.listingId)));
    query.listingId = { $in: ids };
  }

  const docs = await Listing.find(query).sort({ createdAt: -1 }).lean();
  return docs.map((d) => enrichListingForResponse(d as IListing));
}

export async function getListing(listingId: string) {
  await connectDB();
  const doc = await Listing.findOne({ listingId }).lean();
  if (!doc) return null;
  return enrichListingForResponse(doc as IListing);
}

export async function listBidsForListing(listingId: string) {
  await connectDB();
  const bids = await Bid.find({ listingId }).sort({ createdAt: -1 }).limit(200).lean();
  return bids.map((b) =>
    stripInternal(b as unknown as Record<string, unknown>)
  );
}

// ── Bidding ──────────────────────────────────────────────────────────────────

export async function placeBid(
  listingId: string,
  input: PlaceBidInput,
  actorId: string,
  actorRole: string,
  actorName: string
) {
  await connectDB();

  if (!['enterprise', 'consumer', 'admin'].includes(actorRole)) {
    throw new Error('FORBIDDEN_BIDDER_ROLE');
  }

  if (actorRole === 'consumer' && input.amountPaise > CONSUMER_BID_CAP_PAISE) {
    throw new Error('CONSUMER_BID_CAP_EXCEEDED');
  }

  const listing = await Listing.findOne({ listingId });
  if (!listing) throw new Error('LISTING_NOT_FOUND');

  // Settle expired listings on access (lazy auto-close)
  const now = new Date();
  if (listing.status === 'live' && listing.endsAt.getTime() <= now.getTime()) {
    throw new Error('LISTING_ENDED');
  }
  if (listing.status !== 'live') throw new Error('LISTING_NOT_LIVE');
  if (String(listing.farmerId) === String(actorId)) throw new Error('CANNOT_BID_OWN_LISTING');

  const minNextBid = computeMinNextBidPaise({
    reservePricePaise: listing.reservePricePaise,
    currentPricePaise: listing.currentPricePaise,
    bidIncrementPaise: listing.bidIncrementPaise,
    bidCount: listing.bidCount,
  });

  if (input.amountPaise < minNextBid) {
    const err = new Error('BID_TOO_LOW') as Error & { detail?: { minNextBidPaise: number } };
    err.detail = { minNextBidPaise: minNextBid };
    throw err;
  }

  // Mark previous winning bid as outbid
  const previousWinner = listing.highestBidderId;
  await Bid.updateMany({ listingId, isWinning: true }, { isWinning: false, isOutbid: true });

  const bid = await Bid.create({
    listingId,
    bidderId: actorId,
    bidderName: actorName,
    bidderRole: actorRole as 'enterprise' | 'consumer' | 'admin',
    amountPaise: input.amountPaise,
    isWinning: true,
    isOutbid: false,
  });

  // Anti-snipe extension
  if (
    shouldExtendForAntiSnipe({
      endsAtMs: listing.endsAt.getTime(),
      bidAtMs: now.getTime(),
      windowSec: listing.antiSnipeWindowSec,
    })
  ) {
    listing.endsAt = new Date(listing.endsAt.getTime() + listing.antiSnipeExtendSec * 1000);
  }

  listing.currentPricePaise = input.amountPaise;
  listing.bidCount = (listing.bidCount ?? 0) + 1;
  listing.highestBidderId = String(actorId);
  listing.highestBidderName = actorName;
  listing.highestBidderRole = actorRole;
  await listing.save();

  if (previousWinner && previousWinner !== actorId) {
    await notify(
      previousWinner,
      'BATCH_DISPATCHED',
      'You were outbid',
      `A higher bid was placed on listing ${listingId}.`,
      listing.batchId
    );
  }

  await notify(
    listing.farmerId,
    'BATCH_DISPATCHED',
    'New bid received',
    `${actorName} bid ₹${(input.amountPaise / 100).toLocaleString('en-IN')} on ${listing.batchId}.`,
    listing.batchId
  );

  await auditLog({
    entityType: 'listing',
    entityId: listingId,
    action: 'bid',
    actorUserId: actorId,
    actorRole,
    metadata: { amountPaise: input.amountPaise },
  });

  return {
    bid: stripInternal(bid.toObject() as unknown as Record<string, unknown>),
    listing: enrichListingForResponse(listing.toObject() as IListing),
  };
}

// ── Settlement ───────────────────────────────────────────────────────────────

/**
 * Settles a listing.
 *  - Live listing whose endsAt has passed (or admin-forced) → final settlement
 *  - With bids → status `settled`, anchors on chain, computes net to farmer
 *  - Without bids → status `unsold`
 */
export async function settleListing(listingId: string, opts?: { force?: boolean; actorId?: string; actorRole?: string }) {
  await connectDB();
  const listing = await Listing.findOne({ listingId });
  if (!listing) throw new Error('LISTING_NOT_FOUND');

  if (listing.status !== 'live') {
    return enrichListingForResponse(listing.toObject() as IListing);
  }

  const now = Date.now();
  const ended = listing.endsAt.getTime() <= now;
  if (!ended && !opts?.force) {
    throw new Error('AUCTION_NOT_ENDED');
  }

  const settledAt = new Date();
  listing.settledAt = settledAt;
  listing.storageCostPaise = computeStorageCostPaise({
    ratePaisePerKgPerDay: listing.storageRatePerKgPerDayPaise,
    weightKg: listing.weightKg,
    storageStartAt: listing.storageStartAt,
    asOf: settledAt,
  });

  if (listing.bidCount === 0 || !listing.highestBidderId) {
    listing.status = 'unsold';
    await listing.save();
    await auditLog({
      entityType: 'listing',
      entityId: listingId,
      action: 'settle:unsold',
      actorUserId: opts?.actorId,
      actorRole: opts?.actorRole ?? 'system',
    });
    return enrichListingForResponse(listing.toObject() as IListing);
  }

  listing.status = 'settled';
  listing.netToFarmerPaise = Math.max(0, listing.currentPricePaise - listing.storageCostPaise);

  // Anchor on chain (best-effort)
  if (isBlockchainRelayEnabled()) {
    try {
      const payload = chainPayloadFor(listing as unknown as IListing);
      const dataHash = computeChainHash(payload);
      // Reuse `recordBatch` with a synthetic auction id so we can anchor without
      // deploying a new contract. The auction settlement is unique per listingId.
      const txHash = await anchorBatchOnChain(
        listing.listingId,
        payload,
        'auction_settled',
        listing.warehouseName ?? listing.warehouseId
      );
      listing.settlementTxHash = txHash;
      listing.settlementDataHash = dataHash;
    } catch (chainErr) {
      console.error('[marketplace.service] Settlement anchor failed:', chainErr);
    }
  }

  await listing.save();

  await notify(
    listing.highestBidderId,
    'BATCH_DISPATCHED',
    'You won the auction',
    `Your bid of ₹${(listing.currentPricePaise / 100).toLocaleString('en-IN')} on ${listing.batchId} has won.`,
    listing.batchId
  );
  await notify(
    listing.farmerId,
    'BATCH_DISPATCHED',
    'Auction settled',
    `Listing ${listingId} settled at ₹${(listing.currentPricePaise / 100).toLocaleString('en-IN')}.`,
    listing.batchId
  );

  await auditLog({
    entityType: 'listing',
    entityId: listingId,
    action: 'settle:sold',
    actorUserId: opts?.actorId,
    actorRole: opts?.actorRole ?? 'system',
    metadata: {
      finalPricePaise: listing.currentPricePaise,
      storageCostPaise: listing.storageCostPaise,
      netToFarmerPaise: listing.netToFarmerPaise,
      txHash: listing.settlementTxHash ?? null,
    },
  });

  return enrichListingForResponse(listing.toObject() as IListing);
}

export async function cancelListing(listingId: string, actorId: string, actorRole: string) {
  await connectDB();
  const listing = await Listing.findOne({ listingId });
  if (!listing) throw new Error('LISTING_NOT_FOUND');
  if (listing.status !== 'live') throw new Error('LISTING_NOT_LIVE');

  if (actorRole !== 'admin' && String(listing.farmerId) !== String(actorId)) {
    throw new Error('FORBIDDEN');
  }
  if (listing.bidCount > 0 && actorRole !== 'admin') {
    throw new Error('CANNOT_CANCEL_WITH_BIDS');
  }

  listing.status = 'cancelled';
  await listing.save();
  await auditLog({
    entityType: 'listing',
    entityId: listingId,
    action: 'cancel',
    actorUserId: actorId,
    actorRole,
  });
  return enrichListingForResponse(listing.toObject() as IListing);
}

/**
 * Sweep all live listings whose endsAt has passed and finalise them.
 * Safe to call repeatedly (idempotent).
 */
export async function sweepExpiredListings() {
  await connectDB();
  const expired = await Listing.find({ status: 'live', endsAt: { $lte: new Date() } }).select('listingId').lean();
  const results: Array<{ listingId: string; status: string }> = [];
  for (const row of expired) {
    try {
      const res = await settleListing(row.listingId);
      results.push({ listingId: row.listingId, status: res.status });
    } catch (err) {
      console.error(`[marketplace.service] sweep failed for ${row.listingId}:`, err);
    }
  }
  return results;
}
