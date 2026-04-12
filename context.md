# HoneyTrace â€” Project Context
> **Single source of truth for any developer or AI assistant picking up this codebase.**
> Generated: 2026-04-05 Â· Last updated: 2026-04-09 (patch round 4) Â· Audited against every file in `src/` and `scripts/`.

---
## 0. Latest Patch (2026-04-09)

### Fixed in this round
- KYC/session consistency: `requireAuth` is now async and performs DB fallback verification when JWT has stale `kycCompleted=false`, so approval takes effect immediately without forced relogin.
- KYC queue wiring:
  - `GET /api/users?kycCompleted=false` now excludes rejected users (`kycRejected != true`).
  - Queue projection now includes `fssaiLicense`, `gstNumber`, `nablAccreditationNo`, and `kycRejected`.
  - `PATCH /api/users/[id]` now uses schema-aligned fields (`gstNumber`, `nablAccreditationNo`) and removed dead `instanceof NextResponse` checks.
- Logout security: header sign-out now calls `authApi.logout()` (DELETE `/api/auth`) before redirect.
- Recall typing/wiring:
  - `RecallEvent.initiatedBy` is optional in shared types.
  - `recallsApi.create()` no longer requires `initiatedBy` payload.
  - Recall modal no longer sends hardcoded `initiatedBy`.
  - `recalls/route.ts` now uses `actor.userId` directly (removed unsafe `any` chain).
- Data/schema correctness: `Batch.labResults.hmc` renamed to `hmf`.
- Dashboard runtime/UI fixes:
  - Secretary TDZ fixed (`totalKg`/`dispatchedKg` now declared before `disbursePct`).
  - Static `BlockchainMapStamp` times removed in Warehouse and Officer; Consumer now passes proper `HH:mm:ss`.
  - Warehouse receipt ID now uses live latest batch ID instead of hardcoded `B001`.
  - Invalid table markup fixed: `EmptyState` wrapped inside `TableRow` + `TableCell` in Farmer and Lab tables.
  - Officer flag path no longer creates `affectedKg: 0` recalls directly; opens recall modal path.
  - Admin block height now includes time-delta increment.
  - Enterprise DataTable `any` callback annotations removed.
- API client contracts updated to match actual route response shapes (bare arrays/objects where applicable), and hooks updated accordingly.

### Verification
- Build check: `npm run build` passes successfully on 2026-04-09 after fixes.
- Post-fix grep audit confirms removal of previously reported critical/high signatures.

---
## 1. Project Overview

**HoneyTrace** is a production-grade, blockchain-anchored honey supply-chain traceability platform built for India's apiculture sector. It provides:

- **Multi-role access**: Farmer, Warehouse, Lab, Officer, Enterprise, Consumer, Secretary, Admin â€” each with a dedicated dashboard.
- **Batch lifecycle tracking**: `pending â†’ in_warehouse â†’ in_testing â†’ certified â†’ dispatched` (or `recalled`).
- **Immutable on-chain anchoring**: keccak256 hashes written to a Solidity `HoneyTraceRegistry` contract (deployed on Base Sepolia or Hardhat localhost) via a server-side relayer (`blockchain-relay.ts`).
- **Codex Stan 12-1981 compliance**: Lab result validation enforced at both frontend (client-side form guard) and backend (service layer).
- **KYC workflow**: Admin/Secretary approve users via `PATCH /api/users/[id]`; optional Aadhaar OTP + FSSAI/GSTN document verification.
- **i18n**: Full English + Hindi (`messages/en.json`, `messages/hi.json`) via `next-intl`, locale-prefix routing (`/en/â€¦`, `/hi/â€¦`).
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

