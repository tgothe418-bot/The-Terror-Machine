# Packet 11 — Complete HG1 behavioral connections

Status: pending implementation. Milestone 5. Read the [series contract](README.md). Prerequisite: the required engineering checks from [Packet 10](10-Fictional-Frame-Handling.md); unresolved experiential items must remain visible through final acceptance.

## Finish line

Accepted events can activate the pursuits they are authorized to trigger through the real turn path. Offscreen activity follows accepted runtime pursuit intent. Fictional-time instructions describe the causal behavior the server actually implements.

## Observed gaps

The eligibility helper supports `acceptedTriggerReferences`, and the context builder can forward them, but the production pipeline supplies none. Offscreen opportunities project authored pursuit objective/approach while present opportunities can use the mutable runtime pursuit ledger. Accepted runtime redirection can therefore be omitted from offscreen behavior.

The server already resolves fictional time and schedule once and returns their receipts. Prompt wording still says fictional-time cost guides prose only, although the accepted cost advances the ledger and affects scheduling. These are inspected production connections; the diagnostic probe set did not establish every event-driven or offscreen lifecycle below.

## Work

1. Identify the accepted event sources the current HG1 contract supports. Map their exact references, ownership, scope, and availability into the production request/context path using Packet 06's evidence boundary. Do not derive authority from arbitrary history text or raw model proposals.
2. Define trigger lifetime and consumption from existing semantics: when an accepted event becomes eligible, whether it remains available, and what prevents duplicate activation. Preserve ordering so only evidence already accepted at that point can trigger a pursuit. If the contract leaves these semantics unresolved, present the concrete trigger example and bounded choice before adding new canonical behavior.
3. Project the current accepted runtime pursuit objective/approach consistently for present and offscreen opportunities. Respect active/retired state and supported fallback for an uninitialized runtime record. Do not revive a stopped pursuit from authored defaults.
4. Preserve current eligibility budgets and fairness behavior, including the offscreen limit and last-considered scheduling. Verify that duplicate references, neutral turns, and rejected proposals do not create extra opportunities or unexplained state changes.
5. Align fictional-time prompt wording with the accepted server-owned causal role and category semantics. Keep one authoritative computation, required receipts, and current pre-state chain validation. Do not recalculate time independently in the client. Preserve INIT and UNCLEAR behavior according to the contract.
6. Revisit only concrete INIT proposal issues recorded in Packet 03. Resolve any necessary canonical-effect change through a bounded decision and regression. Do not introduce the deferred universal warning/intervention window, guaranteed rescue, fixed ending, or a new grammar phase.

Primary owners: `src/lib/ratificationPipeline.ts`, `src/lib/buildEngineTurnContext.ts`, `src/lib/castActivityEligibility.ts`, `src/lib/castActivity.ts`, `src/lib/fictionalTime.ts`, relevant HG1 ledgers/contracts, and `server/routes/turn.ts`.

## Acceptance checks

- Publish an eligible accepted event, then construct the next real request from stores. The correct event-driven pursuit becomes eligible at the specified point; rejected, nonexistent, wrong-owner, and stale events do not.
- Verify the specified trigger lifetime over several turns, including duplicate references and a neutral turn. No unsupported repeated activation.
- Publish a pursuit redirection, move or retain its actor offscreen, and verify the next opportunity uses the accepted runtime objective and approach. Stopped/retired pursuits stay inactive.
- Exercise more eligible offscreen actors than the configured budget across consecutive turns to verify the existing limit and fairness. Preserve valid present and mediated activity from Packet 04.
- Drive accepted time categories through server resolution, receipts, client validation, and publication. Verify exactly one advancement and the corresponding schedule behavior. Rejection, refusal, INIT, and UNCLEAR preserve the state required by their contracts.
- Retake and reload restore the appropriate time, schedule, pursuit, and trigger state. Their next production requests must reflect that restoration.

Focused families: `src/lib/castActivityEligibility.test.ts`, `src/lib/castActivity.test.ts`, `src/lib/fictionalTime.test.ts`, `server/routes/turn.horrorGrammar1.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, `src/lib/horrorGrammarTurnValidation.test.ts`, and relevant Runtime HG1/Retake tests.

Report verified behavior separately from any unresolved trigger or INIT semantics. Next: [Packet 12](12-Integrated-Acceptance.md).
