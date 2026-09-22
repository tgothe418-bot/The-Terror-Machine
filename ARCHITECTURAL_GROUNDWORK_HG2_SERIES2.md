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

When API usage limits reset, the **First Patch Post-Reset** will execute the following two architectural additions alongside the verification proof run:

```
[Defensive castMemberId Recovery] ---> [Forge Unified Detail Pass] ---> [20-Turn Proof Run]
(Auto-infer castMemberId from           (Macro -> Detail pass           (Headless villain run
 authorityReferences / aims)             candidate staging pipeline)     on fueled Mortuary)
```

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

### Feature 2: Forge Unified "Forensic Detail Pass" Mechanic
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

### Verification & Proof Run:
1. **Full Test Suite**: Verify all existing tests (1,553 tests across 126 files) plus new tests pass cleanly.
2. **20-Turn Proof Run**: Execute the headless autopilot villain run on *The Black Iron Mortuary* and publish telemetry report.
