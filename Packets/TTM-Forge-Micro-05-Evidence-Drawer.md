# TTM Forge Micro-Packet 05 — Focused Evidence Drawer

Sequence: after Micro-Packet 04C

## Finish Line

Candidate evidence is collapsed by default and remains fully available in one accessible in-application review drawer for the candidate currently being inspected.

This packet changes presentation only. Evidence strings, attribution, candidate decisions, Source Baseline state, and the Forge draft remain unchanged.

## Source Boundary

Change only:

- `src/components/forge/ScenarioBaselinePanel.tsx`
- `src/components/forge/ScenarioBaselinePanel.test.tsx`
- `src/components/forge/SourceEvidenceDrawer.tsx`

Do not change stores, types, server routes, prompts, source parsing, candidate application, ambiguity resolution, Depiction Contract behavior, or export behavior.

## Implementation

### Compact ledger

Remove candidate evidence claims and excerpts from the normal Source Baseline flow.

For a candidate with linked evidence, render a compact control:

```text
Evidence · N
```

It starts collapsed, identifies the candidate in its accessible name, and exposes `aria-expanded` and `aria-controls`. A candidate with no linked evidence renders no empty control.

### Drawer

The drawer receives only the already-linked evidence records plus the source filename and candidate label. Display each record's category, claim, excerpt when present, and source attribution without rewriting stored strings.

Required interaction:

- labelled dialog semantics;
- visible close control;
- Escape and backdrop close;
- clicks inside do not close;
- focus enters the overlay;
- focus returns to the opener;
- overlay content scrolls independently;
- the Source Baseline page position is preserved.

Use an in-application overlay. Do not open a browser window. The drawer must not refetch, recompute, or write Forge state.

Add one integration test named exactly:

`reviews linked evidence without changing Forge state`

Cover default collapse, candidate-specific evidence, opening and all close paths, focus return, no-control behavior, unchanged evidence strings, and an exact before/after Forge-state comparison.

## Source Proof

Run once after implementation:

```bash
if rg -n "evidence\.excerpt|Source Evidence:" src/components/forge/ScenarioBaselinePanel.tsx; then exit 1; fi
```

## Execution Budget

1. Read each scoped file once and use symbol-level searches for follow-up inspection.
2. Complete all component and test edits before running Vitest.
3. Run only:

```bash
npx vitest run src/components/forge/ScenarioBaselinePanel.test.tsx -t "reviews linked evidence without changing Forge state" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint src/components/forge/ScenarioBaselinePanel.tsx src/components/forge/ScenarioBaselinePanel.test.tsx src/components/forge/SourceEvidenceDrawer.tsx --max-warnings 0
```

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the two verification commands printed in steps 3 and 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. Do not create a separate drawer test. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Drawer and accessibility behavior implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
