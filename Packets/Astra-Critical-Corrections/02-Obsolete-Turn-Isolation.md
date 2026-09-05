# Packet 02 — Isolate obsolete turn results

Status: pending implementation. Milestone 1. Read the [series contract](README.md). Prerequisite: [Packet 01](01-Runtime-World-Memory.md).

## Finish line

An asynchronous result may publish only into the session and canonical revision from which it was requested. Delayed success, failure, and cleanup must not alter a replacement session or a newer attempt in the same session.

## Observed failure

Runtime captures state before awaiting the pipeline, then reads the latest Engine state while preparing the old response for publication. The commit coordinator does not compare the originating session/expected revision with the current session. The failure path can also dispatch into whichever session is now active.

A diagnostic captured session A, initialized session B with the real store action, and submitted A's response to the real coordinator. B received A's command, response, and inventory. This proves the publication boundary accepts stale input; it was not a mounted UI timing reproduction.

## Work

1. Bind each attempt to its originating session, Blueprint identity, and expected canonical revision. Establish a comparison token that is invalidated by relevant canonical changes. Turn count alone is insufficient: Retake followed by another turn can reach the same count.
2. Enforce the check at the publication owner, immediately before committing. Do not rely solely on a disabled button, unmount flag, or request cancellation. Inspect captured payload construction so stale data cannot be combined with a newer game state before validation.
3. Guard unsuccessful results and request-owned cleanup as well as success. An obsolete attempt must not append history, write a failure receipt into the active session, install a checkpoint, clear a newer request's pending state, or advance Autopilot.
4. Invalidate attempts on scenario replacement, reset/exit, Retake, and other relevant state replacement paths. Cover ordinary human turns and Autopilot through their actual call sites. Cancellation is optional resource cleanup; admission remains authoritative.
5. Keep request invalidation compatible with Packet 08's durable revision work. Distinguish a runtime attempt generation from a restored historical turn number so recovery cannot accidentally make an old attempt current again.

Primary owners: `src/components/engine/Runtime.tsx`, `src/core/engine/commitCoordinator.ts`, `src/store/useAppStore.ts`, `src/core/store.ts`, and the turn snapshot/request types.

## Acceptance checks

- With controllable deferred transport, start A, replace it with B, then resolve A successfully. Verify all of B's canonical owners, visible history, checkpoint, and pending request state are unchanged by A.
- Repeat with A's provider refusal, malformed response, and rejected promise. Confirm failure handlers and `finally` cleanup are isolated.
- Within one session, supersede an attempt through a canonical change and deliver its result late. Include Retake followed by a new attempt at the same turn count.
- Attempt a stale publication directly through the coordinator to prove the boundary protects callers other than Runtime.
- A current successful attempt still publishes exactly once; a current failure still leaves its legitimate failure receipt without changing canon. Human turns and Autopilot remain usable.

Focused families: `src/core/engine/commitCoordinator.test.ts`, `src/components/engine/Runtime.autopilot.test.tsx`, `src/components/engine/Runtime.retake.test.tsx`, `src/components/engine/Runtime.horrorGrammar1.test.tsx`, and directly affected store tests. Avoid elapsed-time sleeps in race tests; use controllable promises.

Next: [Packet 03](03-Opening-Continuity.md).
