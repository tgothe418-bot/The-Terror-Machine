# Packet 1-10B — Gemini Structured-Output Compatibility and Live Turn Admission Gate

**Status:** Ready for ATG execution

**Baseline:** 9c81d1bf0827f3585b211986d834f63cb0325615

**Severity:** P0 — no Engine scenario can initiate

## Proven defect

The real production-shaped Engine path now reaches Express correctly, but Gemini rejects the turn-generation request before producing content:

~~~text
POST /api/turn
HTTP 502 PROVIDER_FAILURE

ApiError:
  code: 400
  status: INVALID_ARGUMENT
  message: Request contains an invalid argument.

Origin:
  @google/genai Models.generateContent
  generateStructuredResponse
~~~

A direct live provider probe previously produced the same 400 response when the HG1 response schema was supplied. The Blueprint, Forge export, route registration, SPA fallback, and public error reader are not the cause.

## Required outcome

Make the existing single Gemini turn call acceptable to Gemini 3.7 Flash while retaining the complete canonical TurnResultSchema and all deterministic HG1 ratification rules.

The runtime remains:

~~~text
one User action
  -> one Gemini generation
  -> JSON parse
  -> authoritative TurnResultSchema parse
  -> deterministic ratifiers
  -> one atomic publication
~~~

## Non-negotiable boundaries

1. Keep GEMINI_MODEL_ID pinned to gemini-3.7-flash.
2. Keep exactly one provider generation per Engine turn.
3. All six HG1 proposal envelopes remain declared and required at the provider root:
   - cast_activity_proposal
   - situated_pressure_proposal
   - value_state_proposal
   - character_pursuit_proposal
   - character_development_proposal
   - pressure_transition_proposal
4. TurnResultSchema remains the canonical validation authority. Do not loosen it, replace strict objects with passthrough objects, restore defaults for omitted HG1 envelopes, or manufacture neutral envelopes after provider output.
5. Existing deterministic ratifiers remain authoritative. The model proposes; it does not write canonical HG1 state.
6. Do not fall back to responseMimeType-only JSON generation.
7. Do not retry a failed turn with a second schema, a second model call, or an unstructured request.
8. Do not introduce Qwen, Z.ai, OpenAI, provider selection, adapter infrastructure, BYOK changes, or model portability.
9. Do not modify Forge, Blueprint compilation, Engine UI, Voice, Director, telemetry, or unrelated runtime behavior.
10. Do not expose raw provider errors, prompts, responses, credentials, or schema payloads to the browser.

## Provider documentation boundary

Google documents structured output as a supported subset of JSON Schema and warns that very large or deeply nested schemas may be rejected. The supported core includes primitive types, objects with properties/required, arrays with items and numeric item limits, string enums, and numeric minimum/maximum constraints.

Primary references:

- https://ai.google.dev/gemini-api/docs/generate-content/structured-output
- https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md

The current TTM provider schema violates the intended separation of responsibilities by mixing:

- the legacy uppercase Type/Schema dialect with JSON-Schema-like keywords;
- undocumented string constraints such as minLength, maxLength, and pattern;
- stringified numeric constraints;
- integer fields carrying string enum members;
- nested anyOf unions for several discriminated variants;
- a large/deep projection that attempts to duplicate nearly every Zod invariant.

Zod must retain those detailed invariants. Gemini needs a smaller structural scaffold it accepts.

---

## Track A — Reproduce and isolate before changing runtime

### A1. Add an explicit provider-schema admission probe

**Add:** scripts/probeGeminiTurnContract.ts

This script is a developer verification tool, not a runtime fallback. It must:

1. Load dotenv/config.
2. Require GEMINI_API_KEY without printing it.
3. Import getAiClient, EngineTurnStructuredResponseContract, and the ENGINE_TURN model policy.
4. Make exactly one direct generateContent call using the same model, thinking configuration, response MIME type, and schema property used by production.
5. Use a short fixed prompt requesting an explicit neutral TurnResult payload containing all six HG1 envelopes.
6. Print only one bounded JSON result:

~~~ts
type ProbeResult =
  | {
      schemaAccepted: true;
      responseReceived: true;
      zodAccepted: true;
    }
  | {
      schemaAccepted: true;
      responseReceived: true;
      zodAccepted: false;
      failureClass: 'TURN_RESULT_VALIDATION';
    }
  | {
      schemaAccepted: false;
      responseReceived: false;
      zodAccepted: false;
      failureClass: 'PROVIDER_SCHEMA_REJECTED';
      providerStatus?: number;
    };
