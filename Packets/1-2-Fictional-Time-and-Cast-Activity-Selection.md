# 1-2 Fictional Time and Cast Activity Selection

**Series:** TTM Horror Grammar  
**Roadmap update:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-2 of 1-5  
**Depends on:** Packet 1-1 completed with its focused gate passing  
**Expected baseline lineage:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c` plus the completed Packet 1-1 changes

## Governing invariant

> Immediately present non-User characters receive an opportunity to act on every committed User turn. Offscreen characters are considered only when elapsed fictional time, a reviewed pursuit, or a canonical trigger makes them relevant. Opportunity does not require visible action.

The application selects who is eligible. The model does not sort the entire cast, choose its own actor pool, or awaken dormant characters by convenience.

## Objective

Turn the existing `fictional_time_cost` receipt into a small canonical fictional-time ledger, then use that ledger with presence and reviewed pursuits to build a deterministic, bounded activity-opportunity list for each User turn.

This packet creates eligibility and prompt context only. It does not yet authorize the model to commit independent non-User activity or situated pressure.

## Start gate

Before editing:

1. Read this packet completely.
2. Confirm Packet 1-1's completion report records a passing focused gate and no blocker.
3. Preserve the cumulative Packet 1-1 implementation. The workspace may be clean at a new revision or may contain only the intentional cumulative series changes.
4. Inspect the active production paths and adjust filenames only where the live implementation requires it.
5. If unrelated tracked changes overlap this scope, or Packet 1-1 left a failing contract, stop and report the exact conflict.

Inspect at minimum:

- `src/types/engineContract.ts`
- the Horror Grammar types created in Packet 1-1
- `src/lib/narrativeReconciliation.ts`
- `src/lib/buildEngineTurnContext.ts`
- `src/lib/ratificationPipeline.ts`
- `src/lib/castPresence.ts`
- `src/core/engine/turnHistory.ts`
- `src/core/engine/commitCoordinator.ts`
- `src/components/engine/Runtime.tsx`
- `server/routes/turn.ts`
- focused tests for those paths

## Existing seam to preserve

The live turn contract already returns a strict `NarrativeReconciliationReceipt` containing one of:

- `MOMENT`;
- `SCENE_BEAT`;
- `EXTENDED`; or
- `UNCLEAR`.

The context builder already knows the User-character binding, canonical cast, current topology node, character presence, relationships, memory, and turn number. Reuse these facts. Do not add a second clock service, background worker, timer, or hidden model call.

## 1. Add strict fictional-time state and receipts

Create `src/lib/fictionalTime.ts` and extend the shared Horror Grammar type module with strict, neutral-default schemas for a fictional-time ledger and its per-turn receipt.

The ledger must use monotonic revision counters rather than a fake calendar or a visible numeric game mechanic:

- `moment_revision`;
- `scene_beat_revision`;
- `extended_revision`; and
- the last accepted fictional-time cost, nullable before the first committed User turn.

Apply accepted reconciliation costs deterministically:

| Accepted cost | Moment revision | Scene-beat revision | Extended revision |
| --- | ---: | ---: | ---: |
| `MOMENT` | +1 | unchanged | unchanged |
| `SCENE_BEAT` | +1 | +1 | unchanged |
| `EXTENDED` | +1 | +1 | +1 |
| `UNCLEAR` | unchanged | unchanged | unchanged |

Requirements:

- only a successfully committed User turn advances the ledger;
- `SYSTEM_INIT`, failed turns, provider refusals, ignored input, and Retake itself do not advance it;
- `UNCLEAR` is recorded as the last cost but does not make offscreen work due by assumption;
- application code derives the post-state from the accepted receipt; the model never supplies absolute counters;
- integer bounds and overflow behavior are explicit and tested;
- legacy sessions initialize all revisions to zero with `last_cost: null`.

The per-turn receipt must contain the exact pre-state, accepted cost, and derived post-state.

## 2. Add canonical activity-scheduling state

Add a strict activity schedule keyed by reviewed pursuit ID. Each record must store only what deterministic selection needs, including:

- the last fictional-time revisions at which the pursuit was considered;
- the last committed turn on which it was considered, nullable initially; and
- the latest eligibility disposition needed to prevent starvation and explain selection.

Do not store an urgency score, dramatic priority score, or model-authored next-turn number.

Normalize schedule state against the compiled Blueprint:

- unknown pursuit IDs are discarded at the migration/initialization boundary;
- newly reviewed pursuits receive neutral never-considered stamps;
- a pursuit marked `DORMANT` cannot become active because its schedule record exists;
- changing or removing a pursuit in a new session cannot carry an old schedule record into it.

## 3. Implement one pure deterministic selector

Create one named pure module at `src/lib/castActivityEligibility.ts` that receives only validated pre-turn facts and returns a strict eligibility result.

### Present non-User characters

- Every non-User cast member whose canonical presence node equals the current node is eligible on every User turn.
- Include the character once even if they have multiple pursuits.
- Their opportunity may be used for speech, silence, reaction, continued activity, or no visible action in the next packet.
- Eligibility must never compel a manifestation.

### User-controlled character

- Never place the User-controlled character in the non-User activity pool.
- Source-derived goals or value anchors may enter bounded agency context, but they do not authorize a generated User action, thought, decision, fear, or intention.

### Offscreen non-User characters

An offscreen character is eligible only when all of the following are true:

1. the Blueprint contains an accepted `ACTIVE` pursuit for that character;
2. the pursuit is not already represented by a present-character opportunity;
3. its reviewed window is due from the canonical ledger, or its `EVENT_DRIVEN` trigger appears in accepted canonical trigger input;
4. the pursuit and character still resolve in the current Blueprint/session; and
5. it survives the bounded deterministic selection described below.

Window semantics:

- `MOMENT` becomes due after the moment revision advances beyond its last considered stamp;
- `SCENE_BEAT` becomes due after the scene-beat revision advances;
- `EXTENDED` becomes due after the extended revision advances;
- `EVENT_DRIVEN` becomes due only from an exact accepted trigger reference, never substring inference over prose or User input.

### Bounded selection and fairness

- Select no more than two offscreen pursuits per turn.
- Select no more than one pursuit for the same offscreen character in a turn.
- Order due candidates by oldest last-considered turn, then stable pursuit ID.
- Record due-but-omitted pursuit IDs so subsequent committed turns can select them without starvation.
- Never ask the model to rank omitted characters.
- Characters with `REVIEWED_NONE`, no active pursuit, a dormant pursuit, or no due window consume no activity-opportunity prompt space.

Use one exported constant for the offscreen cap and test it. Do not expose it in the player UI.

## 4. Add a strict eligibility receipt

The selector result and per-turn receipt must distinguish:

- present actor opportunities;
- selected offscreen pursuit opportunities;
- due but bounded-out pursuits;
- dormant or not-due material only as aggregate counts, not full prompt payloads; and
- the canonical ledger and schedule revision used for selection.

Use stable reason codes, not free-form internal explanations. The receipt must be deterministic for identical input.

The schedule advances its “considered” stamps only when the containing User turn commits. A provider failure or rejected frame must leave the exact pre-turn ledger and schedule intact so retrying considers the same opportunity set.

## 5. Project a bounded activity-opportunity context

Extend `EngineTurnContextSchema` and `buildEngineTurnContext()` with one bounded Horror Grammar context containing:

- the active value anchors relevant to the selected actor or pursuit;
- all present non-User actor opportunities;
- at most two selected offscreen pursuit opportunities;
- each selected actor's stable ID, presence/location disposition, concise pursuit objective and approach when applicable, reviewed time window, and referenced value IDs;
- the current fictional-time revisions; and
- explicit instruction-level authority that only listed candidates may be considered for independent activity.

Do not project:

- source excerpts or source binding data;
- every value and pursuit in the Blueprint;
- full schedule state;
- due-but-omitted pursuit details;
- dormant characters' pursuit details;
- rejected proposals from any earlier turn; or
- telemetry-only explanations.

The existing cast context may remain for compatibility in this packet, but the server prompt must not ask the model to sort or advance the full cast. Any future independent-activity field must be restricted to the application-selected opportunity list.

If the User action explicitly names a known cast member, the existing context may include that character for ordinary response interpretation. Mere name mention does not make an absent character independently activity-eligible unless the rules above also select them.

## 6. Wire state preparation without enabling activity generation

Thread the validated pre-turn ledger, schedule, and eligibility through the current coherent turn path:

1. obtain them from the same canonical pre-state used for the turn request;
2. include the bounded opportunity context in the request;
3. after an accepted turn response, derive the fictional-time post-state from the accepted reconciliation receipt;
4. derive schedule post-state from the exact eligibility result used in the request;
5. attach both typed receipts to the ratified frame/turn receipt; and
6. place both validated post-states into `preparedGameState` before coordinated canonical publication.

Do not publish either state through an after-the-fact patch. Do not mutate them if the request, response, validation, or publication fails.

This packet must leave the new context in observational mode. The model may see who is eligible, but the structured response contract must not yet accept an independent activity or pressure proposal.

## 7. Required proof

Add focused tests proving:

### Fictional time

- each accepted cost produces the exact revision changes above;
- `UNCLEAR`, `SYSTEM_INIT`, failure, refusal, and ignored input do not advance due windows;
- a failed attempt followed by retry sees the same ledger and eligibility pre-state;
- neutral legacy initialization is deterministic.

### Eligibility

- every present non-User character is selected every User turn;
- the User character is never selected;
- active offscreen pursuits become due only from their reviewed window or exact trigger;
- dormant, reviewed-none, missing, and not-due pursuits are omitted;
- the two-offscreen cap, one-pursuit-per-character rule, stable ordering, and fairness behavior hold;
- identical input produces byte-equivalent parsed output.

### Context and commit boundary

- the provider request contains all present opportunities and no more than two offscreen opportunities;
- the provider request omits dormant and due-but-bounded-out pursuit details;
- rejected/failed turns leave ledger and schedule unchanged;
- successful publication includes both post-states in the prepared canonical state;
- no activity or pressure proposal is accepted yet.

## 8. Focused verification gate

Run only the focused suites for this packet:

```bash
npx vitest run src/lib/fictionalTime.test.ts src/lib/castActivityEligibility.test.ts src/lib/buildEngineTurnContext.test.ts
npx vitest run src/lib/ratificationPipeline.test.ts src/core/engine/commitCoordinator.test.ts server/routes/turn.horrorGrammar1.test.ts
npx tsc --noEmit
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/lib/fictionalTime.ts src/lib/castActivityEligibility.ts src/lib/buildEngineTurnContext.ts src/lib/ratificationPipeline.ts src/core/engine/turnHistory.ts src/core/engine/commitCoordinator.ts src/components/engine/Runtime.tsx server/routes/turn.ts
git diff --check
```

Create the new focused test files where needed rather than expanding an unrelated monolithic route suite. Do not run the unscoped full Vitest suite for this packet.

## 9. Explicit non-goals

Do not implement in this packet:

- an independent non-User action proposal;
- a visible non-User action merely because a character was eligible;
- a situated pressure proposal or manifestation;
- character movement or pursuit progress;
- value-condition or character-development mutation;
- a real-world calendar or wall-clock scheduler;
- a global tension/escalation cadence;
- a background model call;
- a player-facing clock, roster status, or activity meter; or
- forensic telemetry rendering.

## 10. Packet completion report

Return a concise packet report containing:

1. cumulative start state and exact files changed;
2. fictional-time ledger semantics;
3. selector inputs, cap, ordering, and fairness rules;
4. the exact bounded context shape;
5. proof that eligibility remains observational in this packet;
6. focused test, TypeScript, lint, and diff-check results;
7. any residual blocker that prevents Packet 1-3.
