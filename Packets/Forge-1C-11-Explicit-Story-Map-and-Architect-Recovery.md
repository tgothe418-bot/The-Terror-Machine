# The Terror Machine — Forge 1C-11
## Explicit Story Map and Architect Recovery

### Dependency

Begin only after Forge 1C-9 and 1C-10 pass their focused gates. Implement cumulatively against that state.

This packet repairs the remaining map-authority and recovery-control seams without expanding the compact-map design into exhaustive cartography.

---

## Objective

Make the compact authored story map genuinely explicit from Forge through runtime, eliminate first-node and under-described-node fallbacks for rich maps, preserve correct start provenance, and ensure Architect recovery controls offer retry only when repeating the retained request can succeed.

---

## 1. Make rich main-node definitions authoritative

For Forge 1C rich topology, `nodeDefinitions` is the authoritative set of story-important opening spaces. The legacy `nodes: string[]` field may remain as a compiled compatibility projection, but it must not create a runtime node absent from `nodeDefinitions`.

Choose one canonical projection rule and apply it everywhere:

- rich Forge mutation writes complete node definitions;
- raw node IDs are derived from those definitions at compilation/export, or strict validation requires exact one-to-one equality;
- duplicate IDs fail;
- a raw ID with no definition fails;
- a definition with an empty label or missing required opening description fails readiness;
- connections resolve only to defined main nodes;
- anchors cannot collide with or masquerade as main nodes; and
- anchors remain absent from opening runtime nodes/exits.

Do not compile a missing definition into `{ name: id, description: '' }`. Do not use array union as an authoring repair.

Keep the map compact: only story-important starting spaces and directed connections are required. Optional areas stay expandable anchors so both User and Engine retain narrative freedom.

---

## 2. Require an explicit starting node at every rich-map boundary

For rich Forge 1C topology:

- missing `startingNodeId` remains missing and blocks readiness;
- public Blueprint normalization must not replace it with `nodes[0]`;
- Engine Setup/session/runtime compilation must reject a missing, unknown, or anchor start before simulation initialization;
- adding the first node must not silently make it the reviewed start;
- deleting the selected start must clear the selection and its provenance, then display a required-state error;
- changing the start manually must write creator provenance or clear superseded source provenance through one canonical action;
- accepting a source-proposed start must retain exact current reviewed-source provenance; and
- selecting the player character must not fall back to the first node or `ORIGIN` when no explicit rich-map start exists.

Legacy flat Blueprints may retain their existing explicitly classified compatibility fallback. Add a positive classification test so the fallback cannot bleed into rich topology.

The User-controlled character's `AT_NODE` placement must match the explicit start through a coordinated store action. A mismatch blocks readiness rather than silently moving either side during export.

---

## 3. Make SpatialManager fail visibly and preserve provenance

After 1C-9, `SpatialManager` is map-only. Repair its mutation behaviors:

- display **Starting node required** until the User accepts/selects one;
- add a node without implicit start selection;
- change start through the canonical topology action, not generic `updateDraft()`;
- clear old reviewed-source provenance when a creator changes the start;
- clear start and provenance when the selected node is removed;
- update node definitions and any compatibility projection atomically;
- prevent connections to missing nodes and duplicate directed edges; and
- keep expandable anchors visibly distinct from current spaces.

Do not reintroduce character placement controls into the map component. Character cards may read the canonical node list for placement choices.

Export/readiness errors must point to the visible map control that owns them.

---

## 4. Classify Architect failures by recoverability

Create one typed, tested error classifier used by the active Architect request flow. Preserve safe server codes; do not infer recoverability from display text.

An identical retained request may offer **Retry** only for transient failures such as network interruption, provider transport failure, or retryable server failure.

Do not offer identical retry for deterministic context/identity failures, including the active equivalents of:

