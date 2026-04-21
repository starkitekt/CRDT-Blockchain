const { expect } = require('chai');
const { ethers } = require('hardhat');

/**
 * The marketplace anchors final auction settlements by reusing
 * `HoneyTraceRegistry.recordBatch` with a synthetic listingId and a
 * `bizStep` of "auction_settled". These tests pin that contract behaviour
 * for the exact shape the marketplace service relies on.
 */
describe('HoneyTraceRegistry — marketplace settlements', function () {
  async function fixture() {
    const [owner, relayer, otherRelayer, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('HoneyTraceRegistry');
    const registry = await Factory.deploy();
    await registry.waitForDeployment();

    // Both signers act as the off-chain relayer (one used per settlement)
    await registry.grantRole(relayer.address, 2);
    await registry.grantRole(otherRelayer.address, 2);

    return { registry, owner, relayer, otherRelayer, outsider };
  }

  function payloadHash(payload) {
    const sorted = JSON.stringify(payload, Object.keys(payload).sort());
    return ethers.keccak256(ethers.toUtf8Bytes(sorted));
  }

  it('anchors an auction settlement with the auction_settled bizStep', async function () {
    const { registry, relayer } = await fixture();
    const listingId = 'MK-20260101-001';
    const payload = {
      listingId,
      batchId: 'HT-9001',
      finalPricePaise: 1_250_000,
      storageCostPaise: 5_000,
      netToFarmerPaise: 1_245_000,
      winnerId: 'U-ent-1',
      kind: 'auction_settlement',
      settledAt: '2026-01-01T00:00:00.000Z',
    };
    const hash = payloadHash(payload);
    const warehouseLabel = 'WH-Pune-01';

    await expect(
      registry.connect(relayer).recordBatch(listingId, hash, 'auction_settled', warehouseLabel)
    )
      .to.emit(registry, 'BatchRecorded')
      .withArgs(
        listingId,
        hash,
        relayer.address,
        (anyTs) => typeof anyTs === 'bigint' && anyTs > 0n,
        'auction_settled',
        warehouseLabel
      );

    const stored = await registry.getBatch(listingId);
    expect(stored.dataHash).to.equal(hash);
    expect(stored.recorder).to.equal(relayer.address);
    expect(stored.bizStep).to.equal('auction_settled');
  });

  it('rejects re-anchoring a settlement with a different hash', async function () {
    const { registry, relayer } = await fixture();
    const listingId = 'MK-20260101-002';
    const firstHash = payloadHash({ listingId, finalPricePaise: 100_000 });
    const tamperedHash = payloadHash({ listingId, finalPricePaise: 999_000 });

    await registry
      .connect(relayer)
      .recordBatch(listingId, firstHash, 'auction_settled', 'WH-Pune-01');

    await expect(
      registry
        .connect(relayer)
        .recordBatch(listingId, tamperedHash, 'auction_settled', 'WH-Pune-01')
    ).to.be.revertedWith('BATCH_HASH_MISMATCH');
  });

  it('idempotent: re-anchoring with the same hash is allowed (replay-safe)', async function () {
    const { registry, relayer } = await fixture();
    const listingId = 'MK-20260101-003';
    const hash = payloadHash({ listingId, finalPricePaise: 500_000 });

    await registry.connect(relayer).recordBatch(listingId, hash, 'auction_settled', 'WH-Goa');
    // Calling again with the same hash should not revert — protects against
    // network retries from the relayer service.
    await expect(
      registry.connect(relayer).recordBatch(listingId, hash, 'auction_settled', 'WH-Goa')
    ).to.emit(registry, 'BatchRecorded');
  });

  it('refuses settlement anchors from non-recorder accounts', async function () {
    const { registry, outsider } = await fixture();
    const hash = payloadHash({ listingId: 'MK-X', finalPricePaise: 1 });

    await expect(
      registry
        .connect(outsider)
        .recordBatch('MK-20260101-004', hash, 'auction_settled', 'WH-Goa')
    ).to.be.revertedWith('INSUFFICIENT_ROLE');
  });

  it('rejects an empty listing id', async function () {
    const { registry, relayer } = await fixture();
    const hash = payloadHash({ listingId: '', finalPricePaise: 1 });
    await expect(
      registry.connect(relayer).recordBatch('', hash, 'auction_settled', 'WH-Goa')
    ).to.be.revertedWith('EMPTY_BATCH_ID');
  });

  it('preserves auction settlement alongside ordinary batch records', async function () {
    const { registry, relayer } = await fixture();
    const harvestHash = payloadHash({ stage: 'harvest', batchId: 'HT-mix' });
    const auctionHash = payloadHash({ stage: 'auction', batchId: 'HT-mix' });

    await registry
      .connect(relayer)
      .recordBatch('HT-mix', harvestHash, 'HARVESTED', 'UP-MEERUT');
    await registry
      .connect(relayer)
      .recordBatch('MK-mix', auctionHash, 'auction_settled', 'WH-MEERUT');

    const harvest = await registry.getBatch('HT-mix');
    const auction = await registry.getBatch('MK-mix');
    expect(harvest.bizStep).to.equal('HARVESTED');
    expect(auction.bizStep).to.equal('auction_settled');
    expect(harvest.dataHash).to.not.equal(auction.dataHash);
  });
});
