/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function copyAbi() {
  const artifactPath = path.join(
    process.cwd(),
    'artifacts',
    'contracts',
    'HoneyTraceRegistry.sol',
    'HoneyTraceRegistry.json'
  );
  const outputPath = path.join(process.cwd(), 'src', 'lib', 'abis', 'HoneyTraceRegistry.json');

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Missing artifact at ${artifactPath}. Run contract compile first.`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(artifact.abi, null, 2) + '\n', 'utf8');
  console.log(`Synced ABI to ${outputPath}`);
}

function syncLocalAddress() {
  const addressesPath = path.join(process.cwd(), 'deployments', 'addresses.json');
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(addressesPath)) {
    console.log(`No ${addressesPath} found, skipping env sync.`);
    return;
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  const localAddress =
    addresses.localhost?.HoneyTraceRegistry ||
    addresses.hardhat?.HoneyTraceRegistry ||
    addresses.baseSepolia?.HoneyTraceRegistry;

  if (!localAddress) {
    console.log('No deployed HoneyTraceRegistry address found in deployments file.');
    return;
  }

  const key = 'NEXT_PUBLIC_HONEYTRACE_CONTRACT';
  const line = `${key}=${localAddress}`;
  const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';

  if (!existing.includes(`${key}=`)) {
    fs.writeFileSync(envPath, `${existing.trim()}\n${line}\n`.trimStart(), 'utf8');
    console.log(`Added ${key} to .env.local`);
    return;
  }

  const updated = existing.replace(new RegExp(`^${key}=.*$`, 'm'), line);
  fs.writeFileSync(envPath, updated, 'utf8');
  console.log(`Updated ${key} in .env.local`);
}

copyAbi();
syncLocalAddress();