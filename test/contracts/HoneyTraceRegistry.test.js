const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('HoneyTraceRegistry', function () {
  async function deployFixture() {
    const [owner, recorder, officer, outsider] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory('HoneyTraceRegistry');
    const registry = await Factory.deploy();
    await registry.waitForDeployment();

    await registry.grantRole(recorder.address, 2);
    await registry.grantRole(officer.address, 3);

    return { registry, owner, recorder, officer, outsider };
  }

  it('records and returns batch data', async function () {
    const { registry, recorder } = await deployFixture();
    const hash = ethers.keccak256(ethers.toUtf8Bytes('payload'));

    await expect(
      registry.connect(recorder).recordBatch('HT-1', hash, 'HARVESTED', 'UP-MEERUT')
    ).to.emit(registry, 'BatchRecorded');

    const batch = await registry.getBatch('HT-1');
    expect(batch.dataHash).to.equal(hash);
    expect(batch.recorder).to.equal(recorder.address);
    expect(batch.bizStep).to.equal('HARVESTED');
  });

  it('rejects record from non-recorder', async function () {
    const { registry, outsider } = await deployFixture();
    const hash = ethers.keccak256(ethers.toUtf8Bytes('payload'));

    await expect(
      registry.connect(outsider).recordBatch('HT-2', hash, 'HARVESTED', 'UP-MEERUT')
    ).to.be.revertedWith('INSUFFICIENT_ROLE');
  });

  it('links lab result and creates recalls', async function () {
    const { registry, recorder, officer } = await deployFixture();
    const batchHash = ethers.keccak256(ethers.toUtf8Bytes('batch-payload'));
    const labHash = ethers.keccak256(ethers.toUtf8Bytes('lab-payload'));

    await registry.connect(recorder).recordBatch('HT-3', batchHash, 'TESTING', 'LAB-DELHI');
    await expect(registry.connect(recorder).linkLabResult('HT-3', labHash)).to.emit(
      registry,
      'LabResultLinked'
    );

    await expect(registry.connect(officer).initRecall('HT-3', 2, 'Pesticide detection')).to.emit(
      registry,
      'RecallInitiated'
    );

    expect(await registry.isRecalled('HT-3')).to.equal(true);
  });
});