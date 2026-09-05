# Packet 06 — Resolve exact authority references

Status: pending implementation. Milestone 2. Read the [series contract](README.md). Prerequisite: [Packet 05](05-User-Value-Protection.md).

## Finish line

An activity or pressure proposal must cite actual eligible evidence belonging to the relevant actor, pursuit, value, or authority contract. A plausible identifier prefix supplies no authority by itself.

## Observed failure

Activity and situated-pressure reference checks accept several identifier prefixes, including `rule-`. A schema-valid direct-activity proposal citing `rule-does-not-exist-in-this-scenario` was accepted even though that reference was absent from the actual scenario context.

The evidence demonstrates nonexistent-reference admission. It does not establish that every existing rule is semantically sufficient for every action, or that exact matching alone solves interpretation of free-form authored rules.

## Work

1. Inventory the reference classes actually emitted by production context construction and consumed by activity/pressure resolution. Record each class's canonical source, identity, ownership constraints, and availability at the relevant point in the turn.
2. Replace prefix-only authorization with lookup in those actual eligible sources. Resolve authored rule identifiers using the production registry/projection; do not let a proposal introduce new registry entries or manufacture authority by echoing an ID.
3. Validate actor/holder/pursuit ownership and scope after existence. An existing reference for another actor or a different session must not grant the proposer that authority. Preserve valid shared/scenario references according to their actual contract.
4. Respect ratification order. If pressure may depend on activity accepted earlier in the same turn, expose only that accepted result. Rejected or merely proposed activity must not become supporting evidence.
5. Keep structural reference checks distinct from semantic interpretation. Retain existing capability, topology, perception, and User-sovereignty checks. Do not claim that arbitrary authored text has become a formal permission system.
6. Make rejection receipts explain missing, ineligible, or wrong-owner evidence without inserting raw diagnostics into ordinary prose. Retain the established labeled forensic export convention.

Primary owners: `src/lib/buildEngineTurnContext.ts`, `src/lib/castActivity.ts`, `src/lib/situatedPressure.ts`, `src/lib/castActivityEligibility.ts`, and relevant HG1 contracts/resolution ordering in `server/routes/turn.ts`.

## Acceptance checks

- Nonexistent rule, pursuit, opportunity, and other supported reference classes cannot authorize activity or pressure; use schema-valid payloads.
- Existing references with the wrong actor, holder, session, or scope are rejected where those ownership boundaries apply.
- Exact valid evidence still authorizes legitimate present activity, supported offscreen activity, and pressure.
- Pressure derived from accepted same-turn activity works; otherwise-identical pressure derived from rejected activity fails.
- A model-provided reference list or identifier prefix cannot expand the trusted registry.
- Exercise these cases through actual context construction and route/resolver ordering, then verify rejected changes stay out of published ledgers and subsequent requests.

Focused families: `src/lib/castActivity.test.ts`, `src/lib/castActivityEligibility.test.ts`, `src/lib/situatedPressure.test.ts`, `server/routes/turn.horrorGrammar1.test.ts`, and `src/lib/ratificationPipeline.horrorGrammar1.test.ts`.

Include the reference-source inventory and its semantic limits in the completion record. Packet 11 will use this trusted evidence boundary for event-driven pursuit triggers. Next: [Packet 07](07-Depiction-Import-Export.md).
