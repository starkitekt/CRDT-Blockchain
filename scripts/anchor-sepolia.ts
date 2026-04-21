/**
 * Re-anchor every seeded lifecycle event against the existing
 * HoneyTraceRegistry on Base Sepolia (chain 84532).
 *
 * Steps:
 *  1. Connect to MongoDB (the same URI used by the seed scripts).
 *  2. Walk every Batch and anchor:
 *       - the harvest payload at `<batchId>`
 *       - one staged anchor per non-`created` status at `<batchId>#<status>`
 *  3. Anchor every published LabResult via `linkLabResult`.
 *  4. Anchor every Recall via `initRecall`.
 *  5. Anchor every settled Listing as a `recordBatch` with bizStep
 *     "auction_settled" under the listingId.
 *  6. Persist every returned tx hash + chain hash back to the source
 *     document so the UI surfaces real BaseScan links.
 *
 * Idempotent: if the contract already has the same hash for an id, the
 * script skips that send (the registry rejects collisions).
 *
 *   npm run sepolia:anchor
 */

import { config as loadEnv } from 'dotenv';
import mongoose from 'mongoose';
import { Contract, JsonRpcProvider, Network, Wallet, ethers } from 'ethers';
import path from 'node:path';
import HoneyTraceAbi from '../src/lib/abis/HoneyTraceRegistry.json';

loadEnv({ path: '.env.local' });

import { Batch } from '../src/lib/models/Batch';
import { LabResult } from '../src/lib/models/LabResult';
import { Recall } from '../src/lib/models/Recall';
import { Listing } from '../src/lib/models/Listing';

const RPC = process.env.BASE_SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org';
const KEY = process.env.BLOCKCHAIN_RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const CONTRACT = process.env.HONEYTRACE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT;
const MONGODB_URI = process.env.MONGODB_URI;

if (!KEY)         { console.error('Missing BLOCKCHAIN_RELAYER_PRIVATE_KEY'); process.exit(1); }
if (!CONTRACT)    { console.error('Missing HONEYTRACE_CONTRACT_ADDRESS');     process.exit(1); }
if (!MONGODB_URI) { console.error('Missing MONGODB_URI');                     process.exit(1); }

const STATUS_ANCHOR_ORDER = ['stored', 'certified', 'approved', 'dispatched', 'delivered', 'recalled'] as const;

const BIZ_STEP: Record<string, string> = {
  created: 'commissioning',
  stored: 'storing',
  certified: 'inspecting',
  approved: 'accepting',
  dispatched: 'departing',
  delivered: 'receiving',
  recalled: 'returning',
};

void path; // imported for parity with the verify script — not used at runtime

