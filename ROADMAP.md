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

### 5. Universal Multi-Provider Validation & Concurrency Isolation
- **Fail-Closed Roster Normalization**: Universal `CastNormalizationContext` enforced across Google Gemini, OpenAI, Z.ai GLM, Hemmingway.io, and Local OpenAI-compatible inference servers.
- **Request Concurrency Isolation**: Per-request turn contract instantiation in `server/routes/turn.ts` completely eliminating crosstalk under concurrent requests.
- **Voice Telemetry Grounding**: Live engine simulation state injection (`[LIVE SIMULATION TELEMETRY - ORACLE OF RECORDS]`) into The Voice companion.

### 6. Greenfield SSE Streaming Transport & Live Turn Presentation
- **High-Performance EventStream API (`server/utils/sse.ts`)**: Monotonic event IDs, automated 15-second keepalive heartbeats, and client disconnect handling.
- **Live Ephemeral Streaming**: Dedicated `/turn-stream` and `/stream` endpoints with real-time word-by-word CRT narrative rendering without corrupting atomic causal ratification commits.

### 7. Unified Forensic Sweep Engine & Review Preservation
- **Sentence-Snapped Window Planner (`server/ai/windowPlanner.ts`)**: Token budget calculation, regex sentence snapping (`[.!?]`), and single-window `W1/1` handling for short sources.
- **Server-Side Source Retention & Job Ledger (`server/ai/sweepOrchestrator.ts`)**: Pinned server source registry preventing TTL eviction during sweeps; multi-lens induction (`COMBINED`, `TOPOLOGY_ONLY`, `CAST_ONLY`, `ATMOSPHERE_RULES`, `EPISTEMIC_UNKNOWNS`).
- **Review-Safe Live Merge (`src/store/useForgeStore.ts`)**: Merges newly discovered candidate evidence while preserving author review decisions (`accepted`/`rejected`/`staged`) and edit buffers.

### 8. Universal Navigation Shell & Parameterized Proof Run Batteries
- **Persistent AI Calibration Overlay (`src/App.tsx`)**: Global pinned top-left navigation cogwheel opening calibration modal without unmounting or mutating active Engine sessions or Forge drafts.
- **Parameterized HG2 Benchmark Suite (`scripts/run_hg2_40turn_benchmark.ts`)**: Configurable via `--turns=N`, `--scenario=ID`, and `--seat=ROLE`. Headless proof runs verified 20/20 and 40/40 turns on local Gemma 4 26B QAT with 100% gate pass rates (committed acts, NPC proposals $\ge 1/3$ turns, causal phase progression, zero 502s).

### 9. HG2 Series 2 — Opposition Cohort Autonomy (Initial Core Boundary)
- **Seat-Based Membership & Lifecycle**: Authored, recruited, and witnessed joining paths; lifecycle changes as evaluated transitions (never direct behavior mutations); explicit `DORMANT` status at zero members with institutional-memory preservation.
- **Deterministic Behavior Selection**: Two-layer selection (environment gating &rarr; executability filtering &rarr; personality affinity scoring &times; 0.4 same-verb recency fatigue). No dice, seeded or otherwise; no Director verbs.
- **Diegetic Cognition**: Hypothesis weights on authored blueprint IDs with provenance; event-driven, deduplicated evidence ingestion; dissonance accumulator driving skepticism erosion.
- **Phases as Discovery Pressure**: `ONSET` &rarr; `DISCOVERY` &rarr; `CONFIRMATION` &rarr; `CONFRONTATION` as weight aggregates with a Confrontation ratchet; seat-holder phase anchoring with disruption shock and delayed succession on loss.
- **Initial Verb Boundary**: `INVESTIGATE` and `SHARE` proven end-to-end — topology-gated sharing (no telepathy), player-perceivable traces separated from ingestible evidence, hidden internal receipts, and full retake restoration of cognition, membership, durations, receipts, traces, and phase state.
- **Bounded Fictional-Time Ticks**: No neutral turns; at most one completed and one initiated behavior per member per player turn.

### 10. Villain-Protagonist Model & Villain-Always Invariant
- **Villain-Protagonist Seats**: In scenarios where the protagonist *is* the villain, the protagonist seat binds the villain and the antagonist seat rebinds to the opposition investigating them; pressure inverts into external *Discovery* (investigation-as-pursuit) and internal *Compulsion* (self-sourced) families.
- **Villain-Always Invariant**: Every Forge scenario cast must contain at least one `VILLAIN` — enforced at compile time (`validateForgeDraft`), with dual extraction of named/speaking antagonists as both cast villain and antagonist profile, plus deterministic villain backfill from the antagonist profile during repair.

