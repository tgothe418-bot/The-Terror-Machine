# 1-6 HG1 Canonical State Threading and Consecutive-Turn Continuity

**Series:** TTM Horror Grammar 1 — Integration Closure  
**Execution packet:** 1-6 of 1-9  
**Depends on:** Packets 1-1 through 1-5 present on the live line  
**Expected baseline:** `082ec660fcb747ff13da56d92ecc89d58e0c7cce`  
**Scope:** Correct the canonical state handoff only. Do not begin authority hardening, forensic UI work, Horror Grammar 2, or unrelated cleanup.

## Governing invariant

> A successful Horror Grammar 1 turn may derive a new post-state only from the exact bounded pre-state supplied by the active canonical session. A missing field must never silently turn an existing ledger into an empty ledger.

HG1 has already established its owners: the Engine game state owns accepted runtime state; `EngineTurnContext` carries the next-turn snapshot; ratifiers produce receipts; coordinated publication commits the prepared post-state. This packet connects those existing owners. It does not replace them or introduce a second session store.

## Objective

Make the following state survive a real sequence of turns, refresh, and Retake:

- fictional-time ledger;
- pursuit-schedule ledger;
- recent accepted activity events;
- active/relevant pressure threads;
- value-state ledger;
- character-pursuit overlay ledger; and
- non-User character-development ledger.

The Blueprint remains the immutable authoring baseline. Runtime ledgers are the mutable situated state. Rejected proposals and forensic evidence are not part of this packet's canonical state.

## Start gate

Before editing, read the current implementations of:

- `src/types/horrorGrammar.ts`
- `src/types/engineContract.ts`
- `src/types/index.ts`
- `src/core/store.ts`
- `src/lib/buildEngineTurnContext.ts`
- `src/lib/ratificationPipeline.ts`
- `server/routes/turn.ts`
- `src/components/engine/Runtime.tsx`
- `src/core/engine/commitCoordinator.ts`
- `src/core/engine/reducer.ts`
- the existing HG1-focused tests.

Confirm that the baseline has the known gap: `buildEngineTurnContext()` can accept several HG1 ledgers, but the real ratification pipeline does not pass them all; the route then reads ad-hoc fields through type casts and falls back to empty/default state. If the live baseline differs materially, stop and report the mismatch before broadening scope.

## 1. Define one typed runtime snapshot inside the turn context

Extend the existing Horror Grammar turn contract with a strict, bounded runtime snapshot. Use a repository-consistent name such as `HorrorGrammarRuntimeStateSchema` and place it with the existing HG1 schemas.

It must own the seven state domains listed in the Objective, using the existing state schemas and existing retention limits. Use a small, explicit projection for pressure threads if the canonical ledger can contain closed historical threads; the outbound context must carry only the active/relevant bounded subset needed for the next turn, not an unbounded history.

Separately carry the minimum immutable authoring baseline that the stateless turn route needs to ratify a proposal:

- reviewed value anchors; and
- reviewed character-pursuit baselines and review status.

Keep the model-facing opportunity and relevant-value projections separate from this route-validation baseline. The prompt may remain token-efficient; the route must not recover baseline data through `(context as unknown as ...)` or by pretending a Blueprint is present when it is not.

Requirements:

- Add the snapshot and baseline to `HorrorGrammarTurnContextSchema`, not to an untyped side channel.
- Validate the exact shape at the `/api/turn` request boundary through the existing `TurnRequestSchema` path.
- Preserve existing neutral behavior for a Blueprint whose value and pursuit reviews are `UNREVIEWED` or `REVIEWED_NONE`: it has empty value/pursuit ledgers and no fabricated pressure.
- Do not send a raw Blueprint, raw provider response, prior rejected proposal, prompt text, or arbitrary runtime object merely to make this work.
- Do not loosen existing schemas with `z.any()`, a broad cast, permissive `.passthrough()`, or a blanket fallback.

## 2. Initialize state once at session creation

At the canonical fresh-session boundary (`useEngineStore.setBlueprint` or its active equivalent), initialize the HG1 game-state slice from the normalized selected Blueprint using the existing creation helpers:

- `createInitialFictionalTimeLedger()`;
- initial pursuit schedule;
- empty activity-event ledger;
- empty pressure-thread ledger;
- `createInitialValueStateLedger(normalizedBlueprint)`;
- `createInitialCharacterPursuitLedger(normalizedBlueprint)`; and
- `createInitialCharacterDevelopmentLedger()`.

Rules:

- Initialization occurs for a new session, not each turn.
- `SYSTEM_INIT` may carry and receipt this state but must not advance fictional time, schedule an activity, or erase an initialized ledger.
- A legacy Blueprint produces only schema-valid neutral state; it does not receive invented anchors, pursuits, or development facts.
- A hydrated existing session keeps its persisted state. Do not reinitialize it during hydration or reconciliation.

