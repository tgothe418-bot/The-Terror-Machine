# 1-11A — Provider-Neutral Engine Generation and Qwen Admission Gate

**Series:** TTM Provider Portability

**Execution packet:** First of two packets. Packet 1-11B will add User-facing model selection to The Voice and Engine Setup only after this gate passes.

**Required baseline:** `af73f45d1540322de02e486765f6e8ba095a19e7`

**Priority:** Critical portability foundation. Complete this packet before Packet 1-11B, Z.ai/GLM support, self-hosted models, additional provider adapters, Forge model selection, or ordinary feature expansion.

**Target outcome:** The canonical `/api/turn` generation path can execute through either the existing Gemini adapter or one admitted Qwen adapter. Provider output crosses one shared parser and the existing authoritative `TurnResultSchema`; provider choice never changes canonical state ownership or ratification.

This is not a whole-application provider migration. Voice, Forge, Architect, extraction, preview, simulated-player, reconciliation, and legacy chat calls remain on their existing Gemini paths until explicitly migrated by later packets.

## Governing invariants

- One User action causes exactly one provider generation.
- There is no automatic retry, repair generation, cross-provider fallback, parallel generation, or second formatting call.
- Provider selection occurs before generation. It cannot change while a request is in flight.
- `TurnResultSchema` remains the canonical ingress authority.
- Existing deterministic ratifiers remain the semantic and state-mutation authority.
- Gemini and Qwen receive provider-specific projections of the same paired Engine contract.
- Missing, malformed, refused, empty, truncated, or rejected provider material fails closed and preserves canonical pre-state.
- All six Horror Grammar 1 proposal envelopes remain required on every successful turn.
- Explicit neutral HG1 envelopes remain valid.
- Rejected manifestation text remains outside ordinary fiction, memory, World Memory, next-turn prompts, canonical state, Retake replacement state, and ordinary exports.
- A provider adapter returns normalized proposal text or a bounded typed provider failure. It never edits canonical state.
- Qwen is admitted as exactly one pinned model in this packet.
- Gemini remains the backward-compatible default when no explicit local Engine provider is configured.
- Private credentials remain server-only and local. They never enter client state, IndexedDB, local/session storage, URL parameters, request bodies from the browser, prompts, Blueprints, telemetry, exports, logs, errors, source maps, committed files, or test snapshots.
- `.env` remains ignored. `.env.example` contains empty placeholders only.
- No account system, hosted credential vault, database, remote TTM service, or authentication layer is introduced.
- No Blueprint, Forge, topology, Depiction Contract, perspective, character-selection, prompt-content, Horror Grammar, or ratifier redesign is authorized.

## Explicitly deferred

Do not implement any of the following in Packet 1-11A:

- User-facing model selectors;
- The Voice initiation flow;
- Engine Setup UI;
- Voice, Forge, Architect, extraction, preview, simulation, or reconciliation provider migration;
- Z.ai or GLM;
- self-hosted Qwen, Ollama, SGLang, vLLM, or arbitrary OpenAI-compatible endpoints;
- multiple Qwen models or a free-text model identifier;
- browser-side API calls to Qwen;
- browser-side key entry or persistence;
- model quality controls, temperature controls, reasoning controls, or token-budget controls;
- automatic provider failover;
- provider response repair;
- changes to canonical schemas merely to accommodate a provider;
- changes to the Engine prompt except an adapter-neutral comment or type rename required by this packet.

## 0. Start gate

Run:

```bash
git rev-parse HEAD
git status --short
```

Stop immediately unless:

- `HEAD` is exactly `af73f45d1540322de02e486765f6e8ba095a19e7`; and
- the working tree contains no unrelated changes overlapping this packet.

Read these exact owners before editing:

- `server/utils/aiClient.ts`
- `server/utils/aiClient.test.ts`
- `server/ai/modelPolicy.ts`
- `server/ai/modelPolicy.test.ts`
- `server/routes/turn.ts`
- `server/routes/turn.test.ts`
- `server/routes/turn.horrorGrammar1.test.ts`
- `server/app.ts`
- `server.ts`
- `src/types/engineContract.ts`
- `server/schemas/engine.ts`
- `package.json`
- `.gitignore`
- `.env.example`
- `README.md`
- `ROADMAP.md`

Also inventory every direct Gemini caller:

```bash
rg -n "getAiClient\(|models\.generateContent|generateStructuredResponse\(" server src
```

