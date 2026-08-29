# Packet 1E-2 — Mixed-Intent Spatial Ratification and Perceptual Scene Integrity

## Starting boundary

Expected starting commit: `d65f21d83fe7b3bc028096ec503a2f8ea299acda`.

Inspect the live working tree before editing. If the starting commit differs, inspect the intervening delta and stop only if it changes the active turn contract, `finalizeTurnCausality`, intent/topology authorization, runtime topology commit, or Engine prompt ownership.

This is a focused Engine correction. Do not redesign Forge, Blueprint compilation, provider schemas, Horror Grammar 1, runtime persistence, or Director mode.

## Objective

Make natural-language movement work when it appears inside a mixed action.

A User statement such as “I follow the guide into the records office while asking about the missing files” already authorizes the obvious movement. The User must not select a second navigation action, approve a transition, or classify their own input.

At the same time, preserve the distinction between:

1. a literal physical move through an authored connection;
2. an authored or contextually supported perceptual/anomalous displacement in prose while the physical node remains unchanged; and
3. a genuine physical expansion through an already recognized unmapped boundary.

The LLM may interpret narrative context. Deterministic code remains the final authority over physical topology mutation.

## Confirmed root defect

The current turn contract compresses every turn into one primary `intent_proposal.action_kind`.

`src/lib/intentConsequenceBridge.ts` then discards `logic_state.requested_transition` unless that primary kind is exactly `MOVE`. It also discards expansion unless the primary kind is exactly `MOVE`. `src/lib/causalFeasibility.ts` evaluates transition success or failure only inside its `MOVE` branch.

Consequently, a valid model response can classify a mixed statement as `COMMUNICATE`, correctly narrate the User following a present character into an adjacent room, and still lose the proposed transition before `resolveTransition()` sees it.

This is an ownership error. `action_kind` describes the dominant dramatic action. It must not be the sole carrier of secondary spatial intent.

## Non-negotiable invariants

- Natural language remains the interface. Add no confirmation modal, movement button, approval step, or User-authored node ID.
- `resolveTransition()` remains the deterministic authority for mapped movement.
- `applyTopologyDeltaToGraph()` remains the deterministic authority for physical expansion.
- `transitionReceipt` remains the canonical movement receipt consumed by Runtime and commit code.
- A proposed mapped target must still be an exact allowed outgoing target and satisfy `userInitiated` and `requires` rules.
- A rejected physical target never changes the canonical node.
- Supported perceptual or anomalous prose may describe a place that is not the physical node. It must not silently mutate the physical graph.
- A supported anomalous scene is not required to re-anchor in the same turn merely because its apparent location is not a physical map node. The Blueprint rules, current horror state, reconciliation mode, and recent history govern that narration.
- A perceptual scene must not create a canonical topology node, connection, cast placement, or physical transition unless the separate expansion contract succeeds.
- `SYSTEM_INIT` and the exact synthetic `[USER_ACTION: OBSERVE]` command are non-moving runtime commands.
- Director and witness remain non-embodied. This packet must not grant either role a player-body transition or physical expansion.
- One User action produces exactly one provider turn call and at most one committed physical transition.
- Do not add a second intent classifier, model call, topology store, spatial graph, or reconciliation system.
- Do not change `TurnResultSchema`, `geminiTurnResponseJsonSchema`, `EngineTurnStructuredResponseContract`, or the six HG1 proposal envelopes. This correction does not require a provider-schema change.
- Use only generic fixtures. Do not place supplied test-story titles, characters, locations, quotations, or telemetry text in source, tests, packets, snapshots, or comments.

## Track A — Write the failing corrections first

Before implementation, add focused failing tests that demonstrate the current defect through production owners.

Use a generic fixture with:

