# TTM Horror Grammar 0 - User Sovereignty and Foundation Boundary Integrity

**Series:** TTM Horror Grammar  
**Update:** 0 of 16  
**Depends on:** None  
**Expected baseline:** `4a13162d819ee98475f5782035d83619f5279965`  
**Expected remote:** `origin/main` at `4a13162d819ee98475f5782035d83619f5279965`  
**Reference workspace tree:** `bb38d3510223436908a3f2d944dcdccf4d076bab`

## Governing Principle

> **TTM can be hostile to a character, but never the User.**

Retake, Restart, exit, recovery, and diagnostic controls exist outside the fiction. A Retake replaces the most recent canonical turn from its preceding checkpoint. A complete Restart initializes a new session. Neither operation is a diegetic event, and neither may be detected, remembered, or exploited by the Engine or narrator.

## Objective

Close the foundation defects and proof gaps recorded by Truth Check 0 in one consolidated update so later horror-grammar work rests on trustworthy canonical boundaries.

Throughout this packet, **commit** means an Engine canonical-state transaction. It does not mean a Git commit and does not authorize any Git operation.

This update covers only:

1. canonical turn atomicity and Retake checkpoint integrity;
2. abandoned-turn isolation and Restart separation;
3. provider-error sanitization and safe failure evidence;
4. Forge source-candidate provenance proof;
5. independently verifiable Architect request identity binding.

Do not begin Horror Grammar 1 in this update.

## Start Gate

Before editing:

1. Verify `HEAD` and `origin/main` equal the expected baseline above.
2. Verify tracked files are clean.
3. Preserve the pre-existing untracked `Packets/` reference files exactly as found.
4. Inspect the active implementations and tests before choosing the smallest compatible change.
5. If the tracked baseline differs, stop and report the exact SHA and status. Do not adapt this packet to an unknown baseline.

Truth Check line references are evidence pointers, not permission to edit blindly. Follow the active call paths at the verified baseline.

## 0.1 Canonical Commit Must Be Prepared Before Mutation

Truth Check identified canonical simulation facts being applied after `TURN_COMMITTED` through multiple imperative `useEngineStore.getState().patchGameState(...)` calls in `src/components/engine/Runtime.tsx`.

Required outcome:

- Build and validate the complete post-turn application state and complete post-turn situated game state before mutating either canonical owner.
- Route the accepted result through one named canonical commit coordinator.
- Apply no receipt category through separate post-commit patch calls.
- Use at most one prepared write per canonical store; do not merge the two Zustand stores or create a third canonical store merely for this packet.
- Prevent subscribers, prompt construction, presentation projection, Retake capture, or telemetry from observing an intermediate receipt-by-receipt state.
- Capture the complete pre-turn application state and complete pre-turn situated game state in the checkpoint before commit.
- Run presentation projection only after the canonical commit succeeds. Presentation code may not own or repair canonical facts.
- If preparation or validation fails, mutate neither canonical store and produce the bounded failure path.

The accepted transaction must cover every currently canonical receipt domain, including topology, inventory, injuries, psychological status, stance, relationships, character memory, World Memory, continuity, and presence.

Do not solve this by hiding the existing patch calls behind a renamed loop. The post-state must be prepared as a whole.

## 0.2 Failed Turns Must Preserve the Last Successful Checkpoint

Truth Check identified `TURN_FAILED` overwriting `lastTurnCheckpoint` in `src/core/engine/reducer.ts`.

Required outcome:

- `TURN_FAILED` may append bounded failure evidence but must preserve the existing `state.lastTurnCheckpoint` unchanged.
- A failed attempt after a successful turn must not destroy the User's ability to Retake that preceding successful turn.
- Failure must preserve all canonical application and situated game state.
- Repeated failures must not gradually replace, mutate, or invalidate the last successful checkpoint.

## 0.3 Retake Is Canonical Turn Replacement

Required behavior:

