# TTM — Phase 3A: Ad Lib Induction & Participation Seats

## Objective

Expand **Ad Lib Induction** into a short, structured pre-launch flow. A user must be able to begin a playable horror session without authoring a full Blueprint, while still providing enough canonical starting information for the engine to behave coherently.

The user selects a **participation mode**:

- `protagonist`
- `antagonist`
- `director`

The result must reuse the existing atomic `/api/turn` lifecycle and preserve the Phase 2 state, topology, snapshot, and failure invariants. This is an entry-path and turn-context feature, not a new engine.

## Product behavior

### 1. Keep the existing starting choices

Blueprint mode and Ad Lib Induction must remain visible as separate, first-class entry paths. Do not turn Ad Lib into a partial Blueprint editor.

### 2. Add an Ad Lib Induction setup flow

Before launching an Ad Lib session, present a concise, adaptive setup flow. It should feel like three short creative prompts, not an exhaustive form.

#### Common fields

- participation mode: protagonist, antagonist, or director
- location / haunted-place seed
- core goal
- one optional unsettling detail

#### Protagonist mode

- character name
- optional identity or connection to the place
- optional ability
- optional limitation

The user controls one in-world character. Their ordinary text input is interpreted as that character's intent.

#### Antagonist mode

The user controls exactly one **opposition seat**. Support both kinds:

- `character`: a specific hostile character or creature
- `force`: an abstract or distributed threat, such as the house, a curse, an institution, a surveillance system, or a hunger

Capture a name/title, short description, goal, and optional ability/limitation appropriate to that seat. This is deliberately limited to one seat for now; do not build multi-antagonist or multi-character control.

#### Director mode

Do not build a separate director console in this phase. The user's ordinary text input is interpreted as a scene-direction proposal, such as pressure, focus, framing, pacing, or a request to delay/reveal information.

Director input must **not** become a direct state editor. For example, “increase pressure around the mirror” is valid intent; “the door is now open” is not an unconditional canonical mutation.

### 3. Preserve the essential distinction

The selected participation mode defines whose agency the user is inhabiting. It must not be confused with:

- a character's in-world narrative role;
- a Cluster;
- a runtime affect/state value; or
- presentation-only UI state.

Use a clear name such as `participationMode` in contracts and state to prevent role-name collisions.

## Contract and initialization requirements

### 4. Create a strict Ad Lib induction contract

Add a Zod-backed, exported contract for the submitted induction data, following the project's existing schema conventions. It should reject malformed mode-specific data at ingress, with no `any`, `unknown` escape hatches, or type assertions used to bypass validation.

The exact shape may follow existing naming conventions, but it needs to model:

- `participationMode`
- a concise scenario/place seed
- goal
- optional unsettling detail
- a mode-appropriate participant / opposition-seat descriptor
- optional ability and limitation descriptors

Use bounded strings and arrays consistent with existing request limits. Keep data deliberately small and token-efficient.

Mode-specific validity rules:

- `protagonist` requires a participant name/identity.
- `antagonist` requires an opposition seat and its explicit `character` or `force` kind.
- `director` has no controlled in-world actor requirement.
- all modes require a place seed and a goal.

Export the resulting types through the project’s established type barrel.

### 5. Compile the induction into a valid session seed

Ad Lib may remain mostly open to just-in-time invention, but the selected details are canonical starting facts.

Implement a single, explicit induction-to-session initialization path that:

1. accepts only parsed induction data;
2. creates the minimal valid internal scenario/Blueprint-compatible initialization object required by the existing engine;
3. routes that object through the existing schema/parser and runtime initialization path; and
4. establishes the user-controlled participation context.

Do not duplicate the engine initialization logic, create a parallel reducer, or manually mutate the store.

The user should never need to see or fill in the generated internal Blueprint-compatible shape. Conversely, do not weaken Blueprint validation merely to accommodate Ad Lib.

### 6. Carry participation context through every turn

Extend the canonical engine turn context/request construction so every Ad Lib turn tells the model and ratification pipeline:

- the selected participation mode;
- the controlled participant or opposition seat when applicable;
- the initial stated goal;
- the bounded facts introduced by the induction.

The context should make these behavioral limits clear:

| Mode | User may propose | Engine retains authority over |
| --- | --- | --- |
| Protagonist | the controlled character’s actions and commitments | world state, other actors, topology, feasibility, and consequences |
| Antagonist | the controlled character/force’s operations and threats | capabilities, knowledge, continuity, protagonist reactions, and consequences |
| Director | focus, pressure, framing, pacing, and reveal/withhold requests | canonical facts, topology, actor reactions, and all mutations |

The model may interpret an intent creatively, but only ratified State/Topology deltas become canonical. The existing `TURN_SUBMITTED` non-mutating behavior and `TURN_COMMITTED` authority boundaries remain intact.

## Universal Horror Core guardrails

This feature must follow the current phase-neutral Universal Horror Core direction:

- preserve situated agency: no mode may force another actor’s inner response;
- preserve uneven knowledge: a user-controlled antagonist or director does not receive omniscient canonical truth by default;
- preserve meaningful violation: horror pressure must arise through scenario facts and ratified consequence, not arbitrary output commands;
- preserve consequences with memory: committed outcomes persist normally;
- preserve participant legibility: present enough role framing that the user understands why an attempted intervention did or did not occur.

Do not add affect-state enums, a global escalation/entropy meter, an undefined moral-injury counter, or a required monster/villain model.

## UI requirements

### 7. Keep the first pass concise

Use a progressive or adaptive layout: shared fields first, then only the fields relevant to the selected participation mode.

The screen should communicate the distinction in plain language. Suggested user-facing descriptions:

- **Protagonist:** “Act through one person inside the story.”
- **Antagonist:** “Play the force applying pressure to the story.”
- **Director:** “Shape the scene without declaring outcomes.”

Keep optional creative fields clearly optional. The default Ad Lib path should launch quickly with a small number of meaningful decisions.

### 8. Do not change unrelated controls

- Preserve the existing normal turn UI and telemetry/export behavior.
- Preserve the existing filtering of upstream runtime warm-up notices from live user output while retaining developer evidence in HTML export.
- Keep Voice mode one-way: it may comment on state but must not affect canonical state.
- Clear System Memory must not leave stale induction data behind after reset.

## Verification

Add focused coverage at the correct boundaries. At minimum, verify:

1. strict parsing accepts valid protagonist, antagonist-character, antagonist-force, and director inductions;
2. strict parsing rejects missing or incompatible mode-specific requirements;
3. a parsed induction compiles into a valid engine initialization object through the established parser/path, without type escapes;
4. a protagonist seed establishes one controlled character;
5. an antagonist force remains a force descriptor rather than being incorrectly forced into an NPC/character shape;
6. director initialization has no falsely invented controlled character;
7. `buildEngineTurnContext` (or its established equivalent) carries the participation mode and bounded induction facts into a subsequent turn;
8. a representative turn for each mode still follows the atomic lifecycle and preserves receipt/snapshot guarantees; and
9. clearing/resetting session state removes induction context cleanly.

Use neutral fixture names. Do not use “Dr. Evelyn Vance” or any name containing “Thorne.”

Run the standard substantive-change verification gate:

- TypeScript no-emit check
- ESLint
- relevant unit/integration suites, including the new Phase 3A coverage and existing engine lifecycle coverage affected by the context change
- production build
- `git diff --check`

## Explicit non-goals for Phase 3A

- no mid-session participation-mode switching;
- no multiple independently controlled characters or opposition seats;
- no full Director console or direct canonical-state editor;
- no ability economy/power budget system;
- no Cluster-specific mechanics beyond compatibility with the inherited Universal Horror Core;
- no changes to the atomic `/api/turn` endpoint contract unrelated to carrying the new typed context.

## Acceptance criteria

The implementation is complete when a user can choose Ad Lib Induction, select protagonist, antagonist, or director, provide a small set of scenario details, launch a valid session, and take turns under the chosen agency framing without bypassing canonical engine authority or breaking existing lifecycle guarantees.