- current node `ENTRY_HALL`;
- adjacent node `RECORDS_OFFICE`;
- one valid User-initiated connection from `ENTRY_HALL` to `RECORDS_OFFICE`;
- one blocked or non-User-initiated edge;
- one unmapped boundary for expansion testing;
- one present dialogue-capable guide; and
- one supported anomalous perceived setting that is not a graph node.

At minimum, first prove these failures:

1. A provider result with primary `action_kind: 'COMMUNICATE'` and `requested_transition: 'RECORDS_OFFICE'` currently loses the target.
2. A provider result with primary `action_kind: 'OBSERVE'` from ordinary mixed prose and the same valid target currently loses the target.
3. A provider result with a non-`MOVE` primary kind and a valid threshold expansion currently loses the expansion.

The test names must describe behavior rather than implementation details.

## Track B — Separate primary intent from the mapped-transition proposal

### 1. Replace the action-kind gate

In `src/lib/intentConsequenceBridge.ts`, replace `getIntentBoundRequestedTransition()` with a pure helper whose authority is the spatial proposal itself, not the primary intent label.

Use this contract, adapting type imports only as required by the live tree:

```ts
export interface SpatialTransitionProposalInput {
  userAction: string;
  proposedTarget: string | null | undefined;
}

export function isSyntheticNonMovementCommand(userAction: string): boolean {
  const normalized = userAction.trim().toUpperCase();
  return (
    normalized === 'SYSTEM_INIT' ||
    normalized === '[USER_ACTION: OBSERVE]'
  );
}

export function getSpatiallyRatifiableRequestedTransition({
  userAction,
  proposedTarget,
}: SpatialTransitionProposalInput): string | null {
  if (isSyntheticNonMovementCommand(userAction)) {
    return null;
  }

  if (typeof proposedTarget !== 'string') {
    return null;
  }

  const normalizedTarget = proposedTarget.trim();
  return normalizedTarget.length > 0 ? normalizedTarget : null;
}
```

Do not perform fuzzy node matching in this helper. The model must propose the exact target ID from `Allowed Exits`; `resolveTransition()` continues to accept or reject it deterministically.

### 2. Update `finalizeTurnCausality()`

In `server/routes/turn.ts`:

- call `getSpatiallyRatifiableRequestedTransition({ userAction, proposedTarget })`;
- pass the resulting target to the existing preliminary `resolveTransition()` call;
- retain the existing reconciliation-boundary pass;
- run the final `resolveTransition()` exactly once over the bounded target; and
- return the existing `transitionReceipt` shape unchanged.

Do not infer movement from narrative text after generation. Do not parse arrival verbs from the prose. The provider’s bounded `requested_transition` is the proposal; the server resolver is the authority.

### 3. Make causal feasibility spatially aware for every primary kind

In `src/lib/causalFeasibility.ts`, evaluate an explicit transition proposal before branching on the dominant `action_kind`.

Required order:

1. Preserve the existing `SYSTEM` behavior after the synthetic-command target has been suppressed.
2. If a non-embodied Director or witness proposes physical movement, return `CONSTRAINED`, `AUTHORITY_LIMIT`, and `suppressStructuralDeltas: true`.
3. If `transitionReceipt.requestedNodeId !== null` and the receipt is rejected, return `IMPOSSIBLE`, `TOPOLOGY_LIMIT`, and `suppressStructuralDeltas: true`, regardless of the primary action kind.
4. If the transition is accepted, continue evaluating any applicable primary-action constraint, such as an explicitly addressed absent character. A valid move must not erase a separate cast-presence failure.
5. A valid accepted transition makes the spatial portion supported even when the dominant kind is `COMMUNICATE`, `OBSERVE`, `INVESTIGATE`, `MANIPULATE`, `WAIT`, or `OTHER`.
6. Preserve the existing pure-`MOVE` behavior when no target was proposed.

This prevents a mixed action from bypassing topology failure merely because its dominant kind was conversational, while allowing a valid mixed move to survive.

## Track C — Make expansion mixed-intent aware

