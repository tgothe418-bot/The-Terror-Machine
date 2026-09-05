# TTM — Critical Corrections Instruction Series

Prepared for Justin, Architect, on September 4, 2026. These are implementation instructions prepared from the accepted critical-corrections roadmap. Generating this series does not implement or accept its corrections. All twelve packets are pending implementation and verification.

The objective is to preserve accepted canon, enforce who may change it, recover one complete world after interruption, and express the active scenario faithfully. This work completes and corrects the current Horror Grammar 1 integration; it does not begin a new grammar phase.

## Starting point

Read the [repository README](../../README.md), this index, and the active packet before working. Resolve architectural intent from Justin's instructions and the current README. Historical handovers and packets are evidence to inspect, not proof that their diagnosis still applies.

The reviewed baseline is the current local workspace, including its uncommitted turn-pipeline changes. At review, HEAD and GitHub main were `51c667c9aab39551129f39b2a0d70789ee4d513d`; seventeen tracked files were modified and three files were untracked. Justin explicitly confirmed this workspace as the intended baseline. Do not reset, stash, discard, or overwrite those changes. A dirty tree or a later commit is not by itself a reason to stop.

The workspace already initializes the seven HG1 ledgers, threads them through turn context, returns fictional-time/activity/schedule receipts, checks HG1 receipt pre-state before publication, and persists the HG1 fields explicitly. Preserve those improvements. Older integration instructions describing these connections as absent are stale for this baseline. Preserve historical acceptance records and repair the demonstrated gaps.

Before each packet, inspect current behavior and record the relevant starting diff. If a requested correction is already present, verify the acceptance cases, report that scope as already satisfied, and proceed with remaining work. Keep new changes distinguishable from the existing work.

## Sequence and milestone gates

Execute in this order. Each packet depends on the earlier packets having completed their engineering scope and required automated checks, even when its code boundary is otherwise independent. Experiential review may remain pending while independent engineering continues, but the corresponding milestone cannot receive final acceptance until that review is complete. If an unresolved semantic decision blocks a particular behavior, report that dependency and withhold its acceptance; continue work that does not depend on the decision.

| Packet | Correction | Milestone | Gate |
|---|---|---|---|
| [01](01-Runtime-World-Memory.md) | Carry accepted runtime world memory through real turns | 1 — Session continuity | Focused |
| [02](02-Obsolete-Turn-Isolation.md) | Reject results from replaced or superseded sessions/turns | 1 | Focused |
| [03](03-Opening-Continuity.md) | Include accepted opening narration in subsequent context | 1 | Integrated continuity + broad stabilization |
| [04](04-Canonical-Presence.md) | Use canonical presence in opportunities and manifestations | 2 — Authority and authoring | Focused |
| [05](05-User-Value-Protection.md) | Protect User-owned choices across equivalent operation forms | 2 | Focused |
| [06](06-Exact-Authority-References.md) | Resolve actual evidence and ownership before admission | 2 | Focused |
| [07](07-Depiction-Import-Export.md) | Preserve authored depiction through import and reviewed export | 2 | Combined authority/authoring regressions |
| [08](08-Durable-Session-Recovery.md) | Recover a complete durable revision across state owners | 3 — Recovery | Storage failure injection + broad stabilization |
| [09](09-Scenario-Governed-Physics.md) | Make physical permissions follow the Blueprint | 4 — Scenario fidelity | Deterministic checks + play review cases |
| [10](10-Fictional-Frame-Handling.md) | Replace destructive anti-rescue phrase substitution | 4 | Response handling checks + play review cases |
| [11](11-HG1-Behavioral-Connections.md) | Connect accepted event triggers and runtime pursuit intent | 5 — HG1 closure | Consecutive-turn behavioral checks |
| [12](12-Integrated-Acceptance.md) | Prove the complete lifecycle and record remaining limits | 5 | Full stabilization + Architect play acceptance |

