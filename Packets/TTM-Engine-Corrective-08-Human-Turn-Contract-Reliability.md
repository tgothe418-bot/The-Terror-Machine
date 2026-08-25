# TTM Engine Corrective Packet 08 — Human Turn Contract Reliability

Sequence: after the completed Forge micro-packet sequence through Packet 07 and the post-07 Export Review mount correction

## Finish Line

Ordinary creator-written actions—including short dialogue, direct requests, and socially charged statements—must pass through the same atomic turn path as Autopilot actions without failing merely because the model returned a shape permitted by the provider schema but rejected by the application schema.

This packet must:

1. align the Gemini structured-response schema with the authoritative application `TurnResultSchema`;
2. preserve one model generation call per turn and the deterministic ratification boundary;
3. retain bounded, safe field-path diagnostics when model output still fails schema or dialogue validation;
4. carry those diagnostics into failure receipts and Markdown/HTML telemetry without exposing model prose, raw JSON, prompts, stack traces, or provider internals; and
5. prove that concise human input is not rewritten, padded, or routed through a separate Engine path.

A valid short human action must not require Autopilot-style verbosity to survive the response contract.

## Observed Failure Evidence

The supplied runtime exports establish that:

- creator-written actions were recorded correctly and reached `/api/turn`;
- the server returned HTTP 502 with `MODEL_CONTRACT_MISMATCH`;
- failure occurred before intent, reconciliation, consequence, stance, relationship, character-memory, or World Memory receipts were produced;
- canonical state was preserved;
- longer Autopilot-produced actions succeeded in the same session with the same bound player character and current node;
- a later concise creator-written action failed in the same way;
- `Runtime.tsx` currently injects Autopilot output into `handleCommand(undefined, simulatedAction)`, while manual input enters the same `handleCommand`; and
- the client failure receipt discards the server's validation details, leaving exports unable to identify the rejected field.

The defect class is therefore **structured-response contract drift or intermittent schema noncompliance**, not a dead text box, player-character binding failure, or alternate Autopilot commit path.

Do not hard-code the supplied scenario, characters, source text, Blueprint ID, or exact dialogue into production code or fixtures. Use neutral fictional test data.

## Diagnostic Qualification

Do not assume that relationship `delta` is defective solely because its provider enum metadata contains the strings `"-1"` and `"1"`.

The installed `@google/genai` `Schema` type represents enum metadata as `string[]`, including for an `INTEGER` schema. The application must still receive a numeric JSON value and must continue accepting only numeric `-1` or `1`. Prove that boundary with a pure parser test. Do not add string coercion unless an exact captured diagnostic proves the provider returns a string despite the integer schema.

Directly visible provider/application drift includes at least:

- `narrative_blocks` is capped at two by Zod but not by the provider schema;
- narrative block `type` is a Zod enum but is only described in provider prose;
- consequence mutations are a discriminated union in Zod while the provider schema permits invalid domain/operation combinations;
- several Zod string and array bounds are absent or use values that do not satisfy the installed SDK's `Schema` typings;
- World Memory scope/node requirements are stricter in Zod; and
- `suggested_tension` is bounded by Zod but not by the provider schema.

Inspect the current source and complete a bounded field-by-field comparison before editing. Treat `TurnResultSchema` and its imported proposal schemas as authoritative.

## Existing Baseline — Preserve It

The Engine already provides:

- one `/api/turn` generation call;
- provider-enforced JSON output;
- strict Zod validation before ratification;
- deterministic finalization for intent, reconciliation, topology, consequences, cast, relationships, and memory;
- fail-closed canonical state preservation;
- explicit player-character binding;
- the same `handleCommand` entry point for human and Autopilot actions;
- stable failure receipts; and
- diagnostic Markdown and HTML exports.

Repair the contract seam. Do not replace the atomic turn pipeline.

## Source Boundary

Change only:

- `server/utils/aiClient.ts`
- `server/utils/aiClient.test.ts` — create only if no focused test file for this utility exists
- `server/routes/turn.ts`
- `server/routes/turn.test.ts`
- `src/types/index.ts`
- `src/lib/turnResponseReader.ts`
- `src/lib/turnResponseReader.test.ts`
- `src/lib/download.ts`
- `src/lib/download.test.ts`

Read only as needed:

