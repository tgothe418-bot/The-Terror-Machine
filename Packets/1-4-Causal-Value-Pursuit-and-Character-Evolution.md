# 1-4 Causal Value, Pursuit, and Character Evolution

**Series:** TTM Horror Grammar  
**Roadmap update:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-4 of 1-5  
**Depends on:** Packets 1-1 through 1-3 completed with their focused gates passing  
**Expected baseline lineage:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c` plus the completed Packet 1-1 through 1-3 changes

## Governing invariant

> The Blueprint establishes a character baseline, not a permanent character sheet. The Engine may commit a causally supported change through the state owner that actually owns it. It may not mutate a character merely to preserve a planned arc, and it may not think or decide for the User-controlled character.

## Objective

Make accepted activity and pressure capable of changing the ongoing situation instead of remaining decorative. Add typed runtime overlays for value condition, pursuit development, and non-User character development; allow accepted non-User activity to use the existing stance, relationship, and memory owners when its causal and perception requirements are satisfied.

This packet does not create a generic “patch anything” model contract. Every accepted change must target a strict domain with a validated before-state, after-state, and canonical cause.

## Start gate

Before editing:

1. Read this packet completely.
2. Confirm the Packet 1-1 through 1-3 reports record passing focused gates and no blocker.
3. Preserve their cumulative implementation.
4. Confirm accepted activity events and open pressure threads publish through the existing coherent turn boundary before extending them.
5. If proposal rejection can currently leak manifestation into canon, stop and correct that Packet 1-3 acceptance failure before proceeding.

Inspect at minimum:

- the Horror Grammar schemas and ratifiers from Packets 1-1 through 1-3
- `src/types/characterStance.ts`
- `src/types/characterRelationships.ts`
- `src/types/characterMemory.ts`
- `src/types/consequence.ts`
- `src/lib/characterStance.ts`
- `src/lib/characterRelationships.ts`
- `src/lib/characterMemory.ts`
- `src/lib/worldMemory.ts`
- `src/lib/canonicalConsequences.ts`
- `src/lib/buildEngineTurnContext.ts`
- `server/routes/turn.ts`
- `src/lib/ratificationPipeline.ts`
- `src/components/engine/Runtime.tsx`
- focused tests for those paths

## 1. Separate immutable baseline from mutable runtime overlay

Keep accepted Forge material in the compiled Blueprint. Do not rewrite the Blueprint during play.

Implement the new pure state owners in `src/lib/valueState.ts`, `src/lib/characterPursuits.ts`, and `src/lib/characterDevelopment.ts`, with strict, neutral-default situated runtime state for:

1. value-anchor condition and lifecycle;
2. character-pursuit state; and
3. bounded non-User character-development facts.

Initialization must derive one runtime record per accepted Blueprint anchor and pursuit without altering the baseline text or provenance. Legacy scenarios with no reviewed foundations receive empty runtime state and continue normally.

## 2. Add value runtime state and transitions

Each accepted value anchor receives a runtime record containing:

- anchor ID;
- lifecycle status `ACTIVE`, `REVISED`, or `RETIRED`;
- current condition chosen from a compact set such as `ESTABLISHED`, `THREATENED`, `COMPROMISED`, `SECURED`, `LOST`, or `TRANSFORMED`;
- a bounded current-form note when the anchor has been revised or transformed;
- the last committed cause reference;
- last-changed turn/revision; and
- no importance or horror score.

Add a strict value-change proposal and ratifier. A proposal must include:

- anchor ID;
- operation `SET_CONDITION`, `REVISE`, `RETIRE`, or `RESTORE`;
- expected before-condition/lifecycle;
- proposed after-condition/lifecycle and bounded note;
- one exact canonical cause reference; and
- a bounded rationale for forensic review.

Validation requirements:

- the anchor and expected before-state must match canonical pre-state;
- the cause must be the accepted current User action, an accepted activity event, an accepted pressure thread transition, an accepted canonical consequence, or another exact current receipt/state reference;
- `THREATENED` may follow an accepted pressure prospect but does not imply `COMPROMISED` or `LOST`;
- damage, loss, transformation, security, restoration, and retirement require a committed event capable of producing that change;
- a rejected or stale transition preserves exact pre-state;
- a resolved or secured state cannot be silently reversed merely to maintain horror; a new causal event is required.

For an anchor held by the User-controlled character, the Engine may change the external condition of the valued state when canon supports it. It may not revise, retire, restore, or reinterpret what that character values on the model's initiative. The submitted User action may inform consequence resolution, but no generated proposal may declare the User character's new belief, attachment, desire, fear, or intention.

For non-User holders, lifecycle changes are allowed when the character participated in, perceived, or was canonically affected by the cited cause.

## 3. Add pursuit runtime state and transitions

Each reviewed pursuit receives a runtime overlay containing:

- pursuit and character IDs;
- current objective and approach, initialized from the Blueprint;
- current canonical location when known;
- status `ACTIVE`, `DORMANT`, `BLOCKED`, `COMPLETED`, or `ABANDONED`;
- a bounded progress/state summary;
- last canonical cause;
- last activity and last-changed turn/revision; and
- the existing review-window semantics used by activity eligibility.

Add a strict pursuit-change proposal with operations such as:

- `ADVANCE`;
- `SETBACK`;
- `REDIRECT`;
- `BLOCK`;
- `COMPLETE`;
- `ABANDON`;
- `PAUSE`; and
- `RESUME`.

The ratifier must validate:

- exact pursuit/character ownership;
- expected before-state;
- accepted causal reference;
- location references against current topology/presence;
- operation-specific required fields;
- no completion, failure, or abandonment from prose mood alone; and
- no state change from an activity proposal that was rejected or unobserved by the affected participant where observation is required.

An accepted offscreen activity may advance its actor's pursuit without narrating the event to the User. That state may enter later context only when the character, pursuit, or resulting trace becomes relevant under the selection rules.

Completed, abandoned, blocked, and dormant pursuits must affect later activity eligibility exactly as their status implies. They must not be reactivated without a new accepted `RESUME`, `REDIRECT`, or equivalent causal transition.

## 4. Add bounded non-User character-development facts

Create a strict runtime overlay for ongoing non-User character development that is not already owned by stance, relationships, memory, consequence, presence, or pursuit state.

Use a small descriptive dimension set such as:

- `GOAL`;
- `BELIEF`;
- `IDENTITY`;
- `ATTACHMENT`;
- `DISPOSITION`; and
- `OTHER`.

Do not duplicate:

- knowledge and experience, which belong to character memory;
- trust, hostility, dependence, or leverage, which belong to relationships;
- immediate social/situational posture, which belongs to stance;
- injury, inventory, psychological condition, or capability loss already owned by consequences;
- location, which belongs to presence/topology; or
- current task progress, which belongs to pursuit state.

Each development fact must contain a stable fact ID, character ID, dimension, bounded statement, lifecycle `ACTIVE`, `SUPERSEDED`, or `RETIRED`, established/changed turn, and exact causal reference.

Support strict `ESTABLISH`, `REVISE`, and `RETIRE` proposals, capped at two decisions per turn and a small exported maximum per non-User character. Revisions must name the fact they supersede and preserve a readable before/after receipt.

Reject every runtime character-development proposal targeting the User-controlled character. The User's submitted actions remain the authority for that character's choices and self-definition. Objective consequences and source-informed agency context continue through their existing owners.

## 5. Generalize existing character-state resolvers only through accepted causes

The current stance, relationship, and character-memory paths are primarily constrained to direct User-action interactions. Extend them carefully so an activity accepted in Packet 1-3 can be a cause.

### Preserve the current User-action path

Existing direct User/non-User interaction validation must keep working. Do not weaken presence, target, role, memory-source, or reconciliation checks merely to support new activity.

### Add an accepted-activity path

Permit non-User/non-User changes only when:

- the cited activity event was accepted in this turn or is an exact current canonical event reference;
- the affected characters are the actor or declared canonical participants of that event;
- required perception is supported by direct presence, accepted mediated contact, or another exact knowledge path;
- relationship endpoints, stance subject, and memory owner all exist;
- the proposal's before-state matches canonical state; and
- the change stays inside the existing domain limits and caps.

Add explicit cause references and stable activity-specific rejection reasons to the relevant schemas/receipts. Do not add a generic “NPC event, therefore anything changes” bypass.

Examples of valid ownership:

- two non-User characters involved in one accepted exchange may change their relationship;
- a non-User observer may gain a memory of an event they perceived;
- an offscreen actor may change stance toward their situation after an accepted pursuit event;
- an absent character with no perception or participation path may not gain memory or react to the User action.

## 6. Resolve and transition pressure threads

Extend pressure-thread state so a later accepted cause can move an open thread to:

- `RESOLVED` — the adverse prospect no longer applies;
- `REALIZED` — the adverse prospect became an accepted consequence;
- `RELEASED` — pressure eased without complete resolution; or
- `TRANSFORMED` — a new, causally different prospect replaces it.

Every transition must include expected before-state, exact cause, before/after receipt, and any linked value-state operation.

Rules:

- prose alone cannot close or realize a thread;
- `REALIZED` requires the corresponding typed consequence/state change;
- `RESOLVED` and `RELEASED` remain real canonical improvements;
- a closed thread may not be reopened or repeated from the same source/value pair without a new accepted cause;
- `TRANSFORMED` must close the prior thread and create the replacement within the same prepared post-state, or mutate neither;
- no pressure transition is mandatory merely because time passed.

This is minimum lifecycle support needed for Update 1. Do not expand into the comprehensive victory or aftermath grammar reserved for later roadmap updates.

## 7. Project resolved current character context, not history dumps

Update the bounded turn context so selected characters receive:

- their Blueprint baseline;
- current active pursuit overlay;
- current active development facts;
- relevant stance, relationships, and bounded memory;
- active/relevant value conditions; and
- open pressure threads that affect the current actor, holder, relationship, or location.

Project only current resolved state. Do not send superseded development facts, completed pursuit history, retired anchors, closed pressure text, rejected proposal snapshots, or the complete activity ledger unless one exact item is causally relevant.

The prompt must state that current runtime facts may differ from the starting Blueprint and that the runtime overlay wins only for the exact field/domain it validly supersedes. It must not invite free reinterpretation of all baseline character text each turn.

## 8. Publish every accepted change atomically

Extend the server ratification order and client response path so activity/pressure acceptance is known before dependent evolution proposals are decided.

Recommended order:

1. existing User-action reconciliation;
2. activity eligibility and cast activity;
3. situated pressure;
4. canonical consequence;
5. value, pursuit, and pressure-thread transitions;
6. stance, relationship, memory, World Memory, and non-User development decisions with validated causes;
7. complete post-state preparation; and
8. coordinated canonical publication.

If a dependent proposal cites a rejected cause, reject that dependent proposal with no mutation. Valid independent proposal decisions may still commit with the User turn.

All new post-state and receipts must be prepared before publication. No receipt-specific post-commit patch is authorized.

## 9. Required proof

Add focused tests proving:

### Values and pursuits

- Blueprint baselines initialize runtime overlays without rewriting the Blueprint;
- valid before/cause/after transitions apply exactly once;
- stale, fabricated, unsupported, or rejected causes produce no change;
- threatened does not imply compromised/lost;
- a secured or resolved value remains improved until a new accepted cause changes it;
- pursuit status controls later offscreen eligibility;
- accepted unobserved activity can advance its actor's pursuit without leaking into User knowledge.

### Character evolution and situated knowledge

- non-User development facts can be established, revised, and retired from accepted causes;
- domain-duplicating proposals are routed to or rejected in favor of the existing owner;
- every development proposal for the User character is rejected;
- non-User/non-User relationship, stance, and memory changes require exact participation/perception;
- absent uninvolved characters do not learn or react merely because they are in the Blueprint.

### Pressure lifecycle and publication

- open threads can resolve, realize, release, or transform only from accepted causes;
- realization is paired with an actual typed consequence;
- resolved/released threads are not silently reopened;
- dependent changes citing a rejected activity/pressure proposal are rejected;
- all accepted overlays and receipts publish in one canonical revision and Retake pre-state remains complete.

## 10. Focused verification gate

Run only the focused suites for these state owners:

```bash
npx vitest run src/lib/valueState.test.ts src/lib/characterPursuits.test.ts src/lib/characterDevelopment.test.ts src/lib/situatedPressure.test.ts
npx vitest run src/lib/characterStance.test.ts src/lib/characterRelationships.test.ts src/lib/characterMemory.test.ts
npx vitest run server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/core/engine/commitCoordinator.test.ts
npx tsc --noEmit
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/types/characterStance.ts src/types/characterRelationships.ts src/types/characterMemory.ts src/lib/valueState.ts src/lib/characterPursuits.ts src/lib/characterDevelopment.ts src/lib/situatedPressure.ts src/lib/characterStance.ts src/lib/characterRelationships.ts src/lib/characterMemory.ts src/lib/buildEngineTurnContext.ts src/lib/ratificationPipeline.ts src/components/engine/Runtime.tsx server/routes/turn.ts
git diff --check
```

If implementation keeps a listed helper inside an existing module, run that module's focused test rather than creating a filename solely to match this list. Do not run the unscoped full Vitest suite for this packet.

## 11. Explicit non-goals

Do not implement in this packet:

- mutation of the compiled Blueprint during play;
- generated development facts for the User-controlled character;
- an arbitrary JSON patch or free-form model-owned state object;
- a second character-state system duplicating stance, relationship, memory, consequence, presence, or World Memory;
- automatic escalation, loss, failure, or thread reopening;
- full aftermath, revelation, victory, or uncertainty grammar;
- player-facing development stats or mechanics; or
- the final forensic telemetry UI/export gate.

## 12. Packet completion report

Return a concise packet report containing:

1. cumulative start state and exact files changed;
2. value, pursuit, development, and pressure-thread state/transition shapes;
3. causal-reference validation and ratification order;
4. how existing stance, relationship, and memory owners were extended without bypass;
5. proof that User-character interiority and decisions remain outside model authority;
6. focused test, TypeScript, lint, and diff-check results;
7. any residual blocker that prevents Packet 1-5.
