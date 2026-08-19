# THE TERROR MACHINE

<p align="center"><strong>A FREE <a href="#the-terror-machine">HOUSE</a></strong></p>

The Terror Machine is an experimental, state-driven horror simulator. A language model interprets actions, performs characters, and renders the experience—but the application owns what becomes true.

> The room exists even when the prose looks away.

## What It Is

TTM is not a chatbot that merely tells a horror story. It is an attempt to build a persistent simulation in which language-model improvisation is constrained by mechanical state.

Rooms remain where they were. Doors connect to specific places. Characters have bounded knowledge, presence, and continuity. Actions can change the world, but only after the Engine accepts the change under an explicit contract.

> The model proposes. The machine decides.

The project values fidelity before verbosity, agency with consequences, situated knowledge, and memory-bearing change. A short response that respects the world is more useful than beautiful prose that silently contradicts it.

## The Three Nodes

### `[ THE VOICE ]` — Conversation and Observation

The Voice is a one-way mirror onto the project: it can discuss ideas, research, and running state without altering a simulation or contaminating its context.

### `[ THE FORGE ]` — Scenario Architecture

The Forge turns authored intention into machine-readable structure: premise, cast, environment, topology, constraints, and narrative pressure. It supports designed Blueprints alongside looser Haunted House Induction.

### `[ THE ENGINE ]` — Simulation

The Engine runs both entry paths through the same schema-bound turn pipeline. A player can participate as a Protagonist, Antagonist, or Director. Antagonist play uses explicit Authority and Limits; other characters remain independent actors rather than puppets.

## What the Current Build Can Do

- Accept one action at a time through a schema-bound, server-normalized turn contract.
- Preserve canonical topology and allow new space to materialize only through an authorized movement attempt at an unmapped boundary.
- Evaluate intent, causal feasibility, role boundaries, movement, and dialogue targets before committing state.
- Track bounded cast presence and continuity, with receipts retained in diagnostic exports.
- Produce human-readable telemetry alongside canonical turn receipts for development review.
- Retake the most recent completed turn—including a terminal outcome—restoring the prior application state, Engine game state, and command input.
- Run authored Blueprint scenarios or begin with Haunted House Induction.

This is a working foundation, not a finished simulation. The Engine has strong boundaries around the state it currently owns; deeper character relationships, durable memories, and broader world consequences are still being built deliberately.

## How a Turn Works

| Stage | Responsibility |
|---|---|
| Snapshot | Capture the authoritative state before the action. |
| Generation | Ask the model for bounded narrative and proposal data. |
| Ratification | Compare proposals with topology, cast, role, and contract rules. |
| Commit or fail | Commit accepted state once, or preserve canonical state with a failure receipt. |
| Retake | Restore the immediately preceding checkpoint when the player wants another approach. |
| Telemetry | Retain diagnostic evidence of the turn and its accepted result. |

The simulation may be hostile to a character, but it should never be hostile to the person using it. Retake, exit, and other out-of-fiction controls belong outside the narrative and remain part of the design.

## Public Roadmap

The roadmap is intentionally directional rather than a promise of dates or feature volume.

1. **Deeper consequences** — durable character state, relationships, memory, and a tightly controlled world-state ledger.
2. **A better Voice** — a seamless conversational observer that recognizes when a question is about a Forge draft, an Engine turn, outside research, or simply conversation. It will use only bounded, evidence-labelled snapshots when relevant, never alter a simulation, and remain separate from its canon.
3. **Campaign continuity** — multi-Blueprint stories with explicit, scoped state handoff between acts.
4. **Generative horror grammar** — research-driven mechanics for pressure, pacing, fear, revelation, and recovery rather than a library of preset plots.
5. **Authoring and observation** — clearer scenario construction, readable simulation surfaces, and better diagnostic views.
6. **Provider flexibility** — a future model boundary that preserves the Engine contract while allowing the underlying provider to change.

## Content, Difficulty, and Agency

Planned content settings are simulation contracts, not merely filters for blood or language. Lower settings can provide stronger outcome protection; higher settings can allow harsher, causally earned failure. Sexual violence and pornographic sexual content are outside the project’s intended scope.

TTM is built for literary, curious visitors who want to examine a strange machine as much as they want to enter its haunted house.

## Development Tools

- **Autopilot** is a soak test that drives generated actions through the normal turn path.
- **Clear System Memory** is a development recovery control for TTM-owned persisted state.
- **Telemetry and exports** are diagnostic evidence, not a substitute for the canonical commit path.

## Technology

React, TypeScript, Vite, Express, Zustand, Zod, Tailwind CSS, Vitest, IndexedDB utilities, and Google Gemini through `@google/genai`.

Gemini in Google AI Studio is the current reference development runtime. A provider-neutral boundary is a longer-term goal, not a current claim.

## Running Locally

```bash
npm install
cp .env.example .env
npm run dev
```

Add a personal Gemini API key to `.env`. Never commit that file or paste a key into source code.

## Project Note

TTM is a private-first solo hobby project: an experiment in building a very particular horror machine, learning in public through code, and making something worth returning to.

The code is available under the [MIT License](./LICENSE).
