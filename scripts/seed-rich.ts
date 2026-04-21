/**
 * Rich end-to-end seed.
 *
 *  - Wipes EVERY collection in the connected database (off-chain only).
 *  - Recreates the canonical role roster from `seed.ts` plus a few extra
 *    enterprise + consumer accounts so the marketplace has bidders.
 *  - Generates ~12 batches across the full lifecycle:
 *      created → stored → certified → approved → dispatched → delivered
 *      plus stand-alone `recalled` and unsold marketplace flows.
 *  - Publishes lab results for every certified+ batch.
 *  - Files a tier-2 recall.
 *  - Builds the marketplace history: live, settled, cancelled and unsold
 *    listings, each with realistic bid trails.
 *
 * IMPORTANT: This script writes ONLY to MongoDB. Use `anchor-sepolia.ts`
 * afterwards to re-anchor every lifecycle event against the existing
 * Base Sepolia contract.
 *
 *   npm run seed:rich           # wipe + reseed
 */

import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

loadEnv({ path: '.env.local' });

import { User } from '../src/lib/models/User';
import { Batch } from '../src/lib/models/Batch';
import { LabResult } from '../src/lib/models/LabResult';
import { Recall } from '../src/lib/models/Recall';
import { Listing } from '../src/lib/models/Listing';
import { Bid } from '../src/lib/models/Bid';
import { Notification } from '../src/lib/models/Notification';
import {
  computeStorageCostPaise,
  DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
} from '../src/lib/services/marketplace.pricing';

const MONGODB_URI = process.env.MONGODB_URI!;
if (!MONGODB_URI) {
  console.error('MONGODB_URI missing — refusing to run.');
  process.exit(1);
}

const DAY = 24 * 60 * 60 * 1000;

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * DAY);
}

function isoDay(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10);
}

const SEED_USERS = [
  // 1 farmer (matches docs)
  {
    email: 'farmer@honeytrace.gov',
    password: 'password123',
    role: 'farmer' as const,
    name: 'Ramesh Kumar',
    aadhaarNumber: '876543210123',
    pmKisanId: 'PMKISAN-100234',
  },
  // Extra farmer for cross-warehouse seeding
  {
    email: 'farmer2@honeytrace.gov',
    password: 'password123',
    role: 'farmer' as const,
    name: 'Lakshmi Devi',
    aadhaarNumber: '654321098765',
    pmKisanId: 'PMKISAN-200781',
  },
  // 1 warehouse
  {
    email: 'warehouse@honeytrace.gov',
    password: 'password123',
    role: 'warehouse' as const,
    name: 'Sunil Gupta',
    fssaiLicense: '10016011000731',
    gstNumber: '09AABCU9603R1ZP',
    wdraLicenseNo: 'WDRA-UP-2024-0042',
    storageRatePerKgPerDayPaise: DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
  },
  // 1 lab
  {
    email: 'lab@honeytrace.gov',
    password: 'password123',
    role: 'lab' as const,
    name: 'Dr. Priya Nair',
    fssaiLicense: '10016011000892',
    nablAccreditationNo: 'T-4521',
    labRegistrationNo: 'LAB-MH-2023-0091',
  },
  // 1 officer
  {
    email: 'officer@honeytrace.gov',
    password: 'password123',
    role: 'officer' as const,
    name: 'Mohan Sharma',
    employeeId: 'FSO-UP-00341',
    fssaiOfficerId: 'FSSAI-FSO-2021-4421',
    department: 'FSSAI - Uttar Pradesh State Food Authority',
    jurisdiction: 'Uttar Pradesh - Meerut District',
  },
  // 2 enterprise bidders
  {
    email: 'enterprise@honeytrace.gov',
    password: 'password123',
    role: 'enterprise' as const,
    name: 'Mehta Exports Pvt. Ltd.',
    gstNumber: '27AABCM1234F1ZX',
    fssaiLicense: '10016011002341',
    cinNumber: 'U15122MH2019PTC321456',
    iecCode: 'IEC-0519012345',
  },
  {
    email: 'enterprise2@honeytrace.gov',
    password: 'password123',
    role: 'enterprise' as const,
    name: 'Spice Bazaar Foods LLP',
    gstNumber: '07AABCS5678P1ZN',
    fssaiLicense: '10016011004412',
    cinNumber: 'U15139DL2020PTC129876',
    iecCode: 'IEC-0719087654',
  },
  // 2 consumers
  {
    email: 'consumer@honeytrace.gov',
    password: 'password123',
    role: 'consumer' as const,
    name: 'Anjali Singh',
    mobileNumber: '9876543210',
  },
  {
    email: 'consumer2@honeytrace.gov',
    password: 'password123',
    role: 'consumer' as const,
    name: 'Karan Patel',
    mobileNumber: '9123456780',
  },
  // 1 secretary, 1 admin
  {
    email: 'secretary@honeytrace.gov',
    password: 'password123',
    role: 'secretary' as const,
    name: 'Rekha Joshi',
    employeeId: 'SEC-AGMARK-00782',
    department: 'AGMARK - Directorate of Marketing & Inspection',
  },
  {
    email: 'admin@honeytrace.gov',
    password: 'Admin@password123',
    role: 'admin' as const,
    name: 'Admin User',
    employeeId: 'ADM-SYSTEM-001',
  },
];

