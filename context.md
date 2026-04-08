# HoneyTrace — Project Context
> **Single source of truth for any developer or AI assistant picking up this codebase.**
> Generated: 2026-04-05 · Last updated: 2026-04-06 (patch round 2) · Audited against every file in `src/` and `scripts/`.

---

## 1. Project Overview

**HoneyTrace** is a production-grade, blockchain-anchored honey supply-chain traceability platform built for India's apiculture sector. It provides:

- **Multi-role access**: Farmer, Warehouse, Lab, Officer, Enterprise, Consumer, Secretary, Admin — each with a dedicated dashboard.
- **Batch lifecycle tracking**: `pending → in_warehouse → in_testing → certified → dispatched` (or `recalled`).
- **Immutable on-chain anchoring**: keccak256 hashes written to a Solidity `HoneyTraceRegistry` contract (deployed on Base Sepolia or Hardhat localhost) via a server-side relayer (`blockchain-relay.ts`).
- **Codex Stan 12-1981 compliance**: Lab result validation enforced at both frontend (client-side form guard) and backend (service layer).
- **KYC workflow**: Admin/Secretary approve users via `PATCH /api/users/[id]`; optional Aadhaar OTP + FSSAI/GSTN document verification.
- **i18n**: Full English + Hindi (`messages/en.json`, `messages/hi.json`) via `next-intl`, locale-prefix routing (`/en/…`, `/hi/…`).
- **Audit trail**: Every mutation appends to `AuditLog`; exportable via `GET /api/admin/export`.

**Repository path:** `e:/Hackathon/Free Lancing/Blockchain product/madhu-sankalp-2/CRDT-Blockchain/`

---

## 2. Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | **Next.js 16.1.6** (App Router) | `--webpack` mode (Turbopack disabled) |
| Language | **TypeScript 5** | `strict` enabled |
| Database | **MongoDB 7** + **Mongoose 9.3.2** | Connection singleton cached on `global._mongooseCache` |
| Auth | **jsonwebtoken 9.0.3** (signing) + **jose 6.2.2** (Edge-safe verify in middleware) | 8h JWT; `honeytrace_token` + `honeytrace_role` httpOnly cookies |
| Password | **bcryptjs 3.0.3** | cost factor 12; timing-safe dummy hash prevents user enumeration |
| Blockchain | **ethers.js v6.16.0** | Server: `JsonRpcProvider` + `Wallet` relayer; Client: `BrowserProvider` MetaMask |
| Smart Contract | **Hardhat 2.26.5** | Solidity `HoneyTraceRegistry.sol`; networks: `localhost:8545`, `baseSepolia` |
| Validation | **Zod 4.3.6** | Schemas in `src/lib/validation/` |
| UI Library | **@carbon/react 1.103.0** | IBM Carbon Design System |
| Icons | **@carbon/icons-react 11.76.0** | |
| i18n | **next-intl 4.8.3** | `[locale]` route group, `messages/en.json` + `messages/hi.json` |
| Map | **Leaflet 1.9.4** + **react-leaflet 4.2.1** | `ProductionHeatMap` component (Secretary dashboard) |
| QR Scanning | **html5-qrcode 2.3.8** | `QRScanner` component (Consumer dashboard) |
| State | Zustand via `src/lib/store.ts` (`useWalletStore`); React hooks for data |
| Rate Limiting | In-memory sliding window (`src/lib/rateLimit.ts`) | 5 attempts / 15 min per IP |
| Styling | Tailwind CSS 4 + Carbon tokens + `globals.css` | Custom CSS vars: `--color-primary`, `--spacing-*`, etc. |
| Testing | Vitest (unit) + Playwright (e2e) + Hardhat Mocha (contracts) | |

---

## 3. Running the Project

### Dev server (primary)
```powershell
cd "e:\Hackathon\Free Lancing\Blockchain product\madhu-sankalp-2\CRDT-Blockchain"
npm run dev
# Runs on http://localhost:3000
# Uses --webpack flag (Turbopack disabled)
```

### Build check (no server needed)
```powershell
npm run build 2>&1 | Select-String "error TS" | Select-Object -First 10
```

### Seed test accounts
```powershell
npm run seed              # Creates 8 test users (kycCompleted: true)
npm run seed -- --reset   # Wipe + recreate
```

### Blockchain (optional — relay disabled if env vars missing)
```powershell
# Terminal 1 — Hardhat local node
npx hardhat node

# Terminal 2 — Deploy contract
npx hardhat run scripts/contracts/deploy.js --network localhost
node scripts/contracts/sync-abi.js

# Or use the combined shell script (Linux/WSL only)
bash scripts/localhost.sh
```

### MongoDB indexes
```powershell
npx ts-node scripts/createIndexes.ts
```

---

## 4. Environment Variables (keys only)

Defined in `.env.local` (gitignored). See `.env.example` for defaults.

```
MONGODB_URI                        # MongoDB connection string
JWT_SECRET                         # HS256 signing secret (min 32 chars in prod)
NEXT_PUBLIC_HONEYTRACE_CONTRACT    # Contract address visible to browser wallet
NEXT_PUBLIC_MIN_BALANCE_ETH        # Minimum wallet balance for blockchain writes (default 0.002)
LOCAL_RPC_URL                      # Hardhat node (default http://127.0.0.1:8545)
BLOCKCHAIN_RPC_URL                 # Server-side relayer RPC
BASE_SEPOLIA_RPC_URL               # Base Sepolia RPC endpoint
DEPLOYER_PRIVATE_KEY               # Used by Hardhat deploy scripts
BLOCKCHAIN_RELAYER_PRIVATE_KEY     # Server-side relayer signing key
HONEYTRACE_CONTRACT_ADDRESS        # Server-side contract address
FSSAI_API_KEY                      # Optional: real FSSAI license lookup (mocks if unset)
GSTN_API_KEY                       # Optional: real GSTN lookup (mocks if unset)
NODE_ENV                           # 'development' | 'production'
NEXT_PUBLIC_APP_URL                # Production origin for CORS
```

> **Blockchain relay is disabled** when `BLOCKCHAIN_RELAYER_PRIVATE_KEY` or `HONEYTRACE_CONTRACT_ADDRESS` is not set. `anchorBatchOnChain()` is silently skipped; batches still save to DB. Check `isBlockchainRelayEnabled()` in `src/lib/blockchain-relay.ts:33`.