- Retake is available whenever a completed canonical turn has a valid preceding checkpoint, including after terminal outcomes and after a later failed attempt.
- Retake restores both canonical stores from the same checkpoint.
- The abandoned committed turn contributes nothing to the replacement timeline: no story entry, active receipt, topology delta, inventory change, injury, psychological change, stance change, relationship change, character memory, World Memory, continuity change, presence change, terminal state, or prompt context.
- The replacement action begins from the restored checkpoint with fresh turn provenance.
- The Engine and narrator receive no signal that a Retake occurred.
- A Retake is not a diegetic reversion. A scenario may reverse or reset fictional reality, but such an accepted fictional event remains canonical and may leave memories, evidence, and consequences.

### Quarantined developer diagnostics

A diagnostic record of the abandoned turn may be retained only in a developer-owned diagnostic collection that is structurally separate from active simulation history.

It must be explicitly marked `ABANDONED_BY_RETAKE` or an equivalently unambiguous internal status and must never be projected into:

- a provider prompt or turn request;
- active canonical state;
- player-facing narrative, transcript, or system message;
- the replacement turn's receipt or telemetry projection;
- character memory or World Memory;
- the ordinary Markdown or HTML session export.

If the existing architecture cannot prove this separation cheaply, prefer not retaining the abandoned diagnostic record. Diagnostic convenience cannot weaken User sovereignty.

## 0.4 Restart Is New Session Initialization

Required behavior:

- A complete session Restart initializes a fresh active session.
- No prior session receipt, history entry, memory, consequence, topology mutation, character state, terminal state, or abandoned-turn diagnostic may enter the new session or its prompts.
- Restart is not an event inside the fiction and cannot be referenced by the narrator or cast.
- Restart must not delete or modify repository files, Git history, source Blueprints, API credentials, or unrelated browser-origin data.
- Preserve the existing narrower contract of Clear System Memory unless its current behavior directly violates these session-isolation requirements.

## 0.5 Provider Failures Must Be Generic Outside the Server Boundary

Truth Check identified direct forwarding of `modelErr.message` from `server/routes/turn.ts` and permissive acceptance of upstream error messages in `src/lib/turnResponseReader.ts`.

Required outcome:

- Map provider and network exceptions to a small allowlisted set of safe application error codes and bounded generic messages.
- Never return raw provider exception messages, SDK text, endpoint URLs, request bodies, model output, prompts, stack traces, credentials, or internal identifiers in the HTTP payload.
- The client reader must select the safe message from the trusted application error code. It must not treat an arbitrary server or provider `message` as player-safe merely because it contains no HTML.
- Player-facing UI, ordinary session exports, and normal telemetry must contain only the safe code, generic message, and already-approved bounded diagnostics.
- Server-only logging may retain development evidence only if it uses the project's existing safe logging practices and cannot be projected back to the client.

Add negative tests using unmistakably unsafe sentinel strings, including a fake endpoint URL, SDK detail, stack-like text, and credential-shaped material. Prove none reaches the client receipt or export renderer.

## 0.6 Forge Source Data Must Cross a Reviewed Acceptance Boundary

Truth Check found the reviewed application flows implemented but the negative bypass proof incomplete because `updateDraft` and `replaceDraft` remain general mutation endpoints.

Required outcome:

- Preserve direct manual authoring through the existing typed draft-editing actions.
- Preserve the existing single canonical `forgeDraft`; do not create a parallel source-derived draft.
- Ensure raw extraction results, unreviewed candidates, unresolved Architect output, and unapplied Depiction Contract proposals cannot invoke general draft mutation endpoints as a shortcut.
- Source candidates may alter `forgeDraft` only through their explicit reviewed application action.
- Architect resolutions may alter `forgeDraft` only after identity validation, explicit creator acceptance, staleness checks, and transactional patch validation.
- Depiction Contract proposals may alter `forgeDraft` only after explicit Apply and revision validation.
- Rejected, dismissed, malformed, mismatched, or stale proposals must leave the draft and its revisions unchanged.

Add negative call-path tests. Do not attempt to prohibit legitimate manual creator editing merely because the general authoring actions remain available.

## 0.7 Architect Requests Need Server-Verifiable Identity

Truth Check found response-echo validation but no independent server-held proof that the submitted source and unknown identifiers belong to the active source-review context.

Required outcome:

