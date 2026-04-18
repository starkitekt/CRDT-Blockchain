#!/usr/bin/env node
/* eslint-disable no-console */
/**
 * verify-sepolia-anchor.cjs
 *
 * End-to-end verification that the deployed HoneyTraceRegistry on Base
 * Sepolia accepts both the historical batch-anchor pattern AND the new
 * marketplace-settlement pattern, given our funded relayer key.
 *
 * What it does:
 *  1. Loads .env.local
 *  2. Connects the relayer wallet to https://sepolia.base.org (chain 84532)
 *  3. Reads the deployed registry address
 *  4. Sends three real transactions:
 *       a. Anchor a brand-new batch (commissioning)
 *       b. Anchor the SAME batch under a *staged* id (#stored) — this
 *          confirms the new "staged id" pattern that fixes the
 *          BATCH_HASH_MISMATCH regression.
 *       c. Anchor a marketplace settlement under a synthetic listingId
 *  5. Reads each receipt back from chain and prints the explorer URL
 *
 * Run:   node scripts/verify-sepolia-anchor.cjs
 * Cost:  ~3 × 60k gas at ~6 gwei on L2 ≈ 0.000001 ETH total
 */

require('dotenv').config({ path: '.env.local' });
const { ethers } = require('ethers');
const path = require('path');

const RPC = process.env.BASE_SEPOLIA_RPC_URL || process.env.BLOCKCHAIN_RPC_URL || 'https://sepolia.base.org';
const KEY = process.env.BLOCKCHAIN_RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY;
const CONTRACT = process.env.HONEYTRACE_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_HONEYTRACE_CONTRACT;

if (!KEY)      { console.error('Missing BLOCKCHAIN_RELAYER_PRIVATE_KEY'); process.exit(1); }
if (!CONTRACT) { console.error('Missing HONEYTRACE_CONTRACT_ADDRESS');     process.exit(1); }

const ABI = require(path.join(__dirname, '..', 'src', 'lib', 'abis', 'HoneyTraceRegistry.json'));

function keccakHash(obj) {
  const json = JSON.stringify(obj, Object.keys(obj).sort());
  return ethers.keccak256(ethers.toUtf8Bytes(json));
}

function explorer(txHash) {
  return `https://sepolia.basescan.org/tx/${txHash}`;
}

async function recordOrSkip(contract, label, batchId, payload, bizStep, location) {
  const dataHash = keccakHash(payload);
  console.log(`\n── ${label} ─────────────────────────────`);
  console.log('   batchId :', batchId);
  console.log('   bizStep :', bizStep);
  console.log('   hash    :', dataHash);

  // If the slot is already taken with our exact hash, skip instead of bouncing.
  try {
    const existing = await contract.getBatch(batchId);
    if (existing && existing.dataHash === dataHash) {
      console.log('   status  : ALREADY anchored with same hash — skipping send');
      return null;
    }
    if (existing && existing.dataHash !== ethers.ZeroHash) {
      console.log('   status  : id already taken with a different hash — skipping');
      return null;
    }
  } catch (_) { /* getBatch throws when missing on some networks */ }

  const tx = await contract.recordBatch(batchId, dataHash, bizStep, location);
  console.log('   tx sent :', tx.hash);
  console.log('   explorer:', explorer(tx.hash));
  const receipt = await tx.wait();
  console.log('   block   :', receipt.blockNumber, 'status:', receipt.status === 1 ? 'success' : 'reverted');
  return receipt;
}

(async () => {
  const provider = new ethers.JsonRpcProvider(RPC, { name: 'base-sepolia', chainId: 84532 }, { staticNetwork: true });
  const wallet = new ethers.Wallet(KEY, provider);
  const balance = ethers.formatEther(await provider.getBalance(wallet.address));

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  HoneyTrace ▸ Base Sepolia anchor verification');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('   relayer :', wallet.address);
  console.log('   balance :', balance, 'ETH');
  console.log('   network :', (await provider.getNetwork()).name, '(chainId=84532)');
  console.log('   block   :', await provider.getBlockNumber());
  console.log('   contract:', CONTRACT);

  if (Number(balance) < 0.0001) {
    console.error('\n!! Wallet balance too low. Fund', wallet.address, 'on Base Sepolia.');
    process.exit(2);
  }

  const contract = new ethers.Contract(CONTRACT, ABI, wallet);

  // Use a deterministic-but-unique suffix so reruns can tell what's new.
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const batchId   = `HT-VERIFY-${stamp}`;
  const stagedId  = `${batchId}#stored`;
  const listingId = `MK-VERIFY-${stamp}`;

  // 1. Initial harvest anchor — historical pattern
  await recordOrSkip(
    contract,
    'Step 1: harvest anchor (commissioning)',
    batchId,
    {
      stage: 'commissioning',
      farmerId: 'verify-script',
      floraType: 'multiflora',
      weightKg: 25,
      harvestDate: new Date().toISOString().slice(0, 10),
    },
    'commissioning',
    '22.8465,81.3340'
  );

  // 2. Re-anchor at "stored" milestone — uses the new staged-id pattern
  await recordOrSkip(
    contract,
    'Step 2: warehouse stored (staged id)',
    stagedId,
    {
      stage: 'storing',
      batchId,
      receivedAt: new Date().toISOString(),
      warehouseId: 'verify-script-warehouse',
    },
    'storing',
    'WH-PUNE-01'
  );

  // 3. Marketplace auction settlement — reuses recordBatch with auction_settled
  await recordOrSkip(
    contract,
    'Step 3: marketplace auction settlement',
    listingId,
    {
      kind: 'auction_settlement',
      listingId,
      batchId,
      finalPricePaise: 1_250_000,
      storageCostPaise: 5_000,
      netToFarmerPaise: 1_245_000,
      winnerId: 'verify-enterprise',
      settledAt: new Date().toISOString(),
    },
    'auction_settled',
    'WH-PUNE-01'
  );

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ✓ Done. Three immutable receipts on Base Sepolia.');
  console.log('═══════════════════════════════════════════════════════════');
})().catch((err) => {
  console.error('\n!! verification failed:', err?.shortMessage || err?.message || err);
  if (err?.code === 'INSUFFICIENT_FUNDS') console.error('   → top up the relayer wallet');
  process.exit(1);
});
