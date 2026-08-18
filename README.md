# THE TERROR MACHINE // THE NIGHTMARE MACHINE

<p align="center">
  <img src="./assets/TNM_Logo_1.png" alt="TNM Logo 1" width="800"/>
</p>

<p align="center">
  <img src="./assets/free-haunted-house.svg" alt="Free Haunted House" width="620"/>
</p>

The Terror Machine is an experimental, state-driven horror simulator. A language model interprets actions, performs characters, and renders the experience—but the application is supposed to own what is true.

The room exists even when the prose looks away.

> **Development status:** TTM is an active contract-driven build. The Voice, Forge, and Engine surfaces are present, and the current branch has green local verification gates. The Engine now carries authored dialogue context through the turn contract and maintains bounded cast-continuity state across committed turns, with continuity receipts retained in diagnostic exports. Broader world-state coverage, richer memory, and additional role behavior remain active roadmap work.

## What TTM Is

TTM is not a chatbot that simply tells a horror story to the person using it. It is an attempt to build a persistent simulation in which language-model improvisation is constrained by mechanical state.

Rooms remain where they were. Doors connect to specific places. Characters carry consequences forward. Knowledge is unevenly distributed. Actions can change the world, but only when the Engine accepts those changes as valid.

The language model provides interpretation, performance, atmosphere, and prose. The application provides continuity, boundaries, memory, topology, and state authority. This separation is the central idea behind TTM:

> The model proposes. The machine decides.

TTM is designed around several priorities:

- **Fidelity before verbosity.** A short response that respects the world is more valuable than beautiful prose that contradicts it.
- **Agency with consequences.** Choices should matter, including the possibility of failure at higher content settings, without making the application hostile to the person using it.
- **Situated knowledge.** Characters should act from what they know, what they believe, what they can perceive, and what they are physically capable of doing.
- **Memory-bearing consequences.** Events should remain meaningful after the immediate prose has passed. Injuries, discoveries, changed rooms, broken routes, relationships, and failed attempts should shape what follows.
- **Generative horror grammar.** TTM is intended to learn the structures and pressures of horror—its aesthetics, pacing, psychology, language, and narrative logic—rather than reproduce a library of plots.
- **Separation of concerns.** Conversation, scenario design, and simulation occupy distinct state boundaries so that one mode cannot casually contaminate another.

The goal is not to make the Engine “win” against the person using it. The goal is to make the fictional world coherent enough that actions, risks, discoveries, and consequences feel earned.

## The Three Nodes

### `[ THE VOICE ]` — Conversation and Observation

The Voice is TTM’s conversational intelligence: a place to explore ideas, discuss research, and talk about what the system is doing.

It has a one-way-mirror relationship with the Forge and Engine. It may observe and comment on their state, but it must not alter their data, inject instructions into a running scenario, or leak conversational context into the simulation.

### `[ THE FORGE ]` — Blueprint Architecture

The Forge is the deliberate design path. It helps define a scenario’s premise, cast, environment, topology, constraints, and narrative pressures, then exports a structured Blueprint for the Engine.

This is where authored intention becomes machine-readable architecture. A Blueprint can describe a tightly authored scenario with known characters, places, connections, conditions, and narrative pressures before the simulation begins.

### `[ THE ENGINE ]` — Simulation

The Engine runs scenarios through two complementary entry paths:

- **Blueprint Mode:** load a structured scenario, inspect it, choose a participation orientation, and initialize or resume the simulation.
- **Haunted House Induction:** define a scenario directly through a compact set of authored details without first creating a complete Blueprint.

Both paths converge on the same stateful turn pipeline. Haunted House Induction is not a disposable demo path. It is a looser authoring surface that can materialize details as they become relevant while still obeying the same canonical state, geometry, memory, ratification, and telemetry rules as a designed scenario.

The Engine supports three participation orientations:

- **Protagonist:** inhabit a character acting within the scenario.
- **Antagonist:** inhabit an in-world opposing character or environmental force.
- **Director:** provide bounded scene framing, pacing, and dramatic pressure without becoming an omnipotent in-world editor.

Antagonist participation is governed by an explicit Authority Contract describing what the participant can perceive, reach, or alter, together with non-negotiable Limits. Those boundaries may describe an ordinary human threat, a supernatural entity, a distributed environmental force, or something with godlike scope. The Engine does not assume that every antagonist is human, but it also does not grant power that the scenario has not authored.

Victims remain independent participants rather than puppets or substitute protagonists. Their reactions, decisions, fear, resistance, injuries, and escape attempts belong to the simulation.

## Current Implementation Status

The current build has a working foundation across all three nodes:

- **Forge:** source material can be ingested, reviewed, and shaped into a structured Blueprint for the Engine.
- **Engine contracts:** Blueprint and Ad-Lib entry paths converge on a schema-bound, ratified turn pipeline with deterministic state application.
- **Dialogue vertical slice:** authored expression and behavior profiles are carried into Engine context; dialogue blocks are validated against context boundaries; and explicit addressed-speaker selection is deterministic.
- **Cast continuity:** each eligible cast member has bounded skepticism state. Server-accepted continuity deltas are normalized, committed with the turn, and retained in a versioned cast-continuity receipt for diagnostic export.

This is a foundation, not the finished simulation. Presence/location, bounded stance, relationships, durable memory, and broader world-state mutation remain deliberately staged follow-on work.

## How a Turn Works

TTM is organized around one authoritative transaction. The current dialogue and cast-continuity slices exercise this contract; wider world-state coverage is still being built on the same boundary.

| Stage | Responsibility |
|---|---|
| Input | Accept one action from a human player or the Autopilot stress runner. |
| Snapshot | Capture the relevant world, character, phase, tension, memory, inventory, and topology state. |
| Generation | Ask Gemini for a schema-bound proposal containing narrative blocks and state deltas. |
| Ratification | Reject impossible movement, invalid topology, contract drift, and other mechanical contradictions. |
| Commit or Fail | Apply an accepted result once through the atomic turn reducer, or preserve canonical state through a failure receipt. |
| Telemetry | Record the request, raw response, accepted deltas, pre-state, post-state, latency, and related diagnostic data. |

The language model can propose what happens. The Engine determines what actually happened.

## Horror, Difficulty, and the User

TTM treats horror as more than a collection of frightening images or violent outcomes. It is interested in pressure: what a character understands, what they misunderstand, what they cannot control, what they are forced to notice, and what remains with them afterward.

The simulation should be capable of fear, dread, uncertainty, disgust, violation, pursuit, isolation, helplessness, revelation, and transformation without reducing those experiences to arbitrary numbers or generic escalation.

TTM’s planned content presets are simulation contracts rather than simple filters for blood or language:

- Lower settings reduce explicitness, soften pressure, and provide stronger protection against terminal failure.
- Higher settings permit harsher material, less outcome protection, and causally earned failure.
- Sexual violence and pornographic sexual content remain outside the intended system even at the least restricted setting.

The simulation may be hostile to the character, but it should never be hostile to the person using it. Pause, retake, and exit controls belong outside the fiction and should remain available regardless of the current scene.

## Developer and Stress Tools

- **Autopilot** is an adversarial soak test, not an alternate game. It drives consecutive generated actions through the same turn path as a human player to expose state collapse, topology hallucination, repetition, and token exhaustion.
- **Clear System Memory** is a development recovery control. Its intended behavior is to purge only TTM-owned persisted state and isolated IndexedDB data, preserve API credentials and unrelated browser data, then reload cleanly.
- **Telemetry** is local diagnostic evidence. Raw execution data is the useful source of truth; human-readable reports should be derived from that record, never substituted for it.
- **HTML exports** retain detailed diagnostic information for development reference even when certain transport-level notices are filtered from the live narrative surface.

## Testing

The project uses Vitest for behavioral, integration, schema, reducer, topology, dialogue, continuity, export, and lifecycle verification. TypeScript checking, ESLint, production builds, and whitespace/conflict checks are part of the local verification path.

The current live branch passes its local verification gates. These checks verify contracts and state behavior at the repository level; they do not replace a separate hands-on review of the running interface.

## Near-Term Direction

The next foundation layers are intentionally narrow: bounded cast presence, then bounded character stance, followed later by relationships and durable memory. Each layer will be ratified, observable, and independently verified before it is allowed to influence more of the simulation.

## Current Technology

- React 19 and TypeScript
- Vite 6
- Express
- Zustand 5
- Zod 4
- Tailwind CSS 4
- Google Gemini through `@google/genai`
- Browser persistence through Zustand and IndexedDB utilities
- Vitest for verification

Gemini in Google AI Studio is the current reference development runtime. A future provider-neutral model boundary remains a longer-term goal, not a current feature.

## Running the Project

Google AI Studio is currently the environment in which TTM is developed and previewed. It supplies `GEMINI_API_KEY` through its Secrets panel.

The repository exposes the expected local commands:

```bash
npm install
cp .env.example .env
npm run dev
```

Add a personal Gemini API key to `.env` before starting the server. Never commit that file or paste a key into source code.

## Project Note

TTM is a private-first, solo hobby project by a first-time developer working with AI collaborators. It is being built for experimentation, learning, and the pleasure of making a very particular machine—not for a current commercial release or a generalized audience.

The code is available under the [MIT License](./LICENSE).
