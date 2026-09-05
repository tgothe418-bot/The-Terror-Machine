# Packet 03 — Carry the opening into turn context

Status: pending implementation. Milestone 1 closure and stabilization. Read the [series contract](README.md). Prerequisite: [Packet 02](02-Obsolete-Turn-Isolation.md).

## Finish line

The accepted opening is available to the first ordinary user request through the real history projection. Opening narration does not consume a normal turn or advance fictional time, and failed or obsolete openings never become accepted context.

## Observed failure

The `SYSTEM_INIT` path adds an Engine message to App history using `ADD_MESSAGE`. Ordinary prompt history is built from `storyLog`, which this action does not update. A diagnostic placed a unique opening detail through the actual message/reducer path: it was visible in history, absent from `storyLog`, and absent from the next real request's recent history. This did not exercise a mounted opening component.

## Work

1. Choose one explicit projection of accepted opening narration into subsequent prompt history. Inspect existing history and story-log responsibilities; avoid making two independently mutable copies the new source of truth.
2. Preserve ordering, existing bounded history limits, block handling, and ordinary accepted-turn inclusion. Prevent duplicate opening entries and exclude failure/diagnostic messages and rejected candidates from playable prompt context.
3. Preserve the current initialization count/time behavior and existing canonical publication semantics. Reuse Packet 02's originating-session protection for a delayed opening result.
4. Inspect opening proposals separately from opening narration. If admitted initialization proposals are not published, record the exact receipt and prose consequence. Do not silently start applying all INIT proposals to solve a history omission. A change to INIT's canonical effects requires a concrete scoped semantic decision; carry any unresolved case to Packet 11 and final acceptance.

Primary owners: `src/components/engine/Runtime.tsx`, `src/lib/ratificationPipeline.ts`, `src/store/useAppStore.ts`, `src/core/engine/commitCoordinator.ts`, and existing Engine history helpers.

## Acceptance checks

- Use the real opening acceptance action, then the real pipeline to build the first user request. Include a unique, short fictional detail within the configured history budget and verify it is present once, in order.
- Verify initialization leaves ordinary turn count and fictional-time ledgers unchanged. A repeated render does not duplicate the accepted opening.
- Failed and obsolete opening results do not enter a replacement session or future narrative context.
- Run the combined Milestone 1 sequence: accepted opening; user reference to its detail; successful world-memory change; empty-proposal turn preserving that fact; refused/malformed turn preserving canon; Retake restoring the correct previous state. Build successive requests from published stores, not handcrafted context.
- Include Packet 02's delayed success/failure and same-session supersession regressions in the milestone gate.

Focused families: `src/lib/ratificationPipeline.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, relevant `src/components/engine/Runtime.*.test.tsx` tests, `src/store/useAppStore.test.ts`, and `src/core/engine/commitCoordinator.test.ts`.

Then run all five broad gates in the series index. Milestone 1 is accepted only to the demonstrated continuity boundary. Explicitly report any unresolved INIT proposal semantics instead of counting their absence from this correction as resolution.

Next: [Packet 04](04-Canonical-Presence.md).