- `src/types/engineContract.ts`
- `src/types/consequence.ts`
- `src/types/characterStance.ts`
- `src/types/characterRelationships.ts`
- `src/types/characterMemory.ts`
- `src/types/worldMemory.ts`
- `src/lib/ratificationPipeline.ts`
- `src/components/engine/Runtime.tsx`
- `src/core/engine/events.ts`
- `src/core/engine/reducer.ts`

Do not change Runtime submission behavior, stores, player binding, Autopilot generation, history projection, ratifiers, topology behavior, Forge, Blueprint compilation, persistence, model policy, provider selection, or unrelated fixtures.

If current local source materially differs from this baseline, stop and report the exact difference before broadening the boundary.

## Required Behavior

### 1. Make the provider schema an honest projection of the application contract

Keep `TurnResultSchema` and its imported proposal schemas authoritative. Audit `turnResponseSchema` field by field.

Where Gemini's schema format can express the same restriction:

- constrain `narrative_blocks.items.type` to the exact values accepted by `NarrativeBlockSchema`;
- cap `narrative_blocks` at two using the value type expected by the installed SDK;
- preserve nullable/optional `speaker`;
- keep every proposal envelope required and require explicit empty arrays for valid no-op proposals;
- represent consequences as provider-level discriminated alternatives:
  - `INVENTORY`: `ADD` or `REMOVE`;
  - `PLAYER_INJURY`: `ADD` or `REMOVE`;
  - `PSYCHOLOGICAL_STATUS`: `SET` with an authoritative status value;
- align proposal counts, identifier bounds, fact/statement bounds, and rationale bounds with Zod;
- preserve relationship deltas as integers limited to `-1` or `1`, without coercion;
- express the World Memory `GLOBAL`/null-node and `NODE`/non-empty-node distinction through supported provider alternatives when possible;
- bound `suggested_tension` to `0..100`; and
- preserve the existing topology-expansion contract.

Type the exported provider schema with `satisfies Schema` or an equivalent compile-time check against the installed `@google/genai` schema type. Do not hide mismatches with `any`, a whole-object assertion, or `unknown`.

If a Zod rule cannot be represented by Gemini's supported subset, keep Zod strict and add one concise adjacent comment identifying that intentional difference. Do not weaken Zod.

### 2. Preserve strict parsing without inventing a repair layer

Extract a small pure parser from `generateStructuredResponse` if needed for tests. It must unwrap strict JSON, parse once, validate with the supplied Zod schema, and return only the validated result.

Do not:

- coerce relationship deltas;
- fill omitted proposal envelopes;
- truncate narrative blocks;
- replace invalid consequence operations;
- discard invalid memory candidates;
- add an LLM repair call or retry;
- add a second generation; or
- return unratified fallback prose.

The provider receives the correct contract. Zod remains the acceptance boundary.

### 3. Add bounded schema-failure diagnostics

Extend the shared `TurnFailureReceipt` in `src/types/index.ts` with one optional diagnostics member. Remove the duplicate receipt interface from `turnResponseReader.ts` and import the shared type.

Use this conceptual shape consistently:

```ts
interface TurnFailureDiagnosticIssue {
  path: string;
  code: string;
}

interface TurnFailureDiagnostics {
  kind: 'SCHEMA_VALIDATION' | 'JSON_PARSE' | 'DIALOGUE_CONTRACT';
  issues: TurnFailureDiagnosticIssue[];
}
```

Requirements:

- include at most 12 issues;
- serialize Zod paths deterministically, such as `character_relationship_proposal.changes.0.delta`;
- use `$` for a root JSON parse failure;
- bound path and code lengths;
- omit received values, prose, narrative content, raw JSON, prompts, stack traces, and provider messages;
- deduplicate identical path/code pairs while preserving first-seen order;
- use a stable path such as `narrative_blocks` for dialogue-contract failures; and
- keep the existing generic user-facing message.

The server must return this safe diagnostic object on schema, JSON-parse, and dialogue-contract mismatch responses.

`readTurnResponse` must validate it defensively. Preserve it only when the complete bounded structure is valid. Ignore malformed, oversized, or unexpected diagnostic content rather than copying arbitrary server data into history.

`TurnResponseError.toReceipt()` and `toTurnFailureReceipt()` must preserve valid diagnostics. Existing failures without diagnostics remain backward compatible.

### 4. Make rejected paths visible in telemetry exports

Update the existing Schema Repairs and Validation section in `download.ts` so a failed turn with valid diagnostics displays:

- Diagnostic Kind; and
- Rejected Paths as a compact comma-separated list.

