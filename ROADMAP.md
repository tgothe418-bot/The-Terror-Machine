# The Terror Machine — Technical (Public) Roadmap

This is the public technical record for **The Terror Machine**: what the machine can do, what is being verified, and what it is being built to do next.

It is directional rather than a release calendar. There are no promised dates, feature quotas, or claims that a green focused test is the same thing as an accepted milestone.

For the experiential front door, read the [README](./README.md). For the detailed operating ledger, read the [Development Roadmap](./DEVELOPMENT-ROADMAP.md).

## The machine at present

TTM already has a working foundation for bounded horror simulation.

A Blueprint or a Haunted House Induction enters the same Engine path. A turn is snapshotted, interpreted, generated, ratified, committed once or refused without corrupting canonical state. The application, rather than the language model, owns the places, cast, roles, consequences, receipts, and the state that survives a paragraph.

### Live foundation

- A schema-bound atomic turn path: snapshot → generation → ratification → commit or fail.
- Canonical spatial topology, including deliberate expansion at an unmapped boundary.
- Protagonist, Antagonist, and Director participation, with explicit antagonist authority and limits.
- Blueprint authoring and Haunted House / Ad-Lib Induction entry paths.
- Cast presence, character stance, relationships, bounded character memory, and bounded World Memory.
- Deterministic consequences, receipts, telemetry, Markdown/HTML diagnostics, and retake of the most recent completed turn.
- Development recovery through Clear System Memory and Autopilot as a soak-testing instrument.

### Current verification line

Two lines of work are active and intentionally not being conflated.

**Engine identity and containment**

- Explicit Player-Character Binding is under review. An exact selected cast ID has been demonstrated through human telemetry, including a non-first eligible character; the full end-to-end acceptance gate remains open.
- Scenario-bound authority enforcement and provider-refusal containment remain under review. A prompt carrying a boundary is not sufficient evidence that the Engine has enforced it.

**Forge source review**

The Forge is being corrected from a useful extraction surface into a dependable authoring boundary.

The first three repair slices are live and awaiting combined review:

- **02A — Candidate Decisions:** binary source-candidate decisions and staged review semantics.
- **02B — Architect Response Isolation:** structured Architect-response validation and identity matching before a response can enter the authoring flow.
- **02C — Retake Identity:** strict checkpoint session and Blueprint identity matching for retake safety.

These are foundations, not a declaration that the full source-baseline, resolution, Depiction Contract, or export lifecycle is complete.

## What comes next

### 1. Complete the Forge’s source-to-Blueprint handoff

A source document should be evidence, not an uncontrolled author.

The next Forge work makes the Architect’s conversation, the accepted source baseline, and the resulting Blueprint operate as one reviewable chain:

1. **Strict Architect server protocol** — typed, bounded requests and responses rather than loose history payloads, Markdown JSON heuristics, or fabricated fallback results.
2. **Resolution transaction** — an accepted ambiguity decision must update the ledger and its schema-backed Blueprint fields together, or fail without partial state.
3. **Baseline revision and proposal state** — durable source-baseline revisioning, persisted staged proposals, and clear stale-state handling.
4. **Depiction generation protocol** — the Architect receives the accepted source evidence, authoring decisions, current draft, and preserved uncertainties required to propose a faithful Depiction Contract.
5. **Depiction Contract lifecycle** — generate, inspect, edit, accept, dismiss, persist, and invalidate an authoring proposal without a hidden mutation.
6. **Evidence drawer** — keep source provenance close at hand without making the review screen an endless vertical document.
7. **Export artifact and review snapshot** — review one revision-bound Blueprint artifact, block incomplete source work, and export exactly what was reviewed.

The desired result is simple to state: a creator can bring in a source, inspect what the Forge believes it found, answer or deliberately preserve uncertainties in the Architect conversation, accept a treatment contract that actually arose from that material, and export a Blueprint whose provenance remains inspectable.

### 2. Enforce authored boundaries in the Engine

The Engine must distinguish two questions:

- **Can this actor cause this change?**
- **If the change is accepted, how may this particular Blueprint show it?**

Authority is causal and must be adjudicated before canon. A Blueprint-specific treatment contract shapes the narrative camera—directness, implication, aftermath, dramatic register, and special boundaries—but cannot grant an actor powers the Authority Contract does not give them.

Provider refusals are external events. They must be represented honestly, never serialized as player input or allowed to alter canonical state by accident.

### 3. Make continuity durable

Character and World Memory should become a dependable, inspectable continuity layer for discoveries, rules, relationships, environmental conditions, and consequences.

The goal is not infinite memory. It is memory with scope, provenance, acceptance, and a bounded prompt projection.

### 4. Make Autopilot a trustworthy test participant

Autopilot must run through the same identity-bearing turn path as a human player, receive the selected character’s usable context, stop or retry deliberately after failed turns, and identify generated actions in telemetry.

### 5. Deepen the Voice without giving it authority

The Voice remains read-only. Its future work is better evidence-labelled context: clear distinctions among a Forge draft, an Engine session, outside research, and ordinary project discussion.

### 6. Grow outward carefully

Once the current seams are stable:

- campaign continuity can move scoped state between authored Blueprints;
- a researched generative horror grammar can guide pressure, pacing, revelation, recovery, and fear without reducing them to genre presets;
- the Engine’s provider boundary can become more replaceable.

Gemini in Google AI Studio is the current reference development runtime. Provider neutrality is a design direction, not a present-tense claim.

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
- [Development Roadmap](./DEVELOPMENT-ROADMAP.md) — implementation order, acceptance rules, active defects, and verification discipline.
