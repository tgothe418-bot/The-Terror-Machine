# TTM Horror Grammar 0 - Provider-Refusal Containment Correction

**Series:** TTM Horror Grammar  
**Update:** 0 of 16 - additive correction  
**Depends on:** Completed Horror Grammar 0 implementation and the verified current `main` state  
**Expected baseline:** `d7b99a69c138fd1902709a88f7f73137f681ba26`  
**Expected remote:** `origin/main` at `d7b99a69c138fd1902709a88f7f73137f681ba26`  
**Verified against current GitHub state:** 2026-08-26

## Governing Principle

> **The Engine never acts on behalf of the User.**

A provider response is not User intent. A refusal, block, empty result, provider exception, or local recovery message may never become a player action merely because it crossed an action-generation or turn-generation boundary.

Provider failures must fail closed. They may produce bounded, sanitized failure evidence, but they may not invent an action, advance canonical state, replace the last successful Retake checkpoint, or silently continue Autopilot.

## Objective

Close the provider-refusal defect at both active Gemini generation boundaries:

1. Engine-turn generation through `server/utils/aiClient.ts` and `/api/turn`.
2. Autopilot action generation through `/api/simulate-player` and `fetchSimulatedPlayerAction()`.

The verified baseline currently has four connected defects:

- `generateStructuredResponse()` reads `response.text` without first classifying provider blocking metadata.
- `/api/simulate-player` converts an empty result into the invented action `I look around carefully.`
- `fetchSimulatedPlayerAction()` converts every failure into a second invented player action beginning with `SYSTEM OVERRIDE`.
- `runAutopilotSequence()` continues after `handleCommand()` consumes a failed turn because `handleCommand()` returns no commit outcome.

This correction must contain the provider result at its actual boundary. It must not treat provider output, server recovery prose, or client recovery prose as if the User supplied it.

This is an additive correction to Horror Grammar 0. It does not begin Horror Grammar 1 or create a new numbered packet branch.

## Start Gate

Before editing, run:

```bash
git rev-parse HEAD
git rev-parse origin/main
git status --short
```

Proceed only when:

- `HEAD` equals `d7b99a69c138fd1902709a88f7f73137f681ba26`;
- `origin/main` equals `d7b99a69c138fd1902709a88f7f73137f681ba26`;
- tracked files are clean; and
- pre-existing untracked reference material, including `Packets/`, can be preserved exactly as found.

If either SHA differs or tracked files are already modified, stop and report the exact SHA and status before editing. Inspect the active implementations and tests at the verified baseline before selecting the smallest compatible change.

## 1. Establish One Shared Provider-Response Classification Boundary

### Existing defect

The active Engine helper and Autopilot route consume `response.text` directly. Neither boundary first distinguishes an ordinary content result from explicit Gemini blocking metadata or from a response that contains no usable text.

That ambiguity currently permits a refusal or empty result to fall into parsing, generic error handling, or fabricated-action recovery.

### Required correction

Add one exported, pure, typed server-side classifier for the installed `@google/genai` `2.17.1` response shape. Place it in the existing AI utility boundary or the smallest narrowly named shared server utility. Both Engine-turn generation and Autopilot action generation must use the same classifier.

The classifier must inspect native response metadata before any access to `response.text`, including:

- prompt-level `promptFeedback.blockReason`; and
- candidate-level `candidates[].finishReason`.

