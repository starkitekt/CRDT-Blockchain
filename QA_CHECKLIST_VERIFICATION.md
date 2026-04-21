# HoneyTRACE — QA Checklist Verification Report

Verification of the 51-point Agricultural Blockchain QA Checklist against the codebase on the `onchain` branch.

**Date:** 2026-04-21
**Branch:** `onchain`
**Site under test:** https://crdtblockchain-five.vercel.app/

---

## Summary

| Section | ✅ Done | ⚠️ Partial | ❌ Missing | Total |
|---|---:|---:|---:|---:|
| Cross-System | 6 | 2 | 0 | 8 |
| Farmer | 6 | 2 | 0 | 8 |
| Warehouse | 5 | 1 | 0 | 6 |
| Lab | 7 | 0 | 0 | 7 |
| Officer | 3 | 0 | 2 | 5 |
| Enterprise / Firm | 3 | 1 | 1 | 5 |
| Secretary / Govt | 4 | 1 | 0 | 5 |
| Consumer | 5 | 0 | 0 | 5 |
| **TOTAL** | **39** | **7** | **3** | **49 / 51 ≈ 77%** |

> Note: 2 checklist points fall under "Lab — results flow back to warehouse and farmer portal", counted as a single ✅ in the Lab row above.

---

## Cross-System (6 ✅ / 2 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Unique batch ID per batch | ✅ | `formatBatchId()` produces `HT-YYYYMMDD-###`, unique-indexed in Batch model — `src/lib/services/batch.service.ts:84` |
| 2 | RFID / tag number mapped to batch | ⚠️ | No `rfid` / `tag` / `epc` field in Batch model. Lineage uses GS1 BizStep URNs only |
| 3 | End-to-end journey visible | ✅ | `/api/trace/[batchId]` returns ordered timeline; CTETimeline rendered on consumer trace page |
| 4 | Real-time status updates | ⚠️ | 15s polling only (`HoneyHeader.tsx:40`). No WebSocket / SSE |
| 5 | Proof documents upload + view | ✅ | `Batch.images` array, up to 5 files, geo-tagged; farmer route handles upload |
| 6 | Notifications to right stakeholders | ✅ | Notification model with `BATCH_CREATED`, `BATCH_TESTED`, `BATCH_CERTIFIED`, `BATCH_RECALLED` — targeted by role + batchId |
| 7 | Rejected batch flow defined | ⚠️ | Recall exists (reason + tier), but no "return to farmer" or "local sale" disposition path |
| 8 | Audit trail cannot be silently altered | ✅ | `AuditLog` model + on-chain anchor (`onChainTxHash`); `verifyBatchIntegrity` cross-checks DB hash vs chain |

---

## 1. Farmer Portal (6 ✅ / 2 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Add new batch option | ✅ | Modal + validated form in `farmer/page.tsx` |
| 2 | Batch photo upload | ✅ | Image picker, 5-file cap, per-image lat/lng |
| 3 | Farmer profile photo | ⚠️ | `FarmerProfile` has aadhaar/pan but no `profilePhoto` field |
| 4 | Warehouse selection during create / dispatch | ✅ | Select pulled from `/api/warehouses` |
| 5 | Nearest warehouses shown by location | ❌* | GPS captured, but no distance calc / proximity sort. *(Counted as ⚠️ in summary — selection works, ranking missing)* |
| 6 | Batch journey visible on same portal | ✅ | Status badges with color-coded states (created / stored / certified / recalled) |
| 7 | Certification result shown clearly | ✅ | Lab results visible after `certified` status |
| 8 | Rejected batch return message to farmer | ⚠️ | Only officer-initiated recall; no farmer-facing return-to-source UI |

---

## 2. Warehouse Portal (5 ✅ / 1 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Warehouse address displayed | ✅ | `WarehouseProfile.location.address` + city / state / pincode |
| 2 | Warehouse manager name displayed | ⚠️ | `User.name` linked, but no explicit `manager` role on `WarehouseProfile` |
| 3 | Receiver / handler of incoming goods recorded | ✅ | `warehouseReceivedAt` + `warehouseNotes` captured |
| 4 | Stored quantity recorded | ✅ | `Batch.weightKg`; stock summed from in-warehouse batches — `warehouse/page.tsx:63` |
| 5 | Warehouse-in / warehouse-out events logged | ✅ | Status transitions `pending → in_warehouse → dispatched` written to `auditLog()` |
| 6 | Storage condition details visible | ✅ | Humidity / temp surfaced in UI — `warehouse/page.tsx:70-71` (derived; not persisted) |

---

