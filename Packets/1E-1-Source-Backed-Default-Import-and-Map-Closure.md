# Packet 1E-1 — Source-Backed Default Import and Map Closure

**Status:** Ready for ATG execution

**Baseline:** `90422b3a934eaffe901a50b071852ea210a2bf6c`

**Supersedes:** No prior packet. This is a Forge/import closure packet only.

## Outcome

Make the normal reference-import path produce an exportable, perspective-neutral Blueprint without requiring the User to manually author a Depiction Contract, select a global starting space, or ratify source-extracted baseline material.

After this packet, the supported path is:

```text
Import reference
  -> validate a complete source-backed baseline
  -> atomically apply accepted import candidates
  -> preserve the full Depiction Contract in Forge state
  -> optionally edit or explicitly regenerate a proposal
  -> Export
  -> choose a character and resolve entry in Engine
```

## Non-negotiable rules

1. The extraction provider is the sole author of imported defaults. Do **not** add a second Architect/Depiction request to complete a normal import.
2. A reference import is accepted only when it yields exactly one complete, evidence-linked `depiction_contract` candidate. A missing, duplicate, malformed, placeholder, or evidence-less contract is an import failure—not a later export burden.
3. Accepted import candidates are applied atomically immediately after analysis registration. The User may edit afterward; they must not apply baseline material merely to make the scenario valid.
4. A Forge Blueprint is perspective-neutral. New imports must not nominate an `isUserCharacter`, create a `userOpeningAim`, or require/author a global `startingNodeId`.
5. Character opening placement is retained. Engine—not Forge—resolves the selected character’s session entry.
6. Author only rich `topology_node` records. Do not create legacy raw-string nodes from current imports.
7. Existing explicit **Regenerate Proposal** behavior may stage a revision-bound review proposal. It must never overwrite canonical source-backed Depiction fields until the User explicitly applies it.
8. Do not touch Engine provider/adapters, Qwen, Gemini schema work, Voice, Intro, Director, account work, or unrelated cleanup.

## Track A — Canonical extraction contract and validation

### A1. Repair provider-facing candidate vocabulary

**Modify:** `src/types/forge.ts`

The current provider-facing `ForgeSourceCandidateTargetSchema` is stale: it advertises legacy start-node types while omitting live rich topology types. Make the provider-visible target enum exactly:

```ts
export const ForgeSourceCandidateTargetSchema = z.enum([
  'scenario_title',
  'premise',
  'setting_location',
  'setting_atmosphere',
  'setting_time_period',
  'environmental_rule',
  'narrative_rule',
  'cast_seed',
  'cast_expression_guidance',
  'topology_node',
  'topology_connection',
  'expandable_space_anchor',
  'cast_opening_placement',
  'reference_attribution',
  'value_anchor',
  'character_pursuit',
  'depiction_contract',
] as const);
```

Add a discriminated candidate branch:

```ts
z.object({
  target: z.literal('depiction_contract'),
  confidence: z.number().min(0).max(1),
  evidenceIds: z.array(z.string().min(1)).min(1).max(12),
  proposedValue: DepictionContractSchema,
})
```

Keep legacy candidate branches only where needed to read existing persisted drafts or native legacy files. They must not be named by the provider enum or requested by the extraction prompt.

### A2. Rewrite the extraction prompt around the actual world contract

**Modify:** `src/lib/extractionContract.ts`

Update `getForgeExtractionPrompt()` to use the repaired candidate enum and obey all of these directives:

- Emit exactly one `depiction_contract` candidate for every document import.
- Its `proposedValue` must include all five fields: `dramaticRegister`, `directness`, `aftermath`, `ambiguityHandling`, and `specialBoundaries` (empty string allowed only for optional `specialBoundaries`).
- Every required Depiction field must be concrete, reference-specific, non-placeholder prose tied to the evidence registry.
- Link the contract candidate to one or more evidence IDs.
- Emit one rich `topology_node` candidate for every story-important main space. Each is a full rich node; never emit a raw string node.
- Emit `topology_connection` candidates for established movement/access relations and `expandable_space_anchor` candidates for subordinate or presently undefined areas.
- Emit `cast_opening_placement` for every cast member when placement is readable. Use `OFFSTAGE` or `NONLOCAL` when appropriate.
- There is no scenario-wide starting location. Do not emit `initial_topology_node`, `starting_node_selection`, `user_opening_aim_default`, or any user-character designation.
- No imported cast member is the User character. The Engine chooses the User’s perspective later.
- Emit `character_pursuit` for each readable opening objective. When the source offers no readable intent, preserve the valid no-intent representation rather than inventing a pursuit.

Delete prompt instructions that require `cast_seed.isUserCharacter`, tell the model to choose one User character, or require a global start node.

### A3. Make import validation fail early and descriptively

**Modify:** `src/lib/sourceBaseline.ts`

In `validateAndNormalizeDocumentAnalysis(...)`:

