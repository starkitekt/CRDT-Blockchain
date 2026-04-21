# HoneyTRACE — Base Sepolia Blockchain Accounts & Faucets

## Deployed Contract

| Item              | Value                                                              |
|-------------------|--------------------------------------------------------------------|
| **Contract**      | `0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6`                      |
| **Network**       | Base Sepolia (Chain ID `84532`)                                    |
| **Explorer**      | https://sepolia.basescan.org/address/0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6 |
| **RPC Endpoint**  | `https://sepolia.base.org`                                         |

## Accounts Requiring ETH Funding

### Relay / Deployer Wallet

This is the **only account** that needs Base Sepolia ETH. It signs all
blockchain transactions on behalf of every user role via the backend relay
service (`blockchain-relay.ts`). Individual users do **not** need ETH.

| Item            | Value                                                              |
|-----------------|--------------------------------------------------------------------|
| **Address**     | `0x35D8E97C6f4dE835A34602887B1F03B732e59d5f`                      |
| **Role**        | Backend relay (signs batch-create, lab-publish, recall, certify)   |
| **Min Balance** | 0.002 ETH (the app warns below this threshold)                    |
| **Explorer**    | https://sepolia.basescan.org/address/0x35D8E97C6f4dE835A34602887B1F03B732e59d5f |

> **Current Balance**: ~0.0068 ETH (as of 2026-04-13)

### Cost Per Transaction

Each relay transaction (EIP-1559 on Base Sepolia) costs approximately
**0.000002–0.000010 ETH**, so 0.01 ETH is sufficient for ~1 000+ transactions.

## Base Sepolia Faucet Sources

| Faucet                         | URL                                         | Requirements               | Amount         |
|--------------------------------|---------------------------------------------|-----------------------------|----------------|
| **Alchemy Base Sepolia**       | https://www.alchemy.com/faucets/base-sepolia | Alchemy account (free)     | 0.1 ETH/day    |
| **QuickNode Base Sepolia**     | https://faucet.quicknode.com/base/sepolia    | QuickNode account (free)   | 0.1 ETH/day    |
| **Coinbase Base Sepolia**      | https://portal.cdp.coinbase.com/products/faucet | Coinbase Developer acct | 0.01 ETH/day   |
| **Superchain Faucet**          | https://app.optimism.io/faucet               | GitHub account (1+ yr old) | 0.05 ETH/day   |
| **LearnWeb3 Multi-chain**      | https://learnweb3.io/faucets/base_sepolia    | Free signup                | 0.01 ETH       |
| **Bware Labs**                 | https://bwarelabs.com/faucets/base-sepolia   | None                       | 0.025 ETH      |
| **Chainstack**                 | https://faucet.chainstack.com/base-sepolia-faucet | Chainstack account    | 0.05 ETH/day   |

### How to Fund

1. Copy the relay wallet address: `0x35D8E97C6f4dE835A34602887B1F03B732e59d5f`
2. Go to any faucet above and paste the address
3. Request ETH — it arrives in ~15 seconds on Base Sepolia
4. Verify at: https://sepolia.basescan.org/address/0x35D8E97C6f4dE835A34602887B1F03B732e59d5f

### Bridge from Sepolia L1 (Alternative)

If faucets are dry, you can bridge regular Sepolia ETH to Base Sepolia:

1. Get Sepolia ETH from https://sepoliafaucet.com or https://faucet.sepolia.dev
2. Bridge at https://testnets.superbridge.app/base-sepolia
3. Bridging takes ~5–10 minutes

## Environment Variables

These must be set in `.env.local` (development) or `.env.production.local` (production):

```env
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=<relay-wallet-private-key>
BLOCKCHAIN_RELAYER_PRIVATE_KEY=<relay-wallet-private-key>
HONEYTRACE_CONTRACT_ADDRESS=0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6
NEXT_PUBLIC_HONEYTRACE_CONTRACT=0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6
NEXT_PUBLIC_MIN_BALANCE_ETH=0.002
```

## Anchoring Pattern: Staged Batch IDs

`HoneyTraceRegistry.recordBatch` is **append-only per id** —
re-anchoring the same `batchId` with a different payload reverts as
`BATCH_HASH_MISMATCH`. Because every supply-chain milestone changes
the payload (warehouse intake, lab results, dispatch, etc.), the
backend writes each milestone under a deterministic *staged id*:

```
<batchId>#<status>     e.g. HT-20260417-0007#stored
                            HT-20260417-0007#certified
                            HT-20260417-0007#dispatched
```

- Each milestone is its own immutable on-chain receipt.
- All receipts trace back to the parent batch via the id prefix.
- Marketplace settlements use the listing's already-unique
  `MK-YYYYMMDD-NNN` id and need no suffix.

Implementation: `src/lib/services/batch.service.ts`
(`anchorBatchOnChain(stagedId, …)`).

## End-to-End On-Chain Verification

A standalone script sends three real Base Sepolia transactions
(harvest, staged storage, marketplace settlement) and prints explorer
URLs — useful as a smoke test after funding the relayer or rotating
the contract:

```bash
node scripts/verify-sepolia-anchor.cjs
```

Sample successful run (2026-04-17, contract
`0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6`):

| Step                              | Tx hash                                                              | Block      |
|-----------------------------------|----------------------------------------------------------------------|------------|
| Harvest (commissioning)           | `0x1b5fe6305395ead3365a03be862281b110cafeb09c471ec3584071f589857735` | 40 340 822 |
| Warehouse stored (staged id)      | `0x40f281b19e859fccdd2149e3899b6ba5567aa050c7db416d4fc01f86b393ad2a` | 40 340 823 |
| Marketplace auction settlement    | `0xc443796a61228204427bae337f016667a4c7602f808e0101a7c8564a69c3fba5` | 40 340 824 |

Total cost on L2: ≈ 0.000001 ETH for all three.

## Quick Health Check

```bash
# Check relay wallet balance
node -e "
const {ethers} = require('ethers');
const p = new ethers.JsonRpcProvider('https://sepolia.base.org');
p.getBalance('0x35D8E97C6f4dE835A34602887B1F03B732e59d5f')
 .then(b => console.log('Balance:', ethers.formatEther(b), 'ETH'));
"

# Verify contract is deployed
node -e "
const {ethers} = require('ethers');
const p = new ethers.JsonRpcProvider('https://sepolia.base.org');
p.getCode('0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6')
 .then(c => console.log('Contract code length:', c.length, c.length > 2 ? '✓ DEPLOYED' : '✗ NOT DEPLOYED'));
"
```