function keccakHash(data: Record<string, unknown>): string {
  const json = JSON.stringify(data, Object.keys(data).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

function explorer(txHash: string): string {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

function buildBatchPayload(b: {
  batchId: string;
  farmerId?: string;
  floraType?: string;
  weightKg?: number;
  harvestDate?: string;
  moisturePct?: number;
  grade?: string;
}, status: string) {
  return {
    batchId: b.batchId,
    farmerId: b.farmerId ?? '',
    floraType: b.floraType ?? '',
    weightKg: Number(b.weightKg ?? 0),
    harvestDate: b.harvestDate ?? '',
    moisturePct: Number(b.moisturePct ?? 0),
    grade: b.grade ?? '',
    status,
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI as string);
  console.log('mongo connected');

  const network = new Network('base-sepolia', 84532);
  const provider = new JsonRpcProvider(RPC, network, { staticNetwork: network });
  const wallet = new Wallet(KEY as string, provider);
  const balance = ethers.formatEther(await provider.getBalance(wallet.address));
  const block = await provider.getBlockNumber();
  console.log(`relayer ${wallet.address}  balance=${balance} ETH  block=${block}`);
  if (Number(balance) < 0.0005) {
    console.warn('!! low relayer balance — top up before re-anchoring large batches.');
  }

  const contract = new Contract(CONTRACT as string, HoneyTraceAbi, wallet);

  type Counts = { sent: number; skipped: number; failed: number };
  const counts: Counts = { sent: 0, skipped: 0, failed: 0 };

  async function anchorBatchSlot(slotId: string, payload: Record<string, unknown>, bizStep: string, location: string): Promise<string | null> {
    const dataHash = keccakHash(payload);
    try {
      const existing = await contract.getBatch(slotId);
      if (existing && existing.dataHash === dataHash) {
        counts.skipped += 1;
        return null;
      }
      if (existing && existing.dataHash !== ethers.ZeroHash) {
        console.warn(`  ! slot taken with different hash, skipping: ${slotId}`);
        counts.skipped += 1;
        return null;
      }
    } catch { /* getBatch may revert on missing */ }

    const tx = await contract.recordBatch(slotId, dataHash, bizStep, location);
    const receipt = await tx.wait();
    counts.sent += 1;
    console.log(`  + ${slotId.padEnd(36)} block=${receipt.blockNumber} tx=${tx.hash}`);
    return tx.hash as string;
  }

  // ── Batches ────────────────────────────────────────────────────────────────
  console.log('\n→ anchoring batches');
  const batches = await Batch.find().lean();
  for (const b of batches) {
    const id = String(b.batchId);
    const status = String(b.status ?? 'created');
    const harvestPayload = buildBatchPayload(b as never, 'created');
    try {
      const harvestTx = await anchorBatchSlot(
        id,
        harvestPayload,
        BIZ_STEP.created,
        `${b.latitude ?? ''},${b.longitude ?? ''}`
      );
      if (harvestTx) {
        await Batch.updateOne(
          { batchId: id },
          {
            $set: {
              onChainTxHash: harvestTx,
              onChainDataHash: keccakHash(harvestPayload),
              blockchainAnchoredAt: new Date(),
              blockchainNetwork: 'base-sepolia',
            },
          }
        );
      }
    } catch (err) {
      counts.failed += 1;
      console.error(`  x batch ${id}:`, (err as Error).message);
    }

    const targetIdx = STATUS_ANCHOR_ORDER.indexOf(status as typeof STATUS_ANCHOR_ORDER[number]);
    if (targetIdx >= 0) {
      for (let i = 0; i <= targetIdx; i += 1) {
        const stage = STATUS_ANCHOR_ORDER[i];
        const slotId = `${id}#${stage}`;
        const stagedPayload = buildBatchPayload(b as never, stage);
        try {
          const tx = await anchorBatchSlot(
            slotId,
            stagedPayload,
            BIZ_STEP[stage] ?? 'unknown',
            `${b.latitude ?? ''},${b.longitude ?? ''}`
          );
          if (tx && stage === status) {
            await Batch.updateOne(
              { batchId: id },
              {
                $set: {
                  onChainTxHash: tx,
                  onChainDataHash: keccakHash(stagedPayload),
                  blockchainAnchoredAt: new Date(),
                  blockchainNetwork: 'base-sepolia',
                },
              }
            );
          }
        } catch (err) {
          counts.failed += 1;
          console.error(`  x staged ${slotId}:`, (err as Error).message);
        }
      }
    }
  }

  // ── Lab results ────────────────────────────────────────────────────────────
  console.log('\n→ anchoring lab results');
  const labs = await LabResult.find().lean();
  for (const lab of labs) {
    const id = String(lab.batchId);
    const payload: Record<string, unknown> = {
      batchId: id,
      sampleId: lab.sampleId,
      labId: lab.labId,
      moisture: lab.moisture,
      hmf: lab.hmf,
      pollenCount: lab.pollenCount,
      acidity: lab.acidity,
      diastase: lab.diastase,
      sucrose: lab.sucrose,
      reducingSugars: lab.reducingSugars,
      conductivity: lab.conductivity,
      publishedAt: lab.publishedAt,
    };
    const dataHash = keccakHash(payload);
    try {
      const tx = await contract.linkLabResult(id, dataHash);
      const receipt = await tx.wait();
      counts.sent += 1;
      console.log(`  + lab ${id.padEnd(20)} block=${receipt.blockNumber} tx=${tx.hash}`);
      await LabResult.updateOne({ batchId: id }, { $set: { onChainTxHash: tx.hash } });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('LAB_ALREADY_LINKED')) {
        counts.skipped += 1;
      } else {
        counts.failed += 1;
        console.error(`  x lab ${id}:`, msg);
      }
    }
  }

  // ── Recalls ────────────────────────────────────────────────────────────────
  console.log('\n→ anchoring recalls');
  const recalls = await Recall.find().lean();
  for (const recall of recalls) {
    const id = String(recall.batchId);
    try {
      const tx = await contract.initRecall(id, Number(recall.tier), String(recall.reason));
      const receipt = await tx.wait();
      counts.sent += 1;
      console.log(`  + recall ${id.padEnd(20)} block=${receipt.blockNumber} tx=${tx.hash}`);
      await Recall.updateOne({ id: recall.id }, { $set: { onChainTxHash: tx.hash } });
      await Batch.updateOne({ batchId: id }, { $set: { recallTxHash: tx.hash } });
    } catch (err) {
      const msg = (err as Error).message;
      if (msg.includes('ALREADY_RECALLED')) {
        counts.skipped += 1;
      } else {
        counts.failed += 1;
        console.error(`  x recall ${id}:`, msg);
      }
    }
  }

  // ── Marketplace settlements ────────────────────────────────────────────────
  console.log('\n→ anchoring settled listings');
  const settled = await Listing.find({ status: 'settled' }).lean();
  for (const listing of settled) {
    const slotId = String(listing.listingId);
    const payload = {
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
    } as Record<string, unknown>;
    try {
      const tx = await anchorBatchSlot(
        slotId,
        payload,
        'auction_settled',
        listing.warehouseName ?? listing.warehouseId
      );
      if (tx) {
        await Listing.updateOne(
          { listingId: listing.listingId },
          {
            $set: {
              settlementTxHash: tx,
              settlementDataHash: keccakHash(payload),
            },
          }
        );
      }
    } catch (err) {
      counts.failed += 1;
      console.error(`  x listing ${slotId}:`, (err as Error).message);
    }
  }

  console.log('\n═════════════════════════════════════════════════════════════');
  console.log(`  sent=${counts.sent}  skipped=${counts.skipped}  failed=${counts.failed}`);
  console.log(`  explorer: https://sepolia.basescan.org/address/${CONTRACT}`);
  if (counts.sent > 0) console.log(`  e.g. ${explorer('<your-tx>')}`);
  console.log('═════════════════════════════════════════════════════════════');

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('anchor-sepolia failed:', err);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