### Blockchain (optional â€” relay disabled if env vars missing)
```powershell
# Terminal 1 â€” Hardhat local node
npx hardhat node

# Terminal 2 â€” Deploy contract
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

### 5.1 User â€” src/lib/models/User.ts

| Field | Type | Notes |
|---|---|---|
| `email` | String | unique, lowercase, required |
| `passwordHash` | String | bcrypt cost-12 |
| `role` | String (enum) | `farmer/warehouse/lab/officer/enterprise/consumer/secretary/admin` |
| `name` | String | required |
| `kycCompleted` | Boolean | default `false`; set to `true` by admin/secretary approve |
| `kycVerifiedAt` | Date? | timestamp when kycCompleted was set to true |
| `kycRejected` | Boolean? | default `false`; set by secretary/admin reject action |
| `kycRejectReason` | String? | freeform rejection note |
| `isActive` | Boolean? | default `true`; soft-disable account without deletion |
| `fssaiLicense` | String? | lab, warehouse, enterprise |
| `aadhaarNumber` | String? | farmer (raw input only; not stored post-KYC) |
| `pmKisanId` | String? | farmer |
| `aadhaarVerified` | Boolean? | populated after OTP |
| `aadhaarSuffix` | String? | last 4 digits only â€” never full number |
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

### 5.2 Batch â€” src/lib/models/Batch.ts

| Field | Type | Notes |
|---|---|---|
| `batchId` | String | unique; format `HT-YYYYMMDD-NNN` (sequential counter) |
| `farmerId` | String | indexed |
| `farmerName` | String | |
| `floraType` | String | e.g. "Karanj", "Mahua" |
| `weightKg` | Number | |
| `moisturePct` | Number | Farmer's field reading (%); Codex limit <= 20% enforced in service |
| `latitude/longitude` | String | GPS strings |
| `grade` | String enum | `A/B` |
| `harvestDate` | String | ISO date YYYY-MM-DD |
| `status` | String enum | `pending/in_warehouse/in_testing/certified/dispatched/recalled` |
| `warehouseId/warehouseReceivedAt/warehouseNotes` | mixed | set by warehouse PATCH |
| `labId/labSubmittedAt/labReportId/labCertifiedAt` | mixed | set by lab publish |
| `labResults.{moisture,hmf,antibiotics,pesticides,passed}` | nested `LabResultsSubdoc` | summary subdoc written by `lab.service.ts`; distinct from the full `LabResult` collection document |
| `dispatchedAt/destinationEnterprise/invoiceNo` | mixed | dispatch fields |
| `onChainTxHash` | String? | tx hash on blockchain |
| `onChainDataHash` | String? | keccak256 of canonical payload |
| `blockchainAnchoredAt` | Date? | |
| `blockchainNetwork` | String? | `localhost/baseSepolia` |
| `_payloadHash` | String | SHA-256 fingerprint for 24h deduplication (internal; stripped in `toJSON`) |
| `recallReason/recallTier/recallInitiatedAt/recallInitiatedBy/recallTxHash` | mixed | set on recall |

> **Blockchain anchor points:** Creation (`pending`) + status transitions matching `ANCHOR_ON_STATUS` set in `batch.service.ts:23`: `certified`, `in_warehouse`, `dispatched`, `recalled`.

> **NOTE (2026-04-06):** `Batch.ts` exports only `BatchStatus` type and the raw Mongoose model. There is **no** exported `IBatch` TypeScript interface â€” document type relies purely on Mongoose schema inference. This is a known typing gap (see Â§12 Low issues).

---

### 5.3 LabResult â€” src/lib/models/LabResult.ts

| Field | Type | Notes |
|---|---|---|
| `batchId` | String | unique, indexed |
| `sampleId` | String | client-generated `LAB-{timestamp}` |
| `labId` | String | actorId from JWT |
| `fssaiLicense` | String | required (14 chars) |
| `nablCert` | String | NABL accreditation number |
| `moisture` | Number | Codex <= 20%; used in officer dashboard purity formula |
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

### 5.4 Recall â€” src/lib/models/Recall.ts

| Field | Type | Notes |
|---|---|---|
| `id` | String | unique; format `RECALL-{timestamp}` |
| `batchId` | String | indexed |
| `tier` | Number enum | `1/2/3` (Class I = most severe) |
| `reason` | String | required |
| `affectedKg` | Number | required |
| `initiatedBy` | String | actorId from JWT â€” **always injected server-side** from `actor.userId`; `initiatedBy` in request body is ignored (schema field is now optional) |
| `initiatedAt` | String | ISO timestamp |
| `onChainTxHash` | String? | recall event chain hash |

> FIXED (2026-04-05): `recall.service.ts:20` now correctly uses `Batch.findOne({ batchId: input.batchId })`. Tested â€” recall creation succeeds; batch status transitions to `recalled`; on-chain anchor writes `onChainTxHash`. See test evidence in Â§8 Step 16.

---

### 5.5 AuditLog â€” src/lib/models/AuditLog.ts

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

### 5.6 Counter â€” src/lib/models/Counter.ts

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
| GET | `/api/users` | admin/secretary | List users; `?kycCompleted=false` for KYC queue â€” **returns bare array** (fixed 2026-04-05) |
| PATCH | `/api/users/[id]` | admin/secretary | Approve/reject KYC; sets `kycCompleted=true`/`kycVerifiedAt` or `kycRejected=true`/`kycRejectReason`; writes `AuditLog` action `user_updated` |
| GET | `/api/admin/export` | admin | Export audit ledger; `?format=csv/json&entity=batch/lab/kyc&from=ISO&to=ISO` |
| POST | `/api/kyc/aadhaar/initiate` | authenticated | Initiate Aadhaar OTP |
| POST | `/api/kyc/aadhaar/verify` | authenticated | Verify OTP; writes aadhaarVerified data |

> NOTE: both `/api/register` and `/api/auth/register` exist; production login portal now submits self-registration to `/api/auth/register`.

---

## 7. Dashboard Data Flow & Hook Dependency Map

> Audited 2026-04-08. "Live" = derived from actual DB data via hooks/API. "Deferred" = hardcoded or approximate.

### 7.1 Farmer (`farmer/page.tsx`)
- **Hooks**: `useBatches({ farmerId: currentUser.userId })`, `useCurrentUser`, `useOfflineSync`, `useOnboarding`
- **Live**: Batch table (all columns), total harvest count, total weight, GPS coords (via `watchPosition`), weather tile (Open-Meteo API at `gpsLat/gpsLng`), `PriorStepQR` batchId (`latestBatch?.batchId || latestBatch?.id`)
- **Deferred**: `estimatedValue` uses hardcoded MSP prices `450` (Grade A) / `380` (Grade B) â€” no `useMSP()` hook exists yet, `/api/settings` route not implemented
- **GPS defaults**: `'22.8465'` / `'81.3340'` â€” retained intentionally; overwritten by live `watchPosition` on permission grant

### 7.2 Warehouse (`warehouse/page.tsx`)
- **Hooks**: `useBatches()`, `useOnboarding`
- **Live**: Stock KPI (`stockKg`, `inWarehouseCount`), dispatched KPI (`dispatchedKg`, `dispatchedCount`), temperature tile (derived from `avgMoisture` as proxy: `20 + (avgMoisture - 17) * 0.8`), humidity tile (derived: `45 + avgMoisture`), rack grid (hash-based from real batch IDs), `PriorStepQR` batchId (`latestBatch?.batchId || latestBatch?.id`), inventory table (3 columns: batch, status, arrival)
- **Deferred / No data source**: Temperature/humidity **tile values** are formulaic proxies from `avgMoisture` â€” NOT real IoT telemetry (see Â§12). Static bar chart sparkline `[40,70,45,90,65,80,50,85]` in Stock Level tile. `BlockchainMapStamp` utcTime is static `"14:20:15"`. `receipt_desc` text in sidebar still shows hardcoded `id: 'B001'`.
- **Removed this session**: `temp`/`humidity` inventory table columns removed (no live data source)

### 7.3 Lab (`lab/page.tsx`)
- **Hooks**: `useBatches()`, `useLabResults()`, `useCurrentUser`, `useOnboarding`
- **Live**: Pending sample queue (all batches filtered by `alreadyPublished`), KPI counts (`pendingCount`, `certifiedCount`, `alertCount`), `selectedBatchId` in `PriorStepQR`, certificate tile hash (`0x${id.slice(0,4)}...F92A` from `selectedBatchId`), `BlockchainMapStamp` utcTime (`new Date().toISOString().substring(11,19)`)
- **Deferred**: Certificate tile shows form-field values (`form.moisture`, `form.hmf`) as preview â€” correct behaviour (it reflects currently-entered test values). `BlockchainMapStamp` coordinates are static registered lab address (legitimately static). Placeholder values now `'--'` (fixed: `form.moisture || '--'`, `form.hmf || '--'`)

### 7.4 Officer (`officer/page.tsx`)
- **Hooks**: `useBatches()`, `useCurrentUser`, `useOnboarding`
- **Live**: Audit table (all batches), KPI counts (`pendingCount`, `certifiedToday`, `flaggedCount`, `fieldAuditCount`), `comparisonBatch` (selectable from table or defaults to `batches[0]`), farmer purity display (`100 - comparisonBatch.moisturePct`), lab purity (`comparisonBatch?.labResults?.moisture != null ? (100 - labResults.moisture) : '--'`), weight mismatch (`comparisonBatch.weightKg * 0.002`), `PriorStepQR` batchId, signing payload hash (derived from `comparisonBatch.batchId`)
- **Deferred**: `BlockchainMapStamp` utcTime is static `"10:30:22"` and coordinates static (officer's jurisdiction â€” acceptable). `comparisonDelta` (purity variance number) = `Math.max(0, 20 - moisturePct)` â€” proxy, not a real lab-vs-field comparison

### 7.5 Secretary (`secretary/page.tsx`)
- **Hooks**: `useBatches()`, `useRecalls()`, `useOnboarding`; KYC queue fetched inline via `fetch('/api/users?kycCompleted=false')`
- **Live**: `totalProductionKg`, `activeFarmers`, `dispatchedKg`, `recallRate` (all from `useBatches`/`useRecalls`), `cycleId` (computed from `new Date()`: `CYCLE-YYYY-QN`), `disbursePct` (`Math.round((dispatchedKg / totalKg) * 100)`), ProgressBar uses live `disbursePct`, `tDashboard('disbursement_verified', { percent: disbursePct })` uses live value, KYC queue (real API call), `mspValue` state (user-editable via modal)
- **Deferred / Still hardcoded**: `â‚¹4.2 crore` subsidy amount in tile is static string. District performance tile (`+14.2%`, `High`) are hardcoded. Production cluster map data is static array (no live API). `mspValue` initialises at `348` with no persistence (no `/api/settings`)
- **KNOWN BUG**: `disbursePct` is referenced **before** `totalKg` and `dispatchedKg` are declared (line 286 uses both before line 292-293 defines them) â€” this is a TDZ (Temporal Dead Zone) error at module parse time. See Â§12.

### 7.6 Admin (`admin/page.tsx`)
- **Hooks**: `useBatches()` (via `useAdminStats()`), `useRecalls()`, `useOnboarding`; KYC count via inline `fetch('/api/users?kycCompleted=false')`
- **Live**: `totalBatches`, `certifiedPct` (from `useBatches`), `pendingKyc` (from API fetch), `recalls` list, node sync timestamps (from `batches[0]?.updatedAt` and `recalls[0]?.initiatedAt`)
- **Deferred / Still approximate**: `blockHeightBase` seed is `452000 + batches.length + recalls.length` (no `Date.now()` increment yet â€” task description says it was updated but actual file shows the simpler formula). Node names `'Batch API Node'` / `'Recall Relay Node'` are hardcoded strings

### 7.7 Consumer (`consumer/page.tsx`)
- **Hooks**: `useOnboarding`; batch/trace/lab data fetched inline via `batchesApi.get()`, direct `fetch('/api/trace/${id}')`, `labApi.getByBatch()`
- **Live**: All batch details, CTE timeline, lab results, purity score (composite from lab data), stakeholders list
- **Confirmed clean**: No hardcoded data values

### 7.8 Enterprise (`enterprise/page.tsx`)
- **Hooks**: `useBatches({ status: 'dispatched' })`, `useCurrentUser`
- **Live**: All dispatched batch data, KPI tiles (totalKg, certifiedCnt, recalledCnt, onChainCnt), QualityTag from `batch.labResults?.passed`, on-chain status from `batch.onChainTxHash`
- **Confirmed clean**: No hardcoded data values

---

## 8. Frontendâ€“Backend Wiring Audit

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
| `admin/page.tsx:92` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED (shape mismatch FIXED â€” bare array now returned) |
| `admin/page.tsx:105` | PATCH | `/api/users/{id}` | YES | YES PATCH | WIRED |
| `admin/page.tsx:294` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED |
| `admin/page.tsx:377` | GET | `/api/admin/export?format=csv` | YES | YES GET | WIRED |
| `secretary/page.tsx:67` | GET | `/api/users?kycCompleted=false` | YES | YES GET | WIRED |
| `secretary/page.tsx:84,104` | PATCH | `/api/users/{id}` | YES | YES PATCH | WIRED |
| `enterprise/page.tsx:68` | GET | `/api/batches?status=dispatched` | YES | YES GET | WIRED |
| `hooks/useRecalls.ts:29` | GET | `/api/recalls` | YES | YES GET | WIRED |
| `hooks/useCurrentUser.ts:26` | GET | `/api/auth` | YES | YES GET | WIRED |
| `lib/api.ts:110` | DELETE | `/api/auth` | YES | YES DELETE | WIRED |
| `secretary/page.tsx:307` | GET | `/api/admin/export?format=csv&entity=batch` | YES | YES GET | WIRED |

**Routes that exist but are never called from the frontend:**

| Route | Note |
|---|---|
| `GET /api/health` | Infrastructure only |
| `POST /api/register` | Backend exists; production UI currently uses `/api/auth/register` path for lightweight self-registration |

**Important mismatch in `lib/api.ts`:** `batchesApi.list()` returns typed as `Promise<{ data: Batch[] }>`, but hooks handle both shapes (raw array OR `{ data: [...] }` wrapper). The actual `/api/batches` route currently returns a bare `Batch[]`. The typed return in `api.ts:85` is misleading but harmless due to hook normalisation.

---

## 9. Completed Steps and Test Results

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
| 16 | Recall system | `recall.service.ts` `createRecall()`; sets batch `status=recalled`; blockchain anchor; 4-file fix applied | PASS (fixed 2026-04-05): `POST /api/recalls {batchId:"HT-20260404-006",tier:1,reason:"HMF test",affectedKg:120}` â†’ `201`; batch status changed to `recalled`; `onChainTxHash` written; `GET /api/recalls` returns full recall list. Test confirmed. |
| 17 | i18n setup | `next-intl 4.8.3`; `[locale]` route group; `messages/en.json` + `messages/hi.json` | PASS: `/en/dashboard/farmer` and `/hi/dashboard/farmer` both render |
| 18 | Role dashboards | 8 dashboards built with Carbon components; real data via hooks | PASS: All 8 dashboards render; see remaining work for mock data |
| 19 | QR Scanner | `QRScanner.tsx` using `html5-qrcode`; Consumer dashboard scanner; result passed to `handleSearch()` | PASS: QR scan triggers batch + trace + lab lookups |
| 20 | Admin Export Ledger | `GET /api/admin/export?format=csv/json&entity=...&from=...&to=...` | TESTED: 26 audit logs, 3 batches exported; CSV + JSON + entity=batch filter verified |
| 21 | recall.service.ts findOne fix | Changed `findOne({ id })` to `findOne({ batchId })` | PASS (2026-04-05) |
| 22 | User.ts KYC fields | Added `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, `isActive` to schema | PASS (2026-04-05) |
| 23 | recall.service.ts Batch.updateOne | Writes `recallReason`, `recallTier`, `recallInitiatedAt`, `recallInitiatedBy` via `$set`. Tested: HT-20260406-012 confirms all 4 fields. | PASS (2026-04-06) |
| 24 | Warehouse hardcoded data | Removed `temp`/`humidity` table columns; KPIs now live-derived; rack grid hash-based | PASS (2026-04-08) |
| 25 | Lab placeholder values | `form.moisture \|\| '--'` and `form.hmf \|\| '--'` replace fabricated defaults | PASS (2026-04-08) |
| 26 | Officer lab purity formula | `comparisonBatch?.labResults?.moisture != null ? (100 - labResults.moisture).toFixed(1) : '--'` replaces fabricated formula | PASS (2026-04-08) |
| 27 | Secretary live subsidy % | `disbursePct` derived from live `dispatchedKg/totalKg`; ProgressBar and i18n key use live value | PASS (2026-04-08) â€” CAVEAT: TDZ bug found (see Â§12) |
| 28 | Secretary cycleId | `CYCLE-${year}-Q${quarter}` derived from `new Date()` replaces hardcoded `"CYCLE-2024-Q1"` | PASS (2026-04-08) |
| 29 | Lab cert hash | Hash derived from `selectedBatchId` slice; `'--'` when no batch selected | PASS (2026-04-08) |
| 30 | Lab BlockchainMapStamp time | `utcTime` now `new Date().toISOString().substring(11,19)` (live clock) | PASS (2026-04-08) |
| 31 | officer signing payload hash | `0x${batchId.slice...}` pattern replaces static `'0x9df1...a2e8'` | PASS (2026-04-08) |
| 32 | Admin blockHeightBase seed | Formula updated to time-increment from 2025-01-01 baseline | TASK DESC SAYS DONE but actual file shows simpler formula â€” needs verification |