- Bind each Architect request to an authentic active source analysis and unresolved unknown through evidence the server can verify independently of the request's bare `sourceId` and `unknownId` strings.
- Reuse an existing server-established session, source-analysis record, nonce, or signed binding if one already exists.
- If no suitable binding exists, add the smallest bounded mechanism compatible with the current local/private deployment. Do not introduce a new external service, account system, database, or secret derived from the Gemini API key.
- Define the binding lifecycle across source registration, request, follow-up, acceptance, dismissal, source removal, session replacement, and server restart.
- Fail closed on missing, expired, mismatched, replayed where relevant, or unknown bindings.
- A failed binding check must not store the creator's submitted answer, advance the unknown, stage a proposal, or mutate `forgeDraft`.
- Continue validating that the model response identifiers match the independently verified active request.

If independent request binding cannot be implemented without a new persistent secret or a broad persistence redesign, stop this subsection and report the exact constraint. Do not pretend client-echo validation satisfies it.

## 0.8 Required Verification

Add or update focused tests proving at minimum:

### Atomic commit and checkpointing

- every canonical receipt domain is present in the single prepared post-state;
- no canonical mutation occurs before complete validation;
- no receipt-specific `patchGameState` sequence remains after commit;
- `TURN_FAILED` preserves the prior `lastTurnCheckpoint` by identity and value;
- repeated failures preserve the same successful checkpoint;
- failure after success still permits Retake of that successful turn.

### Retake and Restart isolation

- Retake restores both canonical stores completely;
- abandoned state cannot enter the next prompt or next receipt;
- abandoned narrative and ordinary export output disappear from the replacement timeline;
- quarantined diagnostics, if retained, cannot enter any output projection;
- terminal outcomes remain retakeable;
- Restart creates a new session without prior canonical or diagnostic projection.

### Failure sanitization

- unsafe provider sentinel content does not survive the server payload;
- arbitrary server messages do not become client failure messages;
- UI receipts and Markdown/HTML exports contain only allowlisted safe evidence.

### Forge and Architect boundaries

- unreviewed source material cannot bypass reviewed application actions;
- rejected, stale, malformed, or mismatched proposals perform zero draft mutations;
- missing or invalid Architect binding fails before storing the creator answer;
- a valid binding supports the intended follow-up and accepted-resolution lifecycle exactly once.

Run the relevant existing suites, including the active equivalents of:

```bash
npx vitest run src/core/engine/reducer.test.ts src/store/useAppStore.test.ts src/components/engine/Runtime.retake.test.tsx
npx vitest run server/routes/turn.test.ts src/lib/turnResponseReader.test.ts src/lib/download.test.ts
npx vitest run src/store/useForgeStore.test.ts src/components/forge/ScenarioBaselinePanel.test.tsx src/components/forge/ArchitectChat.test.tsx server/routes/forge.test.ts
npx tsc --noEmit
npm run lint
npm run build
```

After the focused suites pass, run the full automated test suite once. Classify any failure as introduced, exposed, or pre-existing with exact evidence. Do not weaken assertions or delete tests to obtain a green result.

## 0.9 Explicit Non-Goals

Do not implement:

- Horror Grammar 1-16;
- a new global horror state machine;
- a new persistence service or external database;
- a repository, branch, or Git-history deletion;
- a general UI redesign;
- a new content-rating system;
- campaign continuity;
- provider migration;
- unrelated Forge features;
- repository synchronization automation.

Do not convert the four Truth Check areas into separate implementation packets. This update owns the consolidated decision and evidence.

## 0.10 Completion Report

Return one normal completion report containing:

1. start and end HEAD plus tracked workspace status;
2. the exact files changed and why;
3. the canonical commit design and proof that receipt-specific post-patching is gone;
4. checkpoint, Retake, Restart, and abandoned-diagnostic behavior;
5. the provider error-code and safe-message mapping;
6. the Forge negative bypass proof;
7. the Architect binding mechanism and lifecycle;
8. focused and full test results with run counts;
9. TypeScript, lint, build, and diff-check results;
10. any residual defect or explicit blocker;
11. confirmation that Horror Grammar 1 was not started.

Do not propose additional instruction packets from this report. Report unresolved evidence directly for the next consolidated decision.
