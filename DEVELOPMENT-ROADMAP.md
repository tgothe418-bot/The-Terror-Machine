# The Terror Machine — Development Roadmap

This is the project's working roadmap: an operating manual for sequencing changes, preserving boundaries, and deciding when a milestone is actually accepted. It is intentionally more concrete than the public roadmap and does not promise dates.

## Status legend

- **Landed** — present in the live line and protected by the relevant verification gates.
- **Under review** — observable behavior exists, but a type, test, boundary, or acceptance issue remains.
- **Planned** — designed work that has not yet been accepted into the runtime.

## Current baseline

### Landed

- Core turn pipeline: snapshot, model generation, ratification, single commit or fail-closed result, retake, and telemetry.
- Canonical topology and intent-bound expansion at an unmapped boundary.
- Role-aware participation for Protagonist, Antagonist, and Director, including explicit authority and limits for antagonist play.
- Blueprint and Haunted House Induction entry paths converging on the same Engine contracts.
- Canonical consequences, cast presence/continuity, stance, relationships, and bounded character-memory structures.
- Phase 3H.5C World Memory: bounded global/current-node prompt projection, required proposal/receipt contracts, fail-closed validation, deterministic commit, and export evidence.

### Under review

- **Phase 3H.5D — Explicit Player-Character Binding.** The current review line can bind an exact selected cast ID, and human telemetry demonstrates a non-first eligible selection. The milestone is not accepted until the production type gate is clean and the setup, initialization, ratification, retake, and real-route persistence tests cover the same identity end to end.

- **Scenario-bound authority enforcement.** Adversarial human telemetry demonstrates that an authority contract can be carried into prompts and still be reported as within contract when the rendered outcome exceeds the actor's granted reach. This is not accepted behavior. Causal authority must be adjudicated by the Engine before consequences, durable memory, or receipts can make an out-of-contract act canonical.

- **Provider-refusal containment.** Current telemetry shows an upstream refusal can be recorded as player input and then treated as a system turn. Provider behavior must be contained as a first-class Engine event; refusal text must never be attributed to the player or silently alter canon.

The 3H.5D review must not be described as complete merely because focused tests pass. A later phase may not conceal a type or contract failure by weakening a schema, adding a type escape, or changing the canonical ownership boundary.

## Next work packages

### 1. Close 3H.5D

Acceptance requires:

- one canonical `player_character_id` selected from the eligible cast;
- the stored ID surviving setup, initialization, turn context, prompts, ratification, receipts, retake, and telemetry;
- role eligibility and seat availability enforced without relying on cast order;
- human and automated runs exercising both first and non-first eligible selections;
- focused tests plus the full suite, TypeScript, lint, build, and diff checks all green;
- no Blueprint names, cast assumptions, or scenario literals in production instructions.

### 2. Extend Forge source-gap resolution into Blueprint treatment contracts

Use the existing Architect console input as the conversational surface. Do not add a parallel answer widget unless the existing surface proves insufficient.

The Forge flow should:

1. maintain a compact queue of unresolved questions, showing only a small active set at a time;
2. accept a natural-language answer through the existing Architect input;
3. permit the Architect to ask a follow-up when the answer is underspecified;
4. turn the exchange into a reviewable proposal rather than silently editing the draft;
5. route the proposal through the existing inspect/accept/reject path;
6. preserve a deliberate “keep this ambiguous” decision;
7. label provenance as **evidence**, **inference**, **authoring addition**, or **preserved ambiguity**;
8. keep accepted changes visible in the draft before export and keep unresolved questions visible when they remain unresolved;
9. derive a reviewable, Blueprint-specific treatment contract from source evidence and user authoring decisions, rather than presenting a global runtime intensity setting;
10. capture scenario-specific assumptions about dramatic register, permitted directness, use of implication or aftermath, and any special depiction boundaries;
11. ask through the Architect queue only when a treatment decision is materially ambiguous, and allow the user to accept, edit, or preserve that ambiguity;
12. carry the accepted contract through Blueprint export/import with its provenance intact.

