# Packet 1-6 — HG1 Canonical State Threading and Consecutive-Turn Continuity: Live Closure

**Series:** TTM Horror Grammar  
**Principle:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-6 of 1-9 — HG1 Integration Closure  
**Depends on:** Packets 1-1 through 1-5 and the accepted live corrective work through the expected baseline  
**Expected baseline:** `51c667c9aab39551129f39b2a0d70789ee4d513d`  
**Scope:** Close canonical HG1 state threading only. Do not begin Packet 1-7 authority hardening, Packet 1-8 forensic closure, Horror Grammar 2, or unrelated cleanup.

## Why this packet supersedes the earlier 1-6 draft

The live line already contains partial implementations labeled for Packets 1-6, 1-7, and 1-8. Preserve them. Do not recreate their schemas, replace the turn pipeline, or treat this as greenfield work.

The remaining Packet 1-6 defect is narrower and concrete:

1. `HorrorGrammarRuntimeStateSchema` exists and the seven HG1 runtime owners are initialized in `useEngineStore.setBlueprint()`.
2. `executeRatificationPipeline()` sends the seven owners through `buildEngineTurnContext()`.
3. The server ratifies activity, pressure, value, pursuit, development, and pressure-thread transitions from the typed HG1 context.
4. However, fictional time, activity eligibility, and pursuit scheduling are recomputed on the client after the route returns. That second selection call does not receive the same full inputs used by `buildEngineTurnContext()`, including the current character-pursuit overlay and accepted trigger references.
5. The route does not return `fictionalTimeReceipt`, `castActivityReceipt`, or a typed pursuit-schedule transition receipt.
6. Successful-response HG1 receipts remain optional. Runtime can therefore commit a structurally incomplete HG1 success and can fall back to untyped `logic_state` ledger fields.
7. `EnginePersistedSchema` permits HG1 fields only through a broad passthrough rather than validating them explicitly.

This split allows the opportunity pool, forensic selection evidence, schedule advancement, and published canonical state to disagree even when every individual helper test passes.

## Governing invariant

> One exact canonical HG1 pre-state produces one deterministic selection and receipt chain. The client publishes only the typed post-states from that chain. Missing, malformed, stale, or internally inconsistent HG1 receipts fail the turn before canonical publication.

The Blueprint remains the immutable authoring baseline. The Engine game state owns mutable HG1 runtime state. The turn context carries the bounded pre-state. Server ratifiers create the accepted receipt chain. Coordinated publication commits its post-state once or commits nothing.

## Required starting state

Run only:

```bash
git rev-parse HEAD
git status --short
```

The exact HEAD must be:

```text
51c667c9aab39551129f39b2a0d70789ee4d513d
```

Stop and report before editing if:

- HEAD differs;
- tracked files are modified;
- an unresolved merge or rebase is present; or
- the live code no longer matches the defect statement above.

Do not delete, overwrite, stage, or absorb unrelated untracked files.

## Read before editing

Read the current implementations and their owning tests:

- `src/types/horrorGrammar.ts`
- `src/types/engineContract.ts`
- `src/types/index.ts`
- `src/core/store.ts`
- `src/lib/fictionalTime.ts`
- `src/lib/castActivityEligibility.ts`
- `src/lib/buildEngineTurnContext.ts`
- `src/lib/ratificationPipeline.ts`
- `server/routes/turn.ts`
- `src/components/engine/Runtime.tsx`
- `src/core/engine/commitCoordinator.ts`
- `src/core/engine/reducer.ts`
- `src/lib/sessionReconciliation.ts`
- the current HG1 context, route, Runtime, persistence, and Retake tests.

Confirm these current facts before implementation:

- fresh session initialization already creates all seven HG1 owners;
- `HorrorGrammarRuntimeStateSchema` and `HorrorGrammarAuthoringBaselineSchema` already exist;
- the client currently advances fictional time and pursuit schedule after parsing the route response;
- the client currently recomputes activity eligibility rather than consuming one exact selection receipt;
- the server currently omits fictional-time and eligibility receipts from `finalResponse`;
- Runtime currently permits receipt-or-`logic_state` fallback publication for HG1 ledgers; and
- persisted HG1 fields are not explicitly represented in `EnginePersistedSchema`.

If any item is no longer true, stop and report the exact current owner. Do not broaden the packet to compensate.

## 1. Preserve the existing seven canonical owners

The canonical mutable HG1 slice remains:

