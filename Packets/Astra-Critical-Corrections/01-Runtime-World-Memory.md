# Packet 01 — Preserve runtime world memory

Status: pending implementation. Milestone 1. Read the [series contract](README.md). Prerequisite: the confirmed workspace baseline.

## Finish line

A world fact accepted on one turn remains in canonical world memory and in the next production request until an authorized memory operation changes it. Empty proposals preserve the existing ledger. A response built against the wrong memory pre-state cannot silently replace the live ledger.

## Observed failure

The production `ratificationPipeline` caller supplies character memory and HG1 state to `buildEngineTurnContext`, but omits runtime world memory. The builder can consequently fall back to Blueprint memory or an empty state. The server resolves proposals against that incoming state, and Runtime publishes the returned ledger.

A diagnostic seeded “The outer gate is padlocked.” in the live Engine store. The actual outgoing request contained an empty world-memory ledger. The resolver's empty-proposal result remained empty, and the commit coordinator accepted its publication. This exercised actual request/resolver/publication modules with a synthetic response, not a mounted React or complete HTTP lifecycle. Existing helper tests that explicitly pass world memory do not cover the missing production argument.

## Work

1. Trace the canonical world-memory owner from Engine state to the captured request, server resolution, receipt validation, and publication. Thread the accepted runtime ledger explicitly through the production caller. Preserve initialization and supported legacy Blueprint migration behavior without allowing those fallbacks to replace an established runtime ledger.
2. Keep an intentional empty runtime ledger distinct from missing/uninitialized data. Never revive retired facts from the Blueprint merely because runtime memory is empty.
3. Inspect the world-memory receipt/pre-state boundary alongside existing HG1 receipt checks. Reject inconsistent pre-state before any canonical publication; do not merge contradictory ledgers or silently coerce a receipt into success.
4. Preserve bounded memory rules, exact relevant Retake state, and failure behavior. Avoid introducing a second canonical memory owner.

Primary owners: `src/lib/ratificationPipeline.ts`, `src/lib/buildEngineTurnContext.ts`, `src/lib/worldMemory.ts`, `src/components/engine/Runtime.tsx`, `src/types/worldMemory.ts`, and the current receipt/publication helpers. Change the server contract only if needed to prove the boundary; keep runtime and schema validation aligned.

## Acceptance checks

- Drive one successful turn that establishes a unique fact through the production publication path. Build the next request from the resulting stores using the real pipeline and verify the exact accepted ledger reaches the resolver.
- Resolve an empty-proposal turn and verify that fact survives publication and another request.
- Use different Blueprint and runtime facts to prove established runtime memory wins. Also cover intentionally empty runtime memory.
- Submit a schema-valid receipt with an incorrect memory pre-state; verify no partial canonical change, checkpoint replacement, or accepted prose.
- A provider refusal and a malformed response preserve the prior ledger. Retake after a successful memory change restores the correct previous ledger and subsequent request context.

Focused families: `src/lib/worldMemory.test.ts`, `src/lib/ratificationPipeline.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, `src/lib/horrorGrammarTurnValidation.test.ts`, and the relevant Runtime/commit-coordinator tests. Include only affected families plus direct new regressions.

Record which parts used actual production owners and which used deterministic transport. Packet 03 will combine this correction with opening continuity and obsolete-result isolation. Next: [Packet 02](02-Obsolete-Turn-Isolation.md).