Acceptance requires schema coverage, UI coverage, proposal isolation, accept/reject behavior, follow-up behavior, and export tests proving that provenance survives without leaking scenario-specific implementation assumptions. It also requires paired fixtures showing that the same generic causal event can receive different authored treatment directives under two different Blueprint contracts.

### 3. Enforce authored participation and treatment contracts at the Engine boundary

The Engine must use the accepted Blueprint treatment contract as an assumption for narrative framing while retaining deterministic ownership of causality and canon.

Acceptance requires:

- authority adjudication before prose generation and before any canonical consequence, character state, or durable memory can commit;
- a thought-, perception-, or motivation-only antagonist never receiving ratified direct physical reach unless the Authority Contract expressly grants it;
- a structured treatment receipt recording whether the Engine rendered directly, used abstraction/aftermath, or declined to render;
- treatment decisions derived from the Blueprint contract, not a one-size-fits-all runtime toggle;
- a provider refusal contained as a distinct Engine event, never serialized as player input or used as an uninspected narrative turn;
- explicit tests for authority denial, permitted direct adult horror, scenario-authored abstraction, provider refusal containment, retake, and unchanged canonical state on a blocked result;
- human regression review confirming that direct treatment remains effective and abstraction reads as an authored cinematic choice rather than a generic policy interruption.

Provider-level non-negotiable constraints remain external to the Blueprint contract. They must be represented honestly in the Engine's result, without pretending the player authored the refusal.

### 4. Make Autopilot identity-safe

The Autopilot path must receive the selected character's canonical context, not only an opaque ID. It must use the same identity-bearing turn path as a human session, stop or retry deliberately after a failed turn, and record input provenance so exported telemetry can distinguish human actions from generated test actions.

### 5. Finish durable continuity

Connect character and World Memory to the full turn lifecycle, keeping prompt projection bounded and receipts canonical. Every durable fact needs an inspectable source, scope, and acceptance decision. Campaign handoff must remain explicit and scoped rather than becoming an implicit global ledger.

### 6. Harden the Voice boundary

Keep Voice observations read-only and separate from simulation canon. Add evidence-labelled context, snapshot/export parity, and clear handling for Forge drafts, Engine sessions, outside research, and ordinary project conversation.

### 7. Prepare campaign and provider seams

Once continuity is stable, define multi-Blueprint state handoff and a provider-neutral model boundary. Neither should be allowed to bypass the existing Engine contracts.

## Non-negotiable engineering rules

- Blueprint data is input, never a hidden runtime instruction. Production code and implementation packets remain scenario-agnostic.
- The model proposes; deterministic application code decides what becomes true.
- Failed validation must preserve canonical state and emit useful evidence.
- Schemas should become stricter when a contract is required; stale fixtures are repaired at their source.
- No `any`, unsafe type-cast chains, suppression comments, permissive defaults, or fallback receipts to make a gate appear green.
- Tests should exercise the real route or UI boundary when the contract crosses that boundary; helper-only tests are not sufficient evidence.
- Human review remains part of acceptance for generated Blueprints, exported telemetry, and any change that affects player identity or authorial intent.
- A Blueprint’s accepted treatment contract may shape framing and directness, but it cannot grant causal authority or override provider-level non-negotiable constraints.

## Verification gates

Every implementation packet should name its focused tests and run, at minimum, the full Vitest suite, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`. A milestone is accepted only when the gates are green and the changed-file list is complete.

The development roadmap records verification debt openly. A passing focused suite does not erase a failing production type gate or an untested real boundary.

## Relationship to the public roadmap

The [public roadmap](./ROADMAP.md) describes the direction in language suitable for visitors. This document records implementation order and acceptance discipline; update both when the project's actual state changes.
