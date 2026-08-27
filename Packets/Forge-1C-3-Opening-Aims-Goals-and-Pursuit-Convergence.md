# The Terror Machine — Forge 1C-3
## Opening Aims, Goals, and Pursuit Convergence

### Dependency

Begin only after Forge 1C-1 and 1C-2 pass their focused gates. Implement cumulatively.

---

## Objective

Give the situated opening cast reasons to act.

The model-backed Forge authoring pass must derive source-grounded opening motives where the reference supports them, let the user review and change them, and compile them into the correct existing owners before the Engine begins.

This packet distinguishes three concepts that must not be collapsed:

1. **User-controlled character opening aim** — a shared starting baseline the user explicitly accepts, replaces, or declines.
2. **Non-user character pursuit** — an HG1 authoring baseline which may create scheduled initiative.
3. **Descriptive goals/traits** — characterization context, not independent machine authority.

---

## Scope and existing owners

Expected owners include:

- `src/types/forge.ts`
- `src/types/horrorGrammar.ts`
- `src/types/index.ts`
- `src/lib/sourceBaseline.ts`
- `server/routes/forge.ts`
- Architect/source extraction prompts and strict response contracts
- `src/store/useForgeStore.ts`
- `src/components/forge/ScenarioBaselinePanel.tsx`
- `src/components/forge/CastManager.tsx`
- the new opening-map/baseline surface from 1C-2
- `src/lib/forgeCompiler.ts`
- `src/lib/forgeReadiness.ts`
- `src/lib/normalizeBlueprint.ts`
- `src/lib/buildEngineTurnContext.ts`
- `src/types/engineContract.ts`
- `src/lib/characterPursuits.ts`
- focused tests for these owners

Use the existing HG1 `CharacterPursuit`, reviewed provenance, pursuit-review states, and initial pursuit ledger for non-user initiative. Do not create a second NPC goal scheduler.

---

## 1. User-controlled character opening aim

Add a strict Blueprint authoring contract for the user-controlled character's opening aim.

It must include:

- exact cast member ID;
- review disposition;
- concise aim text when applicable;
- provenance mode;
- source/evidence references for a source-derived default;
- creator-defined provenance for a replacement; and
- the draft/source revisions at which the user accepted the decision, if consistent with existing review artifacts.

Use an explicit discriminated review model with these user-visible outcomes:

- **Accept reference default**
- **Use my own aim**
- **None declared**

An unreviewed state must also exist internally and must block reference-derived export.

### Reference default

The model-backed Forge extraction/Architect provides a concise default derived from the supplied reference material for the selected user-controlled character. It must cite at least one accepted evidence record. It is a proposal, not canon.

The default does **not** become accepted merely because it was extracted. The user must explicitly press Accept.

### User override

The user may replace the proposed default with their own aim. The stored provenance becomes creator-defined; it must not retain false source-evidence attribution.

### None declared

`None declared` is a valid explicit user decision. It means there is no shared opening aim in the Blueprint. It must not invite the Engine to supply one later.

---

## 2. User sovereignty boundary

The accepted opening aim is context, not an action command, intent receipt, compulsory plot step, or permission for Autopilot.

Requirements:

- Do not store it as an HG1 `CharacterPursuit`.
- Do not add the user character to `pursuitReviews` as a non-user actor.
- Do not generate a user activity opportunity from it.
- Do not let the runtime Engine revise, advance, complete, fail, or replace it.
- Do not translate it into narration asserting an unchosen user action, private thought, decision, or emotion.
- Do not permit it to override the user's current turn input.
- Do not permit it to authorize topology mutation or world facts.

Project it into `EngineTurnContext.player` (or an equivalently explicit player-baseline owner) as a bounded, read-only authoring fact with a sovereignty instruction. The prompt may use it to understand the selected role's starting orientation, but must state that only the user chooses whether and how to pursue it.

When `None declared` is accepted, project the explicit absence or omit the aim according to the strict contract. Never synthesize fallback text.

If the loaded Blueprint's opening aim is tied to one cast member but Engine setup binds the user to a different character, do not silently transfer it. Require a valid matching reviewed baseline or present an explicit setup-time choice without mutating the immutable Blueprint artifact.

Director/no-character participation must not fabricate a player aim.

---

## 3. Non-user initial intents and pursuits

For each non-user cast member, Forge must stage one review outcome:

- a source-grounded `CharacterPursuit` proposal;
- a creator-defined `CharacterPursuit`; or
- **No readable intent**.

Use the existing machine state `REVIEWED_NONE` for **No readable intent** unless a schema migration is necessary. The UI must use the clearer phrase **No readable intent** rather than implying the character has no motives, values, or ability to react.

This state is particularly valid for:

- tertiary or quaternary figures;
- briefly present background figures;
- characters whose opening purpose is genuinely unavailable in the reference; and
- opaque forces whose actionable pursuit cannot yet be responsibly represented.

It does not make the character inert. The character may still react to situated events through existing permitted systems. It only prevents Forge/Engine from inventing a fixed independent opening pursuit without reviewed authority.

---

## 4. Source-derived pursuit quality

A non-user pursuit proposal must use the existing `CharacterPursuit` contract and supply:

- stable pursuit ID;
- stable non-user cast member ID;
- concrete objective;
- present approach;
- accepted opening node when spatially situated, or an allowed absence compatible with 1C-2 placement;
- active/dormant status;
- review window;
- trigger references for event-driven pursuit;
- concise basis summary; and
- reviewed source or creator provenance.

The extraction prompt must distinguish:

