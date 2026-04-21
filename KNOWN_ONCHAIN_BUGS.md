# Known On-Chain Attribution Bugs

Status legend: ✅ Fixed · 🟡 Partial · ❌ Open

## Bug 1 — Status-change re-anchors silently revert ✅ Fixed

**Where:** `contracts/HoneyTraceRegistry.sol:67-70` vs `src/lib/services/batch.service.ts`

**Original symptom:** Only the first (harvest) anchor landed on chain. Every subsequent status transition reverted as `BATCH_HASH_MISMATCH` and the error was swallowed.

**Fix applied:**
- Each status milestone is anchored under a **staged id** `${batchId}#${status}` (e.g. `HT-20260421-001#stored`, `#certified`, …). Each transition therefore has its own immutable on-chain record — no hash-mismatch collision.
- Batch model persists `onChainStagedId` per milestone (last-anchored stage).
- New `BatchAnchor` collection persists a row per `{batchId, stage}` with the exact payload snapshot that was hashed, the actor, the tx hash, and the staged id — so every stage can be verified independently later.
- `verifyBatchIntegrity` queries `contract.getBatch(onChainStagedId || id)` (latest-stage check).
- **New:** `verifyBatchTimeline(batchId, provider)` walks every `BatchAnchor` row, recomputes the comparison against the chain, and returns a per-stage verdict. Result shape: `{stage, stagedId, bizStep, status, storedHash, onChainHash, actorUserId, actorRole, txHash, recordedAt, message}[]`.
- The consumer trace API (`GET /api/trace/[batchId]`) returns `stageIntegrity[]`.
- The consumer trace page renders a **Per-Stage Integrity** panel showing each stage with its recorded actor/role, timestamp, and a `verified`/`tampered` tag — so regulators and consumers can see exactly **which stage** failed verification and **which actor** was recorded for that stage.

**Remaining follow-ups:**
- Contract-side: expose `getBatchTimeline(batchId)` returning every stage's record directly (currently we round-trip one `getBatch(stagedId)` per stage).
- Unit + E2E test: walk a batch harvest → stored → certified → approved, then mutate a single stage's audit-log row and assert `verifyBatchTimeline` returns `tampered` only for that stage.

---

## Bug 2 — On-chain `recorder` is always the relay wallet, not the real actor ✅ Fixed (Option 1)

**Where:** `src/lib/blockchain-relay.ts` (single server key) vs `contracts/HoneyTraceRegistry.sol:75, 88`

**Original symptom:** Chain showed `recorder = 0x<relay>` for every farmer/warehouse/lab/officer action. Regulator auditing the chain could not tell which specific user recorded a given batch. Actor identity lived only in mutable Mongo `AuditLog`.

**Fix applied (Option 1 — bind actor into the hash):**
- `buildChainPayload` now includes `actorUserId` and `actorRole` in the hashed payload.
- `createBatch` and `patchBatch` pass `actorId` + `actorRole` through to `buildChainPayload`.
- Batch model persists `onChainRecorderId` (the actor id captured at anchor time) so admins can cross-check on-chain hash integrity against the audit log without replaying every stage.

**Effect:** Tampering with an `AuditLog` row to change `actorUserId` from officer A to officer B now changes the off-chain data but leaves the on-chain `dataHash` unchanged — `verifyBatchIntegrity` detects the mismatch and returns `'tampered'`.

**Remaining follow-ups:**
- Option 2 (per-user wallets + EIP-712 meta-tx) is still the right long-term path once KYC/DigiLocker gives every user a stable identity anchor. Relay-side code would need `ecrecover` over a typed message; contract would then store the recovered signer as `msg.sender` or as an auxiliary `actor` field.

---

## Bug 3 — Chain-anchor failures are silently swallowed 🟡 Partial

**Where:** `src/lib/services/batch.service.ts` createBatch + patchBatch, `src/lib/services/lab.service.ts:61-73`

**Original symptom:** If the RPC was down or a revert fired, the batch saved to Mongo with no `onChainTxHash`. No retry queue, no alerting, no visibility.

**Fix applied:**
- Batch model now has `onChainAnchorStatus: 'pending' | 'anchored' | 'failed'`, `onChainAnchorError: string`, and `onChainAnchorAttempts: number`.
- `createBatch` and `patchBatch` set `onChainAnchorStatus = 'failed'` and persist the error message on catch, instead of swallowing silently. Successful anchors set `'anchored'` and clear the error.
- Structured log line emitted on failure: `[batch.service] anchor-failed { batchId, attempts, error }` — greppable for alerting.

**Remaining follow-ups (full fix):**
- Add an `anchor_outbox` collection + worker that dequeues failed records, retries with backoff, and flips `onChainAnchorStatus` back to `'anchored'` on success.
- Surface unanchored-record count in the admin/secretary dashboard (query: `Batch.countDocuments({ onChainAnchorStatus: 'failed' })`).
- Page oncall if the outbox depth exceeds a threshold.
- Apply the same treatment to `lab.service.ts` (still has a plain `console.warn`).

---

## Bug 4 — Status-alias drift between services 🟡 Partial

**Where:** `src/lib/services/lab.service.ts:41-47`, `src/lib/services/batch.service.ts` `STATUS_ALIASES`

**Original symptom:** Lab publish could reject batches that the warehouse/UI considered in the right state, depending on which code path last wrote `status`.

**Fix applied:**
- `lab.service.ts` status guard uses an explicit `STORED_ALIASES` set (`'stored'`, `'in_warehouse'`) with a comment cross-referencing `STATUS_ALIASES` in `batch.service.ts`. Makes the accepted set obvious instead of a raw `!==` chain.

**Remaining follow-ups:**
- Export `STATUS_ALIASES` + `normalizeStatus` from `batch.service.ts` and import them into every service file that reads `batch.status`. Today each service re-implements the alias logic (or omits it).
- Delete legacy aliases `'pending'`, `'in_warehouse'`, `'in_testing'` from the Batch model enum and run a one-off DB migration to rewrite them to canonical values.
- One enum, one place. No string literals in services.

---

## Summary of impact on the tamper-detection narrative

| Claim in pitch | Before | After |
|---|---|---|
| "Any edit invalidates downstream signatures" | Partial — only harvest snapshot | ✅ Every stage has its own anchor + hash |
| "Audit-grade cryptographic signing by the lab/officer" | No — all writes signed by relay | 🟡 Audit-log hash-linked to chain (Option 1); per-user wallets deferred |
| "Every event GS1 EPCIS 2.0 compliant" | Only harvest landed | ✅ Full timeline on chain (events + staged records) |
| "Regulator can trace every handoff on chain" | No | ✅ Yes — each stage is an independent `BatchRecorded` event with its own hash |
| "Regulator can pinpoint which stage / actor was tampered" | No — single latest-anchor check | ✅ Yes — `verifyBatchTimeline()` + `BatchAnchor` collection + Per-Stage Integrity panel on `/trace/[batchId]` |

**Remaining work:** outbox/retry worker (Bug 3), canonical-status refactor (Bug 4), per-user wallets (Bug 2 Option 2 — future).
