# The Terror Machine — Development Roadmap

This is the project's engineering ledger: the current baseline, known non-acceptances, sequencing rules, and the evidence required before work is called complete.

It is intentionally more exact than the [Technical (Public) Roadmap](./ROADMAP.md). It does not promise dates.

## Status language

- **Landed** — present on the live line and protected by the relevant verification boundary.
- **Live, under review** — implemented work is available on the live line, but combined inspection or acceptance evidence is incomplete.
- **Sequenced** — designed work with an explicit dependency order; it is not yet accepted implementation.
- **Planned** — a direction that should not be mistaken for a current contract.

A focused test proves its named behavior. It does not, by itself, close an integrated feature, a production type gate, or a human-facing authoring contract.

## Current baseline

### Landed

- Atomic turn pipeline: snapshot, model generation, ratification, one commit or fail-closed result, retake, and telemetry.
- Canonical topology and intent-bound expansion at an unmapped boundary.
- Role-aware participation for Protagonist, Antagonist, and Director, including explicit authority and limits for antagonist play.
- Blueprint and Haunted House / Ad-Lib Induction paths converging on shared Engine contracts.
- Canonical consequences, cast presence and continuity, stance, relationships, bounded character memory, and Phase 3H.5C World Memory.
- Bounded World Memory projection with deterministic identity, scope, acceptance, canonical commit, and export evidence.

### Live, under review

#### Phase 3H.5D — Explicit Player-Character Binding

The live line can bind an exact selected cast ID, and human telemetry demonstrates selection of a non-first eligible character. This phase is not accepted until the production type gate is clean and setup, initialization, turn context, prompts, ratification, receipts, retake, and real-route persistence tests cover the same canonical identity end to end.

#### Scenario authority enforcement

Adversarial telemetry has shown that an Authority Contract can appear in prompts while a rendered outcome exceeds the actor’s granted reach. That is not enforcement. Causal authority must be adjudicated before an out-of-contract consequence, durable memory item, or receipt can become canonical.

#### Provider-refusal containment

An upstream refusal must be contained as a first-class Engine result. Refusal text must never be attributed to player input, treated as an ordinary narrative turn, or allowed to mutate canonical state.

#### Forge remediation: 02A–02C

The first three micro-packets are live but have not yet received a combined code-and-behavior review:

| Packet | Live change | Remaining acceptance question |
|---|---|---|
| **02A — Candidate Decisions** | Candidate-review controls now use binary accepted/rejected decisions while review state remains staged. | Verify the complete candidate-application boundary remains deterministic and cannot hide a direct draft mutation. |
| **02B — Architect Response Isolation** | Architect ambiguity responses are validated and identity-matched before they can affect the authoring conversation. | Verify the real UI, store, and server handoff reject malformed or mismatched responses without stranding the queue. |
| **02C — Retake Identity** | Checkpoint restore validates session and Blueprint identity strictly. | Verify the real retake lifecycle preserves intended same-session behavior while rejecting incomplete or cross-session state. |

Do not describe the Forge remediation as complete until its remaining source baseline, resolution, Depiction Contract, and export slices have landed and the integrated flow has been reviewed.

## Forge remediation sequence

The Forge work is deliberately decomposed into narrow construction packets. Each packet owns one observable boundary; a later packet may rely only on behavior established by earlier accepted packets.

### 03A — Architect server protocol

Replace loose Architect request/response handling with a strict discriminated contract.

Required outcomes:

- typed request kinds for general messages, ambiguity resolution, and Depiction Contract generation;
- typed response kinds for ordinary messages, follow-up questions, resolution proposals, and Depiction Contract proposals;
- exact source and ambiguity identity correlation;
- request context containing only the schema-backed current draft, accepted baseline decisions, active ambiguity, and relevant conversation state;
- no Markdown-JSON heuristic path, unknown context arrays, or generic fabricated “success” proposal when the provider response is incomplete;
- fail-closed validation that leaves authoring state untouched.

### 03B — Resolution transaction

Make an accepted ambiguity resolution a canonical, atomic authoring operation.

Required outcomes:

- resolution patches target schema-backed fields only;
- missing target IDs, invalid field paths, or conflicting patches fail the transaction rather than silently no-op;
- accepted decision, patch application, provenance, and revision change commit together;
- repeated or duplicate patch effects are deterministic;
- character facts persist into the canonical Blueprint rather than an undeclared property that a later parser discards.

### 04A — Baseline revision and proposal state

Give staged authoring work durable identity and freshness rules.

Required outcomes:

- a source-baseline revision distinct from the draft revision;
- persisted pending Depiction Contract proposal state;
- hydration that preserves valid pending state rather than clearing it;
- explicit invalidation when the source baseline, accepted resolutions, or relevant draft state makes a pending proposal stale;
- readiness state that can report candidate totals, ambiguity totals, contextual-discretion decisions, and proposal freshness.

### 04B — Depiction generation protocol

Make Depiction Contract generation reachable, contextual, and safe.

Required outcomes:

- a dedicated Architect request triggered from authoring;
- the contract prompt receives accepted evidence, accepted ambiguity resolutions, preserved uncertainty, the current draft, and any current contract;
- the response is a staged proposal with rationale and revision metadata;
- incomplete provider output fails visibly; it is never replaced with generic horror prose;
- the proposal describes the Blueprint’s dramatic register, directness, aftermath, ambiguity handling, and optional special boundaries.

### 04C — Depiction Contract panel lifecycle

Complete the creator-facing proposal and authoring surface.

