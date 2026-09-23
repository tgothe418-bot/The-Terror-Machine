# HG2 Series 2 — Opposition Cohort Autonomy & Reaction Cycles

**Design draft v0.5 — 2026-09-23**
**Status:** Whiteboard draft. Human-readable context document for cross-model review. No implementation authorized.

**Changelog v0.4 → v0.5:** bounded tick rate (one completion + one initiation per member per player turn); dormant pressure freeze at highest ratified phase with institutional-memory seeding on re-formation; event-driven evidence ingestion trigger (node arrival, same-node trace emission, adjacent acoustic); ingested-evidence set per member. Incorporates third ChatGPT cross-review. Design declared ready for Antigravity implementation-packet authoring.

**Changelog v0.3 → v0.4:** tick semantics contract; executable-vs-consideration split (hard preconditions before scoring); hypothesis provenance layer; non-member cognition state; seat-holder succession with vulnerability window; membership transitions strictly downstream of behaviors; behavior-duration canonical state; commit-time semantics (fail-closed); HG2 governor boundary; evidence identity for dissonance; cohort DORMANT status; suggested implementation boundary + emergence fixtures. Incorporates ChatGPT cross-review.

**Changelog v0.2 → v0.3:** recency fatigue pinned to concrete rule (× 0.4 on last-action repeat, per-member, in-progress exempt); recruitment targeting resolved (dissonance × relationship affinity, proximity-gated). Incorporates second Gemini cross-review.

**Changelog v0.1 → v0.2:** verb count corrected (13 → 15, distinctions kept); deterministic anti-stagnation via per-member recency fatigue; behavior durations with in-progress exemption; topology-constrained SHARE/acoustic traces; session-state placement for turn-retake compatibility; seat-holder resolved (phase-anchor + disruption shock); hypotheses pinned to authored blueprint IDs; skepticism-erosion mechanized for Onset→Discovery. Incorporates Gemini cross-review.

This document supersedes the earlier four-packet Series 2 plan developed with Gemini. That plan is stale: Packet 2-1 (*Universal Warning & Telegraphed Casualty*) was scrapped as redundant, and the remaining packets were refactored around intervening work — the villain-protagonist model, the villain-always invariant, and the D3 breaking-point machinery. What follows was whiteboarded fresh from a new seed: *"Opposition Cohort Autonomy & Reaction Cycles."*

---

## 1. What this is

In The Terror Machine, most scenarios have an opposition: investigators closing in, survivors organizing, anyone pushing back against the threat. Historically this opposition has been either fully scripted or inert. Series 2 gives the opposition **a bounded, deterministic inner life** — a cohort of characters who act on their own beliefs, on fictional time, whether or not the player is watching.

The design goal is **emergent but auditable behavior**: simple rules, combining across multiple characters, that produce surprising-but-sensible outcomes (schisms, botched defenses, betrayals) — where every outcome can be traced back to *who believed what and why*.

### 1.1 What this is not

It is not an AI Director. The Left 4 Dead–style Director (a centralized, non-diegetic system that watches player intensity and spawns threats) was considered and rejected. The Director has no existence inside the fiction; nobody in the world can explain why the horde came. Our cohort members are the opposite: **every cycle must be explainable as a decision a character made given what they knew.** A Director can scare you; only a character can make you feel hunted. This distinction is load-bearing for everything below.

---

## 2. Membership — who is in the cohort

**Model: seat-based (chosen).** The cohort begins with whoever occupies the **antagonist/investigator seat** — in the standard configuration, the lead investigator; in the villain-protagonist configuration (where the protagonist seat binds the villain), the rebound opposition figure. Additional members join through the lifecycle below. This was preferred over a fully authored fixed roster (too rigid) and over unrestricted runtime inference (too unpredictable).

### 2.1 The cohort lifecycle