Record the list. Only the `generateStructuredResponse()` Engine-turn path is migrated in this packet. Do not opportunistically convert the other callers.

Record the start revision and working-tree status in the final report.

## 1. Write the failing tests first

Add these exact test names before implementation:

```text
provider registry exposes only admitted provider metadata and never credential material
Engine provider resolution defaults to Gemini for backward compatibility
Qwen Engine selection requires a private key and explicit compatible base URL
Qwen adapter accepts only the single pinned admitted model
Qwen projection contains standard JSON Schema and no Gemini-only keywords
Qwen projection preserves every Engine root requirement and HG1 envelope bound
Qwen request sends the exact paired strict JSON Schema in one provider call
Qwen provider output crosses the exact canonical TurnResultSchema parser
Qwen omission of each HG1 envelope fails closed without synthetic defaults
Qwen refusal empty response and transport failure expose bounded provider errors only
Qwen credential and prompt sentinels never appear in logs route errors or telemetry
one Qwen Engine action performs one Qwen call and zero Gemini calls
Gemini Engine selection performs one Gemini call and zero Qwen calls
production start loads private local environment configuration before provider construction
```

The tests must fail for the pre-implementation reasons. Do not change an assertion simply to remove a failure.

Use deterministic fake credentials only. Automated tests must never require or consume a real Gemini or Qwen credential.

## 2. Establish provider-neutral types

Create `server/ai/providerTypes.ts` as the provider-independent owner. Use these public types and values:

```ts
import type { z } from 'zod';

export const GENERATION_PROVIDER_IDS = ['gemini', 'qwen'] as const;
export type GenerationProviderId = (typeof GENERATION_PROVIDER_IDS)[number];

export const STRUCTURED_OUTPUT_CAPABILITIES = [
  'STRICT_JSON_SCHEMA',
  'JSON_OBJECT',
  'TEXT_ONLY',
] as const;
export type StructuredOutputCapability =
  (typeof STRUCTURED_OUTPUT_CAPABILITIES)[number];

export interface GenerationSelection {
  readonly providerId: GenerationProviderId;
  readonly modelId: string;
}

export interface PublicProviderDescriptor {
  readonly providerId: GenerationProviderId;
  readonly displayName: string;
  readonly modelId: string;
  readonly structuredOutput: StructuredOutputCapability;
  readonly configured: boolean;
}

export interface StructuredResponseContract<T> {
  readonly name: string;
  readonly zodSchema: z.ZodType<T>;
  readonly providerSchemas: Readonly<
    Record<GenerationProviderId, Readonly<Record<string, unknown>>>
  >;
}

export type NormalizedProviderResponse =
  | { readonly kind: 'CONTENT'; readonly text: string }
  | { readonly kind: 'PROVIDER_REFUSAL'; readonly reason?: string }
  | { readonly kind: 'EMPTY_PROVIDER_RESPONSE' };

export interface AdapterStructuredRequest {
  readonly prompt: string;
  readonly modelId: string;
  readonly contractName: string;
  readonly responseSchema: Readonly<Record<string, unknown>>;
}

export interface StructuredGenerationAdapter {
  readonly providerId: GenerationProviderId;
  readonly displayName: string;
  readonly defaultModelId: string;
  readonly structuredOutput: StructuredOutputCapability;
  isConfigured(): boolean;
  generateStructured(
    request: AdapterStructuredRequest
  ): Promise<NormalizedProviderResponse>;
}
```

Rules:

- This module must not import `@google/genai`, Qwen/DashScope code, Express, React, Zustand, Blueprint types, stores, or ratifiers.
- `PublicProviderDescriptor` is safe future metadata. It must never grow an API-key, header, base-URL, raw-error, prompt, or credential-suffix field.
- Do not expose `process.env` through these types.
- Do not add a generic arbitrary provider ID.

Move the current provider-neutral errors and parser out of Gemini ownership into `server/ai/structuredGeneration.ts`, or implement them there and re-export them from `server/utils/aiClient.ts` for compatibility:

- `ProviderRefusalError`
- `EmptyProviderResponseError`
- `unwrapStrictJsonResponse`
- `parseStructuredTurnResponse`

Add two bounded errors:

