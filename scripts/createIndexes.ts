import { config } from 'dotenv';
config({ path: '.env.local' });
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

async function createIndexes() {
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected\n');

  const db = mongoose.connection.db!;

  // ── Users ──────────────────────────────────────────────────────────────────
  await db.collection('users').createIndex({ email: 1 }, { unique: true });
  console.log('✅ users.email');

  await db.collection('users').createIndex({ role: 1 });
  console.log('✅ users.role');

  // ── Batches ────────────────────────────────────────────────────────────────
  await db.collection('batches').createIndex({ id: 1 }, { unique: true });
  console.log('✅ batches.id');

  await db.collection('batches').createIndex({ farmerId: 1 });
  console.log('✅ batches.farmerId');

  await db.collection('batches').createIndex({ status: 1 });
  console.log('✅ batches.status');

  // Compound index for listBatches(farmerId, status) combined queries
  await db.collection('batches').createIndex({ farmerId: 1, status: 1 });
  console.log('✅ batches.{farmerId,status}');

  await db.collection('batches').createIndex({ _payloadHash: 1 }, { sparse: true });
  console.log('✅ batches._payloadHash');

  // ── Lab Results ────────────────────────────────────────────────────────────
  // ⚠️  Verify collection name: run `show collections` in Atlas shell first
  await db.collection('labresults').createIndex({ batchId: 1 }, { unique: true });
  console.log('✅ labresults.batchId');

  // ── Recalls ────────────────────────────────────────────────────────────────
  await db.collection('recalls').createIndex({ batchId: 1 });
  console.log('✅ recalls.batchId');

  // ── Audit Logs ─────────────────────────────────────────────────────────────
  await db.collection('auditlogs').createIndex({ entityId: 1 });
  console.log('✅ auditlogs.entityId');

  await db.collection('auditlogs').createIndex({ at: -1 });
  console.log('✅ auditlogs.at');

  // TTL: auto-expire audit logs after 2 years (optional, remove if you need full history)
  await db.collection('auditlogs').createIndex(
    { at: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 730, name: 'auditlogs_ttl' }
  );
  console.log('✅ auditlogs.ttl (2yr)');

  // ── Counters ───────────────────────────────────────────────────────────────
  await db.collection('counters').createIndex({ name: 1 }, { unique: true });
  console.log('✅ counters.name');

  console.log('\n✅ All indexes created.');
  await mongoose.disconnect();
}

createIndexes().catch((err) => {
  console.error('❌ Failed:', err);
  process.exit(1);
});