The raw telemetry payload may contain the bounded failure receipt. It must not contain the rejected model response or arbitrary server details.

Successful turns and failures without diagnostics must retain current formatting.

### 5. Preserve exact human input and path parity

Do not make human text resemble Autopilot text.

- Do not expand or paraphrase creator input.
- Do not prepend an inferred intent label.
- Do not run creator text through the Autopilot generator.
- Do not create a human-only permissive schema.
- Do not create an Autopilot-only parser.
- Do not alter the input before it becomes `[USER ACTION]` in the existing prompt.

The source proof must continue showing one standard `handleCommand` and the existing `handleCommand(undefined, simulatedAction)` Autopilot injection.

### 6. Preserve the atomic failure boundary

Any response that remains invalid must:

- return HTTP 502 with `MODEL_CONTRACT_MISMATCH`;
- produce no intent or canonical mutation receipts;
- preserve the pre-turn snapshot exactly;
- leave turn count, node, tension, relationships, stance, character memory, World Memory, consequences, topology, and terminal state unchanged; and
- remain eligible for the existing retry/Retake experience without a phantom committed turn.

Diagnostics describe the refusal. They do not authorize a partial commit.

## Required Tests

Use neutral fictional fixtures. Do not make paid model calls.

### Provider/application contract proof

Add one test named exactly:

`aligns provider turn output with the authoritative application schema`

Within that test or tightly related cases, prove:

1. a concise two-block dialogue result passes the same pure parser used by `generateStructuredResponse`;
2. each provider-permitted narrative block type is accepted by Zod and an unknown type fails;
3. the provider schema caps narrative blocks at two;
4. numeric relationship deltas `-1` and `1` pass;
5. string `"-1"`, string `"1"`, and numeric `0` fail without coercion;
6. valid consequence variants pass;
7. invalid domain/operation combinations fail;
8. valid empty proposal envelopes pass;
9. bounded stance, relationship, character-memory, and World Memory proposals pass; and
10. at least one over-limit field or proposal list fails closed.

### Route diagnostic and atomicity proof

Add one test named exactly:

`returns bounded diagnostics when a concise human turn violates the model contract`

Prove:

1. concise human dialogue is placed in the existing prompt unchanged;
2. exactly one `generateStructuredResponse` call occurs;
3. a valid structured result follows the normal route;
4. a Zod failure returns HTTP 502 and `MODEL_CONTRACT_MISMATCH`;
5. diagnostics contain only bounded path/code pairs;
6. invalid values and model prose do not appear in the response;
7. a JSON parse failure uses the root path and stable kind;
8. a dialogue-contract failure uses a stable dialogue path without dialogue content; and
9. no canonical finalizer or receipt is produced after contract failure.

Preserve the existing invariant that `server/routes/turn.ts` contains one `generateStructuredResponse(` invocation.

### Client receipt proof

Add one test named exactly:

`preserves only safe bounded model-contract diagnostics`

Prove:

1. valid diagnostics survive `readTurnResponse`, `TurnResponseError`, and `toTurnFailureReceipt`;
2. failures without diagnostics retain existing behavior;
3. malformed kinds, blank paths, oversized arrays, arbitrary nested objects, and non-string codes are discarded;
4. the generic user-facing message is unchanged; and
5. HTML and raw model bodies cannot enter diagnostics.

### Export proof

Add one test named exactly:

`renders rejected model-contract paths without exposing model output`

Prove:

1. Diagnostic Kind and Rejected Paths appear in parsed telemetry and HTML;
2. diagnostic text is HTML-escaped;
3. rejected response text, prompts, and arbitrary server details do not appear;
4. the pre/post state diff remains unchanged on failure; and
5. successful-turn export output is unaffected.

## Non-Negotiable Invariants

- The model proposes; the application ratifies and commits.
- `TurnResultSchema` remains authoritative.
- Human and Autopilot actions use the same submission, generation, validation, ratification, and commit path.
- Human input is transmitted exactly as written inside the existing prompt boundary.
- One turn performs at most one model generation call.
- No automatic repair, retry, fallback narration, or partial acceptance is introduced.
- Invalid output leaves canonical state unchanged.
- Diagnostics contain field paths and stable codes only.
- No prompt, response body, API key, stack trace, or provider-internal detail enters history or exports.
- Existing binding, authority, topology, consequence, stance, relationship, memory, Retake, and terminal-state behavior remains unchanged.
- Production code and tests remain scenario-agnostic.

## Explicitly Out of Scope

