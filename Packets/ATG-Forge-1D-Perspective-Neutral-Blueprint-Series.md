# The Terror Machine — ATG Sequential Implementation Series

## Forge 1D: Perspective-Neutral Blueprints, Source-Ready Export, and Threshold Renewal

**Authoritative baseline:** `main` at `d3d4fd5bba27d51d32b78980c32ce5512c77eae4`

**Execution model:** Complete Packets **1D-1 through 1D-7 in order**. Keep every packet independently buildable and testable. Do not merge packets into one undifferentiated rewrite.

---

## Series outcome

The primary path must become:

> Import a reference → click **Export Blueprint** → load the JSON into the Engine → choose any authored character → accept, edit, or decline that character's source-derived opening objective → play.

The exported Blueprint is a complete, perspective-neutral world package. It owns the scenario, cast, character objectives, character opening placements, map, depiction boundaries, and source provenance. It does **not** permanently designate a User character or a universal starting room.

The Engine session owns the selected character, narrative framing, opening-aim decision, and resolved entry scene.

| Blueprint / Forge owns | Engine session owns |
| --- | --- |
| Complete cast | Selected playable character |
| Character opening placements | Resolved focal entry node |
| Source-derived opening objectives or explicit no-readable-intent states | Accept source objective, write a custom aim, or begin without one |
| Rich world map and expandable anchors | Current player/focal location |
| Depiction Contract and narrative boundaries | Active perspective and role framing |
| No permanent User designation | Excluding the selected character from autonomous pursuit scheduling |

---

## Locked product decisions

1. **Blueprints are perspective-neutral.** New Forge exports must not contain an authoritative `userCharacterId`, must not designate one cast member as `isUserCharacter: true`, and must not carry a Forge-time `userOpeningAim` as the active session choice.

2. **Any authored character can be inhabited.** Character identity and narrative framing are independent. A human villain can be selected while the User chooses Antagonist framing. `isEntity` describes ontology and presence; it is not a playability gate.

3. **Director expansion is deferred.** Preserve existing Director availability and prevent regressions, but do not redesign Director authority, scene control, perspective swapping, or Director-specific entry behavior in this series.

4. **There is no required global starting space.** The map is a world baseline, not a spawn instruction. Character placement and session entry resolution replace the global Forge start.

5. **“Pursuit” is not the primary User-facing term.** Retain internal `CharacterPursuit` machinery where it remains useful to the runtime, but present it in Forge and Engine Setup as:

   - **Opening Objective** — what the character is actively trying to accomplish when the scenario begins.
   - **Current Approach** — how the character is presently trying to accomplish it.
   - **No Readable Intent** — a valid authored baseline when the source does not establish an objective.

   Use this helper copy where the concept is introduced:

   > What this character is actively trying to accomplish when the scenario begins, and how they are presently pursuing it. This drives independent action when the User is not controlling them.

6. **Reference import should prepare export defaults.** Valid source-supported candidates default to accepted. Quarantined candidates never enter canonical state. Unanswered extraction ambiguities default to contextual discretion unless the User actively opens an answer workflow that remains unresolved.

7. **The initial Depiction Contract is automatic and editable.** A successful reference-import path must not require the User to press Generate, Apply, or fill four mandatory text fields before export.

8. **The map is rich but bounded by the story.** Include every story-important space needed for opening placement and established traversal. Give each main space a concise physical description, salient features, sensory guidance, and relevant access constraints. Use expandable anchors for subordinate or potentially explorable areas. Do not impose an arbitrary minimum node count and do not truncate a source to a token-saving handful of generic rooms.

9. **The intro direction is locked.** Use the editorial hierarchy and action-button treatment of prototype C over the wide blueprint-field composition of prototype B. Preserve the Forge card's small code-native haunted-house blueprint flourish.

---

## Cross-series engineering laws

- Keep one normalization owner at each boundary. A server-normalized analysis must not be normalized again by the client.
- Treat provider output as untrusted. Zod schemas, server-owned provenance, source/evidence registries, and explicit alias tables remain authoritative.
- Never invent source attribution, evidence IDs, topology meaning, character intent, or a missing objective merely to make export pass.
- Preserve legacy Blueprint ingestion. Old Blueprints containing `userCharacterId`, `isUserCharacter`, `userOpeningAim`, `startingNodeId`, or flat `topology.nodes` must remain loadable through compatibility normalization. These fields may serve as legacy suggestions, but they must not restrict a new Engine selection.
- New Forge exports must use the new perspective-neutral contract even while legacy ingestion remains tolerant.
- Do not create a second Blueprint schema, a second Forge store, a parallel export compiler, or a second Engine session owner.
- Do not route around `BlueprintSchema`, `ForgeDraftSchema`, or the existing atomic session/turn machinery.
- Do not weaken validation with broad `z.any()`, catch-and-default behavior, or unchecked casts.
- Do not allow a failed preparation step to partially mutate the Forge draft, source ledger, or Engine stores.
- Preserve source document size limits, binding lifecycle, bounded prompt context, and current content-safety behavior.
- Preserve the zero-gamification product law. Do not add scores, progress meters, achievements, fake system statistics, or dashboard clutter.

---

## Packet map

| Packet | Purpose |
| --- | --- |
| **1D-1** | Repair the live reference-import boundary, quarantine ledger, aliases, provenance, and baseline gates |
| **1D-2** | Make Forge compilation and new Blueprint exports perspective-neutral |
| **1D-3** | Populate source-derived Opening Objectives and move character/aim binding into Engine Setup |
| **1D-4** | Remove the global start requirement, strengthen story maps, and resolve character-relative session entry |
| **1D-5** | Automate the Depiction Contract and implement one-action reference export |
| **1D-6** | Rebuild the intro screen and remove obsolete Nightmare Machine branding |
| **1D-7** | Prove the real import→export→Engine path and stabilize the entire series |

