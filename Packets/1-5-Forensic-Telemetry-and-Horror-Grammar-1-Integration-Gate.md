# 1-5 Forensic Telemetry and Horror Grammar 1 Integration Gate

**Series:** TTM Horror Grammar  
**Roadmap update:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-5 of 1-5  
**Depends on:** Packets 1-1 through 1-4 completed with their focused gates passing  
**Expected baseline lineage:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c` plus the completed Packet 1-1 through 1-4 changes

## Governing invariant

> Horror Grammar telemetry must make the machine's selection, proposal, validation, cause, and commit decisions inspectable without turning rejected alternatives into canon or prompt material.

The forensic view is a required developer feature for both human and LLM-assisted review. It is not an optional debug log, a hidden horror score, or a source of narrative authority.

## Objective

Complete the Horror Grammar 1 vertical slice by:

1. making every new decision legible in the existing telemetry experience and exports;
2. proving rejected proposal text is quarantined from fiction and future generation context;
3. integrating all new state with persistence, Restart, Retake, replacement turns, and coherent publication;
4. preserving neutral behavior for legacy Blueprints and sessions; and
5. running one focused cumulative integration gate without an unscoped full test-suite run.

## Start gate

Before editing:

1. Read this packet completely.
2. Confirm the Packet 1-1 through 1-4 reports record passing focused gates and no blocker.
3. Preserve their cumulative implementation.
4. Confirm all new canonical state is already prepared before coordinated publication.
5. Confirm rejected initiative/pressure manifestation is already excluded from ordinary narrative composition.
6. If either invariant fails, correct the responsible earlier packet implementation before adding presentation or export code.

Inspect at minimum:

- the Horror Grammar contracts, ratifiers, and receipts from Packets 1-1 through 1-4
- `src/core/engine/turnHistory.ts`
- `src/core/engine/reducer.ts`
- `src/core/engine/commitCoordinator.ts`
- `src/core/engine/snapshot.ts`
- `src/core/engine/sessionPersistence.ts` or its active equivalent
- `src/lib/sessionReconciliation.ts`
- `src/lib/buildEngineTurnContext.ts`
- `src/lib/ratificationPipeline.ts`
- `src/lib/download.ts`
- `src/store/useTelemetryStore.ts`
- the existing Runtime telemetry drawer/components
- `src/components/engine/Runtime.retake.test.tsx`
- the focused persistence, download, and publication tests

## 1. Define the forensic record as typed turn evidence

Create one strict `HorrorGrammarForensicRecord` (or repository-equivalent name) associated with the active committed turn receipt. It must be derived from the same parsed proposals and machine decisions used by ratification.

It must contain, where applicable:

### Pre-turn selection evidence

- turn/revision identity;
- fictional-time pre-state;
- present actor IDs selected for opportunity;
- offscreen pursuit IDs selected and their eligibility reason;
- due-but-bounded-out pursuit IDs;
- aggregate dormant/not-due counts; and
- the stable selection cap and ordering version.

### Proposal and decision evidence

- `NONE`, accepted, or rejected disposition for cast activity and pressure;
- exact normalized proposal IDs and typed references;
- the exact bounded activity summary, adverse prospect, and isolated manifestation block returned in the parsed proposal;
- stable machine decision reasons;
- resolved authority and perception references;
- whether each manifestation block was admitted to narrative;
- accepted event/thread IDs; and
- any dependent value, pursuit, pressure-thread, stance, relationship, memory, World Memory, consequence, or character-development decisions.

### Causal before/after evidence

- exact cause reference;
- affected canonical owner;
- compact typed before-state;
- compact typed after-state;
- applied/rejected/no-change outcome; and
- canonical publication revision.

### Post-turn evidence

- fictional-time and schedule post-state;
- canonical activity-event and pressure-thread changes;
- value/pursuit/development post-state changes;
- final composed narrative block IDs/count, without duplicating ordinary prose unnecessarily; and
- explicit indication that no pressure was proposed or accepted when applicable.

“Exact” means the exact value after strict structured parsing and bounded normalization. Do not retain an unparsed raw model response to achieve exactness.

## 2. Preserve a hard separation between evidence classes

The implementation must distinguish:

1. **canonical fictional state** — accepted activity events, pressure threads, value/pursuit/development state, and other accepted state owners;
2. **active-turn forensic evidence** — accepted and rejected proposal/decision records attached to the current active timeline; and
3. **provider/transport diagnostics** — safe allowlisted technical failure evidence only.

Requirements:

- rejected proposal snapshots never enter situated game state, story log, character memory, World Memory, value/pursuit state, or pressure-thread state;
- rejected manifestation text never enters an ordinary narrative block;
- no forensic proposal snapshot, rejection rationale, omitted-candidate list, or developer label enters `EngineTurnContext`, `recentHistory`, a model prompt, or a later proposal basis;
- provider refusal produces no activity/pressure proposal evidence because no valid structured proposal was accepted from the provider;
- raw provider metadata, prompts, request bodies, credentials, endpoint details, stack text, and chain-of-thought are absent from every forensic record and export;
- a stable application error code may be shown for a failed turn, but it is not fictional activity.

Use distinct sentinel strings for rejected manifestation, provider metadata, endpoint, stack, credential, and prompt content. Test each boundary separately.

## 3. Use the active turn receipt as the evidence source of truth

Avoid a third independently mutable history of Horror Grammar decisions.

Preferred ownership:

- the machine-generated receipts attached to the committed active turn are authoritative forensic evidence;
- the telemetry UI derives its Horror Grammar view from those receipts;
- `useTelemetryStore` may hold UI selection/filter state or a derived cache, but it may not become a competing canonical or receipt owner;
- any derived cache must rebuild from active history after hydration, Restart, and Retake.

If the existing telemetry store must retain the records for performance, write them only after coherent canonical publication and validate that its turn/revision matches the committed receipt. Roll it back or rebuild it when the active timeline changes.

## 4. Add a readable forensic telemetry view

Extend the existing Runtime telemetry surface rather than redesigning the application.

For each committed turn, show a compact collapsed summary and an expandable forensic detail section containing:

- fictional time advanced or unchanged;
- who received an activity opportunity and why;
- activity proposal and decision;
- selected value anchor and basis label;
- pressure operator, adverse prospect, authority path, perception path, and decision;
- exact isolated manifestation text, clearly labeled `ACCEPTED` or `REJECTED`;
- causal before/after changes by state owner; and
- stable rejection/no-change reasons.

Presentation requirements:

- plain language first, stable code alongside it;
- rejected material must be visually and textually labeled noncanonical;
- no raw JSON wall is required in the primary UI, but the structured export remains available;
- no player-facing score, threat meter, pursuit clock, recommended move, or choice menu;
- empty/no-pressure turns remain easy to identify without being displayed as errors.

Keep the view bounded for large traces through collapse, pagination, or the existing telemetry pattern. Do not hide the exact proposal merely because it was rejected.

## 5. Extend raw, Markdown, and HTML exports

Extend `src/lib/download.ts` and its parsers/renderers with a named **Horror Grammar 1 Forensics** section.

### Raw structured export

Provide stable machine-readable objects containing the full normalized forensic record for each active committed turn. This is the LLM-review surface.

### Markdown export

Provide a human-readable per-turn section with:

- selection summary;
- activity and pressure decision tables or compact lists;
- exact normalized accepted/rejected proposal content in clearly fenced/labeled subsections;
- cause and before/after state;
- narrative-admission result; and
- stable reason codes.

### HTML export

Provide the same information in accessible expandable sections, with accepted, rejected, and no-proposal states visually distinct without relying on color alone.

Containment requirements:

- rejected proposal text may appear only inside the explicitly labeled forensic section;
- it must not appear in transcript prose, story summaries, character memory, World Memory, canonical-state summaries, or prompt-context sections;
- abandoned turns removed by Retake must not appear in ordinary active-timeline exports;
- if a separately labeled developer-only abandoned-turn diagnostic exists, keep it outside ordinary export and prompt paths under the existing Gate 0 rules;
- HTML-escape all rendered text and preserve existing content sanitization.

## 6. Complete persistence, Restart, Retake, and replacement behavior

Add explicit schema/default/migration coverage for every new Horror Grammar field:

- Blueprint authoring foundations;
- fictional-time ledger;
- activity schedule;
- bounded activity-event ledger;
- pressure threads;
- value runtime state;
- pursuit runtime state;
- character-development state; and
- forensic receipt fields.

### Persistence

- a current session round-trips all accepted new canonical state and active-turn forensic receipts;
- legacy sessions hydrate with neutral defaults and no fabricated values, pursuits, events, or pressure;
- invalid persisted records are rejected or normalized at their owning boundary without permitting malformed model-owned state into canon;
- rehydration rebuilds any derived telemetry index from active receipts.

### Restart

- a fresh session initializes new state from the selected Blueprint baseline;
- prior fictional time, schedule, activity events, pressure threads, runtime overlays, active receipts, and telemetry do not survive;
- the Blueprint and reviewed authoring foundations remain available as source material for the new session;
- Restart remains out of fiction.

### Retake

- the checkpoint contains the complete pre-turn new canonical state;
- Retake restores all new state from the same checkpoint as the existing stores;
- the abandoned turn's activity, pressure, evolution, narrative manifestation, and active forensic receipt disappear from the active timeline and ordinary exports;
- the replacement action starts from the restored fictional time and scheduling stamps;
- an opportunity omitted or considered only by the abandoned turn is selected as though that abandoned turn never happened;
- the Engine receives no signal that a Retake occurred.

## 7. Final bounded-context and sovereignty audit

Add an automated integration assertion over the actual outbound `/api/turn` body proving it contains only:

- active/relevant value anchors and runtime conditions;
- all present non-User opportunities;
- at most the configured offscreen opportunity cap;
- current relevant pursuit/development/pressure state;
- accepted current canon needed by the turn; and
- the User's submitted action exactly as User input.

Prove it excludes:

- omitted/dormant pursuit detail;
- retired/superseded/closed history not currently relevant;
- rejected proposal text and reasons;
- forensic UI labels;
- abandoned-turn evidence;
- safe technical failure messages as fictional input;
- raw provider metadata and prompts; and
- any generated User intention or recommended response.

Also prove that an accepted pressure manifestation ends with an open situation. Tests should not require a menu of permitted responses; the free-text User surface remains authoritative.

## 8. Focused cumulative integration scenarios

Add a small number of scenario-level automated fixtures covering behavior, not aesthetic perfection.

### Present-character initiative

- A present non-User character is eligible.
- The model returns a valid independent activity linked to their current state.
- The machine accepts and manifests it.
- The activity changes an existing typed state or opens a value-linked prospect.
- The User action remains verbatim and no response is chosen for them.

### Offscreen pursuit

- Fictional time makes one reviewed pursuit due while other cast remains dormant/not due.
- The selector includes only the due bounded candidate.
- An accepted unobserved activity advances its pursuit without entering User-facing narrative.
- A later valid trace or mediated manifestation becomes perceivable and may open pressure.

### Rejected pressure

- The model proposes an invented value, authority, or closed response.
- The machine rejects it while committing an otherwise valid base turn.
- Exact rejected content appears only in labeled forensics.
- It is absent from canon, narrative, and the next provider request.

### Causal evolution and relief

- An accepted cause changes a non-User pursuit or development fact.
- The relevant current overlay, not the obsolete baseline-only reading, enters the next bounded context.
- A pressure thread resolves or releases through an accepted action.
- The improvement persists and is not automatically reversed on the next turn.

### Failure, Retake, and legacy neutrality

- provider refusal/failure commits none of the new state;
- Retake and replacement remove the abandoned turn completely;
- Restart removes prior-session runtime and forensic state;
- a legacy Blueprint with no reviewed Horror Grammar foundations still initializes and plays without fabricated pressure.

These tests establish operability and boundaries. They do not need to prove that every generated passage is frightening.

## 9. Focused verification gate

Run the focused final integration set only:

```bash
npx vitest run server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts
npx vitest run src/core/engine/commitCoordinator.test.ts src/core/engine/reducer.test.ts src/components/engine/Runtime.horrorGrammar1.test.tsx
npx vitest run src/components/engine/Runtime.retake.test.tsx src/core/engine/sessionPersistence.test.ts src/lib/sessionReconciliation.test.ts
npx vitest run src/store/useTelemetryStore.test.ts src/lib/download.test.ts
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