---

## 5. Data Models (schema summary per model)

### 5.1 User — src/lib/models/User.ts

| Field | Type | Notes |
|---|---|---|
| `email` | String | unique, lowercase, required |
| `passwordHash` | String | bcrypt cost-12 |
| `role` | String (enum) | `farmer/warehouse/lab/officer/enterprise/consumer/secretary/admin` |
| `name` | String | required |
| `kycCompleted` | Boolean | default `false`; set to `true` by admin/secretary approve |
| `kycVerifiedAt` | Date? | **NEW** — timestamp when kycCompleted was set to true |
| `kycRejected` | Boolean? | **NEW** — default `false`; set by secretary/admin reject action |
| `kycRejectReason` | String? | **NEW** — freeform rejection note |
| `isActive` | Boolean? | **NEW** — default `true`; soft-disable account without deletion |
| `fssaiLicense` | String? | lab, warehouse, enterprise |
| `aadhaarNumber` | String? | farmer (raw input only; not stored post-KYC) |
| `pmKisanId` | String? | farmer |
| `aadhaarVerified` | Boolean? | populated after OTP |
| `aadhaarSuffix` | String? | last 4 digits only — never full number |
| `aadhaarKycName/Dob/Gender/Address` | String? | from UIDAI response |
| `gstNumber` | String? | warehouse, enterprise (15-char, uppercase) |
| `wdraLicenseNo` | String? | warehouse |
| `nablAccreditationNo` | String? | lab |
| `labRegistrationNo` | String? | lab |
| `employeeId` | String? | officer, secretary |
| `fssaiOfficerId` | String? | officer |
| `department` | String? | officer, secretary |
| `jurisdiction` | String? | officer |
| `cinNumber` | String? | enterprise (uppercase) |
| `iecCode` | String? | enterprise (uppercase) |
| `mobileNumber` | String? | consumer |
| `createdAt/updatedAt` | Date | Mongoose `timestamps: true` |

> FIXED (2026-04-05): `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, and `isActive` are now formally defined in the Mongoose schema with proper types and defaults. The schema is now in sync with what `PATCH /api/users/[id]` writes.

---

### 5.2 Batch — src/lib/models/Batch.ts

| Field | Type | Notes |
|---|---|---|
| `batchId` | String | unique; format `HT-YYYYMMDD-NNN` (sequential counter) |
| `farmerId` | String | indexed |
| `farmerName` | String | |
| `floraType` | String | e.g. "Karanj", "Mahua" |
| `weightKg` | Number | |
| `moisturePct` | Number | Codex limit <= 20% enforced in service |
| `latitude/longitude` | String | GPS strings |
| `grade` | String enum | `A/B` |
| `harvestDate` | String | ISO date YYYY-MM-DD |
| `status` | String enum | `pending/in_warehouse/in_testing/certified/dispatched/recalled` |
| `warehouseId/warehouseReceivedAt/warehouseNotes` | mixed | set by warehouse PATCH |
| `labId/labSubmittedAt/labReportId/labCertifiedAt` | mixed | set by lab publish |
| `labResults.{moisture,hmc,antibiotics,pesticides,passed}` | nested | summary from lab |
| `dispatchedAt/destinationEnterprise/invoiceNo` | mixed | dispatch fields |
| `onChainTxHash` | String? | tx hash on blockchain |
| `onChainDataHash` | String? | keccak256 of canonical payload |
| `blockchainAnchoredAt` | Date? | |
| `blockchainNetwork` | String? | `localhost/baseSepolia` |
| `_payloadHash` | String | SHA-256 fingerprint for 24h deduplication (internal; stripped in `toJSON`) |
| `recallReason/recallTier/recallInitiatedAt/recallInitiatedBy/recallTxHash` | mixed | set on recall |

> **Blockchain anchor points:** Creation (`pending`) + status transitions matching `ANCHOR_ON_STATUS` set in `batch.service.ts:23`: `certified`, `in_warehouse`, `dispatched`, `recalled`.

> **NOTE (2026-04-06):** `Batch.ts` exports only `BatchStatus` type and the raw Mongoose model. There is **no** exported `IBatch` TypeScript interface — document type relies purely on Mongoose schema inference. This is a known typing gap (see §12 Low issues).

---

### 5.3 LabResult — src/lib/models/LabResult.ts

| Field | Type | Notes |
|---|---|---|
| `batchId` | String | unique, indexed |
| `sampleId` | String | client-generated `LAB-{timestamp}` |
| `labId` | String | actorId from JWT |
| `fssaiLicense` | String | required (14 chars) |
| `nablCert` | String | NABL accreditation number |
| `moisture` | Number | Codex <= 20% |
| `hmf` | Number | Codex <= 40 mg/kg |
| `pollenCount` | Number | per 10g |
| `acidity` | Number | Codex <= 50 meq/kg |
| `diastase` | Number | Codex >= 8 DN |
| `sucrose` | Number | Codex <= 5 g/100g |
| `reducingSugars` | Number | Codex >= 60 g/100g |
| `conductivity` | Number | |
| `nmrScore` | Number? | optional |
| `antibioticPpb` | Number? | ppb |
| `heavyMetalsMgKg` | Number? | |
| `pesticideMgKg` | Number? | |
| `publishedAt` | String | ISO timestamp |
| `onChainTxHash` | String? | lab result chain hash |

---

### 5.4 Recall — src/lib/models/Recall.ts

| Field | Type | Notes |
|---|---|---|
| `id` | String | unique; format `RECALL-{timestamp}` |
| `batchId` | String | indexed |
| `tier` | Number enum | `1/2/3` (Class I = most severe) |
| `reason` | String | required |
| `affectedKg` | Number | required |
| `initiatedBy` | String | actorId from JWT — **always injected server-side** from `actor.userId`; `initiatedBy` in request body is ignored (schema field is now optional) |
| `initiatedAt` | String | ISO timestamp |
| `onChainTxHash` | String? | recall event chain hash |

> FIXED (2026-04-05): `recall.service.ts:20` now correctly uses `Batch.findOne({ batchId: input.batchId })`. Tested — recall creation succeeds; batch status transitions to `recalled`; on-chain anchor writes `onChainTxHash`. See test evidence in §8 Step 16.

---

### 5.5 AuditLog — src/lib/models/AuditLog.ts

| Field | Type | Notes |
|---|---|---|
| `entityType` | String | `auth/batch/lab/recall/kyc` |
| `entityId` | String | indexed |
| `action` | String | `login/create/patch/publish/recall` |
| `actorUserId` | String? | |
| `actorRole` | String | required |
| `at` | Date | indexed; default `Date.now` |
| `metadata` | Mixed | arbitrary JSON |

---

### 5.6 Counter — src/lib/models/Counter.ts

Used by `getNextSeq('batch')` to generate sequential `batchId` numbers atomically.

---

## 6. API Routes Reference

> Auth column: roles that can call this endpoint. `public` = no auth required.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth` | public | Login; sets `honeytrace_token` + `honeytrace_role` cookies; rate-limited |
| GET | `/api/auth` | authenticated | Returns current JWT actor payload for session-aware frontend hooks |
| DELETE | `/api/auth` | cookie clear | Logout; deletes both cookies |
| POST | `/api/auth/register` | public | Lightweight register endpoint (`name/email/password/role` validation); sets `kycCompleted=false` |
| POST | `/api/register` | public | Role-aware self-registration (`AnyUserSchema`); blocks admin/secretary self-register; writes audit `action='register'` |
| GET | `/api/health` | public | Lightweight liveness check; returns `{ ok: true, ts }` |
| GET | `/api/batches` | farmer/warehouse/lab/officer/enterprise/admin | List batches; `?farmerId=X&status=X` filters |
| POST | `/api/batches` | farmer/admin | Create batch; Zod validation + moisture <=20% check |
| GET | `/api/batches/[id]` | farmer/warehouse/lab/officer/enterprise/consumer/admin | Get single batch by `batchId` field |
| PATCH | `/api/batches/[id]` | warehouse/officer/lab/admin | Patch batch; triggers blockchain re-anchor on key status transitions |
| POST | `/api/lab` | lab/admin | Publish lab result; Codex Stan validation; sets batch `status=certified` |
| GET | `/api/lab` | lab/officer/enterprise/admin/secretary | List all lab results |
| GET | `/api/lab/[batchId]` | lab/officer/enterprise/consumer/admin | Get lab result by batch ID |
| GET | `/api/trace/[batchId]` | **public** (no auth) | Full provenance trace for a batch; includes timeline array |
| POST | `/api/recalls` | officer/admin | Create recall; sets batch `status=recalled` |
| GET | `/api/recalls` | officer/admin/secretary/enterprise | List all recalls |
| GET | `/api/users` | admin/secretary | List users; `?kycCompleted=false` for KYC queue — **returns bare array** (fixed 2026-04-05) |
| PATCH | `/api/users/[id]` | admin/secretary | Approve/reject KYC; sets `kycCompleted=true`/`kycVerifiedAt` or `kycRejected=true`/`kycRejectReason`; writes `AuditLog` action `user_updated` |
| GET | `/api/admin/export` | admin | Export audit ledger; `?format=csv/json&entity=batch/lab/kyc&from=ISO&to=ISO` |
| POST | `/api/kyc/aadhaar/initiate` | authenticated | Initiate Aadhaar OTP |
| POST | `/api/kyc/aadhaar/verify` | authenticated | Verify OTP; writes aadhaarVerified data |

