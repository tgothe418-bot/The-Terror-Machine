# The Terror Machine — Forge 1C-2
## Canonical Story Map and Opening Placement

### Dependency

Begin only after Forge 1C-1 is implemented and its focused gate passes.

Implement cumulatively against the resulting working tree. Preserve the repaired Architect protocol and source-identity ownership.

---

## Objective

Replace the obsolete flat **Starting Conditions** and **Locations & Connections** authoring model with one compact, reference-grounded, human-readable and machine-readable story map.

Before a reference-derived simulation begins, the Blueprint must establish:

- the story-important opening spaces;
- the meaningful directed connections between them;
- a deliberate opening node;
- explicit opening placement or absence for relevant cast; and
- optional anchors identifying where later authorized spatial elaboration is appropriate.

The map is intentionally compact. It must give both the user and model enough shared spatial reality to begin without turning the reference into an exhaustive floor plan. Runtime narration and authorized topology expansion retain room to discover detail.

---

## Scope and existing owners

Expected owners include:

- `src/types/forge.ts`
- `src/types/index.ts`
- `src/lib/sourceBaseline.ts`
- `src/lib/sourceBaseline.test.ts`
- `server/routes/forge.ts`
- `server/routes/forge.test.ts`
- `src/store/useForgeStore.ts`
- `src/store/useForgeStore.test.ts`
- `src/components/forge/ScenarioBaselinePanel.tsx`
- `src/components/forge/SpatialManager.tsx`
- `src/components/forge/Forge.tsx`
- `src/components/forge/ExportReviewModal.tsx`
- corresponding focused component tests
- `src/lib/forgeCompiler.ts`
- `src/lib/forgeReadiness.ts`
- `src/lib/normalizeBlueprint.ts`
- `src/lib/compileRuntimeTopology.ts`
- `src/components/engine/EngineSetup.tsx`
- focused topology/setup/context tests

Build on the existing canonical `forgeDraft`, Blueprint topology, runtime topology compiler, strict directed edges, and intent-bound expansion path. Do not introduce a second runtime map store.

---

## 1. Authored map contract

Add a strict, bounded authored-map contract to Forge and the canonical Blueprint.

The precise names may follow repository conventions, but the contract must express:

### Main-map node definition

- stable `id` suitable for machine references;
- readable label distinct from the ID;
- concise spatial description/identity;
- source classification (`evidence`, `inference`, or creator-defined through the existing provenance vocabulary);
- source/evidence references when source-derived;
- optional compact sensory or environmental guidance only if already compatible with runtime `SpatialNode`; and
- review/application state in the staged source-analysis layer, not inside canonical Blueprint data.

### Directed connection definition

- stable identity if required for review/provenance;
- exact `from` and `to` node IDs;
- existing `EdgeKind`;
- `userInitiated` authority behavior;
- bounded `requires` references where appropriate;
- source/evidence references when source-derived; and
- no implicit reverse edge.

### Opening topology metadata

- one explicit `startingNodeId` referencing an accepted main-map node;
- a bounded, ordered list of main-map node definitions;
- a bounded list of directed connections; and
- optional expandable-space anchors.

### Expandable-space anchor

An anchor identifies a source-supported spatial region that is useful to remember but unnecessary to instantiate at opening. It must contain:

- stable anchor ID;
- parent main-map node ID;
- readable label;
- concise boundary/region description;
- provenance; and
- an explicit statement that it is not yet a canonical runtime node or exit.

Anchors do not become `topology.nodes`, do not appear as allowed exits, and do not authorize expansion by themselves. They may inform the existing Engine-authorized expansion process only when the user action and current topology rules independently permit expansion.

---

## 2. Compactness policy

Reference extraction must target the fewest story-important spaces that preserve:

- the opening situation;
- immediate navigational choices;
- important separations between characters or threats;
- known thresholds with narrative consequence; and
- the spatial relationships needed for source-grounded authority or pursuit.

Do not extract every room, corridor, furniture arrangement, briefly mentioned location, or nested interior as a main node.

Use soft extraction guidance rather than a brittle mandatory node count. At the schema boundary, use generous finite bounds to prevent unbounded payloads. A one-node enclosure is valid when the material truly requires only one opening space. Large reference works still receive a compact opening map, with secondary regions represented as expandable anchors.

Inference is allowed only as an explicitly labeled proposal. The user may accept, edit, reject, add, or remove map elements before application.

---

## 3. Source-analysis candidates

The current document extraction contract supports only `initial_topology_node`. Replace or supersede that insufficient target with typed candidates for:

- map node;
- directed map connection;
- starting-node selection;
- expandable-space anchor; and
- cast opening placement.

Native Blueprint intake must preserve existing topology while creating equivalent reviewable candidates for the richer contract.

Candidate application must be dependency-ordered and atomic:

1. cast seeds and map nodes;
2. directed connections and expansion anchors;
3. starting-node selection and cast placement;
4. dependent values/pursuits or other references.

If any accepted dependent candidate references a missing/rejected node or cast member, **Apply Accepted** must fail without partially mutating `forgeDraft`. Report the exact candidate and invalid stable reference.

Default source candidates may remain accepted-but-staged, consistent with the current baseline review. They do not become canonical until Apply Accepted.

---

## 4. Canonical and compatibility shape

Preserve the Engine's established topology authority.

Canonical Blueprint topology must continue to provide a deterministic ordered `nodes` projection and exact `connections` usable by active Engine code. The richer node definitions and explicit `startingNodeId` must be additive or compiled deterministically into that active shape.

Requirements:

- `startingNodeId` is authoritative for new Blueprints; do not rely on `nodes[0]` as an implicit authoring decision.
- The compiler must ensure every connection endpoint exists in accepted main nodes.
- Duplicate node IDs and duplicate directed edges reject.
- A reverse path exists only when separately authored.
- A source label or display name must never substitute for a node ID.
- New canonical Blueprints retain node labels/descriptions into `SpatialNode` compilation instead of replacing them with ID formatting and empty descriptions.
- Legacy Blueprints with only `topology.nodes` and `connections` continue to load deterministically. Their start may migrate from `nodes[0]`; migration must be explicit in normalized output or receipt/testing, not a hidden Forge acceptance.
- Existing malformed input must continue to reject rather than gaining permissive coercion.

Update every active topology entry point. `EngineSetup.handleStart`, `initializeSession`, `compileRuntimeTopology`, and `buildEngineTurnContext` must resolve the same explicit starting node and readable node definition.

Remove any duplicate initialization where one store compiles one start node and another independently chooses a different one.

---

## 5. Opening placement contract

Every cast member must have a reviewed opening-placement disposition. Use a strict discriminated contract such as:

- `AT_NODE` — present at one accepted main-map node ID;
- `OFFSTAGE` — deliberately not present in the instantiated opening map; or
- `NONLOCAL` — a genuinely distributed/non-spatial entity, permitted only when supported by the accepted authority/world contract.

Do not use an empty string, invalid node, or generic fallback as an authored disposition.

Requirements:

- The selected user-controlled character must begin at the canonical `startingNodeId` unless the user explicitly authors another valid start as part of the opening baseline.
- A non-user cast member marked `AT_NODE` must seed `CharacterPresenceById` at that exact node.
- `OFFSTAGE` cast must not silently appear in the player's node.
- `NONLOCAL` must not be treated as local co-presence or ordinary physical dialogue authority.
- Missing or invalid placement in a new reference-derived draft remains unresolved and blocks export.
- Tertiary/quaternary characters may be explicitly offstage; they need not clutter the compact main map.
- Legacy Blueprints may retain a documented compatibility path, but new Forge exports must not default every unplaced character to the player node.

Update `buildCharacterPresence` so an explicit absence/nonlocal disposition is preserved. Maintain strict separation between opening placement and later canonical movement receipts.

---

## 6. Forge map interface

Replace the current node-card grid and flat connection list with a compact flowchart authoring surface.

The visualization must:

- display accepted/staged main nodes and directed connections;
- distinguish the starting node;
- show cast placement without overcrowding the node;
- attach expandable-space anchors as collapsed secondary branches;
- distinguish evidence, inference, and creator-defined proposals;
- allow expansion/collapse of secondary information; and
- remain legible at the project target resolution.

The flowchart must have a fully usable textual counterpart in the same authoring surface. Every node, edge, placement, and anchor must be reviewable and editable without relying on spatial dragging, color, or pointer interaction. The canonical data is the typed map model; the diagram is a derived view.

Do not add a complex general-purpose graph editor. Deterministic layout is sufficient.

Consolidate or retire obsolete Starting Conditions / Locations & Connections controls once their responsibilities are represented by the new opening-map surface. Do not leave two writable topology authorities.

---

## 7. Readiness and immutable export

For a new reference-derived draft, preflight must report field-addressable errors for:

- no accepted main-map node;
- no valid `startingNodeId`;
- unknown connection endpoints;
- duplicate node/edge IDs;
- invalid expansion-anchor parent;
- unresolved cast placement;
- `AT_NODE` placement referencing an unknown node;
- incompatible `NONLOCAL` placement; and
- accepted/staged map candidates not yet applied.

The export review must summarize:

- main node count;
- directed connection count;
- starting node;
- expansion-anchor count; and
- placement dispositions.

The immutable review artifact must freeze the exact map/start/placement state and invalidate on either draft or source-baseline revision change.

Do not make the depiction contract, value review, pursuit review, or ambiguity review less strict to obtain export success.

---

## 8. Focused verification gate

Add or update focused tests proving:

1. Document analysis normalizes typed node, edge, starting-node, anchor, and placement proposals.
2. Apply Accepted respects dependency order and is atomic on broken references.
3. Main-map extraction excludes an optional minor space from canonical runtime nodes while retaining it as an anchor.
4. Directed edges do not gain an implicit reverse edge.
5. `startingNodeId` survives Forge draft, immutable export, Blueprint normalization, Engine setup, runtime topology compilation, and turn context.
6. Node labels/descriptions survive into the runtime spatial graph.
7. `AT_NODE`, `OFFSTAGE`, and permitted `NONLOCAL` dispositions seed presence correctly.
8. Missing ordinary placement does not silently co-locate every cast member with the player in a new Blueprint.
9. Invalid placement and endpoints block export with field-addressable errors.
10. Legacy topology loads through its explicit compatibility path.
11. The diagram and textual controls derive from the same canonical map data.
12. Diagram-only changes cannot mutate canon outside the store action boundary.
13. Expansion anchors are absent from initial runtime nodes/exits.
14. `SYSTEM_INIT` cannot expand topology, and current intent-bound expansion behavior remains unchanged.

Run only affected Forge source/store/component/compiler/readiness, topology compiler, Engine setup, presence, and context suites. Do not run the full project suite in this packet.

---

## Out of scope

- Exhaustive maps
- Procedural map generation at initialization
- New movement or topology authorization rules
- Runtime map editor
- Opening goal/intent authoring (owned by 1C-3)
- HG1 ratifier remediation
- README or roadmap work

---

## Completion report

Report:

- final authored-map and placement contracts;
- extraction and application behavior;
- compatibility behavior;
- interface changes;
- focused commands and exact results;
- any residual defect; and
- confirmation that 1C-3/1C-4 were not started.
