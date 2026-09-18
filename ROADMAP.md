# The Terror Machine — Technical (Public) Roadmap

This is the public technical record for **The Terror Machine**: what the machine can do, what has been accepted, and what it is being built to do next.

It is directional rather than a release calendar. There are no promised dates, feature quotas, or claims that one green test is the same thing as an accepted milestone.

For the experiential front door, read the [README](./README.md). For the detailed engineering ledger, read the [Development Roadmap](./DEVELOPMENT-ROADMAP.md).

## The machine at present

TTM has a working foundation for bounded horror simulation with runtime provider switching.

A Blueprint or a Haunted House Induction enters the same Engine path. The core turn is snapshotted, interpreted, generated, ratified, committed once or refused without corrupting canonical state. The application—not the language model—owns the places, cast, roles, consequences, receipts, and the state that survives a paragraph. Horror Grammar 1 is fully landed, integrated, and verified across that line; its provider boundary is closed, and full multi-turn continuity, authority validation, durable recovery, and forensic segregation are verified by the master integration suite. Every subsystem—Engine, Forge, Voice, and Autopilot—can be switched between Gemini, OpenAI, and local OpenAI-compatible inference servers through AI Calibration. The contracts define what the machine accepts; the provider supplies the generation.

### Live foundation

- A schema-bound atomic turn path: snapshot → generation → ratification → commit or fail.
- Canonical spatial topology, including deliberate expansion at an unmapped boundary.
- Protagonist, Antagonist, and Director participation, with explicit antagonist authority and limits.
- Blueprint authoring and Haunted House / Ad-Lib Induction entry paths.
- Perspective-neutral Blueprint export with per-character opening placement; the Engine chooses the session perspective and entry location.
- Cast presence, character stance, relationships, bounded character memory, and bounded World Memory.
- Deterministic consequences, receipts, telemetry, Markdown/HTML diagnostics, and retake of the most recent completed turn.
- A shared human/Autopilot response contract: concise creator input is preserved verbatim, one bounded generation is ratified or refused, and safe field-path diagnostics appear in failure receipts and exports.
- Provider-refusal containment at the live generation boundaries: explicit declines and empty responses fail closed, never become player input, and leave canonical state available for retry or Retake.
- Runtime provider switching across Engine, Forge, Voice, and Autopilot through AI Calibration. Gemini, OpenAI, Z.ai (GLM), and local OpenAI-compatible inference servers are supported providers. Each subsystem can target its own provider and model independently.
- Z.ai (GLM) provider integration: the Engine, Forge, Voice, and Autopilot can run on Z.ai GLM models with a user-supplied API key. GLM turns travel the same structured JSON-mode path with the authoritative Zod contract validating every response at ingress, thinking-mode mapped per purpose, and approved-model fallback on provider failure.
- Local model support through any OpenAI-compatible endpoint (LM Studio, llama.cpp, Ollama, or equivalent). No API key required; the machine discovers loaded models at the configured server URL.
- Per-subsystem local model assignment: the Engine, Autopilot, Voice, and Forge can each run a different local model when dedicated assignment is enabled.
- Gemini Free Tier support with resilient backoff, automatic model fallback on rate limits, and AI Calibration for tier and model selection.
- Comprehensive Vocalization & Dialogue Subsystem: Dedicated domain model (`src/types/vocalization.ts`) and pipeline (`src/lib/vocalizationEngine.ts`) supporting spoken dialogue, internal monologue (introspective thought), muttered soliloquies (`sotto voce`), radio/intercom transmissions, and acoustic bleed through observation ports and ductwork.
- Pure-Text Acoustic Soundscape Refinement (Zero Audio Hardware/Synthesizer Dependency): Strictly non-audio literary soundscapes utilizing CRT typography, typographic squelch markers (`> [CHIRP] ... [STATIC]`), shrouded obsidian acoustic bleed styling with chamber provenance (`[ ACOUSTIC BLEED // Name (via node) ]`), and em-dash broken delivery for interrupted speech (`interrupted: true`).
- Fail-Closed Topological Adjacency & Epistemic Boundaries: Adjudicates offstage acoustic sources against adjacent nodes in the spatial graph, auto-remediating single adjacent links and enforcing one-directional epistemic constraints for overheard speech (distant speakers cannot address the player directly or react to unseen actions).
- Interactive Forge Voice & Acoustic Dossiers: Authoring character expression profiles directly in `CastManager.tsx` with free-text cadence & rhythm notes, vocal tells, voice tone, lexicon notes, silence directives, and scenario-agnostic camouflage leak guidance triggering on climax tension. Preserved and verified by net-new compiler tests (`src/lib/forgeCompiler.test.ts`).
- Engine Contract Lockstep & Provider Schema Projection: Parity between Forge authoring and `EngineTurnContext` Zod schemas, with runtime provider JSON schema projection of `interrupted` and `acousticSourceNodeId`.
- Robust Typographic Quote Parsing: Causal feasibility parser supporting straight (`" '`) and curly (`“ ” ‘ ’`) quotes, contraction guards (`don't`, `it's`, `we'll`), speech verb detection, and $\ge 2$-word constraints in `extractConversationalUtterance`.
- Auditory Topology Resolution: Automatically detects co-presence, active telephone/radio lines across multi-turn history, and acoustic architectural links (observation windows, airlocks, vents), auto-remediating off-stage speech through physical mediums instead of throwing 502 contract errors.
- Dynamic Center Stage Typography: Overhauled narrative presentation in `Runtime.tsx` with distinct visual framing: Introspection (indigo italic with `[ INTROSPECTION // Name ]`), Soliloquy (dashed amber with `[ MUTTERED SOTTO VOCE // Name ]`), Intercom/Bleed (CRT cyan with `[ INTERCOM / ACOUSTIC BLEED // Name ]`), and Spoken Dialogue (candle-amber with `[ DIALOGUE // Name ]`).
- Atmospheric Opening Scene Establishment (`SYSTEM_INIT`) & Fail-Safe Invariants: Grounds starting node architecture, sensory textures (lighting, acoustics, scent), and player character posture at the quiet threshold, preventing *in media res* narrative whiplash. Solitary chambers dynamically permit internal monologue and soliloquy while forbidding room dialogue; player speech on Turn 0 is auto-remediated to soliloquy or prose, eradicating the solitary-character Critical Engine Failure.
- Dual-tier dialogue validation and speaker normalization: Automatic speaker ID-to-name mapping (`char-ricky` -> `Ricky Oates`), duplicate speaker prefix stripping in content, and recognized ambient extra whitelisting.
- 1440p Ultrawide (`3440×1440`) Occult Scrying Workstation: Persistent 4-pane layout with 2.5× scaled Fog-of-War `MapSketch` (Austin Osman Spare aesthetic, zero portrait placeholders), pure-text `MortalLedger` tracking active vessels and companion cohorts, and live-docked communion with The Historian.
- Causal Traversal Hardening: Unaccepted movement resolves as `CONSTRAINED / TOPOLOGY_LIMIT` without falsely triggering perceptual fracture hallucination loops.
- Structured-output compatibility on the live turn path, with the supported JSON-schema subset owned at the provider boundary and provider failures returned as structured API errors.
- Hardened Forge extraction and candidate normalization pipeline with rule alias expansion (`unknowns`, `misc`, `notes`, `lore`, `world_rule`, `environmental`) preventing spurious candidate quarantine.
- Four 20-Turn Multi-Role Local Playtest Battery: Headless simulation harness (`scripts/run_four_20turn_battery.ts`) verifying 80/80 total turns on local Gemma 4 26B QAT across Protagonist, Antagonist, Villain, and Survivor seats with automated fidelity, quality, and accuracy scoring, and critical error skip/abort handling.
- Express API mounting and `/api` fallback protection in local and Vite preview runtimes, so a backend failure cannot masquerade as an HTML success response.
- Development recovery through Clear System Memory and Autopilot as a soak-testing instrument.

