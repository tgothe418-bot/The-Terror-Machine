# Packet 10 — Preserve the fictional frame without corrupting dialogue

Status: pending implementation and experiential review. Milestone 4 closure. Read the [series contract](README.md). Prerequisite: [Packet 09](09-Scenario-Governed-Physics.md).

## Finish line

Ordinary fictional dialogue survives unchanged, including reassurance, lies, and temporary refuge. A clearly unsolicited out-of-character narrator check-in receives a defined admission/failure disposition instead of being rewritten into visible system-error prose. Provider refusals remain genuine failures without canonical changes.

## Observed failure

`applyAntiRescueLinter` replaces a short list of phrases across prose, dialogue, and internal monologue with `[ COGNITIVE REJECTION: SAFETY PROTOCOL DENIED ]`, then appends `[SYS: SAFETY_OVERRIDE_FAILED]`. The rewritten frame can still be accepted.

Diagnostics showed three distinct failures: legitimate fictional reassurance was damaged; differently worded out-of-character reassurance passed unchanged; and a matched warning lost one phrase while its surrounding check-in survived. The current rule is neither a reliable frame detector nor a safe text transformation.

## Work

1. Trace explicit provider refusal handling separately from narrative-frame validation. Keep refusal/empty/invalid-response handling intact. This correction does not disable provider controls or transform a refusal into fictional success.
2. Remove destructive phrase substitution as the acceptance mechanism. A character saying “you are safe” or asking whether another character needs help is not, by itself, evidence that the narrator has stepped out of the fiction.
3. Define and document a bounded disposition policy using available structured block context, attribution, and surrounding response evidence. Clearly distinguish in-world speech, a clearly unsolicited narrator check-in, an explicit provider refusal, and an ambiguous case. Reject clearly invalid frames through the established noncanonical failure path; do not fabricate replacement prose to conceal a failure.
4. Define ambiguous handling before implementation and include examples that demonstrate its cost. A phrase match alone must not settle attribution. State what the chosen mechanism can establish and where it remains uncertain; do not claim comprehensive semantic detection. If a consequential tradeoff remains unresolved by the accepted fictional-frame goal, bring the concrete examples and proposed disposition to Justin.
5. Preserve accepted narration without token-by-token sanitization, and preserve the allowed natural consequences in the series contract. Keep diagnostics outside ordinary fictional blocks. Do not add a repair call, silent retry, fallback narrative, or new provider as an incidental solution.
6. Ensure failed frame admission changes no canonical ledger, turn/time state, checkpoint, or pursuit schedule. Subsequent request context must exclude the failed narrative while retaining the established failure/forensic record in its proper channel.

Primary owners: `src/lib/ratificationPipeline.ts`, frame/response validation types and readers, and Runtime failure presentation where required. Inspect the provider refusal boundary without broadening into provider integration changes.

## Acceptance checks

| Case | Required evidence |
|---|---|
| A character offers sincere reassurance | Original dialogue remains intact and can be accepted |
| A character lies about safety | Deception remains expressible; the phrase is not independently rejected |
| A refuge or dream is described inside the scenario | Authored fiction survives without system markers |
| The narrator clearly interrupts roleplay to check on the real user | Defined frame-failure behavior; no fabricated accepted prose or canonical change |
| Similar wording is spoken by an in-world character | Attribution prevents the negative case from becoming a blanket phrase ban |
| Ambiguous attribution | Chosen disposition is documented and tested, with its limitation visible in the completion record |
| Explicit provider refusal, empty result, or malformed response | Existing honest failure path remains intact |

Exercise validation through the real pipeline and Runtime publication/failure boundary. Include Retake after a prior successful turn followed by a frame failure. Focused families: `src/lib/ratificationPipeline.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, `server/routes/turn.test.ts`, and relevant Runtime failure/Retake tests.

Milestone 4 combines Packet 09's scenario matrix with these dialogue/frame cases. Record deterministic results and Justin's experiential acceptance separately; passing one does not imply the other. Next: [Packet 11](11-HG1-Behavioral-Connections.md).
