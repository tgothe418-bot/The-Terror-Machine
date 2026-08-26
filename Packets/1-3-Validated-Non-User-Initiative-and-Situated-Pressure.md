# 1-3 Validated Non-User Initiative and Situated Pressure

**Series:** TTM Horror Grammar  
**Roadmap update:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-3 of 1-5  
**Depends on:** Packets 1-1 and 1-2 completed with their focused gates passing  
**Expected baseline lineage:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c` plus the completed Packet 1-1 and 1-2 changes

## Governing invariant

> The model may propose one bounded non-User activity and one value-linked pressure event from the application-selected opportunity set. The machine validates both. Only accepted, perceivable manifestation text may enter the fiction, and the User alone chooses the response.

This is the first runtime vertical slice of Horror Grammar 1. It must build through the existing `/api/turn` request, structured response, ratification, coherent publication, history, and Retake boundaries.

## Objective

Allow the world to initiate causally grounded change instead of only reacting to the User, while preserving all of the following:

- no second model call or background simulation loop;
- no fixed scare cadence;
- no generated User action, thought, decision, emotion, or intention;
- no unvalidated manifestation hidden inside ordinary narrative blocks;
- no invented actor, value, pursuit, topology, or causal authority;
- no canonical mutation from a rejected proposal; and
- no provider-refusal or internal diagnostic material in fiction.

## Start gate

Before editing:

1. Read this packet completely.
2. Confirm the Packet 1-1 and 1-2 completion reports record passing focused gates and no blocker.
3. Preserve their cumulative implementation and inspect the live contracts before editing.
4. If the activity-opportunity context is not deterministic and bounded, stop; do not compensate by asking the model to select from the full cast.

Inspect at minimum:

- `src/types/engineContract.ts`
- the Horror Grammar types from the preceding packets
- `src/lib/castActivityEligibility.ts`
- `src/lib/buildEngineTurnContext.ts`
- `server/routes/turn.ts`
- `src/lib/ratificationPipeline.ts`
- `src/core/engine/turnHistory.ts`
- `src/core/engine/commitCoordinator.ts`
- `src/components/engine/Runtime.tsx`
- `src/lib/depictionContractContext.ts`
- current stance, relationship, memory, World Memory, presence, and topology resolvers
- their focused tests

## Existing seam to preserve

The live turn route already performs one structured generation containing base narrative plus state proposals. The server ratifies proposals into receipts before the client prepares canonical post-state.

Keep that one-call architecture. Add isolated initiative proposal fields and compose accepted manifestation blocks after validation. Do not introduce a planner call followed by a prose call in this packet.

## 1. Add strict proposal and receipt contracts

Extend the shared Horror Grammar module with strict discriminated unions. Every string and array must be bounded. Every decision uses a stable allowlisted reason code.

### Cast activity proposal

The response must always contain exactly one of:

- `NONE`, with one bounded reason code; or
- `ACTIVITY`, containing:
  - a proposal ID;
  - one actor ID from the supplied activity-opportunity list;
  - the selected pursuit ID when the actor was eligible through an offscreen pursuit;
  - the actor's canonical location ID or explicit absence of a located manifestation;
  - a concise activity summary;
  - exact typed causal/authority references drawn from the supplied context;
  - a perception path of `DIRECT`, `MEDIATED`, `LOCAL_TRACE`, or `UNOBSERVED`;
  - an optional isolated activity manifestation block; and
  - no field capable of containing a User decision or proposed User action.

`NONE` must remain valid on every turn, regardless of tension, phase, elapsed turns, or open pressure threads.

### Situated pressure proposal

The response must always contain exactly one of:

- `NONE`, with one bounded reason code; or
- `PRESSURE`, containing:
  - a proposal ID;
  - one accepted Blueprint value-anchor ID;
  - a source reference to the accepted activity from this turn or to an exact current canonical condition;
  - a descriptive pressure operator;
  - an affected dimension;
  - a concise adverse prospect;
  - typed authority references;
  - a persistence target supported by current canonical owners;
  - an explicit open response-window marker; and
  - one isolated manifestation block.

Use compact descriptive operator tags based on the current research, such as `EXPOSE`, `CONSTRAIN_ACCESS`, `ACCELERATE`, `CORRUPT_TRUST`, `DEGRADE_CAPABILITY`, `CLOSE_DISTANCE`, `DESTABILIZE_KNOWLEDGE`, `VIOLATE_EXPECTATION`, `IMPOSE_COST`, and `OTHER`. They are telemetry labels, not a mandatory threat taxonomy or escalation ladder.

Affected dimensions may be a similarly compact bounded set such as access, knowledge, time, trust, exposure, capability, safety, relationship, freedom, identity, or other. This packet records the claimed dimension; it does not implement the full escalation semantics reserved for Horror Grammar 7.

### Receipts

Create typed activity and pressure receipts with:

- proposal identity;
- accepted/rejected/no-proposal outcome;
- stable decision reason;
- canonical pre-state and post-state for any state this packet owns;
- whether an isolated manifestation block was admitted to narrative;
- the accepted event/thread ID when applicable; and
- a bounded sanitized proposal snapshot for later forensic rendering.

The snapshot may contain parsed proposal fields and exact bounded manifestation content. It must never contain raw provider response objects, prompts, safety metadata, endpoint details, credentials, stack text, or chain-of-thought.

## 2. Add small canonical activity-event and pressure-thread state

Add strict neutral-default state owned by the existing situated game state:

### Activity events

Maintain a bounded recent ledger of accepted non-User activity events. Each event records:

- stable event ID;
- actor and optional pursuit ID;
- concise canonical activity summary;
- canonical location or `null`;
- perception path;
- committed turn/revision;
- exact causal reference(s); and
- whether it was manifested to the User character.

This ledger is not an unbounded transcript. Choose one small exported cap, evict oldest entries deterministically, and leave enduring world facts to the existing World Memory path.

### Pressure threads

Maintain a bounded set of current situated-pressure threads. An accepted thread records:

- stable thread ID;
- value-anchor ID;
- holder reference copied from the accepted anchor, not trusted from model echo;
- source activity/event or canonical-condition reference;
- operator and affected dimension;
- adverse prospect;
- accepted manifestation summary;
- current status `OPEN`;
- created and last-changed turn/revision; and
- persistence target.

An open pressure thread is a canonical adverse prospect, not proof that the feared outcome already occurred. Do not automatically injure a character, alter a relationship, remove an item, move a character, reveal a fact, or mark a value lost merely because pressure was accepted.

Use small exported caps and deterministic state-limit decisions. A state-limit rejection must not silently replace or overwrite an unrelated active thread.

## 3. Ratify cast activity before pressure

Create the pure activity ratifier in `src/lib/castActivity.ts`. It must reject an `ACTIVITY` proposal unless:

- the actor exists, is not User-controlled, and appears in the exact pre-turn eligibility receipt;
- an offscreen actor cites the exact pursuit opportunity that made them eligible;
- a present actor's claimed location equals canonical presence;
- all referenced IDs and authority claims resolve in the supplied pre-turn context;
- the proposed activity does not mutate an unsupported domain;
- its perception path is structurally possible; and
- any manifestation block satisfies the ownership rules below.

Perception rules for Update 1:

- `DIRECT` requires the actor and User character to be in the same canonical node;
- `MEDIATED` requires the actor's accepted expression profile to allow mediated communication and an exact current canonical basis for the channel;
- `LOCAL_TRACE` requires the proposed trace/effect to resolve to the User character's current node and an accepted causal source capable of leaving it;
- `UNOBSERVED` may commit a bounded activity event but must not contribute a narrative block or immediate pressure manifestation.

The Depiction Contract controls how an authorized event may be depicted. It is not, by itself, causal authority for movement, supernatural action, knowledge, injury, or access.

This packet does not authorize free-form character movement or generic state patches. If the current topology and presence owner cannot validate a proposed movement through an existing allowed edge, reject the movement effect and keep the activity event limited to its canonical location. Do not loosen topology to make a proposal work.

## 4. Ratify situated pressure against accepted canon

Create the pure pressure ratifier in `src/lib/situatedPressure.ts`. It runs after activity ratification and must reject a `PRESSURE` proposal unless:

1. its value anchor exists in the accepted Blueprint baseline;
2. its source resolves to an activity accepted this turn or an exact supplied canonical condition;
3. every authority reference resolves to accepted current rules, cast, topology, memory, or state;
4. the manifestation is perceivable through a validated path;
5. the adverse prospect concerns the referenced valued state and names a prospective change rather than claiming an unsupported completed consequence;
6. the persistence target is an existing typed owner;
7. the response window remains open; and
8. the proposal neither supplies nor presupposes the User's response.

The machine can prove reference, ownership, state-effect, and perception constraints. Do not describe those structural checks as proof that arbitrary natural-language prose is semantically infallible. Keep the realization bounded and covered by the existing Depiction Contract and User-sovereignty prompt rules.

Do not require pressure on any fixed turn. A quiet turn, relief, ordinary activity, or `NONE` remains valid.

## 5. Isolate and compose manifestation text after validation

Update the structured generation contract so that:

- `narrative_blocks` contains only the base response to the submitted User action;
- self-originating cast activity appears only in the isolated activity manifestation block;
- a new adverse prospect appears only in the isolated pressure manifestation block; and
- the prompt explicitly forbids copying either unratified initiative into base blocks, `engine_thoughts`, or ordinary `logic_state` text.

Server order:

1. parse the complete model response;
2. ratify existing User-action proposals;
3. ratify the isolated cast activity;
4. ratify pressure using only accepted activity/canon;
5. discard every rejected manifestation block from the response's narrative output;
6. append accepted isolated blocks to base narrative in a deterministic order; and
7. return strict receipts and composed narrative.

An invalid activity or pressure proposal is a rejected optional proposal, not automatically a failed User turn. The valid base response and other valid receipts may still commit. A structurally malformed provider response continues to use the existing contract-mismatch path.

Use unmistakable rejected-text sentinels in tests. Prove rejected manifestation content is absent from composed narrative, story log, active canonical state, next-turn prompt context, player UI, and ordinary narrative export paths.

## 6. Preserve User sovereignty in realization

Enforce at minimum:

- no activity actor may be the User character;
- no activity or pressure schema contains a generated User-action field;
- no manifestation block may be `internal_monologue` for the User character;
- dialogue speakers must resolve to the accepted non-User actor or another canonically present non-User speaker;
- the prompt must end the manifestation at the changed situation or adverse prospect;
- no menu, recommended response, forced choice, declared fear, automatic compliance, or substituted intention may be appended;
- source material may inform what the User character can perceive, know, or plausibly do, but never what the User decides.

Do not implement a brittle ban on all second-person prose. Enforce ownership structurally, use the existing role/depiction contracts, and test explicit violations.

## 7. Wire the accepted result through existing publication

Extend `TurnResultSchema`, `TurnResponseSchema`, `RatifiedEngineFrame`, `TurnReceipt`, turn history construction, and `Runtime.tsx` so the accepted activity-event and pressure-thread post-states are fully prepared before the existing coordinated canonical publication.

Requirements:

- proposal fields from the model never enter `preparedGameState` directly;
- only ratifier-produced post-state does;
- rejection preserves exact pre-state;
- the activity/pressure receipts in history match the state published in the same turn revision;
- failure after server response but before publication commits neither state nor manifestation;
- Retake compatibility is preserved by keeping all new canonical state inside the existing restorable game-state boundary.

Do not patch accepted activity or pressure state after `TURN_COMMITTED`.

## 8. Required proof

Add focused tests proving:

### Proposal restriction

- `NONE` is valid for both proposal fields on every turn;
- only selected present/offscreen actors can be proposed;
- the User character, omitted cast, dormant pursuits, unknown IDs, mismatched pursuit IDs, and invalid locations are rejected;
- invalid authority and perception paths reject without state mutation;
- an unobserved offscreen activity can enter the bounded canonical activity ledger but cannot enter narrative.

### Pressure validity

- an accepted pressure resolves an established value, accepted source, current authority, perceivable manifestation, open response window, and supported persistence target;
- invented values, copied holder echoes, unsupported completed consequences, closed response windows, and Depiction-Contract-only authority are rejected;
- accepted pressure creates an open prospect and does not itself mark the feared outcome complete;
- pressure is never mandatory by turn number, tension, or phase.

### Narrative containment

- accepted isolated blocks are composed once in deterministic order;
- rejected activity and pressure sentinels do not reach narrative, story log, next prompt, canonical state, UI, Markdown, or HTML narrative sections;
- invalid optional proposals do not erase an otherwise valid User-turn response;
- malformed structured output still fails through the safe existing failure path.

### Publication

- accepted event/thread post-state and matching receipts publish in the same canonical revision;
- failed publication leaves pre-state and narrative unchanged;
- no post-commit patch path exists for the new fields.

## 9. Focused verification gate

Run only the focused suites for this vertical slice:

```bash
npx vitest run src/lib/castActivity.test.ts src/lib/situatedPressure.test.ts src/lib/buildEngineTurnContext.test.ts
npx vitest run server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts
npx vitest run src/core/engine/commitCoordinator.test.ts src/core/engine/reducer.test.ts src/lib/download.test.ts
npx tsc --noEmit
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/types/index.ts src/lib/castActivity.ts src/lib/situatedPressure.ts src/lib/buildEngineTurnContext.ts src/lib/ratificationPipeline.ts src/core/engine/turnHistory.ts src/core/engine/commitCoordinator.ts src/core/engine/reducer.ts src/components/engine/Runtime.tsx server/routes/turn.ts
git diff --check
```

Use new focused Horror Grammar route/pipeline tests rather than rerunning every unrelated case in a monolithic suite. Do not run the unscoped full Vitest suite for this packet.

## 10. Explicit non-goals

Do not implement in this packet:

- a second planning/generation call;
- free-running simulation between User turns;
- multiple independent activity or pressure proposals per turn;
- general character-goal, belief, identity, or relationship evolution;
- automatic value damage or loss;
- full threat jurisdiction, uncertainty, escalation, or aftermath grammar;
- a required scare cadence;
- a universal pressure score;
- a new player choice UI; or
- the full forensic telemetry presentation added in Packet 1-5.

## 11. Packet completion report

Return a concise packet report containing:

1. cumulative start state and exact files changed;
2. final activity/pressure proposal and receipt shapes;
3. ratification order and stable rejection reasons;
4. canonical activity-event and pressure-thread ownership/caps;
5. narrative-isolation and User-sovereignty proof;
6. focused test, TypeScript, lint, and diff-check results;
7. any residual blocker that prevents Packet 1-4.