1. Normalize any missing or provider-authored `cast_seed.isUserCharacter` to `false`. Never quarantine a source import because it did not select a player.
2. Validate `depiction_contract` through `DepictionContractSchema` and require nonempty evidence IDs.
3. After candidate validation, enforce exactly one valid `depiction_contract` candidate.
4. A zero/duplicate/invalid contract changes the analysis to `status: 'error'`, retains no runtime binding, and uses a bounded diagnostic/error message beginning:

```text
Extraction did not produce a complete source-backed Depiction Contract.
```

5. Do not silently synthesize generic text, empty required fields, or a second model call.
6. Preserve the existing valid-candidate quarantine behavior for unrelated malformed candidates.

Add helpers rather than scattering ad hoc checks. The helper must distinguish a truly missing contract from a malformed contract without exposing model payloads in UI diagnostics.

### A4. Native Blueprint import follows the same canonical rules

**Modify:** `src/lib/sourceBaseline.ts`

In `buildSourceAnalysisFromBlueprint(...)`:

- Emit one `depiction_contract` candidate from a complete imported native contract.
- If the native Blueprint lacks a complete contract, produce the same bounded baseline error; do not defer the failure to export.
- Normalize imported cast records to `isUserCharacter: false`.
- Do not emit `starting_node_selection` or `user_opening_aim_default` candidates.
- Convert legacy simple topology to rich `topology_node` candidates only once. Do not create both a raw label and a rich node for the same space.

## Track B — Atomic source baseline application

### B1. Add one transactional import application owner

**Modify:** `src/store/useForgeStore.ts`

Add an action with this semantic contract:

```ts
applyImportedSourceBaseline(sourceAnalysisId: string):
  | { success: true }
  | { success: false; error: string };
```

Implementation requirements:

- Reuse the same internal transactional batch path used by `applyAcceptedCandidates`; do not duplicate candidate ordering or mutation logic.
- Operate only on the registered analysis named by `sourceAnalysisId`.
- Apply accepted source candidates immediately after registration in deterministic priority order.
- The action must be all-or-nothing: if any candidate cannot apply, leave draft, source-analysis review state, and revisions unchanged.
- Successful application must advance draft/source revisions only once for the complete batch.
- Do not stage or call a depiction proposal from this action.

Use this modern application precedence:

```ts
const IMPORT_APPLICATION_PRIORITY = {
  cast_seed: 1,
  topology_node: 1,
  topology_connection: 2,
  expandable_space_anchor: 2,
  scenario_title: 2,
  premise: 2,
  setting_location: 2,
  setting_atmosphere: 2,
  setting_time_period: 2,
  environmental_rule: 2,
  narrative_rule: 2,
  cast_opening_placement: 3,
  cast_expression_guidance: 3,
  value_anchor: 4,
  character_pursuit: 4,
  depiction_contract: 5,
  reference_attribution: 5,
} as const;
```

Do not include new-import application behavior for `initial_topology_node`, `starting_node_selection`, or `user_opening_aim_default`. A `never` exhaustive guard must protect the modern switch.

### B2. Apply the canonical Depiction Contract

**Modify:** `src/lib/sourceBaseline.ts` (candidate application) and `src/store/useForgeStore.ts`

Add the `depiction_contract` application case:

```ts
case 'depiction_contract': {
  const contract = DepictionContractSchema.parse(candidate.proposedValue);
  cloned.depictionContract = structuredClone(contract);
  break;
}
```

Before the batch begins, determine whether the current Forge draft already contains a complete canonical Depiction Contract:

- If it does not, apply the imported source contract.
- If it does, preserve the existing canonical fields and explicitly mark the new depiction candidate as not applied with the bounded reason `Preserved existing authored Depiction Contract.`
- This preservation exception must not cause unrelated accepted import candidates to remain staged.

### B3. Trigger application at the real HTTP/UI boundary

**Modify:** `src/components/forge/FileDropzone.tsx`

For both document-reference and native-Blueprint intake:

1. Register the server-returned normalized analysis and binding.
2. Call `applyImportedSourceBaseline(analysis.id)`.
3. On success, announce/import success and retain the resulting source analysis.
4. On failure, revoke the runtime source binding, remove/reject the newly registered analysis using the existing store-safe cleanup action, preserve the prior draft unchanged, and display a bounded import failure.

Delete calls to `triggerInitialDepictionProposalIfEligible()` from import flow. The normal import path must perform exactly one extraction request and zero automatic Depiction-proposal requests.

Do not run `validateAndNormalizeDocumentAnalysis` again on an already normalized server analysis. Preserve `completed_with_issues` and its `validationIssues` across the actual route-to-client handoff.

## Track C — Character-relative map and honest Forge UI

### C1. Stop writing a global starting node

**Modify:** `src/lib/sourceBaseline.ts`, `src/components/forge/CharacterAuthoringPanel.tsx`, and `src/components/forge/ExportReviewModal.tsx`

