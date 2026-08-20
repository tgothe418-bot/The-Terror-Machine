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

### 2. Add Forge source-gap resolution

Use the existing Architect console input as the conversational surface. Do not add a parallel answer widget unless the existing surface proves insufficient.

The Forge flow should:

1. maintain a compact queue of unresolved questions, showing only a small active set at a time;
2. accept a natural-language answer through the existing Architect input;
3. permit the Architect to ask a follow-up when the answer is underspecified;
4. turn the exchange into a reviewable proposal rather than silently editing the draft;
5. route the proposal through the existing inspect/accept/reject path;
6. preserve a deliberate “keep this ambiguous” decision;
7. label provenance as **evidence**, **inference**, **authoring addition**, or **preserved ambiguity**;
8. keep accepted changes visible in the draft before export and keep unresolved questions visible when they remain unresolved.

Acceptance requires schema coverage, UI coverage, proposal isolation, accept/reject behavior, follow-up behavior, and an export test proving that provenance survives without leaking scenario-specific implementation assumptions.

### 3. Make Autopilot identity-safe

The Autopilot path must receive the selected character's canonical context, not only an opaque ID. It must use the same identity-bearing turn path as a human session, stop or retry deliberately after a failed turn, and record input provenance so exported telemetry can distinguish human actions from generated test actions.

### 4. Finish durable continuity

Connect character and World Memory to the full turn lifecycle, keeping prompt projection bounded and receipts canonical. Every durable fact needs an inspectable source, scope, and acceptance decision. Campaign handoff must remain explicit and scoped rather than becoming an implicit global ledger.

### 5. Harden the Voice boundary

Keep Voice observations read-only and separate from simulation canon. Add evidence-labelled context, snapshot/export parity, and clear handling for Forge drafts, Engine sessions, outside research, and ordinary project conversation.

### 6. Prepare campaign and provider seams

Once continuity is stable, define multi-Blueprint state handoff and a provider-neutral model boundary. Neither should be allowed to bypass the existing Engine contracts.

## Non-negotiable engineering rules

- Blueprint data is input, never a hidden runtime instruction. Production code and implementation packets remain scenario-agnostic.
- The model proposes; deterministic application code decides what becomes true.
- Failed validation must preserve canonical state and emit useful evidence.
- Schemas should become stricter when a contract is required; stale fixtures are repaired at their source.
- No `any`, unsafe type-cast chains, suppression comments, permissive defaults, or fallback receipts to make a gate appear green.
- Tests should exercise the real route or UI boundary when the contract crosses that boundary; helper-only tests are not sufficient evidence.
- Human review remains part of acceptance for generated Blueprints, exported telemetry, and any change that affects player identity or authorial intent.

## Verification gates

Every implementation packet should name its focused tests and run, at minimum, the full Vitest suite, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check`. A milestone is accepted only when the gates are green and the changed-file list is complete.

The development roadmap records verification debt openly. A passing focused suite does not erase a failing production type gate or an untested real boundary.

## Relationship to the public roadmap

The [public roadmap](./ROADMAP.md) describes the direction in language suitable for visitors. This document records implementation order and acceptance discipline; update both when the project's actual state changes.
