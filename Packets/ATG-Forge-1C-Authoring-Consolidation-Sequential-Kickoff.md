# The Terror Machine — Forge 1C Authoring Consolidation
## Sequential Kickoff for ATG

### Reviewed baseline

Implement cumulatively against live `main` at:

`059d4356577be4bf01ca7c9a6efaf0ccaab81d97`

Forge 1C-1 through 1C-8 remain the installed foundation. This series consolidates the active Forge authoring experience, repairs the confirmed Blueprint export regression, and closes the remaining integrity and production-proof gaps. It must build on the existing Forge store, source-analysis ledger, Architect protocol, topology compiler, Blueprint ingress, Engine Setup, and runtime owners.

Do not reset the Forge, fork a second draft authority, or broaden this series into the separately reviewed Horror Grammar 1 runtime work.

---

## Goal

Make the Forge coherent and usable from the User's point of view while preserving its machine-readable guarantees:

- one character-centric surface owns cast identity, player selection, opening placement, player opening aim, and non-user opening intent review;
- the story-map surface owns spaces, connections, anchors, and the explicit starting node—without presenting a second cast editor;
- the obsolete Starting Conditions matrix is removed from the Forge UI without deleting the Engine's existing vector/tier contracts or valid defaults;
- initial reference import automatically stages a Depiction Contract proposal for review, with explicit regeneration available afterward;
- source-derived opening placement can no longer write forbidden provenance keys into `presenceDisposition` or block Blueprint export;
- reviewed-source provenance resolves to exact registered source, evidence, and candidate records;
- a rich story map never acquires an implicit first-node start or an under-described runtime-only node;
- Architect recovery controls distinguish retryable failures from failures requiring restored source context; and
- the final proof traverses the actual import-to-first-turn production path.

---

## Required order

1. `Forge-1C-9-Unified-Character-Authoring-and-Export-Recovery.md`
2. `Forge-1C-10-Reviewed-Provenance-and-Opening-Aim-Integrity.md`
3. `Forge-1C-11-Explicit-Story-Map-and-Architect-Recovery.md`
4. `Forge-1C-12-Production-Path-Closure-and-Stabilization.md`

Complete each packet's focused gate before beginning the next. Packets 1C-9 through 1C-11 must run only their scoped verification. Packet 1C-12 alone owns the integrated proof and broad stabilization run.

---

## Global invariants

- `forgeDraft`/`draftBlueprint` remains the single canonical Forge draft projection. Do not introduce another writable cast, placement, topology, depiction, or opening-intent store.
- Source extraction and Architect output remain proposals. User-reviewed states continue to require the existing explicit review/apply actions.
- Exactly one `userCharacterId` binds player identity, opening placement, opening aim, Blueprint export, and Engine perspective.
- A player opening aim is shared historical orientation only. It never authorizes player action, thought, emotion, pursuit, activity scheduling, or Autopilot behavior.
- The Engine supplies the reference-derived opening default only after explicit User acceptance; the User may instead define an override or select `NONE_DECLARED`.
- `NONE_DECLARED` is a valid positive review state. It must not receive a premise-, location-, cast-goal-, or hard-coded substitute.
- Tertiary and quaternary non-user characters may be reviewed as **No readable intent**. Do not fabricate pursuits to satisfy export.
- `CharacterPresenceDispositionSchema` remains a strict spatial discriminated union. Do not add `sourceId` or `evidenceIds` to it merely to silence the export error.
- Main-map node definitions are the authoritative rich-map spaces. Expandable anchors are optional future-space affordances and are not opening runtime nodes.
- Provider failures, refusal data, raw provider output, credentials, endpoints, stack data, and rejected proposals remain outside canonical draft, Blueprint, Engine context, story state, and ordinary exports.
- Preserve legacy Blueprint compatibility only where it remains explicitly classified as legacy. Never label fallback-derived state as reviewed Forge 1C authoring.

---

## Stop conditions

Stop the current packet and report the owning boundary if:

- the cleanup would require a second cast or topology authority;
- the existing draft cannot be migrated without discarding unrelated User-authored work;
- a model-authored proposal must be treated as User acceptance to complete the flow;
- source-backed state can compile without the source registry required to prove it;
- a rich map still needs first-array-element fallback to initialize;
- an identical retry is offered for a deterministic source-identity or binding failure;
- provider or rejected-proposal material reaches canon; or
- the final proof must hand-build the intermediate Blueprint, Engine context, or turn request it claims production created.

Do not conceal a stop condition with a placeholder, weakened schema, silent fallback, test-only adapter, or completion prose.

---

## Verification discipline

- Packets 1C-9 through 1C-11: run the named focused suites and TypeScript only when their changed contracts require it.
- Packet 1C-12: run the cumulative integrated gate, then the full repository gate exactly once.
- Preserve green unrelated behavior. If an existing assertion is intentionally superseded by the consolidated authoring contract, enumerate it in the completion report.
- Use the repository's existing prohibited-name guard without adding prohibited names to fixtures, descriptions, reports, or generated artifacts.

---

## Delivery

After Packet 1C-12, return one consolidated report containing:

1. baseline and final working state;
2. changed files grouped by ownership;
3. the final character-centric Forge flow and removed legacy UI paths;
4. placement export repair and persisted-draft migration behavior;
5. automatic Depiction Contract proposal behavior;
6. opening-aim and reviewed-source provenance guarantees;
7. rich-map/start-node and Architect recovery guarantees;
8. exact production actions and request boundaries traversed by the integrated fixture;
9. focused and broad commands with exact file/test counts;
10. residual defects or limitations; and
11. confirmation that unrelated Horror Grammar 1 remediation and Horror Grammar 2 were not started.

