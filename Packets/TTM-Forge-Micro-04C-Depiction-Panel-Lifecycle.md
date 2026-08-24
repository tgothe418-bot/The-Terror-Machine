# TTM Forge Micro-Packet 04C — Depiction Panel Lifecycle

Sequence: after Micro-Packet 04B

## Finish Line

The Depiction Contract panel can generate, review, apply, dismiss, refresh, and manually edit a source-grounded proposal. Proposal generation is reachable only from a stable Source Baseline.

## Source Boundary

Change only:

- `src/components/forge/DepictionContractPanel.tsx`
- `src/components/forge/DepictionContractPanel.test.tsx`
- `src/lib/depictionContractContext.ts`

Read only:

- `src/store/useForgeStore.ts`
- `src/types/forge.ts`
- `src/lib/forgeReadiness.ts`

Do not change server routes, schemas, prompts, stores, Engine, Runtime, evidence presentation, or export behavior.

## Implementation

### Stable-baseline context helper

Create one pure helper that derives a bounded generation request from current Forge draft, Source Baseline analyses, canonical ambiguity decisions, `draftRevision`, and `sourceBaselineRevision`.

Generation is ready only when:

- no accepted candidate remains staged;
- every ambiguity is `resolved` or `contextual_discretion`;
- no source analysis is in error.

Rejected candidates and contextual discretion are terminal. An incomplete Depiction Contract does not block generation.

The helper includes only normalized scenario structure, applied candidate facts, source summaries, bounded evidence, canonical ambiguity decisions, and both revisions. It never includes uploaded document bodies.

### Panel request lifecycle

Add:

- Generate when no proposal exists;
- loading state;
- visible blocked reason;
- visible request failure and Retry;
- staged proposal with rationale;
- Apply and Dismiss;
- stale status with captured/current revisions;
- Refresh for stale proposals.

Send `kind: 'DEPICTION_CONTRACT_PROPOSAL'`. Validate `type` and parse the complete returned proposal with `DepictionContractProposalSchema` before storing it. Receiving a valid proposal must not change the draft.

Apply and stale rejection rely on the store's internal revision checks from Micro-Packet 04A. Refresh replaces the pending proposal only after a valid new response.

### Manual editor

Render all five canonical fields as textareas with `maxLength={1000}` and visible `currentLength/1000` counts.

The first four fields reject empty values and at least `unknown`, `none`, `n/a`, and `tbd`. `specialBoundaries` remains optional. Manual editing remains available whether or not a proposal is staged.

Add one component test named exactly:

`runs the Depiction Contract review lifecycle`

Cover blocked generation, valid request context, proposal staging without draft mutation, stale Apply disabled, Refresh, valid Apply, Dismiss, and textarea limits/counts within this one lifecycle test.

## Source Proof

Run once after implementation:

```bash
rg -n "DEPICTION_CONTRACT_PROPOSAL" src/components/forge/DepictionContractPanel.tsx
```

## Execution Budget

1. Read each scoped file once. Use symbol searches for follow-up inspection.
2. Complete the helper, panel, and test edits before running Vitest.
3. Run only:

```bash
npx vitest run src/components/forge/DepictionContractPanel.test.tsx -t "runs the Depiction Contract review lifecycle" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint src/components/forge/DepictionContractPanel.tsx src/components/forge/DepictionContractPanel.test.tsx src/lib/depictionContractContext.ts --max-warnings 0
```

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the two verification commands printed in steps 3 and 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. Do not create a separate helper test. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Generate/review/apply/refresh behavior implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
