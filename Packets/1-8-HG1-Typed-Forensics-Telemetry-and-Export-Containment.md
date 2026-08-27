# 1-8 HG1 Typed Forensics, Telemetry, and Export Containment

**Series:** TTM Horror Grammar 1 — Integration Closure  
**Execution packet:** 1-8 of 1-9  
**Depends on:** Packets 1-6 and 1-7 completed with their focused gates passing  
**Expected baseline:** `082ec660fcb747ff13da56d92ecc89d58e0c7cce` plus completed Packets 1-6 and 1-7  
**Scope:** Add the required developer forensic record, Runtime review surface, and export boundary. Do not redesign gameplay or add a second history owner.

## Governing invariant

> Accepted and rejected HG1 proposals are inspectable evidence for developers, never retrospective canon. The exact parsed rejected proposal may exist only in a labeled forensic record attached to the active committed turn.

The User experiences fiction. The developer sees why the machine admitted, rejected, preserved, or changed something. Neither view may contaminate the other.

## Objective

Create one strict, bounded `HorrorGrammarForensicRecord` (or repository-equivalent name) derived from the same typed context, normalized proposals, and ratification receipts used by the successful turn.

It must make the following readable in the existing telemetry experience and raw/Markdown/HTML exports:

- pre-turn fictional time and activity selection;
- exact parsed activity and pressure proposal evidence, including rejected bounded manifestation text;
- resolved authority, source, location, and perception evidence;
- accepted/rejected/no-proposal decisions and stable reason codes;
- admitted narrative status;
- relevant canonical before/after changes; and
- the final active-timeline turn/revision identity.

## Start gate

Read the completed state and ratification contracts from Packets 1-6 and 1-7, then inspect:

- `src/types/horrorGrammar.ts`
- `src/types/engineContract.ts`
- `src/types/index.ts`
- `server/routes/turn.ts`
- `src/lib/ratificationPipeline.ts`
- `src/core/engine/reducer.ts`
- `src/components/engine/Runtime.tsx`
- `src/store/useTelemetryStore.ts`
- `src/lib/download.ts`
- the current download, Runtime, Retake, and route tests.

Confirm that activity/pressure manifestations are composed only after admission. If Packet 1-7's composition gate is not true, fix that owner first; the forensic view must never be used as a path to narrative.

## 1. Define one strict forensic record

Add a strict schema and TypeScript type near the existing HG1 contracts. It is turn evidence, not `LogicState` and not a new mutable store.

The record must be bounded and contain only already parsed/normalized data. It must not contain a raw model response, provider metadata, prompt text, request body, endpoint information, credentials, stack text, or reasoning text.

At minimum include:

### Identity and selection

- schema version;
- active turn/revision identity available at the boundary;
- pre- and post-fictional-time values or receipt;
- present actor opportunity IDs;
- selected offscreen pursuit IDs;
- due-but-bounded-out pursuit IDs and aggregate dormant/not-due counts; and
- the selection cap/order version if the selector exposes one.

### Activity and pressure evidence

For both activity and pressure, retain the normalized proposal disposition (`NONE`, accepted, or rejected), stable reason code, admitted-to-narrative flag, resolved evidence IDs, and accepted event/thread ID if any.

For an active proposal, retain only its existing bounded fields:

- IDs and typed references;
- activity summary or adverse prospect;
- source/operator/affected dimension/persistence target as applicable;
- exact parsed manifestation block, including rejected text; and
- normalized location and perception path.

### Causal result

- compact before/after state for the affected HG1 owner;
- the causal decision records for value, pursuit, development, and pressure-thread transition when present; and
- final composed narrative-block count/identifiers or an equivalent compact admission summary.

Use the existing receipts as the source of truth. The record may reference receipt data, but it must not make the telemetry UI reconstruct decisions by rereading arbitrary prose.

## 2. Attach evidence to the committed active turn

Build the forensic record in the successful `/api/turn` route after all HG1 ratifiers have produced their receipts and before the response is serialized. Return it through a typed `TurnResponse` field.

On the client:

- attach it to the committed `TurnReceipt` or the repository's active equivalent;
- preserve it with the assistant message belonging to that committed turn;
- let existing coordinated publication and Retake checkpoint ownership govern its lifetime; and
- keep `useTelemetryStore` limited to UI state or a rebuildable derived index, never an independent canonical/forensic history.

Rules:

- Provider refusal or structurally failed model output produces no HG1 proposal forensic record, because no valid structured proposal exists. Its existing safe failure receipt remains separate.
- A rejected proposal may be committed as **forensic evidence** only when the ordinary base turn itself commits successfully.
- A rejected proposal must not enter game state, story log, character memory, World Memory, prompt context, or any later proposal basis.
- Retake removes the abandoned turn's forensic record from the active timeline exactly as it removes its ordinary turn receipt. A replacement turn begins from the restored pre-turn state.
- Refresh/hydration rebuilds any UI cache only from active committed receipts.

