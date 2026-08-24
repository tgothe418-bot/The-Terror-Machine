# TTM Forge Micro-Packet 06A — Revision-Bound Export Artifact

Sequence: after Micro-Packet 05

## Finish Line

Blueprint export compilation produces one deeply immutable artifact that records both the Forge draft revision and Source Baseline revision supplied at capture time.

## Source Boundary

Change only:

- `src/types/forge.ts`
- `src/lib/forgeCompiler.ts`
- `src/lib/compileBlueprintDraft.ts`
- `src/lib/compileBlueprintDraft.test.ts`
- `src/components/forge/ExportReviewModal.tsx`, only to pass the new typed context at existing call sites

Do not implement modal snapshot or stale-review behavior in this packet. Do not change readiness, Source Baseline, Depiction generation, Engine, Runtime, or evidence presentation.

## Implementation

Introduce:

```ts
interface ForgeCompilationContext {
  draftRevision: number;
  sourceBaselineRevision: number;
}
```

Require that context at the export-review compilation boundary.

`ForgeReviewArtifact.sourceBaselineRevision` becomes required. Both artifact revision values must be copied from the supplied context rather than inferred or defaulted.

The artifact must contain:

- canonical Blueprint;
- serialized JSON;
- sanitized filename;
- compilation timestamp;
- source draft ID;
- source draft revision;
- Source Baseline revision.

Deep-freeze the artifact and every nested object/array, including the Blueprint.

Lower-level non-export compilation helpers may retain a narrowly compatible signature only if required by existing internal callers. `prepareBlueprintExport` and every Export Review call must supply both revisions explicitly.

Update the two existing modal handler calls only enough to pass `{ draftRevision, sourceBaselineRevision }`. Packet 06B will replace those handler-level calls with one captured review snapshot.

Add one compiler test named exactly:

`creates a deeply frozen artifact with both source revisions`

Prove exact revision copying and deep immutability of the artifact, Blueprint, and nested arrays/objects.

## Execution Budget

1. Read each scoped file once. Inspect only the two modal call sites, not the full component again.
2. Complete implementation and test edits before running Vitest.
3. Run only:

```bash
npx vitest run src/lib/compileBlueprintDraft.test.ts -t "creates a deeply frozen artifact with both source revisions" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint src/types/forge.ts src/lib/forgeCompiler.ts src/lib/compileBlueprintDraft.ts src/lib/compileBlueprintDraft.test.ts src/components/forge/ExportReviewModal.tsx --max-warnings 0
```

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the two verification commands printed in steps 3 and 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Revision-bound artifact contract implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
