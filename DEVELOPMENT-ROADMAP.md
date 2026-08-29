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

- Current live line reviewed: [de658a1](https://github.com/tgothe418-bot/The-Terror-Machine/commit/de658a167e43b82cee5bf3fa80e2681e0c743526) (Forge 1E-1 closure, HG1 provider closure, and runtime/API admission correction).
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
- The current live line passes the declared broad Vitest, TypeScript, lint, production-build, and diff gates. These are baseline facts, not substitutes for feature-specific acceptance.

### Live, under review

#### Phase 3H.5D — Explicit Player-Character Binding and persistence

The live line can bind an exact selected cast ID, and recent telemetry demonstrates protagonist and antagonist selection from the same perspective-neutral Blueprint. This phase is not accepted until setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry carry the same canonical identity end to end without relying on cast order.

#### Scenario authority enforcement

An Authority Contract appearing in a prompt is not enforcement. Causal authority must be adjudicated before an out-of-contract consequence, character change, durable memory item, or receipt can become canonical.

#### Source-gap handling and authored boundaries

Packet 1E-1 closes the normal source-backed default path: when extraction supplies the required evidence, the Forge can apply a complete Depiction Contract and map baseline without manual reconstruction. Remaining work is limited to honest, field-addressable handling for sources that are genuinely incomplete or ambiguous, plus enforcement that the Depiction Contract shapes depiction without granting causal authority.

## Horror Grammar 1 construction ledger

The Horror Grammar 1 series is active on the live line. Its purpose is to let the Blueprint provide values, pursuits, fictional time, and narrative pressure so non-User characters can continue pursuing their own concerns without turning the Engine into a visible stat system. The User supplies actions; the Engine may commit only causally supported changes.

The provider and route-admission boundary is accepted through Packets 1-10, 1-10A, and 1-10B. The integrated grammar milestone remains open only at the deeper state-threading, authority/perception, and forensic boundaries below. Recent smoke telemetry has exercised protagonist and antagonist perspectives and recorded accepted consequences, character reactions, and World Memory.

| Packet | Construction boundary | Current disposition |
|---|---|---|
| **1-1 — Forge value and pursuit foundations** | Value and pursuit types, provenance, Blueprint authoring, and proposal foundations are present. | Implementation present; cross-boundary continuity still open. |
| **1-2 — Fictional time and cast activity selection** | Fictional-time ledger, activity scheduling, and bounded offscreen opportunity selection are present. | Implementation present; real consecutive-turn handoff still open. |
| **1-3 — Validated non-User initiative and situated pressure** | Initiative and pressure ratifiers plus isolated narrative composition are present. | Implementation present; exact authority/perception/speaker/source validation still open. |
| **1-4 — Causal value, pursuit, and character evolution** | Value state, pursuit overlays, development, and pressure-thread lifecycle structures are present. | Implementation present; canonical state threading and publication still open. |
| **1-5 — Forensic telemetry and integration gate** | Forensic/export scaffolding and integration tests are present. | Implementation present; typed Runtime forensic evidence and real multi-turn acceptance still open. |
| **1-10 through 1-10B — Provider and route admission** | Exact HG1 provider envelopes, causal-reference validation, Gemini structured-output compatibility, and API failure containment. | **Accepted at the provider and route boundary; not a substitute for full grammar integration.** |

### Critical integration closure

1. **State threading:** extend the actual Engine turn context and route contract with bounded HG1 state, initialize it from the accepted Blueprint, and publish the ratified post-state without empty fallbacks replacing prior ledgers.
2. **Authority and perception:** resolve exact Blueprint authority and evidence references; require the correct actor, channel, location, and situated knowledge for activity and pressure manifestations; reject ungrounded or misattributed changes before canon and narrative composition.
3. **Forensic boundary:** add a typed, bounded forensic record and a readable Runtime view. Preserve exact rejected proposal evidence only in that labeled forensic section; keep provider metadata, credentials, stack traces, endpoint details, and rejected material out of story, prompt, and ordinary canonical history.
4. **Integration proof:** exercise two consecutive real turns, a rejected/refused turn, and Retake with state-preservation and forensic-isolation assertions. Focused tests belong to this closure; the full suite and broad tooling gates belong at the declared stabilization point.

Horror Grammar 2 is not started. No subsequent grammar packet should be treated as active implementation until this closure is accepted.

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

## Next work packages

### 1. Close the Horror Grammar 1 integration gate

Do not begin Horror Grammar 2 until this gate closes. The work is deliberately bounded to the critical continuity, authority, and forensic seams exposed by live review.

Acceptance requires:

- the real turn request and response carry bounded Blueprint, value, pursuit, fictional-time, activity, pressure, and development state across at least two consecutive turns;
- initialization and post-turn publication are canonical and fail closed; missing optional fields cannot replace existing ledgers with empty defaults;
- activity and pressure ratifiers require exact, Blueprint-grounded authority, perception, speaker, source, channel, and location evidence;
- only validated manifestations may alter canonical state or enter final narrative composition;
- a typed Horror Grammar forensic record is available in the Runtime review surface and diagnostics, with bounded rejected proposal evidence retained only in an explicitly labeled forensic section;
- provider metadata, credentials, stack traces, endpoint details, and unbounded raw response material never enter story, prompt, canonical history, or ordinary export content;
- focused two-turn, authority/perception, refusal/rejection, forensic, and Retake proofs pass at the relevant boundaries;
- broad Vitest, TypeScript, lint, build, and diff gates are run once at the closure's stabilization point, not demanded for every micro-packet.

### 2. Close explicit Player-Character Binding and persistence

Finish the identity-bearing path across setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry. The selected character must remain exact without relying on cast order or scenario-specific assumptions. Recent smoke runs demonstrate the basic protagonist and antagonist paths; this package closes the remaining recovery and persistence proof.

Acceptance requires:

- one canonical `player_character_id` selected from the eligible cast;
- the stored ID surviving setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry;
- role eligibility and seat availability enforced without relying on cast order;
- human and automated runs exercising first and non-first eligible selections;
- focused proofs plus the appropriate broad suite, TypeScript, lint, build, and diff gates;
- no Blueprint names, cast assumptions, or scenario literals in production instructions.

### 3. Enforce authored participation and treatment at the Engine boundary

The Engine must use accepted Blueprint contracts while retaining deterministic ownership of causality and canon.

Acceptance requires:

- authority adjudication before prose generation and before any canonical consequence, character state, or durable memory commits;
- a thought-, perception-, or motivation-only antagonist never receiving ratified direct physical reach unless its Authority Contract expressly grants it;
- the Depiction Contract shaping framing and directness without granting causal authority;
- a structured treatment receipt recording direct depiction, abstraction/aftermath, or a refusal to render;
- provider refusal represented as a distinct Engine event, never as player input;
- tests for authority denial, permitted direct depiction, scenario-authored abstraction, provider refusal, retake, and unchanged canonical state on a blocked result.

Provider-level non-negotiable constraints remain external to the Blueprint contract. They must be represented honestly without pretending the player authored the refusal.

### 4. Make Autopilot identity-safe

Autopilot must receive the selected character's canonical context, use the same identity-bearing path as a human session, stop or retry deliberately after failure, and label generated input in telemetry and exports.

### 5. Finish durable continuity

Extend character and World Memory through the complete turn lifecycle with scoped, inspectable handoff. Every durable fact needs a source, scope, acceptance decision, and bounded prompt projection.

Campaign handoff must remain explicit rather than becoming an implicit global ledger.

### 6. Harden the Voice boundary

Keep Voice observations read-only and separate from simulation canon. Add evidence-labelled context, snapshot/export parity, and clear handling for Forge drafts, Engine sessions, outside research, and ordinary project conversation.

### 7. Prepare campaign, horror-grammar, and provider seams

Once identity, authority, and continuity are stable:

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
