# The Terror Machine — Forge 1C-5
## Opening-Aim Provenance and Prompt Sovereignty

### Dependency

Begin from the reviewed Forge 1C-1 through 1C-4 state at `9cbfd973c15e71e793d032ba3713c5cacebece2a`.

This packet repairs one behavior boundary: a source-derived opening aim is a proposal until explicit User review, and the resulting reviewed disposition is the only opening baseline the Engine may receive.

---

## Objective

Eliminate the current trust inversion in which document extraction can emit `ACCEPTED_REFERENCE`, candidate application promotes it to canonical acceptance, the Forge UI substitutes `cast.goals` or a hard-coded sentence, non-resolving source/evidence strings pass export, and the Engine prompt can still publish a synthesized `ParticipationContext.initialGoal` instead of the reviewed opening baseline.

Preserve the existing `UserOpeningAim` owner and its four dispositions. Do not create a second player-motive system.

---

## 1. Make extraction output proposal-only

At the document-analysis/provider boundary:

- change `user_opening_aim_default` output to a proposed `castMemberId` and `aimText`, optionally carrying provider-returned evidence references for validation;
- do not instruct the model to emit `ACCEPTED_REFERENCE`;
- if a provider nevertheless returns a disposition, normalize it to `UNREVIEWED` or reject it—never preserve an accepted/override/none disposition from provider output;
- require the proposed text to be non-empty, bounded, and attached to a real extracted cast ID;
- canonicalize the candidate's source ID from the server-owned source record rather than trusting a model-authored nested source ID; and
- canonicalize evidence IDs from the candidate's validated evidence list.

The general source-candidate workflow may remain intact. The opening-aim candidate specifically must remain staged/unreviewed until the User performs the dedicated opening-baseline action.

Update the provider prompt and strict schemas together. A prompt-compliant result must not rely on Zod defaults to silently turn a missing ownership field into a valid proposal.

---

## 2. Separate candidate application from User acceptance

Repair `applyCandidateToDraft()` or its active successor for `user_opening_aim_default`:

- applying the reviewed source candidate may populate `draft.userOpeningAim` as an `UNREVIEWED` proposal;
- it must not write `ACCEPTED_REFERENCE`;
- it must not set `reviewedAt`;
- it must not fabricate `src-default`, `ev-extracted`, or any other placeholder identifier;
- it must preserve the exact normalized proposed text and the resolved source/evidence references; and
- it must target the exact proposed cast ID.

If an earlier applied proposal is replaced, edited, rebound to a new source baseline, or retargeted to another character, invalidate the old review state. Do not leave a previously accepted default attached to changed bytes or changed provenance.

Keep candidate application atomic: a failed provenance or cast resolution produces no partial draft/source-analysis mutation.

---

## 3. Make the three Forge actions authoritative

The active opening-baseline UI must expose exactly these semantic choices for the selected user character:

1. **Accept reference default** — promote the exact displayed `UNREVIEWED` proposal to `ACCEPTED_REFERENCE` only when its source and evidence resolve;
2. **Use my own aim** — record exact User-authored text as `CREATOR_OVERRIDE` with creator provenance; and
3. **None declared** — record `NONE_DECLARED` with empty aim text and no fabricated source provenance.

Required UI behavior:

- render the proposed reference aim before acceptance;
- disable **Accept reference default** when there is no exact proposal or its provenance is invalid;
- never derive the displayed or accepted default from `cast.goals`, premise, inciting incident, location, or a hard-coded fallback;
- show the reviewed disposition clearly after selection;
- allow the User to reopen/revise the choice; and
- route all three actions through one tested store/domain action rather than ad hoc component mutation.

`cast.goals` remains descriptive characterization only.

---

## 4. Resolve provenance at readiness and compilation

Create or reuse one exact source-evidence resolver shared by candidate application, export readiness, and compilation.

For `ACCEPTED_REFERENCE`, validate all of the following:

- `sourceId` resolves to a currently registered `ForgeSourceAnalysis`/source record;
- every `evidenceId` resolves within that exact source;
- at least one evidence item supports the proposal;
- the reviewed `aimText` is byte-for-byte equal after canonical trim/normalization to the proposal the User accepted;
- the accepted `castMemberId` still resolves to the selected user-controlled cast member; and
- the source/draft revision binding is current.

