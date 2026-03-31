import { config as loadEnv } from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../src/lib/models/User';
import { AnyUserSchema } from '../src/lib/validation/user.schema';

loadEnv({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI!;
const isReset = process.argv.includes('--reset');

const SEED_USERS = [
  // ── Farmer ────────────────────────────────────────────────────────────────
  {
    email:         'farmer@honeytrace.gov',
    password:      'password123',
    role:          'farmer' as const,
    name:          'Ramesh Kumar',
    aadhaarNumber: '876543210123',
    pmKisanId:     'PMKISAN-100234',
  },

  // ── Warehouse ─────────────────────────────────────────────────────────────
  {
    email:         'warehouse@honeytrace.gov',
    password:      'password123',
    role:          'warehouse' as const,
    name:          'Sunil Gupta',
    fssaiLicense:  '10016011000731',
    gstNumber:     '09AABCU9603R1ZP',
    wdraLicenseNo: 'WDRA-UP-2024-0042',
  },

  // ── Lab ───────────────────────────────────────────────────────────────────
  {
    email:               'lab@honeytrace.gov',
    password:            'password123',
    role:                'lab' as const,
    name:                'Dr. Priya Nair',
    fssaiLicense:        '10016011000892',
    nablAccreditationNo: 'T-4521',
    labRegistrationNo:   'LAB-MH-2023-0091',
  },

  // ── Officer ───────────────────────────────────────────────────────────────
  {
    email:          'officer@honeytrace.gov',
    password:       'password123',
    role:           'officer' as const,
    name:           'Mohan Sharma',
    employeeId:     'FSO-UP-00341',
    fssaiOfficerId: 'FSSAI-FSO-2021-4421',
    department:     'FSSAI - Uttar Pradesh State Food Authority',
    jurisdiction:   'Uttar Pradesh - Meerut District',
  },

  // ── Enterprise ────────────────────────────────────────────────────────────
  {
    email:        'enterprise@honeytrace.gov',
    password:     'password123',
    role:         'enterprise' as const,
    name:         'Mehta Exports Pvt. Ltd.',
    gstNumber:    '27AABCM1234F1ZX',
    fssaiLicense: '10016011002341',
    cinNumber:    'U15122MH2019PTC321456',
    iecCode:      'IEC-0519012345',
  },

  // ── Consumer ──────────────────────────────────────────────────────────────
  {
    email:        'consumer@honeytrace.gov',
    password:     'password123',
    role:         'consumer' as const,
    name:         'Anjali Singh',
    mobileNumber: '9876543210',
  },

  // ── Secretary ─────────────────────────────────────────────────────────────
  {
    email:      'secretary@honeytrace.gov',
    password:   'password123',
    role:       'secretary' as const,
    name:       'Rekha Joshi',
    employeeId: 'SEC-AGMARK-00782',
    department: 'AGMARK - Directorate of Marketing & Inspection',
  },

  // ── Admin (not in portal UI but needed for system management) ─────────────
  {
    email:      'admin@honeytrace.gov',
    password:   'Admin@password123',
    role:       'admin' as const,
    name:       'Admin User',
    employeeId: 'ADM-SYSTEM-001',
  },
];

async function seed() {
  if (!MONGODB_URI) {
    console.error('❌ MONGODB_URI not found. Make sure .env.local exists.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB\n');

  // ── Reset mode: wipe all existing users first ─────────────────────────────
  if (isReset) {
    const deleted = await User.deleteMany({});
    console.log(`🗑  Deleted ${deleted.deletedCount} existing users\n`);
  }

  let created = 0;
  let skipped = 0;
  let failed  = 0;

  for (const u of SEED_USERS) {
    // ── Validate documents before inserting ────────────────────────────────
    const validation = AnyUserSchema.safeParse(u);
    if (!validation.success) {
      console.error(`  ❌ VALIDATION FAILED: ${u.email}`);
      validation.error.issues.forEach((e) =>
        console.error(`     → ${String(e.path.join('.'))}: ${e.message}`)
      );
      failed++;
      continue;
    }

    // ── Skip if already exists (safe to re-run without --reset) ────────────
    const exists = await User.findOne({ email: u.email });
    if (exists) {
      console.log(`  ⏭  SKIP (already exists): ${u.email} (${u.role})`);
      skipped++;
      continue;
    }

    // ── Hash password + insert ──────────────────────────────────────────────
    const { password, ...rest } = u;
    const passwordHash = await bcrypt.hash(password, 12);

    await User.create({ ...rest, passwordHash, kycCompleted: true });
    console.log(`  ✅ CREATED: ${u.email} (${u.role})`);
    created++;
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Created : ${created}`);
  console.log(`   ⏭  Skipped : ${skipped}`);
  console.log(`   ❌ Failed  : ${failed}`);
  console.log('─────────────────────────────────────────');

  await mongoose.disconnect();
  console.log('✅ Seed complete. MongoDB disconnected.');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
