# THE TERROR MACHINE // THE NIGHTMARE MACHINE

<p align="center">
  <img src="./assets/TNM_Logo_1.png" alt="TNM Logo 1" width="800"/>
</p>

<p align="center">
  <img src="./assets/free-haunted-house.svg" alt="Free Haunted House" width="620"/>
</p>

The Terror Machine is an experimental, state-driven horror simulator. A language model interprets actions, performs characters, and renders the experience—but the application is supposed to own what is true.

The room exists even when the prose looks away.

> **Development status:** TTM is a working contract-recovery build with green local gates. The interface runs, TypeScript type-checking and ESLint are clean, 60 tests across 9 test files pass in Vitest, and production builds succeed. However, core architecture remains incomplete: the canonical request/result/snapshot/delta contracts, an atomic `TURN_COMMITTED` state reducer, live Runtime convergence on the ratified turn path, and full raw-receipt telemetry remain active work. The test suite is still emerging, GitHub CI enforcement is not yet present, and some visible controls lead to partial or legacy implementations.

## What TTM Is

TTM is not meant to be a chatbot that tells a horror story at you. It is an attempt to build a persistent simulation in which language-model improvisation is constrained by mechanical state: rooms remain where they were, doors connect to specific places, characters carry consequences forward, and fear develops through pressure rather than arbitrary escalation.

Its priorities are:

- **Fidelity before verbosity.** A short response that respects the world is more valuable than beautiful prose that contradicts it.
- **The model proposes; the machine decides.** Gemini supplies interpretation, performance, and prose. Deterministic application logic must validate and commit the resulting state.
- **Agency with consequences.** Player choices should matter, including the possibility of failure at higher content settings, without making the application hostile to the person using it.
- **Generative horror grammar.** Research should teach TTM how horror works—its aesthetics, pacing, psychology, language, and structure—rather than give it plots to imitate.
- **Separation of concerns.** Conversation, scenario design, and simulation occupy distinct state boundaries so that one mode cannot casually contaminate another.

## The Three Nodes

### `[ THE VOICE ]` — Conversation and Observation

The Voice is TTM's conversational intelligence: a place to explore ideas, discuss research, and talk about what the system is doing. It has a **one-way-mirror** view of the Forge and Engine. It may observe and comment on their state, but it must not alter their data, inject instructions into a running scenario, or leak conversational context into the simulation.

### `[ THE FORGE ]` — Blueprint Architecture

The Forge is the deliberate design path. It collaborates with the user to define a scenario's premise, cast, environment, topology, constraints, and narrative pressures, then exports a structured Blueprint for the Engine. This is where authored intention becomes machine-readable architecture.

### `[ THE ENGINE ]` — Simulation

The Engine runs the scenario. Its two entry paths are visible from the beginning:

- **Blueprint Mode:** load a Forge export, inspect it, choose an available orientation, and initialize or resume the simulation.
- **Ad-Lib Induction:** generate a fresh procedural haunted house from a compact set of controls such as scale, aesthetic, and tone, then enter it without first authoring a full Blueprint.

Both paths are intended to converge on the same stateful turn loop. Haunted House/Ad-Lib Induction is a featured use of TTM, not a disposable demo path. It is deliberately looser about pre-authored facts and may materialize details just in time, but it must obey the same canonical state, geometry, memory, ratification, and telemetry rules as a designed scenario.

The current Gothic, Industrial, Liminal, and Occult reference bundles are temporary compatibility stand-ins for the emerging Cluster system. They should remain together until the Cluster loader replaces them; they are not four finished, independently functional systems.

The current reference experience is a single **Protagonist** character facing one primary antagonist. Antagonist-facing controls and concepts are present in the code, but that role is not yet a dependable play mode. A proper Antagonist mode—and later a Director orientation—will be added as role policies over the same underlying simulation, not as separate engines.

## How a Turn Is Supposed to Work

The default-branch architecture is being consolidated around one authoritative transaction:

