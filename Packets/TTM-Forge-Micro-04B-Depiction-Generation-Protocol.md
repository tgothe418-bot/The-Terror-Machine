# TTM Forge Micro-Packet 04B — Depiction Generation Protocol

Sequence: after Micro-Packet 04A

## Finish Line

The Architect endpoint produces a scenario-specific Depiction Contract only from validated, bounded Forge context. Invalid model output returns HTTP 502 and never becomes generic horror filler.

## Source Boundary

Change only:

- `server/schemas/index.ts`
- `server/routes/forge.ts`
- `server/routes/forge.test.ts`
- `src/core/prompts/architect.ts`

Read only if canonical schemas must be imported:

- `src/types/forge.ts`

Do not change Forge stores, UI components, Engine, Runtime, persistence, evidence presentation, or export behavior.

## Implementation

### Request contract

Keep `DEPICTION_CONTRACT_PROPOSAL` as a discriminated request variant. Require and bound:

- draft identity, premise, setting, cast, rules, references, and `draftRevision`;
- source count and source summaries;
- applied candidate facts with classifications and attribution;
- bounded evidence claims and excerpts;
- canonical ambiguity decisions, including contextual discretion;
- `sourceBaselineRevision`.

Use canonical ambiguity schemas instead of `z.unknown()`. Apply explicit array maxima and string lengths. Do not accept or prompt with uploaded document bodies.

### Model output and server response

Validate raw model output as exactly:

- all five contract fields;
- rationale;
- optional conversational message.

The model must not supply lifecycle metadata. After raw output validates, the server constructs the complete proposal with:

- `sourceDraftRevision` copied from the request;
- `sourceBaselineRevision` copied from the request;
- `createdAt` supplied by the server.

Validate the final response with the strict Architect response schema before returning it.

Malformed JSON, missing fields, placeholders in a required field, invalid structure, or final-schema failure returns HTTP 502 with a concise error. Remove every canned contract value and generic rationale fallback. Do not return an invalid structured object with HTTP 200.

### Prompt grounding

The prompt must explicitly distinguish:

- source evidence;
- creator-authored or accepted decisions;
- contextual-discretion ambiguities.

It must preserve deliberate uncertainty and avoid inventing prohibitions, permissions, facts, or universal horror defaults. The result should describe how this particular scenario is depicted.

Add one table-driven route test named exactly:

`returns only validated source-grounded depiction proposals`

Cover one valid response and malformed, incomplete, and placeholder-valued responses. Assert revision metadata comes from the request/server and every invalid case returns HTTP 502 without fallback text.

## Source Proof

Run once after implementation:

```bash
if rg -n "Visceral psychological horror|Peripheral distortion|Persistent somatic deterioration|Fragmented subjective perception" server/routes/forge.ts; then exit 1; fi
```

## Execution Budget

1. Read each scoped file once. Use exact schema and route searches for follow-up inspection.
2. Complete the implementation and test edit before running Vitest.
3. Run only:

```bash
npx vitest run server/routes/forge.test.ts -t "returns only validated source-grounded depiction proposals" --reporter=dot --silent
```

4. If it fails, make one focused correction and rerun that exact command once. If it still fails, stop and report the remaining failure.
5. After the named test passes, run once:

```bash
npx eslint server/schemas/index.ts server/routes/forge.ts server/routes/forge.test.ts src/core/prompts/architect.ts --max-warnings 0
```

### Strict verification-command limit

This is an execution boundary, not a suggestion. You may execute only the two verification commands printed in steps 3 and 5 above.

If the named Vitest command fails, make one focused correction and rerun that exact command once. Do not run ESLint after a second Vitest failure; stop and report it. After the scoped ESLint command completes, stop work. Do not run any further command that tests, lints, compiles, builds, formats, or otherwise checks the project.

The following are prohibited even if the named test passes: `npm test`; `npx vitest run` without the exact file-and-name filter above; any other test file; `npm run build`; `npx tsc`; `npm run lint`; `git diff --check`; formatter commands; and automatic quality-check bundles. This packet does not authorize any additional verification.

## Completion Report

Return only:

1. Strict Depiction generation behavior implemented.
2. Exact files changed.
3. Named-test result and whether a corrective rerun was used.
4. Scoped ESLint result.
5. Verification-command limit: named Vitest run count, scoped ESLint run count, and this exact statement: `Full suite: not run. Build: not run. TypeScript: not run. Other verification: not run — prohibited by this packet.`
6. Any unfinished item or out-of-scope failure.