```ts
export class ProviderConfigurationError extends Error {
  readonly code = 'PROVIDER_CONFIGURATION_ERROR';
  readonly providerId: GenerationProviderId;

  constructor(providerId: GenerationProviderId) {
    super(`AI provider ${providerId} is not configured`);
    this.name = 'ProviderConfigurationError';
    this.providerId = providerId;
  }
}

export class ProviderRequestError extends Error {
  readonly code = 'PROVIDER_REQUEST_ERROR';
  readonly providerId: GenerationProviderId;
  readonly status?: number;
  readonly providerCode?: string;

  constructor(input: {
    providerId: GenerationProviderId;
    status?: number;
    providerCode?: string;
  }) {
    super(`AI provider ${input.providerId} request failed`);
    this.name = 'ProviderRequestError';
    this.providerId = input.providerId;
    this.status = input.status;
    this.providerCode = input.providerCode?.slice(0, 80);
  }
}
```

Neither error may retain a request, response body, headers, key, endpoint, prompt, model prose, stack supplied by the provider, or upstream error message.

## 3. Preserve one paired Engine contract with two provider projections

The current `TurnResultSchema` remains unchanged and authoritative.

Retain the existing Gemini `turnResponseSchema` semantics. It may be moved to `server/ai/engineTurnContract.ts` for clean ownership, but `server/utils/aiClient.ts` must re-export the existing names so current imports and focused tests remain valid:

```ts
turnResponseSchema
EngineTurnStructuredResponseContract
```

Change `EngineTurnStructuredResponseContract` to this paired shape:

```ts
export const EngineTurnStructuredResponseContract: StructuredResponseContract<TurnResult> = {
  name: 'ENGINE_TURN',
  zodSchema: TurnResultSchema,
  providerSchemas: {
    gemini: turnResponseSchema as unknown as Readonly<Record<string, unknown>>,
    qwen: qwenTurnResponseSchema,
  },
};
```

Do not retain a module-global `responseSchema` property that silently means Gemini. All adapters must select their own named projection from `providerSchemas`.

### 3.1 Build the Qwen projection deterministically

Create `server/ai/qwenSchemaProjection.ts`.

The Qwen projection must be generated once from the existing exact Engine provider projection. Do not hand-maintain a second 500-line schema and do not generate it from a simplified fixture.

Export:

```ts
export type StandardJsonSchema = Readonly<Record<string, unknown>>;

export function projectGeminiSchemaToStandardJsonSchema(
  input: Readonly<Record<string, unknown>>
): StandardJsonSchema;
```

The recursive projection must:

1. Return a new deeply copied object. Never mutate `turnResponseSchema`.
2. Convert Gemini type values to lowercase JSON Schema types:
   - `OBJECT` → `object`
   - `ARRAY` → `array`
   - `STRING` → `string`
   - `INTEGER` → `integer`
   - `NUMBER` → `number`
   - `BOOLEAN` → `boolean`
3. Recurse through `properties`, `items`, and every `anyOf` member.
4. Preserve `required`, `enum`, `description`, `pattern`, `minimum`, and `maximum`.
5. Convert string-encoded numeric keywords to numbers for:
   - `minLength`
   - `maxLength`
   - `minItems`
   - `maxItems`
6. Remove Gemini-only `format: 'enum'`.
7. Remove `nullable` and express it as standard JSON Schema:
   - if the node already has `anyOf`, append `{ type: 'null' }` once;
   - otherwise wrap the converted node and `{ type: 'null' }` in `anyOf`.
8. Convert integer enum members such as `'-1'` and `'1'` into numeric `-1` and `1` when the owning type is `integer`.
9. Add `additionalProperties: false` to every projected object schema unless that node already defines an explicit `additionalProperties` policy.
10. Omit keys whose values are `undefined`.
11. Produce a JSON-serializable object containing no class instances, functions, symbols, cycles, `Type` enum objects, Zod objects, or Gemini SDK objects.

The exported Qwen schema is:

```ts
export const qwenTurnResponseSchema =
  projectGeminiSchemaToStandardJsonSchema(
    turnResponseSchema as unknown as Readonly<Record<string, unknown>>
  );
```

Do not use `z.toJSONSchema(TurnResultSchema)` for this packet. `TurnResultSchema` contains defaults, transforms, compatibility fields, and application-owned normalization that must not become accidental provider syntax. Packet 1-10A’s exact provider projection remains the source projection; Qwen receives a standards-correct conversion of it.

### 3.2 Required projection proofs

Create `server/ai/qwenSchemaProjection.test.ts` and prove recursively that:

- no key named `nullable` exists;
- no `type` value is uppercase or outside the standard JSON Schema type set;
- no `format: 'enum'` exists;
- no numeric constraint is a string;
- all object nodes set `additionalProperties: false`;
- nullable nodes include exactly one null alternative;
- relationship `delta.enum` is exactly numeric `[-1, 1]`;
- the root property names match `turnResponseSchema.properties` exactly;
- the root required list matches `turnResponseSchema.required` exactly;
- all six HG1 envelopes are root-required;
- the HG1 discriminants, enum sets, manifestation alternatives, and list caps remain exactly those proven in Packet 1-10A;
- `JSON.stringify(qwenTurnResponseSchema)` succeeds;
- projecting twice produces deeply equal output and does not mutate the input.

Do not prove parity with a snapshot alone. Assert the material fields and recursive invariants directly.

## 4. Isolate the existing Gemini adapter without migrating unrelated routes

Create `server/ai/providers/geminiAdapter.ts` or an equivalent isolated owner implementing `StructuredGenerationAdapter`.

Requirements:

- `providerId` is exactly `gemini`.
- `displayName` is exactly `Gemini`.
- `defaultModelId` remains the existing `GEMINI_MODEL_ID`.
- `structuredOutput` is `STRICT_JSON_SCHEMA`.
- `isConfigured()` returns whether a nonblank `GEMINI_API_KEY` exists.
- Engine structured generation uses the existing `getGeminiPolicy('ENGINE_TURN')` model and thinking level.
- It sends only `request.responseSchema` as `config.responseSchema`.
- It retains `responseMimeType: 'application/json'`.
- It uses the existing Gemini response classifier and maps it to `NormalizedProviderResponse`.
- It does not parse JSON or invoke Zod inside the adapter.
- It performs exactly one `models.generateContent()` call.
- It never attempts Qwen after a Gemini error.

Keep `getAiClient()` available through `server/utils/aiClient.ts` because Voice, Forge, Architect, previews, and legacy routes still import it. Do not migrate those callers.

Remove the stale `STARTUP_API_KEY` snapshot. Read and sanitize the current server environment only when constructing the private Gemini client. Update the missing-key message to reference the private local `.env` configuration rather than the AI Studio Secrets panel.

Existing Gemini SDK-seam tests from Packet 1-10A must remain green. Update their schema assertion to:

```ts
expect(sdkRequest.config.responseSchema).toBe(
  EngineTurnStructuredResponseContract.providerSchemas.gemini
);
```

Do not weaken any Packet 1-10A soundness or HG1 containment assertion.

## 5. Add exactly one Qwen adapter

Create `server/ai/providers/qwenAdapter.ts` implementing `StructuredGenerationAdapter` with native server-side `fetch`. Do not add the OpenAI SDK, DashScope SDK, or another runtime dependency.

Use these fixed identities:

```ts
export const QWEN_PROVIDER_ID = 'qwen' as const;
export const QWEN_ENGINE_MODEL_ID =
  'qwen3.7-flash-2026-07-15' as const;
```

The model ID is pinned. Do not use a floating `latest` alias, accept a free-text model ID, or add another Qwen model in this packet.

Read private configuration only from:

```text
DASHSCOPE_API_KEY
QWEN_BASE_URL
```

`QWEN_BASE_URL` is the complete OpenAI-compatible API base supplied for the same region as the key and must end at `/compatible-mode/v1` before normalization. Do not derive a region, workspace ID, or host from browser input.

Configuration validation must:

- trim surrounding whitespace and one matching pair of quote characters;
- reject a blank key;
- reject a blank or malformed base URL;
- require `https:`;
- reject embedded URL username or password;
- remove a trailing slash;
- append `/chat/completions` exactly once;
- never include the key or base URL in a thrown error.

Qwen JSON Schema mode is region-dependent. The current documented Singapore endpoint does not support strict JSON Schema. Do not silently downgrade to JSON Object mode when the configured region rejects `json_schema`. Report a bounded provider failure and leave admission incomplete. Use a Qwen region/API host that supports strict JSON Schema for the live gate.

Inject `fetch` into the adapter constructor for tests; default to `globalThis.fetch` in production.

The adapter must perform one request equivalent to:

```ts
await fetch(`${normalizedBaseUrl}/chat/completions`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${privateApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: request.modelId,
    messages: [{ role: 'user', content: request.prompt }],
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: request.contractName.toLowerCase(),
        strict: true,
        schema: request.responseSchema,
      },
    },
    enable_thinking: false,
    stream: false,
  }),
});
```

Do not send `max_tokens` while strict structured output is active. Do not send Gemini fields, tools, web search, uploaded source material beyond the existing bounded prompt, or a second formatting instruction.