---

# Packet 1D-1 — Reference-Import Boundary and Contract Repair

## Objective

Close the live defects left after Forge 1C-13 through 1C-15 before changing Blueprint ownership. The real server→client path must preserve quarantine records, valid candidates, and exact server-owned provenance.

## Required implementation

### 1. Establish a single normalization owner

Current failure:

- `server/routes/forge.ts` already calls `validateAndNormalizeDocumentAnalysis()`.
- `src/components/forge/FileDropzone.tsx` calls it again on `data.analysis`.
- The second pass sees only the already-filtered valid candidates, loses the original issue records, and converts `completed_with_issues` back to `completed`.

Correct ownership:

- The server is the normalization and quarantine owner for `/api/extract-blueprint` and `/api/register-source`.
- The client must validate the returned analysis with `ForgeSourceAnalysisSchema.safeParse()` and register that exact validated result.
- Remove client-side re-normalization of server output.
- Preserve `status`, `validationIssues`, overflow metadata, source record identity, and binding identity exactly across the HTTP handoff.
- A malformed server response must be rejected visibly; it must not be silently rebuilt with client defaults.
- Revoke the server binding if the response cannot be registered.

Update the FileDropzone tests so the mocked response is the **server-normalized response shape**, not raw model output.

### 2. Make the issue ledger genuinely bounded

Current failure: the collector admits 50 issues and then appends a 51st truncation record, while `ForgeSourceAnalysisSchema` permits at most 50.

Implement a bounded representation that can never exceed the schema:

- Keep at most `MAX_VALIDATION_ISSUES` issue records.
- Add bounded overflow metadata such as `omittedValidationIssueCount` to the analysis schema, or reserve one of the 50 slots for a truncation summary. Prefer a numeric overflow field so the first 50 diagnostics remain intact.
- Render the overflow count in `ScenarioBaselinePanel` without producing apply/edit controls for omitted or quarantined material.
- A noisy document with valid candidates must remain `completed_with_issues`; overflow must never turn it into a fatal import.

Add tests at 49, 50, 51, and substantially more than 50 malformed candidates.

### 3. Restrict alias normalization to semantic equivalence

Audit `src/lib/extractionContract.ts`.

Remove aliases that interpret meaning instead of normalizing spelling or formatting. At minimum, do not silently map:

- `EXIT` → `TERMINAL_EJECTION`
- `EVENT` → `FORCED_EVENT`
- `ENTITY` → `CHARACTER` value holder
- `HIDDEN` → `OFFSTAGE`
- any equally ambiguous token discovered during the audit

Keep only aliases that are unambiguously equivalent, including case, punctuation, separator, and canonical synonym variants. An unmapped value must remain invalid and be quarantined by the schema. It must not be coerced to a convenient default.

Add a table-driven test distinguishing safe aliases from ambiguous tokens.

### 4. Reconstruct provenance on the server

For source-derived `value_anchor` and `character_pursuit` candidates:

- Do not trust or copy provider-authored `provenance.sourceId` or `provenance.evidenceIds` into the candidate's canonical proposed value.
- After candidate evidence IDs have been resolved against the server-owned evidence registry, reconstruct provenance as:

  - `kind: 'REVIEWED_SOURCE'`
  - `sourceId`: the authoritative `sourceRecord.id`
  - `evidenceIds`: the validated candidate evidence IDs

- Quarantine a source-derived value or objective that requires source provenance but has no valid evidence.
- Preserve `CREATOR_DEFINED` only for actual User-authored edits created inside Forge.
- Ensure candidate application cannot reintroduce model-authored provenance.

### 5. Make the target registry self-consistent

`ForgeSourceCandidateTargetSchema`, `ForgeSourceCandidateSchema`, `EXTRACTION_CANDIDATE_TARGETS`, the prompt, normalization dispatch, application dispatch, and tests currently disagree about which targets exist.

Create one authoritative target registry or derive the advertised list from the actual discriminated-union owners. Add a parity test that fails when:

- a schema target is not advertised to extraction;
- the prompt advertises a target without a schema;
- a valid target lacks normalization/application handling; or
- an obsolete target remains provider-facing after later packets mark it compatibility-only.

Do not solve this with duplicated hand-maintained arrays.

### 6. Restore the baseline gates

Fix the Zod v4 issue-handling TypeScript errors in `sourceBaseline.ts` without broad `any` casts. Remove the trailing whitespace and extra EOF blanks reported by `git diff --check`.

## Required tests

Add or update coverage for:

1. Route returns a server-normalized `completed_with_issues` analysis; FileDropzone registers it unchanged.
2. The quarantine banner and issue section render on the real handoff shape.
3. Fifty-plus malformed candidates cannot overflow the schema or discard valid candidates.
4. Ambiguous aliases quarantine rather than reinterpret.
5. Value/objective provenance is rebuilt from the authoritative source/evidence registry.
6. Quarantined payload fragments cannot enter the Forge draft or compiled Blueprint.
7. Fatal empty/unparseable extraction remains an error and its binding is revoked.

Run:

```bash
npx vitest run server/routes/forge.test.ts src/lib/sourceBaseline.test.ts src/lib/extractionContract.test.ts src/components/forge/FileDropzone.test.tsx src/components/forge/ScenarioBaselinePanel.test.tsx
npx tsc --noEmit
npm run lint
git diff --check
```

