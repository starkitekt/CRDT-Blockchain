/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const hre = require('hardhat');

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  const networkName = hre.network.name;

  console.log(`Deploying with ${deployer.address} on ${networkName}...`);

  const Registry = await hre.ethers.getContractFactory('HoneyTraceRegistry');
  const registry = await Registry.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  console.log(`HoneyTraceRegistry deployed at ${address}`);

  const deploymentsFile = path.join(process.cwd(), 'deployments', 'addresses.json');
  const existing = fs.existsSync(deploymentsFile)
    ? JSON.parse(fs.readFileSync(deploymentsFile, 'utf8'))
    : {};

  existing[networkName] = { HoneyTraceRegistry: address };
  fs.mkdirSync(path.dirname(deploymentsFile), { recursive: true });
  fs.writeFileSync(deploymentsFile, JSON.stringify(existing, null, 2) + '\n', 'utf8');

  console.log(`Updated ${deploymentsFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});