Use the installed SDK's typed fields and documented enum values, or a closed local union derived from those values. Do not infer refusal from prose, JSON fragments, regular expressions, or phrases such as `I'm sorry`.

The classifier must return a closed result with these semantic outcomes:

1. `CONTENT` - a non-empty text result eligible for the existing parser or action validator;
2. `PROVIDER_REFUSAL` - explicit prompt-level or candidate-level blocking/refusal metadata; and
3. `EMPTY_PROVIDER_RESPONSE` - no usable text and no explicit refusal metadata.

The exact internal type design is implementation-owned, but it must preserve these distinctions and be exhaustively handled.

Additional constraints:

- An unspecified metadata value is not an explicit refusal.
- `STOP` is not a refusal merely because it is a finish reason.
- `MAX_TOKENS` is not a refusal merely because it is a finish reason. Non-empty text still proceeds to the existing strict parser; no usable text becomes `EMPTY_PROVIDER_RESPONSE`.
- Other ordinary termination or malformed-generation reasons must not be relabeled as policy refusal unless the installed SDK explicitly defines them as blocking outcomes.
- Malformed non-empty JSON remains on the existing JSON/Zod contract-failure path after classification.
- A refusal result may retain only a stable local code and, if useful, one bounded reason identifier from a closed allowlist.
- The result or error must not retain raw response objects, candidate content, response text, prompts, provider messages, endpoint URLs, stacks, credentials, or arbitrary metadata.
- Do not add automatic retries, prompt dilution, alternate prompts, or any attempt to bypass provider policy. Each existing operation remains one generation request.

### Required proof

Add pure classifier tests covering at minimum:

- an explicit prompt-level block becomes `PROVIDER_REFUSAL`;
- an explicit candidate-level blocking finish reason becomes `PROVIDER_REFUSAL`;
- an unspecified block reason does not become a refusal;
- `STOP` with non-empty text becomes `CONTENT`;
- `MAX_TOKENS` with non-empty text is not automatically a refusal;
- no usable text without explicit blocking metadata becomes `EMPTY_PROVIDER_RESPONSE`;
- malformed non-empty JSON passes classification and then fails through the existing parser/schema boundary; and
- unmistakable raw-response, URL, stack, credential, and refusal-text sentinels are absent from every sanitized classifier outcome or typed error.

The completion report must name the exact installed SDK fields and the closed reason values classified as explicit refusal.

## 2. Contain Refusal at the Engine-Turn Boundary

### Existing defect

`generateStructuredResponse()` currently reads `response.text ?? ''` immediately after `generateContent()` resolves. `/api/turn` then maps syntax and Zod failures to `MODEL_CONTRACT_MISMATCH` and collapses other model failures into `PROVIDER_FAILURE`.

The route has no stable refusal outcome. A blocked response can therefore be misclassified as malformed model output or an undifferentiated provider failure.

### Required correction

In `generateStructuredResponse()`:

- classify the native response immediately after `generateContent()` resolves and before reading `response.text`;
- expose a sanitized typed refusal outcome to the route;
- expose an empty non-refusal result as a distinct internal provider outcome;
- pass only `CONTENT` into the existing strict JSON extraction and Zod validation; and
- preserve the existing valid-response contract and one-call generation path.

In `server/routes/turn.ts`:

- map the typed explicit refusal to HTTP `502` with stable code `PROVIDER_REFUSAL` and fixed generic application prose;
- map `EMPTY_PROVIDER_RESPONSE` to the existing safe `PROVIDER_FAILURE` category, not to `MODEL_CONTRACT_MISMATCH`;
- preserve the existing distinctions for malformed JSON, Zod failure, dialogue validation, and ordinary provider failure;
- return on refusal before causality finalization, ratification receipt production, topology application, or canonical publication; and
- never copy the provider reason, typed-error message, raw metadata, or raw response text into the HTTP body.

In `src/lib/turnResponseReader.ts`:

- add `PROVIDER_REFUSAL` to the closed safe-code allowlist;
- map it to one fixed local message explaining that generation was declined, the session was unchanged, and the action may be retried or revised; and
- continue ignoring arbitrary server-supplied `message` or `error` prose.

The fixed client message is failure evidence, not narration. It must not claim that the character performed a replacement action.

Preserve the current `TURN_FAILED` state invariant: a genuine submitted action may be retained as the failed attempt, while canonical simulation state and the previous successful Retake checkpoint remain unchanged. Do not change the reducer merely to restate behavior already proved at the baseline.

### Required proof

At the real `/api/turn` route boundary, prove:

- a typed explicit refusal returns HTTP `502` with code `PROVIDER_REFUSAL`;
- the response contains fixed safe prose and no raw sentinel material;
- an empty non-refusal response maps to safe `PROVIDER_FAILURE`, not `MODEL_CONTRACT_MISMATCH`;
- refusal does not enter causality finalization and cannot produce a normal `TurnResponse`;
- malformed non-empty JSON and Zod failures retain their existing contract-mismatch behavior;
- ordinary provider failure and dialogue validation retain their existing safe categories; and
- the client reader derives its message from the allowlisted code rather than server prose.

## 3. Remove Fabricated Autopilot Actions

### Existing defect

The active `/api/simulate-player` route returns:

```ts
(response.text || "I look around carefully.").trim()
```

The active client service then catches every failure and returns a second fabricated string beginning with `SYSTEM OVERRIDE`.

Both fallbacks can cross `/api/turn` as though they were player intent. Telemetry may then show provider refusal or recovery prose as a failed player action even though neither the User nor Autopilot successfully generated that action.

### Required correction

In `server/routes/chat.ts`, update `/api/simulate-player` to:

- run the shared provider-response classifier before accessing `response.text`;
- return `{ action }` only when `CONTENT` contains a non-empty trimmed action;
- return HTTP `502` with code `PROVIDER_REFUSAL` for explicit blocking;
- return HTTP `502` with a stable local code such as `AUTOPILOT_ACTION_FAILURE` for an empty result or other action-generation failure;
- omit the `action` field from every failure response;
- remove the `I look around carefully.` fallback completely; and
- never include provider messages, raw response text, metadata, prompts, endpoint URLs, stack material, or credentials in the response.

In `src/services/geminiService.ts`, make `fetchSimulatedPlayerAction()` fail closed:

- validate that a successful response is JSON with a non-empty string `action`;
- return a typed success/failure union or throw a sanitized typed local error;
- preserve only the closed local failure code needed by Runtime;
- discard arbitrary server and provider error prose; and
- remove the `SYSTEM OVERRIDE` string and every other synthetic action fallback.

No refusal, empty response, malformed response, thrown exception, local status, or recovery message may be returned from this function as a string eligible for `/api/turn`.

### Required proof

Add focused `/api/simulate-player` route coverage proving:

- a valid response returns the exact trimmed action;
- prompt-level and candidate-level blocks return HTTP `502` with `PROVIDER_REFUSAL` and no `action` field;
- an empty response returns HTTP `502` with the stable action-generation failure code and no fallback action;
- a thrown provider error returns a bounded stable failure with no `action` field; and
- raw refusal, URL, stack, credential, and response-text sentinels are absent from every failure payload.

Add focused client-service coverage proving:

- a valid non-empty action is returned exactly;
- refusal, non-JSON, malformed JSON, empty action, missing action, and network failure never return an action string;
- neither former fallback can be emitted; and
- arbitrary server error prose cannot become Runtime status or player input.

Create `server/routes/chat.test.ts` if that is the smallest coherent home for the route proof. If equivalent coverage belongs in an existing server-route suite, use that suite and report the exact substitute.

## 4. Make Runtime Continue Only After a Commit

### Existing defect

`handleCommand()` clears human input before the request, consumes failures internally, dispatches `TURN_FAILED`, and returns no outcome. `runAutopilotSequence()` therefore waits and recurses after the call without knowing whether a turn committed.

As a result:

- human input is lost on provider refusal; and
- Autopilot can request another action after a refused or otherwise failed Engine turn.

### Required correction

Give `handleCommand()` a closed explicit outcome sufficient to distinguish at minimum:

- a committed turn;
- a provider refusal; and
- every other non-commit result.

The exact names are implementation-owned. Runtime must handle the result exhaustively.

For a human-submitted action followed by `/api/turn` `PROVIDER_REFUSAL`:

- restore the exact submitted command to the editable input;
- retain only the safe failed-attempt receipt already supported by the Engine;
- do not substitute, append, or narrate the provider's refusal text; and
- leave canonical simulation state and the prior successful Retake checkpoint unchanged.

For Autopilot action-generation failure or refusal:

- do not call `handleCommand()`;
- do not call `/api/turn`;
- do not dispatch a failed player turn, because no player action exists;
- stop Autopilot immediately;
- show only a fixed local, non-narrative status stating that no action was generated and the sequence stopped; and
- allow the User to start Autopilot again normally.

For a valid generated Autopilot action submitted to `/api/turn`:

- continue the sequence only when `handleCommand()` reports a committed turn; and
- stop on provider refusal and every other non-commit outcome.

The local Autopilot status may not be appended to story history, represented as a completed action, or projected into later prompts.

### Required proof

Exercise the production Runtime path and prove:

1. **Autopilot action-generation refusal or failure**
   - `handleCommand()` and the Engine ratification pipeline are never called;
   - no player action or `TURN_FAILED` receipt is created;
   - Autopilot stops and displays only the fixed local status;
   - history, story log, turn count, revision, canonical Engine state, and Retake checkpoint remain equal to their pre-attempt values.

2. **Valid Autopilot action followed by Engine provider refusal**
   - exactly one turn request occurs;
   - Autopilot requests no subsequent action;
   - no canonical state advances;
   - the valid generated action may appear only as the failed attempt; and
   - raw refusal text never appears.

3. **Human action followed by Engine provider refusal**
   - the exact human input is restored for editing;
   - the safe `PROVIDER_REFUSAL` failure receipt is recorded;
   - the previous Retake checkpoint is preserved; and
   - a later successful retry commits normally from the unchanged pre-refusal canonical state.

## 5. Prove State, Prompt, Export, and Telemetry Isolation

### Existing defect

The fabricated Autopilot fallbacks currently become ordinary action strings. Once submitted, they can enter the same history, prompt, receipt, export, and telemetry paths as genuine player input.

Sanitizing only the HTTP body is therefore insufficient. The correction must prove that raw provider material and synthetic recovery actions cannot cross a downstream projection boundary.

### Required correction

Use fixed local codes and fixed local messages at every client-visible failure boundary. Do not store or project raw provider text, metadata, errors, or stacks.

On every refusal or empty-response path:

- turn count, revision, topology, cast, inventory, injuries, psychological state, stance, relationships, character memory, World Memory, continuity, presence, terminal state, and presentation-derived canonical facts remain unchanged;
- the previous successful Retake checkpoint remains unchanged;
- no provider output or fabricated fallback becomes a player action;
- no failure material enters the next provider prompt; and
- no raw provider material enters ordinary telemetry or player-facing exports.

The stable local code `PROVIDER_REFUSAL` may remain visible in the safe failure receipt and developer-oriented structured evidence. The provider's raw words and metadata may not.

### Required proof

Use distinct unmistakable sentinels for raw refusal text, provider metadata, an endpoint URL, stack-like text, and credential-shaped material. Prove none survives in:

- active canonical state;
- story history or story log;
- the next real `executeRatificationPipeline()` prompt context;
- raw JSON, Markdown, and HTML Engine exports;
- Retake checkpoint data; or
- ordinary telemetry.

Also prove that the fixed safe code and local player-facing message remain available where intended.

## Scope Controls

Do not use this correction to:

- begin Horror Grammar 1 or implement any later grammar principle;
- redesign threat authority, depiction policy, causality, or the broader horror model;
- migrate providers or add a second model provider;
- add automatic retry, re-prompting, prompt weakening, or policy-bypass behavior;
- create a new canonical store, failure-history owner, or parallel action pipeline;
- redesign Autopilot strategy beyond fail-closed action handling and stopping after non-commit;
- redesign the Engine UI;
- broaden the correction into a general server error-boundary audit;
- repair the separate outer `/api/turn` HTTP `500` message-disclosure concern; or
- change Forge, source review, Architect, or Depiction Contract behavior.

Use the existing architecture wherever it can satisfy the proofs. Prefer one shared classification boundary and the smallest compatible Runtime outcome contract.

## Verification Gate

Run the focused suites covering every edited production path. At minimum, include the active equivalents of:

```bash
npx vitest run server/utils/aiClient.test.ts server/routes/chat.test.ts server/routes/turn.test.ts src/services/geminiService.test.ts src/lib/turnResponseReader.test.ts src/components/engine/Runtime.retake.test.tsx src/core/engine/reducer.test.ts src/lib/download.test.ts
```

If a named test file does not exist, create it or use the nearest focused suite for that exact production boundary and report the substitution.

After the focused proof passes, run:

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
git diff --check
git status --short
```

Do not use a paid live Gemini call as acceptance evidence. Mock native provider metadata deterministically at the installed SDK boundary.

Do not weaken assertions, delete tests, or replace route/Runtime proof with classifier-only unit tests to obtain a green result. Classify any failure as introduced, exposed, or pre-existing with exact evidence.

## Completion Report

Return one consolidated report containing:

1. start and end `HEAD`, `origin/main`, and tracked workspace status;
2. the exact files changed and why;
3. the shared classifier's exact SDK fields, closed refusal reason values, and sanitized result/error shape;
4. the HTTP status and stable code emitted by each Engine and Autopilot failure path;
5. the typed client outcome used by `fetchSimulatedPlayerAction()` and `handleCommand()`;
6. confirmation that both fabricated action fallbacks were removed and cannot reach `/api/turn`;
7. confirmation that Autopilot stops after action-generation failure and every non-committed Engine turn;
8. proof that human input is restored after provider refusal and the preceding Retake checkpoint remains available;
9. state, next-prompt, export, and telemetry sentinel results;
10. focused and full test results with exact file and test counts;
11. TypeScript, lint, build, `git diff --check`, and final `git status --short` results;
12. any residual defect or limitation, stated plainly; and
13. confirmation that Horror Grammar 1 was not started.

