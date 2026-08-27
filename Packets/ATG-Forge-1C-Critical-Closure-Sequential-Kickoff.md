# The Terror Machine — Forge 1C Critical Closure
## Sequential Kickoff for ATG

### Reviewed baseline

Implement cumulatively against live `main` at:

`9cbfd973c15e71e793d032ba3713c5cacebece2a`

Forge 1C-1 through 1C-4 remain the installed foundation. This series repairs the four critical seams found in review; it does not replace the existing Forge, topology compiler, Architect protocol, source-analysis store, Blueprint ingress, Engine setup, or Horror Grammar owners.

---

## Goal

Make a Forge-produced Blueprint truthful and usable across the real authoring-to-first-turn path:

- a reference-derived player opening aim remains only a proposal until the User explicitly accepts it;
- accepted source provenance resolves to the actual uploaded source and evidence records;
- the selected user-controlled character is stable across extraction, Forge review, Blueprint export, and Engine setup;
- a reviewed Forge map cannot export or initialize without an explicit starting node;
- `NONE_DECLARED` never acquires a generated goal through another context field;
- compact main-map data and expandable anchors remain one human- and machine-readable topology owner; and
- the integrated proof uses production store/actions and request boundaries rather than manually creating the state it claims to prove.

---

## Required order

1. `Forge-1C-5-Opening-Aim-Provenance-and-Prompt-Sovereignty.md`
2. `Forge-1C-6-User-Character-Identity-and-Baseline-Binding.md`
3. `Forge-1C-7-Explicit-Story-Map-Gate-and-Source-Integrity.md`
4. `Forge-1C-8-Production-Path-Closure-and-Stabilization.md`

Complete each packet's focused behavior gate before beginning the next. Packets 1C-5 through 1C-7 must not run the unscoped full suite. Packet 1C-8 alone owns the integrated proof and broad stabilization run.

---

## Global invariants

- Build up from the landed implementation. Do not reset, replace, or fork a second Forge/Blueprint/runtime authority.
- Model and document-extraction output is proposal material. It cannot mark a player aim, character selection, map fact, placement, pursuit, or ambiguity resolution as User-accepted.
- Only an explicit User action may produce `ACCEPTED_REFERENCE`, `CREATOR_OVERRIDE`, or `NONE_DECLARED` for the selected player's opening baseline.
- `NONE_DECLARED` is positive reviewed state, not missing data. It must survive export, normalization, setup, and prompt construction without a premise-, goal-, or location-derived substitute.
- An opening aim is read-only shared orientation. It never authorizes a player action, private thought, emotion, pursuit, scheduled activity, or Autopilot behavior.
- All source IDs and evidence IDs used as reviewed provenance must resolve exactly. Pattern-shaped or non-empty strings are not evidence.
- The main map contains only story-important opening spaces and directed connections. Secondary regions remain optional expandable anchors and are not instantiated at opening.
- Tertiary and quaternary non-user characters may be explicitly reviewed as **No readable intent**; the Engine must not fabricate a pursuit for them.
- Provider failures, refusal text, stack data, endpoints, credentials, raw model output, and rejected proposal text remain outside canonical Forge/Blueprint/Engine state.
- The separately reviewed HG1 ratifier, perception, forensics, and consecutive-turn concerns are not accepted or repaired by this series.

---

## Stop conditions

Stop the current packet and report the owning boundary if:

- the requested repair would require a competing canonical store or topology representation;
- a model-authored value must be treated as User acceptance to make a test pass;
- legacy compatibility would falsely label an old Blueprint as Forge 1C-reviewed;
- an unreviewed or mismatched player aim can reach `/api/turn` as an objective;
- a rich authored topology can still select its first array element as an implicit start;
- provider or rejected-proposal data reaches canon; or
- the final proof cannot traverse the active store/actions and request schemas without manually mutating intermediate state.

Do not conceal a stop condition with a fallback, placeholder, test-only adapter, weakened schema, or deferred limitation.

---

## Delivery

After Packet 1C-8, return one consolidated report containing:

1. baseline and final working state;
2. changed files grouped by owner;
3. opening-aim proposal, explicit review, provenance, and prompt behavior;
4. user-character identity and Engine binding behavior;
5. story-map, starting-node, expansion-anchor, and provenance behavior;
6. the exact production-path integration fixture and which real actions/boundaries it traverses;
7. focused and broad commands with exact file/test counts;
8. provider/canon isolation results;
9. residual defects or limitations; and
10. confirmation that unrelated HG1 remediation and Horror Grammar 2 were not started.