| Runtime domain | `LogicState` owner |
|---|---|
| Fictional time | `fictional_time_ledger` |
| Pursuit consideration schedule | `pursuit_schedule_ledger` |
| Recent accepted activity | `activity_events` |
| Active/relevant situated pressure | `pressure_threads` |
| Value state | `value_state_ledger` |
| Character-pursuit overlay | `character_pursuit_ledger` |
| Non-User character development | `character_development_ledger` |

Do not move these owners into AppStore, telemetry, message history, a new background simulator, or a second horror store.

Preserve the current fresh-session behavior:

- initialize once from the normalized Blueprint at `setBlueprint()`;
- use neutral schema-valid state for a legacy Blueprint;
- keep valid hydrated state rather than rebuilding it from the Blueprint;
- keep `SYSTEM_INIT` non-advancing; and
- retain the complete pre-turn `LogicState` in the existing Retake checkpoint.

## 2. Make the exact activity selection receipt part of the typed request context

`buildEngineTurnContext()` already calls `selectCastActivityEligibility()` with the correct Blueprint, topology, fictional time, pursuit schedule, character-pursuit overlay, User character, presence, turn number, and trigger references.

That exact result must become the only selection receipt for the turn.

### Contract requirement

Add a required, typed field to `HorrorGrammarTurnContextSchema` for the complete `CastActivityEligibilityReceiptSchema`. Use a repository-consistent name such as:

```ts
activityEligibility: CastActivityEligibilityReceiptSchema
```

The exact name may follow the current naming style, but it must be one complete receipt, not another loose group of arrays.

The existing present/offscreen opportunity fields may remain as bounded model-facing projections for compatibility during this packet. If they remain:

- derive them directly from the exact receipt;
- reject a request whose projected opportunities disagree with that receipt; and
- use the receipt, not the projections, for ratification, scheduling, and forensics.

Do not run `selectCastActivityEligibility()` a second time later in the same turn.

### Request-boundary requirement

A successful `/api/turn` request must contain a complete `context.horrorGrammar` object. Remove the optional-success path that allows the active Engine turn route to ratify against invented empty HG1 state.

Legacy Blueprints remain supported because `buildEngineTurnContext()` must construct a complete neutral HG1 context for them. Do not require a legacy author to add values or pursuits.

If `EngineTurnContextSchema` is shared with a genuinely non-turn consumer that cannot carry HG1 context, enforce the requirement at `TurnRequestSchema` or the `/api/turn` admission boundary rather than weakening the active turn contract.

## 3. Complete server ownership of the deterministic HG1 receipt chain

The server has the accepted narrative reconciliation receipt, exact typed HG1 pre-state, exact activity eligibility receipt, and immutable authoring baseline. It must derive and return the complete HG1 state transition.

### Fictional time

For an ordinary turn:

- call `advanceFictionalTimeLedger()` once on `context.horrorGrammar.runtimeState.fictionalTime`;
- use only `narrativeReconciliationReceipt.fictional_time_cost` as the accepted cost; and
- return the typed `FictionalTimeReceipt`.

For `SYSTEM_INIT`:

- return a schema-valid receipt whose pre-state and post-state are exactly equal;
- do not increment any fictional-time revision;
- do not replace an existing `last_cost`; and
- do not schedule or consume an opportunity merely because initialization generated prose.

### Pursuit schedule

Add a strict typed receipt for pursuit-schedule publication near the existing HG1 schemas. It must contain:

```ts
{
  version: 1;
  preState: PursuitScheduleLedger;
  postState: PursuitScheduleLedger;
}
```

Use the existing exact activity eligibility receipt and accepted fictional-time post-state to derive the schedule post-state once.

`advancePursuitScheduleLedger()` currently reaches through a Blueprint only to read reviewed character-pursuit baselines. Refine its input so the server can provide the typed `authoringBaseline.characterPursuits` directly. Do not synthesize a fake Blueprint, send a raw Blueprint through the route, or recover authoring facts from prompt text.

For `SYSTEM_INIT`, pursuit-schedule pre-state and post-state must be exactly equal.

### Existing HG1 ratifiers

Continue to derive these receipts from the exact typed pre-state already carried in `context.horrorGrammar.runtimeState`:

- cast activity proposal receipt;
- situated-pressure receipt;
- value-state receipt;
- character-pursuit receipt;
- character-development receipt; and
- pressure-thread-transition receipt.

The route must use the exact context selection receipt for cast-activity ratification. Delete the fabricated receipt that currently reconstructs the visible opportunity arrays while replacing bounded-out, dormant, and not-due evidence with zeros.

Return all HG1 state receipts from `finalResponse`, including:

- fictional-time receipt;
- exact activity-eligibility receipt;
- pursuit-schedule receipt;
- the six existing proposal/transition receipts.