## Packet completion criteria

- The live route→FileDropzone path preserves quarantine data.
- Valid candidates survive noisy imports.
- No interpretive alias silently changes source meaning.
- Source provenance is server-owned.
- TypeScript and diff gates are clean.

---

# Packet 1D-2 — Perspective-Neutral Blueprint and Forge Compiler

## Objective

Remove Forge-time player ownership from new exports while keeping older Blueprint files loadable.

## Required implementation

### 1. Separate compatibility fields from the new export contract

Legacy ingestion may continue to accept:

- `Blueprint.userCharacterId`
- `CastMember.isUserCharacter`
- `Blueprint.userOpeningAim`
- `horrorGrammar.userOpeningAim`

New Forge exports must not use those fields as canonical authoring requirements.

Implement an explicit compatibility boundary:

- `normalizeBlueprint()` may retain and normalize legacy fields when loading an older file.
- `compileForgeDraft()` must emit a perspective-neutral Blueprint:
  - omit `userCharacterId`;
  - do not mark any cast member as the permanent User character;
  - omit Forge-time `userOpeningAim` and `horrorGrammar.userOpeningAim` from the new artifact;
  - retain every cast member's authored world data, placement, expression profile, values, and objectives.
- Add a schema/version marker only if the repository already has a suitable version owner. Do not invent a parallel Blueprint type merely to distinguish exports.

If Zod defaults materialize `isUserCharacter: false`, that is acceptable; no member may be `true` in a new export.

### 2. Remove perspective ownership from Forge readiness

In `validateForgeDraft()` and `validateForgeExportReadiness()`:

- Remove the requirement for exactly one User character.
- Remove entity/protagonist eligibility checks from Forge export.
- Remove the requirement for a Forge-time opening-aim disposition.
- Remove the rule that bans a CharacterPursuit on the selected User character.
- Validate objective review state against **all cast members**, because no cast member is privileged at authoring time.
- Keep valid cast IDs, unique IDs, placement validity, value references, objective references, and provenance checks.

### 3. Refactor Forge state and UI ownership

In `useForgeStore.ts` and `CharacterAuthoringPanel.tsx`:

- Remove the active UI path for **Set User Character**.
- Stop automatically toggling `isUserCharacter` from a cast member's role.
- Stop deleting a character's objective when they become selected.
- Stop forcing a selected character's placement to a global start.
- Remove Forge-time Accept reference aim / custom aim / none controls; these choices move to Engine Setup in Packet 1D-3.
- Preserve compatibility migration for hydrated old drafts. Migration must clear permanent User designation in the new authoring view without discarding cast, placement, or source-supported intent.

Do not expose a migration error dump to the User. Preserve recoverable data and surface only an actionable warning if an old draft contains irreconcilable references.

### 4. Preserve legacy Blueprint behavior without preserving the restriction

When an older Blueprint contains `userCharacterId`:

- It may be used as a preselection suggestion in Engine Setup.
- It must not prevent selecting another valid cast member.
- A legacy `userOpeningAim` may be offered only when its `castMemberId` matches the character selected for the new session.
- It must not remove or suppress other characters' objectives.

### 5. Update the export review language

Remove User-character and universal-start assumptions from `ExportReviewModal`.

The review should summarize:

- total cast;
- how many have `AT_NODE`, `OFFSTAGE`, or `NONLOCAL` opening placement;
- how many have one or more readable Opening Objectives;
- how many are explicitly **No Readable Intent**;
- map node/connection/anchor counts;
- Depiction Contract status;
- source/quarantine status.

Do not show a selected User character.

## Required tests

1. A Forge draft with several cast members and no User designation validates and compiles.
2. Every cast member may retain a CharacterPursuit in the exported Blueprint.
3. New export JSON has no `userCharacterId`, no `userOpeningAim`, and no `isUserCharacter: true`.
4. A legacy Blueprint containing those fields still normalizes and loads.
5. A legacy `userCharacterId` does not prevent a different character selection later.
6. Hydrating an older Forge draft preserves cast/objective/placement data while removing permanent player ownership.
7. Export review no longer reports User-character or starting-node errors.

Run:

```bash
npx vitest run src/lib/forgeDraft.test.ts src/lib/compileBlueprintDraft.test.ts src/lib/normalizeBlueprint.test.ts src/lib/forgeReadiness.test.ts src/components/forge/CharacterAuthoringPanel.test.tsx src/components/forge/ExportReviewModal.test.tsx
npx tsc --noEmit
npm run lint
git diff --check
```

## Packet completion criteria

- Forge authors a world, not a player session.
- New exports are perspective-neutral.
- Older files remain loadable.
- No character loses their objective because they might later be selected by the User.

---

# Packet 1D-3 — Opening Objectives and Any-Character Engine Binding

## Objective

Make source-derived character intent useful by default, clarify it in the UI, and bind the User's character and opening aim only when the Engine session begins.

## Required implementation

### 1. Align extraction with the perspective-neutral model

Update the extraction contract and prompt:

- `cast_seed` must no longer require or ask the model to choose `isUserCharacter`.
- Remove provider-facing `user_opening_aim_default` from new reference extraction. Retain compatibility parsing only if required for older stored analyses.
- Extract a `character_pursuit` for each character whose initial objective is supported by the source.
- Add an explicit typed way to record **No Readable Intent** for a character. Prefer a dedicated candidate target such as `character_no_readable_intent` rather than interpreting absence as proof.
- Require `targetCastMemberId` and validated evidence for both readable-objective and no-readable-intent records.
- For a readable objective, extract:
  - `objective`;
  - `presentApproach`;
  - optional valid `locationNodeId`;
  - status/review window;
  - concise `basisSummary`.