Update the persisted-state boundary only as needed to validate this existing game-state slice. Preserve current compatibility behavior for legacy persisted sessions and keep invalid model-owned state out of canon.

## 3. Thread the exact snapshot through the real turn path

### Client context construction

`executeRatificationPipeline()` must pass every HG1 ledger from the current canonical `gameState` into `buildEngineTurnContext()`. Do not reconstruct mutable state from narrative history, telemetry, or prior model output.

`buildEngineTurnContext()` must:

- choose supplied canonical ledger values over initialization defaults;
- initialize only absent fresh-session values from the normalized Blueprint at its owning boundary;
- construct opportunities from the current fictional time, schedule, presence, and pursuit overlay;
- retain the exact canonical runtime snapshot for route ratification; and
- keep model-visible opportunity/value projections bounded and relevant.

Avoid adding additional compatibility branches to the generic `any` normalizer. If a legacy adapter is necessary, isolate it and prove it cannot discard a valid canonical HG1 ledger.

### Server ratification

In `server/routes/turn.ts`, read all HG1 pre-state and authoring baseline through the typed `context.horrorGrammar` object. Remove the current pattern that casts `context` to invented properties such as `activityEvents`, `pressureThreads`, `valueStateLedger`, `characterPursuitLedger`, `characterDevelopmentLedger`, or `blueprint`.

The route must give each ratifier the exact pre-state from the snapshot and pass the exact authoring baseline it needs. A normal successful response must carry the relevant HG1 receipts. If that response is structurally incomplete, it is a failed response and must not publish a partial turn.

For this packet, retain the current activity/pressure admission rules except where a change is necessary to consume the typed state. Exact authority, source, channel, and speaker validation belongs to Packet 1-7.

### Publication

Continue to prepare the complete post-turn game state before `coordinateCanonicalTurnPublication()`.

- Receipt post-state is authoritative for its owner.
- A no-proposal receipt preserves the exact pre-state.
- Do not use an empty `logic_state` field as a fallback replacement for a ledger that already exists in game state.
- If a required HG1 receipt is absent from an otherwise successful response, fail the turn before coordinated publication rather than publishing a mixture of old and empty state.
- Keep Retake ownership unchanged: the existing pre-turn `engineGameStateBefore` checkpoint must now naturally contain the complete HG1 slice.

## 4. Required focused proofs

Add or revise focused tests at the real owning boundaries.

1. **Context construction:** a normalized reviewed Blueprint creates the correct initial HG1 snapshot; a supplied nonempty snapshot survives context construction byte-for-byte at the ledger level.
2. **Route state use:** submit a typed context containing nonempty activity, pressure, value, pursuit, and development state. A `NONE` turn returns those same states as receipt pre/post state, not empty fallbacks.
3. **Canonical baseline:** a valid value or pursuit proposal can resolve against the authoring baseline carried in the typed context. It must not rely on an undefined cast Blueprint.
4. **Publication preservation:** after a successful receipt, Runtime/commit publication retains all seven owners. A structurally incomplete HG1 success response commits nothing.
5. **Fresh, legacy, and Retake neutrality:** a fresh reviewed Blueprint initializes correctly; a legacy Blueprint remains neutral; a Retake checkpoint restores the pre-turn HG1 slice.

Use distinct ledger sentinels in the tests so a replacement with `{}`, `[]`, or a recreated baseline is detectable. Do not substitute a hand-built already-ratified frame for every proof; at least the route and outbound-context tests must exercise their actual boundary.

## Focused verification gate

Run only the relevant checks for this packet:

```bash
npx vitest run src/lib/buildEngineTurnContext.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts server/routes/turn.horrorGrammar1.test.ts src/components/engine/Runtime.horrorGrammar1.test.tsx src/components/engine/Runtime.retake.test.tsx src/lib/sessionReconciliation.test.ts
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/types/index.ts src/core/store.ts src/lib/buildEngineTurnContext.ts src/lib/ratificationPipeline.ts server/routes/turn.ts src/components/engine/Runtime.tsx
git diff --check
```

If a named test file has moved, use its active equivalent and report the substitution. Do not run the full Vitest suite, global TypeScript check, full lint, or production build in this packet.

## Explicit non-goals

Do not:

- add Horror Grammar 2;
- redesign the telemetry drawer or exports;
- add a player-facing stat, clock, score, or decision menu;
- simulate every non-User character every turn;
- change provider behavior or content policy;
- refactor unrelated persistence or hydration code; or
- absorb the deferred identifier, enum, array-boundedness, or wording audits.

## Completion report

Report:

1. exact files changed;
2. the final owner and initialization path for each HG1 ledger;
3. the exact pre-state → route → receipt → publication handoff;
4. the focused commands and results; and
5. any remaining critical blocker affecting canonical continuity, User attribution, recovery, or safe boundary containment.

Do not call Horror Grammar 1 accepted after this packet. Proceed to Packet 1-7 when this focused gate passes.
