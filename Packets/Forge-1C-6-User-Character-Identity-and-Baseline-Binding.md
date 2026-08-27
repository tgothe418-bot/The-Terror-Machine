# The Terror Machine — Forge 1C-6
## User-Character Identity and Opening-Baseline Binding

### Dependency

Begin only after Forge 1C-5 passes its focused gate. Implement cumulatively against that state.

This packet repairs one behavior boundary: the same explicitly identified user-controlled character must own the reviewed opening baseline, opening placement, Blueprint identity, and protagonist Engine binding.

---

## Objective

Eliminate the current identity failure in which the extraction contract omits `isUserCharacter`, schema defaults silently convert the omission to `false`, opening-aim application then rejects the intended protagonist, and Engine Setup can bind a different eligible mortal without a matching reviewed baseline.

Preserve stable cast IDs and the existing perspective-binding system. Do not create a parallel player-profile owner.

---

## 1. Make source cast identity explicit

Update the provider-facing `cast_seed` contract and extraction prompt so each proposed cast member includes:

- stable candidate/cast ID;
- name;
- role;
- description;
- `isEntity`;
- explicit `isUserCharacter` boolean;
- descriptive `goals` when actually readable from the reference; and
- the already supported behavior/vulnerability fields.

At the untrusted provider boundary, `isUserCharacter` must be required. Do not let a `.default(false)` turn an omitted field into a valid source-extraction result. The internal/legacy normalization path may continue to default old stored records, but it must not make a new malformed provider response look complete.

The model may propose which reference character is the intended player perspective. That proposal does not override an explicit User selection in Forge.

---

## 2. Establish one canonical selected-character owner

Use one stable Forge field for the selected user-controlled character—prefer the existing Blueprint `userCharacterId`, adding it to `ForgeDraft` if needed. Treat per-cast `isUserCharacter` as a synchronized/derived compatibility marker, not an independent second authority.

For a Forge 1C protagonist Blueprint:

- exactly one selected `userCharacterId` is required;
- the ID must resolve to a non-entity cast member eligible for protagonist control;
- exactly that cast member is marked `isUserCharacter: true` in compiled compatibility data;
- all other cast members are false;
- the selected character has an explicit `AT_NODE` opening placement at the reviewed `topology.startingNodeId`; and
- the selected character is excluded from non-user pursuit review and autonomous pursuit/activity seeding.

Add a Forge action/UI control to select or change the player character atomically. Do not rely on editing raw cast flags one by one.

When the selected character changes:

- clear or reopen a player opening baseline targeted at the former character;
- require a reviewed opening-baseline choice for the new character;
- remove the new user character from NPC pursuit review and remove any autonomous pursuit records targeted to them;
- return the former user character to `UNREVIEWED` non-user pursuit status unless the User explicitly reviews a source pursuit or **No readable intent**; and
- reconcile opening placement without silently moving unrelated cast members.

No partial identity/pursuit/aim mutation is permitted if reconciliation fails.

---

## 3. Compile and normalize the identity exactly

Update Forge validation, compilation, Blueprint schema/normalization, and export review so:

- `ForgeDraft.userCharacterId` (or the chosen single owner) survives exact serialization;
- compiled `Blueprint.userCharacterId` matches the single selected cast member;
- `userOpeningAim.castMemberId` matches `userCharacterId` for all reviewed dispositions;
- the selected character's placement resolves to exact `startingNodeId`;
- rich source-derived cast data remains accepted by the strict Forge/Architect request projection; and
- legacy Blueprints without this owner continue only through the existing compatibility path and are not labeled Forge 1C-reviewed.

Missing, duplicated, stale, entity-targeted, or cross-character identity must fail with field-addressable errors before export.

Do not infer the user character from cast order, `PROTAGONIST` role alone, name matching, an opening-aim target, or whichever character Engine Setup happens to select.

---

## 4. Bind Engine Setup to the reviewed Forge identity

For a protagonist session created from a Forge 1C-reviewed Blueprint:

- Engine Setup preselects and binds exact `Blueprint.userCharacterId`;
- only that reviewed player identity can start the session from the Forge 1C artifact;
- a mismatched `activeCharacterId` or stale selection blocks start with a field-addressable recovery message instead of silently binding another eligible cast member;
- Director/Witness remain unembodied and do not receive a player opening aim; and
- non-protagonist role behavior remains governed by its existing authority contract.

Changing the user-controlled character belongs to the explicit Forge selection/review action so the map placement and opening baseline can be reviewed together. Do not create a setup-only motive that is absent from the Blueprint.

`resolvePerspectiveBinding()`, `buildActiveParticipationContext()`, session initialization, and `buildEngineTurnContext()` must all agree on the same cast ID. For a reviewed `NONE_DECLARED` baseline, retain the identity and reviewed-none disposition while emitting no goal text.

---

## 5. Preserve non-user intent rules

After identity reconciliation:

- every non-user cast member remains explicitly `REVIEWED` with valid pursuit(s), `REVIEWED_NONE`, or export-blocking `UNREVIEWED`;
- tertiary/quaternary characters may use `REVIEWED_NONE` without fabricated intent;
- entities follow the existing non-user pursuit rules and placement disposition;
- `cast.goals` remains characterization only; and
- no former or current user character gains independent scheduling merely because descriptive goals exist.

---

## 6. Required tests

Add focused proof for:

- a new provider `cast_seed` missing `isUserCharacter` fails at the strict boundary with the exact field path;
- rich cast objects including explicit ownership pass the Architect/document contracts;
- exactly one selected user character survives candidate application, store persistence, compilation, serialization, and normalization;
- changing the selected character atomically invalidates/reconciles aim and pursuit review state;
- a failed reconciliation leaves the original draft untouched;
- compiler/readiness reject zero, multiple, stale, entity, cross-aim, or wrong-placement identities;
- Engine Setup preselects the reviewed ID and blocks a mismatched/stale selection;
- `resolvePerspectiveBinding()`, session initialization, participation context, and Engine turn context agree on the same ID;
- `NONE_DECLARED` retains its owner without generating a goal; and
- former/current user characters do not receive unintended autonomous pursuits or opportunities.

Prefer extending:

- `server/routes/forge.test.ts`
- `src/lib/sourceBaseline.test.ts`
- `src/store/useForgeStore.test.ts` or the active Forge store suite
- `src/lib/forgeDraft.test.ts`
- `src/lib/forgeReadiness.test.ts`
- `src/lib/normalizeBlueprint.test.ts`
- `src/lib/playerCharacterBinding.test.ts`
- `src/components/engine/EngineSetup.test.tsx`
- `src/lib/openingAimAndPursuits.test.ts`
- `src/lib/buildEngineTurnContext.test.ts`

---

## Focused behavior gate

Run only the directly affected identity, Forge store, compiler/readiness, normalization, setup/binding, and opening-baseline suites. Type-check the affected contracts if needed. Do not run the unscoped full suite, lint, or build in this packet.

Report exact commands, file counts, and test counts.

---

## Completion criteria

Packet 1C-6 is complete only when one reviewed stable ID owns player identity from Forge through Engine initialization, that same ID owns the opening baseline and start placement, and no defaulted boolean, cast order, role string, or setup click can silently choose a different player.

Stop and report incomplete if Engine Setup can start a Forge 1C protagonist as an unreviewed character, if the opening aim can belong to another cast member, or if identity changes leave autonomous-pursuit residue on the selected user character.

---

## Out of scope

- Map provenance and explicit-start closure beyond the selected-character placement invariant
- The final vertical integration fixture
- New character class/role systems
- Unrelated HG1 remediation
- Horror Grammar 2
- README or roadmap edits
