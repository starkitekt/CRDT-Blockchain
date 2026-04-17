import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getBatchById, computeChainHash } from '@/lib/services/batch.service';
import { connectDB } from '@/lib/mongodb';
import { AuditLog } from '@/lib/models/AuditLog';
import { User } from '@/lib/models/User';
import { LabResult } from '@/lib/models/LabResult';

const REGISTRY_ABI = [
  'function getBatch(string batchId) external view returns (bytes32 dataHash, uint256 timestamp, address recorder, string bizStep)',
  'function isRecalled(string batchId) external view returns (bool)',
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';
const CHAIN_RPC = process.env.BLOCKCHAIN_RPC_URL
  || process.env.BASE_SEPOLIA_RPC_URL
  || process.env.LOCAL_RPC_URL
  || 'http://127.0.0.1:8545';

const STEP_ORDER = ['created', 'stored', 'tested', 'certified', 'approved', 'dispatched', 'delivered', 'recalled'];

const STATUS_LABELS: Record<string, string> = {
  created: 'Batch Created',
  pending: 'Batch Created',
  stored: 'Received at Warehouse',
  in_warehouse: 'Received at Warehouse',
  tested: 'Tested',
  in_testing: 'Tested',
  certified: 'Lab Certified',
  approved: 'Officer Approved',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
  recalled: 'Recall Initiated',
};

const STATUS_STEP: Record<string, string> = {
  pending: 'created',
  created: 'created',
  in_warehouse: 'stored',
  stored: 'stored',
  in_testing: 'tested',
  tested: 'tested',
  certified: 'certified',
  approved: 'approved',
  dispatched: 'dispatched',
  delivered: 'delivered',
  recalled: 'recalled',
};

type TimelineEvent = {
  step: string;
  label: string;
  actor: string | null;
  timestamp: string | null;
  location: string | null;
  data: Record<string, unknown> | null;
};

function getProvider() {
  const rpc = CHAIN_RPC.toLowerCase();
  const isBaseSepolia = rpc.includes('base') && rpc.includes('sepolia');
  const isLocalhost = rpc.includes('127.0.0.1') || rpc.includes('localhost');
  if (isBaseSepolia) {
    const net = new ethers.Network('base-sepolia', 84532);
    return new ethers.JsonRpcProvider(CHAIN_RPC, net, { staticNetwork: net });
  }
  if (isLocalhost) {
    const net = new ethers.Network('localhost', 31337);
    return new ethers.JsonRpcProvider(CHAIN_RPC, net, { staticNetwork: net });
  }
  return new ethers.JsonRpcProvider(CHAIN_RPC);
}

function resolveNetworkLabel(): string {
  const rpc = CHAIN_RPC.toLowerCase();
  if (rpc.includes('base') && rpc.includes('sepolia')) return 'baseSepolia';
  if (rpc.includes('127.0.0.1') || rpc.includes('localhost')) return 'hardhat-local';
  if (rpc.includes('polygon')) return 'polygon';
  return 'unknown';
}

function buildCanonicalPayload(b: Record<string, unknown>) {
  return {
    batchId: b.batchId as string,
    farmerId: b.farmerId as string,
    floraType: b.floraType as string,
    weightKg: b.weightKg as number,
    harvestDate: b.harvestDate as string,
    moisturePct: b.moisturePct as number,
    grade: b.grade as string,
    status: b.status as string,
  };
}

function safeTs(val: unknown): string | null {
  if (!val) return null;
  const d = new Date(String(val));
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

async function buildTimeline(batch: Record<string, unknown>, batchId: string): Promise<TimelineEvent[]> {
  const events: TimelineEvent[] = [];

  events.push({
    step: 'created',
    label: 'Honey Harvested',
    actor: typeof batch.farmerName === 'string' ? batch.farmerName : null,
    timestamp: safeTs(batch.harvestDate),
    location: `${batch.latitude ?? ''}, ${batch.longitude ?? ''}`,
    data: { weightKg: batch.weightKg, floraType: batch.floraType, grade: batch.grade },
  });

  const patchLogs = await AuditLog
    .find({ entityType: 'batch', entityId: batchId, action: { $in: ['patch', 'publish'] } })
    .sort({ createdAt: 1 })
    .lean();

  for (const log of patchLogs) {
    const metadata = (log as { metadata?: { after?: { status?: string } } }).metadata;
    const rawStatus = typeof metadata?.after?.status === 'string' ? metadata.after.status : null;
    const step = rawStatus ? (STATUS_STEP[rawStatus] ?? rawStatus) : null;
    if (!step) continue;

    events.push({
      step,
      label: STATUS_LABELS[rawStatus ?? step] ?? step,
      actor: log.actorRole ?? null,
      timestamp: safeTs((log as { createdAt?: unknown }).createdAt),
      location: null,
      data: null,
    });
  }

  const labLogs = await AuditLog
    .find({ entityType: 'lab', entityId: batchId, action: 'publish' })
    .sort({ createdAt: 1 })
    .lean();

  for (const log of labLogs) {
    const metadata = (log as { metadata?: Record<string, unknown> }).metadata;
    events.push({
      step: 'tested',
      label: 'Lab Testing Completed',
      actor: log.actorRole ?? null,
      timestamp: safeTs((log as { createdAt?: unknown }).createdAt),
      location: null,
      data: {
        labId: metadata?.labId ?? null,
        fssaiLicense: metadata?.fssaiLicense ?? null,
      },
    });
  }

  events.sort((a, b) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));
  return events;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  if (!batchId?.trim()) return NextResponse.json({ error: 'batchId is required' }, { status: 400 });

  const batch = await getBatchById(batchId);
  if (!batch) return NextResponse.json({ error: 'Batch not found' }, { status: 404 });

  const batchData = batch as Record<string, unknown>;
  const canonicalPayload = buildCanonicalPayload(batchData);
  const recomputedHash = computeChainHash(canonicalPayload);

  await connectDB();
  const warehouse = batchData.warehouseId
    ? await User.findById(String(batchData.warehouseId)).select('name jurisdiction aadhaarKycAddress').lean()
    : null;
  const labResult = await LabResult.findOne({ batchId }).lean();
  const latestBatchPatch = await AuditLog.findOne({
    entityType: 'batch',
    entityId: batchId,
    action: 'patch',
    'metadata.after.status': { $in: ['approved', 'recalled'] },
  }).sort({ createdAt: -1 }).lean();

  const officerDecision = latestBatchPatch
    ? {
        decision: ((latestBatchPatch as { metadata?: { after?: { status?: string } } }).metadata?.after?.status) ?? null,
        actorRole: latestBatchPatch.actorRole ?? null,
        decidedAt: safeTs((latestBatchPatch as { createdAt?: unknown }).createdAt),
      }
    : null;

  let blockchainData: {
    onChain: boolean;
    tamperProof: boolean;
    dataHash: string | null;
    onChainHash: string | null;
    computedHash: string;
    timestamp: number | null;
    recorder: string | null;
    bizStep: string | null;
    location: string | null;
    recalls: unknown[];
    network: string;
    error?: string;
  } = {
    onChain: false,
    tamperProof: false,
    dataHash: null,
    onChainHash: null,
    computedHash: recomputedHash,
    timestamp: null,
    recorder: null,
    bizStep: null,
    location: null,
    recalls: [],
    network: resolveNetworkLabel(),
  };

  if (CONTRACT_ADDRESS) {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, provider);
      const [dataHash, timestamp, recorder, bizStep] = await contract.getBatch(batchId);
      const recalled = await contract.isRecalled(batchId);
      const dbAnchorHash = (batchData.onChainDataHash as string) ?? '';
      const tamperProof = dbAnchorHash ? dataHash.toLowerCase() === dbAnchorHash.toLowerCase() : false;

      blockchainData = {
        onChain: true,
        tamperProof,
        dataHash: dbAnchorHash || null,
        onChainHash: dataHash,
        computedHash: recomputedHash,
        timestamp: Number(timestamp) * 1000,
        recorder,
        bizStep,
        location: null,
        recalls: recalled ? [{ tier: 1, reason: 'On-chain recall flag set', timestamp: Date.now(), officer: recorder }] : [],
        network: resolveNetworkLabel(),
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('BATCH_NOT_FOUND')) blockchainData.error = msg;
    }
  }

  AuditLog.create({
    entityType: 'batch',
    entityId: batchId,
    action: 'trace_viewed',
    actorUserId: 'public',
    actorRole: 'consumer',
    metadata: { tamperProof: blockchainData.tamperProof, onChain: blockchainData.onChain },
  }).catch(() => {});

  return NextResponse.json({
    batch: batchData,
    blockchain: blockchainData,
    timeline: await buildTimeline(batchData, batchId),
    warehouse: warehouse
      ? {
          id: String(batchData.warehouseId),
          name: warehouse.name ?? null,
          location: warehouse.jurisdiction ?? warehouse.aadhaarKycAddress ?? null,
        }
      : null,
    testing: labResult
      ? {
          moisture: labResult.moisture ?? null,
          hmf: labResult.hmf ?? null,
          diastase: labResult.diastase ?? null,
          passed: (batchData.labResults as { passed?: boolean } | undefined)?.passed ?? null,
          publishedAt: labResult.publishedAt ?? null,
        }
      : null,
    officerDecision,
    meta: { fetchedAt: new Date().toISOString(), batchId },
  });
}
