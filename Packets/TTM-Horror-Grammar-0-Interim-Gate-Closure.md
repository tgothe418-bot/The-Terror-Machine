# TTM Horror Grammar 0 — Interim Gate-Closure Correction

## Instruction identity

- **Series position:** Horror Grammar 0 correction
- **This is not:** Horror Grammar 0A, Horror Grammar 1, or a new packet branch
- **Expected local HEAD:** `0e997fd4e87b3d3b834975609df572baddcb6ba1`
- **Expected `origin/main`:** `0e997fd4e87b3d3b834975609df572baddcb6ba1`
- **Purpose:** Close the remaining User Sovereignty boundaries before Horror Grammar 1 begins

Read this entire instruction before editing. Implement it as one consolidated correction. Do not create additional remediation packets, rename the series, or begin later Horror Grammar work.

## Governing rule

> **TTM can be hostile to a character, but never the user.**

Retake and Restart are user controls outside the fiction. A Retake abandons only the replaced in-fiction turn. It never deletes a Git branch, rewrites Git history, removes source files, or damages the repository.

## Start gate

Run:

```bash
git fetch origin main
git rev-parse HEAD
git rev-parse origin/main
git status --short
```

Proceed only when both revisions equal:

```text
0e997fd4e87b3d3b834975609df572baddcb6ba1
```

Tracked files must be clean. Preserve unrelated user work. Do not use `git reset --hard`, `git clean`, force-push, rebase, branch deletion, or history rewriting.

## Current status

Keep the good work already present in Horror Grammar 0:

- failed turns preserve the last valid Retake checkpoint;
- raw upstream provider exception messages are no longer returned;
- receipt-specific patches are consolidated;
- existing Forge extraction/proposal boundary tests remain useful;
- the current test, typecheck, lint, and build baseline is green.

However, **Gate 0 is not closed yet**. Correct the five boundaries below without replacing the Engine, rewriting the Forge, or starting fresh.

---

## 1. Make canonical turn publication genuinely coherent

### Existing defect

`Runtime.tsx` currently dispatches `TURN_COMMITTED` and then writes the situated Engine game state in a separate operation. A synchronous consumer can observe a new application turn with the old Engine state. If the later write fails, the application commit may already exist.

Calling sequential writes a “single transaction,” or relying only on React batching, does not close this boundary.

### Required correction

Introduce one named commit coordinator for a successful generated turn. Use the smallest architecture compatible with the current stores.

The coordinator must:

1. receive the authoritative pre-turn application state and situated game state;
2. prepare the complete post-turn application state and complete post-turn situated game state without mutating either store;
3. validate both prepared states with authoritative schemas/types before any canonical write;
4. publish the pair through one coherent transaction/revision boundary;
5. prevent every production consumer that combines the two stores—prompt construction, presentation, telemetry, Retake, and exports—from consuming mismatched revisions;
6. publish presentation-only projections only after canonical publication succeeds;
7. emit exactly one bounded failure outcome if preparation or publication fails.

Do not use `as any` to cross the canonical boundary. Parse or validate the prepared situated state before publication.

A small, noncanonical transaction coordinator or revision fence is allowed. Do not introduce a third canonical state store. Do not casually merge the existing stores. If the current two-store design cannot meet the acceptance proof without a material ownership redesign, stop and report the exact limitation instead of relabeling sequential writes as atomic.

### Rollback requirement

Injecting a failure into the second canonical write must restore both stores to their exact pre-turn states before failure evidence is published. The result must not contain:

- a committed history entry;
- a committed receipt;
- committed memory or topology changes;
- a new checkpoint;
- a mixed application/Engine revision followed by `TURN_FAILED`.

### Required proof

Test the real production coordinator, not a test-only imitation.

Add tests that:

- subscribe synchronously at the publication boundary and prove production cross-store readers never receive a mixed revision;
- inject a second-write failure and prove both stores equal their pre-turn snapshots afterward;
- prove a successful turn commits each canonical state exactly once;
- prove presentation projection cannot repair or overwrite canonical state.

---

## 2. Replace client-asserted Architect identity with server-issued binding

### Existing defect

