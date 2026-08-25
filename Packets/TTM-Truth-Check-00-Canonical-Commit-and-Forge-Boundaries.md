# TTM Foundation Truth Check 00

## Canonical Commit and Forge Boundary Evidence Audit

**Status:** diagnostic-only gate  
**Sequence:** before Packet 09 — Source-to-Required-Field Synthesis  
**Expected baseline:** main at 4a13162d819ee98475f5782035d83619f5279965, or a descendant that contains 7779b4e9ed8d4bd42bc609b99657beb9cb8a2959  
**Code changes:** prohibited  
**Commit / push:** prohibited

## Purpose

Packet 09 is intentionally being held for a researched Forge improvement. Do not let it absorb unresolved foundation work.

This packet answers four historical concerns with current, traceable evidence:

1. Does every accepted turn pass through one canonical, revision-checked commit boundary?
2. Do rejected and failed turns preserve canonical state while producing safe, inspectable failure evidence?
3. Can a source-derived Forge candidate bypass the candidate ledger or equivalent review boundary?
4. Does the Architect request path independently bind source and unknown identities on the server, rather than trusting only the client?

These are audit questions, not assumptions that defects still exist. A prior roadmap and audit recorded them as open or unproven; subsequent work may have retired them. Prove the current state from the live call graph and existing tests.

Do not “fix it while you are there.” If evidence reveals a defect or a proof gap, report the smallest next packet. Do not implement it.

## Non-negotiable operating rules

- Make no source, test, configuration, documentation, fixture, generated-file, lockfile, or formatting changes.
- Do not create, amend, reset, revert, stash, commit, push, pull, or clean anything.
- Preserve any pre-existing working-tree changes exactly as found.
- Do not call a live model provider, run an Autopilot soak, or create a browser session.
- Do not run the full test suite, build, typecheck, lint, or formatter.
- You may run only existing, narrowly targeted tests discovered during the audit. Do not edit or add tests to make a claim pass.
- Do not treat a symbol search as proof. Follow the active call graph to the actual state write and show the relevant existing test evidence when it exists.
- A literal event named TURN_COMMITTED or TURN_FAILED is not required. A different implementation is acceptable only if it demonstrably provides the same guarantees.

## Baseline gate

Record these before inspecting application code:

    git rev-parse HEAD
    git status --short
    git merge-base --is-ancestor 4a13162d819ee98475f5782035d83619f5279965 HEAD
    git merge-base --is-ancestor 7779b4e9ed8d4bd42bc609b99657beb9cb8a2959 HEAD

Both ancestry checks must succeed.

If either fails, stop. Report the current HEAD and the failed ancestry check; do not make the audit’s behavioral claims against an unknown baseline.

At the end, record HEAD and git status again. They must be unchanged.

## Evidence standard

Classify each question using exactly one of these outcomes:

| Outcome | Meaning |
| --- | --- |
| **Proven live** | The active call graph and an existing focused test together establish the required behavior. |
| **Implemented but unproven** | The current source appears to implement the behavior, but no existing focused test proves a material guarantee. |
| **Residual defect** | The active path can violate the stated guarantee. Include the exact path, condition, and minimally sufficient reproduction. |
| **Architectural replacement** | The old named mechanism no longer exists, but an alternate design demonstrably meets every relevant guarantee. Explain how. |
| **Not auditable from the current repository** | Necessary evidence is absent or external. State exactly what cannot be established. |

“The code looks right” is not Proven live. A passing unrelated suite is not proof. A test that mocks away the write path is not proof of the canonical commit boundary.

For every source claim, provide file path, symbol or handler name, and a short call-chain description. For every test claim, provide the exact existing test file, test name, and command used.

## Audit A — Canonical turn commitment

### Question

Does one accepted human action become one canonical transaction, checked against the expected revision, with no competing engine write path?

### Required walkthrough

Trace the active human-turn path from submitted UI input through:

1. action submission and request construction;
2. the server turn route and provider boundary;
3. structured-response validation and deterministic ratification;
4. the client response reader or coordinator;
5. the authoritative simulation-state write;
6. revision, completed-turn count, receipt, and checkpoint creation;
7. Retake restoration.

Then trace Autopilot far enough to prove whether it invokes that same authoritative turn coordinator or a special write path.

Use repository discovery first. Useful search terms include:

    rg -n -i "turn_committed|turn_failed|ratif|revision|checkpoint|retake|process.*turn|commit" . --glob '!node_modules/**' --glob '!dist/**'
    rg -n -i "autopilot|submit.*action|player.*action|api/turn" src server test tests . --glob '!node_modules/**' --glob '!dist/**'

Paths and symbol names may have changed; follow the live path rather than assuming a legacy filename is authoritative.

