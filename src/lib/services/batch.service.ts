import { createHash } from 'crypto';
import { connectDB } from '../mongodb';
import { Batch } from '../models/Batch';
import { getNextSeq } from '../models/Counter';
import { auditLog } from '../audit';
import { CreateBatchInput, PatchBatchInput } from '../validation/batch.schema';
import { anchorBatchOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';

function formatBatchId(seq: number): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `HT-${y}${m}${d}-${String(seq).padStart(3, '0')}`;
}

function computeFingerprint(p: CreateBatchInput): string {
  const key = [
    p.farmerId,
    p.floraType,
    p.weightKg,
    p.harvestDate,
    p.moisturePct,
    p.farmerName,
    p.grade,
  ].join('|');
  return createHash('sha256').update(key).digest('hex');
}

function stripInternal(doc: any) {
  const { _id, _payloadHash, __v, ...rest } = doc;
  return rest;
}

export async function createBatch(
  input: CreateBatchInput,
  actorId?: string,
  actorRole = 'farmer'
) {
  await connectDB();

  // ── Moisture business rule ────────────────────────────────────────────────
  if (input.moisturePct > 20) {
    const err: any = new Error('MOISTURE_VIOLATION');
    err.violations = [
      `Moisture content ${input.moisturePct}% exceeds Codex limit of 20%`,
    ];
    throw err;
  }

  // ── Offline replay deduplication (24h window) ─────────────────────────────
  const fingerprint = computeFingerprint(input);
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const existing = await Batch.findOne({
    _payloadHash: fingerprint,
    createdAt: { $gte: windowStart },
  }).lean();
  if (existing) return stripInternal(existing); // idempotent return

  // ── Create ────────────────────────────────────────────────────────────────
  const seq = await getNextSeq('batch');
  const batchId = formatBatchId(seq);
  const now = new Date().toISOString();

  const batch = await Batch.create({
    ...input,
    id: batchId,
    status: 'pending',
    createdAt: now,
    _payloadHash: fingerprint,
  });

  if (isBlockchainRelayEnabled()) {
    const txHash = await anchorBatchOnChain(
      batchId,
      {
        farmerId: input.farmerId,
        floraType: input.floraType,
        weightKg: input.weightKg,
        harvestDate: input.harvestDate,
        moisturePct: input.moisturePct,
        grade: input.grade,
      },
      'HARVESTED',
      `${input.latitude},${input.longitude}`
    );
    batch.onChainTxHash = txHash;
    await batch.save();
  }

  await auditLog({
    entityType: 'batch',
    entityId: batchId,
    action: 'create',
    actorUserId: actorId,
    actorRole,
    metadata: { farmerId: input.farmerId },
  });

  return stripInternal(batch.toObject());
}

export async function listBatches(farmerId?: string, status?: string) {
  await connectDB();
  const query: Record<string, string> = {};
  if (farmerId) query.farmerId = farmerId;
  if (status)   query.status   = status;
  const batches = await Batch.find(query).sort({ createdAt: -1 }).lean();
  return batches.map(stripInternal);
}

export async function getBatchById(id: string) {
  await connectDB();
  const batch = await Batch.findOne({ id }).lean();
  if (!batch) return null;
  return stripInternal(batch);
}

export async function patchBatch(
  id: string,
  updates: PatchBatchInput,
  actorId?: string,
  actorRole = 'unknown'
) {
  await connectDB();
  const batch = await Batch.findOne({ id });
  if (!batch) return null;

  const before = batch.toObject();
  Object.assign(batch, updates);
  await batch.save();

  await auditLog({
    entityType: 'batch',
    entityId: id,
    action: 'patch',
    actorUserId: actorId,
    actorRole,
    metadata: {
      before: stripInternal(before),
      after: updates,
    },
  });

  return stripInternal(batch.toObject());
}