async function dropAll() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Mongo connection not ready');
  const collections = await db.listCollections().toArray();
  for (const { name } of collections) {
    if (name.startsWith('system.')) continue;
    await db.collection(name).drop().catch(() => undefined);
    console.log(`  drop ${name}`);
  }
}

async function seedUsers() {
  const ids: Record<string, string> = {};
  for (const u of SEED_USERS) {
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await User.create({
      ...rest,
      passwordHash,
      kycCompleted: true,
      kycVerifiedAt: daysAgo(30),
      isActive: true,
    });
    ids[u.email] = String(doc._id);
    console.log(`  user  ${u.role.padEnd(10)} ${u.email}`);
  }
  return ids;
}

type SeedBatch = {
  index: number;
  status:
    | 'created'
    | 'stored'
    | 'certified'
    | 'approved'
    | 'dispatched'
    | 'delivered'
    | 'recalled';
  flora: string;
  weight: number;
  moisture: number;
  grade: 'A' | 'B';
  daysAgoHarvest: number;
  daysAgoReceived?: number;
  farmerEmail: string;
};

const BATCH_PLAN: SeedBatch[] = [
  // ── Live + early-stage ────────────────────────────────────────────────────
  { index: 1,  status: 'created',    flora: 'Mustard',    weight: 250, moisture: 17.5, grade: 'A', daysAgoHarvest:  2, farmerEmail: 'farmer@honeytrace.gov' },
  { index: 2,  status: 'stored',     flora: 'Eucalyptus', weight: 320, moisture: 18.2, grade: 'A', daysAgoHarvest:  5, daysAgoReceived: 3, farmerEmail: 'farmer@honeytrace.gov' },
  { index: 3,  status: 'stored',     flora: 'Litchi',     weight: 180, moisture: 19.1, grade: 'B', daysAgoHarvest:  6, daysAgoReceived: 4, farmerEmail: 'farmer2@honeytrace.gov' },
  // ── Lab certified, pending officer approval / marketplace eligible ────────
  { index: 4,  status: 'certified',  flora: 'Acacia',     weight: 410, moisture: 16.8, grade: 'A', daysAgoHarvest: 14, daysAgoReceived: 12, farmerEmail: 'farmer@honeytrace.gov' },
  { index: 5,  status: 'certified',  flora: 'Wild Forest',weight: 295, moisture: 17.9, grade: 'A', daysAgoHarvest: 10, daysAgoReceived:  8, farmerEmail: 'farmer2@honeytrace.gov' },
  { index: 6,  status: 'certified',  flora: 'Sundarban',  weight: 360, moisture: 18.5, grade: 'A', daysAgoHarvest: 18, daysAgoReceived: 16, farmerEmail: 'farmer@honeytrace.gov' },
  // ── Officer approved → ready to dispatch ──────────────────────────────────
  { index: 7,  status: 'approved',   flora: 'Multifloral',weight: 540, moisture: 17.1, grade: 'A', daysAgoHarvest: 22, daysAgoReceived: 20, farmerEmail: 'farmer@honeytrace.gov' },
  { index: 8,  status: 'approved',   flora: 'Neem',       weight: 200, moisture: 18.8, grade: 'B', daysAgoHarvest: 25, daysAgoReceived: 22, farmerEmail: 'farmer2@honeytrace.gov' },
  // ── Dispatched + delivered (audit trail) ──────────────────────────────────
  { index: 9,  status: 'dispatched', flora: 'Karanj',     weight: 480, moisture: 17.4, grade: 'A', daysAgoHarvest: 30, daysAgoReceived: 28, farmerEmail: 'farmer@honeytrace.gov' },
  { index: 10, status: 'delivered',  flora: 'Jamun',      weight: 380, moisture: 17.8, grade: 'A', daysAgoHarvest: 45, daysAgoReceived: 43, farmerEmail: 'farmer2@honeytrace.gov' },
  // ── Recall scenario ───────────────────────────────────────────────────────
  { index: 11, status: 'recalled',   flora: 'Saffron',    weight: 220, moisture: 19.4, grade: 'B', daysAgoHarvest: 35, daysAgoReceived: 33, farmerEmail: 'farmer@honeytrace.gov' },
  // ── Extra cert grade-A for unsold marketplace test ────────────────────────
  { index: 12, status: 'certified',  flora: 'Coriander',  weight: 275, moisture: 18.0, grade: 'A', daysAgoHarvest: 12, daysAgoReceived: 10, farmerEmail: 'farmer2@honeytrace.gov' },
];

