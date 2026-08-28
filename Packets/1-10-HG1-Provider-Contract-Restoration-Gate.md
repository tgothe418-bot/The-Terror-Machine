# 1-10 HG1 Provider Contract Restoration Gate

**Series:** TTM Horror Grammar 1 — Emergency Provider Closure

**Execution packet:** 1-10 of 1-10

**Depends on:** Horror Grammar 1 Packets 1-1 through 1-9

**Expected baseline:** `229f9e1c0f550cdf57fa1b11521456fea2bf8f33`

**Priority:** Critical — complete this packet before Forge remediation, UI work, pruning, CI, Director expansion, or any new capability

**Scope:** Restore the existing HG1 proposal contracts at the real Gemini structured-output boundary and prove that non-empty proposals reach the existing deterministic ratifiers. Do not redesign Horror Grammar 1.

## Governing invariant

> The model proposes. The machine decides. A proposal contract that the real provider cannot emit is not an implemented contract.

The live turn must remain one structured generation. Gemini may propose bounded HG1 activity, pressure, value, pursuit, development, and pressure-thread changes. Existing server ratifiers alone decide what becomes canonical. Rejected, malformed, missing, or provider-blocked material must never become fiction or state.

## Why this is an emergency gate

At the expected baseline, the application has two incompatible turn contracts:

1. `server/routes/turn.ts` calls:

   ```ts
   generateStructuredResponse(prompt, TurnResultSchema)
   ```

2. `generateStructuredResponse()` accepts that Zod schema but always sends the separate hardcoded `turnResponseSchema` to Gemini.

3. The hardcoded Gemini schema does not declare or require these six canonical HG1 fields:

   - `cast_activity_proposal`
   - `situated_pressure_proposal`
   - `value_state_proposal`
   - `character_pursuit_proposal`
   - `character_development_proposal`
   - `pressure_transition_proposal`

4. `TurnResultSchema` marks all six fields optional and supplies neutral defaults. Their absence is therefore transformed into `NONE`, `changes: []`, or `transitions: []` instead of being reported as provider-contract failure.

5. Existing route tests mock `generateStructuredResponse()` with objects the real provider schema cannot produce. The current provider-alignment fixture also omits the six fields and passes because Zod manufactures the defaults.

6. The prompt currently gives explicit generation contracts for cast activity and situated pressure, but not for value state, character pursuit, character development, or pressure-thread transition. The bounded prompt projection likewise omits material current-state data those four proposals need.

The result is a green, internally consistent pipeline whose HG1 ratifiers can remain permanently starved in production.

## Start gate

Before editing:

1. Confirm the exact revision:

   ```bash
   git rev-parse HEAD
   git status --short
   ```

2. Stop and report if `HEAD` is not exactly `229f9e1c0f550cdf57fa1b11521456fea2bf8f33`, or if unrelated working-tree changes overlap any scoped file.

3. Read the actual current owners before changing them:

   - `server/utils/aiClient.ts`
   - `server/utils/aiClient.test.ts`
   - `server/routes/turn.ts`
   - `server/routes/turn.horrorGrammar1.test.ts`
   - `src/types/engineContract.ts`
   - `src/types/horrorGrammar.ts`
   - `src/lib/ratificationPipeline.horrorGrammar1.test.ts`
   - `Packets/1-3-Validated-Non-User-Initiative-and-Situated-Pressure.md`
   - `Packets/1-4-Causal-Value-Pursuit-and-Character-Evolution.md`
   - `Packets/1-9-HG1-Integrated-Closure-and-Stabilization.md`

4. Reproduce the defect with a focused failing test before implementing the repair. The test must prove both facts:

   - the Gemini schema currently lacks the six root properties; and
   - deleting any of the six fields from an otherwise valid provider response currently succeeds because of Zod defaults.

Do not change gameplay behavior until that reproduction exists.

## Permanent invariants

All implementation choices in this packet must preserve these rules:

- One User action causes exactly one structured model generation.
- No second HG1 call, background simulation loop, retry generation, or parallel horror engine may be added.
- Provider output is proposal material, never canonical state.
- Existing server ratifiers remain authoritative for eligibility, evidence, causality, perception, source, and state mutation.
- Missing HG1 fields are contract violations. They are not neutral proposals.
- Neutral behavior remains valid only when the provider explicitly emits the appropriate `NONE`, empty `changes`, or empty `transitions` envelope.
- Failed parsing or validation preserves the complete canonical pre-state.
- Rejected manifestation text remains excluded from ordinary narrative, memory, World Memory, later prompts, and canonical ledgers.
- Provider refusal and empty-provider failure remain fail-closed and cannot advance fictional time or commit HG1 state.
- The User-controlled character cannot receive autonomous activity, pursuit evolution, development, or imposed choices.
- Prompt projection remains bounded and contains canonical state only. It must exclude raw provider payloads, rejected proposal text, forensic UI state, abandoned Retake material, stacks, credentials, endpoints, and internal diagnostics.
- Existing Blueprint neutrality and Director behavior remain unchanged.

## 1. Establish one explicit paired provider contract

Repair the misleading split between the Gemini schema and the Zod parser.

Create one named Engine-turn structured-response contract that pairs:

- the exact Gemini `Schema` object sent as `responseSchema`; and
- the exact Zod schema used to parse the returned JSON.

`generateStructuredResponse()` must receive or own that pair as one contract. It must pass the selected contract's Gemini schema to `generateContent()` and the same contract's Zod schema to `parseStructuredTurnResponse()`.

Acceptable implementation shapes include:

- a typed `StructuredResponseContract<T>` object passed to `generateStructuredResponse()`; or
- an Engine-turn-specific generator whose only valid contract is the paired Engine-turn contract.

Do not retain an API where a caller passes one schema while the function silently sends another hardcoded schema. Do not use `as unknown as`, broad `any`, or a permissive record cast to force the pair to type-check.

Keep the installed `@google/genai` version and current model policy unchanged in this emergency packet. Do not combine this correction with an SDK or model migration.

## 2. Make all six HG1 envelopes explicit and required

At the provider-ingress schema, require these exact six root fields on every successful Engine turn:

| Field | Canonical schema | Explicit neutral form |
|---|---|---|
| `cast_activity_proposal` | `CastActivityProposalSchema` | `{ kind: 'NONE', reason?: string }` |
| `situated_pressure_proposal` | `SituatedPressureProposalSchema` | `{ kind: 'NONE', reason?: string }` |
| `value_state_proposal` | `ValueStateProposalSchema` | `{ changes: [] }` |
| `character_pursuit_proposal` | `CharacterPursuitProposalSchema` | `{ changes: [] }` |
| `character_development_proposal` | `CharacterDevelopmentProposalSchema` | `{ changes: [] }` |
| `pressure_transition_proposal` | `PressureThreadTransitionProposalSchema` | `{ transitions: [] }` |

Remove the six `.optional().default(...)` fallbacks from the schema used to parse live provider output. Update test fixtures to emit explicit neutral envelopes when they have no proposal.

If another non-provider consumer demonstrably needs compatibility normalization, keep that normalization outside the live provider-ingress schema and name it explicitly. It must not be reachable from `/api/turn` provider parsing.

The Gemini schema must mirror the existing Zod contracts, including:

- discriminants and exact enum values;
- required versus nullable versus optional fields;
- maximum array counts;
- string bounds;
- numeric types and bounds; and
- manifestation-block alternatives.

Do not broaden an enum, relax a bound, or convert a required causal/evidence field into free text merely to satisfy the provider schema.

While auditing this boundary, repair any directly observed provider/Zod type mismatch inside the existing Engine-turn schema. In particular, verify that relationship deltas are provider-visible numeric `-1 | 1`, not string enum values. Keep such repairs confined to the provider contract and its tests.

## 3. Add a provider-contract soundness gate

Replace the current partial “provider alignment” claim with a test that checks the contract the SDK actually receives.

The gate must prove:

1. The provider schema root declares every live `TurnResultSchema` field needed by `/api/turn`.
2. Its root `required` list includes all six HG1 fields.
3. Each explicit neutral envelope parses successfully.
4. At least one valid active variant for every HG1 field parses successfully.
5. Removing any one HG1 field from an otherwise valid response fails at provider ingress.
6. Invalid discriminants, enum values, causal fields, array overflows, and manifestation shapes fail.
7. Every value permitted by the hand-authored Gemini fixtures is accepted by the paired Zod schema without coercion.
8. `generateStructuredResponse()` passes the paired contract's `responseSchema` into the SDK call; it does not fall back to a module-global schema.

