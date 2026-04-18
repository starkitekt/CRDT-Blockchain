# HoneyTRACE (CRDT + Blockchain)

HoneyTRACE is a role-based traceability platform for honey procurement and quality assurance. It combines a Next.js frontend, MongoDB-backed APIs, and on-chain anchoring via a `HoneyTraceRegistry` smart contract deployed to **Base Sepolia** (with localhost Hardhat support for development).

## Tech Stack

- Next.js 16 App Router + TypeScript
- Carbon Design System (`@carbon/react`)
- `next-intl` localization
- MongoDB 7 (`mongoose`)
- Hardhat + Ethers v6
- Base Sepolia testnet (chain ID 84532)
- Playwright + Vitest

## Project Structure

- `src/app/[locale]/dashboard/*`: role dashboards (farmer, warehouse, lab, officer, enterprise, consumer, secretary, admin)
- `src/app/api/*`: auth and domain APIs
- `src/components/*`: reusable UI components
- `contracts/`: Solidity smart contracts (`HoneyTraceRegistry`, `HoneyTraceRoleControl`)
- `scripts/network.sh`: network switching and deployment (`local`, `base`, `deploy:local`, `deploy:base`, `deploy:both`, `status`)
- `scripts/localhost.sh`: local orchestration (`up`, `down`, `check`)
- `scripts/contracts/*`: deploy and ABI sync scripts
- `deployments/addresses.json`: contract address registry per network

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local MongoDB)
- A funded Base Sepolia wallet (for testnet deployment)

## Environment Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Configure `.env.local` for your target network:

**For Base Sepolia (default):**

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/honeytrace
JWT_SECRET=change-me-local
LOCAL_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_RPC_URL=https://sepolia.base.org
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
DEPLOYER_PRIVATE_KEY=<your-funded-base-sepolia-private-key>
BLOCKCHAIN_RELAYER_PRIVATE_KEY=<same-or-different-key>
HONEYTRACE_CONTRACT_ADDRESS=<filled-after-deploy>
NEXT_PUBLIC_HONEYTRACE_CONTRACT=<filled-after-deploy>
NEXT_PUBLIC_MIN_BALANCE_ETH=0.002
```

**For localhost (Hardhat):**

```bash
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Or use the network switching script to toggle between them (see below).

Notes:
- `scripts/localhost.sh up` auto-fills local relayer key and contract address after deploy.
- `scripts/network.sh` switches all env vars between localhost and Base Sepolia.
- `NEXT_PUBLIC_HONEYTRACE_CONTRACT` is updated by `npm run chain:sync` after deploy.

## Quick Start — Local Hardhat

Run the full local stack with one command:

```bash
npm run local:up
```

This command:
- starts MongoDB container `honeytrace-mongo`
- starts local Hardhat node on `127.0.0.1:8545`
- deploys contracts to localhost
- syncs ABI/address artifacts
- seeds local MongoDB users/data
- starts Next.js dev server

Open `http://localhost:3000`.

Stop local stack:

```bash
npm run local:down
```

## Quick Start — Base Sepolia