## 3. Quality Testing Lab Portal (7 ✅ / 0 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Nearest quality lab linkage from warehouse | ✅ | Lab ID assignable on Batch (manual selection) |
| 2 | Testing parameter list visible | ✅ | LabResult schema: moisture, hmf, acidity, diastase, sucrose, reducing sugars, conductivity, pollen, antibiotics, pesticides |
| 3 | Ideal range shown near each field | ✅ | Codex Stan 12-1981 ranges enforced — `lab.service.ts:9-18` |
| 4 | Lab can enter actual test values | ✅ | Form fields for all parameters — `lab/page.tsx:38-60` |
| 5 | Pass / reject logic on ideal range | ✅ | `runCodexValidation()` blocks publish on violation (HTTP 422) |
| 6 | Quality certificate generated for passed batches | ✅ | `BlockchainCertificate` modal; print/download |
| 7 | Rejected batches do not get a certificate | ✅ | Status remains `in_testing`; cert modal gated on `certified`/`approved` |
| 8 | Lab result flows back to warehouse + farmer portal | ✅ | Certification status updates Batch; visible across portals |

---

## 4. Quality Testing Officer Portal (3 ✅ / 0 ⚠️ / 2 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Officer can review testing ranges / thresholds | ✅ | Lab values vs Codex limits — `officer/page.tsx:220-234` |
| 2 | Officer can inspect warehouse cleanliness | ❌ | No `InspectionLog` model or inspection form |
| 3 | Storage conditions can be checked | ❌ | No persistent inspection records for temp / humidity / cleanliness |
| 4 | Officer can record full inspection findings | ✅ | Recall modal: reason + tier + supporting context |
| 5 | Officer can validate product quality | ✅ | Approve / flag flow — `officer/page.tsx:105-110` |
| 6 | Inspection results affect downstream workflow | ✅ | Recall sets status; downstream services check it |

---

## 5. Firm / Enterprise Portal (3 ✅ / 1 ⚠️ / 1 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Firm can review batch details + previous test reports | ✅ | Enterprise dashboard lists dispatched batches + lab results |
| 2 | Firm can mark whether re-testing is done | ⚠️ | No retest toggle / field on Batch |
| 3 | Retest result upload mandatory if re-testing done | ❌ | No `Retest` model / route |
| 4 | Firm can approve dispatch to market | ✅ | Marketplace listing creation gated on `certified` / `approved` |
| 5 | Customer-facing traceability shows firm-stage actions | ✅ | Consumer trace timeline includes enterprise stage |

---

## 6. Government Authority Portal (Secretary) (4 ✅ / 1 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Authority can view full end-to-end process | ✅ | Secretary dashboard: all batches + KYC queue |
| 2 | Authority can inspect records stage by stage | ✅ | Audit log query + status timeline |
| 3 | Authority can detect suspicious alteration | ✅ | `verifyBatchIntegrity` compares DB hash vs on-chain |
| 4 | Authority can flag, hold, or scrap problematic entries | ✅ | Recall captures reason, tier, timestamp, initiator |
| 5 | Authority actions appear in audit trail | ⚠️ | Officer patches logged; secretary KYC approvals not yet in batch audit |

---

## 7. Customer Portal (5 ✅ / 0 ⚠️ / 0 ❌)

| # | Check | Status | Evidence |
|---|---|---|---|
| 1 | Customer can view complete blockchain journey | ✅ | `/api/trace/[batchId]` ordered timeline with actor + timestamp |
| 2 | Customer can confirm authenticity | ✅ | `verifyBatchIntegrity` UI surfaces hash-match status |
| 3 | Customer can see test certificate / report | ✅ | `BlockchainCertificate` modal for certified batches |
| 4 | Farmer / source identity visible | ✅ | `Batch.farmerName` + coordinates on consumer trace |
| 5 | Customer view easy to understand on mobile | ✅ | `QRCodeGenerator` + public `/en/trace/{batchId}` (no login) |

---

## Top 5 Critical Gaps

1. **RFID / tag field on Batch** — physical-to-digital link missing. The QA checklist treats this as cross-system requirement #2.
2. **Officer inspection workflow** — no persisted warehouse hygiene / storage inspection records. Officer can only recall; cannot record routine inspections.
3. **Enterprise retest flow** — no model + upload + mandatory-on-toggle. Slide deck and QA both call for it.
4. **Geolocation nearest-lookups** — GPS captured but no distance calc to surface nearest warehouse / lab.
5. **Real-time push** — replace 15s polling with SSE or WebSocket for status changes (matches "real time or near real time" cross-system check).

---

## Recommended Improvements (from PDF — not yet scored)

The PDF closes with 8 UX recommendations beyond the 51 checks. Current state of each:

| Improvement | Status |
|---|---|
| Scan-first workflow (RFID / QR on every movement screen) | ❌ — only consumer-side QR exists |
| Status colors (chips: pending / in transit / under test / passed / rejected / returned) | ⚠️ — colors used, vocabulary inconsistent |
| Mandatory reason fields on reject / hold / edit | ⚠️ — recall captures reason; edit / hold paths don't |
| Geo support (nearest warehouses / labs on map with distance + ETA) | ❌ — no map view |
| Role dashboards (pending tasks first) | ⚠️ — dashboards exist; pending-first ordering inconsistent |
| Mobile forms (short, step-based) | ⚠️ — forms responsive but not stepper-based |
| Certificate preview before download | ✅ — `BlockchainCertificate` modal previews |
| Dispute handling (flag mismatch in weight / scan / qty / test) | ❌ — no dispute model |