The test may use a small typed schema-inspection helper, but that helper must not become a second runtime schema owner. If a hand-authored Gemini schema remains necessary because the SDK supports only a JSON-Schema subset, the Zod schema is still the application authority and the soundness test is the permanent drift alarm.

Do not claim automatic schema derivation unless the exact schema passed to the installed SDK is generated from the canonical Zod owner and the focused test proves that the generated form supports all six HG1 unions. A partial or lossy converter is not a repair.

## 4. Complete the bounded HG1 prompt contract

Adding provider properties alone is insufficient. The one generation must receive enough canonical information to make valid proposals without inventing IDs or causes.

Extend the existing HG1 prompt section with a bounded, deterministic projection of only the material current state needed by the six proposal contracts:

- fictional-time revisions;
- eligible present and offscreen opportunities;
- relevant authored value anchors;
- current value-state records for those anchors;
- current non-User pursuit overlays for eligible/relevant pursuits;
- current non-User development facts needed for comparison;
- active pressure threads eligible for transition;
- exact available evidence/source references; and
- the closed causal references that proposals may cite on this turn.

Reuse existing canonical state and evidence owners. Do not introduce a parallel prompt-only ledger. Apply explicit caps and deterministic ordering before string formatting. Do not dump the entire store or unbounded history.

Add concise prompt contracts for all six fields. The four currently absent contracts must state at minimum:

### `value_state_proposal`

- It proposes bounded changes to existing reviewed value anchors only.
- It must use exact anchor IDs, allowed operations and conditions, and a valid cause reference.
- It must not declare the worst outcome merely because pressure was proposed.
- It emits `changes: []` when no causally supported material change occurred.

### `character_pursuit_proposal`

- It proposes bounded overlays for exact existing non-User pursuits only.
- It must use exact pursuit IDs, valid operations, and a valid cause reference.
- It cannot create a new objective for the User-controlled character or reinterpret the User's aim.
- It emits `changes: []` when no supported pursuit change occurred.

### `character_development_proposal`

- It proposes bounded facts for non-User characters only.
- It requires an observable/canonical cause and must not infer hidden thoughts, unobserved motives, or personality changes from atmosphere alone.
- It cannot target the User-controlled character.
- It emits `changes: []` when no supported development occurred.

### `pressure_transition_proposal`

- It may target an exact active pressure-thread ID only.
- It must use an allowed terminal transition and a valid cause reference.
- It cannot resolve, realize, release, or transform a thread merely because the model wants narrative closure.
- It emits `transitions: []` when no supported transition occurred.

Retain the existing cast-activity and situated-pressure contracts and align their wording with the actual schemas. Do not prescribe a fixed horror cadence. Explicit neutral proposals remain valid on any turn.

## 5. Prove the real SDK-shaped boundary

Existing route tests mock above the defect. Add a production-shaped test below that mock seam.

Stub only the external `@google/genai` SDK call. Run the actual:

```text
/api/turn
  -> Engine-turn structured-response contract
  -> generateStructuredResponse()
  -> SDK generateContent() configuration
  -> provider response classification
  -> JSON parsing and required Zod validation
  -> existing HG1 ratifiers
  -> typed receipts and bounded narrative composition
```

The stub must capture the exact `generateContent()` request and return provider-shaped JSON. It must not mock `generateStructuredResponse()`, inject a pre-parsed `TurnResult`, call ratifiers directly, or manually write canonical post-state.

Use at least two focused production-shaped cases:

### Case A — Accepted initiative and pressure

Return:

- one eligible non-User `ACTIVITY` proposal with an isolated manifestation;
- one evidence-valid `PRESSURE` proposal with an isolated manifestation; and
- explicit neutral envelopes for value, pursuit, development, and pressure transition when those changes are not causally supported in the fixture.

Prove that:

- the SDK request contains both complete schema definitions and requires all six fields;
- the parsed response retains the non-`NONE` proposals;
- the existing ratifiers accept them only when eligibility/evidence/perception rules pass;
- accepted manifestations are appended in the established deterministic order; and
- the resulting receipts and post-state carry the accepted event and pressure thread.

### Case B — Causal state evolution

Use a typed pre-state containing an existing value record, non-User pursuit, development ledger, and active pressure thread. Return valid bounded proposals for the four causal fields with exact IDs and accepted cause references.