Do not address:

- the disconnected multi-node topology observed in the supplied Blueprint;
- Forge extraction or authoring of topology connections;
- Forge readiness for unreachable nodes;
- the legacy Starting Conditions UI;
- Architect chat usefulness;
- Depiction Contract synthesis;
- README or roadmap edits;
- provider/model migration;
- additional Autopilot behavior; or
- unrelated debt.

Disconnected topology requires a separate Forge packet that both proposes source-grounded connections for review and validates structural reachability. Do not add an export blocker here without also providing that authoring path.

## Verification Order and Budget

### 1. Focused behavior tests

After all scoped edits are complete, run:

```bash
npx vitest run server/utils/aiClient.test.ts server/routes/turn.test.ts src/lib/turnResponseReader.test.ts src/lib/download.test.ts -t "aligns provider turn output with the authoritative application schema|returns bounded diagnostics when a concise human turn violates the model contract|preserves only safe bounded model-contract diagnostics|renders rejected model-contract paths without exposing model output" --reporter=dot --silent
```

If the utility proof was added to an existing focused test file instead, substitute that exact file without broadening the selection.

On failure, inspect only the first related group, make one focused correction, and rerun the same selection once. If the second run fails, stop and report it.

Maximum: two focused Vitest runs.

### 2. Scoped ESLint

Run once:

```bash
npx eslint server/utils/aiClient.ts server/utils/aiClient.test.ts server/routes/turn.ts server/routes/turn.test.ts src/types/index.ts src/lib/turnResponseReader.ts src/lib/turnResponseReader.test.ts src/lib/download.ts src/lib/download.test.ts --max-warnings 0
```

If no new utility test file exists, omit that path. Repair only scoped errors and rerun once at most.

Maximum: two scoped ESLint runs.

### 3. TypeScript

Run once:

```bash
npx tsc --noEmit --pretty false
```

Repair only errors caused by this packet. If repaired, rerun once. Report unrelated inherited errors without entering those subsystems or describing the gate as passing.

Maximum: two TypeScript runs.

### 4. Production build

Run once:

```bash
npm run build
```

If it fails because of a scoped integration error, make one focused correction and rerun once. Otherwise stop and report it.

Maximum: two build runs.

### 5. Source proofs

Run once:

```bash
test "$(rg -n 'generateStructuredResponse\(' server/routes/turn.ts | wc -l)" -eq 1
test "$(rg -n 'handleCommand\(undefined, simulatedAction\)' src/components/engine/Runtime.tsx | wc -l)" -eq 1
rg -n "SCHEMA_VALIDATION|JSON_PARSE|DIALOGUE_CONTRACT|diagnostics|Rejected Paths" server/routes/turn.ts src/types/index.ts src/lib/turnResponseReader.ts src/lib/download.ts
```

If running in PowerShell, use equivalent `Select-String` counts and report the exact commands.

### Strict command limit

Only the commands in sections 1 through 5 are authorized, with their retry limits.

Do not run the full suite, `npm test`, `npm run lint`, formatters, another test selection, a live paid Gemini turn, Autopilot soak testing, or an automatic quality bundle.

Do not retry an unchanged failure. Do not use `git checkout`, `git restore`, `git reset`, `git clean`, or `git stash`.

## Commit and Push

After successful verification:

1. inspect `git status --short`;
2. stage only scoped implementation and test files;
3. do not stage this packet or unrelated files;
4. commit with:

```text
fix(engine): align human turn response contracts
```

5. push to `origin main`; and
6. report the SHA from `git rev-parse HEAD`.

If any authorized gate stops on a packet-related failure, do not commit or push.

## Completion Report

Return:

1. Exact response-contract drift found and corrected.
2. Whether concise human input remains unchanged inside `[USER ACTION]`.
3. Confirmation that human and Autopilot input share `handleCommand` and ratification.
4. The bounded diagnostic shape and one paths/codes-only example.
5. Exact files changed and why.
6. Focused Vitest result and run count.
7. Scoped ESLint result and run count.
8. TypeScript result, run count, and classification of remaining errors.
9. Build result and run count.
10. Source-proof results, including both counts.
11. Confirmation that invalid turns preserve state and produce no partial receipts.
12. Commit SHA and message, or why no commit was created.
13. Any unfinished or out-of-scope item.

Use this exact statement:

`Full suite: not run. Live Gemini smoke test: not run — prohibited by this packet; creator verification remains the post-merge acceptance gate.`
