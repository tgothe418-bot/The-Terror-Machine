# Packet 04 — Enforce canonical cast presence

Status: pending implementation. Milestone 2. Read the [series contract](README.md). Prerequisite: Milestone 1 accepted through [Packet 03](03-Opening-Continuity.md).

## Finish line

Opportunity selection and manifestation admission agree with canonical placement. Explicitly absent or nonlocal actors cannot acquire a local body through a fallback, while legitimate mediated and unobserved activity remains possible.

## Observed failure

`castPresence` correctly distinguishes OFFSTAGE and NONLOCAL placement from local presence. The opportunity builder separately falls back from an absent map entry through authored starting location to the current topology node. Direct activity admission trusts the resulting present opportunity and location.

Diagnostics for OFFSTAGE and NONLOCAL actors produced `isPresent: false` in context, a PRESENT opportunity for the same actor, and accepted direct activity. These used actual context, eligibility, and activity resolver modules with schema-valid proposals.

## Work

1. Trace presence from authored entry and runtime cast locations to context, opportunities, and activity admission. Use the canonical presence interpretation consistently; do not infer presence from a convenient fallback string.
2. Distinguish explicitly OFFSTAGE/NONLOCAL, valid AT_NODE placement, invalid AT_NODE placement, and genuinely absent legacy placement data. Preserve supported legacy entry behavior without treating explicit absence as missing data.
3. Validate direct manifestations against canonical presence at the ratification boundary even if the opportunity supplied to that boundary is contradictory. Keep topology/location checks intact.
4. Preserve accepted nonlocal capabilities and mediated perception only when the relevant contract/evidence permits them. Do not “fix” local presence by disabling every offscreen opportunity.

Primary owners: `src/lib/castPresence.ts`, `src/lib/castActivityEligibility.ts`, `src/lib/buildEngineTurnContext.ts`, and `src/lib/castActivity.ts`.

## Acceptance checks

- OFFSTAGE, NONLOCAL, and invalid AT_NODE actors receive no false PRESENT opportunity and cannot manifest DIRECT activity at the user's node.
- A forged or contradictory PRESENT opportunity does not override canonical absence during ratification.
- A correctly present actor can still speak or act through a legitimate direct manifestation.
- A valid offscreen actor can still act through supported unobserved or mediated channels, with the expected perception limits.
- Legacy placement fallback remains correct for a fixture that actually lacks explicit placement. Runtime movement changes subsequent eligibility through real context construction.
- Rejection leaves canonical locations, activity records, and related pressure effects unchanged. Rejected evidence is available only through the established diagnostic/forensic boundary.

Focused families: `src/lib/castPresence.test.ts`, `src/lib/castActivityEligibility.test.ts`, `src/lib/castActivity.test.ts`, `src/lib/ratificationPipeline.horrorGrammar1.test.ts`, and relevant `server/routes/turn.horrorGrammar1.test.ts` cases.

Report positive autonomy behavior alongside the absence fixes. Exact evidence and ownership validation is completed separately in Packet 06. Next: [Packet 05](05-User-Value-Protection.md).
