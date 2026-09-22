# Architectural Groundwork: HG2 Series 2 & Anti-Catatonia Scaffolding

This document records the architectural groundwork laid during the pre-reset checkpoint (2026-09-22). It serves as the bridge for immediate execution once API usage limits reset.

---

## 1. Landed Groundwork in Working Tree

### A. Packet D: Black Iron Mortuary HG2 Fueling
- **Data File**: [`src/data/blueprints/black_iron_mortuary.json`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/src/data/blueprints/black_iron_mortuary.json)
  - Added full top-level `dramaticSpine` with `thematicPremise`, `pacingProfile: "RELENTLESS_PURSUIT"`, 3 dramatic questions, 4 milestone conditions (`INCITING_RUPTURE`, `MIDPOINT_CRISIS`, `ESCALATING_VISE`, `CLIMACTIC_CONFRONTATION`), and 2 impending clocks (`bulkhead_hydraulic_decay` on TIME/MODERATE with 4 cues and `holt_somatic_shock` on TIME/RAPID with 3 cues).
  - Added `psychologicalStakes` to all 3 cast members (`char-maren-ross`, `char-marcus-holt`, `char-entity-41`) with deterministic lift conditions, breaking point triggers, and composure baselines.
  - Added voice dossiers (`expressionProfile`) and explicit role `disposition` (`SURVIVOR` for Ross/Holt, `VILLAIN` for Entity-41).
  - Populated `horrorGrammar.valueAnchors` (4 reviewed anchors) and `horrorGrammar.characterPursuits` (3 reviewed pursuits) with full `CREATOR_DEFINED` provenance.
- **Unit Test Suite**: [`src/data/blueprints/black_iron_mortuary.test.ts`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/src/data/blueprints/black_iron_mortuary.test.ts)
  - Validates `BlueprintSchema`, `DramaticSpineSchema`, seat resolution for Protagonist/Antagonist/Director, prey cohort and apparatus bindings, voice dossiers, stakes, and initial node presences.

### B. Packet A: Autopilot Anti-Catatonia Filter & Directive Hardening
- **Filter Implementation**: [`server/utils/localVoiceClient.ts`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/server/utils/localVoiceClient.ts) (`cleanSimulatedAction`)
  - Added regex rejection for catatonic tokens (`none`, `n/a`, `placeholder`, `no action`, `i wait`, `i hesitate`, `i freeze`, `i pause`, `i do nothing`).
  - Added prompt echo rejection (`[USER_ACTION: ...]`, `[REASONING CONSTRAINT: ...]`, `[DIRECTIVE: ...]`, `[ROLE DIRECTIVE: ...]`).
  - **Nuanced Compound Action Support**: Rejects observation or hesitation *only* when it constitutes the sole output (`SPECTATOR_ONLY`). Compound actions ("I scan the corridor and advance toward the airlock") are preserved cleanly.
- **Route Wiring**: [`server/routes/chat.ts`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/server/routes/chat.ts) (`/simulate-player`)
  - Case-insensitive role normalization (`villain`, `antagonist`, `survivor`, `bystander`, `witness`, `director`).
  - Action-oriented, scenario-agnostic role directives for all seats; removed hesitation triggers from survivor and phone-call assumptions from villain.
- **Unit Test Suite**: [`server/utils/cleanSimulatedAction.test.ts`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/server/utils/cleanSimulatedAction.test.ts)
  - 8 test cases covering think stripping, fence stripping, prefix peeling, placeholder rejection, prompt echo rejection, spectator rejection, and compound action acceptance.

