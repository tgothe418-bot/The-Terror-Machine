# The Terror Machine — Forge 1C-10
## Reviewed Provenance and Opening-Aim Integrity

### Dependency

Begin only after Forge 1C-9 passes its focused gate. Implement cumulatively against that state.

This packet closes trust-boundary defects found in the landed Forge 1C code. It must not reverse the character-centric cleanup or reintroduce a second review surface.

---

## Objective

Make reviewed-source state prove exactly which registered source, evidence records, and applied proposal the User accepted; prevent rejected/staged opening aims from being promoted; surface malformed extraction instead of silently dropping cast; and remove the Engine's synthetic opening-aim fallback.

Preserve creator overrides and `NONE_DECLARED` as first-class reviewed alternatives.

---

## 1. Fail visibly on malformed source extraction

The active document-analysis normalizer currently drops candidate records whose strict schema parse fails and may still return an analysis marked `completed`. Replace this silent filtering at required Forge 1C boundaries with field-addressable validation failure.

At minimum:

- a `cast_seed` missing explicit `isUserCharacter` cannot disappear while the analysis reports success;
- an invalid user opening aim, topology node, start selection, placement, or pursuit candidate cannot be silently omitted when its omission would make the authoring baseline incomplete or misleading;
- server-owned `sourceId` continues to replace provider-authored source identity;
- candidate evidence IDs continue to be limited to exact evidence records in that source; and
- the User receives a bounded, safe error that identifies the failed candidate index/target without raw provider output, credentials, endpoints, or stack data.

Use the existing source-analysis error/intake boundary or a typed normalization error. Do not introduce a second partially valid candidate array whose acceptance semantics differ from `ForgeSourceAnalysis`.

Optional, nonessential malformed evidence may be rejected individually only when the analysis exposes that rejection clearly and no candidate claims the missing evidence. Required cast/topology/aim/placement structure must fail closed.

---

## 2. Accept only the exact applied opening-aim proposal

Repair the canonical opening-aim acceptance action so it resolves one exact candidate and verifies all of the following before mutation:

- target is `user_opening_aim_default`;
- candidate belongs to the selected `userCharacterId`;
- `reviewDecision === 'accepted'`;
- `applicationState === 'applied'`;
- proposed text exactly matches the displayed `UNREVIEWED` draft proposal after the one canonical trim/normalization step;
- candidate source ID matches the registered analysis/source record;
- every candidate evidence ID resolves in that exact source; and
- the source/draft proposal binding has not changed since review.

Do not scan for the first pattern-matching candidate. Resolve by a stable proposal/candidate identity carried by the unreviewed aim or an equivalent existing revision-bound reference.

A rejected, merely staged, wrong-character, stale, edited, cross-source, or unrelated-evidence candidate must leave the prior draft unchanged and return a field-addressable error to the character card.

Creator override and `NONE_DECLARED` remain explicit User actions and do not require source provenance. Changing the selected player character, editing accepted source text, removing its source, or superseding its candidate invalidates the accepted-reference review without fabricating a replacement.

---

## 3. Make reviewed-source provenance unconditionally resolvable

Refactor `resolveSourceEvidenceProvenance()` or its active successor into one fail-closed resolver shared by:

- source candidate application;
- opening-aim acceptance;
- export readiness;
- direct Forge compilation; and
- topology reviewed-source validation.

For `REVIEWED_SOURCE`, an omitted, null, or empty `sourceAnalyses` registry is an error—not permission to accept plausible-looking strings.

Require:

- exact registered source/analysis resolution;
- exact evidence resolution inside that source;
- no placeholder or merely prefix-shaped identifiers;
- exact matching applied candidate where the field derives from a proposal;
- correct candidate target and cast member;
- exact normalized value bytes; and
- current revision/application state.

If a field is creator-authored, represent it as creator provenance rather than a fake reviewed source. If a source-backed compiler caller cannot provide the source registry, direct compilation must fail closed with the same field key used by readiness.

The resolver must not accept an evidence item merely because it is real but supports a different candidate. Candidate/evidence linkage is part of the proof.

---

## 4. Keep readiness and compilation equivalent

`validateForgeExportReadiness()` and `compileForgeDraft()` must agree on reviewed-source validity.

Required cases:

- accepted reference aim plus missing registry: both fail;
- plausible fake source/evidence strings: both fail;
- registered source and evidence but no matching accepted/applied aim candidate: both fail;
- exact current accepted/applied candidate: both pass;
- creator override: both validate creator requirements without source lookup;
- none declared: both require empty aim text and no reviewed-source provenance; and
- unreviewed aim: both block Forge 1C export.