Required outcomes:

- a Generate or Refresh control that reaches the protocol in 04B;
- multi-line authoring fields with visible character counts and enforced limits;
- a visible pending-proposal review surface with accept and dismiss;
- manual edits remain possible;
- a stale proposal cannot overwrite newer source or draft decisions;
- accepted changes update the authored contract and the appropriate revision exactly once.

### 05 — Evidence drawer

Make source evidence inspectable without dominating the review ledger.

Required outcomes:

- candidates show a compact evidence affordance by default;
- detailed excerpts open in a focused, accessible in-app drawer or modal;
- source attribution and candidate identity remain clear;
- review controls do not move or change meaning when evidence is opened.

### 06A — Export artifact contract

Separate review from serialization.

Required outcomes:

- a normalized, immutable prepared export artifact is captured for one specific draft revision;
- the artifact is invalidated by a subsequent relevant authoring change;
- export never promises that a fresh compilation is the exact state the creator reviewed;
- the artifact preserves required source and provenance information without leaking Forge-only UI state into Blueprint JSON.

### 06B — Export review snapshot

Make the pre-flight screen a real readiness gate.

Required outcomes:

- the review displays structural state, Depiction Contract state, source candidate totals, ambiguity status, contextual discretion count, and artifact freshness;
- unresolved or awaiting source work and accepted-but-unapplied candidate work block export;
- the download/copy actions use the reviewed revision-bound artifact;
- stale state is shown as stale and requires a new review;
- field-addressable failures take the creator to the relevant authoring location.

### 07 — Stabilization and integrated acceptance

This is the sole broad project gate for the Forge remediation sequence.

Required outcomes:

- review the final changed-file list against the packet sequence;
- run the full Vitest suite, TypeScript check, full lint, production build, and diff check;
- repair only regressions caused by the accepted Forge work;
- do not use the broad gate to introduce unrelated runtime or test-hygiene changes;
- verify the actual combined path: source evidence → staged candidates → Architect ambiguity conversation → accepted/preserved decision → Depiction Contract proposal → reviewed export artifact.

## Work after the Forge sequence

### Enforce authored participation and treatment at the Engine boundary

The Engine must use an accepted Blueprint treatment contract as a narrative-framing assumption while retaining deterministic ownership of causality and canon.

Acceptance requires:

- authority adjudication before prose generation and before any canonical consequence, character state, or durable memory commits;
- a thought-, perception-, or motivation-only antagonist never receiving ratified direct physical reach unless the Authority Contract expressly grants it;
- a structured treatment receipt recording direct depiction, abstraction/aftermath, or a refusal to render;
- decisions derived from the Blueprint contract, not a global runtime intensity toggle;
- provider refusal represented as a distinct Engine event, never as player input;
- tests for authority denial, permitted direct adult horror, scenario-authored abstraction, provider refusal, retake, and unchanged canonical state on a blocked result.

Provider-level non-negotiable constraints remain external to the Blueprint contract. They must be represented honestly without pretending that the player authored the refusal.

### Autopilot identity and provenance

Autopilot must receive the selected character’s canonical context, use the same identity-bearing path as a human session, stop or retry deliberately after failure, and label generated input in telemetry.

### Durable continuity, Voice, campaign, and provider seams

- Extend character and World Memory through the full turn lifecycle with scoped, inspectable handoff.
- Keep Voice observations read-only and evidence-labelled.
- Define explicit multi-Blueprint campaign handoff only after continuity is stable.
- Preserve a provider-replaceable Engine boundary without letting provider behavior bypass the established contracts.

### Generative horror grammar

Research pressure, pacing, fear, revelation, and recovery as generative principles rather than shipping a shelf of preset genre scenarios.

## Engineering rules that do not bend

- Blueprint data is input, never a hidden runtime instruction. Production code and implementation packets remain scenario-agnostic.
- The model proposes; deterministic application code decides what becomes true.
- Failed validation preserves canonical state and emits useful evidence.
- Required schemas become stricter. Stale fixtures are repaired at their source.
- No "any", suppression comments, unsafe cast chains, permissive defaults, or fallback receipts used to make a gate appear green.
- When a contract crosses a UI or route boundary, tests must exercise that real boundary; helper-only tests are insufficient.
- Human review remains part of acceptance for generated Blueprints, exported telemetry, and changes affecting player identity or authorial intent.
- A treatment contract may shape framing and directness. It cannot grant causal authority or override provider-level constraints.

## Verification discipline

### Bounded construction packets

For packets 02A through 06B:

1. implement the requested behavior before testing;
2. run one named focused Vitest proof;
3. make at most one corrective rerun of that same proof;
4. lint only the files changed by that packet;
5. stop and report unrelated failures rather than repairing them inside the packet.

Do **not** run the full suite, global TypeScript check, full lint, or production build for each micro-packet. Those broad gates consume disproportionate agent context and turn a small construction task into unrelated test repair.

### Broad stabilization

Packet 07 runs the project-wide safety gate once the earlier slices have been reviewed as a coherent whole:

- full Vitest suite;
- TypeScript check;
- full lint;
- production build;
- diff check.

A passing focused test does not erase a failing production type gate. A passing broad gate does not prove the requested behavior exists. Both kinds of evidence are required at the appropriate stage.

## Relationship to the public technical roadmap

The [Technical (Public) Roadmap](./ROADMAP.md) explains the machine’s direction for a technically curious visitor. This document records exact sequencing and acceptance discipline. Update both when current behavior or the active work boundary materially changes.