For a successful OpenAI-compatible response, read only:

```ts
choices[0].message.content
choices[0].finish_reason
```

Normalize as follows:

- nonblank string content → `CONTENT`;
- missing/blank content → `EMPTY_PROVIDER_RESPONSE`;
- `finish_reason` equal to `content_filter`, `safety`, or another explicitly enumerated refusal code → `PROVIDER_REFUSAL` with a bounded code only;
- non-2xx HTTP → `ProviderRequestError` with provider ID, numeric status, and an optional bounded upstream machine code;
- invalid or non-object response JSON → `ProviderRequestError` without retaining the body;
- partial content caused by length/truncation must cross the ordinary JSON parser and fail closed. Do not repair or retry it.

Never include `response.statusText`, the raw response body, upstream prose, request headers, request body, prompt, API key, endpoint, or stack in a route response or retained error.

The adapter must not call `JSON.parse()` on the model’s `message.content` and must not invoke `TurnResultSchema`. Parsing remains centralized after adapter normalization.

## 6. Add the registry and bounded Engine provider resolution

Create `server/ai/providerRegistry.ts`.

The registry owns exactly two adapters:

```text
gemini
qwen
```

It must:

- reject duplicate IDs at construction;
- reject unknown provider IDs;
- return adapters by exact ID;
- expose public descriptors containing only the fields in `PublicProviderDescriptor`;
- derive `configured` from `adapter.isConfigured()` without exposing why configuration is missing;
- support constructor injection of adapters for deterministic tests;
- contain no React, Zustand, IndexedDB, Blueprint, session, route, or ratifier state.

Add a pure resolver:

```ts
export function resolveEngineGenerationSelection(
  env: NodeJS.ProcessEnv = process.env
): GenerationSelection;
```

Resolution rules for Packet 1-11A:

1. Read `TTM_ENGINE_PROVIDER`.
2. Missing or blank means `gemini` for backward compatibility.
3. The only accepted values are exact lowercase `gemini` and `qwen`.
4. `gemini` resolves to the existing `GEMINI_MODEL_ID`.
5. `qwen` resolves to the pinned `QWEN_ENGINE_MODEL_ID`.
6. Any other value throws a bounded configuration error before a provider call.
7. A selected but unconfigured adapter throws `ProviderConfigurationError` before a provider call.
8. Do not automatically choose Qwen because a Qwen key happens to exist.
9. Do not automatically choose Gemini because Qwen fails.

`TTM_ENGINE_PROVIDER` is a temporary local configuration seam for Packet A and its live proof. Packet 1-11B will add validated session-owned selection without removing this safe server default.

## 7. Make structured generation provider-neutral

In `server/ai/structuredGeneration.ts`, implement the sole Engine dispatch boundary:

```ts
export interface GenerateStructuredResponseOptions {
  readonly selection?: GenerationSelection;
  readonly registry?: ProviderRegistry;
}

export async function generateStructuredResponse<T>(
  prompt: string,
  contract: StructuredResponseContract<T>,
  options: GenerateStructuredResponseOptions = {}
): Promise<T>;
```

Execution order must be exact:

1. Resolve the selection from `options.selection` or `resolveEngineGenerationSelection()`.
2. Resolve exactly one adapter from `options.registry` or the production singleton registry.
3. Confirm `selection.modelId === adapter.defaultModelId`; otherwise fail before generation.
4. Confirm the adapter is configured.
5. Read `contract.providerSchemas[selection.providerId]`; missing projection is a configuration failure.
6. Call `adapter.generateStructured()` exactly once.
7. Map normalized refusal and empty results to the existing typed errors.
8. Pass `CONTENT.text` through `parseStructuredTurnResponse(text, contract.zodSchema)` exactly once.
9. Return the parsed canonical proposal object.

There must be no catch branch that invokes another adapter, removes the provider schema, changes structured-output mode, asks the model to repair JSON, injects neutral HG1 envelopes, or substitutes a previous response.

Keep this compatibility export in `server/utils/aiClient.ts`:

```ts
export { generateStructuredResponse } from '../ai/structuredGeneration';
```

Existing production `/api/turn` may continue calling:

```ts
generateStructuredResponse(prompt, EngineTurnStructuredResponseContract)
```

The resolver supplies Packet A’s locally configured Engine provider. Do not add provider or model fields to the browser request schema yet; that belongs to Packet 1-11B.

## 8. Preserve the `/api/turn` failure boundary

