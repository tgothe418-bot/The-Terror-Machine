# 1-7 HG1 Authority, Source, and Perception Ratification

**Series:** TTM Horror Grammar 1 — Integration Closure  
**Execution packet:** 1-7 of 1-9  
**Depends on:** Packet 1-6 completed with its focused gate passing  
**Expected baseline:** `082ec660fcb747ff13da56d92ecc89d58e0c7cce` plus the completed Packet 1-6 changes  
**Scope:** Close the authorization seam for activity and pressure before either can alter canon or be composed into narrative.

## Governing invariant

> Eligibility decides which non-User actor may be considered. Authority, source, location, channel, and perception decide whether a specific proposed activity or pressure may become true.

An opportunity is not a blanket license. A model-supplied string is not evidence. A valid activity or pressure proposal is a request for deterministic ratification, never a narrated fact.

## Objective

Make the existing activity and situated-pressure ratifiers reject any proposal that cannot prove, using bounded context evidence:

- the correct non-User actor;
- a permitted basis for the proposed activity or pressure;
- an exact accepted source for pressure;
- the required current location;
- a valid user-perception path; and
- an exact permissible dialogue speaker.

Only an accepted proposal may update an HG1 ledger or append its isolated manifestation to final narrative composition.

## Start gate

Read the completed Packet 1-6 state contract and inspect:

- `src/types/horrorGrammar.ts`
- `src/lib/castActivity.ts`
- `src/lib/situatedPressure.ts`
- `src/lib/castActivityEligibility.ts`
- `src/lib/buildEngineTurnContext.ts`
- `server/routes/turn.ts`
- the activity, pressure, and route tests.

Confirm that all ratifiers now receive their real typed pre-state. This packet must not reintroduce context casts or empty default ledgers.

## 1. Build a bounded evidence registry from canonical context

Create one strict, deterministic HG1 evidence registry within the typed turn context. It is derived by application code from the selected Blueprint, current canonical runtime state, exact eligibility receipt, topology/presence, and accepted current-turn receipts.

It must provide stable reference IDs and compact descriptions for only evidence that may support this turn. Use a typed discriminator or equivalent strict category, not an unrestricted prose field. The exact label format may follow repository conventions, but each entry must have a unique ID, category, owner/reference target, and bounded explanation.

The registry may include, where actually established:

- the selected present/offscreen opportunity and its pursuit baseline;
- the actor's allowed expression modes;
- the current topology node and exact co-presence;
- an explicitly authored scenario/world rule relevant to the claimed action;
- an explicit participation Authority Contract when it applies;
- an already accepted canonical condition, World Memory fact, or prior active pressure thread when it is relevant; and
- the accepted current-turn activity or canonical-consequence receipt for a dependent pressure proposal.

Do not invent a universal ability list, infer supernatural reach from tone, parse free-form prose into new authority, or send a raw Blueprint to the model. The registry is evidence for validation, not a new director system.

The prompt may expose the eligible reference IDs and concise descriptions needed for a proposal. The ratifier—not prompt text—must resolve every reference against the registry.

## 2. Make activity ratification exact

Revise `resolveCastActivity()` and its receipt contract so an accepted activity proves all of the following.

### Actor and opportunity

- `castMemberId` exists, is non-User, and is the exact actor named by a current opportunity.
- A present activity uses the exact present opportunity. An offscreen activity uses the exact selected pursuit ID and may not borrow another actor's pursuit.
- A proposal cannot supply a different location than the selected opportunity or current co-present node.

### Authority evidence

- `authorityReferences` is required for an active proposal and is a small bounded list of exact registry IDs.
- Every ID resolves. At least one resolved entry must authorize this actor's claimed activity in the selected opportunity/current situation.
- An actor's generic cast description, a raw model sentence, or an arbitrary string does not count as authority.
- Ordinary, authored pursuit activity remains possible: its selected pursuit/current approach may be the supporting evidence when the proposal stays within it. Claims of additional reach require additional established evidence.

### Perception and manifestation

- `DIRECT` requires exact co-presence and an explicit location equal to the player's current node.
- `MEDIATED` requires an explicit `mediated` expression capability **and** a valid established mediation reference. `spoken` by itself never authorizes mediated perception.
- `LOCAL_TRACE` requires an explicit current-node location. It may not use dialogue, and it may not describe an offscreen event as if directly observed.
- `UNOBSERVED` may update canonical state when otherwise authorized, but it may never carry a manifestation block.
- A dialogue manifestation may be admitted only when its speaker is the activity actor's exact canonical name and the actor's validated path permits it. An unrelated non-User character may not speak for the activity.

Record the resolved evidence IDs and final perception/location facts in the accepted event or its typed receipt, whichever is the existing canonical owner. Do not store rejected evidence in canonical state.

