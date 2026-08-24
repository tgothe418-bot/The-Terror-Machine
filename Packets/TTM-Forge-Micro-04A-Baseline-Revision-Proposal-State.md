# TTM Forge Micro-Packet 04A — Baseline Revision and Proposal State

Sequence: after Micro-Packet 03B

## Finish Line

The Source Baseline has its own persisted revision, and a complete Depiction Contract proposal is retained as an isolated, revision-bound object that cannot apply after either source state changes.

## Source Boundary

Change only:

- `src/types/forge.ts`
- `src/store/useForgeStore.ts`
- `src/store/useForgeStore.test.ts`

Do not change server routes, prompts, UI components, Engine, Runtime, evidence presentation, readiness validation, or export behavior.

## Implementation

### Source Baseline revision

Add `sourceBaselineRevision: number` to Forge state with deterministic initial value `1`.

Advance it exactly once after a successful Source Baseline ledger mutation:

- source-analysis registration or removal;
- candidate review decision;
- staged candidate edit;
- successful accepted-candidate batch application;
- unknown answer, follow-up, or proposal receipt;
- proposal edit;
- accepted resolution;
- contextual discretion;
- unknown error or retry.

Failed validation, missing targets, and semantic no-ops do not advance it. A mutation that also changes the draft may advance `draftRevision` once and `sourceBaselineRevision` once; neither revision may advance twice.

### Complete proposal state

Replace the legacy patch-only store member with `DepictionContractProposal`:

- complete five-field contract;
- rationale;
- `sourceDraftRevision`;
- `sourceBaselineRevision`;
- `createdAt`.

`setPendingDepictionContractProposal` must parse the complete proposal before storing it. Invalid proposals leave state unchanged.

`applyPendingDepictionContractProposal` must recheck both proposal revisions against current state inside the action. A stale proposal remains stored and produces a failure result; it does not change the draft or either revision.

A valid Apply writes all five fields together, clears the pending proposal, and advances `draftRevision` once. Dismiss clears only the proposal.

### Persistence

Bump Forge persistence from version 4 to version 5.

Persist `sourceBaselineRevision` and `pendingDepictionContractProposal`. During migration:

- supply revision `1` when absent;
- retain a proposal only when the complete current schema parses;
- discard legacy patch-only or malformed proposals;
- do not clear a valid or stale complete proposal during hydration.

Staleness is not corruption. A valid stale proposal must survive refresh so the panel can explain why it cannot apply.

Add one store test named exactly:

`tracks baseline revision and persists revision-bound proposals`

Cover successful/no-op revision changes, valid proposal hydration, legacy proposal rejection, valid Apply, and stale Apply failing without mutation.

## Source Proof

Run once after implementation:

```bash
if rg -n "pendingDepictionContractProposal\.patch" src/store/useForgeStore.ts; then exit 1; fi
```

## Execution Budget

1. Read each scoped file once and use symbol-level searches for later inspection.
2. Complete the implementation, migration, and test edit before running Vitest.
3. Run only:

```bash
npx vitest run src/store/useForgeStore.test.ts -t "tracks baseline revision and persists revision-bound proposals" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint src/types/forge.ts src/store/useForgeStore.ts src/store/useForgeStore.test.ts --max-warnings 0
```

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the two verification commands printed in steps 3 and 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Revision and proposal-state behavior implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
