# Packet 05 — Protect User values across operation forms

Status: pending implementation. Milestone 2. Read the [series contract](README.md). Prerequisite: [Packet 04](04-Canonical-Presence.md).

## Finish line

Equivalent proposed changes receive equivalent authority decisions. A model cannot retire or otherwise change a protected User commitment merely by selecting an operation name whose guard is weaker. Allowed descriptive consequences remain expressible.

## Observed failure

The value-state resolver protects User-held anchors for operations including REVISE, RETIRE, and RESTORE. Its SET_CONDITION branch also accepts a proposed lifecycle but does not apply the same protection. A diagnostic targeting a User-held value rejected RETIRE and retained ACTIVE, but accepted SET_CONDITION with lifecycle RETIRED and published RETIRED.

This is an operation-consistency defect. It is not evidence that ordinary descriptions of fear, bodily response, recollection, or subjective experience should be prohibited. Justin explicitly allows natural descriptive consequences.

## Work

1. Trace holder identity and effective User binding from canonical state. Never take authority over the target from a model's holder echo or operation label.
2. Evaluate the resulting change before applying it. Check lifecycle, identity/commitment fields, and any fields that allow an equivalent protected alteration through another supported operation.
3. Make the protection consistent across supported operation forms and schema defaults. Distinguish a descriptive condition update from retiring, restoring, or rewriting a protected commitment. Do not prohibit legitimate condition consequences simply because the holder is the User.
4. Preserve valid changes for other holders under existing authority rules, and preserve any established path that explicitly authorizes a User-directed change. Do not invent a new consent or player-command parser as part of this repair.
5. Keep rejected proposed changes out of canonical value state and downstream pressure/pursuit effects. Use existing receipt reasons, adding a bounded reason only where needed to explain the actual rejection.

Primary owners: `src/lib/valueState.ts`, `src/types/horrorGrammar.ts`, and the value receipt validation/publication paths. Inspect schema defaults as well as resolver branches; a default must not silently reactivate or retire a protected value.

## Acceptance checks

- Pair RETIRE with SET_CONDITION carrying RETIRED for the same User-owned active anchor; both must enforce the same protection.
- Cover equivalent restoration/revision attempts through supported payload forms, including omitted/default lifecycle fields and misleading holder data.
- A legitimate descriptive condition update still succeeds without silently changing the protected lifecycle or commitment.
- Valid non-User updates continue to work within their existing authority. Test any existing explicit User-authorization path rather than inventing one for the fixture.
- Through the real turn receipt/publication path, a rejected value proposal cannot modify the ledger or trigger downstream canonical effects. Retake restores accepted value changes correctly.

Focused families: `src/lib/valueState.test.ts`, `src/lib/situatedPressure.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, `src/lib/horrorGrammarTurnValidation.test.ts`, and relevant Runtime HG1 tests.

Report the protected resulting changes and the allowed descriptive changes separately. Next: [Packet 06](06-Exact-Authority-References.md).