- The server reconstructs provenance as established in Packet 1D-1.

Do not fabricate an objective for a character whose motives are deliberately opaque in the source.

### 2. Apply source defaults without requiring manual Set Pursuit work

When accepted candidates are materialized:

- A valid `character_pursuit` sets that character's review state to `REVIEWED` and retains the objective.
- A valid no-readable-intent candidate sets that character's review state to `REVIEWED_NONE` and ensures no objective remains for that character.
- A User edit creates `CREATOR_DEFINED` provenance.
- The absence of both records is an extraction incompleteness, not automatically `REVIEWED_NONE`.

The default reference path must not produce the current contradictory state in which a source objective exists but export says the character's Pursuit is unreviewed or forbidden.

### 3. Rename the User-facing concept

In `CharacterAuthoringPanel` and relevant error copy:

- `Pursuit` → **Opening Objective**
- `Objective` remains **Opening Objective** when used as a field label.
- `Present Approach` → **Current Approach**
- `+ Set Pursuit` → **Add Opening Objective**
- Preserve **No Readable Intent**.
- Add the locked helper copy near the first objective editor.

Internal runtime names such as `CharacterPursuit`, pursuit ledgers, receipts, and scheduling do not need a risky global rename in this series.

Prepopulate editable fields from the accepted source candidate. The User must be able to revise or replace them, but must not be required to type them from scratch.

### 4. Decouple character identity from narrative framing

Refactor `playerCharacterBinding.ts`, `seatAvailability.ts`, and `EngineSetup.tsx`:

- All uniquely identified authored cast members are eligible for embodied character selection.
- `isEntity` must not be the Protagonist/Antagonist eligibility switch.
- Protagonist and Antagonist are framing/authority choices, not biological categories.
- A human villain can be selected with Antagonist framing.
- An entity can be selected when an embodied character selection is appropriate.
- An unembodied Antagonist Force remains possible through existing participation provenance without fabricating a cast member.
- Director remains unbound and available under existing behavior; do not expand it.
- Remove the rule that a protagonist selection must match legacy `blueprint.userCharacterId`.
- Do not silently bind the first mortal or first entity when the User is looking at a multi-character Blueprint. Require an explicit cast selection before starting an embodied session. A legacy designation may preselect a card but remains changeable.

Use perspective mode based on the actual session binding, not as an entity test disguised as role eligibility.

### 5. Add the session-specific opening-aim decision

After a character is selected, Engine Setup must find that character's source-derived opening baseline using deterministic precedence:

1. selected character's active authored `CharacterPursuit`;
2. a matching legacy `userOpeningAim`, for compatibility only;
3. a source-supported cast goal if the existing normalization path already treats it as canonical evidence;
4. no readable objective.

Show:

- **Opening Objective**
- **Current Approach**
- source/creator provenance indicator where available

Require one session choice before starting an embodied session:

- **Use source objective**
- **Write my own**
- **Begin without one**

This decision belongs to the active Engine session, not the Blueprint. Store it in the existing active session/participation context or another single canonical session-owned record. Do not create a second persisted session store.

`buildEngineTurnContext()` must obtain `openingAim`, `openingAimDisposition`, and the sovereignty instruction from the active session choice. It may fall back to a matching legacy Blueprint aim only for old files.

Preserve these laws:

- An accepted or custom opening aim is historical orientation, not a mandatory quest.
- `NONE_DECLARED` must never cause the Engine to invent a replacement goal, action, thought, emotion, or Autopilot behavior.
- The selected character's Blueprint objective remains in the world package but is excluded from autonomous activity while that character is User-controlled.
- Other characters' objectives remain active.

### 6. Preserve session binding through refresh and retake

The selected character, role framing, aim disposition, aim text, and entry resolution must survive the existing session persistence/reconciliation path. Retake must not restore the Forge-time suggestion over the active session choice.

## Required tests

1. Extraction produces a readable Opening Objective for a source-supported character.
2. Extraction can explicitly produce No Readable Intent without inventing an objective.
3. Source candidates populate the Forge objective fields and review state.
4. Human villain + Antagonist framing resolves successfully.
5. A non-entity character is no longer rejected solely because Antagonist was selected.
6. Every cast card is selectable in a perspective-neutral Blueprint.
7. Engine Start remains disabled for embodied roles until a character and aim disposition are selected.
8. Use source / custom / none each reach `EngineTurnContext` with correct sovereignty behavior.
9. The selected character is excluded from autonomous pursuit opportunities; all other eligible cast retain theirs.
10. Legacy designated-character files remain compatible but do not lock selection.
11. Session selection survives refresh and retake.
12. Existing Director smoke behavior remains green without new Director functionality.

Run:

```bash
npx vitest run src/lib/playerCharacterBinding.test.ts src/lib/seatAvailability.test.ts src/lib/openingAimAndPursuits.test.ts src/lib/buildEngineTurnContext.test.ts src/components/engine/EngineSetup.test.tsx src/components/engine/Runtime.retake.test.tsx
npx tsc --noEmit
npm run lint
git diff --check
```

## Packet completion criteria

- Source intent appears automatically as a clear Opening Objective.
- Any authored character can be selected independently of role framing.
- The session, not Forge, owns the User's opening-aim decision.
- Selecting a character does not erase their world objective or allow the Autopilot to control them.

---

# Packet 1D-4 — Character-Relative Entry and Canonical Story Map

## Objective

Turn topology into one rich, nonduplicated world map and resolve the opening scene from the selected character at Engine start.