Do not let the compiler silently omit validation when the registry has zero keys. Do not let readiness pass a state the direct compiler rejects or vice versa.

---

## 5. Remove synthetic Engine opening orientation

At the typed Engine request and prompt boundary:

- `ACCEPTED_REFERENCE` and `CREATOR_OVERRIDE` require non-empty reviewed `openingAim` text;
- `NONE_DECLARED` requires no aim text and must not inherit a legacy initial goal;
- malformed accepted/override state is rejected before model invocation;
- remove the `Investigate surroundings.` or any equivalent synthetic fallback;
- render accepted/override text exactly once as historical starting orientation with the existing sovereignty instruction; and
- render `NONE_DECLARED` as the explicit absence of a declared aim, with no premise-, location-, inciting-incident-, `cast.goals`-, or participation-goal substitute.

Use a schema refinement/discriminated player-baseline contract so a caller cannot construct an accepted disposition with missing text. Preserve legacy behavior only on a clearly classified legacy Blueprint path; never upgrade a legacy fallback to reviewed Forge 1C state.

No opening baseline may create a user pursuit, cast-activity opportunity, internal decision, forced action, or Autopilot authority.

---

## 6. Required tests

Add focused proof for:

- missing `isUserCharacter` and malformed required candidates produce safe field-addressable extraction failure rather than silent drop;
- server-owned source identity replaces provider-authored identity;
- rejected and staged opening-aim candidates cannot be accepted;
- wrong-character, wrong-target, stale, edited, and unrelated-evidence candidates cannot be accepted;
- the exact accepted/applied current candidate can be accepted through the character card action;
- acceptance failure is atomic and preserves the User's displayed proposal/text;
- empty/missing provenance registry fails readiness and direct compilation;
- fake prefix-shaped IDs, cross-source evidence, real-but-unlinked evidence, and missing candidate linkage fail;
- exact source/evidence/candidate linkage passes;
- readiness and compiler return equivalent field ownership for the matrix above;
- Engine request parsing rejects accepted/override disposition with missing aim;
- no synthetic fallback sentence reaches the prompt;
- accepted reference, creator override, and none declared each render their exact permitted prompt shape; and
- none declared and accepted source states authorize no user activity or pursuit.

Prefer extending:

- `server/routes/forge.test.ts`
- `src/lib/sourceBaseline.test.ts`
- `src/store/useForgeStore.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/forgeDraft.test.ts`
- `src/lib/openingAimAndPursuits.test.ts`
- `src/lib/buildEngineTurnContext.test.ts`
- `src/types/engineContract`-owning tests
- `server/routes/turn.test.ts`
- the character authoring component test introduced in 1C-9

Keep negative fixtures deterministic and bounded. Do not copy provider refusal details into assertions or artifacts.

---

## Focused behavior gate

Run only the directly affected source/store/readiness/compiler/turn suites:

```bash
npx vitest run server/routes/forge.test.ts src/lib/sourceBaseline.test.ts src/store/useForgeStore.test.ts src/lib/forgeReadiness.test.ts src/lib/forgeDraft.test.ts src/lib/openingAimAndPursuits.test.ts src/lib/buildEngineTurnContext.test.ts server/routes/turn.test.ts src/components/forge/CharacterAuthoringPanel.test.tsx
npx tsc --noEmit
```

If the consolidated character test uses a different final filename, substitute that exact file. Do not run the unscoped full Vitest suite, lint, or production build in this packet.

Report exact commands, file counts, test counts, and any unrelated failure without expanding scope.

---

## Completion criteria

Packet 1C-10 is complete only when model output cannot disappear into a falsely successful analysis, only the exact accepted/applied proposal can become `ACCEPTED_REFERENCE`, every reviewed-source claim resolves against the required registry and candidate linkage, readiness equals compilation, and no synthetic player aim remains at the Engine boundary.

Stop and report incomplete if a rejected/staged proposal can be promoted, a plausible string can substitute for provenance, empty registry bypass remains, malformed accepted aim reaches model invocation, or `NONE_DECLARED` acquires any objective text.

---

## Out of scope

- Further Forge layout changes beyond supporting the unified character card errors
- Rich-map normalization and SpatialManager start behavior, owned by 1C-11
- Final production-path integration fixture
- Horror Grammar 1 activity/pressure/forensics corrections
- Horror Grammar 2
- README or roadmap edits
