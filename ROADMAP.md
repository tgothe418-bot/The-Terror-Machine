# The Terror Machine — Technical (Public) Roadmap

This is the public technical record for **The Terror Machine**: what the machine can do, what has been accepted, and what it is being built to do next.

It is directional rather than a release calendar. There are no promised dates, feature quotas, or claims that one green test is the same thing as an accepted milestone.

For the experiential front door, read the [README](./README.md). For the detailed engineering ledger, read the [Development Roadmap](./DEVELOPMENT-ROADMAP.md).

## The machine at present

TTM has a working foundation for bounded horror simulation.

A Blueprint or a Haunted House Induction enters the same Engine path. A turn is snapshotted, interpreted, generated, ratified, committed once or refused without corrupting canonical state. The application—not the language model—owns the places, cast, roles, consequences, receipts, and the state that survives a paragraph.

### Live foundation

- A schema-bound atomic turn path: snapshot → generation → ratification → commit or fail.
- Canonical spatial topology, including deliberate expansion at an unmapped boundary.
- Protagonist, Antagonist, and Director participation, with explicit antagonist authority and limits.
- Blueprint authoring and Haunted House / Ad-Lib Induction entry paths.
- Cast presence, character stance, relationships, bounded character memory, and bounded World Memory.
- Deterministic consequences, receipts, telemetry, Markdown/HTML diagnostics, and retake of the most recent completed turn.
- Development recovery through Clear System Memory and Autopilot as a soak-testing instrument.

### The Forge source-review path

The corrective Forge sequence through Packet 07 is landed.

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
- capture one reviewed artifact whose Copy and Download bytes remain identical until the creator refreshes a stale review.

This does not mean every imported source automatically produces an export-ready Blueprint. It means the source-to-Blueprint authoring boundary is now a working system rather than a collection of adjacent prototypes.

### Current verification line

The remaining active questions include one important Forge completeness issue as well as several Engine boundaries:

- **Required-field synthesis from source:** imported reference material can populate premise, setting, cast, and topology while still leaving required Blueprint fields blank. Current testing exposed all four mandatory Depiction Contract fields as empty even though the source contained material from which the Architect should have been able to stage a grounded proposal. Export correctly blocks the incomplete Blueprint; the missing behavior is earlier in the authoring flow.
- **Explicit Player-Character Binding:** exact cast selection works in the live line and has been demonstrated with a non-first eligible character, but its complete end-to-end acceptance gate remains open.
- **Scenario authority enforcement:** an Authority Contract appearing in a prompt is not sufficient. Causal reach must be enforced before canon changes.
- **Provider-refusal containment:** an upstream refusal must never be mistaken for player input or an ordinary successful turn.
- **Global TypeScript debt:** the Forge stabilization sequence passed its complete test suite, lint, and production build, while two inherited type errors outside the Forge boundary remain openly tracked.

## What comes next

### 1. Complete source-to-required-field synthesis

When imported reference material supports a required Blueprint field, the Forge should turn that evidence into a reviewable proposal rather than leave the field silently empty.

The first confirmed case is the Depiction Contract: dramatic register, directness, aftermath, and ambiguity handling should be proposed from the accepted source baseline and creator decisions. The proposal must remain source-grounded, revision-bound, and subject to explicit review. If the source genuinely cannot support a field, the Forge should identify the gap instead of filling it with canned horror language.

### 2. Close the inherited Engine acceptance debt

Finish the global TypeScript baseline and close explicit Player-Character Binding across setup, initialization, turn context, prompts, ratification, receipts, retake, persistence, and telemetry.

The selected character must remain exact without relying on cast order or scenario-specific assumptions.

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
- Failed validation preserves canonical state and leaves useful evidence.
- Characters have situated knowledge. The player, author, model, and character do not automatically know the same things.
- Retake, exit, recovery, and diagnostics remain available to the person using the machine.
- Literary strangeness is welcome. Silent contradiction is not.

## Reading the maps

- [README](./README.md) — what the machine is for, and why someone might enter it.
- [Development Roadmap](./DEVELOPMENT-ROADMAP.md) — implementation order, acceptance rules, active debt, and verification discipline.