Membership changes are **transitions, not actions**: state changes evaluated deterministically on the tick, with receipts, testable and auditable. Nobody silently appears or vanishes. The contract is strictly downstream of behavior:

> Behavior → behavior outcome / requested transition → membership transition evaluator → canonical membership state change

A behavior never mutates membership directly — model proposes, deterministic machinery adjudicates, state commits (the TTM shape everywhere). Failure handling falls out naturally: FLEE with no reachable exit requests a transition the evaluator rejects — no state change, clean receipt.

**Non-member cognition.** The Witnessed join path needs somewhere for pre-membership beliefs to live. Resolution: **all eligible cast members may hold a bounded opposition-knowledge state; cohort membership determines whether they participate in cohort behaviors and social propagation — not whether they can know things.** Knowledge exists outside the cohort; participation is a separate flag. (Implementation note: lazy-initialize on first evidence encounter — no hypothesis maps allocated for NPCs who never matter.) This also future-proofs multi-cohort scenarios.

**Termination.** When membership reaches zero (all dead, fled, fractured, or drifted), the cohort becomes **DORMANT** — an explicit, first-class status, not an implicit `if (!members) return []`. Knowledge persists in cast cognition (above), so re-formation via Witnessed or RECRUIT remains possible. A dormant cohort with no re-formation path is effectively gone; no separate DISBANDED/COLLAPSED taxonomy — bookkeeping without behavior.

**Dormant pressure.** Since phase = Discovery pressure (§7), dormancy freezes it: pressure holds at the highest ratified phase reached (the Confrontation ratchet generalizes — nothing un-rings), but it neither advances nor regresses while DORMANT. Nobody is investigating or sharing, so alert levels cannot organically escalate until re-formation. The frozen phase is stored as institutional state on the cohort record. **Re-formation seeds from institutional memory:** when new members join a dormant cohort, their initial hypothesis weights are seeded from the preserved knowledge — diegetically, the case files. The new detective reads the old notes. You can't kill an investigation by killing investigators.

**Joining:**
- **Authored.** The Forge draft tags the seat-holder and any starting allies.
- **Recruited.** A cohort member uses the RECRUIT behavior (see §3) to bring a non-member in through diegetic contact. Recruitment is belief-driven: the target's threat hypothesis must cross a threshold.
- **Witnessed.** A non-member experiences something directly — finds a body, sees the threat — and their hypothesis weight spikes past the threshold on its own. No recruiter needed.

**Leaving:**
- **Death.** May trigger MOURN in the survivors; the cohort's grief is content.
- **Fled.** Left the area entirely — out of the cohort and the scenario space.
- **Fractured.** Betrayed or expelled. The dramatic exit.
- **Drifted.** Belief decayed below threshold. They stop believing, stop showing up. The quiet exit — arguably the cruelest.

### 2.2 Design note

The seat-holder is the anchor, but the cohort is not a monolith. Members can disagree, split, and turn on each other (see FRACTURE, §3). The seat-holder carries two mechanical privileges:

- **Phase anchor.** Collective transitions into CONFIRMATION or CONFRONTATION require the seat-holder's hypothesis weight to cross the threshold or concur with the quorum. The cohort cannot outrun its leader's beliefs.
- **Disruption shock.** If the seat-holder is killed, fractures, or flees, all remaining members take an immediate cohesion penalty — mechanically biasing the survivors toward MOURN, DENY, or internal FRACTURE. (Side effect, and intended gameplay: assassinating the lead investigator is an emergent villain strategy for collapsing a cohort.)
- **Succession.** The anchor privilege is not permanently lost with the anchor. After the disruption shock decays — a deterministic **vulnerability window** measured in fictional time (exact length is a threshold value, §12) — succession fires: an authored second-in-command if the blueprint names one, otherwise the remaining member with the highest threat-hypothesis weight (ties broken by cohort tenure). The successor rebinds the seat and restores phase-anchoring. Rationale: permanent anchor loss would dominate villain strategy (every Bateman player assassinates the leader first, game solved). The window preserves the reward — kill the sheriff and the cohort reels, unable to reach Confirmation or Confrontation — while keeping the system recoverable. The deputy picks up the badge, but not immediately.