`POST /api/forge/register-source` accepts caller-supplied `sourceId`, `fileName`, and `unknownIds`, and `/api/forge/architect` later verifies those same assertions. This proves consistency with a client claim, not identity independently established by the server. Registration is also fire-and-forget, and registry entries have no complete acceptance, dismissal, removal, replacement, expiry, or replay lifecycle.

### Required correction

The server must issue an opaque, unpredictable binding only after it independently parses or validates the actual source payload.

Implement one consistent flow:

- **Document extraction:** the server performs extraction, records the authoritative source/unknown identity, and returns the analysis plus a server-issued binding.
- **Native JSON:** send the actual source payload to the server. The server validates and normalizes it with the authoritative Blueprint/source schema, derives its unknown set, and then returns the normalized analysis plus a server-issued binding. Do not register caller-supplied identity fields as authority.
- **Architect request:** send the server-issued binding and requested unknown identifier. The server resolves all authoritative identity data from its registry before building the model request.

Use cryptographically unpredictable bindings. Never include a binding, nonce, registry record, or internal identity secret in a model prompt, player-facing prose, receipt, telemetry, diagnostic export, Markdown export, or HTML export.

The server-side lifecycle must:

- track the active source and its open unknowns;
- close an unknown when its answer is accepted, dismissed, or assigned contextual discretion;
- reject replay against a closed unknown;
- invalidate the source on removal or source/session replacement;
- expire abandoned records after a bounded lifetime;
- fail closed after server restart with a safe stable code such as `SOURCE_BINDING_EXPIRED`;
- leave the draft unchanged when binding verification fails;
- allow safe re-registration or re-import after expiry without silently trusting cached client identifiers.

The UI must await successful server binding before placing an unknown into the active Architect queue. A failed registration must leave the source recoverable but unqueued, with no stored answer and no draft mutation.

Do not add an external database, account, service, or secret. An in-process registry is acceptable for this development boundary when it has the lifecycle above.

### Required proof

Add negative tests proving that:

- fabricated source and unknown identifiers cannot be registered as authority;
- a valid binding cannot answer an unknown belonging to another source;
- a closed unknown cannot be replayed;
- an expired or missing binding fails closed without draft mutation;
- a registration failure cannot race ahead into the Architect queue;
- bindings and registry data never reach the model request or exported output.

Preserve the existing tests that extraction and proposal staging cannot directly alter the draft. Do not describe those tests as exhaustive unless they exercise every production mutation path.

---

## 3. Close the safe-failure evidence allowlist

### Existing defect

The client still preserves arbitrary server-provided failure `code` values. Diagnostic `path` and diagnostic `code` fields are bounded mainly by length and angle-bracket rejection. A URL, provider detail, or credential-shaped sentinel can therefore survive into a receipt, UI failure heading, telemetry, or raw/Markdown/HTML export.

### Required correction

Create one normalization boundary used before any failure becomes application state.

It must:

- accept only a closed `SafeTurnFailureCode` allowlist;
- map every unknown or malformed failure code to `UNKNOWN_ERROR`;
- select user-facing text only from the local stable code-to-message table;
- use an own-property-safe lookup such as `Map` or `Object.hasOwn`;
- normalize HTTP status to an integer from 100 through 599, otherwise `null`;
- normalize content type to a small approved media-type allowlist, otherwise `null`;
- accept only known diagnostic kinds;
- accept only diagnostic paths shaped like `$`, dot-separated fields, and numeric indexes—never URLs, whitespace, query strings, credential material, or free prose;
- accept only stable allowlisted diagnostic codes;
- consistently reject the entire malformed diagnostic object or consistently filter invalid issues.

The normalized receipt—not the raw response—must be the only failure object available to:

- player UI;
- canonical receipt/history state;
- telemetry;
- raw structured download;
- Markdown export;
- HTML export;
- later prompt construction.

Keep the existing removal of raw `modelErr.message` data.

### Required proof

Place distinct unsafe sentinels separately in each of these positions and prove none survives any output path:

- top-level `code`;
- `message` or `error`;
- `contentType`;
- diagnostic path;
- diagnostic code;
- nested unknown fields.