### Required findings

Answer each item explicitly:

| Guarantee | What must be located |
| --- | --- |
| Authoritative state | The one store, reducer, transaction, or equivalent that owns canonical runtime state. Name any separate display or telemetry stores and explain why they are not competing authorities. |
| Expected revision | Where the pre-turn revision is captured, carried, and checked before commit. |
| Exactly-once acceptance | The mechanism preventing replay, stale response, double click, duplicate dispatch, or repeated response application from committing twice. |
| Atomicity | The one accepted state transition that applies all canonical deltas, rather than several unrelated post-ratification writes. |
| Failure preservation | The paths for schema failure, refusal, malformed provider result, network failure, and stale result; none may change canonical state or create a completed checkpoint. |
| Successful checkpoint | Where the immediately preceding successful state is retained for Retake, and why a failed turn cannot overwrite it. |
| Retake | Where restoration occurs and what completed checkpoint it restores. |
| Autopilot parity | Whether Autopilot goes through the same acceptance and commit boundary as human input. |

Pay particular attention to state patched after a reducer or accepted-frame application. A post-commit update is only acceptable if it is provably noncanonical presentation or telemetry data; otherwise classify it as a competing write path.

### Existing test evidence

Find existing focused tests for the active implementation. If they exist, run at most the narrowest useful test file or selected tests using the project’s established test command. Do not write new tests.

The audit needs evidence for these four behaviors:

1. an accepted turn changes revision and completed-turn state exactly once;
2. a duplicate, replayed, or stale response cannot commit twice;
3. a malformed, refused, or rejected response leaves canonical state and the completed checkpoint unchanged;
4. Retake restores the immediately preceding completed checkpoint.

If one or more behaviors lack an existing focused test, report Implemented but unproven rather than inventing coverage during this packet.

## Audit B — Failure safety and observability

### Question

When the turn path fails, does the user receive bounded diagnostics and does telemetry retain useful evidence without leaking raw provider or server internals?

### Required walkthrough

Trace all active error paths from the server turn route through client parsing, receipt construction, runtime display, and HTML/Markdown/JSON export.

Search for raw error propagation, but do not declare a defect merely because the text err.message exists. Establish its source and whether it can reach user-visible or exported data unsanitized.

    rg -n -i "err\\.message|error\\.message|stack|cause|throw new|catch \\(" server src test tests . --glob '!node_modules/**' --glob '!dist/**'
    rg -n -i "receipt|diagnostic|failure|export|download|telemetry|raw" src server test tests . --glob '!node_modules/**' --glob '!dist/**'

### Required findings

For each active failure class below, identify server behavior, client behavior, canonical-state effect, receipt or equivalent evidence, and export behavior:

- invalid request or invalid action;
- invalid JSON or structured-response schema failure;
- model refusal or blocked result;
- provider/network exception;
- ratification rejection;
- stale or duplicate response;
- client response parsing failure.

The acceptable design may use a generic failure message, a safe error code, a bounded diagnostics object, or another contract. It must not expose raw provider text, stacks, request headers, credentials, or arbitrary upstream exception text to the player or an export.

Determine whether there is a TURN_FAILED event or an equivalent immutable failure receipt. If there is no literal event but safe failure data, unchanged canonical state, and inspectable diagnostics are reliably created, classify it as an Architectural replacement rather than a naming failure.

Run only an existing focused failure-path test if one is available. Do not make a real provider request.

## Audit C — Forge source-candidate provenance and ledger boundary

### Question

Can source-derived data mutate the active Forge draft without an auditable candidate decision or equivalent explicit review transaction?

### Important distinction

Direct manual authoring is allowed. A generic draft-editor action is not inherently a defect.

The concern is narrower: source-derived candidate data, source gap resolution, inferred source detail, or an Architect proposal must not silently enter the draft through a generic mutation path that omits its provenance and review decision.

### Required walkthrough

Locate the current Forge store, source baseline or candidate ledger, draft mutations, source import/induction flow, Architect proposal application flow, and Depiction Contract application flow.

Audit the active call paths for all source-derived writes. Include—but do not assume are defective—any actions equivalent to:

- updateDraft;
- cast and spatial editor actions;
- acceptUnknownResolution;
- source-candidate acceptance or rejection;
- Architect proposal apply;
- Depiction Contract proposal apply.

Useful discovery searches:

    rg -n -i "forgeDraft|candidate|ledger|source.*baseline|unknown.*resolution|accept.*proposal|updateDraft|depiction.*contract" src server test tests . --glob '!node_modules/**' --glob '!dist/**'
    rg -n -i "apply.*draft|set.*draft|patch.*draft|update.*draft|cast|spatial" src server test tests . --glob '!node_modules/**' --glob '!dist/**'

