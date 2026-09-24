# Antigravity Project Directives — The Terror Machine

## Default Workflow: Boost Protocol for Major Tasks

For any non-trivial coding task, feature implementation, architectural refactor, or complex investigation:

1. **Always Follow the Boost Delegation Routine**:
   - Establish or verify a comprehensive implementation plan before writing or altering code.
   - For major features, architectural additions, and multi-file changes, delegate execution to specialized subagents (`DeepCoder` for coding, `DeepInvestigator` for investigation and root-cause analysis).
   - Maintain high fidelity to user requirements without pre-emptively truncating scope.

2. **Multi-round Verification & Independent Audit**:
   - Never accept subagent output at face value; independently verify all changes against the full test suite (`npm test`), linter (`npm run lint`), and TypeScript compiler (`npx tsc --noEmit`).
   - Run additional passes until all requirements, boundary invariants, edge cases, and emergence fixtures pass cleanly with zero regressions.

3. **Core Architectural Ground Rules**:
   - Strictly adhere to Horror Grammar (HG2) principles:
     - The machine decides shape, the model decides texture.
     - Epistemic containment: characters only act on what they diegetically know.
     - Diegetic-only information: the player perceives world traces, never internal ledger receipts.
     - Strict determinism: zero RNG, no seeded dice, no random timestamps.
