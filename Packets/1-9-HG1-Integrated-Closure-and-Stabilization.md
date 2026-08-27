# 1-9 HG1 Integrated Closure and Stabilization

**Series:** TTM Horror Grammar 1 — Integration Closure  
**Execution packet:** 1-9 of 1-9  
**Depends on:** Packets 1-6 through 1-8 completed with their focused gates passing  
**Expected baseline:** `082ec660fcb747ff13da56d92ecc89d58e0c7cce` plus completed Packets 1-6 through 1-8  
**Scope:** Prove the repaired vertical slice across real boundaries, then run the one declared broad stabilization gate. Do not add new grammar semantics.

## Governing invariant

> A focused helper test proves a rule. Horror Grammar 1 closes only when a real first turn becomes the exact bounded pre-state of a real second turn, remains recoverable through failure and Retake, and leaves rejected evidence in forensics without letting it become fiction.

## Objective

Complete the evidence-backed integration proof for the existing HG1 vertical slice:

1. session initialization creates canonical neutral/reviewed state;
2. the actual client pipeline sends that state to the route;
3. the route ratifies from that exact typed state;
4. coordinated publication commits the exact post-state;
5. the next real client turn receives that post-state;
6. rejection/refusal and Retake preserve or restore the correct state; and
7. Runtime telemetry and exports expose forensics only through their labeled boundary.

The goal is integrity, not forcing activity, pressure, escalation, or character evolution into every test turn.

## Start gate

Read the Packet 1-6 through 1-8 completion reports and inspect their actual changes. Confirm all focused gates passed.

Re-check at least:

- the final HG1 context, state, evidence, and forensic schemas;
- session initialization and persistence boundaries;
- `executeRatificationPipeline()` request construction;
- `/api/turn` ratification and response construction;
- `Runtime` prepared-state publication and Retake path;
- active history/receipt ownership; and
- raw/Markdown/HTML export parsing.

If a prior packet has a critical failure in continuity, authority, User attribution, recovery, or provider/internal containment, repair the owner with a narrow corrective change and rerun that packet's focused tests before continuing. Do not paper over it in the final test.

## 1. Add one real consecutive-turn integration fixture

Add a small scenario fixture with:

- one User-controlled character;
- one in-scene non-User character with a reviewed pursuit;
- one value anchor;
- a present opportunity that can support a valid activity; and
- an explicitly supported route for either direct or mediated perception.

The fixture must run the active client and route boundaries, not merely pass a manually written ratified frame to Runtime.

Use a local mocked structured-provider response sequence. No paid or live model call is required.

### Turn one

Drive a real user action through `executeRatificationPipeline()` and the active route contract. Return a valid accepted activity and value-linked pressure proposal. Verify:

- the outbound request carries the fresh canonical HG1 snapshot and immutable authoring baseline;
- the route accepts only valid evidence and returns typed receipts/forensics;
- Runtime/commit publication writes the expected post-state to `gameState`; and
- the forensic record is attached to the active committed turn.

### Turn two

Drive a second real user action through the same pipeline using the published stores. Verify the second outbound payload and route pre-state contain the exact relevant results of turn one:

- advanced fictional time and schedule;
- accepted activity event;
- open pressure thread;
- updated value condition;
- current pursuit overlay; and
- any accepted non-User development fact.

On turn two, exercise a legal state change or pressure-thread release/resolution. Verify the next post-state retains the causal chain rather than resetting it to baseline or `[]`/`{}`.

Do not assert a fixed horror cadence. A no-proposal turn is valid when its actual response is otherwise sound.

## 2. Prove failure, rejection, and Retake boundaries

Using the same fixture or a compact companion fixture, prove:

### Rejected proposal

- an invalid activity or pressure proposal leaves every HG1 canonical owner unchanged for that proposal;
- its exact normalized bounded evidence exists only in the labeled forensic record for the otherwise committed base turn;
- it is absent from narrative/story history/canonical ledgers and from the next outbound context.

### Provider refusal

- a provider refusal or empty-provider failure dispatches no committed HG1 post-state and creates no HG1 proposal forensic record;
- fiction time, schedule, activity, pressure, overlays, character development, and the Retake checkpoint remain at the pre-refusal state; and
- existing recoverable input behavior is preserved.

### Retake

