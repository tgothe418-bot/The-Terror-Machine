<p align="center">
  <strong>FREE HAUNTED <span style="color: #60a5fa;">HOUSE</span></strong>
</p>

<h1 align="center">THE TERROR MACHINE</h1>

<p align="center">
  <em>A persistent horror simulator for building, entering, and surviving impossible places.</em>
</p>

<p align="center">
  <a href="./ROADMAP.md"><strong>Technical Roadmap</strong></a> &middot;
  <a href="./DEVELOPMENT-ROADMAP.md"><strong>Development Roadmap</strong></a> &middot;
  <a href="#running-the-machine"><strong>Quickstart</strong></a> &middot;
  <a href="./LICENSE"><strong>MIT License</strong></a>
</p>

---

> **The room exists even when the prose looks away.**

Welcome, operator.

You have found **The Terror Machine**: a persistent horror simulator for building, entering, and surviving impossible places.

It is part haunted house, part authoring system, part unreliable oracle, and part very literal machine. You may bring it a screenplay, a novel, a fragment of lore, a floor plan, a nightmare, or nothing but a bad idea and a door. The machine will help turn that material into a world.

Then it will remember what happened there.

TTM uses language to bring a world with rules to life: a character can be frightened by something the player does not know, a discovered room can remain on the map, and a beautiful sentence cannot quietly change the past.

The central rule is simple:

> **The model proposes. The machine decides.**

Everything else follows from that.

