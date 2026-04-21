# HoneyTRACE Technical Specifications

## 1. System Architecture overview
HoneyTRACE is a role-based supply chain and traceability platform built for honey procurement and quality assurance.
*   **Web Framework:** Next.js 16 (App Router)
*   **Programming Language:** TypeScript
*   **Database:** MongoDB 7 (via `mongoose` ORM)
*   **Blockchain Integration:** Solidity 0.8.24 smart contracts deployed on Base Sepolia Testnet (Chain ID: 84532) and local Hardhat nodes.
*   **Authentication & Security:** JWT (`jose`, `jsonwebtoken`), Password Hashing (`bcryptjs`), Role-Based Access Control (RBAC).

## 2. Directory Structure & Module Breakdown
*   **`src/app/[locale]/dashboard/*`**: Role-specific UI dashboards handling tailored logic for: `farmer`, `warehouse`, `lab`, `officer`, `enterprise`, `consumer`, `secretary`, and `admin`.
*   **`src/app/[locale]/track/` & `src/app/[locale]/trace/[batchId]/`**: Public, unauthenticated surfaces for tracking batches via QR code or ID lookup.
*   **`src/app/api/*`**: Next.js API Routes processing domain logic and interactions with MongoDB.
*   **`src/lib/*`**: Core platform libraries including service layers (`batch.service.ts`, `lab.service.ts`, `recall.service.ts`), schemas (`zod`), the database connection configuration, and the `blockchain-relay.ts` layer.
*   **`contracts/`**: Solidity source code for registry and access control (`HoneyTraceRegistry.sol`, `HoneyTraceRoleControl.sol`).
*   **`scripts/`**: Bash scripts and TypeScript nodes mapping orchestration (`network.sh`, `localhost.sh`) and database seeding protocols (`seed.ts`).

## 3. Backend Stack & API Modules
The backend serves as a standalone REST-like API through Next.js Route Handlers.
*   **Auth & KYC (`/api/auth`, `/api/users`, `/api/profile`)**:
    *   Cookie and Bearer token management. Requires KYC gating enforced for non-exempt profiles.
    *   Manages user onboarding routing separating profile collections per role type.
*   **Batch & Warehouse Logistics (`/api/batches`, `/api/warehouses`)**:
    *   Creates multi-part data payload representing a honey batch, capturing GPS locations and validation limits.
    *   Computes and relays warehouse capacity assignments limiting routing to functional warehouses.
*   **Testing & Quality Assurance (`/api/lab`, `/api/recalls`)**:
    *   Enforces Codex validation protocols allowing labs to ingest test metrics and assign statuses (`in_testing`, etc.).
    *   Administers recall transitions moving system batches into `recalled` stages.
*   **Notifications (`/api/notifications`)**:
    *   Persistent polling endpoints querying and mutating database records for event updates mapping supply chain state changes (e.g. tracking `stored` transition).
*   **Traceability Endpoint (`/api/trace/[batchId]`)**:
    *   Aggregates timeline, timeline hashes, officer data and queries to local block state verifying database hashes against on-chain records.

## 4. Blockchain & Smart Contracts Engine
Contracts are anchored heavily around access control and hash verification. Uses `ethers` v6 internally.
*   **Environment**: Built and managed over Hardhat. Configurations exist dynamically for Local RPC and Base Sepolia.
*   **Roles Control (`HoneyTraceRoleControl`)**: Implements strict clearance variables including `ADMIN`, `RECORDER`, and `OFFICER`.
*   **Event Anchors (`HoneyTraceRegistry`)**: Base endpoints relay executing the functions:
    *   `recordBatch(batchId, dataHash, bizStep, location)`: Emits state events for lifecycle progressions.
    *   `linkLabResult(batchId, labHash)`: Commits lab metrics uniquely to the contract.
    *   `initRecall(batchId, tier, reason)`: Initiates blockchain-immutable recall processes globally.

## 5. Frontend Technologies & Component Layer
*   **Styling**: Built on the Carbon Design System (`@carbon/react`, `@carbon/icons-react`), styled further using Tailwind CSS / PostCSS, and raw Sass implementation.
*   **Mapping UI**: Uses `leaflet` & `react-leaflet` targeting spatial and location visualization associated with farm patches.
*   **QR Engines**: Integrates `qrcode.react` (creation) and `html5-qrcode` (web-scanning) supporting scanner interfaces to track physical batch transitions.
*   **Localization (i18n)**: Employs `next-intl` wrapping core elements to allow localized delivery variants across client portals.

## 6. Testing & CI validation
*   **E2E Validation**: `playwright` scripts deployed mimicking multi-role transitions (from farmer harvest to office verification).
*   **Unit Tests**: Standard logic verification using `vitest`.
*   **Chain Test Pipelines**: Chai matchers (`@nomicfoundation/hardhat-chai-matchers`) implemented testing internal Registry access control checks before deployment execution.
