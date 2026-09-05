# The Terror Machine — Technical (Public) Roadmap

This is the public technical record for **The Terror Machine**: what the machine can do, what has been accepted, and what it is being built to do next.

It is directional rather than a release calendar. There are no promised dates, feature quotas, or claims that one green test is the same thing as an accepted milestone.

For the experiential front door, read the [README](./README.md). For the detailed engineering ledger, read the [Development Roadmap](./DEVELOPMENT-ROADMAP.md).

## The machine at present

TTM has a working foundation for bounded horror simulation.

A Blueprint or a Haunted House Induction enters the same Engine path. The core turn is snapshotted, interpreted, generated, ratified, committed once or refused without corrupting canonical state. The application—not the language model—owns the places, cast, roles, consequences, receipts, and the state that survives a paragraph. Horror Grammar 1 is active on that line; its provider boundary is closed, while deeper continuity, authority, and forensic acceptance remain explicitly tracked below.

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
- Gemini structured-output compatibility on the live turn path, with the supported JSON-schema subset owned at the provider boundary and provider failures returned as structured API errors.
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

### Gemini turn admission and runtime boundary

The Engine's Gemini structured-output boundary is closed through Packet 1-10B. The provider receives the exact supported JSON-schema projection, all required HG1 envelopes remain present at ingress, and the authoritative Zod contract still validates the returned object after the provider responds. Refusals, empty responses, invalid provider requests, and non-JSON runtime responses fail closed without mutating canonical state or inventing player input.

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

With the Horror Grammar 1 integration gate, full multi-turn continuity, and Engine identity debt closed, future work proceeds along explicit architectural boundaries:

### 1. Enforce authored boundaries and participant treatment

The Engine maintains strict causal ownership:
- Authority is causal; the Depiction Contract shapes narrative register, directness, aftermath, and ambiguity without granting unearned capabilities.
- Antagonists without physical reach remain bounded to psychological, observational, or systemic influence.
- Provider refusals remain external events, never converted to player actions.

### 2. Universal warning and intervention window (Deferred Boundary)

Design and introduce a universal warning and intervention window prior to permanent or fatal loss. (Preserved as explicitly deferred from the Astra Critical Corrections series).

### 3. Voice context enhancements (Deferred Boundary)

The Voice remains strictly read-only and non-authoritative. Future work will provide evidence-labelled context distinguishing Forge drafts, Engine sessions, and background research without granting simulation authority.

### 4. Telemetry polish and prose-only export (Deferred Boundary)

Refine Runtime diagnostic drawer presentation, add dedicated prose-only export formats alongside technical forensic telemetry, and expand multi-scenario integration fixtures.

### 5. Multi-Blueprint campaign continuity

Campaign continuity can move scoped state between authored Blueprints without merging them into an implicit global ledger.

### 6. Horror Grammar 2 (Independent Future Milestone)

Horror Grammar 2 remains an unstarted, independent milestone. Research into generative dread pacing, revelation staging, and tension decay will begin only on this stable, verified HG1 foundation.

Active construction has moved to Antigravity. Google Gemini remains the application's current model provider through `@google/genai`; provider neutrality is still a design direction rather than a present-tense claim.

## What will not change

- The application owns canon. The model may propose; it does not commit.
- A proposal is not a commit, whether it came from source extraction, an Architect response, a turn generator, or a memory suggestion.
- Blueprint data supplies authored context; it does not become a hidden runtime instruction or a scenario-specific exception in Engine code.
- Values, pursuits, and fictional time are Blueprint-derived literary scaffolding, not stats the User must track or a hidden game mechanic.
- Failed validation preserves canonical state and leaves useful evidence.
- Characters have situated knowledge. The player, author, model, and character do not automatically know the same things.
- Retake, exit, recovery, and diagnostics remain available to the person using the machine.
- Literary strangeness is welcome. Silent contradiction is not.

## Reading the maps

- [README](./README.md) — what the machine is for, and why someone might enter it.
- [Development Roadmap](./DEVELOPMENT-ROADMAP.md) — implementation order, acceptance rules, active debt, and verification discipline.
