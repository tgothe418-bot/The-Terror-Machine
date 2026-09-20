# The Terror Machine — Technical Roadmap

This is the public technical record for **The Terror Machine**: an open-source, neuro-symbolic runtime for multi-turn interactive horror.

For the user guide and quickstart, see the [README](./README.md). For deep engineering details, see the [Development Roadmap](./DEVELOPMENT-ROADMAP.md).

---

## Architecture & Philosophy

The central thesis of The Terror Machine is that **the model proposes, and the machine decides**.

Standard LLM generative sessions degrade due to spatial amnesia, unearned adjective escalation, and causal hallucinations. The Terror Machine decouples ground-truth state from token generation:

1. **Deterministic State Citadel**: Topologies, inventories, psychological states, and somatic trauma are preserved across turns in structured ledgers and dual-store IndexedDB.
2. **Causal Ratification**: Generative model outputs are strictly constrained to JSON schemas and validated against world rules before any state mutation occurs.
3. **Fail-Closed Guarantees**: Invalid proposals, model refusals, or empty generations fail safely without corrupting world state or manufacturing synthetic player intent.

---

## Landed Capabilities

### 1. Horror Grammar 1 (HG1): Foundational Causal Continuity
- **Atomic 5-Stage Turn Lifecycle**: Snapshot &rarr; Constrained Generation &rarr; Causal Ratification &rarr; Atomic Commit / Fail-Close &rarr; CRT Presentation.
- **Dual-Store IndexedDB Persistence**: Monotonic sequence tracking with cross-store coherence verification and crash recovery.
- **Zero-Leak Monotonic Retake**: Roll back simulation state to preceding turn checkpoints with zero orphaned state.
- **Perspective-Neutral Authoring**: Compile and export Blueprints without permanent user character or starting node lock-in; resolved dynamically at Engine setup.
- **Autopilot Parity**: Headless soak-testing runs through the identical validation and ratification pipeline as live human play.

### 2. Horror Grammar 2 (HG2) Series 1: Pacing Governor & Stakes
- **Autonomous Pacing Governor**: Manages undulating cadence cycles (`RESPITE_AFTERMATH` &rarr; `SIMMERING_DREAD` &rarr; `MOUNTING_COMPLICATION` &rarr; `KINETIC_RUPTURE`).
- **Impending Environmental Clocks**: Drives countdown timers with threshold manifestation omens across `TIME` and `EVENT` advance modes.
- **Situated Diegetic Instruments**: In-world apparatus readouts (barometers, radiation counters, pressure dials) that reflect clock progression without arbitrary meta-meters.
- **Psychological Stakes & Breaking Points**: Authored character breaking points with deterministic lift conditions under acute stress.
- **Causal Milestone Gates**: Macro-phase progression governed by explicit causal triggers (`DISCOVERY`, `AUTHORED_TRIGGER`).

### 3. Pure-Text Acoustic Subsystem & Literary Vocalization
- **First-Class Vocalization Categories**: Spoken dialogue, internal monologue (introspective thought), muttered soliloquy (*sotto voce*), radio/intercom transmissions, and acoustic bleed.
- **Zero-Audio Hardware Dependencies**: Pure literary text and CRT typography; zero Web Audio or synthesizer dependencies.
- **Topological Adjacency & Epistemic Boundaries**: Fail-closed verification of offstage audio sources against spatial adjacency and structural links (ducts, vents, observation ports).
- **Center Stage Visual Framing**: Typographic distinctions for introspection (indigo italic), soliloquies (dashed amber), intercom/bleed (phosphor-cyan), and spoken speech (candle-amber).
- **Atmospheric Opening Scene (`SYSTEM_INIT`)**: Establishes initial sensory grounding; auto-remediates Turn 0 solitary speech to monologue or soliloquy, eliminating solitary-room contract errors.

