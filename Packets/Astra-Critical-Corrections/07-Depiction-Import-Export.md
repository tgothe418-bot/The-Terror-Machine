# Packet 07 — Preserve authored depiction through export

Status: pending implementation. Milestone 2 closure. Read the [series contract](README.md). Prerequisite: [Packet 06](06-Exact-Authority-References.md).

## Finish line

A complete authored Depiction Contract deliberately preserved during source import remains the contract in the compiled and reviewed Blueprint. Imported defaults still apply when appropriate, and candidate disposition accurately reflects what was applied or preserved.

## Observed failure

`applyImportedSourceBaseline` skips replacing a complete authored depiction contract, but the corresponding imported candidate remains accepted/staged. `forgeCompiler` later replays accepted/staged candidates and replaces the depiction through `applyCandidateToDraft`.

A diagnostic used the real source schema, Forge store action, and compiler: import preserved the authored fields, compilation succeeded, and the exported Blueprint contained the imported replacement. The existing preservation test stops before compilation and therefore misses this boundary.

## Work

1. Trace the candidate from source import through disposition, draft application, compilation, Export Review, Copy, and Download. Reproduce the complete authored/imported conflict using distinct valid fields.
2. Represent the skipped or superseded candidate's disposition explicitly. It must retain useful source evidence without masquerading as an unapplied accepted change that compilation should replay. Use the current lifecycle where it can represent this truth; add a narrowly scoped compatible state only if necessary.
3. Preserve idempotence: repeated compilation and repeated import must not progressively replace authored intent or mark a skipped candidate as applied. Audit other skip paths that use the same replay mechanism for the same defect, without broadening into unrelated Forge redesign.
4. Keep intentional replacement through an existing explicit authoring/review action possible. The fix must not make the depiction contract permanently immutable.
5. Preserve atomic source-default application, export validation, perspective-neutral output, and the single revision-bound reviewed artifact shared by Copy and Download. A changed draft must continue to trigger the existing stale-review behavior.

Primary owners: `src/store/useForgeStore.ts`, `src/lib/sourceBaseline.ts`, `src/lib/forgeCompiler.ts`, `src/components/forge/ExportReviewModal.tsx`, and the source-candidate schema if its lifecycle needs a compatible extension.

## Acceptance checks

- Start with a complete authored depiction, import conflicting accepted source defaults, compile successfully, open Export Review, and exercise Copy and Download. Both outputs preserve the authored contract and match the reviewed artifact.
- Verify candidate disposition after import and compilation; preserved evidence cannot silently reapply on later compilation.
- Repeat the process to prove idempotence. Modify the draft after review and confirm the existing revision boundary still prevents a stale artifact from being presented as current.
- With no complete authored depiction, accepted source defaults still populate and export correctly under the established import policy. Cover partial authored input according to that policy.
- An intentional later replacement through the supported authoring path remains possible and is reflected in a new reviewed artifact.

Focused families: `src/store/useForgeStore.test.ts`, `src/lib/sourceBaseline.test.ts`, `src/lib/depictionAndAtomicExport.test.ts`, and `src/components/forge/ExportReviewModal.test.tsx`.

For Milestone 2 acceptance, run the combined focused regression set from Packets 04–07 and report both rejected unauthorized changes and preserved valid behavior. Do not mark the milestone complete on import-only tests. Next: [Packet 08](08-Durable-Session-Recovery.md).
