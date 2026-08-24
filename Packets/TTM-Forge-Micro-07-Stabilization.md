# TTM Forge Micro-Packet 07 — Corrective Sequence Stabilization

Sequence: run only after Micro-Packets 02A through 06B have each been reviewed and accepted

## Finish Line

Verify the complete corrective sequence together and repair only integration regressions caused by that sequence. Add no new behavior.

## Allowed Repair Boundary

Repairs may touch only files changed by Micro-Packets 02A through 06B. A test fixture outside that set may change only when its failure is caused directly by a corrected public signature and the fixture needs the new valid input.

Do not redesign features, weaken schemas, add compatibility fallbacks, or repair unrelated baseline failures.

## Verification Order and Budget

### Strict stabilization verification limit

This is the sole stabilization packet. The complete suite, TypeScript, lint, and production build are authorized here only because they are explicitly listed in sections 1 through 4 below. You may execute only those listed commands and the failing-test-file or named-test commands expressly permitted by section 1 after a failed complete-suite run.

Do not add `npm test`, a second lint command beyond its stated retry, an extra TypeScript or build run beyond its stated retry, formatter commands, `git diff --check`, or an automatic quality-check bundle. Follow every run cap and stop rule below. After the last applicable listed gate completes, stop work and return the completion report; this packet authorizes no other verification.

### 1. Complete test suite

Run once with concise output:

```bash
npx vitest run --reporter=dot --silent
```

If it passes, do not run it again.

If it fails:

1. Group failures by changed contract.
2. Inspect only the first directly related failure group.
3. Make the smallest in-boundary repair.
4. Run only that failing test file or named test.
5. Repeat for other directly related groups.
6. After all related failures pass individually, run the complete suite one final time.

Maximum: two complete-suite runs. If the second complete-suite run fails, stop and report it.

### 2. TypeScript

Run once:

```bash
npx tsc --noEmit --pretty false
```

Repair only errors in the allowed boundary or direct fixture adaptations. Run the command at most one additional time. If unrelated baseline errors remain, report them without inspecting their subsystems.

### 3. Lint

Run once:

```bash
npm run lint
```

Repair only errors in the allowed boundary. Run at most one additional time.

### 4. Production build

Run once:

```bash
npm run build
```

If it fails because of an allowed-boundary integration error, make one focused repair and rerun once. Otherwise stop and report the failure.

## Request Discipline

- Do not run checks in parallel.
- Do not retry an unchanged failed command.
- Do not reopen complete files already inspected; use the reported location and a small surrounding range.
- Do not repair warnings or code outside the allowed boundary.
- Stop immediately on quota or rate limiting and report the last completed gate and current changed files.

## Completion Report

Return only:

1. Full-suite result and run count.
2. TypeScript result and run count.
3. Lint result and run count.
4. Build result and run count.
5. Exact stabilization files changed and why.
6. Verification boundary followed: list every command run, its count, and the reason it was authorized by this packet.
7. Any remaining failure, identified as related or inherited.