function batchId(i: number): string {
  return `HT-SEED-${String(i).padStart(3, '0')}`;
}

async function seedBatches(userIds: Record<string, string>) {
  const warehouseId = userIds['warehouse@honeytrace.gov'];
  const labId       = userIds['lab@honeytrace.gov'];
  const enterpriseId = userIds['enterprise@honeytrace.gov'];
  const officerId   = userIds['officer@honeytrace.gov'];

  const created: Array<{ id: string; plan: SeedBatch }> = [];

  for (const plan of BATCH_PLAN) {
    const farmerId = userIds[plan.farmerEmail];
    const farmerName = SEED_USERS.find((u) => u.email === plan.farmerEmail)?.name ?? 'Farmer';
    const id = batchId(plan.index);

    const doc = await Batch.create({
      batchId: id,
      farmerId,
      farmerName,
      floraType: plan.flora,
      weightKg: plan.weight,
      moisturePct: plan.moisture,
      latitude: '28.9845',
      longitude: '77.7064',
      grade: plan.grade,
      harvestDate: isoDay(plan.daysAgoHarvest),
      images: [],
      status: plan.status,
      warehouseId,
      warehouseReceivedAt: plan.daysAgoReceived != null ? daysAgo(plan.daysAgoReceived) : undefined,
      labId: ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(plan.status) ? labId : undefined,
      labSubmittedAt: ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(plan.status) ? daysAgo(Math.max(1, (plan.daysAgoReceived ?? 1) - 1)) : undefined,
      labReportId: ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(plan.status) ? `SAM-${id}` : undefined,
      labCertifiedAt: ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(plan.status) ? daysAgo(Math.max(0, (plan.daysAgoReceived ?? 1) - 1)) : undefined,
      labResults: ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(plan.status)
        ? { moisture: plan.moisture, hmf: 12.4, antibiotics: false, pesticides: false, passed: true }
        : undefined,
      dispatchedAt: ['dispatched', 'delivered'].includes(plan.status) ? daysAgo(plan.status === 'delivered' ? 5 : 1) : undefined,
      destinationEnterprise: ['dispatched', 'delivered'].includes(plan.status) ? enterpriseId : undefined,
      invoiceNo: ['dispatched', 'delivered'].includes(plan.status) ? `INV-${id}` : undefined,
      // Recall metadata applied below for the recalled entry
      recallReason: plan.status === 'recalled' ? 'Sample drift detected on retained reference (Tier-2 precaution)' : undefined,
      recallTier: plan.status === 'recalled' ? 2 : undefined,
      recallInitiatedAt: plan.status === 'recalled' ? daysAgo(2) : undefined,
      recallInitiatedBy: plan.status === 'recalled' ? officerId : undefined,
    });

    created.push({ id: String(doc._id), plan });
    console.log(`  batch ${id.padEnd(15)} ${plan.status.padEnd(10)} ${plan.flora}`);
  }

  return created;
}