~~~

Never print the prompt, schema body, provider response body, API key, stack, or raw provider message.

### A2. Reproduce the baseline failure

Before implementation, run the probe against baseline 9c81d1b and record:

~~~text
schemaAccepted: false
failureClass: PROVIDER_SCHEMA_REJECTED
providerStatus: 400
~~~

Do not claim the fix without this before/after proof.

---

## Track B — Establish one Gemini JSON-schema owner

### B1. Move the provider projection out of aiClient

**Add:** server/ai/geminiTurnJsonSchema.ts

**Modify:** server/utils/aiClient.ts

Move the provider-only turn schema out of aiClient.ts. This is Gemini-specific isolation, not a general provider abstraction.

Define a local structural type rather than reusing the legacy SDK Schema type:

~~~ts
export type GeminiJsonSchema = {
  type?: string | readonly string[];
  description?: string;
  properties?: Readonly<Record<string, GeminiJsonSchema>>;
  required?: readonly string[];
  items?: GeminiJsonSchema;
  enum?: readonly (string | number | boolean)[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
};
~~~

Export:

~~~ts
export const geminiTurnResponseJsonSchema: GeminiJsonSchema;
~~~

The final object must use standard lowercase JSON Schema types and numeric constraint values.

### B2. Change the paired contract property deliberately

Change StructuredResponseContract from the ambiguous legacy field:

~~~ts
responseSchema: Schema;
~~~

to:

~~~ts
responseJsonSchema: GeminiJsonSchema;
~~~

Change EngineTurnStructuredResponseContract accordingly.

In generateStructuredResponse, the SDK request must be:

~~~ts
config: {
  thinkingConfig: {
    thinkingLevel: policy.thinkingLevel,
  },
  responseMimeType: 'application/json',
  responseJsonSchema: contract.responseJsonSchema,
}
~~~

The request must not include responseSchema.

Keep parseStructuredTurnResponse and contract.zodSchema unchanged as the post-provider authority.

### B3. Add a recursive provider-subset assertion

In geminiTurnJsonSchema.ts, export a pure validator:

~~~ts
export function assertGeminiJsonSchemaSubset(schema: unknown): void;
~~~

It must recursively fail on every key outside this exact allowlist:

~~~ts
const ALLOWED_SCHEMA_KEYS = new Set([
  'type',
  'description',
  'properties',
  'required',
  'items',
  'enum',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
]);
~~~

It must additionally assert:

- type is a lowercase supported primitive or an array of supported primitives;
- object nodes contain at least one property;
- required names exist in the same object node’s properties;
- minItems/maxItems/minimum/maximum are finite numbers, never strings;
- enum values are primitive JSON values matching the declared non-null type;
- no empty enum;
- no anyOf, oneOf, allOf, const, pattern, minLength, maxLength, format, nullable, additionalProperties, definitions, $defs, $ref, propertyOrdering, or unknown keyword appears;
- the root type is object;
- the root required set includes every required TurnResult field and all six HG1 envelope names.

Call this assertion once at module initialization for geminiTurnResponseJsonSchema so an invalid future edit fails before a provider request.

---

## Track C — Build a Gemini-compatible structural scaffold

### C1. Preserve root shape and remove dialect mixing

The provider schema must still declare every TurnResultSchema root property currently used by production:

- narrative_blocks
- intent_proposal
- reconciliation_proposal
- consequence_proposal
- character_stance_proposal
- character_relationship_proposal
- character_memory_proposal
- world_memory_proposal
- logic_state
- topologyDelta
- all six HG1 proposal envelopes
- engine_thoughts only if it remains a live optional TurnResult field

Preserve the existing root required list except where TurnResultSchema itself marks a root field optional. Do not infer optionality from the current provider schema; inspect TurnResultSchema directly.

Use lowercase types:

~~~ts
{ type: 'object' }
{ type: 'array' }
{ type: 'string' }
{ type: 'integer' }
{ type: 'number' }
{ type: 'boolean' }
{ type: ['string', 'null'] }
{ type: ['object', 'null'] }
~~~

### C2. Remove all provider-side string validation

The Gemini projection must contain none of:

~~~text
minLength
maxLength
pattern
format: enum
~~~

Keep all existing trim, nonblank, length, ID, and rationale validation in Zod.

Replace helpers with provider-only structural helpers:

~~~ts
const stringSchema = (description?: string): GeminiJsonSchema => ({
  type: 'string',
  ...(description ? { description } : {}),
});

const nullableStringSchema = (description?: string): GeminiJsonSchema => ({
  type: ['string', 'null'],
  ...(description ? { description } : {}),
});

const enumSchema = (values: readonly string[]): GeminiJsonSchema => ({
  type: 'string',
  enum: [...values],
});

const arraySchema = (
  items: GeminiJsonSchema,
  maxItems?: number
): GeminiJsonSchema => ({
  type: 'array',
  items,
  ...(maxItems === undefined ? {} : { maxItems }),
});
~~~

### C3. Remove all anyOf unions

Do not represent discriminated Zod unions as provider anyOf branches. Flatten each into a structural superset object; keep only the discriminant required at the provider boundary. The prompt and Zod enforce variant-specific requirements.

Required flattening:

1. **Consequence mutation**
   - domain enum contains INVENTORY, PLAYER_INJURY, PSYCHOLOGICAL_STATUS.
   - operation enum contains ADD, REMOVE, SET.
   - value and rationale remain declared.
   - Zod enforces valid domain/operation/value combinations.

2. **World-memory candidate**
   - scope enum contains GLOBAL and NODE.
   - node_id uses type string-or-null.
   - Zod enforces GLOBAL/null and NODE/nonempty relationships.

3. **Manifestation block**
   - one object-or-null schema;
   - type enum contains prose and dialogue;
   - content declared;
   - speaker declared but not provider-required;
   - Zod requires speaker for dialogue.

4. **Cast activity proposal**
   - one object;
   - kind enum contains NONE and ACTIVITY;
   - declare reason plus all active fields;
   - require only kind at the provider schema;
   - prompt and Zod require the active fields when kind is ACTIVITY.

5. **Situated pressure proposal**
   - one object;
   - kind enum contains NONE and PRESSURE;
   - declare reason plus all active fields;
   - require only kind at the provider schema;
   - prompt and Zod require the active fields when kind is PRESSURE.

No other anyOf node may remain in geminiTurnResponseJsonSchema.

### C4. Correct numeric constraints

All provider array caps must be numbers:

~~~ts
maxItems: 2
maxItems: 3
maxItems: 4
~~~

Never use string values such as "2".

For relationship delta, remove the invalid integer schema with string enum members. Use:

~~~ts
{
  type: 'integer',
  minimum: -1,
  maximum: 1,
  description: 'Use -1 or 1; never 0.',
}
~~~

TurnResultSchema remains responsible for rejecting zero.

Keep suggested_tension as integer with numeric minimum 0 and maximum 100.

### C5. Keep HG1 envelopes explicit but structurally modest

All six HG1 envelope names remain root-required.

Provider requirements:

- cast_activity_proposal requires kind.
- situated_pressure_proposal requires kind.
- value_state_proposal requires changes.
- character_pursuit_proposal requires changes.
- character_development_proposal requires changes.
- pressure_transition_proposal requires transitions.

Keep enum domains that materially guide the model:

- activity/pressure kind;
- perceptionPath;
- pressure operator, affected dimension, persistence target;
- value operations, conditions, lifecycles;
- pursuit operations and statuses;
- development operations and dimensions;
- pressure terminal statuses.

Keep array caps numeric.

Do not reproduce string-length, nonblank, conditional-required, exact-cause-reference, or cross-field semantic rules in the provider schema. Those remain prompt plus Zod plus ratifiers.

### C6. Preserve the complete prompt contract

Do not delete or weaken the six HG1 prompt sections in server/routes/turn.ts.

The prompt must continue to state:

- all six envelopes must be returned;
- neutral/no-op outcomes use explicit NONE objects or empty arrays;
- active variants must contain their complete Zod-required fields;
- cause references must use the provided valid-cause set;
- no canonical state is assumed from provider omission.

No runtime fallback may fabricate missing proposals.

---

## Track D — Tests that prove the owning boundaries

### D1. Provider schema subset tests

**Modify:** server/utils/aiClient.test.ts

Add tests named exactly:

1. provider JSON schema uses only the documented TTM Gemini allowlist
2. provider JSON schema contains no anyOf or legacy Schema dialect keywords
3. provider JSON schema uses lowercase types and numeric constraint literals
4. provider JSON schema declares every TurnResult root property
5. provider JSON schema requires all six HG1 proposal envelopes
6. provider JSON schema keeps every HG1 discriminant enum domain
7. relationship delta is an integer range and never a string enum
8. generateStructuredResponse sends responseJsonSchema and never responseSchema

Test 8 must capture the real @google/genai SDK request seam and assert object identity:

~~~ts
expect(sdkRequest.config.responseJsonSchema)
  .toBe(EngineTurnStructuredResponseContract.responseJsonSchema);

expect(sdkRequest.config).not.toHaveProperty('responseSchema');
~~~

### D2. Canonical ingress tests

Retain and strengthen the existing Zod tests:

9. omission of each HG1 envelope fails TurnResultSchema
10. explicit neutral HG1 envelopes parse without manufacturing defaults
11. every active HG1 variant parses through the paired Zod contract
12. provider-coarse invalid cross-field combinations are rejected by Zod
13. overlong, blank, invalid-cause, and invalid-ID values remain rejected by Zod or their deterministic ratifier owner

The provider schema becoming coarser must not weaken canonical validation.

### D3. Route and state-safety tests

**Modify:** server/routes/turn.horrorGrammar1.test.ts and/or server/routes/apiRouteIntegrity.test.ts

14. production route passes the paired Gemini JSON schema to the SDK seam
15. provider 400 INVALID_ARGUMENT returns bounded JSON 502 PROVIDER_FAILURE
16. provider failure produces no canonical state, receipt, memory, topology, pursuit, value, development, or pressure advance
17. a production-shaped accepted provider response still traverses all real HG1 ratifiers
18. accepted turn state becomes the exact bounded pre-state of the next turn

Do not mock away parseStructuredTurnResponse or TurnResultSchema in the successful route test.

---

## Track E — Mandatory live Gemini closure

### E1. Direct provider admission

With the configured private GEMINI_API_KEY, run the updated probe once.

Required result:

~~~json
{
  "schemaAccepted": true,
  "responseReceived": true,
  "zodAccepted": true
}
~~~

A result where schemaAccepted is true but zodAccepted is false does not close the packet. Adjust provider descriptions/prompt guidance without weakening Zod, then rerun a bounded probe.

### E2. Real production route

Build and start the exact production artifact:

~~~bash
npm run build
PORT=4173 NODE_ENV=production npm run preview
~~~

Send one valid production-shaped Engine turn request through:

~~~text
POST http://127.0.0.1:4173/api/turn
~~~

Required proof:

- HTTP 200;
- Content-Type includes application/json;
- X-TTM-API equals express;
- response parses through TurnResultSchema;
- response includes all six HG1 envelopes and the normal turn receipts;
- no raw provider error;
- no session mutation occurs before successful ratification/publication.

Then initiate one real imported Blueprint from the Engine UI and prove the opening turn renders.

If GEMINI_API_KEY is genuinely absent, report exactly:

~~~text
LIVE_PROVIDER_PROOF_PENDING
~~~

The packet may not be described as closed until both live provider admission and a real UI opening turn succeed.

---

## Verification commands

Run and report exact totals:

~~~bash
npx vitest run server/utils/aiClient.test.ts src/types/horrorGrammar.test.ts
npx vitest run server/routes/turn.horrorGrammar1.test.ts server/routes/apiRouteIntegrity.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/lib/turnResponseReader.test.ts
npx tsc --noEmit
npm run lint
npm run build
npx vitest run
git diff --check
~~~

Run the live gates in Track E after all deterministic gates pass.

## Completion criteria

Packet 1-10B is complete only when:

- the baseline 400 INVALID_ARGUMENT is reproduced;
- production sends responseJsonSchema, never responseSchema;
- the schema passes assertGeminiJsonSchemaSubset;
- Gemini accepts the schema in a real call;
- the real response passes the unchanged TurnResultSchema;
- all six HG1 envelopes remain required and explicit;
- the production /api/turn route returns a successful JSON turn;
- an imported Blueprint initiates and renders its opening Engine turn;
- provider failure remains bounded and state-preserving;
- all automated gates pass;
- the working tree is clean.

## Explicitly out of scope

- Additional model providers or adapter layers.
- Qwen, Z.ai, OpenAI, provider selection, or BYOK changes.
- Model-ID changes.
- Forge or Blueprint changes.
- HG2 or Horror Grammar redesign.
- Director mode.
- Intro-screen work.
- UI styling.
- Telemetry redesign.
- Broad cleanup, pruning, dependency upgrades, or unrelated refactors.