## 3. Make pressure ratification exact

Revise the situated-pressure proposal and `resolveSituatedPressure()` so pressure has the same evidence standard rather than a weaker special case.

### Value and source

- `valueAnchorId` must resolve against the typed authoring baseline, not merely against a convenient prompt projection.
- Replace or strictly constrain the free-form `sourceReference`. An accepted source must be an exact typed registry reference to an accepted activity, canonical consequence/condition, active pressure thread, or other explicitly established canonical fact appropriate to this turn.
- A bare arbitrary string, an unaccepted activity, and an invented condition are rejected.
- If pressure claims to derive from the current activity, require the accepted event ID, not the generic label `ACTIVITY` alone.

### Authority and perception

- Active pressure must cite resolved authority evidence appropriate to its operator and claimed effect.
- Add the missing location/perception information required to judge whether a manifestation can be perceived. Reuse the strict activity semantics where applicable rather than inventing parallel, looser rules.
- A pressure with no valid perception path may still be an unobserved canonical thread only when its source and authority are valid; it may not append narrative.
- A pressure dialogue manifestation is allowed only when its accepted source identifies the same authorized speaking actor and that actor's validated channel permits it. A pressure sourced from an environmental/canonical condition must use prose, not fabricated dialogue.

Persist enough accepted source, authority, location, and perception provenance on the pressure thread or typed receipt to explain later transitions without trusting a model echo.

## 4. Preserve composition as the final gate

Keep `server/routes/turn.ts` narrative composition isolated and deterministic.

- Compose the activity manifestation only from the exact normalized/admitted block recorded by the activity receipt.
- Compose the pressure manifestation only from the exact normalized/admitted block recorded by the pressure receipt.
- Never append directly from a proposal merely because it has a block.
- Rejection preserves otherwise valid base prose and pre-state.
- Do not make an activity or pressure mandatory on any turn.

This packet may add stable reason codes for the new rejections. Keep them concise and typed/allowlisted where the existing codebase has an appropriate enum; do not reopen the broader deferred reason-code audit.

## 5. Required focused proofs

Extend the owning unit and route tests with distinct sentinels.

### Activity rejection cases

- unknown or unrelated authority reference;
- eligible actor attempting a claim outside their authorized opportunity/basis;
- present actor with a missing or mismatched direct location;
- `spoken` actor attempting `MEDIATED` perception;
- mediated actor without an established mediation reference;
- local trace without the current-node location or using dialogue;
- unrelated character named as activity dialogue speaker.

### Pressure rejection cases

- invented/free-form source reference;
- generic `ACTIVITY` where no exact accepted event ID is supplied;
- unaccepted activity cited as source;
- value anchor outside the authoring baseline;
- missing/invalid authority reference;
- perceptible manifestation without a valid path/location;
- environmental pressure attempting dialogue; and
- unrelated character named as pressure speaker.

### Positive cases

- an in-scene, pursuit-grounded activity with direct prose or actor-owned dialogue;
- a genuinely mediated activity supported by explicit mediation evidence;
- an unobserved offscreen pursuit activity that changes only canonical state;
- a pressure sourced from the exact accepted activity event with an open response window; and
- a valid canonical-condition pressure with prose-only manifestation.

For every rejection, prove that its activity event, pressure thread, value/pursuit/development mutation, and manifestation are absent from canonical state and ordinary narrative. Exact rejected content is not yet required to be retained in the response; Packet 1-8 creates that dedicated forensic boundary.

## Focused verification gate

```bash
npx vitest run src/lib/castActivity.test.ts src/lib/situatedPressure.test.ts src/lib/castActivityEligibility.test.ts server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts
npx eslint src/types/horrorGrammar.ts src/lib/castActivity.ts src/lib/situatedPressure.ts src/lib/castActivityEligibility.ts src/lib/buildEngineTurnContext.ts server/routes/turn.ts
git diff --check
```

Use active-equivalent test paths if the repository has renamed them, and report any substitution. Do not run the full suite, global TypeScript check, full lint, or build in this packet.

## Explicit non-goals

Do not:

- turn prose descriptions into a general rule parser;
- change the Forge authoring flow or require a new universal authority form;
- add a combat, inventory, threat, or difficulty mechanic;
- simulate dormant cast members;
- add telemetry UI or export work;
- change Depiction Contract behavior, provider behavior, or content policy; or
- repair unrelated authority enforcement outside HG1's activity/pressure boundary.

## Completion report

Report the evidence-registry ownership, the accepted source/authority/perception rules, exact reason codes introduced, files changed, and focused test results. Identify any remaining critical seam only if it can still publish ungrounded canon, attribute an action to the User, strand recovery, or leak unsafe/provider material.

Do not call Horror Grammar 1 accepted after this packet. Proceed to Packet 1-8 when this gate passes.