### Required findings

Build a source-mutation provenance table. It must contain every discovered path capable of changing a source-derived field:

| Entry point | Payload provenance | Review/decision record | Revision or identity binding | Draft mutation endpoint | Classification |
| --- | --- | --- | --- | --- | --- |

For each path, say whether it is:

- explicit manual authoring;
- reviewed source candidate acceptance;
- reviewed Architect proposal;
- unknown resolution with retained provenance;
- unreviewed source-derived mutation; or
- unrelated to the active draft.

If a source-derived field can reach a generic mutation action, trace whether that action is only invoked after a verified decision boundary. Do not infer safety from a button label; follow the payload into the store.

Find and run an existing narrow test only if it actually covers source-candidate acceptance, rejection, or an attempted bypass. If no test exercises a material path, report that proof gap.

## Audit D — Architect server identity binding

### Question

Does the active Architect request path independently verify source and unknown identities on the server, and does the client refuse mismatched responses before applying them?

### Required walkthrough

Discover the actual Architect endpoint and trace it end to end:

1. client request construction;
2. request schema and identifiers sent;
3. server route validation and server-side source/unknown lookup or binding;
4. provider request construction;
5. response schema;
6. client-side response identity check;
7. proposal staging, retry, and application behavior.

Do not assume the endpoint is named /api/architect; discover the active route.

Useful searches:

    rg -n -i "architect|sourceId|unknownId|baseRevision|draftRevision|proposal" src server test tests . --glob '!node_modules/**' --glob '!dist/**'
    rg -n -i "api/.*architect|fetch\\(|axios|retry|staged" src server test tests . --glob '!node_modules/**' --glob '!dist/**'

### Required findings

Answer each item explicitly:

| Guarantee | Evidence required |
| --- | --- |
| Request identity | Exact source, unknown, and revision identifiers submitted by the client. |
| Server independence | How the server verifies that an identifier belongs to the active source and unresolved item, rather than simply echoing client-provided text. |
| Stale protection | What happens when the draft or source revision no longer matches. |
| Response binding | Which response identifiers the client verifies before staging or applying a proposal. |
| Fail closed | What happens for unknown, mismatched, malformed, or unsupported responses. |
| User reachability | Whether an existing test or source path proves the retry, dismissal, and application controls are reachable without manually calling the provider. |

Client-only validation does not satisfy Server independence. If the current architecture has no server-held source ledger, say so plainly and identify whether an alternate authenticated/bound contract provides equivalent assurance.

Run only an existing narrow server or client test that actually exercises identity mismatch or fail-closed behavior. Do not use the live Architect chat or provider endpoint.

## Decision gate

Packet 00 may close without a code change only when every material guarantee is either:

- Proven live; or
- documented as an Architectural replacement that demonstrably preserves the relevant guarantee.

If a behavior appears implemented but lacks a focused test, Packet 00 does not authorize writing that test. Record the smallest test-only follow-up packet that would turn the claim into proof.

If a residual defect exists, do not design or execute a broad solution. Recommend only the smallest corrective packet needed to restore the broken boundary. Do not consume Packet 09’s number or scope.

The legacy Starting Conditions UI and general Architect-chat usefulness are explicitly outside this packet. Record them only if the audit proves they are directly causing one of the four boundaries above to fail.

## Completion report

Return one concise evidence report with these exact sections:

1. **Baseline**
   - start and end HEAD;
   - start and end git status;
   - result of both ancestry checks;
   - confirmation that no files changed and no commit or push was created.

2. **Audit A — Canonical turn commitment**
   - active human and Autopilot call chains;
   - authoritative write location;
   - revision/idempotency/atomicity/checkpoint findings;
   - focused test evidence or missing proof.

3. **Audit B — Failure safety and observability**
   - failure-path table from server to client to export;
   - raw-error exposure findings;
   - failure receipt or equivalent finding;
   - focused test evidence or missing proof.

4. **Audit C — Forge provenance**
   - complete source-mutation provenance table;
   - clear separation between manual authoring and source-derived writes;
   - focused test evidence or missing proof.

5. **Audit D — Architect identity**
   - request/server/response binding call chain;
   - server independence and fail-closed finding;
   - focused test evidence or missing proof.

6. **Verdict**
   - one classification for each of the four questions;
   - exact residual defect or proof gap, if any;
   - smallest recommended follow-up packet, if any;
   - explicit statement that Packet 09 remains untouched.

Do not include speculative refactor plans, code patches, or a celebratory status summary. This is evidence for the next decision.

## Human QA

None for Packet 00. It changes no behavior and must not make a live provider call.

If a future corrective packet is required, its Human QA must be written separately from this audit after the code-level truth is established.