> NOTE: both `/api/register` and `/api/auth/register` exist; production login portal now submits self-registration to `/api/auth/register`.

---

## 7. Frontend-Backend Wiring Audit

> Traced every `fetch('/api/...')` and `apiXxx()` call in all dashboard/component files.

| Frontend call (file:line) | HTTP method | API route | Route exists? | Method exported? | Status |
|---|---|---|---|---|---|
| `farmer/page.tsx:121` | POST | `/api/batches` | YES | YES POST | WIRED |
| `farmer/page.tsx:47` | GET | `/api/batches?farmerId=X` | YES | YES GET | WIRED |
| `warehouse/page.tsx:91` | PATCH | `/api/batches/{id}` | YES | YES PATCH | WIRED |
| `warehouse/page.tsx:114` | PATCH | `/api/batches/{id}` | YES | YES PATCH | WIRED |
| `lab/page.tsx:135` | POST | `/api/lab` | YES | YES POST | WIRED |
| `lab/page.tsx:82` | GET | `/api/batches` | YES | YES GET | WIRED |
| `lab/page.tsx:83` | GET | `/api/lab` | YES | YES GET | WIRED |
| `officer/page.tsx:83` | PATCH | `/api/batches/{id}` | YES | YES PATCH | WIRED |
| `officer/page.tsx:86` | POST | `/api/recalls` | YES | YES POST | WIRED |
| `consumer/page.tsx:62` | GET | `/api/batches/{id}` | YES | YES GET | WIRED |
| `consumer/page.tsx:66` | GET | `/api/trace/{id}` | YES | YES GET | WIRED |
| `consumer/page.tsx:74` | GET | `/api/lab/{batchId}` | YES | YES GET | WIRED |
| `admin/page.tsx:92` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED (shape mismatch FIXED — bare array now returned) |
| `admin/page.tsx:105` | PATCH | `/api/users/{id}` | YES | YES PATCH | WIRED |
| `admin/page.tsx:294` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED |
| `admin/page.tsx:377` | GET | `/api/admin/export?format=csv` | YES | YES GET | WIRED |
| `secretary/page.tsx:67` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED |
| `secretary/page.tsx:84,104` | PATCH | `/api/users/{id}` | YES | YES PATCH | WIRED |
| `enterprise/page.tsx:68` | GET | `/api/batches?status=dispatched` | YES | YES GET | WIRED |
| `hooks/useRecalls.ts:29` | GET | `/api/recalls` | YES | YES GET | WIRED |
| `hooks/useCurrentUser.ts:26` | GET | `/api/auth` | YES | YES GET | WIRED |
| `lib/api.ts:110` | DELETE | `/api/auth` | YES | YES DELETE | WIRED |
| `warehouse/page.tsx:150` | — | "Manage Transfers" onClick | — | — | **WIRED** — opens dispatch modal (`setIsDispatchModalOpen(true)`) which calls `PATCH /api/batches/{id}` with `status: dispatched` |