Update `server/routes/turn.ts` only as required to recognize the new bounded configuration/request errors.

Required mapping:

| Failure | HTTP | Public code | Canonical state |
|---|---:|---|---|
| Provider refusal | 502 | `PROVIDER_REFUSAL` | unchanged |
| Empty provider response | 502 | `PROVIDER_FAILURE` | unchanged |
| Provider configuration failure | 502 | `PROVIDER_CONFIGURATION_ERROR` | unchanged |
| Provider HTTP/transport failure | 502 | `PROVIDER_FAILURE` | unchanged |
| JSON parse failure | 502 | `MODEL_CONTRACT_MISMATCH` | unchanged |
| Zod failure | 502 | `MODEL_CONTRACT_MISMATCH` | unchanged |

Public responses may contain the selected provider ID and bounded machine status/code if useful. They must not contain model prose, prompts, headers, base URLs, keys, raw provider bodies, upstream messages, stack traces, or SDK objects.

Do not change ratification order, receipts, commit behavior, prompt construction, HG1 cause ownership, fictional-time behavior, retry/retake behavior, or canonical output shapes.

## 9. Add real adapter-seam and route tests

Create:

- `server/ai/providers/qwenAdapter.test.ts`
- `server/ai/providerRegistry.test.ts`
- `server/ai/qwenSchemaProjection.test.ts`
- `server/routes/turn.providerPortability.test.ts`

Update existing Gemini tests mechanically where imports moved. Do not delete or replace Packet 1-10A’s provider and HG1 suites.

### 9.1 Qwen adapter unit proof

Use an injected fake `fetch`. It must capture the exact request and return deterministic OpenAI-compatible fixtures.

Assert:

- the URL is normalized and receives `/chat/completions` once;
- the authorization header contains the fake key only at the outgoing SDK/HTTP seam;
- the body contains the pinned model;
- `response_format.type` is `json_schema`;
- `response_format.json_schema.strict` is `true`;
- the schema deeply equals `EngineTurnStructuredResponseContract.providerSchemas.qwen`;
- `enable_thinking` is `false`;
- `stream` is `false`;
- `max_tokens` is absent;
- exactly one fetch occurs;
- a valid content string is normalized but not parsed inside the adapter;
- refusal, blank content, malformed response JSON, and non-2xx status map to bounded results/errors;
- the fake key, prompt sentinel, raw provider body sentinel, authorization header, and base URL are absent from every thrown error message, serialized error, captured console call, and public route response.

### 9.2 Registry proof

Assert:

- the production registry contains exactly `gemini` and `qwen`;
- its public descriptor serialization contains no key, secret, token, authorization, header, endpoint, URL, prompt, or raw-error property;
- default Engine resolution remains Gemini;
- exact `TTM_ENGINE_PROVIDER=qwen` resolves the pinned Qwen model;
- unknown, differently cased, or whitespace-padded provider values fail closed rather than being guessed;
- selected unconfigured providers cause zero provider calls;
- model substitution outside the pinned model causes zero provider calls.

Environment tests must snapshot and restore every changed variable in `afterEach` or `afterAll`:

```text
GEMINI_API_KEY
DASHSCOPE_API_KEY
QWEN_BASE_URL
TTM_ENGINE_PROVIDER
```

### 9.3 Production-path Qwen route proof

`server/routes/turn.providerPortability.test.ts` must mount the real Express app or real `turnRouter`. It may mock only the external provider seams:

- injected/global `fetch` for Qwen;
- `@google/genai` `generateContent()` to prove it is not called during Qwen selection.

Do not mock:

- `generateStructuredResponse`;
- `parseStructuredTurnResponse`;
- `TurnResultSchema`;
- `/api/turn`;
- prompt construction;
- `finalizeTurnCausality`;
- any ratifier;
- any store/reducer publication owner.

Required route cases:

1. A production-shaped Qwen response containing all required Engine and HG1 envelopes crosses the real parser and ratifiers and returns a successful turn.
2. The exact Qwen schema object is sent in the captured HTTP request.
3. The successful action makes exactly one Qwen fetch and zero Gemini SDK calls.
4. Deleting each of the six HG1 envelope fields independently returns `MODEL_CONTRACT_MISMATCH` and no successful turn.
5. Explicit neutral HG1 envelopes parse and preserve their exact canonical pre-state.
6. Invalid JSON returns `MODEL_CONTRACT_MISMATCH` and no successful turn.
7. Refusal, blank content, transport error, non-2xx response, and malformed response envelope return bounded 502 failures and no successful turn.
8. A fake credential sentinel, prompt sentinel, provider-body sentinel, and endpoint sentinel are absent from the JSON response and captured logs in every failure case.
9. Selecting Gemini executes one Gemini SDK call and zero Qwen fetches while sending `providerSchemas.gemini` by object identity.
10. Rejected HG1 manifestation sentinels remain absent from ordinary fiction, canonical state, memory surfaces, and a captured consecutive-turn prompt exactly as Packet 1-10A already requires.