## Required implementation

### 1. Stop generating topology twice

Current reference extraction and application support both raw `initial_topology_node` strings and rich `topology_node` objects. This creates duplicate cards where a display label becomes a second raw node with no definition.

For new reference imports:

- `topology_node` is the only main-node authoring representation.
- Mark `initial_topology_node` and `starting_node_selection` as legacy/native-import compatibility targets; do not advertise or request them from the model.
- `ForgeDraft.topology.nodeDefinitions` is the authoring source of truth for rich topology.
- Derive the simple Blueprint `topology.nodes` ID array exactly once during compilation.
- Never merge display labels into the ID list.
- Dedupe by canonical ID, not by label.
- Preserve flat `nodes` normalization only for legacy native Blueprints.

Add a registry/parity test proving provider-facing targets cannot drift back to the legacy forms.

### 2. Remove the global starting-node contract

For new Forge drafts and exports:

- Do not require `topology.startingNodeId`.
- Do not require or emit `startingNodeProvenance`.
- Remove the starting-node validation error.
- Remove **Make Start**, the required-start warning, and Start badges from `SpatialManager`.
- Remove Start from export summary copy.
- Rename the Forge scalar label **STARTING LOCATION** to **SCENARIO SETTING** or **PRIMARY SETTING** so it cannot be confused with a topology spawn.

Retain `startingNodeId` parsing only for older files. It can be considered by the legacy entry fallback but must not become a new export requirement.

### 3. Strengthen rich node content

Update `ForgeTopologyNodeSchema`, the extraction contract, editor, and review validation so source-derived main nodes carry:

- stable canonical `id`;
- human-readable `label`;
- nonempty concise physical `description`;
- nonempty `sensoryGuidance` for source-derived nodes;
- bounded salient features;
- bounded access constraints when the source establishes them;
- server-owned source/evidence provenance.

Choose bounded arrays or a bounded structured equivalent for features and access constraints. Preserve legacy nodes that lack the new optional fields, but require the richer contract for newly extracted source candidates.

Extraction policy:

- Map all story-important spaces required to understand established movement and opening placement.
- Include every established traversal path.
- Use `expandable_space_anchor` for secondary rooms, wings, streets, floors, tunnels, or other areas the Engine may later instantiate.
- Do not create generic filler rooms.
- Do not reduce a large source to an arbitrary count such as three or four main spaces.
- Keep prompt and response bounds explicit so large documents remain token-safe.

### 4. Preserve per-character opening placement

Every cast member must retain exactly one opening presence disposition:

- `AT_NODE` with a valid main-node ID;
- `OFFSTAGE`;
- `NONLOCAL` only where the existing ontology rules permit it.

Do not silently co-locate characters. Do not replace OFFSTAGE or NONLOCAL with the first node merely to satisfy Forge validation.

Forge map cards should continue showing which characters are initially at each node. Also summarize offstage and nonlocal cast outside the node grid.

### 5. Add one pure session entry resolver

Create a pure, deterministic resolver owned by the Engine setup boundary, for example `src/lib/sessionEntryResolver.ts`.

Inputs must include the normalized Blueprint, selected role, and selected character ID. Return a typed result containing at least the focal `nodeId` and resolution reason.

Required rules for embodied character sessions:

1. Selected character `AT_NODE` → use that exact valid node.
2. Selected character `OFFSTAGE` → use a valid contextual focal node without changing the Blueprint. Prefer a valid legacy character location if present, then an established `AT_NODE` focal cast placement, then the first rich node in stable authored order.
3. Selected character `NONLOCAL` → preserve NONLOCAL presence while selecting a focal scene using established `AT_NODE` cast placement, then stable authored map order.
4. Invalid references are never accepted. Fall through visibly to the next valid rule and record the reason.
5. A valid exported map with at least one node must never block play solely because the selected character was OFFSTAGE or NONLOCAL.

For existing Director behavior, use the same safe focal-node fallback only where the current code requires a node. Do not add new Director controls or authority logic.

### 6. Wire the resolved entry through canonical session initialization

In `EngineSetup`, `useAppStore`, and `useEngineStore`:

- Compute the entry result before mutating stores.
- Show the resolved entry label and reason in Engine Setup.
- Pass the exact resolved node ID to topology compilation and both session stores.
- Initialize `gameState.current_location` with the canonical node ID, not `setting.location` prose.
- Initialize/override selected-character runtime presence consistently without mutating the Blueprint baseline.
- Keep the dual-store session ID and reconciliation invariants intact.
- Refresh and retake must preserve the resolved entry/current location.

### 7. Improve Story Map presentation without redesigning Forge

- Render only rich node cards in the main map.
- Show label prominently and ID secondarily.
- Display description, sensory guidance, salient features, access constraints, connected paths, character placement, and expandable anchors compactly.
- Keep large source-evidence blocks collapsed by default.
- Preserve both flowchart and textual views if both remain useful; neither may invent duplicate raw nodes.

## Required tests

1. Rich extraction yields one card and one ID per main node—no label duplicates.
2. New export omits `startingNodeId` while retaining nodes, definitions, connections, anchors, and placements.
3. Forge validation passes without a global start.
4. Every `AT_NODE` placement resolves to a rich node.
5. Main nodes require useful source-derived description and sensory guidance.
6. Expandable anchors cannot masquerade as main nodes or connection endpoints.
7. Entry resolver covers AT_NODE, OFFSTAGE, NONLOCAL, invalid legacy reference, and stable fallback.
8. Two different selected characters can resolve to two different entry nodes from the same Blueprint.
9. Engine Setup displays the result and both stores initialize the same canonical node ID.
10. Refresh and retake preserve the resolved location.
11. Legacy flat topology with a `startingNodeId` remains loadable.
12. Existing unmapped-expansion Engine tests remain green.