Replace `getIntentBoundTopologyDelta()` with a threshold-bound helper. It must preserve an expansion proposal only when all of these are true:

- the action is not `SYSTEM_INIT` or exact synthetic Observe;
- the effective role is embodied (`protagonist`, `antagonist`, or `possessed`);
- `isExpansionExpected === true` from the existing application-owned threshold detector;
- the provider proposed `topologyDelta.isExpansion === true`; and
- the proposal contains the existing required expansion structure.

The dominant `action_kind` must not be one of those conditions.

Continue returning the exact neutral value when authorization fails:

```ts
{ isExpansion: false, newNodeDef: null }
```

Keep the existing client-side `exitDirection` stamping and `applyTopologyDeltaToGraph()` validation. Do not make the provider authoritative over the exit direction, duplicate-node check, source-node check, or graph commit.

## Track D — Correct the provider prompt without changing its schema

Update the active prompt in `server/routes/turn.ts`. Keep the existing allowed-exit projection and exact node IDs, but replace the current transition wording with a three-way spatial contract.

The prompt must state all of the following plainly:

```text
[SPATIAL INTERPRETATION CONTRACT]
- action_kind records the dominant action only. A turn may also contain dialogue, observation, investigation, manipulation, and physical movement.
- Never discard a completed physical move merely because another action is dominant.
- The User's natural-language action is sufficient movement authority. Do not require a separate navigation command or confirmation.

LITERAL AUTHORED MOVEMENT:
- If the action completes movement through an allowed authored exit, set logic_state.requested_transition to that exit's exact target node ID.
- This rule applies even when action_kind is COMMUNICATE, OBSERVE, INVESTIGATE, MANIPULATE, WAIT, or OTHER.
- Never narrate physical arrival in another authored node without proposing the matching exact target ID.

PERCEPTUAL OR ANOMALOUS DISPLACEMENT:
- When Blueprint rules, current horror conditions, or established recent fiction support a hallucinated, remembered, dreamlike, non-Euclidean, or otherwise subjective apparent location, prose may depict that apparent location while the physical node remains unchanged.
- For purely perceptual displacement, omit logic_state.requested_transition and emit no topology expansion.
- Use reconciliation mode MIXED when prose and physical spatial reality intentionally diverge.
- Do not diagnose or immediately dissolve the experience unless the authored fiction and current dramatic context call for it.

PHYSICAL WORLD EXPANSION:
- Propose topology expansion only when the supplied threshold override authorizes the recognized unmapped boundary.
- The dominant action_kind does not by itself authorize or forbid expansion.

NON-MOVEMENT:
- For SYSTEM_INIT and exact [USER_ACTION: OBSERVE], omit requested_transition and emit no expansion.
- If physical movement is blocked, incomplete, or ambiguous, keep the physical node unchanged. The prose may express the attempt, obstruction, uncertainty, or a supported anomalous experience.
```

Revise the static-topology directive so “do not invent new nodes” means “do not create new canonical physical nodes.” It must explicitly permit supported subjective or anomalous scene narration without a topology mutation.

Do not add a new `spatial_mode` provider field. Use the existing combination of:

- `logic_state.requested_transition`;
- `topologyDelta`;
- `reconciliation_proposal.mode` and feasibility;
- canonical current node; and
- narrative blocks.

## Track E — Production-path regression coverage

Update the smallest relevant existing suites rather than creating a parallel harness:

- `src/lib/intentConsequenceBridge.test.ts`
- `src/lib/causalFeasibility.test.ts`
- `server/engine/transitionResolver.test.ts`
- `server/routes/turn.test.ts`
- `src/lib/ratificationPipeline.test.ts`
- `src/core/engine/topologyCommit.test.ts`
- the current Runtime integration suite only where necessary to prove committed `nodeAfter` and next-turn state

Required cases:

1. **Mixed conversation and mapped move:** dominant `COMMUNICATE`, present addressed guide, exact connected target. Dialogue remains valid, transition is accepted, and the canonical node advances once.
2. **Mixed observation and mapped move:** ordinary natural-language action both enters and observes; dominant `OBSERVE`; exact connected target survives and commits.
3. **Pure synthetic Observe:** `[USER_ACTION: OBSERVE]` cannot move even if a malformed provider result proposes a connected target.
4. **Initialization:** `SYSTEM_INIT` cannot move or expand.
5. **Invalid mixed target:** dominant non-`MOVE` kind plus unconnected target produces `TOPOLOGY_LIMIT`, structural suppression, and no node change.
6. **Locked mixed target:** unsatisfied edge requirements remain rejected.
7. **Non-User-initiated edge:** remains rejected.
8. **Consecutive-turn closure:** after a mixed mapped move commits, the next real `EngineTurnContext` starts at the accepted destination and projects that node’s exits.
9. **Perceptual displacement:** generic supported anomaly prose depicts an apparent location absent from the graph; reconciliation is `MIXED`; transition remains null; graph and physical node remain unchanged; narrative survives into permitted recent history.
10. **Perception does not become expansion:** the apparent location is absent from nodes, connections, cast presence, and topology receipts after commit.
11. **Mixed threshold expansion:** a recognized unmapped boundary plus a non-`MOVE` dominant kind can preserve the proposal; the existing topology commit admits it once.
12. **Unauthorized expansion:** expansion remains suppressed when the threshold detector is false, for synthetic Observe/System Init, and for Director/witness.
13. **No double commit:** a turn cannot apply both a mapped transition and a separate expansion mutation.
14. **Failure isolation:** a rejected spatial proposal changes no node, graph, presence, memory, pursuit, tension, or turn state beyond already authorized non-spatial effects.

Provider mocks must return complete production-shaped `TurnResultSchema` payloads, including all six required HG1 envelopes. Do not manufacture missing envelopes with defaults.

## Telemetry acceptance

Do not introduce a new telemetry schema. Verify the existing output makes the distinction legible:

- literal mapped move: `Requested Node` is the exact target, `Accepted: true`, and `From Node`/`To Node` differ;
- supported perceptual displacement: `Requested Node: None`, physical `From Node`/`To Node` remain equal, reconciliation is `MIXED`, and narrative may describe the apparent setting;
- physical expansion: the topology delta/commit receipt records the admitted new node through the existing expansion path.

The existing transition and reconciliation receipts are sufficient if they report these states honestly.

## Verification gates

Run the focused correction gate first:

```bash
npx vitest run src/lib/intentConsequenceBridge.test.ts src/lib/causalFeasibility.test.ts server/engine/transitionResolver.test.ts server/routes/turn.test.ts src/lib/ratificationPipeline.test.ts src/core/engine/topologyCommit.test.ts
npx tsc --noEmit
```

Then run stabilization:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
```

Run the repository’s existing prohibited-name scan over added lines. Also scan added lines for any supplied test-story title, character, location, or quotation. Both scans must return zero matches.

## Completion report

Return:

1. final commit SHA and clean/dirty working-tree status;
2. files changed;
3. failing-before/passing-after proof for the mixed-intent transition;
4. results for all 14 required cases;
5. focused and full verification totals;
6. confirmation that Gemini/provider schemas were unchanged;
7. confirmation that no extra provider call, confirmation UI, topology owner, or story-specific fixture was introduced; and
8. any remaining evidence that literal prose and physical topology can diverge.

## Stop conditions

Stop and report rather than broadening scope if:

- the correction requires changing Gemini structured-output schema;
- a second model call or deterministic natural-language parser appears necessary;
- Runtime and server are found to commit from different topology owners;
- perceptual narration cannot be preserved without adding a second canonical location store;
- Director/witness would gain an embodied movement path; or
- the fix requires weakening allowed-edge, requirement, expansion, reconciliation, or atomic-publication guards.