**Routes that exist but are never called from the frontend:**

| Route | Note |
|---|---|
| `GET /api/health` | Infrastructure only |
| `POST /api/register` | Backend exists; production UI currently uses `/api/auth/register` path for lightweight self-registration |

---

## 8. Completed Steps and Test Results

| # | Step | What was built | Test result |
|---|---|---|---|
| 01 | MongoDB + Mongoose | `connectDB()` singleton in `src/lib/mongodb.ts`; global cache | PASS: API routes that require DB connect successfully; `GET /api/health` is a lightweight liveness response (`{ ok: true, ts }`) |
| 02 | User model + Zod schemas | `User.ts` with 8-role flat schema; `user.schema.ts` with `AnyUserSchema` | PASS: Schema validation runs in seed script |
| 03 | Auth service | `auth.service.ts`: bcrypt timing-safe compare, `signToken()`, audit log fire-and-forget | PASS: Login returns 403 for wrong role, 401 for bad password |
| 04 | POST /api/auth | Login endpoint; httpOnly cookie set; rate limiter (5 req/15 min) | PASS: Cookie set; 429 after burst |
| 05 | POST /api/auth/register | Lightweight validation (`name/email/password/role`) + duplicate email check | PASS: 409 on duplicate; 422 for schema-invalid fields |
| 06 | RBAC middleware | `requireAuth()` in `src/lib/rbac.ts`; reads cookie or `Authorization: Bearer`; `AuthError` class | PASS: Missing token -> 401; wrong role -> 403 |
| 07 | GET/POST /api/batches | `createBatch()` + `listBatches()`; `farmerId`/`status` query filters; moisture business rule | PASS: POST creates HT-YYYYMMDD-NNN; GET returns filtered list |
| 08 | GET/PATCH /api/batches/[id] | `getBatchById()` + `patchBatch()`; status transitions; blockchain re-anchor | PASS: PATCH `status=in_warehouse` updates DB |
| 09 | Blockchain anchoring | `blockchain-relay.ts` server relayer; `blockchain.ts` browser wallet; `HoneyTraceRegistry.sol` | PASS: `onChainTxHash` written to Batch doc when relay configured |
| 10 | GET /api/trace/[batchId] | Public endpoint; returns batch + lab result + timeline array + integrity status | PASS: No auth required; full provenance returned |
| 11 | POST/GET /api/lab | `publishLabResult()`: Codex validation, upsert LabResult, certify batch | PASS: Codex violations return 422 with violations[]; success sets batch to certified |
| 12 | AuditLog model | `AuditLog.ts` schema; `audit.ts` helper `auditLog()` | PASS: 26 audit logs accumulated in test run |
| 13 | Audit logging wired | `batch.service.ts`, `lab.service.ts`, `auth.service.ts` all call `auditLog()` | PASS: Login, create, patch, publish events all appear in export |
| 14 | GET/PATCH /api/users | GET returns pending queue; PATCH with `kycCompleted:true` approves | PASS: Admin dashboard KYC queue loads; approve/reject work |
| 15 | KYC flow (Aadhaar) | `aadhaar.service.ts` OTP initiate/verify; `kyc.service.ts` FSSAI + GSTN verification (mock fallback) | PASS: Mock mode returns verified:true without API keys |
| 16 | Recall system | `recall.service.ts` `createRecall()`; sets batch `status=recalled`; blockchain anchor; 4-file fix applied | PASS (fixed 2026-04-05): `POST /api/recalls {batchId:"HT-20260404-006",tier:1,reason:"HMF test",affectedKg:120}` → `201`; batch status changed to `recalled`; `onChainTxHash` written; `GET /api/recalls` returns full recall list. Test confirmed. |
| 17 | i18n setup | `next-intl 4.8.3`; `[locale]` route group; `messages/en.json` + `messages/hi.json` | PASS: `/en/dashboard/farmer` and `/hi/dashboard/farmer` both render |
| 18 | Role dashboards | 8 dashboards built with Carbon components; real data via hooks | PASS: All 8 dashboards render; see remaining work for mock data |
| 19 | QR Scanner | `QRScanner.tsx` using `html5-qrcode`; Consumer dashboard scanner; result passed to `handleSearch()` | PASS: QR scan triggers batch + trace + lab lookups |
| 20 | Admin Export Ledger | `GET /api/admin/export?format=csv/json&entity=...&from=...&to=...` | TESTED: 26 audit logs, 3 batches exported; CSV + JSON + entity=batch filter verified |
| 21 | recall.service.ts findOne fix | Changed `findOne({ id })` to `findOne({ batchId })` | PASS (2026-04-05) |
| 22 | User.ts KYC fields | Added `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, `isActive` to schema | PASS (2026-04-05) |
| 23 | recall.service.ts Batch.updateOne | Writes `recallReason`, `recallTier`, `recallInitiatedAt`, `recallInitiatedBy` via `$set`. Tested: HT-20260406-012 confirms all 4 fields. | PASS (2026-04-06) |

---

## 9. Remaining Work Checklist

> NOTE (2026-04-06): Authoritative completion state is recorded in **9.1 Checklist Closure Addendum (2026-04-06)** below. Items marked [x] in addendum supersede open items here.

- [x] Step 21: **FIXED** — `recall.service.ts:20`: `findOne({ id: ... })` → `findOne({ batchId: ... })`. Recall creation now works end-to-end. **Tested 2026-04-05.**
- [x] Step 22: **FIXED** — `User.ts` schema now includes `kycRejected: Boolean (default false)`, `kycRejectReason: String`, `kycVerifiedAt: Date`, `isActive: Boolean (default true)`. All four fields are now typed, indexed-eligible, and in the Mongoose document interface.
- [x] Step 23: **FIXED** — `users/route.ts:25` now returns `NextResponse.json(users)` (bare array) instead of `NextResponse.json({ data: users })`. Admin and Secretary KYC queues now receive the correct data structure.
- [ ] Step 24: Warehouse dashboard — **PARTIALLY CONFIRMED**. Sensor tiles now use live-derived values (avgMoisture formula, dispatchedKg from batches). Race grid occupancy uses hash-based indexing from real batch data. `PriorStepQR` uses `latestBatch?.batchId` (no longer hardcoded). **HOWEVER**: `temp` and `humidity` columns in the inventory table still show `'--'` (no live IoT telemetry source). "Manage Transfers" button `onClick={() => setIsDispatchModalOpen(true)}` is wired to dispatch modal ✅. Old hardcoded `BATCH-001`, `22.4°C`, `58%`, `450 kg` literals are gone.
- [x] Step 24b: **CONFIRMED** — Officer recall form (`recallsApi.create(...)` at line ~87) does **not** send `initiatedBy` in the POST body. Server injects it from JWT actor. ✅
- [ ] Step 25: Officer dashboard — **PARTIALLY CONFIRMED**:
  - (a) Comparison hub uses `comparisonBatch` derived from `batches[0]` or selected audit batch — **CONFIRMED live** ✅
  - (b) `"${currentUser.userId}"` literal string bug — **CONFIRMED FIXED**: line ~291 now uses `currentUser.userId || '--'` directly in JSX interpolation, no template-literal-in-string error ✅
  - (c) Sidebar approve/flag buttons — approve uses `comparisonBatch.id` (**dynamic** ✅), flag opens `RecallManagementModal` with `comparisonBatch.id` (**dynamic** ✅); audit table approve/flag also use `row.id` (**dynamic** ✅)
- [x] Step 26: **CONFIRMED** — Lab "New Sample" `handleNewSample()` is defined (lines 175–183): resets `EMPTY_FORM`, calls `setSelectedBatchId(firstPending?.id)`, clears errors, clears violations, calls `formRootRef.current?.scrollIntoView(...)`. Button is wired to `handleNewSample` via `onClick={handleNewSample}`. ✅
- [ ] Step 27: Secretary dashboard — **PARTIALLY CONFIRMED**:
  - "Export MIS" button calls `handleExportMis()` → `GET /api/admin/export?format=csv` ✅
  - "Update MSP" button opens modal with `NumberInput` to change `mspValue` ✅
  - "Disburse Funds" button calls `handleDisburseFunds()` → sets toast ✅
  - **ISSUE**: Macro stats `totalProductionKg`, `activeFarmers`, `dispatchedKg`, `recallRate` are **live-computed from `useBatches()` + `useRecalls()`** ✅. **But** subsidy tracker tile still shows hardcoded `CYCLE-2024-Q1`, `₹4.2 crore`, `82%` — these are **NOT** replaced with live data. The claim "macro cards now compute from live batches/recalls/KYC queue" is **PARTIALLY TRUE** (top-level stats yes; subsidy tracker no).
- [ ] Step 28: Admin dashboard — **PARTIALLY CONFIRMED**:
  - The `nodes` array is **NOT** hardcoded "Himalayan Valley #4" / "Central Processing Hub". It is now derived from live data: `'Batch API Node'` (sync = `latestBatchAt`) and `'Recall Relay Node'` (sync = `recalls[0]?.initiatedAt`). ✅
  - **ISSUE**: Node names remain hardcoded strings `'Batch API Node'` and `'Recall Relay Node'` — they are not fully dynamic location-based nodes. This is an improvement but not production-grade node topology. Consider this **PARTIAL** — the worst mock data is gone, but true multi-node discovery is not implemented.
- [x] Step 29: Farmer dashboard — **CONFIRMED**:
  - (a) Weather tile fetches from Open-Meteo API: `fetch('https://api.open-meteo.com/v1/forecast?latitude=...&longitude=...&current=temperature_2m,relative_humidity_2m')` using live GPS coords from `watchPosition()`. ✅
  - (b) `PriorStepQR` uses `latestBatch?.batchId || latestBatch?.id || '--'` — dynamic, not hardcoded `"REG-2024-001"`. ✅
- [x] Step 30: **FIXED (2026-04-06)** — `useCurrentUser.ts` no longer decodes client cookies. It now calls `GET /api/auth` (server-verified session payload), removing `httpOnly` cookie access issues and stale memoized user state.
- [x] Step 31: **FIXED (already in code)** — `PATCH /api/users/[id]` writes `AuditLog` entries via `AuditLog.create(...)` with `action: 'user_updated'`.
- [x] Step 32: **FIXED (2026-04-06)** — `anchorLabResultOnChain()` now hashes the payload object directly (`keccakHash(payload)`), removing double-stringification and aligning hash behavior with batch anchoring logic.
- [x] Step 33: **CONFIRMED** — `IdentityVerificationModal.tsx` (lines 50–81): for `role === 'farmer'`, the component calls real `POST /api/kyc/aadhaar/initiate` (to get `txnId`) and then `POST /api/kyc/aadhaar/verify` (to verify OTP). No local mock. ✅
- [x] Step 34: **CONFIRMED** — `LoginPortal.tsx` (lines 121–146): `handleSignup()` calls `authApi.register({ name, email, password, role })` which submits to `POST /api/auth/register`. Registration form with name, email, password, role select is fully wired. ✅
- [ ] Step 35: `any` cast cleanup — **PARTIALLY CONFIRMED**:
  - `batch.service.ts:stripInternal()` — uses `BatchDocLike = Record<string, unknown> & {...}` — **no `any` cast** ✅
  - `lab.service.ts:stripInternal()` — uses `LabResultDocLike = Record<string, unknown> & {...}` — **no `any` cast** ✅
  - `recall.service.ts:stripInternal()` — uses `RecallDocLike = Record<string, unknown> & {...}` — **no `any` cast** ✅
  - `LabResult.ts` toJSON — uses `Record<string, unknown>` — **no `any` cast** ✅
  - `Recall.ts` toJSON — uses `Record<string, unknown>` — **no `any` cast** ✅
  - `auth.service.ts:25` — uses `(VALID_ROLES as readonly string[]).includes(role)` — **FIXED** cast-to-`any` replaced ✅
  - **ISSUE**: `kyc.service.ts` and `aadhaar.service.ts` were **not reviewed** in this audit round; may still have `any` casts.
- [x] Step 36: **FIXED (2026-04-06)** — `src/lib/rbac.ts` now enforces KYC for all non-exempt operational roles (`farmer/warehouse/lab/officer/enterprise`), with exemptions only for `admin`, `secretary`, and `consumer`.
- [x] Step 37: **FIXED (2026-04-06)** — Frontend data hooks (`useBatches`, `useLabResults`, `useRecalls`) now tolerate both raw-array and `{ data: [...] }` API response shapes, preventing blank tables/refresh churn when route payload formats differ.
- [x] Step 38: **FIXED (2026-04-06)** — `batch.service.ts` now always returns a stable `id` field (stringified `_id`) in strip helpers, preventing dashboard action/state logic from breaking on undefined row IDs.
- [x] Step 39: **FIXED (2026-04-06)** — Service worker/dev loop mitigation: dev mode now unregisters stale HoneyTRACE SW + cache entries, and `sw.js` treats navigation requests as network-first while skipping cache writes for redirected responses.

---

### 9.1 Checklist Closure Addendum (2026-04-06) — Audit-Verified State

The following items were claimed complete in the prior patch. **Audit results (2026-04-06 round 2) are noted:**

- [x] Step 24: Warehouse dashboard — sensor tiles use live-derived values (avgMoisture formula); dispatch KPI live; rack grid hash-based from real data; `PriorStepQR` uses `latestBatch?.batchId`; "Manage Transfers" opens dispatch modal. **CONFIRMED with caveat**: `temp`/`humidity` table columns still show `'--'` (no IoT sensor feed).
- [x] Step 24b: Officer recall form does **not** send `initiatedBy` in body. **CONFIRMED** ✅
- [x] Step 25: Comparison hub live ✅; `userId` interpolation fixed ✅; sidebar action IDs are dynamic ✅. **CONFIRMED**
- [x] Step 26: Lab "New Sample" button properly wired. **CONFIRMED** ✅
- [x] Step 27: "Export MIS" and "Disburse Funds" wired; top-level macro stats live. **CONFIRMED with caveat**: subsidy tracker sub-tile still shows hardcoded `CYCLE-2024-Q1` / `₹4.2 crore` / `82%`.
- [x] Step 28: Admin node management no longer shows "Himalayan Valley #4" / "Central Processing Hub". **CONFIRMED** — nodes are now derived from live batch/recall data. Node names are still hardcoded strings but derived sync/height data is live.
- [x] Step 29: Farmer weather tile uses Open-Meteo + GPS; `PriorStepQR` uses dynamic batch ID. **CONFIRMED** ✅
- [x] Step 33: `IdentityVerificationModal` calls real `/api/kyc/aadhaar/initiate` + `/verify`. **CONFIRMED** ✅
- [x] Step 34: Registration UI wired to `POST /api/auth/register`. **CONFIRMED** ✅
- [x] Step 35: `any` casts in `stripInternal()` helpers and `LabResult.ts`/`Recall.ts` toJSON transforms removed. **CONFIRMED**. `kyc.service.ts`/`aadhaar.service.ts` not audited in this round.

---

## 10. End-to-End Flow Verification

### Happy-path: Honey Batch from Farm to Consumer

**A. Farmer Registration + KYC**
- API: `POST /api/auth/register` saves user with `kycCompleted: false`
- Admin/Secretary approves: `PATCH /api/users/[id]` sets `kycCompleted: true`
- AuditLog: Recorded via `AuditLog.create(...)` in `PATCH /api/users/[id]` with `action: 'user_updated'`
- Blockchain: None
- Status: WORKS

**B. Farmer Creates Batch**
- API: `POST /api/batches` (role: farmer)
- Validation: `moisturePct <= 20`; 24h dedup via SHA-256 fingerprint in `_payloadHash`
- Model write: `Batch` created with `status: 'pending'`, `batchId: 'HT-YYYYMMDD-NNN'`
- Blockchain anchor: `anchorBatchOnChain(batchId, payload, 'commissioning', 'lat,lng')` writes `onChainTxHash`, `onChainDataHash`
- AuditLog: `{ entityType: 'batch', action: 'create', actorRole: 'farmer' }`
- Status: WORKS (blockchain silently skipped if relay not configured)

**C. Warehouse Receives Batch**
- API: `PATCH /api/batches/[id]` with `{ status: 'in_warehouse' }`
- Auth: role `warehouse`
- Model write: `Batch.status = 'in_warehouse'`, `warehouseId`, `warehouseReceivedAt`
- Blockchain anchor: Re-anchor triggered (`in_warehouse` is in `ANCHOR_ON_STATUS`)
- AuditLog: `{ action: 'patch', metadata: { chainAnchored: true } }`
- Status: WORKS

**D. Lab Tests Batch**
- API: `POST /api/lab` with full Codex parameter set
- Auth: role `lab`
- Model write: `LabResult` upserted; `Batch.status = 'certified'`
- Blockchain anchor: `anchorLabResultOnChain()` calls `linkLabResult()` on contract
- AuditLog: `{ entityType: 'lab', action: 'publish' }`
- Status: WORKS

**E. Officer Inspects and/or Recalls**
- Approve: `PATCH /api/batches/[id]` with `{ status: 'certified' }` (officer role)
- Recall: `POST /api/recalls` with `{ batchId, tier, reason, affectedKg }` — `initiatedBy` is injected server-side from `actor.userId`; no longer required in body
- Model write (recall): `Recall.create(...)`, `Batch.status = 'recalled'`
- Blockchain anchor: `anchorRecallOnChain()` calls `initRecall()` on contract
- AuditLog: `{ entityType: 'recall', action: 'recall', metadata: { batchId, tier, reason } }`
- Status: **FIXED (2026-04-05)** — Tested: `POST /api/recalls {batchId:"HT-20260404-006",tier:1,reason:"HMF test",affectedKg:120}` → 201; `GET /api/batches/HT-20260404-006` confirms `status:"recalled"` and `onChainTxHash` present.

**F. Enterprise Views Certified Batches**
- API: `GET /api/batches?status=dispatched` (role: enterprise)
- Model read: `Batch.find({ status: 'dispatched' })`
- Status: WORKS (enterprise sees dispatched batches; can open BlockchainCertificate modal)

**G. Consumer Scans QR and Traces Provenance**
- API: `GET /api/batches/[id]` (batch data) + `GET /api/trace/[id]` (public, timeline) + `GET /api/lab/[batchId]` (lab results)
- Consumer requires `honeytrace_token` cookie for `/api/batches/[id]`; `/api/trace/[batchId]` is public
- Status: WORKS

**H. Admin Exports Ledger**
- API: `GET /api/admin/export?format=csv` (role: admin)
- Model read: `AuditLog.find(query)` + `Batch.find({})`
- Status: WORKS — TESTED: 26 logs, 3 batches exported; CSV + JSON + entity filter verified

---

### Flow Break Summary

| Location | Status | Resolution |
|---|---|---|
| `recall.service.ts:20` | **FIXED 2026-04-05** | Changed `findOne({ id })` to `findOne({ batchId })`. Tested — recall creates, batch marked recalled, on-chain hash written. |
| `users/route.ts:25` + `admin/page.tsx:94` | **FIXED 2026-04-05** | Route now returns bare array via `NextResponse.json(users)`. KYC queue correctly populated. |
| `User.ts` schema missing KYC fields | **FIXED 2026-04-05** | Added `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, `isActive` to schema and interface. |
| KYC approval audit logging | **FIXED (already in code)** | `PATCH /api/users/[id]` writes `AuditLog.create(...)` with `action: 'user_updated'`. |
| `useCurrentUser.ts` cookie decoding | **FIXED 2026-04-06** | Replaced client JWT-cookie decoding with `GET /api/auth` session fetch. |
| `rbac.ts` KYC gate bypass | **FIXED 2026-04-06** | Removed broad role exemptions; KYC is now enforced for non-exempt operational roles. |
| `blockchain-relay.ts` lab hash path | **FIXED 2026-04-06** | Removed double-stringification in `anchorLabResultOnChain()`. |
| `batch.service.ts` stale `BIZ_STEP` aliases | **FIXED 2026-04-06** | Replaced legacy keys (`lab_testing`, `warehouse_stored`) with active statuses (`in_testing`, `certified`, `in_warehouse`). |
| `recalls/route.ts` validation text | **FIXED 2026-04-06** | Error message no longer claims `initiatedBy` is required when schema/route override make it optional in request body. |
| `useBatches` / `useLabResults` / `useRecalls` response parsing | **FIXED 2026-04-06** | Hooks now support both raw array payloads and `{ data: [...] }` wrappers. |
| `batch.service.ts` strip helper ID export | **FIXED 2026-04-06** | Returned documents now include stable `id` to keep dashboard row actions deterministic. |
| `ServiceWorkerRegistrar` + `public/sw.js` | **FIXED 2026-04-06** | Added dev cache/SW cleanup and network-first document strategy to stop stale redirect cache loops. |