Run:

```bash
npx vitest run src/lib/normalizeBlueprint.test.ts src/lib/forgeDraft.test.ts src/components/forge/SpatialManager.test.tsx src/components/forge/CharacterAuthoringPanel.test.tsx src/components/engine/EngineSetup.test.tsx src/lib/buildEngineTurnContext.test.ts src/core/engine/phase2F.test.ts
npx tsc --noEmit
npm run lint
git diff --check
```

## Packet completion criteria

- One source-authored map representation exists.
- No global starting room is required in Forge or new exports.
- Character placement remains visible and meaningful.
- Engine resolves and persists a valid session entry from the selected perspective.

---

# Packet 1D-5 — Automatic Depiction Contract and One-Action Export

## Objective

Make a reasonable successful reference import exportable without requiring Apply Candidates, answer-every-question, Generate Proposal, Apply Contract, Set Pursuit, or Make Start steps.

## Required implementation

### 1. Define the reference-import default lifecycle

For newly registered valid analyses:

- valid candidates begin `reviewDecision: 'accepted'`;
- quarantined candidates remain isolated;
- extraction unknowns begin as contextual discretion by default;
- if the User submits an answer, that actively opened resolution may block while awaiting a valid response;
- rejecting or editing a candidate remains available before export;
- no default may fabricate missing source facts.

Update Architect and Source Baseline copy so the User understands that accepted candidates will be included on export and can be edited or rejected beforehand.

### 2. Materialize accepted candidates as an immutable export projection

Create one pure preparation path used by the Export action:

1. Capture draft and source-baseline revisions.
2. Clone the canonical draft into a working projection.
3. Traverse all non-error registered source analyses in deterministic source order.
4. Apply every accepted staged candidate in dependency order to the projection.
5. Mark corresponding projected ledger entries applied.
6. If any application fails, return grouped errors and commit nothing.
7. Continue with Depiction preparation and validation using the projection.
8. Recheck both revisions before committing or downloading.

Do not call a sequence of mutating store actions and hope rollback succeeds. Preparation must be pure until the final revision-guarded commit.

Rejected candidates and quarantine records must never enter the projection.

### 3. Make the initial Depiction Contract automatic

Current auto-generation runs immediately after registration while accepted candidates are still staged, so readiness always blocks. It also creates a pending proposal that still requires Apply.

Implement the corrected behavior:

- Build initial Depiction context from the effective accepted-candidate projection, not only already-applied canonical state.
- Trigger initial synthesis after a successful reference registration when sufficient projected context exists.
- The first source-derived contract may be applied automatically to the canonical draft only when:
  - captured draft and baseline revisions still match;
  - all returned fields pass `CompleteDepictionContractSchema`;
  - no Depiction field has been manually edited since the request began.
- Mark the result visibly as **Source-derived · Editable**.
- Never overwrite User-edited fields.
- Keep explicit **Regenerate from Source** as an optional staged proposal with Apply/Dismiss semantics.
- If initial synthesis is still pending when Export is clicked, the export coordinator may await it or issue one deduplicated request using the captured projection.
- Keep one in-flight request owner and revision guards. Do not create duplicate requests from FileDropzone, candidate application, ambiguity resolution, and Export.

Manual/no-reference Forge authoring may retain manual fields and the explicit Generate control. The one-action guarantee applies to the successful reference-import path.

### 4. Implement one-action reference export

The primary Forge action becomes **EXPORT BLUEPRINT**.

On click:

- show a bounded preparing state;
- materialize the accepted projection;
- obtain or validate the automatic Depiction Contract;
- validate the full perspective-neutral draft;
- compile through the one canonical Forge compiler;
- parse through `BlueprintSchema`;
- atomically commit the prepared draft/ledger only if revisions still match;
- produce the JSON download.

One successful click must produce the file. The current detailed review may remain as an optional post-export receipt or a separate **Review details** action; it must not add mandatory Apply/Generate/Download clicks to the happy path.

Pass `sourceAnalyses` into the compiler context so exact provenance checks run against the real source registry. The current modal passes revisions but omits this registry.

### 5. Make failures small and actionable

Do not dump a long flat list of internally generated contradictions.

Group preparation failures into:

- Scenario identity
- Cast and Opening Objectives
- Story Map and Placement
- Depiction Contract
- Source and provenance

Show a concise group summary first and field-addressable detail on expansion. Provide direct focus/navigation to the relevant Forge panel where practical.

Quarantined candidates and contextual ambiguities are informational, not export blockers. True missing canonical requirements, a failed Depiction request, invalid references, or revision conflict remain blockers.

On revision conflict, preserve all current work and offer a clean retry. Never download a stale artifact.

### 6. Preserve immutable artifact behavior

- The downloaded artifact must be the exact revision-guarded Blueprint shown in the receipt.
- Copy JSON and download must use the same frozen artifact.
- No runtime store mutation or Engine session start occurs during Forge export.
- File naming and reference attribution remain bounded and sanitized.

## Required tests

