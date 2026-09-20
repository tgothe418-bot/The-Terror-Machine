<p align="center">
  <strong>FREE HAUNTED <span style="color: #60a5fa;">HOUSE</span></strong>
</p>

<h1 align="center">THE TERROR MACHINE</h1>

<p align="center">
  <em>An open-source, neuro-symbolic runtime for building, entering, and surviving impossible places.</em>
</p>

<p align="center">
  <a href="./ROADMAP.md"><strong>Technical Roadmap</strong></a> &middot;
  <a href="#quickstart"><strong>Quickstart</strong></a> &middot;
  <a href="#three-canonical-scenarios"><strong>Scenarios</strong></a> &middot;
  <a href="#the-laws-of-the-house"><strong>Laws of the House</strong></a> &middot;
  <a href="./LICENSE"><strong>MIT License</strong></a>
</p>

---

> Most LLM-based interactive stories collapse into repetitive adjective escalation, spatial hallucinations, and context rot after 10 turns. The Terror Machine is an open-source, neuro-symbolic runtime that decouples ground-truth state from token generation. By combining formal topological graphs, diegetic pacing governors, and schema-enforced causal ratification, it enables sustained, multi-turn narrative tension across both cloud APIs and small local models.

### The Model Proposes. The Machine Decides.

In standard LLM interfaces, history is a lossy text buffer. Doors un-lock themselves, injuries vanish, and the prose spirals into melodrama. 

The Terror Machine replaces prompt drift with deterministic state persistence. The language model generates improvised narrative prose, atmospheric descriptions, and character dialogue. The machine enforces spatial topology, character knowledge boundaries, acoustic physics, and somatic trauma. If a proposal violates the causal facts of the world, the engine rejects it—preserving canonical state and leaving an immutable diagnostic receipt.

---

## Architectural Pillars

- **Neuro-Symbolic Runtime**: Ground-truth state (spatial topology, inventory, somatic trauma, relationship stances) lives in deterministic TypeScript ledgers and dual-store IndexedDB—completely decoupled from generative token probability.
- **Causal Topology Graph**: Space is a directed adjacency graph. Movement requires authorized connections. If two rooms are not connected, no character can cross between them, no matter how vividly the model hallucinates the passage.
- **Pure-Text Acoustic Engine**: Zero Web Audio or speech synthesizer dependencies. Soundscapes and vocalizations (spoken dialogue, *sotto voce* soliloquies, introspective monologue, intercom transmissions, and structural acoustic bleed through ductwork) are modeled via physical adjacency and rendered in evocative CRT typography.
- **Diegetic Pacing Governor & Clocks (Horror Grammar 2)**: Autonomous tension regulation using undulating cadence cycles (`RESPITE_AFTERMATH` &rarr; `SIMMERING_DREAD` &rarr; `MOUNTING_COMPLICATION` &rarr; `KINETIC_RUPTURE`), situated diegetic instruments, and impending countdown clocks that trigger threshold manifestations.
- **Strict Model Agnosticism**: Runs identically on local models via private inference servers (LM Studio, Ollama, llama.cpp, etc.) or frontier cloud APIs (Google Gemini, OpenAI, Z.ai GLM). Each subsystem can calibrate to an independent model.

---

## The Three Nodes

| Node | Purpose | Authority |
| :--- | :--- | :--- |
| **`THE FORGE`** | Authoring & Haunted House Induction. Import screenplays, manuscripts, or raw lore into perspective-neutral Blueprints with verified cast profiles, topological rooms, and depiction contracts. | Write / Author |
| **`THE ENGINE`** | The simulation runtime. Evaluates player or Autopilot actions through atomic 5-stage causal ratification (Snapshot &rarr; Constrained Generation &rarr; Causal Ratification &rarr; Atomic Commit / Fail-Close &rarr; CRT Presentation). | Authoritative Runtime |
| **`THE VOICE`** | The out-of-character analytical companion and research oracle. Explains receipts, examines source evidence, and surfaces narrative contradictions. | Strictly Read-Only |

---

## Choose Your Seat

Role selection in The Terror Machine is an authoritative causal contract:

- **Survivor (`survivor` / `protagonist`)**: Situated mortal flesh. Bound by narrow sensory horizons, locked doors, trauma triggers, and physiological limits.
- **Villain (`villain` / `antagonist`)**: The stalking threat. Governed by authored authority contracts and counterplay boundaries; controls scenario apparatus (hydraulics, environmental grids) to corner an autonomous prey cohort.
- **Bystander (`bystander` / `witness`)**: Trapped in the periphery (custodian, technician). High vulnerability, narrow agency, zero plot armor.
- **Director (`director`)**: Outside the flesh. Adjusts atmospheric pressure, triggers structural decay, and stages encounters without usurping participant agency.

---

## Three Canonical Scenarios

1. **The Black Iron Mortuary**: Subterranean gothic bio-containment facility. 6 chambers, 4 cast members, and the predatory architectural entity *Entity-41*.
2. **The Silver Rest Lodge**: February 1991 alpine social horror. 7 topological chambers, 8 cast members across survivor, villain, and bystander roles, 3 impending environmental clocks, and 4 causal milestone gates.
3. **The Refinement**: High-intensity psychological ordeal inspired by the New French Extreme. 8 chambers, 8 cast members with granular psychological breaking points, and dual TIME/EVENT impending clocks.

---

## Quickstart

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/tgothe418-bot/The-Terror-Machine.git
cd The-Terror-Machine

# Install dependencies
npm install

# Configure environment
cp .env.example .env
```

### 2. Provider Setup

- **Zero-Token Local Play (Recommended)**:
  Start any OpenAI-compatible server (e.g., LM Studio, Ollama, llama.cpp at `http://localhost:1234/v1`). Open **AI Calibration** in the app header, select **Local**, enter your endpoint, and click **Discover Models**.
- **Cloud Providers**:
  Add keys to `.env` or set them dynamically in the AI Calibration modal:
  `GEMINI_API_KEY`, `OPENAI_API_KEY`, or `ZAI_API_KEY`.

### 3. Launch

```bash
# Start development server
npm run dev

# Run full test suite (1,500+ tests)
npm test
```

---

## The Laws of the House

1. **Canon Belongs to the Application, Not the Weights**: The model improvises narrative; the application owns truth.
2. **A Proposal is Not a Commit**: Every token passes through schema validation. Invalid proposals fail closed without mutating world state.
3. **Topology is Causal, Not Prose**: Physical passage requires an authorized connection on the directed spatial graph.
4. **Situated Epistemic Isolation**: Knowledge is grounded in space and time. No character possesses telepathic omniscience.
5. **The User Owns Intent**: Refusals, errors, and timeouts fail cleanly with diagnostic receipts—never by fabricating synthetic player actions.

---

## License

Released under the [MIT License](./LICENSE).