Jump to: [Current Edition](#current-edition) · [Running the Machine](#running-the-machine) · [The Three Nodes](#the-three-nodes) · [Choose Your Seat](#choose-your-seat) · [A Turn in the Machine](#a-turn-in-the-machine) · [The Laws of the House](#the-laws-of-the-house) · [Roadmaps →](./ROADMAP.md)

## CURRENT EDITION

The Terror Machine is an open-source solo project in active development.

The first Horror Grammar gives the world a life between the player's actions. A glance, a conversation, and a long search need not cost the same amount of night. While the player studies one door, someone else may be testing a lock. An accepted change in a character's purpose follows them when they leave the room. The machine can place pressure in the scene without choosing the player's answer.

This edition brings that continuity through the complete session: the opening, successive turns, failed attempts, Retake, and recovery after reload. It strengthens the boundaries around cast presence, authored authority, User commitments, and the facts the world has already accepted. Recovery is built around complete saved revisions, with an explicit recovery state when a trustworthy continuation is unavailable.

The same attention extends to the prose. Dramatic pressure follows the scenario's physical possibilities. A character can reassure you, lie to you, or offer shelter without their dialogue being replaced by system-error text. Provider refusals remain visible failures outside the fiction.

The latest updates bring auditory presence, pure-text acoustic soundscapes, and contract lockstep resilience to simulation turns:
- **Comprehensive Vocalization & Acoustic Subsystem**: Beyond standard dialogue, the engine introduces first-class literary vocalization categories: spoken dialogue, internal monologue (private introspective thought), muttered soliloquy (`sotto voce`), radio/intercom transmissions, and acoustic bleed through observation ports and ductwork. Center Stage typography visually frames introspection (indigo italic), soliloquies (dashed amber), intercom/bleed (phosphor-cyan), and spoken speech (candle-amber).
- **Pure-Text Acoustic Soundscapes (Strictly Non-Audio)**: Zero Web Audio, zero synthesizers, zero speech synthesis, and zero audio hardware dependencies. Soundscapes and vocalizations are rendered purely via literary narrative text, CRT typography, typographic squelch markers (`> [CHIRP] ... [STATIC]`), shrouded obsidian acoustic bleed styling with chamber provenance (`[ ACOUSTIC BLEED // Name (via node) ]`), and em-dash broken delivery for interrupted speech.
- **Topological Adjacency & Epistemic Boundaries**: The auditory engine evaluates physical co-presence, open remote communication lines, and acoustic architectural links. Fail-closed adjacency validation checks offstage speech sources against connected rooms, auto-remediating single links and strictly enforcing one-directional epistemic constraints for overheard speech.
- **Forge Voice & Acoustic Dossiers**: First-class authoring of character expression profiles directly in the Forge: free-text cadence & rhythm notes, vocal tells (acoustic quirks), voice tone and texture, lexicon notes, silence directives, and scenario-agnostic camouflage leak guidance that triggers when character composure fractures under climax tension.
- **Engine Contract Lockstep & Provider Projection**: Full Zod schema synchronization between Forge authoring and `EngineTurnContext`, with provider JSON schema projection of `interrupted` and `acousticSourceNodeId`.
- **Conditioned Opening Establishment (`SYSTEM_INIT`) & Fail-Safe Invariants**: Solitary opening chambers dynamically permit internal monologue and muttered soliloquies while strictly forbidding room dialogue. Auto-remediation converts opening player speech to soliloquy or prose (for nonverbal mechanical entities like Entity-41), completely eliminating the solitary-character Critical Engine Failure.
- **1440p Ultrawide (`3440×1440`) Occult Scrying Apparatus**: A persistent 4-pane workstation featuring a 2.5× scaled, Fog-of-War `MapSketch` styled after Austin Osman Spare, a pure-text `MortalLedger` tracking active vessels and companion cohorts, and live-docked communion with The Historian.

The machine supports runtime provider switching across every subsystem. The Engine, Forge, Voice, and Autopilot can each target Gemini, OpenAI, Z.ai (GLM), or a local OpenAI-compatible inference server—independently, through AI Calibration. A local server requires no API key: point it at an endpoint, discover loaded models, and the same Engine contracts apply. Each subsystem can run a different model if the scenario calls for it.

This is not cosmetic. The architecture is designed so that the contracts—not the provider—define what the machine can accept. A local 26-billion-parameter model (such as Gemma 4 26B QAT) running on your hardware is subject to the same ratification path as a cloud endpoint. In recent 80-turn playtest batteries across Protagonist, Antagonist, Villain, and Survivor roles, local Gemma demonstrated complete somatic fidelity, psychological depth, and 100% schema accuracy with 0 cloud token expenditure.

The Forge has hardened its extraction and candidate normalization pipeline. Source-backed defaults apply atomically—complete Depiction Contracts, rich topology definitions, expanded rule aliases, and per-character opening placement—regardless of which provider produced the extraction. The exported Blueprint remains perspective-neutral and schema-valid.

The next work begins with playing the assembled machine across varied scenarios, then addressing the failures and rough edges those sessions reveal. Further work on authored treatment, the Voice, campaign continuity, and later Horror Grammar remains on the roadmaps.

For how the project has developed, what the machine can do, and where it is heading, read the [Technical (Public) Roadmap](./ROADMAP.md). The [Development Roadmap](./DEVELOPMENT-ROADMAP.md) explores the architectural foundations and technical questions guiding that direction.

Two commitments hold throughout development: a refusal or an empty response from the model is never allowed to pass itself off as something the player did or said, and any consequence the machine records traces back to reviewed evidence or deliberate authorship—never a hidden score nudging the story toward a prepared ending.

## RUNNING THE MACHINE

Before the tour, the doorknob.

The application is built with React, TypeScript, Vite, Express, Zustand, Zod, Tailwind CSS, Vitest, and IndexedDB.

### Model-Agnostic Architecture

The Terror Machine is designed from the foundation to be **strictly model- and provider-agnostic**. The language model is an improvisational narrative generator; the machine is a deterministic continuity engine. Any model that can emit structured JSON against the application's Zod schemas can operate the machine—whether running locally on private hardware or via cloud APIs.

Through **AI Calibration**, each of the machine's four core subsystems can be calibrated to an independent provider and model:
- **The Engine**: Drives live turn progression, spatial adjudication, and dialogue synthesis.
- **The Forge**: Powers Haunted House Induction, source extraction, and Blueprint authoring.
- **The Voice**: Acts as the out-of-character analytical companion and research oracle.
- **The Autopilot**: Drives headless automated exploration and soak-testing.

Supported providers include **Local Inference** (LM Studio, Ollama, llama.cpp, vLLM, or any OpenAI-compatible server), **Google Gemini**, **OpenAI**, and **Z.ai (GLM)**.

### Quickstart

```bash
npm install
cp .env.example .env
npm run dev
```

### Provider Configuration

- **Zero-Token Local Play (Recommended for Private Offline Simulation)**:
  No API key or external internet connection is required. Start your local server (e.g., LM Studio at `http://localhost:1234/v1`), open **AI Calibration** in the app header, select **Local**, enter your endpoint URL, and click **Discover Models**. You can assign different local models to each subsystem or run a single model across all four.
- **Cloud Providers**:
  Add keys to `.env` or enter them dynamically inside the AI Calibration modal:
  - Gemini: `GEMINI_API_KEY` (Gemini Free Tier is supported with automatic exponential backoff and rate-limit model fallback)
  - OpenAI: `OPENAI_API_KEY`
  - Z.ai GLM: `ZAI_API_KEY` (keyed OpenAI-compatible transport with purpose-mapped thinking modes)

```bash
# Production build & server start
npm run build
npm start

# Automated test battery (1,440+ deterministic tests)
npm test
```

> [!IMPORTANT]
> Never commit `.env`, expose an API key in source code, or paste keys into public issues. The Engine's authoritative Zod contracts enforce state validation at ingress; provider-specific peculiarities cannot bypass or weaken those boundaries.

## THE HOUSE IS FREE

"Free Haunted House" does not mean an empty demo hallway waiting for a prewritten monster.

It means the house is yours to furnish.

You can begin with:

- an authored **Blueprint** with a known premise, cast, setting, and map;
- **Haunted House Induction**, where source material is examined and transformed into proposed structure;
- **Ad-Lib Induction**, where you supply the sparks and let the machine help build the situation;
- a familiar story you want to approach from the side;
- a setting you have never seen before, but would like to be trapped inside.

The source may be a screenplay, a book, a transcript, world lore, notes, a PDF, a text file, or the strange paragraph you wrote at two in the morning and never explained to anyone.

The machine does not treat every extracted detail as fact. It presents evidence, candidates, questions, and ambiguities for inspection. You decide what belongs in the house. The Architect may suggest a door, a memory, a motive, or a rule; the Forge keeps that suggestion on the table until you accept it.

Once the house is built, the Engine takes over the night shift.

## WHAT KIND OF HORROR MACHINE IS THIS?

TTM is a literary horror simulator with a mechanical spine.

Its horror can be human, supernatural, or deliberately unresolved. A locked room and a person with a reason to keep it locked can be enough. If the world permits something impossible, that possibility belongs to the scenario; rising fear does not rewrite its rules.

The language model supplies improvisation: voices, dialogue, discoveries, threats, and the details that give a scene its character.

The application supplies continuity. It owns the things that make an event matter:

- where everyone is;
- what places connect to what;
- who the player is inhabiting;
- what each character has learned, and what they misremember;
- which relationships have changed;
- which consequences have become part of the world;
- what the machine has already agreed to make true.

The model may describe a staircase. The Engine asks whether the staircase has somewhere to go.

The model may declare that a character knows the truth. The Engine asks when that character learned it.

The model may propose that the door is open. The Engine asks whether there is a door, whether it was reachable, and whether the action that opened it was possible.

Those proposals can become part of the world when the checks support them.

## THE THREE NODES

The application has three main workspaces, each with a distinct role in creating, running, or examining a scenario.

### `[ THE VOICE ]`

The Voice is the window in the wall.

It can discuss an idea, examine a session, explain a receipt, compare evidence, help with research, or surface a contradiction. It can talk about the machine without pretending to be the machine.

The Voice is deliberately read-only. It can help you understand a session or examine an idea, but it cannot change simulation state.

### `[ THE FORGE ]`

The Forge is where a story becomes inhabitable.

Here you author a Blueprint: premise, cast, setting, topology, roles, relationships, pressures, boundaries, and the details that make a world more specific than a mood board.

Here you can also feed the machine source material and let it perform **Haunted House Induction**. The Architect extracts candidates and evidence, identifies gaps, asks questions, and stages proposals. Ambiguity is not automatically a defect. Sometimes the unknown is the most faithful thing in the room.

The Forge is a review chamber. A confident paragraph is not canon. An inference is not evidence. A proposal is not a commit.

The Source Baseline has its own revision. Architect responses remain attached to the exact source and question that produced them. Accepted resolutions update the Blueprint as a single transaction. Proposals from an earlier revision cannot overwrite a newer draft.

The Forge can stage a source-grounded **Depiction Contract** describing how a particular nightmare should be shown: its dramatic register, its directness, its aftermath, the uncertainty it must preserve, and any special boundaries that belong to this house alone.

When a source import has enough accepted evidence, the Forge can now apply its source-backed defaults as one atomic operation: rich story spaces, per-character opening placement, cast intent, and a complete Depiction Contract. The exported Blueprint is perspective-neutral. It does not require one permanent player character or one universal starting room; the Engine resolves the entry after the operator chooses a perspective.

A source import can fill an authoring gap. A complete Depiction Contract you deliberately authored survives import and compilation unless you choose to replace it.

Export Review captures one revision-bound Blueprint artifact. Copy and Download use that exact artifact; later draft changes require a refreshed review.

### `[ THE ENGINE ]`

The Engine is the room after the lights go out.

It receives an action, consults the current state, asks the model for a bounded proposal, and decides what—if anything—actually changes. It checks the proposed events against the world's established state and rules. The same ratification path governs human turns and autonomous Autopilot exploration alike.

An imported Blueprint can be entered from any eligible cast perspective. Protagonists, human antagonists, and nonlocal entities are selected at Engine setup; the chosen character's authored placement determines the initial scene.

When a turn succeeds, the world moves.

When a turn fails, the world stays intact and the failure leaves a receipt.

The opening belongs to the conversation that follows it. An accepted fact survives a quiet turn. A reply that arrives after you have left a session belongs to that old session and cannot follow you into the next one.

## CHOOSE YOUR SEAT

In The Terror Machine, role selection is not an aesthetic prompt label—it is an authoritative structural contract. When you choose a seat, the Engine projects a specialized role envelope into the model context and binds your inputs to strict causal feasibility rules.

The engine resolves six participation modes across four canonical seat categories:

### 1. SURVIVOR (`survivor` / `protagonist`)
*You are fragile, situated flesh.*

You inhabit a mortal character anchored to a single node on the spatial map. You possess a physical body, an immediate sensory horizon, psychological trauma triggers, and hard physiological limits.
- **Physical Grounding**: You cannot walk through locked bulkheads without keys, tools, or forced breach. You cannot speak without functional vocal cords, and you cannot sprint if your legs are mangled.
- **Epistemic Isolation**: You know only what your character has witnessed, discovered, or overheard. You cannot perceive adjacent chambers unless an observation port or an open doorway permits line of sight.
- **Somatic Continuity**: The Engine tracks consequence states (hypothermia, panic, fractures, hemorrhagic shock) deterministically. The language model generates the sensory horror of your rapid breathing; the engine adjudicates whether your lungs still draw air.

### 2. VILLAIN (`villain` / `antagonist`)
*You are the horror that stalks the perimeter.*

You embody the scenario's opposition force—whether an intimate human murderer, a predatory stalker, or an anomalous architectural parasite (such as Entity-41 in *The Black Iron Mortuary*).
- **The Authority Contract**: Playing the villain is not a license to puppeteer the victims. You operate under explicit, authored capabilities and hard limitations. An antagonist with surveillance access can track telemetry feeds; an antagonist with acoustic authority can pipe whispers through drainage pipes.
- **Autonomous Prey Cohort**: The survivors are not passive props waiting to be slaughtered. They possess independent behavioral vectors (`ADAPTIVE`, `INSURGENT`, `PANIC`), authored vulnerabilities, and survival instincts. They hide, barricade doors, construct improvised weapons, and strike back based on their own cast ledgers.
- **Apparatus Controls**: The Engine exposes scenario-specific apparatus controls (hydraulics, atmosphere, electrical grids, acoustic feedback, surgical machinery) that you can trigger to herd and corner your prey.

### 3. BYSTANDER (`bystander` / `witness`)
*You are trapped in the periphery.*

You are neither the destined hero nor the calculating mastermind. You are the night-shift custodian, the intern trapped in the observation booth, or the radio technician huddled under a console.
- **High Vulnerability, Narrow Agency**: You lack the combat training of a protagonist or the systemic reach of an antagonist. Your survival depends on evasion, stealth, and quiet observation.
- **The Observer's Horror**: You experience the unraveling of the world through overheard transmissions, vibrating bulkheads, and flickering monitors. Zero plot armor; maximum dread.

### 4. DIRECTOR (`director`)
*You stand outside the flesh.*

You do not inhabit a body in the hallway. You are the unseen hand adjusting the atmospheric vise.
- **Environmental & Atmospheric Manipulation**: You introduce situational pressure, advance structural decay, alter lighting and ambient temperatures, and stage encounters without violating the causal topology of the scenario.
- **Pacing Without Usurpation**: A Director cannot mind-control the survivors or teleport the monster into a sealed safe room. You shape circumstances and challenge commitments, leaving the choices and consequences to the participants.

---

## THE HOUSE REMEMBERS

The Terror Machine is built for the things that survive the turn of the page.

In standard LLM chat interfaces, history is a lossy rolling text buffer. A character who breaks their arm on Turn 2 is happily sprinting by Turn 6. A door kicked off its hinges is mysteriously locked again when the model forgets.

The Terror Machine replaces context drift with deterministic state persistence:
- **Canonical Topology**: Discovered chambers remain mapped in the interactive SVG `MapSketch`. If an exit is welded shut, it stays shut.
- **Cast Ledger & Relationship Stance**: Every character retains an independent ledger of known facts, secret suspicions, psychological stability, and relationship stances toward other characters.
- **Somatic & Consequence State**: Irreversible physiological trauma and psychological shocks persist across turns and survive page reloads.
- **World Memory & Evidence Vault**: Documents, keys, audio tapes, and strange artifacts collected during exploration are permanently cataloged with explicit causal provenance.
- **Fictional Time Ledger**: Time is not uniform. A glance takes seconds; a thorough search of a medical cabinet takes five minutes; picking a mortuary lock takes fifteen. The clock advances deterministically, driving offscreen antagonist patrols and scheduled pursuit triggers.

Memory has scope. Memory has provenance. Memory has an acceptance boundary. The goal is not infinite recall—the goal is an authoritative world that remembers you were there.

---

## A TURN IN THE MACHINE

Every action submitted to The Terror Machine executes through an atomic, multi-stage ratification pipeline:

```
[ User Action / Autopilot Vector ]
              │
              ▼
  ┌───────────────────────┐
  │  1. CONTEXT ASSEMBLY  │ ──► Pulls topological graph, co-present cast,
  └───────────────────────┘     acoustic links, and Horror Grammar ledgers
              │
              ▼
  ┌───────────────────────┐
  │ 2. MODEL GENERATION   │ ──► Model emits structured JSON matching
  └───────────────────────┘     turn contract schema (narrative & logic)
              │
              ▼
  ┌───────────────────────┐
  │ 3. CAUSAL RATIFIER    │ ──► Verifies spatial adjacency, acoustic bleed,
  └───────────────────────┘     somatic feasibility, and authority limits
         │         │
    [ Ratified ] [ Failed ]
         │         │
         ▼         ▼
  ┌───────────┐ ┌───────────────┐
  │ 4. COMMIT │ │ 4. FAIL-CLOSE │ ──► Rejects invalid proposals, preserves
  └───────────┘ └───────────────┘     canonical state, generates forensic receipt
         │
         ▼
  ┌───────────────────────┐
  │ 5. TELEMETRY & VIEW   │ ──► Updates Center Stage CRT typography,
  └───────────────────────┘     Austin Osman Spare MapSketch, and MortalLedger
```

### The 6 Stages of an Atomic Turn:

1. **Snapshot & Auditory Context Assembly**:
   The Engine pulls the authoritative state from dual-store IndexedDB. It resolves the spatial topology, identifies co-present cast members, audits open remote channels (telephones, radios, surveillance feeds), and maps physical acoustic links (observation ports, airlocks, ventilation ducts).
2. **Constrained Model Generation**:
   The active provider (local weights server or cloud API) receives the turn prompt with strict role directives. It must respond with a strictly conformant JSON object adhering to the engine's schema: narrative blocks (with typed dialogue, internal monologue, soliloquies, or transmissions), intended spatial transitions, proposed consequence tags, and logic state deltas.
3. **Deterministic Causal Ratification**:
   The Engine's TypeScript validator adjudicates the proposal against immutable scenario rules:
   - **Spatial Adjacency**: Did the character attempt to cross a valid, unlocked topology connection?
   - **Acoustic Grounding**: If an offstage character spoke, is there an open radio or acoustic duct path? If so, the engine auto-remediates the block's medium; if not, it fails closed.
   - **Role & Authority Boundaries**: Did the action violate the player's seat authority or attempt unearned omniscient manipulation?
   - **Quote Parsing**: Conversational utterances are extracted using robust straight/curly quote parsers with speech-verb detection and contraction guards.
4. **Atomic Commit or Fail-Closed Quarantine**:
   - **On Success**: All validated deltas (new location, altered relationships, discovered evidence, somatic damage) are committed atomically in a single monotonic revision across IndexedDB.
   - **On Validation Failure or Provider Refusal**: The canonical state remains completely untouched. The proposal is quarantined, zero synthetic player dialogue is generated, and a structured failure receipt is published.
5. **Center Stage Presentation & Workstation Projection**:
   The validated narrative blocks are formatted into Center Stage CRT typography with distinct visual framing: Introspection (indigo italic), Soliloquies (dashed amber), Intercom/Bleed with chamber provenance (phosphor-cyan), and Spoken Dialogue (candle-amber). The 1440p `MapSketch` and pure-text `MortalLedger` update in real time.
6. **Zero-Leak Monotonic Retake**:
   If the operator chooses to step back from a catastrophic decision or explore an alternate branch, the Retake coordinator rolls back the simulation to the preceding completed checkpoint with zero orphaned state or memory leaks.

---

## THE LAWS OF THE HOUSE

These laws govern every turn, regardless of whether you are running a 70B local model on an RTX rig or connecting to a frontier cloud endpoint.

### 1. Canon Belongs to the Application, Not the Weights
The language model is an untrusted generative improviser; the application is the cold, immutable truth. A model can hallucinate a hidden staircase or claim an entity has been banished. The Engine checks the topological graph and state ledgers, saying: *No. That did not happen.*

### 2. A Proposal is Not a Commit (The Zod Citadel)
No raw text or unvalidated JSON from an AI provider ever touches simulation state directly. Every token passes through authoritative Zod schema validation and causal feasibility gates at ingress. What fails validation fails closed.

### 3. Topology is Causal, Not Prose
Space in The Terror Machine is a directed adjacency graph, not a literary metaphor. If the Morgue does not connect to the Drainage Crypt, the character cannot step between them—no matter how vividly the model describes the descent. Movement requires an authorized topological connection.

### 4. Strictly Text-Based Acoustic Grounding
Zero Web Audio, zero audio hardware dependencies, zero voice synthesizers. Dialogue and soundscapes are pure literary prose and CRT typography. Characters cannot speak across rooms without a physical transmission medium (radio, intercom, telephone) or structural acoustic bleed (ductwork, observation ports).

### 5. Epistemic Isolation (Anti-Omniscience)
Knowledge is situated in space and time. An event occurring in the boiler room is unknown to characters in the chapel until someone arrives to report it or a transmission is received. NPCs do not have telepathic access to the player's thoughts, inventory, or secret aims.

### 6. Somatic State Isolation
Player physiological trauma (hypothermia, fractures, blood loss) and psychological status (paranoia, panic, tremor) belong strictly to the player's active vessel. Companion NPCs maintain their own distinct cast ledgers and never inherit player consequence states.

### 7. The User Owns the Intent (Zero Synthetic Agency)
The machine will never fabricate player dialogue or invent player actions to paper over a model refusal, empty response, or network timeout. If a model fails, the turn halts cleanly with a diagnostic receipt, leaving the character's agency in the hands of the operator.

### 8. Consequences Stay
A shattered seal remains broken. A spent adrenaline syringe is empty. An ally betrayed in the dark remembers being abandoned. The machine does not quietly reset consequences between turns to make the next paragraph easier to generate.

### 9. Zero Gamification / No Hidden Dials
There are no artificial fear meters, sanity meters, or invisible morality scores nudging the story toward a scripted ending. Horror in The Terror Machine emerges naturally from authored constraints, physical vulnerability, acoustic isolation, and the weight of irreversible choices.

### 10. Hostile to the Character, Transparent to the Operator
The house is designed to test the character's survival to the breaking point. But outside the fiction, the operator has total control: transparent receipts, forensic inspectors, live model calibration, instant retakes, and portable JSON export artifacts.

## WHAT YOU CAN BRING INSIDE

The house is designed to accept authored material rather than forcing every nightmare through the same prefab hallway.

You can bring:

- an existing Blueprint;
- a screenplay or novel fragment;
- research, transcripts, and lore;
- a floor plan or a list of locations;
- a cast with histories and private knowledge;
- a monster with a specific authority and specific limits;
- a premise that is only one sentence long;
- an uncertainty you do not want the machine to resolve.

The Forge separates source evidence from interpretation and authoring. It can ask what a document does not settle. It can preserve a question as **contextual discretion** when the open space is part of the intended experience.

This is important for literary horror. The machine should be able to understand that an uncertainty is not always an invitation to make something up.

## WHAT THE MACHINE IS TRYING TO MAKE

Not infinite content.

Not a parade of interchangeable rooms.

Not a model improvising until everyone forgets what happened three turns ago.

TTM is trying to make a horror world with enough structure for choices to matter and enough uncertainty for fear to remain alive.

It is interested in:

- dread that accumulates instead of resetting;
- characters who know different versions of the same room;
- places that become more dangerous because they have been understood;
- consequences that are mechanical, emotional, and spatial at the same time;
- silence that is not a loading screen;
- agency that can fail without becoming meaningless;
- ambiguity that remains deliberate rather than accidental;
- the strange authority of a machine that can say, "No. That did not happen."

The target is not a perfect story.

The target is a story that has become a place—and a place that remembers being entered.

## FINAL NOTICE TO OPERATORS

A convincing paragraph still needs a valid turn behind it, and a passing test covers only the behavior it exercises. The distinction between what the model describes and what the Engine accepts is central to the project.

The Terror Machine is an attempt to make language walk through a world that remembers where it has been.

The house may not be finished.

An unfinished house can still remember you were in it.

## LICENSE

The Terror Machine is released under the [MIT License](./LICENSE).