| Stage | Responsibility |
|---|---|
| Input | Accept one action from a human player or the Autopilot stress runner. |
| Snapshot | Package the relevant world, character, phase, tension, inventory, and topology state explicitly. |
| Generation | Ask Gemini for a lean, schema-bound proposal: narrative blocks plus state deltas. |
| Ratification | Reject impossible movement, invalid topology, contract drift, and other mechanical contradictions. |
| Commit | Apply the accepted action and result once, atomically, through `TURN_COMMITTED`. |
| Telemetry | Record immutable pre-state, request, raw response, accepted deltas, post-state, latency, and token use. |

That complete path is the architectural target, not a claim that every stage is already integrated correctly at this recovery commit.

## Horror, Difficulty, and the User

TTM's planned content presets are more than filters for blood or language. They are simulation contracts:

- Lower settings reduce explicitness, soften pressure, and provide stronger protection against terminal failure.
- Higher settings permit harsher material, less outcome protection, and causally earned failure.
- Sexual violence and pornographic sexual content remain outside the intended system even at the least restricted setting.

The simulation may be hostile to the character, but it should never be hostile to the user. Pause, retake, and exit controls belong outside the fiction and must remain available regardless of the current scene. These controls and the full rating contract are design commitments still awaiting complete implementation.

## Developer and Stress Tools

- **Autopilot** is an adversarial soak test, not an alternate game. It should drive 20–50 consecutive generated actions through the exact same turn path as a human player to expose state collapse, topology hallucination, repetition, and token exhaustion.
- **Clear System Memory** is a development recovery control. Its intended behavior is to purge only TTM-owned persisted state and isolated IndexedDB data, preserve API credentials and unrelated browser data, then reload cleanly.
- **Telemetry** is local diagnostic evidence. The useful source of truth is raw execution data first; human-readable reports should be derived from that record, never substituted for it.

## Where the Default Branch Stands

`main` is the repository's only active development branch and the source of truth for current work. Historical recovery branches and commit references do not define the current workflow.

Local developer gates are currently green: static TypeScript type-checking (`npx tsc --noEmit`), ESLint, the 60-test Vitest suite, and production builds pass cleanly from a fresh checkout. However, automated GitHub CI enforcement is not yet configured, and the core simulation architecture is still being built.

Known critical work includes:

1. establish one canonical request, result, snapshot, and delta contract;
2. implement one atomic `TURN_COMMITTED` state reducer;
3. connect the Runtime to the ratified `/api/turn` pipeline without duplicate action ingestion;
4. rebuild telemetry around raw pre-state/request/response/post-state records;
5. expand deterministic test coverage before expanding generative features.

Until those steps land, continuity or apparent coherence in a short run should not be treated as proof that state is being preserved correctly.

## Current Technology

- React 19 and TypeScript
- Vite 6
- Express
- Zustand 5
- Zod 4
- Tailwind CSS 4
- Google Gemini through `@google/genai`
- Browser persistence through Zustand and IndexedDB utilities
- Vitest for the emerging test suite

Gemini in Google AI Studio is the current reference runtime. A future provider-neutral boundary remains a roadmap goal, not a feature of this baseline.

## Running the Project

Google AI Studio is currently the environment in which TTM is developed and previewed. It supplies `GEMINI_API_KEY` through its Secrets panel.

The repository exposes the expected local commands:

```bash
npm install
cp .env.example .env
npm run dev
```

Add a personal Gemini API key to `.env` before starting the server. Never commit that file or paste a key into source code.

**Current baseline:** Dependency installation, linting (`npm run lint`), static type-checking (`npx tsc --noEmit`), unit tests (`npx vitest run` — 9 test files / 60 tests), and production builds (`npm run build`) all pass cleanly in the local workspace. Note that while local gates are green, the underlying turn pipeline and state authority remain under active reconstruction.

## Project Note

TTM is a private-first, solo hobby project by a first-time developer working with AI collaborators. It is being built for experimentation, learning, and the pleasure of making a very particular machine—not for a current commercial release or a generalized audience. Its internal roadmap is the operating manual; this README is the front door for curious visitors.

The code is available under the [MIT License](./LICENSE).