---

## 10. Remaining Work Checklist

- [x] Step 21: **FIXED** â€” `recall.service.ts:20`: `findOne({ id: ... })` â†’ `findOne({ batchId: ... })`. **Tested 2026-04-05.**
- [x] Step 22: **FIXED** â€” `User.ts` schema now includes `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, `isActive`.
- [x] Step 23: **FIXED** â€” `users/route.ts:25` now returns bare array.
- [x] Step 24: **FIXED** â€” Warehouse `temp`/`humidity` columns removed; KPIs live.
- [x] Step 25: **FIXED** â€” Officer lab purity calculated from `labResults.moisture`.
- [x] Step 26: **FIXED** â€” Secretary `disbursePct` live; cycle ID computed from date.
- [x] Step 27: **PARTIALLY FIXED** â€” Lab placeholder values cleaned. TDZ bug in secretary still open (see Â§12).
- [ ] Step 28 (NEW): **OPEN** â€” `useMSP()` hook â€” no `/api/settings` route or data store; `mspValue` is `useState(348)` in secretary, `450`/`380` grade prices hardcoded in farmer
- [ ] Step 29 (NEW): **OPEN** â€” Secretary `â‚¹4.2 crore` subsidy amount is still a hardcoded string literal
- [ ] Step 30 (NEW): **OPEN** â€” `BlockchainMapStamp` in warehouse sidebar has static `utcTime="14:20:15"`
- [ ] Step 31 (NEW): **OPEN** â€” Officer `BlockchainMapStamp` has static `utcTime="10:30:22"`
- [ ] Step 32 (NEW): **OPEN** â€” Admin `blockHeightBase` may not have the time-increment fix applied (actual code shows simpler formula â€” needs recheck)
- [ ] Step 33 (NEW): **OPEN** â€” Secretary TDZ bug: `disbursePct` referenced before `totalKg`/`dispatchedKg` are declared (line 286 vs 292â€“293)
- [ ] Step 34 (NEW): **OPEN** â€” `HoneyHeader.tsx` notifications are fully hardcoded static strings (batch IDs, sensor readings, etc.)
- [ ] Step 35 (NEW): **OPEN** â€” `enterprise/page.tsx:156` uses `any` casts in DataTable render function
- [ ] Step 36 (NEW): **OPEN** â€” Consumer `BlockchainMapStamp` passes `harvestDate` string as `utcTime` prop (wrong format â€” should be HH:mm:ss)
- [ ] Step 37 (NEW): **OPEN** â€” `recallsApi.create()` type requires `initiatedBy` field but officer page correctly omits it; however `RecallEvent` interface in `types/index.ts:201` has `initiatedBy: string` (non-optional), creating a type mismatch
- [ ] Step 38 (DEFERRED): **OPEN** â€” `Batch.ts` has no exported `IBatch` interface
- [ ] Step 39 (DEFERRED): **OPEN** â€” `kyc.service.ts` / `aadhaar.service.ts` `any` casts not yet reviewed

---

## 11. End-to-End Flow Verification

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
- Model write: `LabResult` upserted; `Batch.status = 'certified'`; `Batch.labResults` subdoc populated
- Blockchain anchor: `anchorLabResultOnChain()` calls `linkLabResult()` on contract
- AuditLog: `{ entityType: 'lab', action: 'publish' }`
- Status: WORKS

**E. Officer Inspects and/or Recalls**
- Approve: `PATCH /api/batches/[id]` with `{ status: 'certified' }` (officer role)
- Recall: `POST /api/recalls` with `{ batchId, tier, reason, affectedKg }` â€” `initiatedBy` is injected server-side from `actor.userId`; no longer required in body
- Model write (recall): `Recall.create(...)`, `Batch.status = 'recalled'`
- Blockchain anchor: `anchorRecallOnChain()` calls `initRecall()` on contract
- AuditLog: `{ entityType: 'recall', action: 'recall', metadata: { batchId, tier, reason } }`
- Status: **FIXED (2026-04-05)** â€” Tested and confirmed

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
- Status: WORKS â€” TESTED: 26 logs, 3 batches exported; CSV + JSON + entity filter verified

---

### Flow Break Summary

| Location | Status | Resolution |
|---|---|---|
| `recall.service.ts:20` | **FIXED 2026-04-05** | Changed `findOne({ id })` to `findOne({ batchId })`. Tested â€” recall creates, batch marked recalled, on-chain hash written. |
| `users/route.ts:25` + `admin/page.tsx:94` | **FIXED 2026-04-05** | Route now returns bare array via `NextResponse.json(users)`. KYC queue correctly populated. |
| `User.ts` schema missing KYC fields | **FIXED 2026-04-05** | Added `kycRejected`, `kycRejectReason`, `kycVerifiedAt`, `isActive` to schema and interface. |
| KYC approval audit logging | **FIXED (already in code)** | `PATCH /api/users/[id]` writes `AuditLog.create(...)` with `action: 'user_updated'`. |
| `useCurrentUser.ts` cookie decoding | **FIXED 2026-04-06** | Replaced client JWT-cookie decoding with `GET /api/auth` session fetch. |
| `rbac.ts` KYC gate bypass | **FIXED 2026-04-06** | Removed broad role exemptions; KYC is now enforced for non-exempt operational roles. |
| `blockchain-relay.ts` lab hash path | **FIXED 2026-04-06** | Removed double-stringification in `anchorLabResultOnChain()`. |
| `batch.service.ts` stale `BIZ_STEP` aliases | **FIXED 2026-04-06** | Replaced legacy keys with active statuses. |
| `recalls/route.ts` validation text | **FIXED 2026-04-06** | Error message no longer claims `initiatedBy` is required. |
| `useBatches` / `useLabResults` / `useRecalls` response parsing | **FIXED 2026-04-06** | Hooks now support both raw array payloads and `{ data: [...] }` wrappers. |
| `batch.service.ts` strip helper ID export | **FIXED 2026-04-06** | Returned documents now include stable `id`. |
| `ServiceWorkerRegistrar` + `public/sw.js` | **FIXED 2026-04-06** | Added dev cache/SW cleanup and network-first document strategy. |
| Warehouse `temp`/`humidity` table columns | **FIXED 2026-04-08** | Columns removed entirely; KPIs now live-derived. |
| Lab fabricated placeholder values | **FIXED 2026-04-08** | `form.moisture \|\| '--'`, `form.hmf \|\| '--'` replace fabricated defaults. |
| Officer lab purity formula | **FIXED 2026-04-08** | Uses `labResults.moisture` from `LabResultsSubdoc`. |
| Secretary `CYCLE-2024-Q1` hardcoded | **FIXED 2026-04-08** | Dynamic from `new Date()`. |
| Secretary `disbursePct` hardcoded `82` | **FIXED 2026-04-08** | Live computation â€” BUT TDZ bug still present (declaration order). |

---

## 12. Known Issues and Tech Debt

### Critical

| File | Issue | Status |
|---|---|---|
| `HoneyHeader.tsx:221` | **Security â€” logout does not clear session cookie.** `confirmLogout()` calls `router.push("/")` only. `DELETE /api/auth` is never called, so `honeytrace_token` + `honeytrace_role` httpOnly cookies persist for up to 8 h after the user clicks "Sign Out". Any direct API call with the stale cookie will still authenticate. Fix: `await authApi.logout()` before `router.push`. | **OPEN** |

### High

| File | Issue | Status |
|---|---|---|
| `secretary/page.tsx:286` | **TDZ bug**: `disbursePct` is declared on line 286 using `totalKg` (line 292) and `dispatchedKg` (line 293) which are declared **after** it. This causes a ReferenceError at runtime in strict mode. | **OPEN** â€” Fix: move `const totalKg` and `const dispatchedKg` declarations above line 286 |
| `recallsApi.create()` type | `RecallEvent.initiatedBy` is `string` (non-optional) in `types/index.ts:201` but officer page correctly omits it from the POST body. The `recallsApi.create()` type uses `Omit<RecallEvent, 'id' \| 'initiatedAt'>` which still requires `initiatedBy`. This causes a TS compile error. | **OPEN** â€” Fix: change `RecallEvent.initiatedBy` to `initiatedBy?: string` |

### Medium

| File | Issue | Status |
|---|---|---|
| `secretary/page.tsx:473` | `â‚¹4.2 crore` subsidy amount and district performance percentages (`+14.2%`, `High`) are static string literals in JSX | **OPEN** |
| `warehouse/page.tsx:260` | Temperature tile formula `20 + (avgMoisture - 17) * 0.8` is a proxy heuristic, not real telemetry. Labeled as avg_temp which is misleading. | **OPEN** â€” No IoT sensor API integrated |
| `warehouse/page.tsx:282` | Humidity tile formula `45 + avgMoisture` is similarly a proxy. Bar chart sparkline `[40,70,45,90,65,80,50,85]` is hardcoded. | **OPEN** |
| `warehouse/page.tsx:396` | `BlockchainMapStamp` has static `utcTime="14:20:15"` | **OPEN** â€” Fix: `utcTime={new Date().toISOString().substring(11,19)}` |
| `officer/page.tsx:305` | `BlockchainMapStamp` has static `utcTime="10:30:22"` | **OPEN** â€” Fix: `utcTime={new Date().toISOString().substring(11,19)}` |
| `consumer/page.tsx:327` | `BlockchainMapStamp` receives `harvestDate` string as `utcTime` prop â€” format should be `HH:mm:ss` not ISO date | **OPEN** â€” Fix: derive time portion from `harvestDate` or use `new Date().toISOString().substring(11,19)` |
| `officer/page.tsx:110` | `comparisonDelta` uses `Math.max(0, 20 - comparisonBatch.moisturePct)` which is a crude Codex-limit proxy, not a real lab-vs-field purity variance | **OPEN** â€” Deferred until lab-vs-field comparison logic is defined |
| `HoneyHeader.tsx:39` | All `ROLE_NOTIFICATIONS` content is hardcoded static mock data (batch IDs, sensor readings, timestamps) | **OPEN** â€” No real notification feed |
| `enterprise/page.tsx:156` | DataTable render callback uses `any` casts: `(... ): any) =>` | **OPEN** â€” Carbon/TS typing issue |
| `officer/page.tsx:87` | **Flag action creates recall with `affectedKg: 0`.** The inline `recallsApi.create()` call in the audit-table "flag" path hardcodes `affectedKg: 0`, creating orphaned recall records with no weight data in admin/secretary dashboards. Fix: open `RecallManagementModal` instead of calling `recallsApi.create()` directly. | **OPEN** |
| `lab/page.tsx:364` (also `farmer/page.tsx`, `officer/page.tsx`) | **`<EmptyState>` rendered directly inside `<TableBody>` â€” invalid HTML.** `<TableBody>` must contain only `<TableRow>` children. A bare `<div>` / `<p>` causes React hydration warnings and broken Carbon table layout. Fix: wrap in `<TableRow><TableCell colSpan={headers.length}>â€¦</TableCell></TableRow>`. | **OPEN** |
| `admin/page.tsx:329` | `blockHeightBase` â€” task description says time-increment was added but actual code is `452000 + batches.length + recalls.length` without `Date.now()` delta | **OPEN** â€” Needs the documented formula applied |
| `farmer/page.tsx:183` | `estimatedValue` uses hardcoded MSP prices `450`/`380` | **OPEN** â€” Deferred; no `useMSP()` or `/api/settings` |
| `secretary/page.tsx:284` | `mspValue` initialises at `useState(348)` with no persistence | **OPEN** â€” No `/api/settings` |

### Low

- `any` casts in `kyc.service.ts` and `aadhaar.service.ts` not audited
- `Batch.ts` has no exported TypeScript `IBatch` interface
- `recallsApi.create()` typed return in `api.ts:103â€“104` uses `Omit<RecallEvent, 'id' | 'initiatedAt'>` which still requires `initiatedBy` â€” type-safe callers cannot omit it cleanly
- `api.ts:30`: URL construction ternary `path.startsWith('http') ? path : path` is a no-op (both branches assign `path`). Harmless with current relative-path callers but dead code that obscures intended base-URL logic.
- Playwright test coverage is unclear; `/test/` and `/tests/` both exist
- `useBatches` refresh triggers a full re-fetch but does not debounce rapid consecutive refresh calls (could cause redundant API requests on fast UI mutations)
- `warehouse/page.tsx:412`: hardcoded `{ id: 'B001' }` in `tDashboard('receipt_desc', { id: 'B001' })` â€” not wired to `latestBatch`

---

## 13. Type Structure Summary (src/types/index.ts)

```
LabResultsSubdoc          â€” inline subdoc stored on Batch document
  moisture?:    number    â€” lab moisture reading (distinct from Batch.moisturePct)
  hmf?:         number
  antibiotics?: number
  pesticides?:  number
  passed?:      boolean   â€” Codex overall pass/fail

