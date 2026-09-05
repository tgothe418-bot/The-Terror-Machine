# Packet 08 — Recover one complete durable session revision

Status: pending implementation. Milestone 3 and stabilization. Read the [series contract](README.md). Prerequisite: Milestone 2 accepted through [Packet 07](07-Depiction-Import-Export.md).

## Finish line

After interrupted, delayed, or failed persistence, fresh hydration yields one complete committed revision or an honest recoverable failure state. It must never label a mixture of revisions coherent merely because session and Blueprint IDs match.

## Observed failure and qualification

App and Engine state persist separately through asynchronous IndexedDB writes. The storage adapter silently falls back to memory on storage errors. Session reconciliation verifies identity and selected structural conditions, but not a shared durable commit revision.

A diagnostic constructed individually schema-valid records with the same session identity: App history described dropping a key on turn two while Engine inventory retained it. Reconciliation returned COHERENT. This proves mixed records can pass the current check; an interrupted IndexedDB write sequence has not yet been reproduced. Start by establishing that production failure path.

## Work

1. Use the existing IndexedDB test support to exercise actual persistence/hydration through the adapter. Inject write rejection, interruption between owner writes, and out-of-order completion. Recreate stores/runtime state for reload; do not let the same in-memory fallback make a failed disk write appear durable.
2. Define the durable commit boundary and select a bounded representation that identifies and recovers a complete revision across the canonical owners. A shared snapshot, transactional commit record, or versioned checkpoint may fit; justify the choice from the write trace. Matching revision labels alone are insufficient if no complete record can be recovered.
3. Include the state needed to resume faithfully: identity/perspective, topology and position, inventory/flags, canonical memory and HG1 ledgers, accepted history/context, turn/time state, and the relevant Retake checkpoint. Audit this list against the actual owners rather than persisting unrelated UI state indiscriminately.
4. Make durable success distinguishable from an in-memory commit. Preserve the prior known complete durable revision until a new complete revision is safely recoverable. Do not silently present an unsuccessful write as a saved session.
5. Coordinate initialization, successful publication, Retake, reset, and hydration with the same durability model. Delayed writes must not resurrect a discarded session or overwrite a later complete revision. Preserve Packet 02's attempt invalidation across state replacement.
6. Give compatible existing saves an explicit validation/migration path. Do not infer proven coherence from identity alone when an old format cannot demonstrate it. Recover a known complete checkpoint when available; otherwise expose the unresolved recovery state without inventing missing canon or automatically erasing evidence.

Primary owners: `src/lib/idbStorage.ts`, `src/lib/sessionReconciliation.ts`, persisted schemas in the App/Engine stores, `src/core/engine/commitCoordinator.ts`, and initialization/Retake actions. A store merger is not required. Keep the persistence correction separate from general state-management redesign.

## Acceptance checks

- Inject failures before, between, and after the relevant writes, including reordered completion. Reload into fresh state. Recovery must select the complete previous or complete new committed revision, never a mixture.
- Use distinct sentinel facts across history, inventory, world memory, and HG1 ledgers to detect partial recovery. Matching IDs with incompatible revisions must not return COHERENT.
- Verify initialization and Retake across reload, including checkpoint restoration and invalidation of old in-flight turns.
- Test storage unavailability/quota-style rejection and malformed/truncated saved data. No false durable-success claim or silent memory-only “reload” proof.
- Cover supported old-format saves, an unrecoverable legacy pair, and recovery from a known complete checkpoint. Repeat hydration to prove migration/recovery is stable.
- Test reset or scenario replacement while an earlier write is delayed; the old session must not reappear after reload.

Focused families: `src/lib/sessionReconciliation.test.ts`, `src/core/engine/commitCoordinator.test.ts`, `src/store/useAppStore.test.ts`, `src/core/store.test.ts`, `src/components/engine/Runtime.retake.test.tsx`, and storage integration regressions added at the actual adapter boundary. Then run all five broad gates in the index.

Report the durable boundary, failure trace, recovered exact revision, and old-save limitations. If a product choice is required for genuinely unrecoverable historical data, present that concrete case; do not use it to defer recovery of records whose complete checkpoint is already available. Next: [Packet 09](09-Scenario-Governed-Physics.md).