1. Import a complete normalized reference response and click Export without any intermediate authoring actions; a valid JSON file is produced.
2. Accepted staged candidates are present in the artifact and atomically reflected after success.
3. Rejected and quarantined candidates are absent.
4. Initial Depiction synthesis uses the projected accepted state and fills the canonical contract without Apply.
5. User-edited Depiction fields are never overwritten by a late response.
6. Explicit Regenerate remains staged and revision-guarded.
7. Unanswered default-contextual ambiguities do not block.
8. An actively submitted unresolved answer does block with one grouped error.
9. Candidate application failure, Depiction failure, and stale revision commit nothing and download nothing.
10. Compiler receives `sourceAnalyses` and validates exact source/evidence provenance.
11. Exported Blueprint has no global start or permanent User character and passes `BlueprintSchema`.
12. Manual Forge authoring still has a viable explicit Depiction path.

Run:

```bash
npx vitest run src/lib/forgeReadiness.test.ts src/lib/compileBlueprintDraft.test.ts src/components/forge/FileDropzone.test.tsx src/components/forge/DepictionContractPanel.test.tsx src/components/forge/ExportReviewModal.test.tsx src/store/useForgeStore.test.ts src/lib/forgeVerticalIntegration.test.ts
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

## Packet completion criteria

- A complete reference import needs one Export action, not a manual repair ritual.
- Automatic Depiction is canonical, editable, revision-safe, and non-overwriting.
- Export preparation is atomic.
- Failures are concise and preserve all work.

---

# Packet 1D-6 — The Terror Machine Intro and Brand Renewal

## Objective

Replace the obsolete intro with the approved wide editorial threshold and remove exact legacy product branding from live prompts, downloads, telemetry, and tests.

## Required implementation

### 1. Correct the product identity everywhere

The visible header must be:

> **THE TERROR MACHINE**

Remove exact product-brand occurrences of:

- `THE NIGHTMARE MACHINE`
- `The Nightmare Machine`
- `Nightmare Machine Orchestrator Engine`

Known owners include:

- `src/components/hub/WelcomeScreen.tsx`
- `src/core/prompts/architect.ts`
- `src/core/prompts/orchestrator.ts`
- `src/lib/download.ts`
- `src/components/boot/BootVerification.test.tsx`

Perform a full repository scan for exact legacy brand strings. Do not replace ordinary uses of the word “nightmare” inside fictional prose, scenario content, or unrelated copy.

### 2. Recompose the intro for 2560×1440

Use a restrained haunted control-room lobby with:

- a broad ultrawide composition, approximately 1800–2000px maximum content width at the 2560×1440 target;
- prototype C's centered title, concise manifesto, editorial hierarchy, and `OBSERVE → BUILD → ENTER` path;
- prototype B's full-width quiet blueprint/floorplan background;
- a dominant central Forge card without making Voice or Engine feel secondary or disabled;
- deliberate vertical occupation of the screen without filling every area.

The background must be code-native CSS/SVG line work, not a baked generated raster. Keep it low-contrast, pointer-inert, and legible beneath cards.

### 3. Use the approved chamber language

Header direction:

> **THE TERROR MACHINE**
>
> A haunted narrative system for observing, building, and entering inhabitable horror.

Chambers:

**THE VOICE — OBSERVE**

> Ask questions about the house. Examine evidence, sessions, and contradictions. The Voice observes; it does not alter canon.

**THE FORGE — BUILD**

> Feed the machine a story or build one yourself. Author the cast, map, objectives, boundaries, and Blueprint.

**THE ENGINE — ENTER**

> Load a Blueprint. Choose a character—or stand outside the walls as Director—and enter the simulation.

Keep copy concise. Do not invent unsupported capability lists, system status, recent files, feeds, or controls.

### 4. Preserve the approved button and motif treatment

Each chamber card must have:

- a small icon tile at upper left;
- a full-width outlined action button;
- a separately bordered arrow cell on the right;
- clear focus-visible and hover states;
- blue Voice, red Forge, and green Engine accents.

Motifs:

- Voice: quiet waveform/observation trace.
- Forge: a faint red code-native haunted-house blueprint behind the copy. This is the most distinctive flourish and must remain subtle enough to feel like architecture showing through the wall.
- Engine: threshold/entry or execution-path line work.

Do not reproduce prototype artifacts such as fake version strings, invented toggles, or ornamental controls.

### 5. Remove stale system language

Remove or replace:

- `System Version 2.0.4`
- `[ HUB_PHASE ]`
- `[ ARCHITECT_PHASE ]`
- `[ RUNTIME_PHASE ]`
- `Calibration Required`
- unsupported global status claims such as `Grounding: Active`, `Sensory: Enabled`, and `Memory: Persistent`

Move **Clear System Memory** into a restrained utility footer. Keep its confirmation accurate: it clears local Voice, Forge, and Engine state. Remove faux neural-link language that overstates what the action does.

`Zero Gamification Protocol` may remain as a quiet footer principle.

### 6. Responsive and accessibility requirements

- Preserve the intended 2560×1440 hierarchy.
- Remain usable at ordinary desktop widths and stack cleanly on narrow screens.
- No horizontal scrolling.
- Respect reduced-motion preference; do not make atmosphere depend on constant pulsing.
- Maintain keyboard access, visible focus, semantic buttons/headings, and readable contrast.
- Decorative SVG/CSS motifs must be hidden from assistive technology.

## Required tests

Create focused WelcomeScreen coverage for:

1. Correct title and chamber action labels.
2. Obsolete version/status/phase strings are absent.
3. Voice, Forge, and Engine actions route to their existing phases.
4. Reset confirmation remains functional.
5. Keyboard/focus semantics remain buttons rather than clickable decorative containers.
6. Boot verification expects **THE TERROR MACHINE**.
7. Exact legacy brand scan returns no live product-brand matches.

Run:

```bash
npx vitest run src/components/boot/BootVerification.test.tsx src/components/hub/WelcomeScreen.test.tsx
npx tsc --noEmit
npm run lint
npm run build
git diff --check
rg -n -i "the nightmare machine|nightmare machine orchestrator" src server README.md
```

The final `rg` command should return no exact legacy product-brand matches. Review any result before changing it; ordinary fictional uses of “nightmare” are outside this correction.

## Packet completion criteria

- The app introduces itself as The Terror Machine everywhere that names the product.
- The 2560×1440 screen feels occupied, wide, and intentional without becoming maximalist.
- The Forge house flourish and threshold buttons match the approved direction.
- The screen contains no fake version, phase, or system-status claims.

---

# Packet 1D-7 — Production-Path Closure and Stabilization

## Objective

Prove the series through the real production owners. This packet adds no speculative subsystem and no Director redesign. It closes missed seams, verifies compatibility, and leaves the repository clean.

## Required production-path suite

Create a high-level traversal that mocks only external nondeterminism—the model response and browser file download boundary—not internal normalizers, store actions, compilers, or binding resolvers.

The primary fixture should contain:

- a source-supported scenario identity and premise;
- at least three distinct cast members, including a human villain and a nonhuman entity;
- a readable Opening Objective for at least two characters;
- an explicit No Readable Intent record for at least one character;
- different opening placements across `AT_NODE`, `OFFSTAGE`, and `NONLOCAL` where valid;
- a rich map with several story-important nodes, descriptions, sensory guidance, features, access constraints, directed connections, and an expandable anchor;
- a complete source-derived Depiction Contract response;
- at least one quarantined malformed candidate alongside valid candidates.

Traverse:

1. `/api/extract-blueprint` produces the normalized analysis and binding.
2. FileDropzone registers that exact analysis.
3. Source/quarantine review renders.
4. User makes no required authoring edits.
5. User clicks Export once.
6. Export preparation materializes accepted candidates and automatic Depiction.
7. Downloaded JSON passes `BlueprintSchema`.
8. Quarantined data and validation issue records are absent from the JSON.
9. The JSON has no global `startingNodeId`, no permanent `userCharacterId`, no active Forge-time `userOpeningAim`, and no `isUserCharacter: true`.
10. Engine Setup loads the produced artifact.
11. The User can select each cast member.
12. Human villain + Antagonist framing starts successfully.
13. Source/custom/none opening-aim choices reach session state correctly.
14. Character-relative entry resolves and both stores agree on the canonical node ID.
15. A first Engine Turn context contains the selected identity, role, aim disposition, entry, full cast, map, depiction boundaries, and all nonselected character objectives.

Do not label a direct call chain between pure helpers “end-to-end.” The test must cross the production route/client/store/export/Engine owners.

## Additional compatibility fixtures

Add focused traversal or integration coverage for:

1. **Legacy native Blueprint:** flat nodes, global starting node, and `userCharacterId`; remains loadable but character selection is not locked.
2. **Noisy extraction:** more than the issue limit plus valid candidates; remains exportable with bounded overflow metadata.
3. **Depiction request failure:** no partial commit/download; retry succeeds.
4. **Revision conflict:** preparation refuses stale commit and preserves newer edits.
5. **Manual Forge draft:** remains exportable through explicit authoring without a reference document.
6. **Director smoke:** existing unbound Director session still initializes; no new Director claims are tested.
7. **Persistence:** selected character, opening aim, and current location survive refresh and retake.

## Regression expectations

Preserve:

- atomic `/api/turn` behavior;
- Blueprint ingress validation;
- cast presence and continuity;
- value, pursuit, activity, pressure, consequence, stance, relationship, character-memory, and world-memory ledgers;
- native JSON import;
- Ad-Lib Protagonist/Antagonist behavior;
- current Director availability;
- unmapped runtime expansion;
- retake and session reconciliation;
- telemetry/download generation under corrected branding;
- content-policy behavior.

## Final verification gates

Run all of the following and report exact results:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git status --short
rg -n -i "the nightmare machine|nightmare machine orchestrator" src server README.md
```