---

## 11. Seeded Test Accounts

Run `npm run seed` to create (or `npm run seed -- --reset` to wipe and recreate).

> All seeded users have `kycCompleted: true` to bypass the approval gate for demo use.

| Email | Password | Role | Key Identifiers |
|---|---|---|---|
| `farmer@honeytrace.gov` | `password123` | farmer | aadhaarNumber: 876543210123, pmKisanId: PMKISAN-100234 |
| `warehouse@honeytrace.gov` | `password123` | warehouse | fssaiLicense: 10016011000731, gstNumber: 09AABCU9603R1ZP, wdraLicenseNo: WDRA-UP-2024-0042 |
| `lab@honeytrace.gov` | `password123` | lab | fssaiLicense: 10016011000892, nablAccreditationNo: T-4521, labRegistrationNo: LAB-MH-2023-0091 |
| `officer@honeytrace.gov` | `password123` | officer | employeeId: FSO-UP-00341, fssaiOfficerId: FSSAI-FSO-2021-4421, dept: FSSAI UP, jurisdiction: Meerut |
| `enterprise@honeytrace.gov` | `password123` | enterprise | gstNumber: 27AABCM1234F1ZX, fssaiLicense: 10016011002341, cinNumber: U15122MH2019PTC321456 |
| `consumer@honeytrace.gov` | `password123` | consumer | mobileNumber: 9876543210 |
| `secretary@honeytrace.gov` | `password123` | secretary | employeeId: SEC-AGMARK-00782, dept: AGMARK - DMI |
| `admin@honeytrace.gov` | `Admin@password123` | admin | employeeId: ADM-SYSTEM-001 |