1. Fund your deployer wallet with Base Sepolia ETH (see [Accounts to Fund](#accounts-to-fund)).

2. Switch to Base Sepolia and deploy:

```bash
npm run net:deploy:base
```

3. Start MongoDB and seed:

```bash
npm run db:up
npm run seed
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`. Connect MetaMask to Base Sepolia (chain ID 84532).

## Network Switching

Switch between localhost (Hardhat) and Base Sepolia without manually editing `.env.local`:

```bash
npm run net:local          # switch to localhost
npm run net:base           # switch to Base Sepolia
npm run net:deploy:local   # deploy contract + switch to localhost
npm run net:deploy:base    # deploy contract + switch to Base Sepolia
npm run net:deploy:both    # deploy to both networks
npm run net:status         # show current network config
```

The script reads the deployer key from `.env.production.local` when switching to Base Sepolia, and uses the default Hardhat account #0 for localhost.

## Manual Start (Step-by-Step)

Use this when you need more control over services:

1. Start MongoDB:

```bash
npm run db:up
```

2. Start chain (skip if using Base Sepolia):

```bash
npm run chain:node
```

3. In a new terminal, deploy contracts:

```bash
npm run chain:deploy:local   # or chain:deploy:base for Base Sepolia
npm run chain:sync
```

4. Seed database:

```bash
npm run seed
```

5. Start app:

```bash
npm run dev
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Run production server |
| `npm run lint` | ESLint |
| `npm run seed` | Reset/seed local database |
| **Chain** | |
| `npm run chain:compile` | Compile Solidity contracts |
| `npm run chain:test` | Run Hardhat tests |
| `npm run chain:node` | Start local JSON-RPC chain |
| `npm run chain:deploy:local` | Deploy to localhost |
| `npm run chain:deploy:base` | Deploy to Base Sepolia |
| `npm run chain:sync` | Sync ABI/address artifacts into app |
| **Network** | |
| `npm run net:local` | Switch `.env.local` to localhost |
| `npm run net:base` | Switch `.env.local` to Base Sepolia |
| `npm run net:deploy:local` | Deploy + switch to localhost |
| `npm run net:deploy:base` | Deploy + switch to Base Sepolia |
| `npm run net:deploy:both` | Deploy to both networks |
| `npm run net:status` | Show current network config |
| **Infrastructure** | |
| `npm run db:up` | Start MongoDB container |
| `npm run db:down` | Stop MongoDB container |
| `npm run local:up` | Boot full local development stack |
| `npm run local:down` | Stop local stack |
| `npm run local:check` | Chain tests + unit tests + build |
| **Testing** | |
| `npm run test:unit` | Run Vitest suites |
| `npm run test:e2e` | Run Playwright tests |
| `npm run test:all` | Chain + unit + e2e test pipeline |

## Testing

### Unit + Build Safety

```bash
npm run local:check
```

### E2E (Playwright)

1. Ensure local app dependencies are running (Mongo, chain, deployed contract, seeded data, app server).
2. Install browsers once:

```bash
npx playwright install chromium
```

3. Run tests:

```bash
npm run test:e2e
```

## Seeded Accounts

After running `npm run seed`, these accounts are available (all passwords `password123` except admin):

| Email | Role | Password |
|-------|------|----------|
| `farmer@honeytrace.gov` | farmer | `password123` |
| `warehouse@honeytrace.gov` | warehouse | `password123` |
| `lab@honeytrace.gov` | lab | `password123` |
| `officer@honeytrace.gov` | officer | `password123` |
| `enterprise@honeytrace.gov` | enterprise | `password123` |
| `consumer@honeytrace.gov` | consumer | `password123` |
| `secretary@honeytrace.gov` | secretary | `password123` |
| `admin@honeytrace.gov` | admin | `Admin@password123` |

## Multi-Role Flow

The supply chain flow validates role transitions across:
- **Farmer** creates batches (harvest entry)
- **Warehouse** receives and stores batches
- **Lab** tests samples and publishes results
- **Officer** audits and can initiate recalls
- **Enterprise** tracks dispatched batches
- **Consumer** traces and verifies batch authenticity (public)
- **Secretary** manages user KYC approvals

On-chain anchoring happens automatically at key status transitions (`in_warehouse`, `certified`, `dispatched`, `recalled`) and when lab results are published.

### On-Chain Anchoring: Staged Batch IDs

`HoneyTraceRegistry.recordBatch` enforces immutability per `batchId`:

```solidity
require(existing.dataHash == dataHash, "BATCH_HASH_MISMATCH");
```

Because every supply-chain milestone produces a *different* payload (the
batch object grows: warehouse intake adds receipt metadata, lab adds
results, dispatch adds carrier info, etc.), re-anchoring under the same
`batchId` would always revert.

The backend therefore writes each milestone under a deterministic
**staged id** of the form:

```
<batchId>#<status>     e.g. HT-20260417-0007#stored
                            HT-20260417-0007#certified
                            HT-20260417-0007#dispatched
```

Properties:

- Each milestone is its own immutable on-chain receipt
- All receipts are deterministically attributable to the parent batch
  via the `id` prefix
- Marketplace settlements use the listing's already-unique
  `MK-YYYYMMDD-NNN` id and so don't need a suffix
- The DB still stores only the latest `onChainTxHash` /
  `onChainDataHash`; full per-stage history lives on chain

Implementation: see `BIZ_STEP` and `anchorBatchOnChain` calls in
`src/lib/services/batch.service.ts`.

### Verifying On-Chain Anchoring

A standalone script sends three real Base Sepolia transactions
(harvest, staged storage, marketplace settlement) and prints explorer
links — useful for sanity-checking a freshly-funded relayer:

```bash
node scripts/verify-sepolia-anchor.cjs
```

Requires `BLOCKCHAIN_RELAYER_PRIVATE_KEY`,
`HONEYTRACE_CONTRACT_ADDRESS`, and `BASE_SEPOLIA_RPC_URL` in
`.env.local`. Total cost on L2 is ≈ 0.000001 ETH.

## UX Notes

Transaction hash/ID copy controls are available in dashboard and traceability surfaces where hash-like values are shown (lab, officer, enterprise, onboarding receipt, certificate modal).

## Unified Design System v2

All role dashboards (farmer, warehouse, lab, officer, enterprise,
consumer, secretary, admin) and the marketplace render against a single
set of design tokens and component utilities defined in
`src/app/globals.css`. The Enterprise dashboard was the visual
reference; every other dashboard was migrated to inherit from the
shared utilities (legacy namespaced classes such as `wd-header`,
`ld-header`, `od-header`, `sd-header`, `wd-kpi-card`, `fd-kpi-card`,
`wd-modal-desc`, `fd-modal-desc` are now thin aliases).

Key utilities:

| Class | Purpose |
|-------|---------|
| `.page-header` (+ `.page-header-icon`, `.page-header-eyebrow`, `.page-header-actions`) | Canonical dashboard header: icon tile, eyebrow, `text-h3` title, subtitle, right-aligned actions, responsive wrap |
| `.kpi-card` (+ `.kpi-card--accent-error/warn/info/success`) | KPI tile: 14px radius, 1px border, neutral shadow, hover lift, optional 3px top accent |
| `.tint-blue/amber/green/red/purple/error/warn/info/success` | Semantic icon-tile background tints |
| `.cds-modal-desc` | Standard modal body description text (alias: `wd-modal-desc`, `fd-modal-desc`) |
| `.vloc*` (`.vloc`, `.vloc--centered`, `.vloc-status[data-state]`, `.vloc-coords`, `.vloc-btn`, `.vloc-btn--primary/--ghost/--block`, `.vloc-help`, `.vloc-help--error`, `.vloc-status-dot`) | "Verify location" card used by the farmer onboarding GPS step. Add `.vloc--centered` inside single-column wizards for the hero-centered variant (icon stacks above the title, status + coords + actions align centrally). |
| `.onboard-step-intro`, `.onboard-step-lede`, `.onboard-upload-zone`, `.onboard-success-icon` | Onboarding wizard typography + zones |
| `.text-gradient`, `.text-gradient-cool` | Honey-amber and cool brand title gradients |
| `.glass-panel`, `.glass-panel-translucent` | Solid surface vs translucent blurred surface (used by marketplace) |

Tokens (defined as CSS variables on `:root`):

- Radii: `--radius-sm/md/lg/xl/pill`
- Brand accents: `--accent-honey-50/300/500/700`, `--accent-blockchain`
- Spacing: `--spacing-1` … `--spacing-12`
- Typography: `text-h1/h2/h3/h4/body/caption/label`

Accessibility:

- All `.vloc-btn` controls meet WCAG 2.5.5 minimum 44×44 hit target
- `@media (prefers-reduced-motion: reduce)` disables KPI hover lifts,
  loading shimmers, and onboarding transitions
- GPS verification uses `role="region"` + `aria-live="polite"` so
  screen readers announce state changes; the in-card `.vloc-help`
  carries the error message instead of a duplicate `InlineNotification`

When adding a new dashboard or page, prefer the utilities above before
introducing namespaced CSS — namespaced classes should only exist as
aliases that point at the unified utilities.

### Marketplace UI

The marketplace (`/[locale]/dashboard/marketplace`) renders against the
same unified system:

- **Header** — `.page-header` + `.page-header-icon`/`-eyebrow`/`-title`/
  `-subtitle`/`-actions`, exactly matching every role dashboard.
- **KPI strip** — `.kpi-card` / `.kpi-card-body` / `-label` / `-value` /
  `-meta`, with `.kpi-card--accent-honey` on "Live auctions" to flag the
  primary CTA.
- **Listing card** (`.listing-card` in `marketplace.module.css`):
  - solid white surface, `border-radius: 14px`, `1.125rem 1.25rem 1rem`
    padding, subtle hover lift (`translateY(-1px)` + border darken);
  - 3px top gradient bar (amber for live, emerald for settled, slate for
    unsold / cancelled);
  - `.price-display` — monospace 1.375rem → 1.5rem at ≥1280px, tabular
    numerals, wraps gracefully on very large values;
  - `.countdown` — 1.25rem monospace for live timers only, reserves the
    red-pulse `.ending` state exclusively for the final 60 seconds;
  - `.closed-date` — 0.9375rem body weight for settled / unsold /
    cancelled dates, so the date never competes visually with the price
    column.
- **Listing card status never shows the `.ending` (red pulse) animation
  on non-live listings** — the previous behaviour was a visual bug that
  made settled auctions appear alarming.
- Grid gaps use `gap-spacing-md` (24px) across KPI strip and listings
  grid so the marketplace matches the density of the other dashboards
  exactly.

## Smart Contract

`HoneyTraceRegistry.sol` extends `HoneyTraceRoleControl.sol` (RBAC with ADMIN, RECORDER, OFFICER roles).

Key functions:
- `recordBatch(batchId, dataHash, bizStep, location)` — anchor batch data on-chain
- `linkLabResult(batchId, labHash)` — anchor lab results
- `initRecall(batchId, tier, reason)` — initiate a recall
- `getBatch(batchId)` / `getBatchDetails(batchId)` — read on-chain records
- `isRecalled(batchId)` — check recall status

The deployer automatically receives all roles (ADMIN, RECORDER, OFFICER). If using a separate relayer key, grant roles via `grantRole(address, roleId)`.

### Current Deployments

| Network | Contract Address | Chain ID |
|---------|-----------------|----------|
| Base Sepolia | `0x2D85452bed2DE0613E09a8CC2d9C0e4beC26D8b6` | 84532 |
| Localhost | varies per deploy | 31337 |

Run `npm run net:status` to see current deployment addresses.

## Accounts to Fund

For Base Sepolia deployment, fund these wallets with test ETH:

1. **Deployer** (`DEPLOYER_PRIVATE_KEY`) — deploys the contract, becomes owner with all roles. Needs ~0.01 ETH.
2. **Relayer** (`BLOCKCHAIN_RELAYER_PRIVATE_KEY`) — server-side account that anchors batches, lab results, and recalls. Needs ~0.05+ ETH for ongoing gas. Can be the same key as deployer.
3. **MetaMask wallets** (optional) — browser wallets that interact with the contract directly. The app warns when balance drops below `NEXT_PUBLIC_MIN_BALANCE_ETH` (default 0.002 ETH).

Faucets: [Alchemy Base Sepolia Faucet](https://www.alchemy.com/faucets/base-sepolia), [Superchain Faucet](https://app.optimism.io/faucet).

## Troubleshooting

- `401/400` from auth API: verify Mongo is up and seed completed.
- Contract write errors: verify `HONEYTRACE_CONTRACT_ADDRESS` and relayer key values in `.env.local`. Run `npm run net:status` to check.
- Frontend cannot find contract: run `npm run chain:sync` and restart dev server.
- RPC timeouts: the public `https://sepolia.base.org` can be rate-limited. Use an Alchemy or Infura free-tier RPC for reliability.
- Port conflicts:
	- app uses `3000`
	- hardhat uses `8545`
	- mongo uses `27017`
- Playwright browser missing: run `npx playwright install chromium`.
- Wrong network: run `npm run net:status` to see which network `.env.local` is configured for, then `npm run net:local` or `npm run net:base` to switch.

## Production Build

```bash
npm run build
npm run start
```

## Host Everything (Local to Production)

This project supports a scripted promotion path for:

- localhost chain -> Base Sepolia
- local backend (Next.js API routes) -> online on Vercel
- local frontend -> Vercel production

### 1) Pre-Deployment Checklist

Create and populate production deployment values:

```bash
cp .env.production.example .env.production.local
```

Set all required values in `.env.production.local`:

- `BASE_SEPOLIA_RPC_URL`
- `DEPLOYER_PRIVATE_KEY`
- `BLOCKCHAIN_RELAYER_PRIVATE_KEY`
- `MONGODB_URI_PROD`
- `JWT_SECRET_PROD`

Optional:

- `NEXT_PUBLIC_MIN_BALANCE_ETH`
- `PLAYWRIGHT_BASE_URL` (for hosted E2E)
- `VERCEL_TOKEN` (for non-interactive CI deploys)

Load variables in your shell:

```bash
set -a
source .env.production.local
set +a
```

If you use fish shell:

```fish
while read -l line
	if test -z "$line"
		continue
	end
	set parts (string split -m1 '=' "$line")
	if test (count $parts) -ge 2
		set -gx $parts[1] $parts[2]
	end
end < .env.production.local
```

### 2) One-Command Promotion

Dry run first:

```bash
npm run prod:push:dry
```

Promote to production:

```bash
npm run prod:push
```

What this script does:

1. Runs chain and unit checks (unless `--skip-checks` is provided)
2. Compiles contracts
3. Deploys `HoneyTraceRegistry` to Base Sepolia
4. Syncs ABI and Base Sepolia contract address
5. Pushes backend/frontend env vars to Vercel production
6. Triggers `vercel deploy --prod`

Script location:

- `scripts/push-local-to-prod.sh`

### 3) Accounts to Fund in Advance

Fund these wallet addresses on Base Sepolia with test ETH:

1. Deployer account (`DEPLOYER_PRIVATE_KEY`): contract deployment gas
2. Relayer account (`BLOCKCHAIN_RELAYER_PRIVATE_KEY`): runtime write gas from backend API

If deployer and relayer are the same key, one funded account is enough.

### 4) APIs/Services You Must Provide

1. Base Sepolia RPC endpoint:
	Examples: Alchemy, Infura, QuickNode, Ankr, or another reliable RPC provider
2. Production MongoDB connection string:
	Recommended: MongoDB Atlas URI for `MONGODB_URI_PROD`
	Ensure your deploy region and seed/test runner IP are allowed in Atlas Network Access.
3. Vercel project access:
	`npx vercel login` locally, or `VERCEL_TOKEN` for CI

### 5) Vercel Requirements

Before the first deploy, link the repository once:

```bash
npx vercel link
```

Then run `npm run prod:push`.

### 6) Hosted End-to-End Validation

After production deploy:

1. Set `PLAYWRIGHT_BASE_URL` to your live URL
2. Run:

```bash
npm run test:e2e
```

This validates frontend role flows against hosted backend/frontend.