Also perform a targeted forbidden-leak scan of the exported integration fixture for:

- quarantined candidate IDs;
- malformed payload fragments;
- `validationIssues`;
- `QUARANTINED`;
- `userCharacterId`;
- active `userOpeningAim`;
- `startingNodeId`.

The scan belongs in automated assertions, not only console inspection.

## Final completion report

Report:

1. files changed, grouped by packet;
2. final schema and ownership changes;
3. legacy compatibility behavior;
4. production-path proof summary;
5. exact Vitest file/test totals;
6. TypeScript, lint, build, and diff results;
7. any remaining known limitation, explicitly excluding deferred Director expansion from the current closure claim.

## Series closure criteria

Forge 1D is complete only when all of the following are true:

- A complete reference document can travel from import to downloaded Blueprint with one Export action and no mandatory manual field repair.
- The downloaded Blueprint is a perspective-neutral world package.
- Every authored character can be selected in Engine Setup independent of human/entity classification and Protagonist/Antagonist framing.
- The selected character's opening aim is a session choice.
- Nonselected characters retain autonomous objectives.
- The map contains one rich representation, no required global start, and character-relative entry works.
- Automatic Depiction is revision-safe and does not overwrite User edits.
- Quarantine and provenance survive the real HTTP boundary.
- The intro and all live product branding say **The Terror Machine**.
- The full verification matrix is green.

---

## Explicit deferral after Forge 1D

The next dedicated update series may expand Director mode, including Director-specific scene selection, authority controls, perspective switching, and external narrative operation. Do not prebuild those systems here. Forge 1D should leave a clean perspective-neutral Blueprint and entry seam that the later Director series can consume.