### The Forge source-review path

The corrective Forge sequence through Packet 1E-1 is landed.

The Forge can now:

- keep candidate decisions binary and separate from draft mutation;
- validate and identity-match Architect responses before recording them;
- bind ambiguity conversations to exact source and question identities;
- commit accepted resolutions and Blueprint patches as one validated transaction;
- maintain a persisted Source Baseline revision distinct from the draft revision;
- preserve complete, revision-bound Depiction Contract proposals and reject stale application;
- generate scenario-specific Depiction Contracts from bounded source evidence and creator decisions;
- support proposal review, application, dismissal, refresh, and manual authoring;
- keep detailed source evidence available in a focused review drawer;
- produce a deeply immutable export artifact carrying both source revisions;
- capture one reviewed artifact whose Copy and Download bytes remain identical until the creator refreshes a stale review;
- apply accepted source-backed defaults atomically, including a complete Depiction Contract, rich topology definitions, and per-character opening placement;
- export a perspective-neutral Blueprint without requiring a global starting node or a permanently designated User character.

The standard source-to-Blueprint path can now produce an export-ready artifact when the extraction contains the required evidence. Incomplete or genuinely unsupported source material remains visible as an authoring gap rather than being disguised with a canned default.

### Provider admission and runtime boundary

The Engine's structured-output boundary is closed through Packet 1-10B. The provider receives the exact supported JSON-schema projection, all required HG1 envelopes remain present at ingress, and the authoritative Zod contract still validates the returned object after the provider responds. Refusals, empty responses, invalid provider requests, and non-JSON runtime responses fail closed without mutating canonical state or inventing player input.