If a named test file has a different active equivalent, use that focused file and report the substitution. Do not run `npx vitest run` without an explicit test-file list. Do not use paid live-model calls as acceptance evidence.

## 10. Explicit non-goals

Do not use this integration gate to add:

- Horror Grammar 2 or later roadmap semantics;
- a full-suite audit campaign;
- a universal horror, quality, urgency, or escalation score;
- a mandatory activity or pressure cadence;
- an autonomous background simulation;
- a second model generation call;
- a player-facing mechanics dashboard;
- a general UI redesign;
- provider or content-policy changes; or
- unrelated architecture cleanup.

## 11. Final completion report

Return one cumulative Horror Grammar 1 completion report containing:

1. initial baseline, final workspace revision/status, and packet order completed;
2. exact files changed, grouped by Packet 1-1 through 1-5;
3. final Forge value/pursuit authoring and provenance behavior;
4. fictional-time and cast-selection behavior;
5. activity, pressure, value, pursuit, development, and pressure-lifecycle contracts;
6. machine ratification order and canonical publication path;
7. User-sovereignty and rejected-proposal containment evidence;
8. telemetry UI plus raw/Markdown/HTML forensic behavior;
9. persistence, Restart, Retake, replacement, and legacy-neutrality results;
10. every focused command with exact file/test counts;
11. TypeScript, lint, build, and diff-check results;
12. any residual critical defect that corrupts canon, attributes an action to the User, strands recovery, leaks unsafe/provider material, or blocks production use; and
13. confirmation that Horror Grammar 2 was not started.

Do not treat minor tuning observations or aesthetic preferences as failed acceptance. Record them as nonblocking telemetry findings for later tuning.
