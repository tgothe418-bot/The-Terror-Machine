# Packet 09 — Make physics follow the scenario

Status: pending implementation and experiential review. Milestone 4. Read the [series contract](README.md). Prerequisite: Milestone 3 accepted through [Packet 08](08-Durable-Session-Recovery.md).

## Finish line

Increasing dramatic pressure changes the intensity of the scene without granting new physical powers. Grounded, supernatural, and deliberately uncertain scenarios retain their authored possibilities and limits through actual prompt construction and canonical admission.

## Observed failure

`calculatePhysicsState` receives tension/coherence without a Blueprint. Tension at four or above produces instructions to bypass normal physics, warp geometry, and spawn impossible entities. Meanwhile the accepted `suggested_tension` contract permits values from zero to one hundred, and the reducer carries them directly. The ordinary canonical snapshot also omits coherence, allowing a default to stand in for the live value.

Diagnostic calls confirmed that tension values 4, 5, 25, 50, and 100 all select ONTOLOGICAL_SHEAR. Server reconciliation restricts some unsupported structured transitions, but can leave the generated prose unchanged. Structured containment alone therefore does not demonstrate scenario-faithful narration.

## Work

1. Inventory the actual authored sources of physical possibility: Blueprint rules, authority/capability contracts, depiction/uncertainty instructions, and accepted runtime changes. Identify their precedence in the real prompt. Do not create a second independently authored rule system just to repair the matrix.
2. Remove universal tension/coherence grants of supernatural permission. Pressure may influence urgency, threat, sensory emphasis, and pacing within the active scenario's boundaries. Authored supernatural capabilities must remain usable within their specific scope; a permitted anomaly is not permission for every anomaly.
3. Preserve deliberate uncertainty. Distinguish an uncertain perception from an accepted physical change; neither a high score nor a vivid sentence should settle an authored ambiguity automatically. Missing physical-policy data must not turn dramatic pressure into unlimited authority.
4. Reconcile the tension/coherence value domains and actual consumers. Document units/ranges and boundary mappings, using the current canonical contract where feasible. Inspect prompt instructions, reducer assignments, snapshot capture, Retake, and persistence where relevant. Do not introduce a new pacing or decay system to fix a scale mismatch.
5. Keep canonical topology/capability validation independent of the prose directive. Inspect any response reconciliation that rejects structured changes while retaining contradictory narration, and address the demonstrated inconsistency through the existing admission/failure boundary. Do not promise a complete semantic proof of arbitrary prose.

Primary owners: `src/core/matrix/physicsMatrix.ts`, `src/lib/ratificationPipeline.ts`, `src/lib/buildEngineTurnContext.ts`, `server/routes/turn.ts`, turn/snapshot contracts, and affected reducer/snapshot owners.

## Acceptance checks

- Construct actual production requests for grounded human horror at low and high tension. No global directive grants impossible geometry, entities, or capabilities at either setting.
- Use authored supernatural permissions at low and high tension and verify both an allowed manifestation and an out-of-scope manifestation. Pressure neither creates the permission nor removes an authored capability. Existing structured restrictions still apply.
- Use an authored uncertainty scenario; prompt construction preserves uncertainty and does not turn perception into canonical proof.
- Test the chosen tension/coherence domains at boundaries and through state capture, publication, Retake, and reload when changed. No consumer silently interprets a different scale.
- With deterministic responses, verify that an unsupported structured change cannot publish and that the demonstrated contradictory-prose case follows the defined admission behavior.

Focused families: existing matrix tests if present, direct matrix regressions as needed, `src/lib/ratificationPipeline.test.ts`, `server/routes/turn.test.ts`, `server/routes/turn.horrorGrammar1.test.ts`, and affected store/Retake tests.

Prepare short play-review cases for grounded high-pressure horror, scoped supernatural horror, and deliberate uncertainty. Deterministic checks prove construction and state behavior; Justin's review assesses the resulting prose. Record those as separate acceptance items and leave unperformed play review pending. Next: [Packet 10](10-Fictional-Frame-Handling.md).