---

## 3. The behavior matrix — fifteen verbs

The cohort's autonomy is a **matrix of fifteen simple behaviors**. Each behavior is individually simple — a few preconditions, one or two effects. Richness comes from combination across characters, not from complexity within any single behavior. This follows the Horror Grammar principle: *the machine determines what occurs; the model renders it.*

**The diegetic rule (no Director verbs):** every behavior must read as something a person would do. If a behavior can't be explained as a character decision, it doesn't belong in the matrix.

Behaviors are grouped by **valence** — this is the anti-escalation mechanism. An earlier five-verb draft (all escalating) was rejected as a conveyor belt to confrontation. A real group under threat also denies, fractures, hides, and pursues petty side-agendas.

**Escalating** (moves toward confrontation):
- **INVESTIGATE** — gather information at a node. Feeds hypothesis weights; the primary driver of phase advancement.
- **SHARE** — spread findings to other cohort members *through diegetic channels* (co-location, shouting through ducts, a left note, a radio). No telepathy. This is how Confirmation happens mechanically. **Spatial gating:** SHARE (and acoustic traces generally) are constrained by the scenario's topology graph — same node: instant, high-clarity; adjacent nodes: permitted only if the connecting edge is OPEN (shouting / line of sight); distant or disconnected: rejected unless both members hold an authored communication item (e.g., walkie-talkies). Consequence for the villain seat: cutting power, locking a fire door, or disabling an intercom *mechanically severs* the cohort's ability to SHARE — stalling Confirmation is something the player does with their hands, not a menu option.
- **CLOSE_IN** — converge on the threat's suspected position. Hard-gated: requires Confirmation-phase-or-later *and* a location hypothesis above an evidence threshold. Investigators corner; predators chase. No evidence, no closing in.
- **TRAP** — prepare an ambush at a node. Distinct from FORTIFY (below): a trap is offensive, a fortification is defensive.

**De-escalating** (moves away — the missing half):
- **DENY** — refuse to update on new evidence. This *is* Carroll's Onset phase as a behavior, and it's deeply human. Cheap in Onset; the state-driven pick for members near their breaking point.
- **HIDE** — go quiet. Emits fewer traces — which is itself terrifying to discover.
- **FLEE** — abandon the area. Shrinks the cohort (see §2.1).

**Lateral** (neither — this is where the life is):
- **MISDIRECT** — act on a *wrong* hypothesis. The dramatic-irony engine: the player knows they're searching the wrong wing. Kept deliberately — it's what makes the cohort feel like people instead of a threat-delivery system.
- **PURSUE_AGENDA** — personal goals unrelated to the threat: theft, grudges, hoarding. Self-interest as a fracture vector.
- **MOURN** — post-casualty regroup. Slow, quiet, trace-rich.
- **PARLEY** — attempt contact with the threat. Brave or foolish depending on what the player does with it.
- **FRACTURE** — turn on each other. The cohort is not a monolith; this is the mechanical expression of that.
- **WARN** — alert non-cohort cast. Creates traces the player can find; a recruitment-adjacent behavior.
- **RECRUIT** — seek a non-member's commitment ("join us," not just "watch out"). The mechanical expression of the seat-based membership model. **Targeting rule:** Target = argmax over non-members of (DissonanceWeight(c) × RelationshipAffinity(c)), gated by spatial proximity (same chamber or 1-hop adjacent, per the no-telepathy law). They appeal to people who are already uneasy and whom they personally trust. This complements the Witnessed join path (§2.1): RECRUIT covers the trusted-but-uneasy, Witnessed covers unconnected strangers who saw something themselves — no overlap, no gap.
- **FORTIFY** — lock, bar, trap a node. Defensive and legible.