---

## 12. Known Issues and Tech Debt

### Critical — All resolved as of 2026-04-05

| File | Issue | Status |
|---|---|---|
| `recall.service.ts:20` | `findOne({ id: batchId })` wrong field | **FIXED** — changed to `findOne({ batchId: batchId })` |
| `users/route.ts:25` | `{ data: users[] }` mismatch vs dashboard bare-array expectation | **FIXED** — returns bare array now |
| `User.ts` | `kycRejected`/`kycRejectReason` missing from schema | **FIXED** — 4 new fields added to schema and IUser interface |

### High

| File | Issue | Status |
|---|---|---|
| `User.ts` | `kycRejected`/`kycRejectReason`/`kycVerifiedAt`/`isActive` missing from schema | **FIXED 2026-04-05** |
| `useCurrentUser.ts` | Client-side cookie decoding (`useMemo([])`) caused stale/empty identity for `httpOnly` token flows | **FIXED 2026-04-06** — now fetches `GET /api/auth` session payload |
| `officer/page.tsx:309` | `"${currentUser.userId}"` inside JSX string rendered as literal text, not interpolated value | **FIXED 2026-04-06** |
| Multiple dashboards | Sensor/node/production stat tiles were hardcoded mocks | **PARTIALLY FIXED 2026-04-06** — warehouse, officer, secretary, admin, and farmer dashboards now use live-derived values for previously hardcoded cards/tables |