`validateForgeExportReadiness()` must return field-addressable errors for each failure. `compileForgeDraft()` must also fail closed when asked to compile an accepted reference aim without the provenance registry/context needed to resolve it. A caller must not bypass readiness by invoking the compiler directly.

For `CREATOR_OVERRIDE`, require non-empty User-authored text and creator provenance. For `NONE_DECLARED`, require empty aim text and no reviewed-source provenance. `UNREVIEWED` remains export-blocking for a Forge 1C protagonist.

---

## 5. Carry disposition through the Engine boundary

Extend the typed player portion of `EngineTurnContext` with the reviewed opening-baseline disposition or an equivalent discriminated shape. Preserve exact selected-character binding.

`buildEngineTurnContext()` must produce:

- `ACCEPTED_REFERENCE` or `CREATOR_OVERRIDE`: exact reviewed text plus the existing sovereignty instruction;
- `NONE_DECLARED`: explicit reviewed-none disposition, no aim text, and an instruction that the Engine must not infer or supply one;
- `UNREVIEWED`, missing, stale, or cast-mismatched state: no trusted Forge 1C opening baseline; the Forge/Setup gates should prevent a new Forge 1C protagonist session from reaching this state.

Update `/api/turn` prompt construction so the typed opening-baseline state is actually consumed:

- accepted/override text appears once in a labeled player starting-orientation block;
- `NONE_DECLARED` produces no objective text and explicitly forbids synthesis;
- the sovereignty instruction is present and bounded;
- the protagonist participation section must not also publish `ParticipationContext.initialGoal` as `Initial Core Goal` when a Forge 1C opening-baseline disposition is present; and
- premise, inciting incident, location, and legacy initial goal never substitute for a reviewed `NONE_DECLARED` baseline.

Keep legacy/ad-lib participation behavior compatible only on its existing explicit legacy path. Do not weaken antagonist/director/witness contracts.

---

## 6. Required tests

Add focused proof for:

- provider output attempting `ACCEPTED_REFERENCE` is downgraded/rejected as proposal-only;
- applying a source candidate produces `UNREVIEWED`, not accepted state;
- the UI accepts the exact reference proposal only through the explicit action;
- creator override and none-declared actions produce their exact dispositions;
- no goals/premise/hard-coded text can become the default;
- fake, missing, cross-source, and pattern-shaped IDs fail readiness and direct compilation;
- changed proposal bytes or revisions invalidate acceptance;
- accepted reference and creator override reach the mocked `/api/turn` prompt exactly once;
- `NONE_DECLARED` reaches the prompt boundary without any generated core goal or opening aim;
- mismatched cast identity does not leak another character's aim; and
- no opening baseline creates a player pursuit, activity opportunity, Autopilot action, internal thought, or canonical mutation.

Prefer extending:

- `server/routes/forge.test.ts`
- `src/lib/sourceBaseline.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/forgeDraft.test.ts`
- `src/lib/openingAimAndPursuits.test.ts`
- `src/components/forge/SpatialManager.test.tsx`
- `src/lib/buildEngineTurnContext.test.ts`
- `server/routes/turn.test.ts`

Add a narrowly named suite only when an existing owner would become misleading.

---

## Focused behavior gate

Run only the directly affected suites plus TypeScript if required to validate the changed contracts. Do not run the unscoped full Vitest suite, lint, or production build in this packet.

Report exact commands, file counts, test counts, and any unrelated global failure without expanding scope.

---

## Completion criteria

Packet 1C-5 is complete only when source extraction cannot ratify its own aim, explicit User action is the sole acceptance boundary, provenance resolves exactly, and the active turn prompt obeys all three reviewed dispositions without an `initialGoal` backdoor.

Stop and report incomplete if any fake provenance, synthesized none-declared goal, model-authored acceptance, duplicate goal block, or player initiative authorization remains reachable.

---

## Out of scope

- User-character selection and re-binding beyond what is required to reject a mismatched aim
- Story-map/start-node closure
- The final vertical integration fixture
- Unrelated HG1 ratifier/forensics work
- Horror Grammar 2
- README or roadmap edits
