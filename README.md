# HoneyTRACE (CRDT + Blockchain)

HoneyTRACE is a role-based traceability platform for honey procurement and quality assurance. It combines a Next.js frontend, MongoDB-backed APIs, and a local Hardhat chain for immutable workflow events.

## Tech Stack

- Next.js App Router + TypeScript
- Carbon Design System (`@carbon/react`)
- `next-intl` localization
- MongoDB (`mongoose`)
- Hardhat + Ethers
- Playwright + Vitest

## Project Structure

- `src/app/[locale]/dashboard/*`: role dashboards (farmer, warehouse, lab, officer, enterprise, consumer, secretary, admin)
- `src/app/api/*`: auth and domain APIs
- `src/components/*`: reusable UI components
- `scripts/localhost.sh`: local orchestration (`up`, `down`, `check`)
- `scripts/contracts/*`: deploy and ABI sync scripts
- `deployments/addresses.json`: contract address registry

## Prerequisites

- Node.js 20+
- npm 10+
- Docker (for local MongoDB)

## Environment Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env.local
```

3. Make sure these values exist in `.env.local`:

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/honeytrace
JWT_SECRET=change-me-local
LOCAL_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
DEPLOYER_PRIVATE_KEY=
BLOCKCHAIN_RELAYER_PRIVATE_KEY=
HONEYTRACE_CONTRACT_ADDRESS=
NEXT_PUBLIC_HONEYTRACE_CONTRACT=
NEXT_PUBLIC_MIN_BALANCE_ETH=0.002
```

Notes:
- `scripts/localhost.sh up` auto-fills local relayer key and contract address after deploy.
- `NEXT_PUBLIC_HONEYTRACE_CONTRACT` is updated by ABI sync/deploy workflows.

## Quick Start (Recommended)

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

## Manual Start (Step-by-Step)

Use this when you need more control over services:

1. Start MongoDB:

```bash
npm run db:up
```

2. Start chain:

```bash
npm run chain:node
```

3. In a new terminal, deploy contracts:

```bash
npm run chain:deploy:local
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

- `npm run dev`: start Next.js dev server
- `npm run build`: production build
- `npm run start`: run production server
- `npm run lint`: ESLint
- `npm run seed`: reset/seed local database
- `npm run chain:compile`: compile Solidity contracts
- `npm run chain:test`: run Hardhat tests
- `npm run chain:node`: local JSON-RPC chain
- `npm run chain:deploy:local`: deploy to localhost
- `npm run chain:deploy:base`: deploy to Base Sepolia
- `npm run chain:sync`: sync ABI/address artifacts into app
- `npm run db:up`: start MongoDB container
- `npm run db:down`: stop MongoDB container
- `npm run local:up`: boot full local development stack
- `npm run local:down`: stop local stack
- `npm run local:check`: chain tests + unit tests + build
- `npm run test:unit`: run Vitest suites
- `npm run test:e2e`: run Playwright tests
- `npm run test:all`: chain + unit + e2e test pipeline

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

## Multi-Role Flow

The E2E flow validates role transitions across:
- Farmer
- Warehouse
- Lab
- Officer
- Enterprise
- Consumer
- Secretary

## UX Notes

Transaction hash/ID copy controls are available in dashboard and traceability surfaces where hash-like values are shown (lab, officer, enterprise, onboarding receipt, certificate modal).

## Troubleshooting

- `401/400` from auth API: verify Mongo is up and seed completed.
- Contract write errors: verify `HONEYTRACE_CONTRACT_ADDRESS` and relayer key values in `.env.local`.
- Frontend cannot find contract: run `npm run chain:sync` and restart dev server.
- Port conflicts:
	- app uses `3000`
	- hardhat uses `8545`
	- mongo uses `27017`
- Playwright browser missing: run `npx playwright install chromium`.

## Production Build

```bash
npm run build
npm run start
```