### 11. Deterministic Death Mechanics & Live Turn-Pipeline Wiring
- **Wound Ledger (`src/lib/deathEngine.ts`)**: Mechanism, location, severity ordinal, timeline, treatability, and intent/valence facts recorded per character. Timeline clamp (`0` minutes only for `unsurvivable`); minute-to-second conversion on expiry; late treatment never resurrects an expired wound; repeated mechanism + location merges into an existing open wound.
- **Live Turn-Commit Pass (`processTurnDeathPass`)**: Wired into the reducer's `TURN_COMMITTED` event. Ingests `wound_facts` with Machine-known circumstance facts (topology, fictional time, witnesses), validates treatment proposals (wound exists, still open, treater co-located), evaluates survivability for every character with open wounds, and applies `declareDeath` verdicts — corpse evidence nodes, cohort disruption shock, cast status updates.
- **Declare/Narrate Split**: The deterministic machine declares death; the model narrates the already-committed fact under a prompt contract that forbids pre-verdict death declarations. Narration failure never rolls back a declared death.
- **Required `deathContract`**: Every Forge blueprint must carry a death contract — `powerBudget` and `deathMetaphysics` always, `seatSuccession` additionally for cohort scenarios. Compilation fails with a clear message when absent; a mundane-default backfill exists strictly for pre-contract legacy blueprints.
- **Sacrifice as Unguaranteed Gamble**: `[SACRIFICE victim:<characterId>]` transfers open wounds from victim to intervener with explicit victim binding; both characters are evaluated, and both may die.
- **POV Death & Chronicle**: POV death transitions the run to `TERMINATED` and presents a generated Chronicle (copy/download); retake unwinds to the exact pre-turn checkpoint — death never seals the retake window.

### 12. Horror Grammar 3 (HG3) — Self-Preservation & Fear Dynamics
- **Salience Dynamics & Decay Engine**: Deterministic character salience ledger tracking acute fear (`spike`), background terror (`dread`), and threat vectors (`life`, `freedom`, `identity`) with exponential decay and residue accumulation; threat-specific weight scaling; prey-mode transition with hysteresis; 4-band somatic state derivation with deterministic physiological tokens (`[SOMATIC STATE: ...]`).
- **Cohort Behavior Engine Integration**: Fear-salience integration in behavior selection (`scoreCandidateBehavior`); threat-specific behavior reweighting (`FLEE`, `HIDE`, `SUBMIT`, `CONCEAL`, `DENY`); fearlessness dampening and narrative release valves; submit/capitulation execution under Band 4 terror.
- **Authoring, Forge & Autopilot Integration**: Mandatory `fearContract` on `ForgeDraft` with compile-time validation (§13); legacy backfill in `normalizeBlueprint`; extraction prompts in `extractionContract.ts` and `architect.ts` eliciting fearlessness, threat weights, release valves, villain gaze authority, and submit responses; Autopilot somatic state and felt wound knowledge injection; Player Sovereignty verification preserving human player choice without fear reweighting.

---

## Active Horizons & Next Priorities

### Phase 1: Interactive Browser Play Review
- **Focus**: Real-time evaluation of pacing cycles, acoustic bleed, and role-specific authority in live browser sessions.
- **Scope**: Multi-turn manual play across *The Black Iron Mortuary*, *The Silver Rest Lodge*, and *The Refinement*.
- **Validation**: Verify UX latency, CRT narrative framing readability, and Retake responsiveness under live operator inputs.

### Phase 2: Horror Grammar 2 (Series 2) — Opposition Cohort Autonomy & Reaction Cycles
- **Focus**: The opposition as a living, investigating cohort — every cohort action explainable from what the acting character knew.
- **Landed**: Initial core boundary — canonical cohort state, cognition/evidence ingestion, membership lifecycle, bounded ticks, deterministic selection, `INVESTIGATE` + `SHARE` verbs, traces/receipts, and retake restoration.
- **Scope**:
  - Remaining 13 behavior verbs from the 15-verb matrix, each with per-verb executable contracts.
  - Playtest tuning of selection weights, fatigue factors, phase thresholds, and tick bounds.
  - Cohort coordination behaviors (herding, staging) and deeper suspicion/dissonance dynamics.

### Phase 3: Inherited Gate Debt Remediation
- **Focus**: Codebase hygiene and strict type-safety across legacy modules.
- **Scope**:
  - Resolve inherited 78 `tsc` compile errors and 177 `eslint` warnings in a dedicated cleanup packet.
  - Clean up legacy test fixtures, store predicates, and draft baseline reconciliation.
  - Zero modifications to runtime simulation contracts or landed HG1/HG2 features.

### Phase 4: Multi-Node AI Traversal & Cohort Intelligence
- **Focus**: Autonomous cast mobility and offstage staging beyond the cohort core boundary.
- **Scope**:
  - Multi-chamber pathfinding for autonomous cast cohorts based on behavioral vectors (`ADAPTIVE`, `INSURGENT`, `PANIC`).
  - Spatial herding and dynamic environmental barricades.
  - Offstage encounter staging triggered by impending clocks.
- **Note**: Core cohort autonomy (membership, cognition, deterministic selection, `INVESTIGATE`/`SHARE`) has landed under HG2 Series 2; this phase covers mobility and staging built on top of it.

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