Prove that:

- value, pursuit, development, and pressure-transition proposals survive provider parsing;
- each existing ratifier independently accepts or rejects its own proposal;
- accepted receipts contain the expected pre-state and post-state;
- the selected character's User sovereignty is preserved; and
- the next typed HG1 state is produced through the normal route response, not test-only mutation.

Do not require every proposal to be accepted merely to make the test impressive. Where a deliberately invalid proposal is used, assert the exact rejection and unchanged owning state.

## 6. Prove omission, rejection, refusal, and continuity

Add or strengthen focused tests for these failure boundaries:

### Missing field

Delete each of the six fields one at a time from otherwise valid provider JSON. Each response must fail required provider-ingress validation. It must not be normalized to neutral behavior, reach a ratifier as a fabricated empty proposal, or return a committed turn.

### Malformed proposal

Use an invalid discriminant, unknown ID, unsupported cause, ineligible User-character target, and over-limit list across representative proposals. Verify that structural invalidity fails at parsing and semantic invalidity is rejected by the existing ratifier. Neither may mutate its canonical owner.

### Rejected manifestation

Use unique sentinel text in invalid activity and pressure manifestations. Verify the text is absent from ordinary narrative, current memory, World Memory, next-turn prompt projection, and canonical state. It may appear only in the existing bounded forensic boundary when that boundary intentionally records the normalized rejected proposal.

### Provider refusal and empty response

Keep the existing refusal classifier and sanitized errors. Verify that refusal and empty response still produce no successful turn, no fictional-time advance, no HG1 post-state, and no invented neutral proposal.

### Consecutive turn

Drive the accepted post-state from Case A or B into the next real typed turn context. Verify that the relevant event, thread, value, pursuit, and development state remains present and is not replaced with baseline or empty ledgers.

## 7. Required test names

Add these exact test names, splitting them between the most appropriate focused files:

```text
provider schema declares and requires the complete HG1 proposal envelope
provider ingress rejects omission of every HG1 proposal field instead of manufacturing neutral defaults
generateStructuredResponse sends the paired provider schema selected by its contract
production-shaped provider output carries accepted HG1 activity and pressure through their real ratifiers
production-shaped provider output carries causal HG1 proposals through their real ratifiers
explicit HG1 neutral envelopes preserve existing canonical state without implying provider omission
rejected HG1 manifestation text remains outside fiction memory prompts and canonical state
provider refusal and empty response create no HG1 proposal or canonical advance
accepted HG1 provider output becomes the exact bounded pre-state of the next turn
```

Update existing provider fixtures so every successful response explicitly includes all six HG1 fields. Do not create a shared fixture that silently adds the fields after the test response is constructed; omission tests must be able to observe the raw boundary honestly.

## 8. Type and quality gate

The current baseline has nine known TypeScript errors introduced outside this HG1 boundary. Do not let them hide new errors from this packet.

After the HG1 focused proof passes:

1. Run `npx tsc --noEmit` and distinguish all pre-existing errors from any new HG1 error.
2. Repair every HG1-related type error without broad casts or suppressions.
3. Repair the nine already-known baseline errors only when the correction is mechanical and semantics-preserving, such as completing a typed fixture or supplying an already-defined nullable field.
4. If any baseline error requires a Forge design decision or changes canonical behavior, stop and report that exact blocker rather than expanding this packet.
5. Do not report the global type gate as green unless the command actually exits successfully.

No `@ts-ignore`, `@ts-expect-error`, weakened Zod schema, permissive `any`, or skipped test may be introduced to satisfy the gate.

## Focused verification gate

During implementation, run one focused group after the schema/generator repair and one focused group after the route proof is complete:

```bash
npx vitest run server/utils/aiClient.test.ts src/types/horrorGrammar.test.ts
```

```bash
npx vitest run server/utils/aiClient.test.ts server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/lib/turnResponseReader.test.ts
```

Include any new focused provider-contract test file in both relevant commands.