- after a successful HG1 turn, Retake restores the complete pre-turn game state, including all seven HG1 owners;
- its active history and telemetry/export source no longer include the abandoned turn's narrative or forensic record;
- a replacement turn receives the restored fictional-time/schedule state as though the abandoned turn never happened; and
- no prompt, receipt, or state field tells the Engine that a Retake occurred.

## 3. Audit context and export boundaries

Add final assertions over the actual serialized next-turn request and each exporter.

### The next-turn request may contain only

- the selected Blueprint's current relevant authoring baseline;
- canonical runtime HG1 state needed for ratification/selection;
- all present opportunities and at most the configured offscreen cap;
- relevant current value/pursuit/development/pressure data; and
- the exact User action.

### It must exclude

- rejected proposal text and reasons;
- forensic labels/UI state;
- raw provider metadata, endpoint, credential, stack, or prompt sentinels;
- abandoned Retake records;
- dormant/omitted material beyond the bounded selection projection; and
- generated User intention, recommendation, or choice-menu language.

Verify raw, Markdown, and HTML exports show the exact rejected evidence only under the named **Horror Grammar 1 Forensics** section, HTML-escape it correctly, and omit abandoned turns from the active timeline.

## 4. Final contract audit

Before the broad gate, verify these code-level facts directly:

- no HG1 route logic uses an invented `context` field through a broad cast;
- activity and pressure no longer accept an arbitrary authority/source string, permissive mediated speech, missing local-trace location, or unrelated dialogue speaker;
- a successful turn cannot publish an HG1 ledger from an empty fallback when a prior canonical ledger existed;
- forensics derive from typed normalized proposals/receipts, not raw model/provider payloads;
- `useTelemetryStore` is not a competing evidence/canonical owner;
- legacy Blueprints remain playable with neutral HG1 behavior; and
- no code or test introduces a player-facing stat system, activity cadence, or autonomous full-cast simulation.

Log the documented deferred observations only if they still exist: wording alignment, display identifiers, broader reason-code/array audits, additional fixtures/CI, and forensic drawer polish. Do not treat them as closure blockers unless a live trace demonstrates canonical corruption, lost agency, stranded recovery, or unsafe leakage.

## Stabilization verification gate

Run the final focused integration group first:

```bash
npx vitest run server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/lib/buildEngineTurnContext.test.ts src/lib/castActivity.test.ts src/lib/castActivityEligibility.test.ts src/lib/situatedPressure.test.ts src/components/engine/Runtime.horrorGrammar1.test.tsx src/components/engine/Runtime.retake.test.tsx src/core/engine/commitCoordinator.test.ts src/core/engine/reducer.test.ts src/core/engine/sessionPersistence.test.ts src/lib/sessionReconciliation.test.ts src/store/useTelemetryStore.test.ts src/lib/download.test.ts
```

Then run the declared one-time broad stabilization gate for the whole closure sequence:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
rg -n -i 'evelyn[[:space:]]+vance|thorne' --glob '!node_modules/**' --glob '!dist/**' .
```

Do not suppress, broadly cast away, or silently reclassify a failure. If a known inherited TypeScript error remains outside this sequence, report it separately with its file and exact error; do not call the global type gate green. If the command is clean, report that exact result.

## Explicit non-goals

Do not:

- start Horror Grammar 2;
- add fresh gameplay mechanics, hidden scores, or player-facing meters;
- add a second provider call or a background simulation loop;
- change provider safety/content handling;
- redesign the Forge;
- absorb the broader source-synthesis, Player-Character Binding, or global TypeScript-debt packages; or
- disguise unrelated cleanup as an HG1 fix.

## Final completion report

Return one consolidated **Horror Grammar 1 Integration Closure** report containing:

1. start/end revision and workspace status;
2. packet order and exact files changed, grouped by Packets 1-6 through 1-9;
3. the final typed state/context/authoring handoff;
4. activity and pressure authority/source/location/perception/speaker rules;
5. the exact first-turn → publication → second-turn evidence;
6. rejected-proposal, provider-refusal, and Retake evidence;
7. Runtime and raw/Markdown/HTML forensic behavior;
8. focused and broad command results with file/test counts;
9. any remaining inherited baseline failure separately from HG1 results;
10. any residual critical defect affecting canon, User agency, recovery, or provider/internal containment; and
11. confirmation that Horror Grammar 2 was not started.

Call Horror Grammar 1 integrated only if the evidence above is present and no residual critical defect remains. Otherwise identify the exact owning boundary and stop there.
