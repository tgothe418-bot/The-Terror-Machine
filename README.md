<p align="center"><strong>FREE HAUNTED <span style="color: #60a5fa;">HOUSE</span></strong></p>

> **The room exists even when the prose looks away.**

Welcome, operator.

You have found **The Terror Machine**: a persistent horror simulator for building, entering, and surviving impossible places.

It is part haunted house, part authoring system, part unreliable oracle, and part very literal machine. You may bring it a screenplay, a novel, a fragment of lore, a floor plan, a nightmare, or nothing but a bad idea and a door. The machine will help turn that material into a world.

Then it will remember what happened there.

TTM uses language to bring a world with rules to life: a character can be frightened by something the player does not know, a discovered room can remain on the map, and a beautiful sentence cannot quietly change the past.

The central rule is simple:

> **The model proposes. The machine decides.**

Everything else follows from that.

Jump to: [Run it](#running-the-machine) · [The House is Free](#the-house-is-free) · [The Three Nodes](#the-three-nodes) · [The Laws of the House](#the-laws-of-the-house) · [Live status →](./ROADMAP.md)

## RUNNING THE MACHINE

Before the tour, the doorknob.

The application uses React, TypeScript, Vite, Express, Zustand, Zod, Tailwind CSS, Vitest, IndexedDB utilities, and Google Gemini through `@google/genai`.

```bash
npm install
cp .env.example .env
npm run dev
```

Add a personal Gemini API key to `.env`.

For a production-style compilation:

```bash
npm run build
npm start
```

For the automated test suite:

```bash
npm test
```

Never commit `.env`, expose an API key in source code, or paste a key into a public issue.

The machine is currently being built and tested in Antigravity. Gemini supplies the model runtime, while the Engine's contracts define what it can accept.

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

The machine supports three ways to stand inside the nightmare.

### PROTAGONIST

You inhabit a character.

That character has a position, a body, a history, a point of view, relationships, memories, and limits. The character does not automatically know what you know. The world does not automatically know what you intended.

Your character may misunderstand the room. That misunderstanding is part of the room.

### ANTAGONIST

You act through an opposing character or force.

An antagonist is not a license to puppeteer every other person in the scenario. Antagonist play uses an explicit **Authority Contract**: what the force can control, what it can influence, and what remains outside its reach.

The victims are not cardboard scenery waiting for the villain to move them. They remain situated participants in the world, with their own presence, knowledge, fear, and ability to resist.

The machine can support an intimate human antagonist, a predatory intelligence, or something operating at Barker, King, or Lovecraft scale. Each remains subject to its authored capabilities and limits.

### DIRECTOR

You remain outside the fiction.

The Director can shape pressure, attention, framing, and circumstance without becoming another person waiting in the hallway. This is the seat for arranging the nightmare rather than pretending to be one of its residents.

A Director does not need a body in the house. They need a hand on the thermostat.

These roles are not cosmetic labels. They are part of the simulation contract.

## THE HOUSE REMEMBERS

TTM is interested in the things that survive the page turn.

A character can remember a warning but not its source. A room can retain the consequence of an earlier action. A relationship can be altered by something that was never spoken aloud. Evidence can remain discoverable after the scene that revealed it is gone. A boundary can stay mapped even when the prose stops looking at it.

The machine's memory is bounded on purpose. It preserves accepted information that matters beyond the current turn:

- established facts;
- discovered evidence;
- environmental conditions;
- persistent consequences;
- character knowledge and memory;
- relationships and stance;
- the topology that makes movement meaningful.

Memory has scope. Memory has provenance. Memory has an acceptance boundary.

The goal is not infinite recall.

The goal is a world that can be inspected, challenged, and trusted.

## A TURN IN THE MACHINE

Every turn follows the same sequence.

| Stage | What happens |
|---|---|
| **Snapshot** | The Engine captures the authoritative state before anything new is proposed. |
| **Generation** | The model interprets the action and proposes narrative and structured changes inside the active contract. |
| **Ratification** | Deterministic rules check intent, feasibility, topology, roles, presence, cast, relationships, and other boundaries. |
| **Commit or fail** | Accepted changes are committed once. Invalid proposals preserve canonical state and produce a failure receipt. |
| **Telemetry** | The machine records what was proposed, what was accepted, what changed, and what was refused. |
| **Retake** | The person at the controls may restore the immediately preceding completed checkpoint and try again. |

The prose presents the scene. The receipt records how the Engine evaluated it and what changed.

## THE LAWS OF THE HOUSE

These rules matter more than any individual model, prompt, or attractive paragraph.

### Canon belongs to the application

The language model may propose a new state. It does not own the state. The application does not ask for permission to disagree.

### A proposal is not a commit

Source candidates, Architect suggestions, generated consequences, memory entries, and authoring changes remain provisional until they cross the appropriate acceptance boundary.

### Failed validation preserves the world

If a proposal is impossible, malformed, or outside the active contract, the canonical state remains intact. A failure produces evidence, not a convenient fiction.

### Topology is not decoration

A room is not a mood. A doorway is not a metaphor. Spatial change requires an authorized path through the topology contract. If the hallway does not connect to the basement, then the character cannot walk there—no matter how well the model describes the stairs.

### Knowledge is situated

Characters do not act on information merely because the model, player, or author possesses it. Knowledge belongs to someone, somewhere, at a particular point in the story.

### The User owns the choice

The machine may describe a racing pulse, a flinch, or the cost of a bad decision. It must still leave the character's chosen action, intent, and commitments with the person playing them. Other characters can act on their own concerns within the authority the scenario gives them.

### Consequences are allowed to stay

The machine is not obligated to reset a relationship, erase a discovery, or restore a room because the next paragraph would be easier that way.

### The machine may be hostile to the character

It should never be hostile to the person using it. Retake, exit, recovery, and diagnostic controls exist outside the fiction for a reason.

### Zero gamification

There is no horror score to optimize or pursuit clock the player must manage. Internal records carry time, pressure, and consequence without turning them into a dashboard for ordinary play or a mechanism for forcing a prepared ending. The machine keeps its own books.

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

## CURRENT EDITION

The Terror Machine is an open-source solo project in active development.

The first Horror Grammar gives the world a life between the player's actions. A glance, a conversation, and a long search need not cost the same amount of night. While the player studies one door, someone else may be testing a lock. An accepted change in a character's purpose follows them when they leave the room. The machine can place pressure in the scene without choosing the player's answer.

This edition brings that continuity through the complete session: the opening, successive turns, failed attempts, Retake, and recovery after reload. It strengthens the boundaries around cast presence, authored authority, User commitments, and the facts the world has already accepted. Recovery is built around complete saved revisions, with an explicit recovery state when a trustworthy continuation is unavailable.

The same attention extends to the prose. Dramatic pressure follows the scenario's physical possibilities. A character can reassure you, lie to you, or offer shelter without their dialogue being replaced by system-error text. Provider refusals remain visible failures outside the fiction.

The next work begins with playing the assembled machine across varied scenarios, then addressing the failures and rough edges those sessions reveal. Further work on authored treatment, the Voice, campaign continuity, and later Horror Grammar remains on the roadmaps.

For how the project has developed, what the machine can do, and where it is heading, read the [Technical (Public) Roadmap](./ROADMAP.md). The [Development Roadmap](./DEVELOPMENT-ROADMAP.md) explores the architectural foundations and technical questions guiding that direction.

Two commitments hold throughout development: a refusal or an empty response from the model is never allowed to pass itself off as something the player did or said, and any consequence the machine records traces back to reviewed evidence or deliberate authorship—never a hidden score nudging the story toward a prepared ending.

## FINAL NOTICE TO OPERATORS

A convincing paragraph still needs a valid turn behind it, and a passing test covers only the behavior it exercises. The distinction between what the model describes and what the Engine accepts is central to the project.

The Terror Machine is an attempt to make language walk through a world that remembers where it has been.

The house may not be finished.

An unfinished house can still remember you were in it.

## LICENSE

The Terror Machine is released under the [MIT License](./LICENSE).