Do not modify `TurnResultSchema`, the Gemini provider schema, the six HG1 provider proposal envelopes, generation prompts, or model-selection policy. These are post-generation application receipts.

## 4. Make a complete HG1 receipt chain mandatory for successful turn publication

Update the successful server-response contract so the HG1 state receipts listed above are required for a successful Engine turn.

Do not make them optional and then repair omissions with defaults. A missing receipt is a structural response mismatch and must fail before publication.

Add one pure validation/projection boundary, in a narrowly named module if helpful, that accepts:

- the exact canonical pre-turn `LogicState`; and
- the complete typed HG1 receipt chain.

It must verify at least:

1. fictional-time receipt pre-state equals `fictional_time_ledger`;
2. pursuit-schedule receipt pre-state equals `pursuit_schedule_ledger`;
3. activity receipt pre-state equals `activity_events`;
4. situated-pressure receipt pre-state equals `pressure_threads`;
5. value receipt pre-state equals `value_state_ledger`;
6. character-pursuit receipt pre-state equals `character_pursuit_ledger`;
7. character-development receipt pre-state equals `character_development_ledger`;
8. pressure-transition pre-state equals the situated-pressure post-state; and
9. the final pressure post-state comes from the pressure-transition receipt.

The comparison must be structural and deterministic. Do not compare object identity and do not stringify arbitrary provider payloads.

On success, this boundary should return or expose the exact seven-field HG1 post-state projection used by Runtime. On failure, emit a bounded safe error code/path. Do not include raw provider output, prompt text, manifestation prose, credentials, endpoints, or stack traces in the User-facing error.

## 5. Remove client recomputation and untyped publication fallbacks

In `executeRatificationPipeline()`:

- delete the post-response call to `selectCastActivityEligibility()`;
- delete client-side fictional-time advancement;
- delete client-side pursuit-schedule advancement;
- attach the route's typed fictional-time, eligibility, and schedule receipts to the ratified frame; and
- project HG1 `logic_state` compatibility fields, if still required internally, only from typed receipt post-states.

In Runtime publication:

- validate the complete HG1 receipt chain against `engineGameStateBefore` before calling `coordinateCanonicalTurnPublication()`;
- populate all seven HG1 owners exclusively from the validated receipt post-state projection;
- remove receipt-or-`logic_state` fallback branches for those seven owners; and
- commit nothing when any required receipt is missing, malformed, stale, or inconsistent.

Do not alter the existing non-HG consequence, stance, relationship, memory, World Memory, topology, or presentation-patch owners.

Do not convert telemetry or the existing Packet 1-8 forensic structure into canonical state.

## 6. Validate the persisted HG1 slice without reinitializing hydration

Extend `EnginePersistedSchema` so all seven HG1 fields are explicitly schema-validated when present.

Requirements:

- a valid persisted HG1 slice survives hydration exactly;
- a legacy persisted session with the fields absent retains existing compatibility behavior;
- malformed HG1 persisted state is not adopted as canonical state;
- hydration must not call fresh-session initialization over valid existing ledgers; and
- do not add another persistence key, migration store, or reconciliation owner.

Keep the recent single-write session ingress and shared session-ID repair intact.

## 7. Required focused proofs

Use small, invented, scenario-neutral fixtures. Do not use copyrighted story names, plot details, or production-specific character assumptions.

Use visibly distinct sentinels for every ledger so replacement with `{}`, `[]`, Blueprint baseline state, or another ledger is detectable.

### A. Context and selection ownership

Prove:

- a fresh reviewed Blueprint creates all seven initial owners once;
- a legacy Blueprint creates a complete neutral context;
- a supplied nonempty canonical HG1 slice reaches `context.horrorGrammar.runtimeState` exactly;
- the exact activity eligibility receipt reflects the current character-pursuit overlay, including a dormant/blocked or redirected pursuit; and
- model-facing opportunity projections cannot disagree with the exact selection receipt at route admission.

### B. Route receipt completeness

For a valid ordinary turn, prove the route returns every required HG1 receipt and that:

- fictional time advances exactly once according to the accepted reconciliation cost;
- pursuit schedule advances from the exact selection receipt;
- a `NONE` activity/pressure/value/pursuit/development/transition proposal preserves the corresponding canonical owner; and
- nonempty pre-state never becomes an empty fallback.

For `SYSTEM_INIT`, prove fictional time, schedule, activity, pressure, value, pursuit, and development pre/post state remain exactly equal.

### C. Client consumes; client does not re-derive

Mock a valid typed route response whose eligibility receipt would differ from a fresh local recomputation. Prove the client preserves the route receipt and never calls the selector or time/schedule advancement helpers after receiving the response.

