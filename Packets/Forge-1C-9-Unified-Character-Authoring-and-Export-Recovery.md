# The Terror Machine — Forge 1C-9
## Unified Character Authoring and Export Recovery

### Dependency

Begin from live `main` at `059d4356577be4bf01ca7c9a6efaf0ccaab81d97`.

This packet is deliberately the first priority. It repairs the confirmed placement/export regression inside a user-facing consolidation of the Forge rather than leaving the User to test overlapping old and new authoring surfaces.

---

## Objective

Replace the current split cast experience with one character-centric authoring surface, return `SpatialManager` to map-only ownership, remove the obsolete Starting Conditions grid, automatically stage the initial Depiction Contract proposal, and restore Blueprint export for source-derived opening placements.

Preserve the existing canonical draft and review semantics. This is a consolidation of owners and UI paths, not a new character, map, or depiction system.

---

## 1. Establish one character-centric authoring surface

Extract or refactor the active inline Cast editor in `Forge.tsx` into one clearly named production component, such as `CharacterAuthoringPanel.tsx`. It must remain backed by the existing canonical Forge draft and store actions.

Each character card must expose the relevant parts of one record in one place:

- name, role, description, entity status, expression guidance, and existing behavior-vector data;
- explicit player-character designation for eligible non-entity cast members;
- opening placement: `AT_NODE`, `OFFSTAGE`, or `NONLOCAL`, with node selection when applicable;
- for the selected player character: the source-proposed opening aim, **Accept reference default**, inline **Use my own aim**, and **None declared**;
- for non-user cast: reviewed source pursuit data, explicit **No readable intent**, and creator editing where the existing HG authoring contract permits it; and
- compact readiness/status indicators for identity, placement, and opening intent.

Use inline controls. Do not use `window.prompt()` or `window.alert()` for ordinary character, aim, or pursuit authoring. Validation errors must render beside the relevant card/field and preserve the User's current text.

The component may use expandable card sections to keep the right-hand Forge column compact at the project's large-display target. Preserve independent scrolling for the Architect and character areas and avoid horizontal overflow.

Create or reuse canonical store/domain actions for all character mutations used by this component, including:

- add/update/remove cast member;
- set the one user-controlled character;
- set opening placement;
- accept reference opening aim;
- set creator opening aim;
- set none declared; and
- review a non-user pursuit or no-readable-intent state.

Both the UI and tests must call these actions. Do not continue ad hoc `updateDraft()` mutations for one path while another path uses a domain action.

---

## 2. Remove the competing cast/placement surfaces

Remove the **Cast Opening Placement Manifest** and **Opening Motive Baseline & Intent Review** sections from `SpatialManager.tsx` after their controls have moved to the character-centric surface.

`SpatialManager` must then own only:

- story-important main nodes;
- directed connections;
- explicit starting-node selection;
- expandable-space anchors; and
- compact flowchart/textual map views.

Remove the unused legacy `CastManager.tsx` implementation if repository search confirms that it has no production caller. Remove dead imports, handlers, state, and tests that exist only for the obsolete parallel editor. Do not delete schemas or runtime fields still consumed by the canonical Forge/Blueprint path.

Add a repository-level/component assertion that the Forge renders one cast roster/editor and no separate placement manifest.

---

## 3. Retire the Starting Conditions grid without deleting Engine state

Remove `MatrixSelector` from the Forge production UI and remove its obsolete component if no remaining caller exists.

Do not remove or rename `startingVector` or `startingTier` from Blueprint, Forge draft, Engine state, turn contracts, telemetry, or legacy compatibility. Preserve existing valid source-derived values and the current valid defaults for new drafts.

The cleanup must not replace the grid with another panel. The fields become machine/reference-owned baseline data unless a future packet explicitly introduces a better User-facing authoring reason.

Update only UI tests or assertions that expected the grid to render. Do not weaken Engine vector/tier validation.

---

## 4. Repair source-derived opening-placement export

In the active `cast_opening_placement` application path, stop spreading `sourceId` and `evidenceIds` into `presenceDisposition`.

The canonical `presenceDisposition` must contain only:

- `{ kind: 'AT_NODE', nodeId }`;
- `{ kind: 'OFFSTAGE' }`; or
- `{ kind: 'NONLOCAL' }`.

Keep the source/evidence relationship in the existing source-candidate/application ledger. If another active review/export surface genuinely needs canonical placement provenance, add one explicitly named sibling field with a strict schema and one owner; do not hide provenance inside the spatial union. Do not add optional catch-all keys to `CharacterPresenceDispositionSchema`.

Candidate application must remain atomic. A missing cast target, invalid node, or illegal nonlocal placement returns a field-addressable failure and leaves the prior draft and candidate application state unchanged.

Add a persisted-draft migration/sanitizer that:

- detects `sourceId` and `evidenceIds` inside stored `presenceDisposition` objects created by the landed regression;
- retains only the valid discriminated spatial fields;
- preserves the character, selected player identity, aim, pursuits, map, depiction contract, source analyses, and all unrelated User edits;
- clears an invalid disposition rather than inventing a location; and
- runs once through the existing persisted-store migration/version boundary.

Do not require the User to re-import the reference or reauthor valid placements merely to export an affected draft.

---

## 5. Automatically stage the initial Depiction Contract proposal

