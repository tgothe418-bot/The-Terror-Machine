# The Terror Machine — Forge 1C-1
## Architect Answer Path and Identity Recovery

### Implementation baseline

Begin from GitHub `main` at:

`db201be279d02d84bf46ba3fb5f7d570fc20f176`

If the working baseline differs, inspect the delta before implementation. Stop and report if later changes already alter the Architect request union, source-binding registry, ambiguity state machine, canonical `forgeDraft`, or export-readiness contract in a way that conflicts with this packet.

This packet is cumulative with the existing Forge 1A/1B and Horror Grammar 1 work. Preserve the implemented systems; repair their active connection points.

---

## Objective

Restore a reliable conversational correction path between the Forge and Architect.

A valid user answer to a source question must:

1. pass the client/server request boundary;
2. reach the model with bounded source and draft context;
3. return as a typed follow-up or typed proposal;
4. remain isolated from canonical authoring state until explicitly accepted; and
5. remain retryable after a recoverable transport, binding, provider, parsing, or response-contract failure.

The observed production failure is reachable in the current code. `ArchitectChat.tsx` includes the complete rich cast objects in `draftContext.cast`, while `ArchitectDraftContextSchema` accepts a strict narrower cast object. Ordinary source-derived properties such as goals, traits, entity status, starting location, vulnerability, or expression data can therefore produce an HTTP 400 before the Architect evaluates the user's correction. The current retry controls do not provide one coherent recovery state machine.

---

## Scope

Primary owners include:

- `src/components/forge/ArchitectChat.tsx`
- `src/components/forge/ArchitectChat.test.tsx`
- `src/components/forge/architectProposalIsolation.test.ts`
- `src/store/useForgeStore.ts`
- `src/store/useForgeStore.test.ts`
- `src/types/forge.ts`
- `server/schemas/index.ts`
- `server/routes/forge.ts`
- `server/routes/forge.test.ts`
- `src/lib/sourceBaseline.ts`
- `src/lib/sourceBaseline.test.ts`
- focused shared helpers introduced for typed request projection or response reading

Do not start authored-map work or opening-intent work in this packet.

---

## 1. One shared Architect protocol

Create one authoritative typed protocol for active Architect request and response shapes. Do not maintain a hand-written client payload that merely resembles the server schema.

The request union must continue to distinguish at least:

- `GENERAL_MESSAGE`
- `AMBIGUITY_RESOLUTION`
- `DEPICTION_CONTRACT_PROPOSAL`

The ambiguity request must carry:

- the exact current analysis identity;
- the server-issued source binding;
- the exact unknown identity;
- the user's current answer;
- the bounded follow-up ledger;
- a bounded source/evidence projection;
- a bounded canonical-draft projection;
- recent Architect history; and
- the draft and source-baseline revisions used to create the request.

Use a pure client-side request builder which produces the schema-exact payload. Parse or otherwise validate the built request at the client boundary before `fetch`. If local construction fails, return a typed local protocol failure and preserve all user state.

### Bounded draft projection

Do not post the complete Zustand store or unfiltered `forgeDraft`.

Define the fields the Architect actually needs and project them explicitly. The projection may include bounded forms of:

- scenario identity and premise;
- setting;
- environmental rules;
- accepted cast identity, descriptions, roles, source-grounded goals/traits, entity status, expression modes, and known opening placement;
- accepted ambiguity decisions;
- references;
- current topology summary; and
- authoring revisions.

The server schema and client mapper must agree exactly. Rich canonical cast data must not invalidate the request merely because the mapper failed to omit an unrelated field.

All arrays and strings must remain bounded. Never send raw reference documents, base64 payloads, the entire source analysis, runtime state, provider metadata, or secrets to the Architect request.

---

## 2. Correct identity ownership

The current code uses multiple related identifiers:

- `ForgeSourceAnalysis.id`
- `ForgeSourceRecord.id`
- `ForgeSourceUnknown.sourceId`
- server-issued `sourceBinding`
- unknown ID

Make these relationships explicit rather than relying on whichever string a caller happens to possess.

Requirements:

1. A client analysis record must retain its own ID and source-record ID without interchangeability.
2. The runtime binding map must be keyed and queried consistently by the canonical analysis ID.
3. A request must pair that analysis ID with the exact server-issued binding registered for it.
4. The server must resolve the authoritative source/unknown from the binding registry and reject a genuine mismatch fail-closed.
5. Client response validation must compare against the authoritative identities returned for this request, not an array index, filename, display label, or cast name.
6. Applying a resolution patch must target stable cast/node IDs. It must not fail because the source analysis generated one cast ID while a later candidate was applied under another.

Add deterministic source-to-draft ID reconciliation for dependent candidates and patch operations. Cast seed application must establish the canonical target ID before expression guidance, pursuits, placement, values, or later Architect patches are applied.