Each behavior will eventually need authored: preconditions, inputs/stimuli, target selection, fictional-time cost, canonical effects, trace emissions, phase implications, and failure/no-op behavior. That authoring is implementation-phase work; the whiteboard concern is only that the set is the right size and shape. (Fifteen verbs sits at the top of the workable budget — roughly a dozen-plus, each simple. Below ~8 the escalation funnel can't be escaped; much above this the authoring and test burden explodes and behaviors blur together. The close pairs — SHARE/WARN, TRAP/FORTIFY — were examined for consolidation and kept: intra-cohort belief propagation vs. alerting outsiders, and offensive ambush vs. defensive barring, are mechanically distinct jobs.)

---

## 4. Selection — how a member picks a behavior

**Two layers: environmental gating, then personality-weighted selection. Deterministic. No dice.**

**Layer 1 — Environmental gating.** The situation determines the *consideration set*: which behaviors are even thinkable right now. Calm and safe: all fifteen verbs are live, personalities roam free — this is where PURSUE_AGENDA, MISDIRECT, and the petty human stuff flourishes. Immediate threat: the set collapses to the survival subset (FORTIFY / HIDE / FLEE / CLOSE_IN) — tunnel vision under stress, which is psychologically true and trivially testable ("given threat proximity below X, MOURN is not in the consideration set"). Post-casualty: MOURN, DENY, and FRACTURE move to the front.

**Stage 1b — Executability filtering.** A behavior can be thinkable but infeasible: RECRUIT with nobody recruitable, MOURN with no casualty, TRAP with no valid target node, SHARE with no communication path, CLOSE_IN without a qualified location hypothesis, FLEE with no reachable exit. Hard preconditions eliminate infeasible behaviors **before scoring** — otherwise a high-affinity verb can repeatedly win and then no-op, which is exactly the dead deterministic loop this design exists to prevent. The full pipeline:

> Behavior universe → environmental/state gating → executable candidate set → personality scoring (× recency fatigue) → deterministic winner

**Layer 2 — Personality-weighted selection.** Within the executable candidate set, each member's affinity profile picks the winner, modulated by fine-grained environmental weights (evidence strength, threat proximity, breaking-point proximity, resource scarcity, casualty recency, social cohesion). The brave leader CLOSE_INs; the nervous one FORTIFies; the skeptic DENYs. Same situation, different people, different cohort.

Ties break by personality order. There is deliberately **no randomness, not even seeded**: the state space (15 verbs × member beliefs × environment × cohort phase) is rich enough to never meaningfully repeat, and determinism is what keeps the system testable and debuggable. If playtesting ever shows robotic repetition, *that* is when stochasticity gets revisited — not before.

**Deterministic anti-stagnation.** Pure determinism has a failure mode: a member in a static, unthreatened situation with unchanging beliefs would select the identical verb on every tick forever (FORTIFY, FORTIFY, FORTIFY…). The fix stays deterministic — a **per-member recency fatigue multiplier**:

> Score(verb) = Score_base(verb) × 0.4 if the member's last action was that verb, × 1.0 otherwise.

This guarantees an unthreatened character won't deterministically pick DENY or FORTIFY twenty ticks in a row, with no dice involved. Three qualifications: fatigue is per-member, not cohort-global (one person repeating themselves looks robotic; a pattern across members is content); **in-progress behaviors are exempt** — behaviors have fictional-time durations, and each tick first checks "is my current behavior still in progress?" before re-selecting (a multi-tick CLOSE_IN is a sustained pursuit, not a repeated decision); and the penalty biases rather than forbids — if every alternative is gated out, repeating at × 0.4 still wins, as it should. (Known accepted edge: ABAB two-cycles like FORTIFY → HIDE → FORTIFY read as routine, not glitch; extend the window only if playtesting complains.)

**The selection function is a character-arc machine.** A brave leader (high CLOSE_IN affinity, low DENY) pushed near their breaking point gets their affinities environmentally inverted: DENY and HIDE surge past CLOSE_IN. The player watches someone *stop acting like themselves*. Nobody scripted an arc; it fell out of affinity × environment.

---

## 5. Knowledge — what members believe

Each member carries a small set of **hypotheses** ("a threat exists," "the threat is in the east wing," "we are safe here"), each with an **evidential weight**. Behaviors read and write these weights; they never touch ground truth directly. The cohort is permanently one step behind reality, which is where horror lives.

- INVESTIGATE raises weights (on finding evidence).
- SHARE propagates weights between members — only through diegetic channels (§3).
- Contradictory traces decay weights.
- DENY suppresses updating; MISDIRECT acts on the currently-highest weight even when it's wrong.

This model was chosen as a starting place because it is **observable in testing**: a test can assert that INVESTIGATE at a node with fresh evidence raises the location hypothesis by N, or that SHARE moves the recipient's weight toward the sharer's. It can be expanded later without changing the interface.

**Hypotheses are authored blueprint IDs, not runtime strings.** Each scenario's blueprint defines a discrete hypothesis set (e.g., `hyp-threat-exists`, `hyp-threat-in-east-wing`, `hyp-exit-is-blocked`). The behavior matrix reads and writes weights on these predefined IDs only — Zod-validated, deterministic, no linguistic drift, no LLM-generated hypothesis strings at runtime. (Where new hypotheses come from — authored set per scenario vs. runtime generation from trace content — see open question 3, §12; the starting assumption is an authored set.)

**Provenance.** Weights alone say *what* a member believes, not *why*. Each hypothesis carries a minimal provenance layer — e.g., `lastSupportRef`, `lastContradictionRef`, `lastUpdatedTurn` (or bounded arrays of recent evidence references). A forensic receipt can then answer "Marcus believes the threat exists at 0.74 because he witnessed trace-184, shared trace-191, and has seen no contradiction since turn 17" — dramatically more useful than "Marcus believes threat-exists = 0.74," and what makes the system genuinely auditable rather than merely observable.

**Epistemic containment** (from the *Dynamic Tension* research): members act only on what they individually know. Offscreen cohort activity never narrates itself.

---

## 6. Time — the tick

**There are no neutral turns.** Cohort cycles advance on **fictional-time quanta**, not per player turn. Every turn commits a minimum quantum of fictional time (a glance, a held breath — the clock is strictly monotonic), so idling is not a pause button: it's a decision to let the world move while you don't. The player chooses *how* to spend time, never *whether*.

This rides the **existing fictional-time ledger** (turn actions already carry temporal costs; clocks advance on ratified time) — the cohort is a new reader of that ledger, not a new clock. Less new machinery, more maintainable.

**Tick semantics (contract).** A cohort tick advances all member behaviors against the *ratified* fictional-time delta: members with unexpired behavior durations continue their current behavior; only members whose behavior has completed may select a new one. This rules out the misreading where six NPCs each perform a fresh autonomous action every player turn. Behavior-duration state (`currentBehaviorId`, `startedAt`, `expiresAt`, `target`, `status`) is canonical session state, retakeable like everything else — a rollback must restore not just *what* Marcus was doing but *how far through it he was*.

**Bounded tick rate.** Player actions carry variable fictional-time costs (a swift attack: 15 seconds; searching a filing cabinet: 15 minutes). A long delta must not let one member chain multiple behaviors inside a single player turn — no investigator completes INVESTIGATE, then SHAREs, then CLOSE_INs across three rooms while the player inspected a desk. The bound: **per player turn, each member completes at most one behavior and initiates at most one new behavior.** Leftover fictional time is credited as progress into the new behavior's duration (capped at that duration — it may arrive partway done, but never completes same-turn); any further excess is discarded. Cost, stated honestly: during very long player actions the cohort's activity unfolds across subsequent turns rather than all at once. That's the readability price — the player should always be able to answer "what did they do while I did that?" in one sentence — and causality stays reconstructible.

**Commit-time semantics.** "No neutral turns" is the philosophy; the implementation contract is: **every successfully ratified player turn that incurs fictional time advances the cohort; failed, refused, or provider-failed turns do not** — otherwise a backend hiccup would move the world merely because the player pressed a button, violating TTM's fail-closed invariants. `SYSTEM_INIT` and other non-fictional administrative operations are explicitly exempt.

**Respite compatibility:** the pacing governor (the Breath) throttles *legibility*, not activity. During RESPITE_AFTERMATH the cohort still cycles — mourning, regrouping, arguing quietly — but traces go soft. The world feels alive without feeling hostile. Recovery with the faint sound of other people being afraid nearby.

**Retake compatibility (plumbing constraint):** TTM supports turn retakes, so cohort state cannot live as ephemeral process-global state. Membership, hypothesis weights, consideration sets, fatigue state, and trace receipts must reside inside revertable session state (e.g., `activeSession.cohortState`). Rolling back to turn N−1 must cleanly restore the cohort's beliefs and receipts to exactly what they were — a retake is time travel, and the cohort travels too.

---

## 7. Phases — the collective arc, and Discovery pressure

The cohort's collective phase — **Onset → Discovery → Confirmation → Confrontation** (after Carroll) — is not tracked separately. It is an **aggregate of member hypothesis weights**:

- **Onset:** nobody holds any threat hypothesis above a whisper threshold. DENY is cheap here — each member's affinity for DENY is artificially boosted by their **skepticism** stat.
- **Discovery:** at least one member crosses threshold T1 on "a threat exists." Active inquiry begins. **Skepticism erosion** governs this transition: each anomaly or trace a member encounters ticks a per-member **cognitive_dissonance** accumulator upward; when it exceeds their threshold, DENY drops to its baseline weight, unlocking INVESTIGATE. **Evidence identity matters:** traces carry stable IDs, and dissonance consumes *evidence events* — a member standing next to the same corpse for six ticks does not accumulate six ticks of dissonance. New evidence changes belief; proximity to old evidence does not.

**Ingestion trigger (contract).** To keep this event-driven rather than polled: a member evaluates evidence **only on node arrival or when a new trace is emitted in their current node** — plus **acoustic traces emitted in adjacent nodes connected by an OPEN edge** (a scream next door must be hearable, or the acoustic channel is a hole). Each member maintains a set of `ingestedEvidenceIds`: on arrival they query active traces at the node; any trace ID not in the set ticks dissonance and updates hypotheses, then joins the set. (Implementation footnote: bound or prune the set — trace IDs are cheap, but unbounded per-character growth over a long scenario is sloppy.) The old skepticism-erosion concept survives here as a transition mechanism, not a standalone packet.
- **Confirmation:** the hypothesis is *socially ratified* — a quorum holds it above T2, and it has survived at least one SHARE (Carroll's "convincing the incredulous group," mechanized).
- **Confrontation:** a *location* hypothesis crosses T3 — they don't just believe, they believe they know *where*. This gates CLOSE_IN and TRAP.

**Regression:** phases can slide backward. If evidence decays or the cohort MISDIRECTs itself, Confirmation can fall back to Discovery. This creates a **counterplay loop**: in the villain-protagonist configuration, the hunted hunts *informationally* — feeding false trails to manage what the cohort believes. The one exception: **Confrontation is a ratchet.** Once they've *acted* on a location belief (barred the door, set the trap, come for you), it can't be un-rung.

**Phase = Discovery pressure (single source of truth).** In the villain-protagonist model, the external pressure track ("they're onto me") is not a separate system — it *is* the cohort's phase, experienced diegetically. When pressure rises, it's because someone actually found something; the danger is honest and specific. The alternative (a separate pressure track with its own memory, modeling the character's nerves rather than the cohort's knowledge) was rejected: two tracks means two systems to keep in sync, and the sync failures are exactly where nonsense emergence breeds. The felt spike of a close call is the prose's job; the engine's numbers track what the world knows. **Numbers for knowledge, prose for nerves.**

**Governor boundary.** Cohort phase is the canonical *epistemic* state of the opposition (what they know). Dramaturgical pacing — the HG2 governor — remains responsible for *cadence and presentation* (how legible and intense the situation becomes). The two systems may influence one another through explicitly defined inputs, but no second opposition-pressure ledger is created; state is never duplicated.

---

## 8. Traces — what the player can perceive

**The diegetic law: no information about the cohort reaches the player except through the world.** No meters, no phase notifications, no "the investigators grow suspicious" banners. Everything arrives as sound, sight, evidence, or speech — routed through the topology graph and epistemic horizons like everything else in TTM. (This extends the *Dynamic Tension* paper's D2 principle: diegetic instruments, no floating HUD.)

Each behavior emits **zero to two traces**, each tagged with:
- a **channel** — acoustic (overheard murmur through a vent), visual (a barred door), evidential (displaced objects, a left note), social (a warning passed to an NPC who repeats it); and
- a **clarity** level, throttled by the Breath: turned down during respite, up during rupture.

The governing tension: traces must be informative enough that the player can reconstruct the *why* ("they barred the east door — they must have heard me in the vents"), but never so informative that they collapse the question ("they barred the east door because they know I'm in the vents and they're setting a trap"). **The trace says what happened; the why stays erotetic** (after Carroll — suspense lives in unresolved questions with competing outcomes).

Two corollaries:

1. **The player is allowed to be wrong.** Interpretation belongs to the player, and misinterpretation is legitimate play. They hear a barred door and conclude "they know I'm here" when the cohort was really FORTIFYing against something else. The engine must never correct them through a meta-channel. Their wrongness is content.
2. **Respite is active quiet** (from the paper, adopted): the cohort doesn't stop during RESPITE_AFTERMATH — it gets quieter and less legible. Dread-bearing quiet, not dead air.

**Auditability:** every cohort cycle emits a **receipt** — who acted, what they believed, which behavior fired and why (consideration set + scores). The player never sees receipts; they see traces. But traces must never contradict receipts, and the chain is always debuggable. Emergence is only gold if it's causally auditable.

---

## 9. Breaking points — shape vs. texture

TTM already has D3 breaking-point machinery (a proximity number per character). Series 2 integrates with it minimally and deliberately:

- The engine tracks **how close to the line** (proximity) and **that the line was crossed**.
- Crossing **re-gates the matrix**: the consideration set collapses to survival behaviors and personality weights get overridden. That's the whole mechanical content.
- Everything else — what the crack *looks like*, what caused it, what it means — is **prose**. Cracking because your cat died is a different cracking than staring into the Deadlights, and the engine doesn't need a taxonomy of traumas to render both. **The machine decides the shape of the breakdown; the model decides the texture.**

There is no "cracking" verb. Breakdown is a transition (like membership changes, §2.1), not an action.

---

## 10. Emergent vignettes (illustrative, not specified)

These are not scripted scenarios. They are the *kind* of thing the matrix should produce unprompted, offered here so reviewers can feel the target:

- **The schism.** A MISDIRECTs on a wrong hypothesis (noise in the east wing). B investigates properly and SHAREs the real finding. A — near their breaking point — DENYs it. C watches and FRACTUREs, siding with B. Nobody was scripted to have a falling-out; it fell out of belief states plus one stressed member.
- **The split defense.** A and B both FORTIFY — but different nodes, because they never SHAREd (one of them was HIDING). Two weak positions instead of one strong one. The player finds both and understands exactly why.
- **The theft.** A PURSUE_AGENDA (hoarding medicine) while B MOURNs a casualty. B discovers the hoard through a trace. FRACTURE. The threat did none of this — the cohort authored its own horror, and the player walked into the aftermath.

---

## 11. Design laws (summary)

1. **No Director verbs.** Every behavior must read as a character decision.
2. **No neutral turns.** Every turn costs fictional time; time always feeds the cohort.
3. **Diegetic-only information.** The player learns about the cohort through the world or not at all — and is allowed to be wrong.
4. **Machine decides shape, model decides texture.** Canonical behavior is deterministic; prose renders it.
5. **Emergence must be auditable.** Every cycle leaves a receipt; traces never contradict receipts.
6. **Determinism.** No dice, not even seeded. Repetition is broken by deterministic recency fatigue, not randomness. Testability is non-negotiable.
7. **Transitions, not actions, for lifecycle.** Membership changes and breakdowns are evaluated state changes, not matrix verbs.
8. **One source of truth for pressure.** The cohort's phase *is* Discovery pressure. Numbers for knowledge, prose for nerves.
9. **No telepathy, no teleportation.** Communication and traces obey the topology graph. Severing a channel is a physical act with mechanical consequences.
10. **Retakes are time travel.** Cohort state lives in revertable session state; rolling back a turn restores beliefs and receipts exactly.

---

## 12. Open questions (deferred, not forgotten)

1. **Per-behavior authoring.** Preconditions, stimuli, target selection, time costs, canonical effects, trace emissions, phase implications, failure/no-op behavior for each of the fifteen verbs. Implementation-phase work.
2. **Threshold values.** T1/T2/T3 for phase transitions, recruitment thresholds, drift thresholds, dissonance thresholds, succession vulnerability window length. These want playtesting, not armchair values. (The fatigue multiplier's 0.4 is set; revisit only with playtest evidence.)
3. **Hypothesis generation.** Where do new hypotheses come from — a fixed authored set per scenario, or generated at runtime from trace content? (Starting assumption: authored set; §5 pins runtime behavior to blueprint IDs regardless.)
4. **Multi-cohort scenarios.** Can two opposition cohorts exist (e.g., investigators *and* a rival survivor group)? Out of scope for the seed; noted.
5. **Trace authoring budget.** Zero-to-two traces per behavior × fifteen behaviors × four channels is a real authoring surface. Needs a plan, not just a principle.

---

## 13. Suggested implementation boundary

Do not implement all fifteen behaviors at once. The clean first boundary proves the *machine that runs the cohort* before populating it:

1. Canonical opposition cohort state (membership, DORMANT status, phase aggregates)
2. Member cognition / hypothesis state (authored IDs, weights, provenance)
3. Membership lifecycle (join/leave transitions, evaluator, succession)
4. Cohort tick + duration model (contract §6)
5. Deterministic candidate selection (gating → executability → scoring → fatigue)
6. One or two implemented behaviors (INVESTIGATE + SHARE exercise the epistemic core)
7. Receipt + trace infrastructure (diegetic channels, clarity, auditability)
8. Retake / persistence proof (rollback restores beliefs, durations, receipts exactly)

Then expand the behavior matrix. Fifteen individually simple behaviors become one enormous integration problem if built simultaneously.

**Emergence fixtures, not just unit tests.** Beyond per-verb unit tests, require multi-turn deterministic fixtures seeded from the §10 vignettes: three members → contradictory evidence → divergent beliefs → SHARE → FRACTURE; casualty → MOURN → recruitment attempt → split defense. These test whether the *system* generates the behavior the design describes.

---

*End of draft v0.5. Hand to Antigravity for implementation-packet authoring: scaffold the `CohortState` types and the §13 initial boundary (canonical state → cognition → lifecycle → tick → selection → INVESTIGATE + SHARE → receipts/traces → retake proof), with the §10 vignettes as deterministic emergence fixtures.*
