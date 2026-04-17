# HoneyTRACE Project Full Audit

Date: 2026-04-17  
Updated: 2026-04-17 (registration + capacity + public trace UX + profile merge fix)  
Scope: Full repository audit (frontend + backend + blockchain) via code inspection.

## 1. System Overview

HoneyTRACE is a MERN + Next.js + Solidity supply-chain tracking platform for honey lifecycle management.

Core flow in code:
- Farmer creates batch (with warehouse selection + image uploads + GPS tags).
- Warehouse receives/stores.
- Lab tests batch.
- Officer approves/rejects (and can trigger recall).
- Enterprise/consumer trace lifecycle.
- Secretary/Admin manage KYC approvals.
- Blockchain relay anchors batch/lab/recall hashes on configured network.

## 2. Feature Coverage (Current Status)

- Authentication + RBAC: **Working**
  - Cookie + bearer auth supported.
  - Role-based route restrictions implemented.
  - Files: `src/app/api/auth/route.ts`, `src/lib/rbac.ts`, `src/middleware.ts`

- KYC gating (except exempt roles): **Working**
  - Exempt roles in code: `admin`, `secretary`, `consumer`.
  - Non-exempt users blocked until KYC approved.
  - Files: `src/lib/rbac.ts`, `src/components/Navigation/UnifiedDashboardLayout.tsx`

- Farmer batch creation: **Working**
  - Multipart form-data support.
  - Warehouse required and validated.
  - Image upload validation (type/size/count).
  - GPS tagging for uploaded images.
  - Files: `src/app/api/batches/route.ts`, `src/lib/services/batch.service.ts`, `src/lib/models/Batch.ts`, `src/app/[locale]/dashboard/farmer/page.tsx`

- Warehouse selection + capacity visibility: **Working**
  - Warehouse list endpoint available.
  - Dropdown now shows capacity context (remaining/total) where data exists.
  - Files: `src/app/api/warehouses/route.ts`, `src/app/[locale]/dashboard/farmer/page.tsx`

- Notification system: **Working**
  - Persistent model + APIs.
  - Strict targeting on batch create to selected warehouse only.
  - Read/mark-all-read APIs.
  - Polling-based UI updates.
  - Files: `src/lib/models/Notification.ts`, `src/app/api/notifications/route.ts`, `src/app/api/notifications/read/route.ts`, `src/components/Navigation/HoneyHeader.tsx`

- Lab testing + codex validation: **Working**
  - Validation and publish flow implemented.
  - Batch status updated to `in_testing`.
  - Files: `src/app/api/lab/route.ts`, `src/lib/services/lab.service.ts`

- Recall flow: **Working**
  - Officer/admin initiation.
  - Batch status moves to recalled.
  - Blockchain recall anchor integrated.
  - Files: `src/app/api/recalls/route.ts`, `src/lib/services/recall.service.ts`

- Trace/QR tracking: **Working**
  - Public trace endpoint exists.
  - Timeline + blockchain consistency data returned.
  - QR code generation and scanner components exist.
  - Dedicated public tracking page available at `/{locale}/track` (batch ID + QR input, no login).
  - Landing page includes direct CTA button to the public tracking page.
  - Files: `src/app/api/trace/[batchId]/route.ts`, `src/components/Traceability/*`

- Blockchain integration: **Working with graceful fallback**
  - Relay anchors key events.
  - If relay env vars missing, DB flow still works.
  - Files: `src/lib/blockchain-relay.ts`, `src/lib/services/batch.service.ts`, `src/lib/services/lab.service.ts`, `src/lib/services/recall.service.ts`, `contracts/HoneyTraceRegistry.sol`

- Role-specific onboarding profiles: **Working**
  - `/api/auth/register` creates role-specific profile collections.
  - `/api/register` now bridges to role-based onboarding logic for backward compatibility.
  - Files: `src/app/api/auth/register/route.ts`, `src/app/api/register/route.ts`

## 3. Confirmed Existing Bugs / Gaps

### High Priority

No open high-priority items.

### Medium Priority

1. Deprecated Mongoose option in lab upsert
- Issue: `findOneAndUpdate(..., { upsert: true, new: true })` still used.
- Impact: runtime warning; future compatibility risk.
- File: `src/lib/services/lab.service.ts`

2. Status vocabulary drift across modules
- Issue: Both canonical statuses (`created/stored/certified/...`) and legacy aliases (`pending/in_warehouse/in_testing`) are active.
- Impact: extra mapping complexity and potential reporting/analytics inconsistency.
- Files:
  - `src/lib/models/Batch.ts`
  - `src/lib/services/batch.service.ts`
  - `src/lib/validation/batch.schema.ts`

3. Notification semantic mismatch for `stored`
- Issue: `stored` maps to notification type `BATCH_TESTED` with title "Batch Stored".
- Impact: event naming ambiguity in client analytics and user messaging.
- File: `src/lib/services/batch.service.ts`

