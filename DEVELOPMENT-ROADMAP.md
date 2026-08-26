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

- Horror Grammar 1 implementation reviewed: [b0253fe](https://github.com/tgothe418-bot/The-Terror-Machine/commit/b0253fed9302e4b5fac8b8c633de0bab016c587b) (Packets 1-1 through 1-5).
- README refresh reviewed: [e5e7f9d](https://github.com/tgothe418-bot/The-Terror-Machine/commit/e5e7f9de5e3bfed16341c91d41229317692f093c).
- The branch was clean and synced when reviewed. The status below is based on live code inspection as well as reported tests; a packet's completion report is not accepted evidence by itself.

## Current baseline

### Landed

- Atomic turn pipeline: snapshot, model generation, ratification, one commit or fail-closed result, retake, and telemetry.
- Canonical topology and intent-bound expansion at an unmapped boundary.
- Role-aware participation for Protagonist, Antagonist, and Director, including explicit authority and limits for antagonist play.
- Blueprint and Haunted House / Ad-Lib Induction paths converging on shared Engine contracts.
- Canonical consequences, cast presence and continuity, stance, relationships, and bounded character memory.
- Phase 3H.5C World Memory: deterministic identity, bounded global/current-node prompt projection, required proposal and receipt contracts, fail-closed validation, canonical commit, and export evidence.
- Forge source review through the accepted Packet 02A–07 corrective sequence.
- Engine Corrective Packet 08 — Human Turn Contract Reliability: the provider response schema is aligned to the application contract; concise creator-written input remains exact and shares the one-generation, ratification path with Autopilot; bounded mismatch diagnostics survive failure receipts and Markdown/HTML telemetry; creator acceptance is complete.
- Horror Grammar 0 — Provider-Refusal Containment Correction: provider block metadata is classified before parsing; empty/refused responses fail closed; synthetic player-action fallbacks are removed; Autopilot halts on failed generation or non-commit; human input and canonical state remain recoverable.

### Live, under review

#### Phase 3H.5D — Explicit Player-Character Binding

The live line can bind an exact selected cast ID, and human telemetry demonstrates selection of a non-first eligible character. This phase is not accepted until setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry carry the same canonical identity end to end without relying on cast order.

#### Scenario authority enforcement

An Authority Contract appearing in a prompt is not enforcement. Causal authority must be adjudicated before an out-of-contract consequence, character change, durable memory item, or receipt can become canonical.

#### Forge required-field synthesis

The accepted Forge sequence provides the contracts and review lifecycle for a source-grounded Depiction Contract, but imported reference material does not yet reliably activate that path. A real Blueprint import populated premise, location, cast, and topology while leaving all four required Depiction Contract fields empty: dramatic register, directness, aftermath, and ambiguity handling.

The export gate behaved correctly by blocking the incomplete artifact. The remaining defect is upstream: when the accepted Source Baseline contains adequate evidence, the Architect should stage a complete, grounded proposal instead of leaving required fields blank. When evidence is inadequate, the Forge should expose a specific authoring gap and preserve uncertainty rather than generating a canned fallback.

#### Inherited global TypeScript debt

Packet 07's Forge stabilization passed the complete Vitest suite, full lint, and production build. Packet 08's TypeScript check was clean inside its boundary, but the global command still reports inherited errors in `ArchitectChat.*`, `src/core/engine/sessionPersistence.test.ts`, `src/core/store.ts`, and `useForgeStore.*`. Those errors remain explicit debt; they must not be described as a green TypeScript gate.

## Horror Grammar 1 construction ledger

The Horror Grammar 1 series is present on the live line, but the series is not accepted as an integrated milestone. Its purpose is to let the Blueprint provide values, pursuits, fictional time, and narrative pressure so non-User characters can continue pursuing their own concerns without turning the Engine into a visible stat system. The User supplies actions; the Engine may commit only causally supported changes.

| Packet | Construction boundary | Current disposition |
|---|---|---|
| **1-1 — Forge value and pursuit foundations** | Value and pursuit types, provenance, Blueprint authoring, and proposal foundations are present. | Implementation present; cross-boundary continuity still open. |
| **1-2 — Fictional time and cast activity selection** | Fictional-time ledger, activity scheduling, and bounded offscreen opportunity selection are present. | Implementation present; real consecutive-turn handoff still open. |
| **1-3 — Validated non-User initiative and situated pressure** | Initiative and pressure ratifiers plus isolated narrative composition are present. | Implementation present; exact authority/perception/speaker/source validation still open. |
| **1-4 — Causal value, pursuit, and character evolution** | Value state, pursuit overlays, development, and pressure-thread lifecycle structures are present. | Implementation present; canonical state threading and publication still open. |
| **1-5 — Forensic telemetry and integration gate** | Forensic/export scaffolding and integration tests are present. | Implementation present; typed Runtime forensic evidence and real multi-turn acceptance still open. |

### Critical integration closure

1. **State threading:** extend the actual Engine turn context and route contract with bounded HG1 state, initialize it from the accepted Blueprint, and publish the ratified post-state without empty fallbacks replacing prior ledgers.
2. **Authority and perception:** resolve exact Blueprint authority and evidence references; require the correct actor, channel, location, and situated knowledge for activity and pressure manifestations; reject ungrounded or misattributed changes before canon and narrative composition.
3. **Forensic boundary:** add a typed, bounded forensic record and a readable Runtime view. Preserve exact rejected proposal evidence only in that labeled forensic section; keep provider metadata, credentials, stack traces, endpoint details, and rejected material out of story, prompt, and ordinary canonical history.
4. **Integration proof:** exercise two consecutive real turns, a rejected/refused turn, and Retake with state-preservation and forensic-isolation assertions. Focused tests belong to this closure; the full suite and broad tooling gates belong at the declared stabilization point.

Horror Grammar 2 is not started. No subsequent grammar packet should be treated as active implementation until this closure is accepted.

## Accepted Forge corrective sequence

The source-to-Blueprint handoff is now one reviewable chain rather than a set of loosely connected features. Acceptance of that infrastructure does not claim that every import currently reaches each required authoring step automatically.

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

The post-07 mount correction ensures that the normal closed-to-open Export Review path actually creates the first snapshot rather than initializing while hidden.

## Accepted Engine corrective sequence

| Packet | Accepted boundary |
|---|---|
| **08 — Human Turn Contract Reliability** | The provider schema now projects the authoritative application response contract more faithfully. Concise creator input is preserved verbatim and follows the same one-generation, fail-closed route as Autopilot. Safe schema-failure paths and codes survive the failure receipt and Markdown/HTML telemetry. Focused tests, scoped lint, a scoped-clean TypeScript result, production build, and creator live smoke acceptance are recorded. |
| **Horror Grammar 0 — Provider-Refusal Containment Correction** | Provider refusal and empty-response metadata are classified before parsing; route failures omit synthetic action input; Autopilot stops on failed generation or non-commit; human input is recoverable and canonical state remains unchanged. |

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

### 2. Complete source-to-required-field synthesis

Connect imported Source Baseline evidence to the existing proposal lifecycle for required Blueprint fields, beginning with the Depiction Contract.

Acceptance requires:

- detection of required fields that remain empty after source analysis and accepted candidate application;
- a Depiction Contract generation action that is reachable in the normal imported-source workflow without hidden manual setup;
- a complete proposal for dramatic register, directness, aftermath, ambiguity handling, and special boundaries;
- grounding in accepted evidence, accepted creator decisions, and deliberately preserved uncertainties;
- no canned fallback, placeholder value, or silent direct mutation of the draft;
- an explicit, field-addressable gap when the source cannot support a responsible proposal;
- revision-bound review, apply, dismiss, refresh, and stale-state behavior through the already accepted lifecycle;
- an integration proof beginning with imported source material and ending with either a reviewable complete proposal or an honest unresolved requirement.

This work should inspect other required Blueprint fields for the same omission pattern, but it must not invent material merely to make Export Review turn green.

### 3. Close the inherited baseline and 3H.5D

Repair the inherited TypeScript errors without weakening Engine contracts, then finish explicit Player-Character Binding.

Acceptance requires:

- one canonical `player_character_id` selected from the eligible cast;
- the stored ID surviving setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry;
- role eligibility and seat availability enforced without relying on cast order;
- human and automated runs exercising first and non-first eligible selections;
- focused proofs plus the appropriate broad suite, TypeScript, lint, build, and diff gates;
- no Blueprint names, cast assumptions, or scenario literals in production instructions.

### 4. Enforce authored participation and treatment at the Engine boundary

The Engine must use accepted Blueprint contracts while retaining deterministic ownership of causality and canon.

Acceptance requires:

- authority adjudication before prose generation and before any canonical consequence, character state, or durable memory commits;
- a thought-, perception-, or motivation-only antagonist never receiving ratified direct physical reach unless its Authority Contract expressly grants it;
- the Depiction Contract shaping framing and directness without granting causal authority;
- a structured treatment receipt recording direct depiction, abstraction/aftermath, or a refusal to render;
- provider refusal represented as a distinct Engine event, never as player input;
- tests for authority denial, permitted direct depiction, scenario-authored abstraction, provider refusal, retake, and unchanged canonical state on a blocked result.

Provider-level non-negotiable constraints remain external to the Blueprint contract. They must be represented honestly without pretending the player authored the refusal.

### 5. Make Autopilot identity-safe

Autopilot must receive the selected character's canonical context, use the same identity-bearing path as a human session, stop or retry deliberately after failure, and label generated input in telemetry and exports.

### 6. Finish durable continuity

Extend character and World Memory through the complete turn lifecycle with scoped, inspectable handoff. Every durable fact needs a source, scope, acceptance decision, and bounded prompt projection.

Campaign handoff must remain explicit rather than becoming an implicit global ledger.

### 7. Harden the Voice boundary

Keep Voice observations read-only and separate from simulation canon. Add evidence-labelled context, snapshot/export parity, and clear handling for Forge drafts, Engine sessions, outside research, and ordinary project conversation.

### 8. Prepare campaign, horror-grammar, and provider seams

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