Also prove that valid schema paths and approved diagnostic codes remain useful.

---

## 4. Make Restart a fresh simulation boundary

### Existing defect

The Engine reset currently spreads existing state without explicitly clearing Engine telemetry. Old-session evidence can survive Restart.

### Required correction

`resetEngine` and the coordinated application reset must explicitly clear all TTM-owned prior-session runtime material, including:

- Engine and application telemetry;
- turn history and receipts;
- situated game state;
- World Memory and character continuity created by the session;
- Retake checkpoints;
- presentation and diagnostic buffers;
- pending turn/proposal state;
- old session identity.

The next initialization must receive a fresh session identifier.

Restart must preserve:

- API keys and environment configuration;
- source Blueprints and user-authored source material;
- repository files and Git state;
- unrelated browser-origin data.

### Required proof

Seed every relevant store and buffer with a unique old-session sentinel. Restart, initialize a new session, and prove the sentinel is absent from:

- visible runtime state;
- subsequent model input;
- ordinary telemetry;
- raw structured export;
- Markdown export;
- HTML export.

---

## 5. Make Retake unconditionally available after a committed player turn

### Existing defect

`TURN_COMMITTED` still permits `allowRetake: false`, and an existing test treats disabled Retake as valid behavior. That contradicts the User Sovereignty rule.

### Required correction

- Remove the `allowRetake` escape hatch from committed player turns, or make it impossible for production code to disable Retake.
- Every successfully committed player turn must capture a Retake checkpoint, including terminal outcomes.
- A failed generation or validation must preserve the last valid checkpoint.
- Retaking must restore the immediately preceding completed checkpoint and remove the abandoned turn from active canon.
- The abandoned turn must not remain in active receipts, history, memory, topology, character state, later prompt input, or normal exports.
- System initialization is not a committed player turn and does not need a player Retake checkpoint.

Replace the test that currently expects `allowRetake: false` to disable Retake.

“Remove the abandoned turn from active canon” refers only to simulation data. It never authorizes deletion of Git branches, commits, files, packets, or repository history.

### Required proof

Test Retake after:

- an ordinary committed turn;
- a terminal committed turn;
- a failed attempted turn following a valid committed turn;
- a replacement turn after Retake.

Prove the replaced turn leaves no active-canon or prompt/export residue.

---

## Scope controls

Do not use this correction to:

- begin Horror Grammar 1;
- add aesthetic horror-state machinery;
- redesign the entire Engine or Forge;
- introduce new providers or paid live-model verification;
- change content-policy boundaries;
- delete branches, rewrite history, or remove unrelated files;
- create more instruction packets.

Use the existing architecture wherever it can satisfy the proofs. Prefer narrow named boundaries over broad rewrites.

## Verification gate

Run the focused tests covering the actual edited production paths. At minimum, include the active equivalents of:

```bash
npx vitest run src/core/engine/reducer.test.ts src/store/useAppStore.test.ts src/components/engine/Runtime.retake.test.tsx src/core/engine/sessionPersistence.test.ts
npx vitest run server/routes/turn.test.ts src/lib/turnResponseReader.test.ts src/lib/download.test.ts
npx vitest run server/routes/forge.test.ts src/components/forge/ArchitectChat.test.tsx src/store/useForgeStore.test.ts
```

If a named test file does not exist, create or use the nearest focused test for that production boundary and report the substitution.

Then run:

```bash
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
git diff --check
git status --short
```

Do not use a paid live Gemini call as acceptance evidence.

## Completion report

Return one consolidated report containing:

1. the exact files changed;
2. the canonical commit coordinator and coherence mechanism used;
3. the server-issued Architect binding and lifecycle used;
4. the safe failure allowlists and normalization boundary used;
5. the Restart fields explicitly cleared;
6. confirmation that committed player turns cannot disable Retake;
7. focused and full verification results with exact counts;
8. any residual limitation, stated plainly;
9. `git diff --check` and final `git status --short` output.

Do not create a follow-up packet from the completion report. Do not mark Horror Grammar 0 complete unless every acceptance proof above passes. Stop before Horror Grammar 1.
