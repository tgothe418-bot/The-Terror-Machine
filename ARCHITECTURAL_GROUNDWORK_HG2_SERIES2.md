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

## 3. Post-Reset Execution Sequence

When API usage resets, proceed with the remaining steps in the approved sequence:

```
[Packets D, A, C Landed] ---> [Packet B: Envelope Retry] ---> [20-Turn Proof Run]
(Blueprints, prompts,         (Single bounded retry          (Headless villain run
 filters, and tests drafted)   in aiClient.ts)                on fueled Mortuary)
```

### Immediate Next Steps on Reset:
1. **Run Vitest**: Verify `black_iron_mortuary.test.ts` and `cleanSimulatedAction.test.ts` pass cleanly (`npm test`).
2. **Commit Groundwork**: `git commit -m "feat(hg2): fuel Black Iron Mortuary, harden autopilot anti-catatonia, and strengthen NPC initiative"`.
3. **Execute Packet B**:
   - Implement the 2-attempt envelope retry in `server/utils/aiClient.ts:generateStructuredResponse`.
   - Add retry unit tests in `server/utils/aiClient.test.ts`.
4. **Launch Proof Run**:
   - Run the 20-turn headless autopilot villain proof run on the fueled Black Iron Mortuary and generate the telemetry report.