Then run the final stabilization gate once:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
barred_first='eve''lyn'
barred_family='van''ce'
barred_other='thor''ne'
rg -n -i "${barred_first}[[:space:]]+${barred_family}|${barred_other}" --glob '!node_modules/**' --glob '!dist/**' .
```

Do not repeatedly rerun the full suite while implementing. Fix focused failures at their owner, rerun the focused group, then execute the broad gate once.

## Provider proof

The automated SDK-seam test is mandatory and must run without a paid call.

If the normal execution environment already has its ordinary configured Gemini credential, perform one bounded live contract probe through the same Engine-turn generator after all automated gates pass. The probe must:

- make exactly one generation call;
- use a compact fictional fixture with no uploaded or private source material;
- require explicit presence of all six HG1 fields;
- parse with the production provider-ingress schema;
- avoid publishing any application state; and
- record only whether the schema was accepted and all six fields were returned.

Do not add a production endpoint, persistent credential path, or permanent debug UI for this probe. If the normal credential is unavailable, report `LIVE_PROVIDER_PROOF_PENDING` and do not describe the real Gemini boundary as independently proven. The mocked SDK-seam and all deterministic gates must still pass.

## Explicit non-goals

Do not:

- redesign the ratifiers or add new Horror Grammar mechanics;
- start Horror Grammar 2;
- repair Forge import, Depiction Contract, placement, export, or Engine Setup behavior;
- implement the intro redesign;
- add timeouts, retries, rate-limit changes, CI, accessibility work, or path-hardening in this packet;
- prune legacy code or split large files;
- change model selection, thinking policy, safety handling, or the installed Gemini SDK;
- add a second model call, autonomous full-cast loop, hidden cadence, visible stat system, or User-choice generator;
- weaken schemas for backward compatibility at the live provider boundary; or
- claim success from mocked ratifier payloads that bypass the SDK-shaped schema path.

## Stop conditions

Stop and report the exact owner instead of widening scope if:

- the baseline revision differs;
- the installed Gemini SDK cannot express one of the canonical HG1 unions without weakening it;
- a valid provider schema would exceed a documented provider limit;
- making the six fields required breaks a persisted public contract rather than an ephemeral provider response;
- the production-shaped test reveals a canonical mutation before ratification;
- rejected text enters narrative, memory, prompt, or state;
- provider refusal advances state;
- User-authored action or intent is generated or mutated by HG1; or
- a fix would require a second generation or parallel state owner.

Do not substitute neutral defaults, permissive parsing, test-only wiring, or a narrower claim of completion for any stop condition.

## Acceptance gate

Packet 1-10 is complete only when all of the following are true:

- one paired contract owns the Gemini schema and Zod parser used by `/api/turn`;
- `generateStructuredResponse()` demonstrably sends that selected Gemini schema;
- all six HG1 fields are present in the provider schema and root required list;
- all six are required at provider ingress with no silent neutral defaults;
- explicit neutral envelopes remain supported;
- all six active proposal forms survive the SDK-shaped boundary and reach their existing ratifiers;
- the prompt exposes bounded canonical context and an explicit contract for every proposal field;
- structural failure, semantic rejection, provider refusal, and empty response remain fail-closed;
- rejected manifestation material stays outside fiction and canonical state;
- accepted post-state reaches the next turn without reset;
- the focused and full Vitest gates pass;
- TypeScript, lint, build, and `git diff --check` are honestly reported;
- the prohibited-name scan is clean; and
- no non-goal work was started.

If the live provider probe could not run, the code repair may be reported as automated-gate complete, but final production-provider closure remains `LIVE_PROVIDER_PROOF_PENDING`.

## Final completion report

Return one consolidated **HG1 Provider Contract Restoration** report containing:

1. start revision, end revision, and working-tree status;
2. exact files changed and why;
3. the single paired schema owner and the final generator call shape;
4. the six required HG1 fields and their explicit neutral forms;
5. evidence that omission now fails rather than defaulting;
6. evidence that the SDK request contains the complete schema;
7. accepted and rejected production-shaped route evidence;
8. prompt projection bounds and the four newly explicit causal contracts;
9. refusal, empty-response, rejected-text, and consecutive-turn results;
10. focused and broad command results with exact file/test counts;
11. the exact TypeScript result, including any honestly unresolved inherited error;
12. live provider probe result or the exact `LIVE_PROVIDER_PROOF_PENDING` status;
13. any remaining critical defect affecting canon, User sovereignty, recovery, or provider containment; and
14. confirmation that Forge, UI, pruning, CI, Director, and Horror Grammar 2 work were not started.

Do not call HG1 production-provider behavior restored unless the evidence above is present. If a critical seam remains open, identify its exact owner and stop there.