async function seedLabResults() {
  const labCertifiable = BATCH_PLAN.filter((p) =>
    ['certified', 'approved', 'dispatched', 'delivered', 'recalled'].includes(p.status)
  );

  for (const plan of labCertifiable) {
    const id = batchId(plan.index);
    await LabResult.create({
      batchId: id,
      sampleId: `SAM-${id}`,
      labId: 'LAB-MH-2023-0091',
      fssaiLicense: '10016011000892',
      nablCert: 'T-4521',
      moisture: plan.moisture,
      hmf: 12.4,
      pollenCount: 18000,
      acidity: 35,
      diastase: 11.2,
      sucrose: 2.8,
      reducingSugars: 68.4,
      conductivity: 0.6,
      antibioticPpb: 0,
      heavyMetalsMgKg: 0,
      pesticideMgKg: 0,
      publishedAt: daysAgo(Math.max(0, (plan.daysAgoReceived ?? 1) - 1)).toISOString(),
    });
    console.log(`  lab   ${id} published`);
  }
}

async function seedRecalls(userIds: Record<string, string>) {
  const officerId = userIds['officer@honeytrace.gov'];
  const recalled = BATCH_PLAN.filter((p) => p.status === 'recalled');
  for (const plan of recalled) {
    const id = batchId(plan.index);
    await Recall.create({
      id: `RECALL-${id}`,
      batchId: id,
      tier: 2,
      reason: 'Sample drift detected on retained reference (Tier-2 precaution)',
      affectedKg: plan.weight,
      initiatedBy: officerId,
      initiatedAt: daysAgo(2).toISOString(),
    });
    console.log(`  recall ${id}`);
  }
}

type ListingScenario =
  | 'live'      // active auction with an in-flight bid
  | 'settled'   // closed with a winning bid
  | 'cancelled' // farmer pulled before any bids
  | 'unsold';   // closed with zero bids

const LISTING_PLAN: Array<{
  batchIndex: number;
  scenario: ListingScenario;
  reservePaise: number;
  startsDaysAgo: number;
  durationMinutes: number;
  bids?: Array<{ bidder: string; amountPaise: number; minutesAgo: number }>;
}> = [
  {
    batchIndex: 4,
    scenario: 'live',
    reservePaise: 320 * 100 * 100, // ₹320 / kg → ₹131,200 minimum on 410 kg → use absolute paise
    startsDaysAgo: 1,
    durationMinutes: 60 * 24 * 2,
    bids: [
      { bidder: 'enterprise@honeytrace.gov',  amountPaise: 12_500_000, minutesAgo: 600 },
      { bidder: 'enterprise2@honeytrace.gov', amountPaise: 13_750_000, minutesAgo: 480 },
      { bidder: 'consumer@honeytrace.gov',    amountPaise: 14_000_000, minutesAgo: 360 },
      { bidder: 'enterprise@honeytrace.gov',  amountPaise: 14_500_000, minutesAgo: 120 },
    ],
  },
  {
    batchIndex: 5,
    scenario: 'settled',
    reservePaise: 9_000_000,
    startsDaysAgo: 6,
    durationMinutes: 60 * 24,
    bids: [
      { bidder: 'enterprise2@honeytrace.gov', amountPaise: 9_000_000,  minutesAgo: 60 * 24 * 5 + 600 },
      { bidder: 'enterprise@honeytrace.gov',  amountPaise: 9_750_000,  minutesAgo: 60 * 24 * 5 + 540 },
      { bidder: 'enterprise2@honeytrace.gov', amountPaise: 10_500_000, minutesAgo: 60 * 24 * 5 + 360 },
      { bidder: 'enterprise@honeytrace.gov',  amountPaise: 11_250_000, minutesAgo: 60 * 24 * 5 + 90 },
    ],
  },
  {
    batchIndex: 6,
    scenario: 'cancelled',
    reservePaise: 11_000_000,
    startsDaysAgo: 4,
    durationMinutes: 60 * 24,
    bids: [],
  },
  {
    batchIndex: 12,
    scenario: 'unsold',
    reservePaise: 14_000_000,
    startsDaysAgo: 9,
    durationMinutes: 60 * 24,
    bids: [],
  },
];