### C. Packet C: NPC Initiative Hardening & Phase 4 Scaffolding
- **Affirmative Directives**: [`server/routes/turn.ts`](file:///c:/Users/tgoth/.gemini/antigravity/scratch/The-Terror-Machine/server/routes/turn.ts)
  - Injected `STRONG PREFERENCE: Propose kind 'ACTIVITY' whenever the Opportunity Pool is non-empty` into `[CAST ACTIVITY PROPOSAL CONTRACT]`.
  - Added mandatory micro-action depiction requirement to `[AUTHORED CAST BEHAVIOR & LIVING PRESENCE]`.
  - Hardened `AUTONOMOUS TARGET & PREY SIMULATION` in villain mode to demand proactive evasion, barricading, tool preparation, and communication from victims.
- **Phase 4 Architectural Scaffolding Markers**:
  - Line ~850: Marked the **Opportunity pool pre-filter boundary** for Phase 4 autonomous pathfinding, spatial herding, and emergent behavioral vectors.
  - Line ~1240: Marked the **Hub-and-spoke relationship constraint** (player <-> non-player) for Phase 4 expansion to a full directed graph (NPC <-> NPC relationships, rivalries, and alliances).
  - Line ~1310: Marked the **Single cast_activity_proposal bottleneck** (at most 1 proposal per turn) for Phase 4 multi-cast concurrent cohort proposals.

---

## 2. Specialized Subagent Architecture

Two custom subagent specifications are registered and ready for invocation via `invoke_subagent`:

1. **`schema_auditor`**:
   - **Scope**: Rigorous Zod schema validation across blueprints, dramaturgy contracts, and proposal envelopes.
   - **Guarantees**: Ensures zero lenient fallbacks, strict error typing, and invariant preservation.
2. **`prompt_engineer`**:
   - **Scope**: Behavioral prompt hardening, anti-catatonia mitigation, and affirmative initiative contract review.
   - **Guarantees**: Evaluates prompts across both local SLMs (Gemma 4 26B) and frontier cloud models.

---

## 3. Post-Reset Execution Sequence (First Patch Post-Reset)

The pre-reset groundwork commits (`45f57aa` and `f3b6b18`) are already landed locally on `main`:
- `45f57aa`: Packets D, A, C, and B (Mortuary HG2 fueling, anti-catatonia filtering, NPC initiative, and bounded envelope retry).
- `f3b6b18`: Forge prompt pruning and local reasoning budget exhaustion suppression.

When API usage limits reset, the **First Patch Post-Reset** will execute the following integrated sequence of 10 enhancements grouped into 5 cohesive stages, followed by the headless proof run:

```
[Stage 1: Contract Resilience]   -->   [Stage 2: Scrying Cistern UX]   -->   [Stage 3: Forge Detail Ingress]
- castMemberId auto-recovery           - Immediate impulse display          - Unified Forensic Detail Pass
- Schema boundary hardening            - Centered 2/3 text width            - 1-Click Ambiguity auto-dismiss
                                       - Interactive MapSketch traversal
                                       - Prose Chronicle (.md) export

                              |
                              v

[Stage 4: Coherence & Stream]    -->   [Stage 5: Nav & Proof Run]
- Historian live telemetry feed        - Top-left Settings cogwheel
- Real-time Engine SSE streaming       - 20-Turn Headless Villain Proof Run
```

---

### Feature 1: Defensive Auto-Recovery for `cast_activity_proposal.castMemberId`
- **Problem Surfaced in Magnum v4 Testing**:
  - Magnum v4-12B generates valid JSON at ~58 tok/s and actively proposes NPC actions with full lore grounding.
  - However, it outputs `authorityReferences: ["[aim-char-entity-41] ... Owner: char-entity-41"]` while omitting the top-level property `"castMemberId"`.
  - The turn normalizer (`server/ai/geminiTurnTransport.ts`) synthesizes `proposalId` and `perceptionPath`, but lacks auto-recovery for `castMemberId`, causing Zod rejection and failed retries.
- **Implementation**:
  - In `normalizeCastActivityProposal` (`server/ai/geminiTurnTransport.ts`), when `kind === 'ACTIVITY'` and `castMemberId` is omitted:
    1. Parse `authorityReferences` via regex for `Owner:\s*([a-zA-Z0-9_-]+)` or `\[aim-([a-zA-Z0-9_-]+)\]`.
    2. Check `activitySummary` for known cast IDs.
    3. Fall back to active non-player / entity cast member in the scenario roster.
  - Add unit tests in `server/ai/geminiTurnTransport.test.ts` ensuring models that omit explicit top-level `castMemberId` pass envelope validation seamlessly.

---

### Feature 2: Immediate User Input Display (Optimistic Impulse)
- **Problem**:
  - In `Runtime.tsx`, submitting an impulse clears the textarea (`setInput('')`) while the message is only committed to `history` after the full server round-trip and validation complete.
  - During the 10–20 second inference window, the user's input disappears completely with only a loading spinner visible. If an engine error occurs (e.g. `MODEL_CONTRACT_MISMATCH`), the input is lost from the screen.
- **Implementation**:
  - In `Runtime.tsx`, introduce an optimistic `inFlightInput` state on `handleCommand`.
  - Immediately render the in-flight directive at the head of the scrying transcript under an `[ IMPULSE OFFERING // ${effectiveCategory} ]` badge with a subtle pulsing amber beacon.
  - On turn resolution, transition smoothly to the committed canonical message; on turn error, retain the impulse alongside the error banner for instant retake / re-editing.

---

### Feature 3: Centered & Widened Text (~2/3 Width in Center Stage)
- **Problem**:
  - In `ErgodicTextRenderer.tsx`, prose paragraphs have a hard-coded Tailwind clamp (`max-w-prose`, ~65ch ≈ 550px) without column centering.
  - On ultrawide (1440p) displays, this pins narrative text to the far-left, leaving over 65% of the central scrying cistern as dead black space.
- **Implementation**:
  - In `ErgodicTextRenderer.tsx`, remove `max-w-prose` so paragraphs respect their column container.
  - In `Runtime.tsx`, wrap the narrative stream inside `data-testid="narrative-stream-container"` with a centered column constraint:
    `w-full max-w-[68%] mx-auto space-y-8`.
  - Centers the scrying text optically within the center stage at roughly two-thirds width with balanced gutters.

---

### Feature 4: Forge Unified "Forensic Detail Pass" Mechanic
- **Problem**:
  - Single-pass extraction over-stretches local and cloud models, causing them to capture only the skeletal outline (premise, 2 cast, 3 rooms) while missing peripheral victims, sub-chambers, ventilation flues, and psychological stakes.
- **Implementation**:
  - **Backend**: Add `/api/extract-detail-pass` in `server/routes/forge.ts`.
    - Accepts existing draft blueprint + reference source text.
    - Uses negative prompting (`"You have already captured [Chambers X, Y] and [Cast A, B]. Scan the reference text exclusively for uncaptured secondary cast, locked chambers, crawlspaces, environmental hazards, and psychological secrets"`).
  - **Store & UI**:
    - Update `useForgeStore.ts` with `runDetailPass()` action.
    - In the Ingress / Candidate Staging view, render a prominent action: **`[EXECUTE FORENSIC DETAIL PASS]`**.
    - Stage newly unearthed items into the existing candidate table with a distinctive **`Pass 2`** badge, enabling non-destructive review, editing, and acceptance.

---

### Feature 5: Real-Time Engine Narrative Streaming
- **Problem**:
  - Waiting 15–25 seconds for a complete turn to arrive in a single block feels unresponsive and hides the model's literary generation process.
- **Implementation**:
  - Add `/api/turn-stream` SSE endpoint mirroring `/api/chat-stream` and `/api/extract-blueprint-stream`.
  - Stream tokens from LM Studio / Gemini, using a stream extractor to extract `narrative_blocks[0].content` in real time.
  - Render text progressively with an ergodic blinking obsidian cursor on the active turn block.
  - Run full Zod schema validation on the assembled JSON payload at stream close before updating canonical state.

---

### Feature 6: Dedicated Prose-Only Chronicle Export (`.md`)
- **Problem**:
  - In `Runtime.tsx`, there is no way to export the simulation narrative. When a player finishes a 20- or 40-turn run, their literary horror story cannot be saved or downloaded, only raw JSON debug state exists in IndexedDB.
- **Implementation**:
  - Add an **`[ EXPORT CHRONICLE ]`** button to the Engine runtime header.
  - Generates a cleanly formatted Markdown file (`<scenario_title>_chronicle_<timestamp>.md`) containing the title, setting, and chronological narrative stream with formatted speaker headings and atmospheric prose, completely stripped of raw JSON receipts, engine thoughts, and telemetry hashes.

---

### Feature 7: Interactive `MapSketch` Traversal Staging
- **Problem**:
  - In `Runtime.tsx`, `<MapSketch />` does not pass `onSelectNode`, leaving the interactive SVG map purely passive.
- **Implementation**:
  - Wire `onSelectNode={(nodeId) => ...}` in `Runtime.tsx`.
  - When the player clicks an adjacent discovered chamber on the map sketch, auto-populate the Impulse Slate textarea with a traversal/investigation intent (e.g. `"Advance cautiously toward [Chamber Name]..."`), focusing the input and staging the action for one-click channeling.

---

### Feature 8: Live Simulation Telemetry Feed to The Historian (Oracle of Records)
- **Problem**:
  - The Historian is docked in the right wing, but runs with a static system prompt. It has no visibility into the live simulation state (current chamber, active clocks, companions present, pacing cadence).
- **Implementation**:
  - When The Historian is invoked from the Engine runtime, append a concise read-only telemetry summary block to the prompt context:
    - Active Scenario Title & Macro-Phase
    - Player Vessel Name & Current Chamber
    - Co-present Companions & Physical Status
    - Active Impending Clocks & Manifested Cues
  - Enables The Historian to authentically answer diegetic lore, status, and environmental questions as the *Oracle of Records*.

---

### Feature 9: Visual Progress & Auto-Dismiss on Forge 1-Click Ambiguity Resolution
- **Problem**:
  - In the Forge Source Inspector, clicking the "1-Click Resolve Ambiguities" button provides no visual feedback—it does not show a loading state, disable itself, or dismiss automatically when resolved, leading to repeat clicks.
- **Implementation**:
  - In `SourceInspectorModal.tsx`, bind a loading state (`[RESOLVING AMBIGUITIES...]` with spinner), disable the button while in-flight, and automatically hide or transition the card to a resolved checkmark state upon completion.

---

### Feature 10: Top-Left Settings Cogwheel (Hub Navigation)
- **Problem**:
  - AI Calibration / Provider Settings is accessed via secondary apparatus buttons or nested modals, rather than a ubiquitous top-level shortcut.
- **Implementation**:
  - Add an obsidian cogwheel icon (`Settings` / `Sliders`) pinned to the top-left navigation bar across the application.
  - Provides instant one-click access to AI Calibration (provider switching, local model selection, API keys) from any view without losing current workflow context.

---

### Verification & Proof Run:
1. **Automated Test Suite**: Verify all unit and integration tests (1,553 tests across 126 files) plus new tests pass cleanly with zero lint or typecheck regressions.
2. **20-Turn Proof Run**: Execute the headless autopilot villain run on *The Black Iron Mortuary* and generate the comprehensive telemetry report.