## 3. Add a readable Runtime forensic section

Extend the existing telemetry drawer in `Runtime.tsx`; do not create a second dashboard or change the player-facing story surface.

For the current selected/most recent committed turn, render a compact summary with an expandable **Horror Grammar Forensics** section. It should make the following quickly legible:

- fictional time and selected actor opportunities;
- activity decision, actor, source/authority/perception path, and admission status;
- pressure decision, value label, source, operator, adverse prospect, authority/perception path, and admission status;
- exact accepted/rejected manifestation content in a clearly labeled bounded evidence block;
- causal before/after summary and reason codes; and
- no-proposal turns without presenting them as errors.

Presentation requirements:

- label every rejected entry `REJECTED — NONCANONICAL` in text, not color alone;
- label accepted evidence separately from narrative output;
- use normal readable language with stable technical code alongside it;
- keep long records collapsed by default and bounded in the existing large-display layout; and
- show no score, threat meter, pursuit clock, recommended move, or player choice menu.

## 4. Extend exports without contaminating the transcript

Extend the existing raw, Markdown, and HTML export path in `src/lib/download.ts` (and its active parsing helpers) with one named **Horror Grammar 1 Forensics** section per committed active turn.

### Raw structured export

Include the complete typed forensic record as machine-readable evidence. This is the LLM-review surface.

### Markdown and HTML

Render a compact selection summary, activity/pressure decision entries, authority/source/perception evidence, causal before/after entries, and the exact bounded proposal evidence in an explicitly labeled forensic subsection.

For HTML, escape every rendered field and provide semantic text labels for accepted/rejected/no-proposal states. For Markdown, preserve clear headings and fenced or quoted evidence blocks without duplicating the proposal in transcript prose.

Containment rules:

- rejected manifestation text may appear only in the named forensic section;
- it must not appear in story transcript, summaries, canonical-state sections, prompts, memory, or ordinary narrative exports;
- abandoned Retake turns are absent from ordinary active-timeline exports; and
- provider/transport diagnostics remain governed by their existing safe failure contract, never by HG1 forensics.

## 5. Required focused proofs

Use unique sentinels for activity manifestation, pressure manifestation, provider metadata, endpoint URL, stack text, credential text, and prompt text.

Prove all of the following.

1. **Exact rejected evidence:** an otherwise valid turn with a rejected HG1 proposal retains the exact normalized sentinel only inside its typed forensic record.
2. **Canonical isolation:** that sentinel is absent from activity/pressure state, value/pursuit/development state, story log, composed narrative, World Memory, character memory, and future `EngineTurnContext`/outbound turn payload.
3. **Accepted evidence:** an admitted manifestation is identifiable in forensics and has the matching canonical receipt/event/thread without duplicating it as a new source of truth.
4. **Runtime readability:** the existing telemetry drawer displays the labeled forensic summary/detail from committed receipts. It may use a derived cache, but it must be rebuildable from active history.
5. **Export parity:** raw, Markdown, and HTML exports contain the named forensic section; rejected evidence is visible there only in its labeled section; HTML escaping is preserved.
6. **Failure and Retake:** provider refusal adds no HG1 forensic proposal record; Retake removes the abandoned record and replacement state/evidence begins at the restored pre-turn snapshot.

Update the existing route sentinel test. It must no longer assert that a rejected sentinel is absent from the entire response; it must assert exact presence only in `horrorGrammarForensics` and absence from every non-forensic surface.

## Focused verification gate

```bash
npx vitest run server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/components/engine/Runtime.horrorGrammar1.test.tsx src/components/engine/Runtime.retake.test.tsx src/store/useTelemetryStore.test.ts src/lib/download.test.ts src/core/engine/reducer.test.ts
npx eslint src/types/horrorGrammar.ts src/types/engineContract.ts src/types/index.ts server/routes/turn.ts src/lib/ratificationPipeline.ts src/core/engine/reducer.ts src/components/engine/Runtime.tsx src/store/useTelemetryStore.ts src/lib/download.ts
git diff --check
```

Use active-equivalent paths if necessary and report substitutions. Do not run the complete suite, global TypeScript check, full lint, or production build in this packet.

## Explicit non-goals

Do not:

- retain unparsed provider output, hidden reasoning, or raw prompts;
- create a separate background event log;
- expose developer forensics inside ordinary play;
- change Retake semantics or write an abandoned-timeline export product;
- add new Horror Grammar behavior beyond evidence for current HG1 owners;
- add provider changes; or
- use this packet to polish unrelated telemetry panels.

## Completion report

Report the forensic schema/ownership, UI and export locations, exact containment guarantees, files changed, and focused test results. Call out any remaining critical defect only if it corrupts canon, attributes action to the User, strands recovery, or leaks provider/internal material.

Do not call Horror Grammar 1 accepted after this packet. Proceed to Packet 1-9 when the focused gate passes.