function listingId(seq: number): string {
  const d = daysAgo(0);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `MK-${y}${m}${day}-${String(seq).padStart(3, '0')}`;
}

async function seedListings(userIds: Record<string, string>) {
  const warehouse = SEED_USERS.find((u) => u.role === 'warehouse')!;
  const warehouseId = userIds[warehouse.email];

  let seq = 0;
  for (const plan of LISTING_PLAN) {
    seq += 1;
    const batchPlan = BATCH_PLAN.find((b) => b.index === plan.batchIndex)!;
    const id = batchId(plan.batchIndex);
    const farmerEmail = batchPlan.farmerEmail;
    const farmerId = userIds[farmerEmail];
    const farmerName = SEED_USERS.find((u) => u.email === farmerEmail)?.name ?? 'Farmer';
    const startsAt = daysAgo(plan.startsDaysAgo);
    const endsAt = new Date(startsAt.getTime() + plan.durationMinutes * 60_000);
    const storageStartAt = batchPlan.daysAgoReceived != null ? daysAgo(batchPlan.daysAgoReceived) : startsAt;

    const sortedBids = (plan.bids ?? []).slice().sort((a, b) => a.amountPaise - b.amountPaise);
    const winning = sortedBids[sortedBids.length - 1];

    let status: ListingScenario = plan.scenario;
    let settledAt: Date | undefined;
    let netToFarmerPaise: number | undefined;
    let storageCostPaise = computeStorageCostPaise({
      ratePaisePerKgPerDay: warehouse.storageRatePerKgPerDayPaise ?? DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
      weightKg: batchPlan.weight,
      storageStartAt,
      asOf: status === 'live' ? new Date() : endsAt,
    });

    let currentPricePaise = plan.reservePaise;
    let bidCount = 0;
    let highestBidderId: string | undefined;
    let highestBidderName: string | undefined;
    let highestBidderRole: 'enterprise' | 'consumer' | 'admin' | undefined;

    if (status === 'settled' && winning) {
      settledAt = new Date(endsAt.getTime() + 5 * 60_000);
      currentPricePaise = winning.amountPaise;
      bidCount = sortedBids.length;
      highestBidderId = userIds[winning.bidder];
      highestBidderName = SEED_USERS.find((u) => u.email === winning.bidder)?.name ?? 'Bidder';
      highestBidderRole = (SEED_USERS.find((u) => u.email === winning.bidder)?.role ?? 'enterprise') as
        | 'enterprise'
        | 'consumer'
        | 'admin';
      netToFarmerPaise = Math.max(0, currentPricePaise - storageCostPaise);
    }

    if (status === 'live' && sortedBids.length > 0) {
      const top = sortedBids[sortedBids.length - 1];
      currentPricePaise = top.amountPaise;
      bidCount = sortedBids.length;
      highestBidderId = userIds[top.bidder];
      highestBidderName = SEED_USERS.find((u) => u.email === top.bidder)?.name ?? 'Bidder';
      highestBidderRole = (SEED_USERS.find((u) => u.email === top.bidder)?.role ?? 'enterprise') as
        | 'enterprise'
        | 'consumer'
        | 'admin';
    }

    if (status === 'unsold') {
      settledAt = new Date(endsAt.getTime() + 5 * 60_000);
    }

    const lid = listingId(seq);
    await Listing.create({
      listingId: lid,
      batchId: id,
      farmerId,
      farmerName,
      warehouseId,
      warehouseName: warehouse.name,
      weightKg: batchPlan.weight,
      floraType: batchPlan.flora,
      grade: batchPlan.grade,
      reservePricePaise: plan.reservePaise,
      currentPricePaise,
      bidIncrementPaise: 250_000, // ₹2,500 step
      storageRatePerKgPerDayPaise: warehouse.storageRatePerKgPerDayPaise ?? DEFAULT_STORAGE_RATE_PAISE_PER_KG_DAY,
      storageStartAt,
      storageCostPaise,
      bidCount,
      highestBidderId,
      highestBidderName,
      highestBidderRole,
      startsAt,
      endsAt: status === 'live' ? new Date(Date.now() + 6 * 60 * 60 * 1000) : endsAt,
      antiSnipeWindowSec: 60,
      antiSnipeExtendSec: 60,
      status,
      settledAt,
      netToFarmerPaise,
      notes: status === 'cancelled' ? 'Withdrawn by farmer pending re-grading' : undefined,
    });

    // Bid history
    for (const [idx, bid] of sortedBids.entries()) {
      const bidderUser = SEED_USERS.find((u) => u.email === bid.bidder)!;
      await Bid.create({
        listingId: lid,
        bidderId: userIds[bid.bidder],
        bidderName: bidderUser.name,
        bidderRole: bidderUser.role as 'enterprise' | 'consumer' | 'admin',
        amountPaise: bid.amountPaise,
        isWinning: idx === sortedBids.length - 1 && status !== 'cancelled' && status !== 'unsold',
        isOutbid: idx !== sortedBids.length - 1,
        createdAt: new Date(Date.now() - bid.minutesAgo * 60_000),
      });
    }

    console.log(`  list  ${lid} ${status.padEnd(9)} batch=${id} bids=${sortedBids.length}`);
  }
}