After the first validated reference analysis is successfully registered and the existing depiction-generation readiness check passes, automatically invoke the same bounded production proposal request currently behind **Generate Proposal**.

Required behavior:

- trigger once for the first eligible source baseline, after registration has committed;
- stage the returned typed proposal in `pendingDepictionContractProposal`;
- render those staged values directly in the Depiction Contract authoring fields so the panel is visibly pre-filled, while clearly labeling them as pending review;
- allow edits to the staged values before Apply without writing them into the canonical contract prematurely;
- preserve explicit **Apply** and **Dismiss** review semantics—automatic generation is not automatic canonical acceptance;
- never overwrite a completed canonical Depiction Contract or an already pending current proposal;
- do not duplicate requests on re-render, hydration, Strict Mode effect replay, or unrelated draft edits;
- on later source-set changes, preserve the current contract, mark any pending proposal stale through the existing revision logic, and offer explicit **Regenerate Proposal**;
- retain an actionable retry on transient generation failure without rolling back the successful source import; and
- keep all fields manually editable.

Extract the proposal-request orchestration into one production helper/controller used by both reference import and the Depiction Contract panel. Do not copy the fetch/parse logic into a second component path.

After initial import, the panel should describe the pre-filled pending proposal as automatically prepared from the reference. Dismissing it returns to manually editable empty/current canonical fields. Once a proposal or contract exists, the explicit action is **Regenerate Proposal**, not the original discovery-dependent **Generate Proposal**.

Cover both document extraction and native JSON reference registration paths.

---

## 6. Export pre-flight behavior

The existing export review remains the one export gate. After this packet:

- an affected migrated draft with four valid source-derived placements parses and reaches readiness;
- no `cast.N.presenceDisposition: Unrecognized keys` error is possible from production candidate application;
- incomplete player selection, placement, aim, intent review, map, or depiction data remains field-addressable;
- the error links/status indicators point the User toward the one character-centric editor rather than an absent manifest; and
- export review does not mutate the draft to make itself pass.

Do not loosen required Blueprint structure or Depiction Contract completeness to restore export.

---

## 7. Required tests

Add focused proof for:

- the Forge renders one character authoring surface and no placement manifest;
- identity, player selection, placement, player aim, and non-user intent changes call canonical actions and update one draft;
- inline creator aim/pursuit editing preserves text on validation failure and uses no browser prompt/alert path;
- `SpatialManager` renders map controls but no cast or intent editor;
- the Starting Conditions grid is absent while valid draft vector/tier values remain preserved through export;
- applying `cast_opening_placement` never writes extra keys into `presenceDisposition`;
- all three valid disposition shapes pass strict parsing and invalid extra keys still fail;
- migration repairs the exact landed malformed placement shape without losing unrelated draft/source state;
- a migrated affected draft reaches export readiness;
- first eligible document and JSON imports each request exactly one depiction proposal;
- staged proposal values visibly pre-fill the editable contract fields but remain noncanonical until Apply;
- hydration/re-render does not duplicate the automatic request;
- a current pending proposal or completed contract is not overwritten;
- later source changes offer regeneration rather than silently replacing the contract; and
- transient depiction-generation failure leaves source intake successful and exposes functional retry.

Prefer extending:

- `src/lib/sourceBaseline.test.ts`
- `src/store/useForgeStore.test.ts`
- `src/components/forge/FileDropzone.test.tsx`
- `src/components/forge/DepictionContractPanel.test.tsx`
- `src/components/forge/SpatialManager.test.tsx`
- `src/components/forge/ExportReviewModal.test.tsx`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/forgeDraft.test.ts`

Add a focused `CharacterAuthoringPanel.test.tsx` and a small Forge composition test if needed. Do not create a broad duplicate integration suite in this packet.

---

## Focused behavior gate

Run the directly affected Forge/source/store/component suites. Include the new character component/composition test under its final filename:

```bash
npx vitest run src/lib/sourceBaseline.test.ts src/store/useForgeStore.test.ts src/components/forge/FileDropzone.test.tsx src/components/forge/DepictionContractPanel.test.tsx src/components/forge/SpatialManager.test.tsx src/components/forge/CharacterAuthoringPanel.test.tsx src/components/forge/ExportReviewModal.test.tsx src/lib/forgeReadiness.test.ts src/lib/forgeDraft.test.ts
npx tsc --noEmit
```

If the final component test has a different truthful filename, substitute that exact file; do not omit the composition proof. Do not run the unscoped full Vitest suite, lint, or production build in this packet.

Report exact commands, file counts, test counts, and any unrelated failure without expanding scope.

---

## Completion criteria

Packet 1C-9 is complete only when the User sees one coherent character authoring flow, the map surface no longer impersonates a second cast editor, the Starting Conditions grid is gone, initial reference intake automatically stages the depiction proposal, and a source-derived placement can no longer poison or block Blueprint export.

Stop and report incomplete if any parallel writable cast/placement surface remains, an affected persisted draft must be discarded, automatic depiction generation overwrites reviewed state, or strict placement parsing is weakened to accept the malformed shape.

---

## Out of scope

- Full reviewed-provenance resolver hardening beyond the placement export repair
- Rich-map first-node fallback and Architect error classification, owned by 1C-11
- Final import-to-Engine vertical proof
- Horror Grammar 1 runtime ratifier/forensics work
- Horror Grammar 2
- README or roadmap edits