Reuse existing production-shaped fixtures where possible. Do not introduce fixture-only alternate contracts.

## 10. Make local private-environment loading true in every start mode

The README currently instructs the User to create `.env`, while production `node dist/server.cjs` does not explicitly load it before server modules are imported.

Add this as the first import in `server.ts`:

```ts
import 'dotenv/config';
```

It must execute before importing and constructing provider owners.

Do not load `.env` into client code. Do not add any `VITE_`-prefixed credential.

Keep `.gitignore` behavior:

```gitignore
.env*
!.env.example
```

Replace the AI-Studio-only comments in `.env.example` with empty local configuration placeholders. Do not add a real endpoint, workspace ID, key, or credential:

```dotenv
# Private local provider credentials. Copy this file to .env.
# Never commit .env or paste these values into source, issues, telemetry, or exports.
GEMINI_API_KEY=
DASHSCOPE_API_KEY=

# Qwen's complete regional OpenAI-compatible base URL, supplied with the key.
QWEN_BASE_URL=

# Packet 1-11A local Engine default: gemini or qwen. Omit/blank defaults to gemini.
TTM_ENGINE_PROVIDER=gemini

APP_URL=
```

Update the README’s running section truthfully:

- TTM’s current local server supports Gemini and an admitted Qwen Engine adapter.
- The User copies `.env.example` to `.env` once.
- Gemini uses `GEMINI_API_KEY`.
- Qwen uses `DASHSCOPE_API_KEY` plus the matching regional `QWEN_BASE_URL` supplied by Model Studio.
- `TTM_ENGINE_PROVIDER=qwen` selects Qwen for Packet A’s Engine path.
- Voice, Forge, and remaining model-backed tools still use Gemini until later migration.
- `.env` is private and Git-ignored.
- no key is entered repeatedly after local configuration.

Update `ROADMAP.md` so it no longer claims provider neutrality is merely a future design direction after this packet. Keep the claim narrow: the canonical Engine structured-turn boundary has Gemini/Qwen adapters; whole-application provider selection remains future work.

Add a test that starts or imports the production server entry under a controlled temporary environment and proves provider configuration is visible before adapter construction. The test may use fake values only. It must not read the developer’s real `.env`.

Run:

```bash
git check-ignore .env
git ls-files '.env*'
```

The first command must identify `.env` as ignored. The second may list `.env.example` but no real `.env` variant.

## 11. Focused automated gate

Run in this order with real credentials removed from the test environment:

```bash
env -u GEMINI_API_KEY -u DASHSCOPE_API_KEY -u QWEN_BASE_URL \
  npx vitest run \
  server/ai/qwenSchemaProjection.test.ts \
  server/ai/providerRegistry.test.ts \
  server/ai/providers/qwenAdapter.test.ts \
  server/utils/aiClient.test.ts \
  server/ai/modelPolicy.test.ts
```

```bash
env -u GEMINI_API_KEY -u DASHSCOPE_API_KEY -u QWEN_BASE_URL \
  npx vitest run \
  server/routes/turn.providerPortability.test.ts \
  server/routes/turn.horrorGrammar1.test.ts \
  src/lib/ratificationPipeline.horrorGrammar1.test.ts \
  src/lib/turnResponseReader.test.ts
```

On Windows, remove the variables from the command environment using the native PowerShell equivalent. Automated tests install only deterministic fake values and must pass without real credentials.

Then run:

```bash
npx tsc --noEmit
```

Do not perform the live gate until every focused test and TypeScript pass.

## 12. One-call live Qwen strict-contract gate

This gate determines whether Qwen is actually admitted. Mock success is insufficient.

Inspect only whether the ordinary local execution environment contains nonblank values for:

```text
DASHSCOPE_API_KEY
QWEN_BASE_URL
```

Never print, log, copy, transform, hash, partially reveal, count, or expose either value.

If either is absent, record exactly:

```text
LIVE_QWEN_PROOF_PENDING
```