## Product decisions to preserve

- The model proposes; the machine decides. Blueprints define authored foundations. Ratified runtime state owns subsequent canon.
- Scenarios may use grounded human horror, supernatural horror, or deliberate uncertainty. Dramatic tension alone does not permit impossible physics.
- User sovereignty protects chosen actions, intent, and commitments. Natural involuntary responses and descriptive state consequences are allowed; do not turn this series into a ban on fear, flinching, bodily responses, or ordinary subjective description.
- Anti-rescue exists to contain unsolicited out-of-character check-ins embedded in fictional roleplay. Legitimate reassurance, deception, refuge, and character dialogue remain valid. Explicit provider refusals and empty/invalid responses must still fail honestly without changing canon.
- Justin has deferred a universal warning or intervention opportunity before loss. Do not introduce a mandatory response window in this series.
- The Voice is a read-only observer. Ordinary play should not expose internal mechanics. Existing diagnostic exports may retain exact rejected proposals in explicitly labeled forensic sections; those proposals must not enter playable fiction, canonical ledgers, or future narrative prompts.
- Preserve perspective-neutral Blueprint export, perspective-specific entry, valid NPC autonomy, bounded memory, refusal recovery, and Retake.

## Implementation and verification contract

The owning files in each packet are starting points, not an artificial permission boundary. Use necessary adjacent helpers and tests when they belong to the same correction. Avoid unrelated refactors, dependency upgrades, provider changes, pacing redesign, and new product features. Do not add a second generation/repair call or a retry loop as an incidental fix.

Use scenario-neutral fixtures. Do not use Dr. Evelyn Vance or any Thorne character. Construct schema-valid inputs that reach the intended semantic boundary. Pair rejection cases with legitimate activity or content that must continue to work.

Test the production path that caused the failure. A helper test that manually supplies an omitted field does not prove its caller supplies that field. Prefer the actual request builder, route/resolver, publication owner, stores, and export owner as applicable. Provider transport can be deterministic test data; storage failure tests must exercise the storage adapter and fresh hydration. Identify every mocked boundary. No paid/live provider call is required by these packets.

After each correction, run the named focused test families and any newly affected direct tests. At Packets 03, 08, and 12, run the broad gates from the repository root:

```text
npm test
npx --no-install tsc --noEmit
npm run lint
npm run build
git diff --check
```

Focused tests use `npm test -- <test-file> [<test-file> ...]`. Select concrete paths from the active packet. If a new test file is the clearest owner, create it and include it in the report. Do not run the full suite after every small edit. Repeat checks when changes or failures justify it. Inherited failures must be documented separately; an unresolved required gate is not a pass.

Engineering choices within these boundaries do not require a new approval round. If implementation reveals an unresolved product semantic that changes what becomes canon, present the concrete choice and affected acceptance case to Justin before making that change. Continue independent authorized work. The opening-proposal question, ambiguous prose handling, and compatibility of old saves should be investigated concretely; they are not reasons to withhold the rest of a packet at the outset.

## Completion record

For each executed packet, report:

1. The demonstrated failure and resulting behavior, with changed files.
2. The production boundary exercised, test commands/results, and mocked limitations.
3. Positive behavior preserved, plus failure/Retake/reload evidence where applicable.
4. Any unresolved decision or acceptance item, and its downstream impact.
5. A disposition: implemented and verified, already satisfied and verified, or incomplete with a specific reason.

Use separate reviewable changes for unrelated corrections. Follow Justin's current instructions for commits and publication; creating this packet series is not a request to commit, push, or open a PR. At final closure, update roadmap dispositions only to the demonstrated scope and retain their historical records.

Voice context improvements, historical pacing cleanup, telemetry polish, a separate prose-only export, the universal response-window discussion, and later grammar phases remain deferred. Reprioritize only when concrete new evidence shows canon loss, an authority violation, or blocked recovery.
