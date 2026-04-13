import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { getBatchById, computeChainHash } from '@/lib/services/batch.service';
import { connectDB } from '@/lib/mongodb';
import { AuditLog } from '@/lib/models/AuditLog';

const REGISTRY_ABI = [
  'function getBatch(string batchId) external view returns (bytes32 dataHash, uint256 timestamp, address recorder, string bizStep)',
  'function isRecalled(string batchId) external view returns (bool)',
];

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT ?? '';
const CHAIN_RPC = process.env.BLOCKCHAIN_RPC_URL
  || process.env.BASE_SEPOLIA_RPC_URL
  || process.env.LOCAL_RPC_URL
  || 'http://127.0.0.1:8545';

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
    batchId:     b.batchId     as string,
    farmerId:    b.farmerId    as string,
    floraType:   b.floraType   as string,
    weightKg:    b.weightKg    as number,
    harvestDate: b.harvestDate as string,
    moisturePct: b.moisturePct as number,
    grade:       b.grade       as string,
    status:      b.status      as string,
  };
}

function safeTs(val: unknown): string | null {
  if (!val) return null;
  try { return new Date(val as any).toISOString(); } catch { return null; }
}

const STEP_ORDER = ['harvest', 'in_warehouse', 'in_testing', 'certified', 'dispatched', 'recalled'];

const STATUS_LABELS: Record<string, string> = {
  in_warehouse: 'Received at Warehouse',
  in_testing:   'Submitted for Lab Testing',
  certified:    'Lab Certified',
  dispatched:   'Dispatched',
  recalled:     'Recall Initiated',
};

async function buildTimeline(batch: Record<string, unknown>, batchId: string) {
  const events: object[] = [];

  // Step 1: harvest — always from batch fields
  events.push({
    step:      'harvest',
    label:     'Honey Harvested',
    actor:     batch.farmerName,
    timestamp: safeTs(batch.harvestDate),
    location:  `${batch.latitude}, ${batch.longitude}`,
    data:      { weightKg: batch.weightKg, floraType: batch.floraType, grade: batch.grade },
  });

  // Steps 2-N: status changes from audit log patches
  const patchLogs = await AuditLog
    .find({ entityType: 'batch', entityId: batchId, action: { $in: ['patch', 'publish'] } })
    .sort({ createdAt: 1 })
    .lean();

  for (const log of patchLogs) {
    const newStatus = (log.metadata as any)?.after?.status;
    if (newStatus && STATUS_LABELS[newStatus]) {
      events.push({
        step:      newStatus,
        label:     STATUS_LABELS[newStatus],
        actor:     log.actorRole,
        timestamp: safeTs((log as any).createdAt ?? (log as any)._id?.getTimestamp()),
        location:  null,
        data:      null,
      });
    }
  }

  // Lab certified: pulled from lab audit logs
  const labLogs = await AuditLog
    .find({ entityType: 'lab', entityId: batchId, action: 'publish' })
    .sort({ createdAt: 1 })
    .lean();

  for (const log of labLogs) {
    events.push({
      step:      'certified',
      label:     'Lab Certified',
      actor:     log.actorRole,
      timestamp: safeTs((log as any).createdAt ?? (log as any)._id?.getTimestamp()),
      location:  null,
      data: {
        labId:        (log.metadata as any)?.labId,
        fssaiLicense: (log.metadata as any)?.fssaiLicense,
      },
    });
  }

  // Sort by supply chain order
  events.sort((a: any, b: any) => STEP_ORDER.indexOf(a.step) - STEP_ORDER.indexOf(b.step));

  return events;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;

  if (!batchId?.trim()) {
    return NextResponse.json({ error: 'batchId is required' }, { status: 400 });
  }

  const batch = await getBatchById(batchId);
  if (!batch) {
    return NextResponse.json({ error: 'Batch not found' }, { status: 404 });
  }

  const batchData        = batch as Record<string, unknown>;
  const canonicalPayload = buildCanonicalPayload(batchData);
  const recomputedHash   = computeChainHash(canonicalPayload);

  let blockchainData: {
    onChain:      boolean;
    tamperProof:  boolean;
    dataHash:     string | null;
    onChainHash:  string | null;
    computedHash: string;
    timestamp:    number | null;
    recorder:     string | null;
    bizStep:      string | null;
    location:     string | null;
    recalls:      unknown[];
    network:      string;
    error?:       string;
  } = {
    onChain:      false,
    tamperProof:  false,
    dataHash:     null,
    onChainHash:  null,
    computedHash: recomputedHash,
    timestamp:    null,
    recorder:     null,
    bizStep:      null,
    location:     null,
    recalls:      [],
    network: resolveNetworkLabel(),
  };

  if (CONTRACT_ADDRESS) {
    try {
      const provider = getProvider();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, REGISTRY_ABI, provider);

      try {
        const [dataHash, timestamp, recorder, bizStep] = await contract.getBatch(batchId);
        const recalled = await contract.isRecalled(batchId);

        // Compare on-chain hash vs DB-stored anchor hash (not recomputed)
        const dbAnchorHash = (batchData.onChainDataHash as string) ?? '';
        const tamperProof  = dbAnchorHash
          ? dataHash.toLowerCase() === dbAnchorHash.toLowerCase()
          : false;

        blockchainData = {
          onChain:      true,
          tamperProof,
          dataHash:     dbAnchorHash || null,
          onChainHash:  dataHash,
          computedHash: recomputedHash,
          timestamp:    Number(timestamp) * 1000,
          recorder,
          bizStep,
          location:     null,
          recalls: recalled
            ? [{ tier: 1, reason: 'On-chain recall flag set', timestamp: Date.now(), officer: recorder }]
            : [],
          network: resolveNetworkLabel(),
        };
      } catch (callErr: unknown) {
        const msg = callErr instanceof Error ? callErr.message : String(callErr);
        if (!msg.includes('BATCH_NOT_FOUND')) blockchainData.error = msg;
      }
    } catch (err: unknown) {
      blockchainData.error = err instanceof Error ? err.message : 'Blockchain query failed';
    }
  }

  await connectDB();
  AuditLog.create({
    entityType:  'batch',
    entityId:    batchId,
    action:      'trace_viewed',
    actorUserId: 'public',
    actorRole:   'consumer',
    metadata: { tamperProof: blockchainData.tamperProof, onChain: blockchainData.onChain },
  }).catch(() => {});

  return NextResponse.json({
    batch:      batchData,
    blockchain: blockchainData,
    timeline:   await buildTimeline(batchData, batchId),
    meta: { fetchedAt: new Date().toISOString(), batchId },
  });
}