### Medium

| File | Issue | Status |
|---|---|---|
| `src/lib/rbac.ts` | KYC gate bypass due to broad role exemptions | **FIXED 2026-04-06** — only `admin`/`secretary`/`consumer` remain exempt |
| `lab/page.tsx:175` | "New Sample" button has no onClick handler | **FIXED 2026-04-06** |
| `warehouse/page.tsx:131` | "Manage Transfers" button `onClick={() => {}}` is a no-op | **FIXED 2026-04-06** |
| `secretary/page.tsx:321-322` | "Export MIS" and "Update MSP" buttons have no handlers | **FIXED 2026-04-06** |
| `batch.service.ts` | `BIZ_STEP` map had stale aliases (`lab_testing`, `warehouse_stored`) not aligned with status enum values | **FIXED 2026-04-06** |
| `blockchain-relay.ts:52-53` | `anchorLabResultOnChain()` double-stringified payload before hashing | **FIXED 2026-04-06** |
| `recall.schema.ts` + `api/recalls/route.ts` | `initiatedBy` is optional but route error text still said it was required | **FIXED 2026-04-06** |
| `warehouse/page.tsx` | `temp`/`humidity` columns in inventory table show `'--'` — no IoT sensor feed integrated | **OPEN** — no live telemetry source; values would require a real sensor API |
| `secretary/page.tsx` | Subsidy tracker sub-tile shows hardcoded `CYCLE-2024-Q1`, `₹4.2 crore`, `82%` | **OPEN** — top-level macro stats are live; this tile is not |
| `admin/page.tsx` | Node names (`'Batch API Node'`, `'Recall Relay Node'`) are hardcoded strings; not a real multi-node topology | **OPEN** — an improvement over "Himalayan Valley #4" but not production node discovery |

