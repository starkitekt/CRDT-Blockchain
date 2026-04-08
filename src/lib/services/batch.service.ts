import { createHash } from 'crypto';
import { ethers } from 'ethers';
import { connectDB } from '../mongodb';
import { Batch } from '../models/Batch';
import { getNextSeq } from '../models/Counter';
import { auditLog } from '../audit';
import { CreateBatchInput, PatchBatchInput } from '../validation/batch.schema';
import { anchorBatchOnChain, isBlockchainRelayEnabled } from '../blockchain-relay';


// â”€â”€ GS1 CBV BizStep mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const BIZ_STEP: Record<string, string> = {
  pending: 'commissioning',
  in_testing: 'inspecting',
  certified: 'accepting',
  in_warehouse: 'storing',
  dispatched: 'departing',
  recalled: 'returning',
};

// Statuses that trigger a new on-chain anchor
const ANCHOR_ON_STATUS = new Set([
  'certified',      // was 'lab_approved'   â†’ lab certifies the batch
  'in_warehouse',   // was 'warehouse_stored' â†’ batch received at warehouse
  'dispatched',     // âœ… already correct
  'recalled',       // âœ… already correct
]);


// â”€â”€ Local type extension â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// PatchBatchInput doesn't include `location` (a pre-computed "lat,lng" string).
// We accept it as an optional convenience field so callers can pass it directly
// instead of deriving it from latitude/longitude each time.
type PatchBatchInputWithLocation = PatchBatchInput & { location?: string };


// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function formatBatchId(seq: number): string {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, '0');
  const d = String(n.getDate()).padStart(2, '0');
  return `HT-${y}${m}${d}-${String(seq).padStart(3, '0')}`;
}

/**
 * SHA-256 fingerprint for 24h offline-replay deduplication.
 * NOT the same as the on-chain hash.
 */
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

/**
 * keccak256 hash of a batch payload â€” MUST match hashBatchData() in blockchain.ts.
 * Used for on-chain anchoring and tamper-verification.
 */
export function computeChainHash(data: Record<string, unknown>): string {
  const payload = JSON.stringify(data, Object.keys(data).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(payload));
}

/**
 * Alias kept for backward-compatibility with GET /api/trace/:batchId route.
 * Prefer computeChainHash in new code.
 */
export const computeBatchPayloadHash = computeChainHash;

/**
 * Canonical chain payload for a batch â€” what gets hashed + anchored.
 * Any change to this shape = new on-chain anchor required.
 */
function buildChainPayload(
  batchId: string,
  input: Pick<
    CreateBatchInput,
    'farmerId' | 'floraType' | 'weightKg' | 'harvestDate' | 'moisturePct' | 'grade'
  >,
  status: string
) {
  return {
    batchId,
    farmerId: input.farmerId,
    floraType: input.floraType,
    weightKg: input.weightKg,
    harvestDate: input.harvestDate,
    moisturePct: input.moisturePct,
    grade: input.grade,
    status,
  };
}

type BatchDocLike = Record<string, unknown> & {
  _id?: unknown;
  _payloadHash?: string;
  __v?: unknown;
  batchId?: string;
};

function stripInternal(doc: BatchDocLike) {
  const rest = { ...doc };
  delete rest._id;
  delete rest._payloadHash;
  delete rest.__v;
  return {
    ...rest,
    id: doc._id != null ? String(doc._id) : (doc.batchId ?? ''),
    payloadHash: doc._payloadHash ?? null,
  }; // expose payload hash + stable id for frontend tables/actions
}

/**
 * Derives a "lat,lng" location string from an updates object + batch fallback.
 * Prefers an explicit `location` field (passed by callers that have already
 * assembled the string), otherwise builds it from coordinate fields.
 */
function resolveLocation(
  updates: PatchBatchInputWithLocation,
  batch: { latitude?: string | null; longitude?: string | null }
): string {
  if (updates.location != null) return updates.location;
  const lat = updates.latitude ?? batch.latitude ?? '';
  const lng = updates.longitude ?? batch.longitude ?? '';
  return `${lat},${lng}`;
}


// â”€â”€ Create â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function createBatch(
  input: CreateBatchInput,
  actorId?: string,
  actorRole = 'farmer'
) {
  await connectDB();

  // â”€â”€ Moisture business rule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (input.moisturePct > 20) {
    const err = new Error('MOISTURE_VIOLATION') as Error & { violations?: string[] };
    err.violations = [
      `Moisture content ${input.moisturePct}% exceeds Codex limit of 20%`,
    ];
    throw err;
  }

  // â”€â”€ Offline replay deduplication (24h window) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const fingerprint = computeFingerprint(input);
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const existing = await Batch.findOne({
    _payloadHash: fingerprint,
    createdAt: { $gte: windowStart },
  }).lean();
  if (existing) return stripInternal(existing);

  // â”€â”€ Create DB record â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const seq = await getNextSeq('batch');
  const batchId = formatBatchId(seq);
  const batch = await Batch.create({
    ...input,
    batchId,
    status: 'pending',
    _payloadHash: fingerprint,
  });

  // â”€â”€ Anchor on chain â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (isBlockchainRelayEnabled()) {
    try {
      const chainPayload = buildChainPayload(batchId, input, 'pending');
      const txHash = await anchorBatchOnChain(
        batchId,
        chainPayload,
        BIZ_STEP['pending'],
        `${input.latitude ?? ''},${input.longitude ?? ''}`
      );
      batch.onChainTxHash = txHash;
      batch.onChainDataHash = computeChainHash(chainPayload);
      await batch.save();
    } catch (chainErr) {
      console.error('[batch.service] Chain anchor failed â€” batch saved to DB only:', chainErr);
    }
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