The same admission path applies regardless of which provider generates the response. A local model, Gemini, or OpenAI must satisfy the same ingress contracts. Provider-specific behavior—structured-output format negotiation, rate-limit backoff, model fallback—is handled at the provider boundary before the Engine sees the response.

The current runtime also mounts the Express API in Vite previews and excludes `/api` from the single-page fallback. A failed turn therefore remains an API failure instead of becoming an HTTP 200 HTML document that the client cannot parse.

### Horror Grammar 1 & Astra Critical Corrections — Landed, Integrated, and Verified

The 12-packet Astra Critical Corrections series (Packets 01–12 across Milestones 1–5) is completed, landed, and verified on the live line. It resolves the integration gate across the complete client → server → client turn lifecycle:

- **State threading & multi-turn continuity:** Values, pursuits, fictional time, cast activity, situated pressure, and development state survive consecutive turns without data loss or empty fallback overwrites.
- **Authority and causal grounding:** Cast activity and situated pressure require exact Blueprint authority, perception channel, speaker, and location grounding before admission; illicit claims fail closed.
- **Forensic separation:** Diagnostic exports (Markdown and HTML) provide a typed, labeled forensics section preserving rejected proposals and forensic details, strictly segregated from playable fiction and prompt context.
- **Durable dual-store persistence and crash recovery:** Monotonic sequence tracking, cross-store coherence evaluation, and checkpoint recovery protect session integrity across browser reloads, retakes, and process restarts.
- **Perspective neutrality and opening invariants:** Blueprints compile and export perspective-neutrally; the Engine binds any eligible cast member (protagonist, antagonist, or support) with zero time cost on `SYSTEM_INIT` and full narration exposure to subsequent turns.
- **Autopilot parity:** Automated exploration shares the exact production ratification pipeline and fail-closed admission rules as human player turns.

This closure is protected by the master 9-step integration proof suite (`src/lib/integratedAcceptance.test.ts`) and broad regression suites.

### Current verification line

The 12-packet Astra Critical Corrections series (Packets 01 through 12 across Milestones 1 through 5) is fully landed and verified:

- **Milestone 1 (Authoring & Perspective Invariants):** Packets 01 & 02 verified Forge export readiness, strict Depiction Contract enforcement, perspective-neutral Blueprint export, and zero fictional time advancement on `SYSTEM_INIT`.
- **Milestone 2 (Turn Lifecycle & Boundary Enforcement):** Packets 03, 04 & 05 verified consecutive turn continuity, world memory persistence across empty turns, event-driven pursuit activation, offscreen opportunity projection, and response-window gated pressure.
- **Milestone 3 (Autopilot & Failure Containment):** Packets 06 & 07 verified canonical ratification parity between human and Autopilot turns, fail-closed handling of malformed responses and provider refusals, and zero state corruption on out-of-character (OOC) check-ins.
- **Milestone 4 (Persistence, Recovery & Telemetry):** Packets 08, 09 & 10 verified monotonic dual-store IndexedDB persistence, coherent cross-store recovery, Retake rollback of all HG1 ledgers, and forensic export segregation.
- **Milestone 5 (Behavioral Connections & Integrated Acceptance):** Packets 11 & 12 verified offscreen runtime intent projection, event-driven trigger consumption/reactivation, and closed the master 9-step deterministic integration proof suite.

The live line passes all broad quality gates: complete Vitest suite, TypeScript check (`tsc --noEmit`), full lint, production build, and clean git diff.

## What comes next

With the Horror Grammar 1 integration gate, full multi-turn continuity, Engine identity debt, and runtime provider switching closed, future work proceeds along explicit architectural boundaries:

### 1. Multi-scenario experiential play review & edge hardening

Play the assembled machine across varied scenarios (grounded human horror, authored supernatural, deliberate uncertainty, high-stakes dialogue, and antagonist play) to surface and harden experiential and edge failures under real session conditions.

### 2. Enforce authored boundaries and participant treatment

The Engine maintains strict causal ownership:
- Authority is causal; the Depiction Contract shapes narrative register, directness, aftermath, and ambiguity without granting unearned capabilities.
- Antagonists without physical reach remain bounded to psychological, observational, or systemic influence.
- Provider refusals remain external events, never converted to player actions.

### 3. Complete provider-neutral Engine and Forge paths

The Voice already operates across all three provider types. The Engine and Forge have provider-switching infrastructure in place; completing provider-neutral operation means verifying that structured-output negotiation, ingress validation, and extraction contracts function correctly across Gemini, OpenAI, and local models without provider-specific exceptions in application code.

### 4. Universal warning and intervention window (Deferred Boundary)

Design and introduce a universal warning and intervention window prior to permanent or fatal loss. (Preserved as explicitly deferred from the Astra Critical Corrections series).

### 5. Voice context enhancements (Deferred Boundary)

The Voice remains strictly read-only and non-authoritative. Future work will provide evidence-labelled context distinguishing Forge drafts, Engine sessions, and background research without granting simulation authority.

### 6. Telemetry polish and prose-only export (Deferred Boundary)

Refine Runtime diagnostic drawer presentation, add dedicated prose-only export formats alongside technical forensic telemetry, and expand multi-scenario integration fixtures.

### 7. Multi-Blueprint campaign continuity

Campaign continuity can move scoped state between authored Blueprints without merging them into an implicit global ledger.

### 8. Horror Grammar 2: Packet Series 1 — Pacing, Clocks & Character Stakes (Active Implementation)

Horror Grammar 2 has been consciously re-sequenced ahead of packages 2–7 by owner decision. The vocalization subsystem's live play review is folded into HG2's experiential verification.

This work is **HG2 Packet Series 1 — Pacing, Clocks & Stakes**:
- **Undulating Tension Cadence (The Breath)**: Dynamic pacing oscillation (Respite / Simmering Dread / Mounting Complication / Kinetic Rupture) preventing flatline panic without overriding player actions or causal consequences.
- **Impending Environmental Clocks**: Non-scripted situational decay vectors advancing via fictional time or ratified consequence events, featuring threshold-keyed manifestation cues and situated diegetic instrument observations.
- **Character Psychological Stakes**: Human drama, coping mechanisms, and breaking points that enforce physical obstruction when triggered, with deterministic lift conditions.
- **Causal Macro-Phase Milestones**: Narrative movements (Exposition, Inciting Rupture, Complication, Midpoint Crisis, Escalating Vise, Climax, Aftermath) gating phase transitions strictly on authored milestone achievements or clock crisis crossings.

*Note*: Revelation staging, thematic lore unpeeling, and tension-decay dynamics remain open research areas for **HG2 Packet Series 2**.

Active construction has moved to Antigravity. The machine supports Gemini, OpenAI, and local inference servers as providers. Gemini remains the default; provider neutrality is an active engineering direction with the Voice already operating across all three types and the Engine and Forge infrastructure in place.

## What will not change

- The application owns canon. The model may propose; it does not commit.
- A proposal is not a commit, whether it came from source extraction, an Architect response, a turn generator, or a memory suggestion.
- Blueprint data supplies authored context; it does not become a hidden runtime instruction or a scenario-specific exception in Engine code.
- Values, pursuits, and fictional time are Blueprint-derived literary scaffolding, not stats the User must track or a hidden game mechanic.
- No numeric pressure gauges in ordinary play (diegetic instruments excepted per D2).
- No phase transition without a causal, authored milestone.
- Failed validation preserves canonical state and leaves useful evidence.
- Characters have situated knowledge. The player, author, model, and character do not automatically know the same things.
- Retake, exit, recovery, and diagnostics remain available to the person using the machine.
- Literary strangeness is welcome. Silent contradiction is not.

## Reading the maps

- [README](./README.md) — what the machine is for, and why someone might enter it.
- [Development Roadmap](./DEVELOPMENT-ROADMAP.md) — implementation order, acceptance rules, active debt, and verification discipline.