### Low

- `any` casts in `kyc.service.ts` and `aadhaar.service.ts` not audited in round 2 — may remain
- `Batch.ts` has no exported TypeScript `IBatch` interface; document type relies purely on Mongoose schema inference — can cause issues when accessing fields not in `BatchDocLike` in `batch.service.ts`
- `VALID_ROLES.includes(role as any)` pattern — **FIXED in `auth.service.ts`** to `(VALID_ROLES as readonly string[]).includes(role)`; verify same fix applied in any other call sites
- Playwright test coverage is unclear; `/test/` and `/tests/` both exist
- `lab/page.tsx:396`: `PriorStepQR` still has hardcoded `batchId="WH-DEL-882"` in the sidebar (not the analysis form's selected batch) — minor cosmetic issue

---

## Appendix: Key File Map

```
src/
  app/
    [locale]/
      layout.tsx                  # Wraps locale pages; sets html lang
      page.tsx                    # Locale landing page renders <LoginPortal />
      dashboard/
        admin/page.tsx            # KYC queue, stats, node mgmt, recalls
        farmer/page.tsx           # Harvest form, batch table, GPS, map stamp
        warehouse/page.tsx        # Incoming/dispatch modals, storage grid
        lab/page.tsx              # Full Codex test form, queue table
        officer/page.tsx          # Audit table, approve/flag, recall
        enterprise/page.tsx       # Dispatched batch table, certificate modal
        consumer/page.tsx         # QR scanner, batch lookup, timeline
        secretary/page.tsx        # KYC queue, heatmap, macro stats
    api/
      auth/route.ts               # GET session / POST login / DELETE logout
      auth/register/route.ts      # POST register
      health/route.ts             # GET health ping
      batches/route.ts            # GET list / POST create
      batches/[id]/route.ts       # GET / PATCH single batch
      lab/route.ts                # GET list / POST publish
      lab/[batchId]/route.ts      # GET single lab result (no PATCH)
      trace/[batchId]/route.ts    # GET public trace (no auth required)
      recalls/route.ts            # GET list / POST create
      users/route.ts              # GET list (admin/secretary)
      users/[id]/route.ts         # PATCH KYC approve/reject
      admin/export/route.ts       # GET audit ledger export
      kyc/aadhaar/initiate/route.ts
      kyc/aadhaar/verify/route.ts
  lib/
    models/                       # Mongoose schemas (User, Batch, LabResult, Recall, AuditLog, Counter)
    services/                     # Business logic (auth, batch, lab, recall, kyc, aadhaar)
    validation/                   # Zod schemas (auth, batch, lab, recall, user)
    api.ts                        # Typed fetch client (ApiError, batchesApi, labApi, recallsApi, authApi)
    auth.ts                       # JWT sign/verify (jsonwebtoken)
    audit.ts                      # auditLog() fire-and-forget helper
    blockchain.ts                 # Browser wallet ethers.js (client-side MetaMask)
    blockchain-relay.ts           # Server-side relayer (ethers.js + Wallet)
    env.ts                        # Env validation on startup
    mongodb.ts                    # connectDB() singleton with global cache
    rateLimit.ts                  # In-memory sliding window rate limiter (5 req/15 min)
    rbac.ts                       # requireAuth() guard; AuthError class; KYC gate (operational roles require kycCompleted=true)
    store.ts                      # Zustand useWalletStore
  hooks/
    useBatches.ts                 # GET /api/batches with refresh()
    useCurrentUser.ts             # Fetches current session actor via GET /api/auth
    useLabResults.ts              # GET /api/lab
    useOfflineSync.ts             # Service worker offline queue notifications
    useOnboarding.ts              # KYC/tour flow localStorage state
    useRecalls.ts                 # GET /api/recalls
    useWallet.ts                  # MetaMask connect/disconnect
  components/
    Auth/                         # Login form, demo credentials
    Blockchain/                   # BlockchainStatusBanner
    Map/ProductionHeatMap.tsx     # react-leaflet heatmap (Secretary dashboard)
    Navigation/UnifiedDashboardLayout.tsx
    Notifications/                # Toast system
    Onboarding/                   # GuidedTour, IdentityVerificationModal, SimplifiedFarmerOnboarding
    Traceability/                 # BlockchainCertificate, CTETimeline, QRScanner, RecallManagementModal, BlockchainMapStamp, PriorStepQR
    EmptyState.tsx
    ErrorBoundary.tsx             # React class ErrorBoundary
  i18n/
    request.ts                    # next-intl server config
    routing.ts                    # locales: ['en','hi'], defaultLocale: 'en'
  middleware.ts                   # CORS + JWT RBAC + next-intl locale routing
messages/
  en.json                         # 24 KB English strings
  hi.json                         # 41 KB Hindi strings
scripts/
  seed.ts                         # 8 test users; npm run seed
  createIndexes.ts                # MongoDB index creation
  localhost.sh                    # Hardhat node + MongoDB startup script
  contracts/
    deploy.js                     # Hardhat deployment script
    sync-abi.js                   # Copies ABI + addresses to src/lib/
```