The implementation may be reported as complete, but Qwen is **not admitted** and Packet 1-11B remains blocked.

If both are present:

1. Create one temporary local probe outside tracked source.
2. Call `generateStructuredResponse()` exactly once with:
   - `EngineTurnStructuredResponseContract`;
   - explicit Qwen selection;
   - the pinned `QWEN_ENGINE_MODEL_ID`;
   - a synthetic, nonprivate prompt requesting a concise safe Engine turn;
   - explicit neutral HG1 envelopes where no active change is justified.
3. Do not call Gemini.
4. Do not retry.
5. Do not downgrade to JSON Object mode.
6. Do not make a second formatting call.
7. Do not print generated prose or the parsed payload.
8. Print only this bounded success summary:

```json
{
  "provider": "qwen",
  "model": "qwen3.7-flash-2026-07-15",
  "providerCallCount": 1,
  "schemaAccepted": true,
  "zodAccepted": true,
  "allHg1EnvelopesPresent": true
}
```

9. Remove the temporary probe.
10. Prove the working tree contains no probe artifact.

Any 4xx/5xx, refusal, empty content, invalid JSON, missing field, Zod error, timeout, or unsupported strict-schema response means Qwen is not admitted. Report the bounded status/code and stop. Do not perform schema surgery beyond this packet, change the model, change the region automatically, or begin Packet 1-11B.

If the configured endpoint is in a region that does not support strict JSON Schema, report exactly:

```text
QWEN_STRICT_SCHEMA_UNAVAILABLE_IN_CONFIGURED_REGION
```

The User can then configure a supported regional API host and rerun the same one-call gate.

## 13. Full stabilization gate

After the focused gate and live-gate attempt, run:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
git status --short
```

Also run:

```bash
rg -n "DASHSCOPE_API_KEY|GEMINI_API_KEY|QWEN_BASE_URL" \
  src dist/assets -g '!*.map'
```

Expected result: no client source or built client asset contains credential access or private configuration values. Server-only references and empty documentation placeholders are allowed outside `src` and `dist/assets`.

Run:

```bash
rg -n "retry|fallback|repair|second call|json_object" \
  server/ai server/utils/aiClient.ts server/routes/turn.ts
```

Inspect every result. Tests and comments may state that these behaviors are prohibited. No live structured-generation branch may retry, fall back, repair provider output, or downgrade Qwen to `json_object`.

No verification command may print a real credential or the contents of `.env`.

## 14. Completion criteria

Packet 1-11A is implementation-complete only when all of the following are true:

- the provider-neutral types and dispatch boundary exist;
- the canonical Engine structured-turn path can select Gemini or Qwen before generation;
- Gemini remains the default when no provider override exists;
- exactly one pinned Qwen model exists;
- Qwen receives strict standard JSON Schema derived deterministically from the existing paired provider projection;
- the Qwen adapter makes one HTTP call and performs no parsing, ratification, retry, repair, or fallback;
- both providers cross the same JSON/Zod ingress parser;
- every Packet 1-10A HG1 soundness and containment test remains green;
- real route tests cross the Qwen HTTP seam and existing ratifiers;
- private local environment loading works in development and production entry paths;
- `.env` remains ignored and no credential reaches client assets or public artifacts;
- focused tests, full Vitest, TypeScript, lint, build, and diff checks pass.

Qwen is admission-complete only when the one-call live proof additionally reports:

```text
schemaAccepted: true
zodAccepted: true
allHg1EnvelopesPresent: true
providerCallCount: 1
```

Do not describe Qwen as admitted, production-ready, selectable, or available to the User if the live proof is pending or failed.

Do not begin Packet 1-11B until Qwen admission is complete.

## 15. Required final report

Report only:

- start commit;
- end commit;
- final working-tree status;
- files added and modified;
- provider-neutral boundary summary;
- Gemini automated regression result;
- Qwen projection/unit/route results;
- full Vitest file/test counts;
- TypeScript result;
- lint result;
- build result;
- `git diff --check` result;
- `.env` ignore/tracking result;
- client credential scan result;
- live Qwen credential presence as `PRESENT` or `ABSENT`, never the values;
- live Qwen provider call count;
- live Qwen schema/Zod/HG1 result, or the exact pending/failure marker;
- whether Packet 1-11B is `UNBLOCKED` or `BLOCKED`.

Do not report implementation completion from mocked tests alone. Do not print raw provider responses, generated prose, prompts, endpoint values, headers, `.env` contents, or credentials.