- an enduring personality trait;
- a general desire;
- an opening objective;
- the present method used to pursue it; and
- a true unknown.

Do not turn every `cast.goals` string into an active pursuit. `cast.goals` may remain backward-compatible descriptive context, but it is not the canonical HG1 initiative baseline.

Do not invent goals merely to satisfy preflight. When evidence is insufficient, stage **No readable intent** for explicit review.

---

## 5. Placement and map convergence

Every reviewed non-user pursuit must agree with the 1C-2 opening-placement contract.

- `AT_NODE` actor: an active pursuit's initial location must be that exact accepted node unless the pursuit is explicitly offscreen and the contract permits it.
- `OFFSTAGE` actor: must not receive a present-scene opportunity through fallback co-location.
- `NONLOCAL` entity: must not gain ordinary physical co-presence or dialogue authority from its pursuit.
- Rejected/removed map nodes invalidate dependent staged pursuits before export.
- Changing a cast stable ID must deterministically migrate or invalidate dependent review records; never leave orphaned pursuits.

The compact map need not instantiate every place mentioned in an objective. A pursuit may reference a reviewed expandable-space anchor as a future target only through a distinct typed reference; it must not pretend that anchor is already a runtime node.

---

## 6. Forge authoring interface

Add an **Opening Baseline** review tied to the selected cast and map.

For the user-controlled character, show:

- character identity;
- source-derived default aim and its evidence;
- Accept;
- editable Replace with my own aim;
- None declared; and
- current explicit review state.

For non-user cast, show a compact per-character row/card with:

- opening placement;
- proposed objective and present approach;
- review window/status;
- evidence/provenance access;
- Accept/Edit/Reject; and
- No readable intent.

Tertiary/quaternary characters must be easy to mark **No readable intent** individually without manufacturing placeholder goals. Do not add a bulk action that silently assigns invented pursuits.

All changes write through `forgeDraft` actions and invalidate stale immutable review artifacts. No local component state may become a second authoring authority.

---

## 7. Candidate and Architect patch support

Extend typed source candidates and Architect resolution patches to support:

- proposing/replacing the user opening-aim default;
- accepting a creator-defined user aim only through a user action, never a model patch;
- setting user aim to None declared only through a user action;
- adding/editing/removing a non-user pursuit;
- setting a non-user pursuit review to `REVIEWED` or `REVIEWED_NONE`; and
- updating dependent placement references where explicitly reviewed.

Architect output may propose a source-grounded default or NPC pursuit, but it may not mark the user's aim accepted, select None declared, or commit any proposal.

Patch application remains atomic, identity-resolved, and revision-bound.

---

## 8. Readiness and compiler rules

For a reference-derived Blueprint with a selected user-controlled character, export must block until:

- the user opening-aim disposition is explicitly reviewed;
- the aim belongs to the exact selected cast member;
- source-derived acceptance resolves real source/evidence IDs;
- creator-defined aim has no false source attribution; and
- every non-user cast member has `REVIEWED` pursuit(s) or `REVIEWED_NONE` / No readable intent.

Additional validation:

- user character cannot appear in HG1 non-user pursuits;
- non-user reviewed-none cannot retain pursuits;
- reviewed non-user actor must have at least one valid pursuit;
- pursuit cast and location references must resolve;
- duplicate pursuit IDs reject;
- event-driven pursuit requires resolved trigger references;
- removed or changed cast/map IDs block dependent authoring until repaired;
- stale staged candidates block export under the existing readiness rules.

Legacy Blueprints without an opening-aim contract may load through a clearly tested compatibility path. Do not pretend they contain an accepted user aim. New Forge exports may not use that compatibility default to bypass review.

---

## 9. Focused verification gate

Add or update focused tests proving:

1. Reference extraction proposes a player opening aim with resolved evidence.
2. Extraction alone leaves it unreviewed.
3. Explicit Accept creates the reviewed source-grounded baseline.
4. Custom replacement creates creator-defined provenance and removes false evidence attribution.
5. None declared is valid, explicit, and produces no fallback aim.
6. The Engine context receives the matching accepted aim as read-only context.
7. The aim never produces a user `CharacterPursuit`, activity opportunity, generated action, or canonical mutation.
8. Binding another playable character does not inherit the first character's aim.
9. Director participation receives no fabricated aim.
10. Source-grounded NPC objective and present approach compile to the existing HG1 authoring baseline and initial ledger.
11. No readable intent maps to `REVIEWED_NONE`, contains no pursuit, and does not block export.
12. No readable intent does not falsely mark the character incapable of situated reaction.
13. `cast.goals` alone does not authorize independent initiative.
14. Pursuit placement references agree with the accepted map/placement contract.
15. Orphaned cast/node/evidence references reject field-addressably.
16. Architect proposals cannot self-accept the player's aim or commit an NPC pursuit.
17. Retake/refusal behavior cannot change the immutable opening baseline.

Run only affected Forge source, Architect, store, component, compiler/readiness, normalization, context, pursuit, and eligibility suites. Do not run the full project suite in this packet.

---

## Out of scope

- Dynamic player quest tracking
- Model-generated player actions
- Changes to user intent ratification
- New NPC scheduler
- HG1 activity/pressure authority remediation
- README or roadmap changes

---

## Completion report

Report:

- final player opening-aim contract and sovereignty boundary;
- final non-user pursuit/no-readable-intent behavior;
- map/placement convergence;
- prompt/context projection;
- focused commands and exact results;
- residual defects; and
- confirmation that 1C-4 was not started.
