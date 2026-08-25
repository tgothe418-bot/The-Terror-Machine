# TTM Horror Grammar Implementation Series

**Series:** TTM Horror Grammar  
**Sequence:** 0 through 16  
**Delivery model:** One numbered update at a time  
**Initial verified baseline:** `4a13162d819ee98475f5782035d83619f5279965`  
**Initial workspace tree:** `bb38d3510223436908a3f2d944dcdccf4d076bab`

## Purpose

This series introduces a researched, generative horror grammar into The Terror Machine without replacing the architecture already built.

The existing atomic turn path, canonical state, Blueprint and Haunted House Induction entry paths, Depiction Contract, topology, cast, relationships, bounded character memory, World Memory, Retake, receipts, telemetry, and role contracts remain the foundation.

The grammar must add operational meaning to those systems. It must not create a parallel horror engine whose state can disagree with them.

## Permanent Series Rules

Every numbered instruction must preserve these rules unless Justin explicitly changes them:

1. **The model proposes. The machine decides.** Generated prose and proposals do not own canon.
2. **TTM can be hostile to a character, but never the User.** Retake, Restart, exit, recovery, and diagnostics remain outside the fiction.
3. **The Engine never acts on behalf of the User.** It preserves the submitted action and evaluates feasibility, cost, response, and consequence without substituting another intention.
4. **Failed validation preserves canonical state.** Failure produces bounded evidence, not partial mutation or convenient fiction.
5. **No parallel horror engine.** Reuse or minimally extend existing contracts and state owners.
6. **No automatic code requirement.** A numbered update may conclude that an existing mechanism already satisfies part or all of the principle. Evidence is an acceptable outcome.
7. **No universal horror score, mandatory escalation ladder, or rigid monster taxonomy.** Scenario grammar is contextual.
8. **No blanket authority for supernatural effects.** Threat effects must remain within established scale, reach, domains, and constraints.
9. **No authoring-form explosion.** Do not convert the grammar into sixteen mandatory creator fields. Reuse source extraction, Blueprint structure, the Depiction Contract, and compact reviewed proposals.
10. **Bound prompt projection.** Only grammar relevant to the active scenario, character, place, and turn may enter a turn request.
11. **Preserve source provenance.** Source-derived material remains staged until explicitly reviewed and accepted.
12. **Preserve situated knowledge.** What happened to the world, what a character experienced, what a character believes, and what remains unresolved must not be silently collapsed.
13. **No UI redesign unless a numbered update explicitly requires one.** Maintain the existing large-display design target.
14. **No content-policy expansion by implication.** A grammar update does not silently change scenario depiction boundaries.
15. **Do not use the banned default names `Dr. Evelyn Vance` or any character named `Thorne`.**
16. **Do not include repository synchronization instructions.** Repository synchronization remains under Justin's control.

## Standard Packet Header

Every instruction file must begin with the same metadata pattern:

```text
Series: TTM Horror Grammar
Update: N of 16
Depends on: completed Update N-1 report, or NONE for Update 0
Expected baseline: exact SHA supplied after the preceding update
```

The packet must stop before editing if its expected baseline does not match the tracked workspace. Pre-existing untracked reference files under `Packets/` are not part of the tracked baseline and must be preserved.

## Delivery and Review Cycle

1. Deliver the next numbered Markdown instruction to ATG.
2. ATG verifies the expected baseline before editing.
3. ATG implements only that numbered scope and runs focused verification.
4. ATG returns one completion report containing evidence, residual defects, and the resulting workspace state.
5. Review the report before drafting the next numbered instruction.
6. Update the next packet's expected SHA from the newly synchronized repository state.

Future numbered packets are deliberately not frozen in advance. Earlier implementation evidence may change the safest and smallest design for later principles.

## Canonical Order

### 0. User Sovereignty and Foundation Boundary Integrity

Establish Retake and Restart as out-of-fiction controls; isolate abandoned-turn diagnostics; close the Truth Check foundation findings that would undermine later grammar work.

### 1. Horror Threatens a Value

Ensure horror pressure is grounded in an established attachment, goal, duty, identity, refuge, bodily integrity, relationship, belief, or desired future.

### 2. Reality Has a Posture

Represent contextual movement among coherent, perturbed, contested, manifest, and receded conditions without creating a universal tension ladder or confusing diegetic reversion with Retake.

### 3. Pressure Has Jurisdiction

Describe threat scale, reach, operational domains, and constraints so physically bounded, psychological, environmental, supernatural, and ontological threats behave according to their scenario.

### 4. Uncertainty Is Bounded

Distinguish unknown, discoverable, observed-but-unexplained, conflicting, contextual, and impossible claims while preserving meaningful avenues for investigation or response.

### 5. Details Prepare the Imagination

Use sensory and environmental circumstances to prepare expectation, vulnerability, character perspective, and causal possibility without filling prose with interchangeable spooky decoration.

### 6. The Engine Never Acts for the User

Prove that interpretation, generation, ratification, failure, Retake, role authority, and narrative realization preserve the User's submitted action and do not substitute unwanted intent.

### 7. Escalation Changes the Situation

Make escalation alter distance, access, knowledge, cost, trust, exposure, capability, time, safety, or threat rules rather than merely increasing verbal intensity.

### 8. Horror Leaves an Aftermath

Ensure accepted events persist through character state, relationships, memory, environmental traces, injuries, restrictions, knowledge, and future possibility.

### 9. The Nightmare May Metabolize Resistance

Permit an authorized threat to absorb, redirect, imitate, or transform a User action without changing who chose the action or granting every scenario an illusion-based escape hatch.

### 10. The Scenario Selects Its Axes of Uncertainty

Allow contextual uncertainty about agency, ontology, causation, intent, perception, identity, history, extent, or reliability without requiring every scenario to use every axis.

### 11. Space Is Mutable; Autonomy Is Conditional

Allow environments to change through accepted events while granting independent spatial behavior only when the scenario establishes that authority.

### 12. Revelation Spends Possibility

Treat confirmation as a meaningful canonical expenditure that changes knowledge, action, or the remaining uncertainty rather than revealing or withholding by habit.

### 13. Recurrence Is Semantic, Not Lexical

Track motif identity and evolving function without prompting repetitive wording, repeated scare beats, or catchphrases.

### 14. Perception Is Evidence, Not Explanation

Preserve what a character canonically perceived without automatically establishing the perception's apparent source, cause, or interpretation as world fact.

### 15. Distortion Requires Scenario Authority

Permit altered scale, time, sequence, identity, causality, or space only when supported by scenario jurisdiction and committed through the appropriate truth and state boundaries.

### 16. Victories Have Scope and Remain Victories

Support partial victories, refuge, competence, rescue, learning, resistance, and survival without retroactively erasing accepted success merely to protect the threat.

## Tier Labels

The tiers describe breadth, not execution order:

- **0:** User covenant and prerequisite boundary integrity
- **1-8:** Core operational principles
- **9-12:** Contextual secondary principles
- **13-16:** Optional tertiary techniques and protections

The numerical sequence remains authoritative.