async function seedNotifications(userIds: Record<string, string>) {
  await Notification.create({
    userId: userIds['farmer@honeytrace.gov'],
    type: 'BATCH_CERTIFIED',
    title: 'Batch Certified',
    message: 'Batch HT-SEED-004 has been certified by lab and is marketplace-ready.',
    batchId: 'HT-SEED-004',
    isRead: false,
    createdAt: daysAgo(1),
  });
  await Notification.create({
    userId: userIds['warehouse@honeytrace.gov'],
    type: 'BATCH_CREATED',
    title: 'New Batch Assigned',
    message: 'Farmer Ramesh Kumar has assigned HT-SEED-001 to your warehouse.',
    batchId: 'HT-SEED-001',
    isRead: false,
    createdAt: daysAgo(2),
  });
  console.log('  notifications seeded');
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log('connected');

  console.log('\n→ wiping all collections');
  await dropAll();

  console.log('\n→ seeding users');
  const userIds = await seedUsers();

  console.log('\n→ seeding batches');
  await seedBatches(userIds);

  console.log('\n→ seeding lab results');
  await seedLabResults();

  console.log('\n→ seeding recalls');
  await seedRecalls(userIds);

  console.log('\n→ seeding marketplace listings + bids');
  await seedListings(userIds);

  console.log('\n→ seeding notifications');
  await seedNotifications(userIds);

  await mongoose.disconnect();
  console.log('\n✔ rich seed complete');
}

main().catch((err) => {
  console.error('seed-rich failed:', err);
  process.exit(1);
});
