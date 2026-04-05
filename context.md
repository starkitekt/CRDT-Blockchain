# HoneyTrace — Project Context
> **Single source of truth for any developer or AI assistant picking up this codebase.**
> Generated: 2026-04-05 · Last updated: 2026-04-05 (patch round) · Audited against every file in `src/` and `scripts/`.

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
| Rate Limiting | In-memory sliding window (`src/lib/rateLimit.ts`) | 10 attempts / 15 min per IP |
| Styling | Tailwind CSS 4 + Carbon tokens + `globals.css` | Custom CSS vars: `--color-primary`, `--spacing-*`, etc. |
| Testing | Vitest (unit) + Playwright (e2e) + Hardhat Mocha (contracts) | |

---

## 3. Environment Variables (keys only)

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

## 4. Data Models (schema summary per model)

### 4.1 User — src/lib/models/User.ts

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

### 4.2 Batch — src/lib/models/Batch.ts

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
| `recallReason/recallTier/recallInitiatedAt/recallTxHash` | mixed | set on recall |

> **Blockchain anchor points:** Creation (`pending`) + status transitions matching `ANCHOR_ON_STATUS` set in `batch.service.ts:23`: `certified`, `in_warehouse`, `dispatched`, `recalled`.

---

### 4.3 LabResult — src/lib/models/LabResult.ts

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

### 4.4 Recall — src/lib/models/Recall.ts

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

> FIXED (2026-04-05): `recall.service.ts:20` now correctly uses `Batch.findOne({ batchId: input.batchId })`. Tested — recall creation succeeds; batch status transitions to `recalled`; on-chain anchor writes `onChainTxHash`. See test evidence in §7 Step 16.

---

### 4.5 AuditLog — src/lib/models/AuditLog.ts

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

### 4.6 Counter — src/lib/models/Counter.ts

Used by `getNextSeq('batch')` to generate sequential `batchId` numbers atomically.

---

## 5. API Routes Reference