Delete or rewrite existing tests that bless the duplicate client derivation.

### D. Fail-closed receipt-chain validation

Individually omit or mismatch:

- fictional-time receipt;
- pursuit-schedule receipt;
- activity pre-state;
- pressure pre-state;
- value pre-state;
- pursuit pre-state;
- development pre-state; and
- pressure-transition linkage.

Each case must fail before `coordinateCanonicalTurnPublication()` and leave both stores, history, story log, turn count, topology, Retake checkpoint, and all seven HG1 owners unchanged.

### E. Consecutive real client turns

Drive two turns through the actual client request and publication boundary with mocked route responses:

1. Turn one begins from a nonempty, distinctive seven-ledger pre-state and commits a valid deterministic HG1 post-state.
2. Turn two's outbound request must contain exactly Turn one's published post-state in all seven domains.

This proof must not hand-write the second request context or manually patch the stores between turns.

### F. Persistence and Retake

Prove:

- a valid nonempty seven-ledger slice survives persistence hydration byte-for-byte at the ledger level;
- malformed persisted HG1 state is rejected without contaminating the active session;
- a legacy persisted session remains compatible; and
- Retake restores the exact complete pre-turn seven-ledger slice after a successful HG1 turn.

## Focused verification gate

Run only the focused Packet 1-6 checks:

```bash
npx vitest run src/lib/buildEngineTurnContext.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts server/routes/turn.horrorGrammar1.test.ts src/components/engine/Runtime.horrorGrammar1.test.tsx src/components/engine/Runtime.retake.test.tsx src/core/engine/sessionPersistence.test.ts src/core/store.test.ts src/lib/sessionReconciliation.test.ts
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/types/index.ts src/core/store.ts src/lib/fictionalTime.ts src/lib/castActivityEligibility.ts src/lib/buildEngineTurnContext.ts src/lib/ratificationPipeline.ts server/routes/turn.ts src/components/engine/Runtime.tsx src/core/engine/commitCoordinator.ts src/core/engine/reducer.ts src/lib/sessionReconciliation.ts
git diff --check
```

If implementation adds one narrowly named HG1 state-threading module and test, include those exact paths in the focused Vitest and ESLint commands.

If a listed test has been renamed, run its current owning equivalent and report the substitution.

Do not run the complete Vitest suite, global TypeScript check, full lint, or production build in Packet 1-6. Packet 1-9 owns the broad stabilization gate.

## Explicit non-goals

Do not:

- begin Packet 1-7 authority/source/perception changes;
- redesign or expand Packet 1-8 forensics;
- begin Horror Grammar 2;
- change Gemini structured-output or provider schemas;
- alter prompts, model IDs, temperature, thinking level, retry policy, or provider behavior;
- weaken Zod contracts or convert missing receipts to neutral defaults;
- add a visible clock, pursuit meter, horror score, threat meter, recommended action, or player choice menu;
- simulate every offscreen character every turn;
- change Director identity behavior, cast-addressing semantics, Forge ambiguity resolution, Voice behavior, or Autopilot cadence;
- unify the two Zustand stores or redesign persistence;
- change content-policy handling;
- embed any test scenario, source title, cast name, or copyrighted story fact in production logic; or
- perform unrelated cleanup, formatting, dependency changes, README edits, or roadmap edits.

## Stop conditions

Stop and report rather than broadening scope if:

- a complete typed receipt chain cannot be returned without modifying the Gemini provider schema;
- the required change would replace the existing atomic publication coordinator;
- a valid turn can no longer preserve User action verbatim;
- a failed or incomplete turn mutates either canonical store;
- Retake can no longer restore the exact pre-turn HG1 slice;
- rejected/provider/internal material enters narrative, prompt context, memory, canon, or ordinary exports; or
- a focused failure is demonstrably unrelated to Packet 1-6.

## Completion report

Return one report containing only:

1. starting and ending commit/workspace revision;
2. exact files changed;
3. the final owner and transition path for each of the seven HG1 domains;
4. where activity eligibility is computed and proof that it is computed once;
5. the successful-response receipt fields that are now required;
6. two-turn continuity evidence;
7. `SYSTEM_INIT`, persistence, incomplete-receipt, failure-isolation, and Retake evidence;
8. every focused command and exact result;
9. `git status --short`; and
10. final classification: `PACKET_1_6_COMPLETE` or `PACKET_1_6_INCOMPLETE` with exact blockers.

Do not call Horror Grammar 1 accepted after this packet. A clean Packet 1-6 result authorizes review for Packet 1-7 only.
