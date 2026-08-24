# TTM Forge Micro-Packet 06B — Immutable Export Review Snapshot

Sequence: after Micro-Packet 06A

## Finish Line

Opening Export Review captures one immutable, revision-bound artifact. Copy and Download use that exact snapshot. A later draft or Source Baseline change makes the review stale until the creator refreshes it.

## Source Boundary

Change only:

- `src/components/forge/ExportReviewModal.tsx`
- `src/components/forge/ExportReviewModal.test.tsx`
- `src/lib/forgeReadiness.ts`

Conditional:

- `src/components/forge/Forge.tsx`, only if mounting the modal only while open is necessary to establish one capture boundary

Do not change compilers, types, Source Baseline mutation behavior, ambiguity resolution, Depiction generation, Engine, Runtime, or evidence presentation.

## Implementation

### Capture boundary

When Export Review opens:

1. Evaluate `validateForgeExportReadiness`.
2. If invalid, retain field-addressable diagnostics and capture no artifact.
3. If valid, call `prepareBlueprintExport` once with the current draft and both revisions.
4. Retain that artifact as the review snapshot.

Do not automatically replace the snapshot when live Forge state changes while the modal is open.

### Snapshot actions

Copy writes `artifact.json`.

Download uses `artifact.json` and `artifact.fileName`.

Neither handler may validate, normalize, or compile the live draft. Remove handler-level compiler calls. The component should contain exactly one compiler invocation at its capture/refresh boundary.

### Staleness and refresh

The snapshot is stale when either current revision differs from the captured revision.

When stale:

- keep the captured review visible;
- show captured and current revisions;
- disable Copy and Download;
- enable Refresh Review.

Refresh reruns readiness and captures one replacement only when readiness and compilation succeed.

### Readiness totals

Display the pure readiness summary for:

- source count;
- candidate total, applied, staged, and rejected;
- ambiguity total, resolved, contextual discretion, and open.

Add `unknownTotal` to the readiness summary if needed. Do not recalculate ledger totals in the modal.

Add one component test named exactly:

`copies and downloads one reviewed artifact until revisions change`

Cover one capture, identical Copy/Download bytes, no handler recompilation, both stale paths, disabled actions, refresh replacement, invalid readiness with no artifact, and rendered source totals.

## Source Proof

Run once after implementation:

```bash
test "$(rg -n "prepareBlueprintExport\(" src/components/forge/ExportReviewModal.tsx | wc -l)" -eq 1
```

## Execution Budget

1. Read each scoped file once and use symbol-level searches for follow-up inspection.
2. Complete implementation and test edits before running Vitest.
3. Run only:

```bash
npx vitest run src/components/forge/ExportReviewModal.test.tsx -t "copies and downloads one reviewed artifact until revisions change" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint src/components/forge/ExportReviewModal.tsx src/components/forge/ExportReviewModal.test.tsx src/lib/forgeReadiness.ts --max-warnings 0
```

If `Forge.tsx` changed, add it to that same one ESLint command; do not run a second ESLint command.

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the named Vitest command in step 3 and the one scoped ESLint command in step 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Snapshot, staleness, and readiness-summary behavior implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