> Auth column: roles that can call this endpoint. `public` = no auth required.

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth` | public | Login; sets `honeytrace_token` + `honeytrace_role` cookies; rate-limited |
| DELETE | `/api/auth` | cookie clear | Logout; deletes both cookies |
| POST | `/api/auth/register` | public | Register new user with role-specific field validation (Zod AnyUserSchema) |
| GET | `/api/health` | public | MongoDB ping health check |
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
| PATCH | `/api/users/[id]` | admin/secretary | Approve/reject KYC; sets `kycCompleted=true`/`kycVerifiedAt` or `kycRejected=true`/`kycRejectReason` |
| GET | `/api/admin/export` | admin | Export audit ledger; `?format=csv/json&entity=batch/lab/kyc&from=ISO&to=ISO` |
| POST | `/api/kyc/aadhaar/initiate` | authenticated | Initiate Aadhaar OTP |
| POST | `/api/kyc/aadhaar/verify` | authenticated | Verify OTP; writes aadhaarVerified data |

> NOTE: `/api/register` directory exists but is unused. Registration is at `/api/auth/register/route.ts`.

---

## 6. Frontend-Backend Wiring Audit

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
| `lib/api.ts:110` | DELETE | `/api/auth` | YES | YES DELETE | WIRED |
| `warehouse/page.tsx:131` | — | "Manage Transfers" onClick | — | — | UNWIRED (empty handler) |

**Routes that exist but are never called from the frontend:**

| Route | Note |
|---|---|
| `GET /api/health` | Infrastructure only |
| `POST /api/kyc/aadhaar/initiate` | Backend implemented; no frontend UI wires to it |
| `POST /api/kyc/aadhaar/verify` | Same as above |
| `POST /api/auth/register` | Backend exists; no register form in production UI |

---

## 7. Completed Steps and Test Results

| # | Step | What was built | Test result |
|---|---|---|---|
| 01 | MongoDB + Mongoose | `connectDB()` singleton in `src/lib/mongodb.ts`; global cache | PASS: `GET /api/health` returns `{"status":"ok","db":"connected"}` |
| 02 | User model + Zod schemas | `User.ts` with 8-role flat schema; `user.schema.ts` with `AnyUserSchema` | PASS: Schema validation runs in seed script |
| 03 | Auth service | `auth.service.ts`: bcrypt timing-safe compare, `signToken()`, audit log fire-and-forget | PASS: Login returns 403 for wrong role, 401 for bad password |
| 04 | POST /api/auth | Login endpoint; httpOnly cookie set; rate limiter (10 req/15 min) | PASS: Cookie set; 429 after burst |
| 05 | POST /api/auth/register | Role-specific field validation; duplicate email check | PASS: 409 on duplicate; 400 for invalid fields |
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

---

## 8. Remaining Work Checklist

- [x] Step 21: **FIXED** — `recall.service.ts:20`: `findOne({ id: ... })` → `findOne({ batchId: ... })`. Recall creation now works end-to-end. **Tested 2026-04-05.**
- [x] Step 22: **FIXED** — `User.ts` schema now includes `kycRejected: Boolean (default false)`, `kycRejectReason: String`, `kycVerifiedAt: Date`, `isActive: Boolean (default true)`. All four fields are now typed, indexed-eligible, and in the Mongoose document interface.
- [x] Step 23: **FIXED** — `users/route.ts:25` now returns `NextResponse.json(users)` (bare array) instead of `NextResponse.json({ data: users })`. Admin and Secretary KYC queues now receive the correct data structure.
- [ ] Step 24: Warehouse dashboard — replace hardcoded sensor tiles: temperature (22.4°C), humidity (58%), dispatched kg (450), storage rack grid (hardcoded indices `[2,5,8,12]`), `PriorStepQR batchId="BATCH-001"`. **Also add `initiatedBy` field removal from officer recall flow** — the field is now injected server-side from JWT; the officer dashboard still passes it explicitly (line 91 in officer/page.tsx) which is now redundant but harmless.
- [ ] Step 24b: Recall schema — `initiatedBy` is now `optional()` in `CreateRecallSchema`. The route always overrides it with `actor.userId` from JWT. The officer dashboard still sends a client-supplied value in the body (line 91); this is silently overridden. Consider removing it from the officer form payload to avoid confusion.
- [ ] Step 25: Officer dashboard — replace hardcoded comparison hub (Batch-1204 mock), fix template literal `"${currentUser.userId}"` rendering as literal text (line 309), fix sidebar approve/flag buttons using hardcoded IDs.
- [ ] Step 26: Lab dashboard — add `onClick` handler to "New Sample" button (`lab/page.tsx:175`). Currently no-op.
- [ ] Step 27: Secretary dashboard — wire "Export MIS" and "Update MSP" header buttons + "Disburse Funds" button; replace hardcoded macro stats (450.2 tons, 1,24,500 farmers, etc.) with real API data.
- [ ] Step 28: Admin dashboard — replace hardcoded "Node Management" table (Himalayan Valley #4, Central Processing Hub) with real data or remove.
- [ ] Step 29: Farmer dashboard — weather tile (hardcoded 28°C / 42% RH) needs weather API; `PriorStepQR` should use most recent batch ID, not hardcoded `"REG-2024-001"`.
- [ ] Step 30: Fix `useCurrentUser.ts` — `useMemo([])` empty dep array does not re-read cookie after login/logout transitions. Use Zustand store or add cookie dependency.
- [ ] Step 31: Add KYC audit logging — `PATCH /api/users/[id]` approve/reject does not call `auditLog()`. Admin KYC decisions are invisible in the audit trail.
- [ ] Step 32: Verify `blockchain-relay.ts:52-53` double-stringification bug in `anchorLabResultOnChain()` — `keccakHash(stablePayload)` where `stablePayload` is already a JSON string, then `keccakHash` re-stringifies it. Hash will differ from `computeChainHash()` in `batch.service.ts`.
- [ ] Step 33: Wire Aadhaar KYC frontend — `POST /api/kyc/aadhaar/initiate` and `/verify` are implemented in the backend but `IdentityVerificationModal` uses a local mock flow; wire to real endpoints.
- [ ] Step 34: Register UI — `POST /api/auth/register` is implemented but there is no registration form in the production frontend. Add or confirm it is intentionally excluded.
- [ ] Step 35: Address TypeScript `any` casts in `stripInternal()` helpers across all services + `LabResult.ts`/`Recall.ts` `toJSON` transforms.

---

## 9. End-to-End Flow Verification

### Happy-path: Honey Batch from Farm to Consumer

**A. Farmer Registration + KYC**
- API: `POST /api/auth/register` saves user with `kycCompleted: false`
- Admin/Secretary approves: `PATCH /api/users/[id]` sets `kycCompleted: true`
- AuditLog: NOT recorded for KYC approval (gap — no `auditLog()` call in PATCH /api/users/[id])
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
- Status: WORKS (note double-stringification bug in Step 32 affects hash consistency)

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
| KYC approval audit logging | **STILL OPEN** | No `auditLog()` in `PATCH /api/users/[id]`. Admin KYC decisions not in audit trail. See Step 31. |

---

## 10. Seeded Test Accounts

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

## 11. Known Issues and Tech Debt

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
| `useCurrentUser.ts` | `useMemo([])` empty dep array — does not re-read cookie on login/logout transitions | OPEN |
| `officer/page.tsx:309` | `"${currentUser.userId}"` inside JSX string renders as literal text, not interpolated value | OPEN |
| Multiple dashboards | Sensor/node/production stat tiles are all hardcoded mocks | OPEN |

### Medium

| File | Issue | Status |
|---|---|---|
| `admin/page.tsx` + `PATCH /api/users/[id]` | KYC audit logging missing — approvals/rejections have no AuditLog entry | OPEN (Step 31) |
| `lab/page.tsx:175` | "New Sample" button has no onClick handler | OPEN (Step 26) |
| `warehouse/page.tsx:131` | "Manage Transfers" button `onClick={() => {}}` is a no-op | OPEN (Step 24) |
| `secretary/page.tsx:321-322` | "Export MIS" and "Update MSP" buttons have no handlers | OPEN (Step 27) |
| `batch.service.ts` | `BIZ_STEP` map has stale aliases (`lab_testing`, `warehouse_stored`) that don't match actual status enum values | OPEN |
| `blockchain-relay.ts:52-53` | `anchorLabResultOnChain()` double-stringifies `stablePayload` — already a JSON string passed to `keccakHash()` which re-stringifies it; hash will differ from `computeChainHash()` in `batch.service.ts` | OPEN (Step 32) |
| `recall.schema.ts` | `initiatedBy` is now optional — route always overrides with `actor.userId` but error message still says "initiatedBy are required" | OPEN (minor — update error message) |

### Low

- `any` casts in `stripInternal()` helpers across all service files
- `VALID_ROLES.includes(role as any)` — use `(VALID_ROLES as readonly string[]).includes(role)`
- Playwright test coverage is unclear; `/test/` and `/tests/` both exist

---

## Appendix: Key File Map

```
src/
  app/
    [locale]/
      layout.tsx                  # Wraps locale pages; sets html lang
      page.tsx                    # Landing page (128 bytes; stub redirect)
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
      auth/route.ts               # POST login / DELETE logout
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
    rateLimit.ts                  # In-memory sliding window rate limiter (10 req/15 min)
    rbac.ts                       # requireAuth() guard; AuthError class; KYC gate
    store.ts                      # Zustand useWalletStore
  hooks/
    useBatches.ts                 # GET /api/batches with refresh()
    useCurrentUser.ts             # Decode JWT payload from cookie (client-side)
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