- New source imports must not set `topology.startingNodeId` or `startingNodeProvenance`.
- Do not apply `starting_node_selection` from new source analyses.
- Character editing must never infer `AT_NODE` from `topology.startingNodeId` or `availableNodes[0]`.
- When adding a character or clearing a placement, default to `OFFSTAGE`, not a fabricated map node.
- Keep explicit `AT_NODE`, `OFFSTAGE`, and `NONLOCAL` controls. `AT_NODE` requires the User to choose a canonical rich node ID.
- Remove `Start:` language and the fabricated `topology.nodes[0]` fallback from Export Review. Display a concise character-placement summary instead, for example `6 cast (5 placed · 1 offstage · 0 non-local)`.

Do not remove compatibility reads from `resolveCharacterEntryPlacement.ts` in this packet. Existing legacy Blueprints may use `startingNodeId` as a final fallback, but new Forge exports must not produce it.

### C2. Make rich map application idempotent

**Modify:** `src/lib/sourceBaseline.ts`

When applying `topology_node`:

- Key nodes by canonical `nodeId`.
- Merge/replace one rich node definition per canonical ID.
- Never append the display label as a raw node string.
- Ensure connections and placements reference canonical node IDs only.

Add regression coverage for a source that contains `BATEMAN_APARTMENT` plus display label `Bateman Apartment`: the resulting draft must contain one rich node, not two visually duplicate map cards.

### C3. Keep explicit Depiction regeneration optional

**Modify:** `src/lib/depictionProposalOrchestrator.ts`, `src/lib/depictionContractContext.ts`, and `src/components/forge/DepictionContractPanel.tsx` only as needed.

- `triggerInitialDepictionProposalIfEligible()` must no longer be used by import. Remove it if it has no remaining caller.
- The explicit regeneration control may request and stage a revision-bound proposal; it must not overwrite canonical fields automatically.
- Unresolved/contextual source unknowns must be passed as epistemic context to an explicit proposal request, not treated as a reason that a complete source-backed contract cannot exist.
- After successful normal import, show the imported fields and a status line:

```text
SOURCE-BASED DEFAULTS APPLIED — EDIT ANY FIELD OR REGENERATE A REVIEW PROPOSAL
```

- Do not display a blank required form, “Missing Requirements,” or an automatic-generation affordance as the primary state after a valid import.

## Required tests

Add/adjust tests before implementation so each initially fails against baseline `90422b3`.

### Source contract and normalization

1. `document import requires exactly one complete evidence-linked depiction contract`
2. `document import fails with bounded baseline error when depiction contract is absent`
3. `document import fails when depiction contract is duplicated, malformed, or lacks evidence`
4. `document import normalizes provider user-character designation to false`
5. `provider-facing extraction targets include rich topology and depiction contract but exclude legacy start targets`
6. `native Blueprint import emits source-backed depiction contract and no global start candidate`

### Atomic import and UI handoff

7. `FileDropzone preserves server completed_with_issues analysis without re-normalizing it`
8. `successful document intake atomically applies accepted source baseline candidates`
9. `failed automatic baseline application preserves the prior draft and revokes the new binding`
10. `normal import performs no automatic depiction proposal request`
11. `complete authored depiction contract is preserved during a subsequent source import`

### Map and perspective neutrality

12. `source import creates only one rich topology node for a canonical node ID`
13. `source import writes character placements but no topology startingNodeId`
14. `manual character placement defaults to OFFSTAGE and never nodes[0]`
15. `export review does not display a global Start fallback for perspective-neutral drafts`

### Export closure

16. `valid source import fills all canonical depiction fields and exports without manual depiction editing`
17. `source-derived character pursuits satisfy export review without Set Pursuit interaction`
18. `compiled Blueprint remains perspective-neutral with all isUserCharacter flags false and no userCharacterId, userOpeningAim, or startingNodeId`

Use production-shaped server analysis payloads for FileDropzone tests. Do not mock a raw provider payload at the HTTP boundary.

## Required verification gates

Run and report the exact result for each:

```bash
npx vitest run src/lib/sourceBaseline.test.ts src/lib/extractionContract.test.ts src/store/useForgeStore.test.ts
npx vitest run src/components/forge/FileDropzone.test.tsx src/components/forge/DepictionContractPanel.test.tsx src/components/forge/CharacterAuthoringPanel.test.tsx src/components/forge/ExportReviewModal.test.tsx
npx vitest run src/lib/depictionAndAtomicExport.test.ts src/lib/forgeReadiness.test.ts src/lib/resolveCharacterEntryPlacement.test.ts
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

## Completion criteria

The packet is complete only when all of these are true:

- A normal document import makes exactly one extraction request and no automatic Depiction-proposal request.
- The imported draft visibly contains all required Depiction Contract fields without User typing.
- Export actions enable for a compliant source import.
- A malformed/missing imported Depiction Contract is rejected at intake with a bounded message; it cannot become a late blank-form/export failure.
- Map cards are rich, non-duplicate nodes; no global start is required or displayed for new imports.
- The exported Blueprint contains no player designation and can later be entered from any eligible character perspective.
- All required verification gates pass.

## Explicitly out of scope

- Qwen, Z.ai, additional providers, model selection, BYOK changes, or provider-adapter refactors.
- Engine entry-resolution redesign beyond retaining legacy fallback compatibility.
- Director mode.
- Intro screen/branding work.
- Broad codebase pruning or unrelated test refactors.
