# 1-1 Forge Value and Pursuit Foundations

**Series:** TTM Horror Grammar  
**Roadmap update:** 1 of 16 — Horror Threatens a Value  
**Execution packet:** 1-1 of 1-5  
**Depends on:** completed Horror Grammar 0 provider-refusal containment correction  
**Expected `HEAD`:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c`  
**Expected `origin/main`:** `48d9d4deb827ad4d4faf8e161ae3e1dc5f02fa4c`

## Governing invariant

> Horror pressure may target only a value established in the Blueprint or accepted canon. The Forge resolves the initial value and pursuit baselines; the Engine does not invent them when play begins.

This packet extends the working Forge and Blueprint. It does not replace either system and does not yet make the runtime initiate pressure.

## Objective

Add compact, reviewed Blueprint foundations for:

1. the fictional states that characters, relationships, places, or the scenario are oriented toward preserving or attaining; and
2. the current pursuits that can keep non-User characters active when they are not immediately in scene.

The result must support source extraction, the existing candidate-review path, the existing Architect unknown-resolution path, manual creator authorship, compilation, export, import, and neutral legacy compatibility.

No new player-facing meter, score, character sheet, or mandatory form panel is authorized.

## Start gate

Before editing:

1. Read this packet completely.
2. Confirm `HEAD` and `origin/main` equal the expected revision above.
3. Confirm tracked files are clean and inspect the active implementations named below.
4. If the baseline differs, stop and report the exact revisions and status.

Inspect at minimum:

- `src/types/index.ts`
- `src/types/forge.ts`
- `src/types/blueprintAuthoring.ts`
- `src/lib/normalizeBlueprint.ts`
- `src/lib/compileBlueprintDraft.ts`
- `src/lib/forgeCompiler.ts`
- `src/lib/forgeReadiness.ts`
- `src/lib/sourceBaseline.ts`
- `src/store/useForgeStore.ts`
- `src/components/forge/ArchitectChat.tsx`
- `server/routes/forge.ts`
- their focused tests

## Existing seam to preserve

The current Forge already has the correct ownership pattern:

- source extraction produces evidence, candidates, and unknowns;
- candidates remain staged until reviewed and applied;
- unknowns move through a bounded Architect lifecycle;
- resolution patches are typed and applied transactionally;
- the single `forgeDraft` compiles into the Blueprint;
- readiness blocks unresolved authoring work.

Extend those seams. Do not create a second draft, a second interview system, or a new free-writing bypass around reviewed application.

## 1. Add strict shared authoring contracts

Create a focused shared module such as `src/types/horrorGrammar.ts`, re-exported through the existing type barrels. Use strict Zod objects, bounded strings and arrays, stable IDs, and inferred TypeScript types.

Implement the following concepts. Field names may follow repository conventions, but the semantics are required.

### Value holder reference

Use a discriminated union with only currently resolvable holders:

- `CHARACTER` with one existing cast ID;
- `RELATIONSHIP` with exactly two distinct existing cast IDs;
- `PLACE` with one existing topology node ID; or
- `SCENARIO` with no fabricated holder ID.

Do not add factions or institutions as pseudo-characters merely to satisfy this packet. A later Blueprint extension can add new holder kinds when the application has a canonical owner for them.

### Reviewed provenance

Every accepted value anchor and pursuit baseline must identify whether it is:

- `REVIEWED_SOURCE`, with the source record ID and one or more reviewed evidence IDs; or
- `CREATOR_DEFINED`, produced by direct creator authorship or an explicitly accepted Architect resolution.

Never persist a source binding token, server registry record, model prompt, or hidden provider identifier as provenance.

### Value anchor

A value anchor must contain:

- a stable ID;
- the typed holder reference;
- a short human-readable label;
- a bounded description of the valued or desired fictional state;
- a bounded basis summary explaining what establishes it; and
- reviewed provenance.

Do not add importance, fear, morality, or horror-quality numbers. A value is a fictional orientation, not a psychological claim about the real User.

### Character pursuit baseline

A pursuit baseline must contain:

- a stable ID;
- one existing non-User cast ID;
- a bounded objective;
- a bounded present approach;
- an optional existing topology-node location reference;
- an initial status of `ACTIVE` or `DORMANT`;
- a review window of `MOMENT`, `SCENE_BEAT`, `EXTENDED`, or `EVENT_DRIVEN`;
- bounded trigger references when the review window is `EVENT_DRIVEN`;
- a bounded basis summary; and
- reviewed provenance.

`EVENT_DRIVEN` must require at least one trigger reference. Other review windows must not be converted into visible timers or creator-facing numeric cadence controls.

### Explicit baseline review state

Add compact review state to the Horror Grammar authoring container:

- value baseline: `UNREVIEWED`, `REVIEWED_NONE`, or `REVIEWED`;
- one pursuit review record per non-User cast member: `UNREVIEWED`, `REVIEWED_NONE`, or `REVIEWED`;
- accepted value anchors; and
- accepted character pursuits.

This review state is important. An empty array must not silently mean both “the source establishes no such material” and “the Forge never asked.”

`REVIEWED_NONE` is a legitimate creator decision. It must not cause the compiler or runtime to fabricate an anchor or pursuit.

## 2. Integrate the contracts into Blueprint and ForgeDraft

Add one optional, normalized Horror Grammar authoring container to both `ForgeDraftSchema` and `BlueprintSchema`.

Requirements:

- old Blueprints and saved drafts parse with neutral defaults;
- legacy normalization produces `UNREVIEWED` plus empty arrays, never inferred values;
- native Blueprint import preserves valid supplied IDs and provenance;
- compile and export round-trip the reviewed container without loss;
- cast or topology deletion cannot leave accepted dangling references;
- duplicate IDs, unknown cast IDs, duplicate relationship participants, unknown node IDs, and invalid evidence references fail the reviewed application or compile boundary without partial draft mutation.

The Blueprint remains the immutable scenario baseline. Later runtime evolution will be stored as a typed overlay, not by rewriting the compiled Blueprint.

## 3. Extend source extraction and candidate review

Extend the existing source-analysis contracts and `/api/forge/extract-source` structured output to support:

- value evidence and value-anchor candidates;
- pursuit evidence and character-pursuit candidates; and
- targeted unknowns when the source does not establish a required baseline clearly enough.

Extraction rules:

1. Extract only source-supported claims.
2. Cite existing source evidence IDs in every source-derived candidate.
3. Distinguish a character's stated goal from a present pursuit. A goal alone does not prove what the character is currently doing offscreen.
4. For a User-controlled character, source material may establish background values, knowledge, attachments, capabilities, or goals. It may not prescribe the User's next intention or claim that the real User shares those values.
5. If evidence conflicts or is incomplete, create an unknown instead of resolving it by model confidence.
6. Do not ask for numeric urgency, importance, or fear ratings.

Add typed candidate targets for value anchors and character pursuits. Applying one must use the existing reviewed candidate action, validate current draft/source revisions and references, and then update the single draft transactionally.

Rejected, stale, malformed, or mismatched candidates must make zero draft changes.

## 4. Extend the existing Architect question path

Use the existing unknown queue and `ArchitectChat`; do not add a separate Horror Grammar interview screen.

The Forge should be able to ask concise questions such as:

- what state, relationship, duty, refuge, identity, belief, capability, secret, or desired future actually matters in this scenario;
- what a particular non-User character is currently pursuing;
- where that pursuit is occurring, if location matters; and
- what kind of fictional-time change or canonical event should make that pursuit worth reconsidering.

Questions should be grouped where that reduces creator burden, but accepted resolutions must still produce individually typed anchors, pursuits, or explicit `REVIEWED_NONE` decisions.

Extend `ForgeResolutionPatchOperationSchema` with the smallest typed operations needed to:

- add or revise a value anchor;
- set value baseline review state;
- add or revise a character pursuit;
- set a cast member's pursuit review state; and
- remove a now-invalid anchor or pursuit when the creator explicitly accepts that operation.

The existing server-issued source binding, identity validation, revision checks, explicit acceptance, and close/revoke lifecycle remain mandatory.

## 5. Readiness and compilation behavior

For scenarios compiled through the Forge:

- the value baseline may not remain `UNREVIEWED`;
- every non-User cast member must have a pursuit review result;
- `REVIEWED` requires at least one corresponding valid record;
- `REVIEWED_NONE` requires no corresponding active record;
- all staged value/pursuit candidates and relevant queued unknowns must be resolved before compilation; and
- readiness errors must be concise and actionable through the existing review interface.

Do not require every scenario to contain a value anchor or every character to have a pursuit. Explicitly reviewed absence is valid.

Legacy Blueprints launched outside a new Forge compilation must remain playable with neutral empty foundations. Horror Grammar 1 behavior stays inactive for those missing foundations rather than inventing them or preventing session initialization.

## 6. Required proof

Add focused tests proving:

### Contract and migration

- strict parsing accepts valid holders, provenance, anchors, pursuits, and review state;
- malformed or dangling references are rejected at the application or compile boundary;
- old Blueprints normalize without invented anchors or pursuits;
- valid reviewed foundations survive draft → compile → export/import round-trip.

### Source and proposal boundary

- source-derived anchors and pursuits retain evidence provenance;
- unsupported source claims become unknowns rather than accepted draft state;
- staged and rejected candidates do not mutate `forgeDraft`;
- accepted candidates mutate the draft exactly once;
- stale candidate or Architect revisions fail with zero mutation;
- no source binding token reaches draft or Blueprint output.

### Readiness and sovereignty

- unreviewed baselines block a new Forge compilation;
- explicit `REVIEWED_NONE` passes without fabricated material;
- a User-character anchor never becomes a generated User intention or action field;
- no new visible score or numeric cadence control is introduced.

## 7. Focused verification gate

Run only the focused suites for the production paths changed by this packet, using the active equivalents if a filename has moved:

```bash
npx vitest run src/types/horrorGrammar.test.ts src/lib/forgeDraft.test.ts src/lib/forgeReadiness.test.ts src/lib/sourceBaseline.test.ts
npx vitest run src/store/useForgeStore.test.ts src/components/forge/ArchitectChat.test.tsx server/routes/forge.test.ts
npx tsc --noEmit
npx eslint src/types/horrorGrammar.ts src/types/index.ts src/types/forge.ts src/lib/normalizeBlueprint.ts src/lib/compileBlueprintDraft.ts src/lib/forgeCompiler.ts src/lib/forgeReadiness.ts src/lib/sourceBaseline.ts src/store/useForgeStore.ts src/components/forge/ArchitectChat.tsx server/routes/forge.ts
git diff --check
```

If an exact named test file does not exist, create it or use the nearest focused test for that boundary and report the substitution. Do not run the unscoped full Vitest suite for this packet.

## 8. Explicit non-goals

Do not implement in this packet:

- runtime fictional-time accounting;
- cast activity selection or non-User action generation;
- situated pressure proposals;
- a universal escalation or horror score;
- a new reality-posture system;
- formal supernatural jurisdiction;
- character evolution during play;
- forensic runtime telemetry;
- a Forge UI redesign; or
- content-policy changes.

## 9. Packet completion report

Return a concise packet report containing:

1. start revision and cumulative workspace status;
2. exact files changed and why;
3. final schema shapes and neutral migration behavior;
4. source-candidate and Architect application paths used;
5. readiness rules and explicit-none behavior;
6. focused test, TypeScript, lint, and diff-check results;
7. any residual blocker that prevents Packet 1-2; and
8. confirmation that no runtime pressure behavior was started.