// â”€â”€ List / Get â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function listBatches(farmerId?: string, status?: string) {
  await connectDB();
  const query: Record<string, string> = {};
  if (farmerId) query.farmerId = farmerId;
  if (status) query.status = status;
  const batches = await Batch.find(query).sort({ createdAt: -1 }).lean();
  return batches.map(stripInternal);
}

export async function getBatchById(id: string) {
  await connectDB();
  // field is stored as `batchId` (e.g. "HT-20260404-006")
  const batch = await Batch.findOne({ batchId: id }).lean();
  if (!batch) return null;
  return stripInternal(batch);
}
/**
 * Alias kept for backward-compatibility with GET /api/trace/:batchId route.
 * Prefer getBatchById in new code.
 */
export const getBatchByBatchId = getBatchById;


// â”€â”€ Patch â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function patchBatch(
  id: string,
  updates: PatchBatchInputWithLocation,   // â† extended type â€” accepts optional `location`
  actorId?: string,
  actorRole = 'unknown'
) {
  await connectDB();
  const batch = await Batch.findOne({ batchId: id });
  if (!batch) return null;

  const before = batch.toObject();
  const newStatus = updates.status ?? batch.status;
  const statusChanged = updates.status && updates.status !== batch.status;

  Object.assign(batch, updates);

  // â”€â”€ Re-anchor at key supply chain milestones â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (statusChanged && ANCHOR_ON_STATUS.has(newStatus) && isBlockchainRelayEnabled()) {
    try {
      const chainPayload = buildChainPayload(id, {
        farmerId: batch.farmerId,
        floraType: batch.floraType,
        weightKg: batch.weightKg,
        harvestDate: batch.harvestDate,
        moisturePct: batch.moisturePct,
        grade: batch.grade,
      }, newStatus);

      const txHash = await anchorBatchOnChain(
        id,
        chainPayload,
        BIZ_STEP[newStatus] ?? 'unknown',
        resolveLocation(updates, batch)   // â† fixes TS2339
      );

      batch.onChainTxHash = txHash;
      batch.onChainDataHash = computeChainHash(chainPayload);
    } catch (chainErr) {
      console.error(`[batch.service] Re-anchor failed for status ${newStatus}:`, chainErr);
    }
  }

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
      chainAnchored: statusChanged && ANCHOR_ON_STATUS.has(newStatus),
    },
  });

  return stripInternal(batch.toObject());
}


// â”€â”€ Tamper Verification â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface IntegrityResult {
  batchId: string;
  status: 'verified' | 'tampered' | 'unanchored' | 'chain_unavailable';
  dbHash: string | null;
  onChainHash: string | null;
  onChainTxHash: string | null;
  recordedAt: number | null;
  recorder: string | null;
  message: string;
}

/**
 * Verifies batch data integrity by comparing the DB-stored hash
 * against what's recorded on-chain.
 *
 * Called by GET /api/trace/:batchId
 */
export async function verifyBatchIntegrity(
  id: string,
  provider: import('ethers').BrowserProvider | import('ethers').JsonRpcProvider
): Promise<IntegrityResult> {
  await connectDB();

  const batch = await Batch.findOne({ batchId: id }).lean();
  if (!batch) {
    return {
      batchId: id,
      status: 'unanchored',
      dbHash: null,
      onChainHash: null,
      onChainTxHash: null,
      recordedAt: null,
      recorder: null,
      message: 'Batch not found in database',
    };
  }

  if (!isBlockchainRelayEnabled() || !batch.onChainTxHash) {
    return {
      batchId: id,
      status: 'unanchored',
      dbHash: batch.onChainDataHash ?? null,
      onChainHash: null,
      onChainTxHash: batch.onChainTxHash ?? null,
      recordedAt: null,
      recorder: null,
      message: 'Batch has not been anchored on-chain yet',
    };
  }

  try {
    const { Contract } = await import('ethers');
    const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';

    if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');

    const ABI = [
      'function getBatch(string batchId) public view returns (bytes32 dataHash, uint256 timestamp, address recorder, string bizStep)',
    ];

    const contract = new Contract(CONTRACT_ADDRESS, ABI, provider);
    const result = await contract.getBatch(id);
    const onChainHash = result.dataHash as string;
    const dbHash = batch.onChainDataHash ?? null;
    const isMatch = dbHash
      ? onChainHash.toLowerCase() === dbHash.toLowerCase()
      : false;

    return {
      batchId: id,
      status: isMatch ? 'verified' : 'tampered',
      dbHash,
      onChainHash,
      onChainTxHash: batch.onChainTxHash,
      recordedAt: Number(result.timestamp) * 1000,
      recorder: result.recorder,
      message: isMatch
        ? 'Data integrity confirmed â€” DB matches blockchain record'
        : 'âš ï¸ TAMPER DETECTED â€” DB data does not match blockchain record',
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown chain error';
    return {
      batchId: id,
      status: 'chain_unavailable',
      dbHash: batch.onChainDataHash ?? null,
      onChainHash: null,
      onChainTxHash: batch.onChainTxHash,
      recordedAt: null,
      recorder: null,
      message: `Chain read failed: ${message}`,
    };
  }
}
