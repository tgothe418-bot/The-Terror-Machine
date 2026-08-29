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

### Horror Grammar 1 — active, with integrated closure still open

The Horror Grammar 1 series (Packets 1-1 through 1-5) is now on the live line as construction. It adds a Blueprint-defined layer for values, pursuits, fictional time, bounded offscreen activity, non-User initiative, situated pressure, causally supported character change, and forensic review.

This is literary scaffolding, not a visible stat system. The User does not track meters or run a turn schedule. The Forge supplies the starting material; the Engine lets relevant characters pursue what they are pursuing, lets immediate participants act in the scene, and commits only changes the narrative and Blueprint can support.

The provider and route-admission gates are now accepted through Packets 1-10, 1-10A, and 1-10B. Recent live smoke telemetry has exercised the same Blueprint from protagonist and antagonist perspectives and has recorded accepted consequences, character reactions, and World Memory. The complete grammar milestone remains under review at three deeper seams:

- the new ledgers and overlays are not yet carried through the real client → server → client turn contract, so cross-turn continuity can be lost;
- activity and pressure manifestations still need exact authority, perception, speaker, source, and location validation before they may become canon;
- the forensic view needs a typed, bounded record that preserves reviewable rejected evidence only in a clearly labeled forensic section; provider and internal material must remain sanitized and excluded from story, prompt, and canonical history.

The Engine remains usable while this gate is open. This is a bounded integration hold, not a reason to stop using or testing the larger creative direction.

### Current verification line

Engine Corrective Packet 08 — Human Turn Contract Reliability — is accepted. A concise creator-written action has passed the normal live Engine path without being rewritten, padded, or sent through a separate parser. Invalid model output still fails closed; it now leaves bounded contract diagnostics in telemetry rather than an opaque failure receipt.

Horror Grammar 0 — Provider-Refusal Containment Correction — is accepted at the active generation boundaries. Explicit provider declines and empty responses are classified before parsing, synthetic fallback actions are gone, Autopilot halts on failed generation or non-commit, and a human command can be restored for retry without altering canonical state.

Horror Grammar 1 is implementation-landed and under critical integration review; it is not a completed milestone. The remaining active questions are:

- **Horror Grammar 1 continuity:** values, pursuits, fictional time, activity, pressure, and development state must survive the real turn request and response across consecutive turns instead of being replaced by empty boundary defaults.
- **Horror Grammar 1 authority and perception:** activity and pressure changes need exact, Blueprint-grounded authority, perception, speaker, source, and location evidence before they can become canon or enter the final narrative.
- **Horror Grammar 1 forensic evidence:** the Runtime drawer and raw/Markdown/HTML diagnostics need a typed, bounded forensic record with reviewable rejected evidence in an explicitly labeled section, while provider metadata, credentials, stack traces, and endpoint details remain out of ordinary story and prompt context.
- **Explicit Player-Character Binding:** exact cast selection works in the live line and has been demonstrated with protagonist and antagonist perspectives; persistence and every recovery surface remain under end-to-end review.
- **Verification baseline:** the current live line passes the declared broad Vitest, TypeScript, lint, build, and diff gates. Future failures should be reported against that baseline rather than hidden as inherited debt.

## What comes next

### 1. Close the Horror Grammar 1 integration gate

Close the one critical seam before beginning another grammar phase. This is an integration and authority closure, not a request to re-audit every outlet.

The closure must:

- carry bounded values, pursuits, fictional time, activity, pressure, development, and Blueprint context through the actual client → server → client turn contract;
- initialize those structures from the accepted Blueprint and publish the ratified post-state without empty fallback objects overwriting prior state;
- adjudicate exact authority, perception, speaker, source, and location evidence before an activity or pressure manifestation can become canonical;
- expose a typed, bounded forensic record in the Runtime review surface and diagnostics, preserving rejected proposal evidence only in that clearly labeled forensic section;
- prove two consecutive real turns, a rejected or refused turn, and Retake preserve canonical state, narrative history, prompt context, and forensic separation.

The Engine should remain literary and User-readable throughout. Values and fictional time are internal scaffolding parsed from the Blueprint, not meters the User must track.

### 2. Close the remaining Engine identity acceptance debt

Finish explicit Player-Character Binding across setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry. The selected character must remain exact without relying on cast order or scenario-specific assumptions. Keep honest source-gap handling in the Forge, but do not reopen the completed Depiction Contract import path.

### 3. Enforce authored boundaries in the Engine

The Engine must distinguish two questions:

- **Can this actor cause this change?**
- **If the change is accepted, how may this Blueprint depict it?**

Authority is causal. The Depiction Contract shapes the narrative camera—dramatic register, directness, aftermath, ambiguity handling, and special boundaries—but it cannot grant powers that the Authority Contract does not provide.

Provider refusals are external events. They must be represented honestly, never serialized as player input or allowed to alter canonical state accidentally.

### 4. Make Autopilot a trustworthy test participant

Autopilot must run through the same identity-bearing turn path as a human player, receive the selected character's usable context, stop or retry deliberately after failed turns, and identify generated actions in telemetry and exports.

### 5. Make continuity durable

Character and World Memory should become a dependable, inspectable continuity layer for discoveries, rules, relationships, environmental conditions, and consequences.

The goal is not infinite memory. It is memory with scope, provenance, acceptance, and bounded prompt projection.

### 6. Deepen the Voice without giving it authority

The Voice remains read-only. Its future work is better evidence-labelled context: clear distinctions among a Forge draft, an Engine session, outside research, and ordinary project discussion.

### 7. Grow outward carefully

Once the current seams are stable:

- campaign continuity can move scoped state between authored Blueprints;
- a researched generative horror grammar can guide pressure, pacing, revelation, recovery, and fear without reducing them to genre presets;
- the Engine's model-provider boundary can become more replaceable.

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
