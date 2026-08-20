# The Terror Machine — Public Roadmap

The Terror Machine is being built as a stateful horror machine: language can improvise the surface, but the Engine decides what becomes true. This roadmap is directional. It has no promised dates, release cadence, or feature-volume target.

## Where the project is now

TTM has a working foundation for bounded simulation. It can run authored Blueprints or begin through Haunted House Induction, carry a turn through snapshot → generation → ratification → commit/fail, preserve canonical topology, and export the evidence of what happened.

The current development line is deliberately between milestones:

- **Live:** turn contracts, role boundaries, topology, retake, telemetry, Blueprint and Induction entry paths, and the bounded World Memory path.
- **Under review:** explicit Player-Character Binding. Human telemetry demonstrates exact selection, including a non-first eligible character; the full acceptance gate is still being closed.
- **Next:** a conversational way to resolve Forge source gaps before a Blueprint is exported, followed by stronger Autopilot identity and provenance.

## Near-term roadmap

1. **Close explicit Player-Character Binding**

   Make the selected character remain coherent from setup through context, prompts, receipts, retakes, and telemetry. The runtime contract must stay Blueprint-agnostic: a Blueprint supplies data; it must not leak scenario assumptions into Engine code.

2. **Give the Forge a gap-resolution conversation**

   Let the existing Architect console present a compact queue of unresolved source questions. The user answers in that same input surface; the Architect may ask a follow-up; each proposed change goes through the existing review and accept/reject path before it can alter the draft.

   The Forge should distinguish source evidence, interpretation, authoring additions, and deliberately preserved ambiguity. A user should be able to leave a question unresolved when uncertainty is part of the intended Blueprint.

3. **Finish durable continuity**

   Extend bounded character and world memory into a dependable, inspectable continuity layer for discoveries, rules, relationships, and consequences without turning the model into the owner of canon.

4. **Make Autopilot a trustworthy test participant**

   Give automated runs enough selected-character context to exercise identity-sensitive behavior, stop cleanly after failed turns, and label human versus Autopilot input in telemetry and exports.

5. **Build a better Voice**

   Keep the Voice read-only while making its observations evidence-labelled and context-aware: it should know whether a question concerns a Forge draft, an Engine session, outside research, or the project conversation itself.

6. **Support campaign continuity**

   Allow multiple Blueprints to form an authored campaign with explicit, scoped state handoff between acts.

7. **Develop a generative horror grammar**

   Research mechanics for pressure, pacing, fear, revelation, and recovery rather than a shelf of preset plots.

8. **Keep the provider boundary replaceable**

   Preserve the Engine contract while making the underlying model provider replaceable when the project is ready. Gemini in Google AI Studio remains the current development runtime, not a claim of provider neutrality today.

## What will not change

- The application, not the language model, owns canonical state.
- A proposal is not a commit. Accepted state changes must pass the Engine's contracts.
- Runtime instructions remain scenario-agnostic and Blueprint-agnostic.
- Retake, exit, and other out-of-fiction controls remain available to the person using the machine.
- Literary strangeness is welcome; silent contradictions are not.

For implementation order, acceptance gates, and the current verification debt, see the [development roadmap](./DEVELOPMENT-ROADMAP.md).
