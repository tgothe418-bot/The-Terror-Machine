# The Terror Machine — Forge 1C-7
## Explicit Story-Map Gate and Source Integrity

### Dependency

Begin only after Forge 1C-6 passes its focused gate. Implement cumulatively against that state.

This packet repairs one behavior boundary: a Forge 1C map is a compact, reviewed, source-grounded graph with an explicit start—not an optional decoration that runtime may replace with the first array element.

---

## Objective

Close the current gap in which a rich map without `startingNodeId` passes Forge validation, runtime silently falls back to `nodes[0]`, map candidate provenance is not consistently transferred/resolved, and the authoring UI can initialize its own first-node default before the User has accepted a known opening baseline.

Keep the installed topology owner: main node definitions, directed connections, `startingNodeId`, expandable anchors, and cast presence dispositions. Do not add a second navigation graph.

---

## 1. Make the reviewed start explicit

For every new Forge 1C export containing authored rich topology:

- require at least one story-important main node with stable unique ID, label, and concise description;
- require explicit `topology.startingNodeId`;
- require the start ID to resolve to an instantiated main node definition;
- require the selected user character's `AT_NODE` placement to equal that start ID;
- reject anchors, missing definitions, or deleted nodes as starts; and
- treat changing/deleting the start node as an export-invalidating revision.

`validateForgeDraft()`, `validateForgeExportReadiness()`, and `compileForgeDraft()` must all enforce the invariant. The active Forge UI must not quietly write the first node as accepted start merely because no start has been reviewed.

`compileRuntimeTopology()` must fail closed for a rich authored topology whose explicit start is absent or invalid. Preserve first-node fallback only inside the existing clearly identified legacy flat-topology compatibility path. Do not mark that fallback as reviewed Forge topology.

---

## 2. Preserve a compact main map

The initial authored graph remains deliberately small:

- main nodes represent only story-important opening spaces;
- connections are directed exactly as authored;
- reverse edges are never synthesized;
- connection kind, requirements, authority, and `userInitiated` survive compilation;
- secondary rooms/regions are `ForgeExpandableAnchor` records attached to one main node; and
- anchors are excluded from initial runtime nodes, exits, local presence, and starting-node selection.

Do not attempt exhaustive reference cartography. The Engine may later instantiate new fiction through its existing validated mechanisms; that does not mutate the accepted opening-map evidence or silently materialize anchors.

---

## 3. Make source grounding resolvable

Use the same exact source-evidence resolver established in 1C-5.

At source-candidate application, canonicalize rather than trust nested provider provenance:

- source-derived node, connection, starting-node selection, expandable-anchor, and placement records receive the server-owned `sourceId` and validated evidence IDs from their candidate/source analysis;
- evidence-backed records require at least one resolving evidence ID in that exact source;
- source-derived inference is labeled distinctly from quoted/explicit evidence;
- creator-authored additions use creator provenance and cannot masquerade as source evidence; and
- placeholder, cross-source, orphaned, duplicated, or pattern-matched IDs fail.

Add the smallest additive provenance field needed where the current topology type cannot identify the owning source—particularly connections and any node/anchor record that currently has evidence IDs without a source ID. Keep the same shape in Forge and Blueprint schemas.

Readiness and compilation must cross-validate:

- node IDs and definition IDs are one-to-one;
- every edge endpoint resolves to a main node;
- every anchor parent resolves to a main node;
- every `AT_NODE` placement resolves to a main node;
- starting-node provenance resolves to the accepted selection action/source proposal;
- every evidence claim resolves to actual source-analysis evidence; and
- no rejected or merely staged candidate is represented as reviewed map provenance.

Legacy maps remain loadable without gaining fabricated provenance.

---

## 4. Keep the authoring view human- and machine-readable

Update the active map section in `SpatialManager` or its current owner to render directly from canonical `forgeDraft.topology`:

- a compact main-map flow view showing each node label and directed outgoing connections;
- a clear, explicit start marker and a User action to select/change it;
- concise node descriptions available without opening raw JSON;
- expandable anchors grouped under their parent node and collapsed by default;
- source/inference/creator classification visible in a compact form; and
- cast opening placements visible against node/offstage/nonlocal state.

This view is a projection only. Editing it must use the existing Forge topology actions and revision tracking. Do not store layout coordinates or a separate diagram document as canonical state unless the existing component truly requires ephemeral presentation state.

The machine-readable artifact remains the typed node/edge/anchor graph. The human view and runtime compiler must read the same IDs and connections.

---

## 5. Architect and extraction projection

Extend the bounded Architect draft projection only enough to summarize:

- selected start node;
- compact main-node labels/descriptions;
- directed connections;
- expandable-anchor labels/parents; and
- relevant source/evidence classification.

Add typed Architect patch operations for topology only if a real correction path requires them. Such operations remain proposals until explicit **Apply to Draft** and must pass the same provenance and graph validation. Do not allow free-form Architect prose to mutate the map.

Keep bounds at or below the existing node/connection/history limits.

---

## 6. Required tests

Add focused proof for:

- a rich Forge draft with nodes but no `startingNodeId` fails draft validation, readiness, and direct compilation;
- invalid/deleted/anchor start IDs fail with field-addressable errors;
- runtime compilation refuses implicit first-node start for rich topology while the explicit legacy compatibility fixture still loads;
- selected user placement must equal exact start ID;
- source candidate application transfers real source/evidence provenance into node, edge, start, anchor, and placement records;
- fake, cross-source, orphaned, staged, and rejected evidence cannot appear as reviewed map data;
- directed connections remain directed and preserve their metadata;
- anchors never become initial nodes/exits/presence targets;
- the UI renders the same canonical node/edge IDs, marks the explicit start, and keeps anchors expandable;
- changing the start or graph invalidates a captured export artifact; and
- bounded Architect topology projection/correction cannot bypass explicit Apply.

Prefer extending:

- `src/lib/sourceBaseline.test.ts`
- `src/lib/forgeDraft.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/compileBlueprintDraft.test.ts`
- `src/lib/compileRuntimeTopology.test.ts`
- `src/lib/castPresence.test.ts`
- `src/lib/architectProtocol.test.ts`
- `src/components/forge/SpatialManager.test.tsx`
- `src/components/forge/ExportReviewModal.test.tsx`

---

## Focused behavior gate

Run only the directly affected source-baseline, topology, provenance, Architect projection, Forge UI, readiness/compiler, runtime topology, presence, and export-snapshot suites. Type-check affected schemas if needed. Do not run the unscoped full suite, lint, or build in this packet.

Report exact commands, file counts, and test counts.

---

## Completion criteria

Packet 1C-7 is complete only when a new Forge map cannot export or initialize without an explicit reviewed start, all story-map evidence resolves to real source records, the compact human view projects the same graph consumed by the Engine, and expandable anchors remain optional unopened space.

Stop and report incomplete if rich topology can still fall back to the first array node, if a map claim can carry unresolved provenance, or if UI and runtime read different topology owners.

---

## Out of scope

- Exhaustive/full-reference cartography
- Dynamic procedural map expansion systems
- Layout-coordinate persistence
- The final production-path fixture and broad stabilization
- Unrelated HG1 remediation
- Horror Grammar 2
- README or roadmap edits