Batch
  id:           string    â€” MongoDB _id serialised
  batchId:      string    â€” HT-YYYYMMDD-NNN display key
  moisturePct:  number    â€” FARMER's field reading
  labResults?:  LabResultsSubdoc   â€” written by lab.service.ts after certification
  ...

LabResult                 â€” full LabResult collection document
  moisture:     number    â€” LAB's instrument reading (used in purity formula)
  ...

RecallEvent
  initiatedBy:  string    â€” NON-OPTIONAL â€” type mismatch with api.ts omit logic (BUG)
  ...
```

**Key distinction**: `Batch.moisturePct` (farmer's field reading) vs `Batch.labResults.moisture` (lab instrument reading) vs `LabResult.moisture` (same lab reading in the separate collection). The officer dashboard correctly separates these post-patch.

---

## 14. Seeded Test Accounts

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

## Appendix: Key File Map

```
src/
  app/
    [locale]/
      layout.tsx                  # Wraps locale pages; sets html lang
      page.tsx                    # Locale landing page renders <LoginPortal />
      dashboard/
        admin/page.tsx            # KYC queue, stats, node mgmt, recalls
        farmer/page.tsx           # Harvest form, batch table, GPS, weather, map stamp
        warehouse/page.tsx        # Incoming/dispatch modals, storage grid (no temp/humidity in table)
        lab/page.tsx              # Full Codex test form, queue table
        officer/page.tsx          # Audit table, approve/flag, recall
        enterprise/page.tsx       # Dispatched batch table, certificate modal
        consumer/page.tsx         # QR scanner, batch lookup, timeline
        secretary/page.tsx        # KYC queue, heatmap, macro stats, subsidy tracker
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
      users/route.ts              # GET list (admin/secretary) â€” returns bare array
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
    useBatches.ts                 # GET /api/batches with refresh(); handles both array and {data:[]} shapes
    useCurrentUser.ts             # Fetches current session actor via GET /api/auth
    useLabResults.ts              # GET /api/lab; handles both array and {data:[]} shapes
    useOfflineSync.ts             # Service worker offline queue notifications
    useOnboarding.ts              # KYC/tour flow localStorage state
    useRecalls.ts                 # GET /api/recalls; handles both array and {data:[]} shapes
    useWallet.ts                  # MetaMask connect/disconnect
  components/
    Auth/                         # Login form, demo credentials
    Blockchain/                   # BlockchainStatusBanner
    Map/ProductionHeatMap.tsx     # react-leaflet heatmap (Secretary dashboard)
    Navigation/UnifiedDashboardLayout.tsx
    Navigation/HoneyHeader.tsx    # Carbon Header with role detection, static mock notifications
    Notifications/                # Toast system
    Onboarding/                   # GuidedTour, IdentityVerificationModal, SimplifiedFarmerOnboarding
    Traceability/                 # BlockchainCertificate, CTETimeline, QRScanner, RecallManagementModal, BlockchainMapStamp, PriorStepQR
    EmptyState.tsx
    ErrorBoundary.tsx             # React class ErrorBoundary
  types/
    index.ts                      # Canonical shared domain types: Batch, LabResult, LabResultsSubdoc, RecallEvent, User, etc.
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

