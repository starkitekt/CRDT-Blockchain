# Known On-Chain Attribution Bugs

Deferred fixes. Impacts tamper-detection granularity (stage + actor), not the traceability UI.

## Bug 1 — Status-change re-anchors silently revert

**Where:** `contracts/HoneyTraceRegistry.sol:67-70` vs `src/lib/services/batch.service.ts:128-146, 366-389`

**Symptom:** Only the first (harvest) anchor lands on chain. Every subsequent status transition (`stored`, `certified`, `approved`, `dispatched`, `delivered`, `recalled`) reverts as `BATCH_HASH_MISMATCH` and the error is swallowed by the try/catch at `batch.service.ts:270-272, 386-388`.

**Root cause:** The contract enforces `existing.dataHash == dataHash` when a batch is re-anchored, but `buildChainPayload` includes `status` in the hashed object — so every status change produces a different keccak256 and fails the equality check.

**Fix options:**
- Remove the hash-mismatch guard, **or**
- Key storage by `batchId + bizStep` (e.g. `mapping(bytes32 => BatchRecord)` where key = `keccak256(batchId, bizStep)`) so each stage has its own record, **or**
- Append to an array `mapping(string => BatchRecord[])` so the full timeline is preserved in storage (events already preserve it, but this makes `getBatchDetails` return the full trail).

**Acceptance:** After fix, a batch that goes harvest → stored → certified → approved should produce 4 `BatchRecorded` events, each with its own `dataHash`, `timestamp`, `bizStep`, `recorder`. `verifyBatchIntegrity` should be able to check tamper against **any** stage, not just harvest.

---

## Bug 2 — On-chain `recorder` is always the relay wallet, not the real actor

**Where:** `src/lib/blockchain-relay.ts` (single server key holds `ROLE_RECORDER`) vs `contracts/HoneyTraceRegistry.sol:75, 88` (`msg.sender` = relay address for every call).

**Symptom:** Chain shows `recorder = 0x<relay>` for every farmer/warehouse/lab/officer action. Regulator auditing the chain cannot tell which **specific** user recorded a given batch or approved a certificate. Actor identity lives only in Mongo `AuditLog` (`actorUserId`, `actorRole`), which is mutable.

**Fix options (pick one):**
1. **Include `actorUserId` in the hashed payload** — cheapest. Tampering with the Mongo audit log changes the hash and becomes detectable via `verifyBatchIntegrity`. Does not put the actor on chain, but ties the off-chain audit log to the on-chain hash.
2. **Per-user wallets, relay-forwarded (EIP-712 meta-tx)** — each farmer/lab/officer holds their own key, signs a typed message, relay submits it. Contract recovers the signer via `ecrecover` and stores that address as `recorder`. Requires wallet provisioning per user (Aadhaar-linked key derivation or a custodial wallet service).
3. **Per-user wallets, user-paid gas** — purest; rejected for this project since tribal collectors won't hold testnet ETH.

**Recommended for MVP:** Option 1 now (tiny patch), Option 2 when KYC/DigiLocker integration lands and each user has a reliable identity anchor.

**Acceptance:** After fix, tampering with an `AuditLog` row to change `actorUserId` from officer A to officer B should cause `verifyBatchIntegrity` to return `'tampered'` for that batch.

---

## Bug 3 — Chain-anchor failures are silently swallowed

**Where:** `src/lib/services/batch.service.ts:270-272, 386-388` and `src/lib/services/lab.service.ts:61-65` (no try/catch — uncaught failure would leak).

**Symptom:** If the RPC is down, or (per Bug 1) the revert fires, the batch/status still saves to Mongo with no `onChainTxHash`. `verifyBatchIntegrity` correctly flags these as `'unanchored'`, so the consumer-facing trace page is honest — but there is no retry queue and no alerting. In production, a transient RPC outage could produce a large batch of unanchored records that nobody notices.

**Fix:**
- Add an `anchor_outbox` collection: insert a row on DB save, worker dequeues and anchors, retries with backoff, marks row anchored on success.
- Surface unanchored-record count in the admin/secretary dashboard.
- Page oncall if the outbox depth exceeds a threshold.

**Acceptance:** Kill the RPC for 10 minutes, create 20 batches, restore RPC — all 20 should be anchored within N minutes without manual intervention.

---

## Bug 4 — Status-alias drift between services

**Where:** `src/lib/services/lab.service.ts:41` checks `batch.status !== 'in_warehouse' && batch.status !== 'stored'`, but `batch.service.ts:14-25` `STATUS_ALIASES` normalizes `in_warehouse → stored`. Creating a batch sets status to `'pending'` (line 252) which normalizes to `'created'`.

**Symptom:** Lab publish may reject batches that the UI/warehouse considers in the right state, depending on which code path last wrote `status`. Bug is latent — will surface when warehouse flow is exercised end-to-end.

**Fix:** Centralize status writes through `patchBatch` so the canonical set (`created`, `stored`, `certified`, `approved`, `dispatched`, `delivered`, `recalled`) is always stored in DB. Delete the raw-string checks everywhere else.

**Acceptance:** One enum, one place (`batch.service.ts`). All services and API routes reference that enum. No string literals like `'in_warehouse'` or `'pending'` in service files.

---

## Summary of impact on the tamper-detection narrative

| Claim in pitch | Currently true? | After Bug 1+2 fixed? |
|---|---|---|
| "Any edit invalidates downstream signatures" | Partial — only against harvest snapshot | Yes — against every stage |
| "Audit-grade cryptographic signing by the lab/officer" | No — all chain writes signed by relay wallet | Yes (with Bug 2 Option 2) or "audit log hash-linked to chain" (Option 1) |
| "Every event GS1 EPCIS 2.0 compliant" | `bizStep` mapped, but only harvest event actually lands | Full timeline on chain |
| "Regulator can trace every handoff on chain" | No — regulator sees only harvest + lab cert + recall | Yes |

Fix priority: **Bug 1 → Bug 2 Option 1 → Bug 3 → Bug 4**.