Do not solve this by loosening target validation or by searching for the first matching display name.

---

## 3. Architect answer state machine

Consolidate the overlapping local and persisted error paths into a clear state machine.

At minimum, support:

- ready/queued;
- submitting;
- follow-up required;
- proposal awaiting confirmation;
- recoverable failure with retained attempt;
- resolved;
- contextual discretion; and
- terminal source-binding loss requiring reattachment or authoritative re-registration.

The exact UI labels may fit the existing Haunted Forge presentation, but the machine states must be typed and testable.

### Submission invariants

- Record the exact user's answer in the visible chat immediately.
- Do not commit it as an ambiguity resolution until a valid response returns and the user explicitly accepts the resulting proposal.
- Disable duplicate submission while the same request is in flight.
- On any failure, preserve the exact answer, target analysis ID, unknown ID, and bounded request snapshot needed for retry.
- A failure must not increment canonical draft revision, source-baseline revision, apply a draft patch, close the server unknown, or advance the queue.
- A valid follow-up must preserve the prior answer and make the follow-up answerable.
- A valid resolution proposal must remain staged and editable until Apply.
- `CONTEXTUAL_DISCRETION` remains a valid creator decision. It is not an automatic substitute for a failed answer.

---

## 4. Functional retry behavior

There must be one retry action for the retained failed attempt. Clicking it must perform observable work.

For retryable errors, Retry must:

1. use the retained exact user answer and target identities;
2. rebuild or validate a fresh request from the current canonical draft/source revisions;
3. prevent concurrent duplicate retry;
4. invoke `/api/architect` again;
5. return to the appropriate follow-up/proposal state on success; and
6. leave the attempt available on another recoverable failure.

Classify at least:

- request-construction/schema failure;
- HTTP 400 protocol/identity failure;
- expired or missing source binding;
- provider refusal/failure;
- malformed or empty response;
- response identity mismatch; and
- invalid resolution patch.

An expired or lost authoritative source binding is not endlessly retryable. If the server cannot securely reconstruct it, retain all draft edits and display an explicit **Reattach source** recovery requirement. Do not label a no-op queue reset as Retry.

Provider refusal or metadata must never become Architect dialogue, source evidence, Blueprint content, or a user answer.

---

## 5. Correction semantics

The Architect must treat a user's correction as positive source-authoring input, not as an instruction to preserve uncertainty by default.

For example, when the user states that a referenced entity clearly possesses topology-altering authority in the supplied material, the Architect may:

- accept the clarification into a typed proposal with supporting evidence/provenance;
- ask a genuinely necessary bounded follow-up; or
- report that the provided evidence does not support the requested canonical effect.

It must not force the user to choose contextual ambiguity merely because the request protocol failed or a strict draft projection rejected valid cast fields.

No Architect result may directly edit `forgeDraft`. Existing Apply/Dismiss/Edit controls remain the only authoring authority.

---

## 6. General-message recovery

Bring `GENERAL_MESSAGE` up to the same minimum reliability standard:

- check `response.ok` before reading success JSON;
- safely handle non-JSON errors;
- validate the typed response union;
- retain the user's message on failure;
- provide functional retry; and
- stage any depiction or authoring proposal without direct canonical mutation.

Remove or route around obsolete client helpers that post incompatible legacy Architect shapes. There must be one active request path per protocol kind.

---

## 7. Focused verification gate

Add or update focused tests proving:

1. A rich real Forge cast projects into a valid `ArchitectRequestSchema` payload.
2. The exact previously failing answer path reaches the mocked Architect route instead of returning request validation 400.
3. Source-analysis ID, source-record ID, binding, and unknown ID remain correctly paired.
4. A source/cast identity mismatch rejects without partial candidate application.
5. HTTP failure preserves the exact answer and leaves draft/source revisions unchanged.
6. Malformed JSON and invalid response union preserve the attempt.
7. Retry performs a second request and succeeds without duplicate dialogue or duplicate draft mutation.
8. Expired binding produces an explicit reattachment/rebind state rather than an inert retry.
9. A valid proposal remains isolated until Apply.
10. Apply commits once; a repeated click is semantically idempotent.
11. Contextual discretion remains explicit and creator-controlled.
12. Provider refusal text/metadata never enters canonical authoring state.

Run only the affected Forge client, store, schema, source-baseline, and route suites. Do not run the full project suite in this packet.

---

## Out of scope

- Authored map schema or map visualization
- New opening goals or player aims
- Changes to HG1 activity/pressure ratifiers
- New narrative mechanics
- README or roadmap edits
- Broad styling redesign

---

## Completion report

Report in the normal final response:

- changed files and their responsibilities;
- final Architect request/response shapes;
- identity and retry state-machine behavior;
- focused commands and exact results;
- any residual defect or deferred issue; and
- confirmation that packets 1C-2 through 1C-4 were not started.