### Low Priority

No open low-priority items.

## 4. End-to-End User Flow (Full Working)

### A. Registration & Login
1. User signs up from landing/login portal.
2. Preferred path: `POST /api/auth/register` (role-aware + profile write).
3. User receives token and then signs in via `POST /api/auth`.
4. Cookies set: `honeytrace_token`, `honeytrace_role`.
5. KYC gate applies for non-exempt roles.

### B. KYC Approval
1. Secretary/Admin review pending users (`GET /api/users?kycCompleted=false`).
2. Approve/reject via `PATCH /api/users/:id`.
3. On approval, non-exempt users can access role dashboards.

### C. Farmer Flow
1. Farmer opens dashboard and creates batch.
2. Form requires warehouse selection, validates images and constraints.
3. Batch submitted to `POST /api/batches` as multipart form-data.
4. Backend stores batch, images, GPS tags, warehouse assignment.
5. Notification sent only to selected warehouse.
6. Farmer ledger shows batch + status + View Journey button.

### D. Warehouse Flow
1. Warehouse logs in and sees assigned/incoming stock from batch list.
2. Warehouse updates batch status/storage through patch APIs.
3. Status transitions are validated in service layer.

### E. Lab Flow
1. Lab submits test results (`POST /api/lab`).
2. Codex validation runs.
3. Batch moves to `in_testing`; lab result persisted and optionally anchored.

### F. Officer Flow
1. Officer reviews tested batches and decides next status (`approved` or recall path).
2. If recall required, officer initiates `POST /api/recalls`.
3. Recall updates batch + audit + chain anchor.

### G. Enterprise/Consumer Trace Flow
1. Public user enters flow via landing CTA to `/{locale}/track` (no login).
2. User provides batch ID or scans QR; app routes to `/[locale]/trace/[batchId]`.
3. Trace page fetches `GET /api/trace/:batchId`.
4. Response includes batch details, timeline, blockchain verification state, warehouse/testing/officer data.

### H. Notifications Flow
1. User dashboard header polls `GET /api/notifications`.
2. Bell shows unread count and list.
3. Click item => mark read and route to trace page if `batchId` exists.
4. `PATCH /api/notifications/read` supports single/all read updates.

## 5. Blockchain Working Model

- Contract: `HoneyTraceRegistry.sol`.
- Server relay writes:
  - Batch anchor (`recordBatch`) at key lifecycle points.
  - Lab hash (`linkLabResult`).
  - Recall event (`initRecall`).
- Trace endpoint compares DB anchor hash vs chain hash for tamper signal.

## 6. Stability & Regression Risk Notes

- Core business flows (batch/lab/recall/trace/notifications) are implemented and integrated.
- Public trace UX is now improved and consistent with project styling on both `/track` and `/trace/[batchId]`.
- Main data-consistency risk is mixed legacy + canonical status vocabulary.
- Main API consistency risk is `/api/profile` not merging role-profile collections.

## 7. Recommended Next Fix Order

1. Replace deprecated `new: true` usage in lab upsert with `returnDocument: 'after'`.
2. Normalize status vocabulary at API boundaries while keeping backward compatibility.
3. Align stored-notification event naming (`BATCH_STORED` vs `BATCH_TESTED` semantics).

## 8. Resolved Items

1. Registration endpoint inconsistency (resolved on 2026-04-17)
- Fix: `POST /api/register` now forwards to `POST /api/auth/register` (role-aware onboarding path), with legacy payload normalization.
- Result: role profile collections are consistently created regardless of which public registration endpoint is used.
- File: `src/app/api/register/route.ts`

2. Warehouse capacity fallback gap (resolved on 2026-04-17)
- Fix: `GET /api/warehouses` now computes capacity fallback for warehouses missing profile/legacy capacity fields using active assigned load and configurable default capacity.
- Result: farmers see capacity values for all warehouses in dropdown (`totalCapacity` / `remainingCapacity`) instead of `Capacity NA`.
- File: `src/app/api/warehouses/route.ts`

3. Public trace entry UX (resolved on 2026-04-17)
- Fix: added dedicated `/{locale}/track` page with batch ID and QR lookup; landing page now routes users there via direct "Track Product Journey" CTA.
- Result: no-login trace path is clear, discoverable, and end-to-end (landing → track → trace detail).
- Files:
  - `src/components/Landing/LandingPage.tsx`
  - `src/app/[locale]/track/page.tsx`
  - `src/app/[locale]/trace/[batchId]/page.tsx`

4. Profile merge gap in `/api/profile` (resolved on 2026-04-17)
- Fix: `GET /api/profile` now loads role-specific profile collection data and returns it as `roleProfile`, with Aadhaar masked.
- Result: onboarding data stored in role collections is now retrievable from the profile API without breaking existing fields.
- File: `src/app/api/profile/route.ts`