- missing source binding;
- expired source binding;
- source ID mismatch;
- unknown already closed/resolved;
- unregistered unknown identity; or
- client request construction failure caused by absent required binding/context.

For those cases:

- preserve the exact User correction in editable state;
- display the owning problem and the required recovery action;
- direct the User to restore/re-import source context, reopen/select the current question, or edit/resubmit as appropriate;
- do not repeatedly send known-invalid bytes; and
- do not force **Leave ambiguous** merely to escape the error.

When a failure is retryable, retain and resend the exact correction, source ID, unknown ID, and bounded request projection. A successful retry must clear the error and continue the normal explicit Apply-to-Draft path.

The existing strict narrow request projection remains authoritative. Do not send the entire rich Forge cast or draft merely to satisfy the endpoint schema.

---

## 5. Required tests

Add focused proof for:

- rich raw nodes and node definitions cannot diverge;
- a raw-only under-described start fails readiness and compilation;
- normalization does not assign the first node for rich topology missing a start;
- legacy flat topology retains only its explicitly classified compatibility behavior;
- adding the first rich node leaves start unselected;
- removing the selected start clears start and provenance without selecting another node;
- creator start change cannot retain stale source provenance;
- source-proposed start retains exact current provenance;
- player selection/placement cannot use first-node or `ORIGIN` fallback for rich topology;
- missing, unknown, anchor, and mismatched starts fail before Engine initialization;
- valid compact nodes, directed connections, and anchors compile exactly as authored;
- deterministic binding/identity/closed-unknown errors do not render Retry;
- their recovery guidance preserves the exact User correction;
- transient failure renders functional Retry and resends exact retained input once;
- successful retry continues through typed response validation and explicit Apply; and
- no failure/retry path leaks raw provider or infrastructure details into canonical state.

Prefer extending:

- `src/components/forge/SpatialManager.test.tsx`
- `src/components/forge/ArchitectChat.test.tsx`
- `server/routes/forge.test.ts`
- `src/lib/normalizeBlueprint.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/forgeDraft.test.ts`
- `src/lib/compileRuntimeTopology.test.ts`
- `src/lib/playerCharacterBinding.test.ts`
- `src/store/useForgeStore.test.ts`
- Engine Setup/session initialization tests directly affected by start validation

Add one small error-classifier test file only if no existing owner accurately describes it.

---

## Focused behavior gate

Run only the directly affected map/normalization/runtime-topology/Architect/store suites:

```bash
npx vitest run src/components/forge/SpatialManager.test.tsx src/components/forge/ArchitectChat.test.tsx server/routes/forge.test.ts src/lib/normalizeBlueprint.test.ts src/lib/forgeReadiness.test.ts src/lib/forgeDraft.test.ts src/lib/compileRuntimeTopology.test.ts src/lib/playerCharacterBinding.test.ts src/store/useForgeStore.test.ts src/components/engine/EngineSetup.test.tsx src/core/engine/sessionInitialization.test.ts
npx tsc --noEmit
```

If the active Engine Setup test has a different exact filename, resolve it with repository search and substitute that file. Do not run the unscoped full Vitest suite, lint, or production build in this packet.

Report exact commands, file counts, test counts, and any unrelated failure without expanding scope.

---

## Completion criteria

Packet 1C-11 is complete only when a rich story map cannot gain a node or start through array fallback, start changes preserve truthful provenance, character placement binds to the explicit start, and Architect controls distinguish functional retry from required context recovery.

Stop and report incomplete if any rich map initializes from its first array element, a raw-only node compiles with empty description, a changed start retains old source attribution, or a deterministic binding/identity failure still offers a futile Retry button.

---

## Out of scope

- Exhaustive mapping of every source location
- Dynamic instantiation of expandable anchors during later narrative turns
- Further character-panel redesign beyond consuming the canonical node list/errors
- Final production-path integration fixture
- Horror Grammar 1 runtime repairs
- Horror Grammar 2
- README or roadmap edits