### 4. Canonical Scenario Triptych
- **The Black Iron Mortuary**: Subterranean bio-containment facility featuring Entity-41.
- **The Silver Rest Lodge**: 1991 alpine retreat social horror with 8 cast members across 3 role categories, 3 clocks, and 4 milestone gates.
- **The Refinement**: High-stakes psychological ordeal inspired by the New French Extreme; 8 chambers, 8 cast members with granular psychological stakes, and extreme content scale handling.

### 5. Multi-Provider Runtime Calibration
- **Model-Agnostic Execution**: Independent calibration of Engine, Forge, Voice, and Autopilot across providers.
- **Supported Providers**: Local OpenAI-compatible endpoints (LM Studio, Ollama, llama.cpp), Google Gemini, OpenAI, and Z.ai (GLM).
- **Verified Local Inference**: 80-turn multi-role headless test batteries completed on local Gemma 4 26B QAT with 100% schema accuracy and zero cloud token cost.

---

## Active Horizons & Next Priorities

### Phase 1: Interactive Browser Play Review
- **Focus**: Real-time evaluation of pacing cycles, acoustic bleed, and role-specific authority in live browser sessions.
- **Scope**: Multi-turn manual play across *The Black Iron Mortuary*, *The Silver Rest Lodge*, and *The Refinement*.
- **Validation**: Verify UX latency, CRT narrative framing readability, and Retake responsiveness under live operator inputs.

### Phase 2: Horror Grammar 2 (Series 2) — Revelation Staging & Tension Decay
- **Focus**: Thematic lore unpeeling and non-linear psychological dissipation.
- **Scope**:
  - Epistemic discovery receipts and structured revelation cadence.
  - Tension-decay modeling: simulating long-term character attrition, exhaustion, and atmospheric dissipation during sustained respite periods.
  - Bounded clue networks connecting physical evidence to milestone unlocks.

### Phase 3: Inherited Gate Debt Remediation
- **Focus**: Codebase hygiene and strict type-safety across legacy modules.
- **Scope**:
  - Resolve inherited 63 `tsc` compile errors and 177 `eslint` warnings in a dedicated cleanup packet.
  - Clean up legacy test fixtures, store predicates, and draft baseline reconciliation.
  - Zero modifications to runtime simulation contracts or landed HG1/HG2 features.

### Phase 4: Multi-Node AI Traversal & Cohort Intelligence
- **Focus**: Autonomous prey and antagonist mobility across topological graphs.
- **Scope**:
  - Multi-chamber pathfinding for autonomous cast cohorts based on behavioral vectors (`ADAPTIVE`, `INSURGENT`, `PANIC`).
  - Spatial herding and dynamic environmental barricades.
  - Offstage encounter staging triggered by impending clocks.

### Phase 5: Multi-Blueprint Campaign Continuity
- **Focus**: Inter-scenario progression without monolithic state explosion.
- **Scope**:
  - Scoped state carryover between connected blueprints (survivor trauma, carried artifacts, relational memory).
  - Clean export/import schema for multi-scenario anthologies.

---

## Architectural Invariants

Regardless of model capabilities or scenario themes, these laws remain non-negotiable:

- **The Application Owns Canon**: The generative model produces prose proposals; the runtime ratifies reality.
- **No Unvalidated Ingress**: Every token must satisfy schema and causal constraints before mutating state.
- **Topology is Spatial, Not Metaphorical**: Traversals require authenticated edges on the spatial graph.
- **No Hidden Mechanics or Gamified Meters**: No arbitrary health points or fear bars; tension emerges from physical constraints, situated clocks, and irreversible consequences.
- **The User Owns Intent**: Timeouts, refusals, and errors fail closed with forensic receipts—the system never synthesizes player speech or decisions.
- **Consequences are Permanent**: State changes persist across turns, sessions, and reloads until causally reversed within the world.

---

## Document Index

- [README](./README.md) &mdash; Project overview, architectural pillars, scenario briefs, and quickstart.
- [Development Roadmap](./DEVELOPMENT-ROADMAP.md) &mdash; Granular engineering milestones, packet histories, and proof suites.
- [MIT License](./LICENSE) &mdash; Terms of open-source distribution.
