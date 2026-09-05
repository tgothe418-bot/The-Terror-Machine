# The Terror Machine — Development Roadmap

This is the project's engineering ledger: the current baseline, known non-acceptances, sequencing rules, and the evidence required before work is called complete.

It is intentionally more exact than the [Technical (Public) Roadmap](./ROADMAP.md). It does not promise dates.

## Status language

- **Landed** — present on the live line and protected by the relevant verification boundary.
- **Live, under review** — implemented behavior is available, but combined inspection or acceptance evidence remains incomplete.
- **Sequenced** — designed work with an explicit dependency order; it is not yet accepted implementation.
- **Planned** — a direction that should not be mistaken for a current contract.

A focused test proves its named behavior. It does not, by itself, close an integrated feature, a production type gate, or a human-facing contract.

## Live code baseline reviewed for this ledger

- Current live line reviewed: [0599d14](https://github.com/tgothe418-bot/The-Terror-Machine/commit/0599d14) (Astra Critical Corrections series Packets 01–12 closure, Master Integration proof suite, and prospective post-series README update).
- The branch was clean and synced when reviewed. The status below is based on live code inspection, focused proofs, broad gates, and recent smoke telemetry; a packet's completion report is not accepted evidence by itself.

## Current baseline

### Landed

- Atomic turn pipeline: snapshot, model generation, ratification, one commit or fail-closed result, retake, and telemetry.
- Canonical topology and intent-bound expansion at an unmapped boundary.
- Role-aware participation for Protagonist, Antagonist, and Director, including explicit authority and limits for antagonist play.
- Blueprint and Haunted House / Ad-Lib Induction paths converging on shared Engine contracts.
- Canonical consequences, cast presence and continuity, stance, relationships, and bounded character memory.
- Phase 3H.5C World Memory: deterministic identity, bounded global/current-node prompt projection, required proposal and receipt contracts, fail-closed validation, canonical commit, and export evidence.
- Forge source review through the accepted Packet 02A–07 corrective sequence.
- Forge Packet 1E-1 — Source-Backed Default Import and Map Closure: valid reference imports now apply a complete source-backed baseline atomically, populate rich topology and per-character opening placement, and export perspective-neutral Blueprints without a required global starting node or permanent User character.
- Engine Corrective Packet 08 — Human Turn Contract Reliability: the provider response schema is aligned to the application contract; concise creator-written input remains exact and shares the one-generation, ratification path with Autopilot; bounded mismatch diagnostics survive failure receipts and Markdown/HTML telemetry; creator acceptance is complete.
- Horror Grammar 0 — Provider-Refusal Containment Correction: provider block metadata is classified before parsing; empty/refused responses fail closed; synthetic player-action fallbacks are removed; Autopilot halts on failed generation or non-commit; human input and canonical state remain recoverable.
- HG1 Provider Contract Closure (Packets 1-10, 1-10A, and 1-10B): Gemini receives the supported structured-output schema, required HG1 envelopes remain required at ingress, causal references fail closed, and provider/runtime failures cannot become player input or canonical state.
- Local and Vite preview runtime admission: Express owns `/api`, the SPA fallback excludes API routes, and backend failures remain structured JSON failures instead of HTML masquerading as a successful turn.
- Phase 3H.5D Explicit Player-Character Binding: Exact character selection, perspective-neutral Blueprint export, entry placement, and dual-store persistence are verified across the entire lifecycle.
- Astra Critical Corrections Series (Packets 01–12, Milestones 1–5): Closed the master integration gate across the complete client → server → client turn lifecycle:
  - *Milestone 1 (Authoring & Perspective Invariants):* Packet 01 (Forge export readiness & strict Depiction Contract enforcement), Packet 02 (Perspective selection, perspective-neutral Blueprint export, and zero fictional time advancement on `SYSTEM_INIT`).
  - *Milestone 2 (Turn Lifecycle & Boundary Enforcement):* Packet 03 (Turn context isolation & consecutive turn continuity), Packet 04 (Pursuit evolution & grounded activity), Packet 05 (Situated pressure & response-window gated progression).
  - *Milestone 3 (Autopilot & Failure Containment):* Packet 06 (Autopilot & human ratification parity), Packet 07 (Provider refusal & OOC check-in fail-closed containment with zero canonical mutation).
  - *Milestone 4 (Persistence, Recovery & Telemetry):* Packet 08 (Durable dual-store IndexedDB persistence with monotonic write tracking), Packet 09 (Retake rollback across all HG1 ledgers and stores), Packet 10 (Diagnostic telemetry & forensic export segregation).
  - *Milestone 5 (Behavioral Connections & Integrated Acceptance):* Packet 11 (Offscreen runtime pursuit projection & event-driven trigger consumption/reactivation), Packet 12 (Master 9-step deterministic integration proof suite in `src/lib/integratedAcceptance.test.ts`).
- The current live line passes the declared broad Vitest, TypeScript, lint, production-build, and diff gates. These are baseline facts, not substitutes for feature-specific acceptance.

### Live, under review / Deferred boundaries

- Universal warning and intervention window prior to permanent or fatal loss (explicitly deferred from the Astra Critical Corrections series).
- Voice read-only context expansion across separate drafts, sessions, and research (deferred).
- Telemetry drawer visual polish and dedicated prose-only export option (deferred).
- Horror Grammar 2 (independent future milestone; unstarted).

## Horror Grammar 1 construction ledger

The Horror Grammar 1 series is fully landed, integrated, and verified on the live line. Its purpose is to let the Blueprint provide values, pursuits, fictional time, and narrative pressure so non-User characters can continue pursuing their own concerns without turning the Engine into a visible stat system. The User supplies actions; the Engine may commit only causally supported changes.

| Packet | Construction boundary | Current disposition |
|---|---|---|
| **1-1 — Forge value and pursuit foundations** | Value and pursuit types, provenance, Blueprint authoring, and proposal foundations. | **Landed and verified.** |
| **1-2 — Fictional time and cast activity selection** | Fictional-time ledger, activity scheduling, and bounded offscreen opportunity selection. | **Landed and verified.** |
| **1-3 — Validated non-User initiative and situated pressure** | Initiative and pressure ratifiers plus isolated narrative composition. | **Landed and verified.** |
| **1-4 — Causal value, pursuit, and character evolution** | Value state, pursuit overlays, development, and pressure-thread lifecycle structures. | **Landed and verified.** |
| **1-5 — Forensic telemetry and integration gate** | Forensic/export scaffolding and integration tests. | **Landed and verified.** |
| **1-10 through 1-10B — Provider and route admission** | Exact HG1 provider envelopes, causal-reference validation, Gemini structured-output compatibility, and API failure containment. | **Landed and verified.** |
| **Astra 01 through 12 — Master Integration Gate** | End-to-end multi-turn continuity, authority gating, forensic segregation, Retake rollback, durable persistence, and Autopilot parity. | **Landed and verified** (`src/lib/integratedAcceptance.test.ts`). |

### Critical integration closure — COMPLETED AND CLOSED

1. **State threading:** Extended Engine turn context and route contract with bounded HG1 state, initialized from Blueprint, and published post-state without empty fallbacks. *(Verified in Packets 03 & 12)*.
2. **Authority and perception:** Exact Blueprint authority, perception channel, speaker, and location grounding adjudicated before canon admission. *(Verified in Packets 03, 05 & 12)*.
3. **Forensic boundary:** Typed, bounded forensic record in Runtime review surface and exports, preserving rejected proposal evidence only in labeled section while keeping secrets and provider internals segregated. *(Verified in Packets 10 & 12)*.
4. **Integration proof:** Master 9-step integration proof suite (`src/lib/integratedAcceptance.test.ts`) verifies two consecutive turns, empty turns, rejected proposals, provider refusals, OOC check-ins, Retake, durable reload, and session supersession. *(Verified in Packet 12)*.

Horror Grammar 2 is not started. No subsequent grammar packet should be treated as active implementation until explicitly sequenced.

## Deferred, non-blocking observations

These are recorded for later audit once the critical integration closure is working. They do not hold the larger creative direction unless a live trace demonstrates canonical corruption, loss of User agency, stranded recovery, or unsafe provider/internal leakage.

- Reconcile opportunity-selection wording between Blueprint baseline activity and runtime overlays after state threading is complete.
- Review turn and revision display identifiers for any off-by-one presentation without changing canonical identity.
- Tighten free-form reason codes, bounded array limits, and enum/provenance wording where real traces show that the current contracts are too loose.
- Expand broader multi-turn fixtures and CI coverage after the real boundary proofs exist; helper-only coverage is not a substitute for that proof, but its absence is not itself a reason to stop construction.
- Polish forensic drawer presentation and export labeling after the typed forensic record is in the correct place.

## Accepted Forge corrective sequence

The source-to-Blueprint handoff is now one reviewable chain rather than a set of loosely connected features. Packet 1E-1 closes the normal default-import path: valid, evidence-backed source analysis can produce a complete, perspective-neutral, exportable Blueprint without requiring a permanent global start or player character. Unsupported or ambiguous source material remains an explicit authoring gap.

| Packet | Accepted boundary |
|---|---|
| **02A — Candidate Decisions** | Candidate decisions remain exactly accepted or rejected and do not mutate the draft directly. |
| **02B — Architect Response Isolation** | Malformed or identity-mismatched ambiguity responses fail closed before conversation or lifecycle state is recorded. |
| **02C — Retake Identity** | Retake checkpoints require exact, non-empty session and Blueprint identity. |
| **03A — Architect Server Protocol** | Ambiguity resolution uses strict, bounded, identity-bound request and response contracts without fabricated fallback prose. |
| **03B — Resolution Transaction** | An accepted resolution and its schema-backed Blueprint patch commit together or leave prior state untouched. |
| **04A — Baseline Revision and Proposal State** | The persisted Source Baseline revision is distinct from the draft revision, and complete proposals cannot apply after either source changes. |
| **04B — Depiction Generation Protocol** | The Architect produces scenario-specific Depiction Contract proposals from validated, bounded Forge context; malformed output fails visibly. |
| **04C — Depiction Panel Lifecycle** | The creator can generate, review, apply, dismiss, refresh, and manually edit a source-grounded proposal. |
| **05 — Evidence Drawer** | Candidate evidence remains available through a focused in-application review surface. |
| **06A — Export Artifact** | Export compilation produces one deeply immutable artifact carrying the supplied draft and Source Baseline revisions. |
| **06B — Export Review Snapshot** | Opening Export Review captures one artifact; Copy and Download use its exact bytes; revision changes require refresh. |
| **07 — Stabilization** | Sequence-related type and fixture integrations were repaired; the full test suite, lint, and production build passed. |
| **1E-1 — Source-Backed Default Import and Map Closure** | Accepted source candidates apply atomically, including Depiction Contract, rich topology, and per-character opening placement; export remains perspective-neutral and schema-valid. |

The post-07 mount correction ensures that the normal closed-to-open Export Review path actually creates the first snapshot rather than initializing while hidden.

## Accepted Engine corrective sequence

| Packet | Accepted boundary |
|---|---|
| **08 — Human Turn Contract Reliability** | The provider schema now projects the authoritative application response contract more faithfully. Concise creator input is preserved verbatim and follows the same one-generation, fail-closed route as Autopilot. Safe schema-failure paths and codes survive the failure receipt and Markdown/HTML telemetry. Focused tests, scoped lint, a scoped-clean TypeScript result, production build, and creator live smoke acceptance are recorded. |
| **Horror Grammar 0 — Provider-Refusal Containment Correction** | Provider refusal and empty-response metadata are classified before parsing; route failures omit synthetic action input; Autopilot stops on failed generation or non-commit; human input is recoverable and canonical state remains unchanged. |
| **1-10 — HG1 Provider Contract Restoration** | The complete HG1 proposal envelope is required at provider ingress; omission, refusal, and empty responses fail closed instead of manufacturing neutral state. |
| **1-10A — HG1 Exact Provider Closure** | Canonical enum and causal-reference constraints are projected exactly, valid causes are fail-closed, and bounded prompt projections carry the HG1 context used by ratifiers. |
| **1-10B — Gemini Structured-Output Compatibility and Live Turn Admission** | Gemini receives the supported JSON-schema transport shape, the authoritative Zod contract remains the ingress validator, and the production turn route preserves structured failure semantics. |

## Accepted Astra Critical Corrections Sequence (Packets 01–12 across Milestones 1–5)

The 12-packet Astra Critical Corrections series resolves the integration gate across the complete client → server → client turn lifecycle and is fully verified on the live line:

| Packet | Accepted boundary |
|---|---|
| **01 (M1) — Forge Baseline & Export Contract** | Forge export readiness enforces strict Depiction Contracts, schema validation, and perspective neutrality. |
| **02 (M1) — Perspective Invariants & Campaign Entry** | Perspective-neutral Blueprint compilation, arbitrary player character selection, zero fictional time cost on `SYSTEM_INIT`, and opening narrative block continuity. |
| **03 (M2) — Multi-Turn Continuity & State Threading** | Consecutive turn state threading without reset or fallback loss across fictional time, cast activity, and situated pressure. |
| **04 (M2) — Empty-Turn & Idle Persistence** | World memory and canonical condition persistence across empty turns, silence, and neutral observation actions. |
| **05 (M2) — Offscreen Pursuit & Situated Pressure Execution** | Offscreen opportunity generation, pursuit advancement, and response-window gated pressure ratification. |
| **06 (M3) — Autopilot Ratification Parity** | Autopilot action generation shares exact production ratification pipeline, state schemas, and fail-closed validation. |
| **07 (M3) — Failure Containment & Fictional Frame Integrity** | Provider refusal and malformed responses fail closed with zero state mutation; OOC AI narrator check-ins are cleanly rejected from canonical narrative. |
| **08 (M4) — Dual-Store Monotonic Persistence** | Monotonic sequence tracking in IndexedDB and Zustand dual-store synchronization across browser reloads. |
| **09 (M4) — Retake Rollback of HG1 State** | Retake cleanly unwinds all HG1 ledgers, fictional time, and activity events back to exact pre-turn checkpoint. |
| **10 (M4) — Forensic Telemetry Segregation** | Technical diagnostics and rejected proposals isolated in labeled forensic export sections, preserving clean playable story blocks. |
| **11 (M5) — HG1 Behavioral Connections** | Event-driven pursuit triggering, trigger consumption on neutral turns, bounded-out persistence, and runtime pursuit projection. |
| **12 (M5) — Integrated Acceptance & Master Stabilization** | Master 9-step deterministic integration proof suite (`src/lib/integratedAcceptance.test.ts`), experiential review cases for Justin, and broad quality gates closure. |

## Next work packages

The Horror Grammar 1 integration gate, explicit Player-Character Binding, Autopilot ratification parity, and durable dual-store persistence are fully closed and verified by the Astra Critical Corrections series (Packets 01–12). Future implementation proceeds along the following sequenced packages:

### 1. Multi-scenario experiential play review and edge hardening

Before opening new feature cycles, play the stabilized machine across varied scenarios with Justin, assessing:
- Grounded human horror at high physical pressure.
- Authored supernatural horror within defined Authority Contracts.
- Deliberate uncertainty and uncollapsed epistemic ambiguity.
- Reassurance, lying, and refuge dialogue without system-error replacements.
- Out-of-character check-in containment vs. ambiguous in-world psychological prose.
- Protagonist and antagonist player sovereignty and response-window gating.

Address the failures, rough edges, and UX observations these real sessions reveal.

### 2. Enforce authored participation and treatment at the Engine boundary

The Engine must use accepted Blueprint contracts while retaining deterministic ownership of causality and canon.

Acceptance requires:

- authority adjudication before prose generation and before any canonical consequence, character state, or durable memory commits;
- a thought-, perception-, or motivation-only antagonist never receiving ratified direct physical reach unless its Authority Contract expressly grants it;
- the Depiction Contract shaping framing and directness without granting causal authority;
- a structured treatment receipt recording direct depiction, abstraction/aftermath, or a refusal to render;
- provider refusal represented as a distinct Engine event, never as player input;
- tests for authority denial, permitted direct depiction, scenario-authored abstraction, provider refusal, retake, and unchanged canonical state on a blocked result.

Provider-level non-negotiable constraints remain external to the Blueprint contract. They must be represented honestly without pretending the player authored the refusal.

### 3. Universal warning and intervention window (Deferred Boundary)

Design and integrate an explicit warning/intervention window before irreversible consequence or terminal loss occurs. (Preserved as explicitly deferred from the Astra Critical Corrections series).

### 4. Voice context enhancements (Deferred Boundary)

Keep Voice observations read-only and separate from simulation canon. Add evidence-labelled context, snapshot/export parity, and clear handling for Forge drafts, Engine sessions, outside research, and ordinary project conversation. (Preserved as explicitly deferred from the Astra series).

### 5. Telemetry polish and dedicated prose-only export (Deferred Boundary)

Refine Runtime diagnostic drawer presentation, add dedicated prose-only export formats alongside technical forensic telemetry, and expand multi-scenario integration fixtures.

### 6. Multi-Blueprint campaign continuity

Extend character and World Memory through campaign handoff between authored Blueprints with scoped, inspectable transfer. Campaign handoff must remain explicit rather than becoming an implicit global ledger.

### 7. Horror Grammar 2 (Independent Future Milestone)

Once HG1 stabilization and authored boundary enforcement are complete, research generative dread pacing, revelation staging, and tension decay as generative principles rather than genre presets.

- define explicit multi-Blueprint campaign handoff;
- research pressure, pacing, fear, revelation, and recovery as generative principles rather than preset plots;
- preserve a provider-replaceable Engine boundary without allowing provider behavior to bypass established contracts.

## Construction environment

Active construction and local verification have moved from Google AI Studio to Antigravity. Google Gemini remains the application's current runtime model through `@google/genai`.

The construction environment and the application provider are separate concerns. Future provider work must preserve the same Engine contracts rather than smuggling provider-specific behavior into canon.

## Engineering rules that do not bend

- Blueprint data is input, never a hidden runtime instruction. Production code and implementation packets remain scenario-agnostic.
- The model proposes; deterministic application code decides what becomes true.
- Failed validation preserves canonical state and emits useful evidence.
- Required schemas become stricter. Stale fixtures are repaired at their source.
- Broad type escapes, suppression comments, permissive defaults, and fallback receipts are not ordinary gate-repair tools. Any unavoidable test-only bridge must remain isolated and justified.
- When a contract crosses a UI or route boundary, tests must exercise that real boundary; helper-only tests are insufficient.
- Human review remains part of acceptance for generated Blueprints, exported telemetry, and changes affecting player identity or authorial intent.
- A Depiction Contract may shape framing and directness. It cannot grant causal authority or override provider-level constraints.

## Verification discipline

### Bounded construction packets

For a narrow implementation sequence:

1. name one observable boundary and its focused proof;
2. complete the implementation before running that proof;
3. permit only a tightly bounded corrective rerun;
4. lint the scoped files;
5. stop and report unrelated failures instead of absorbing them into the packet.

Do not run the full suite, global TypeScript check, full lint, and production build after every micro-packet unless that packet explicitly owns a broad integration gate. Broad checks belong at planned stabilization points, where their failures can be classified coherently.

### Broad stabilization

At the end of a corrective sequence, run the declared project gates in order:

- complete Vitest suite;
- TypeScript check;
- full lint;
- production build;
- diff check.

A passing focused test does not erase a failing production type gate. A passing broad gate does not prove the requested behavior exists. Both kinds of evidence are required at the appropriate stage, and inherited failures remain visible until repaired.

## Relationship to the public technical roadmap

The [Technical (Public) Roadmap](./ROADMAP.md) explains the machine's direction for a technically curious visitor. This document records exact sequencing, acceptance evidence, and open debt. Update both when current behavior or the active work boundary materially changes.
