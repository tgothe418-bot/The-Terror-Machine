# 1-10A — HG1 Exact Provider Closure and Source-Backed Export Hotfix

**Series:** TTM Horror Grammar 1 — Provider Closure Correction

**Execution packet:** Corrective successor to Packet 1-10

**Required baseline:** `ca6f569d2cac65424dd6de45ee73b4bb4c5b30b2`

**Priority:** Critical. Complete this packet before Forge feature work, intro work, pruning, CI, Director expansion, Horror Grammar 2, or any new capability.

**Execution mode:** One packet, two strictly ordered tracks:

1. Close the HG1 Gemini/Zod/prompt/ratifier boundary completely.
2. After the HG1 focused gate passes, repair the source-backed Blueprint export failure.

Do not split this packet. Do not report completion after merely adding tests or making the existing tests green. Execute every numbered section and every final gate.

## Governing invariants

- One User action causes exactly one structured Gemini generation.
- Gemini output is proposal material, never canonical state.
- Existing deterministic ratifiers alone decide what becomes fiction or state.
- All six HG1 proposal envelopes are required on every successful turn.
- Missing, malformed, refused, empty, or rejected material preserves canonical pre-state.
- Explicit neutral envelopes remain valid.
- Rejected manifestation text stays outside ordinary fiction, memory, World Memory, next-turn prompts, canonical state, Retake replacement state, and ordinary exports.
- The User-controlled character cannot receive autonomous activity, pursuit evolution, development, or imposed choices.
- Prompt context is canonical, deterministic, explicitly capped, and contains no raw provider payload, rejected text, forensic UI state, stack, credential, endpoint, or diagnostic material.
- No second model call, retry generation, background loop, parallel horror engine, SDK migration, model change, or provider-policy change.
- The export hotfix may repair compilation context and error reporting only. It must not redesign Forge, Blueprint, topology, Depiction, Engine Setup, or perspective selection.

## 0. Start gate

Run:

```bash
git rev-parse HEAD
git status --short
```

Stop immediately unless:

- `HEAD` is exactly `ca6f569d2cac65424dd6de45ee73b4bb4c5b30b2`; and
- the working tree contains no unrelated changes overlapping the files in this packet.

Read these exact owners before editing:

- `server/utils/aiClient.ts`
- `server/utils/aiClient.test.ts`
- `server/routes/turn.ts`
- `server/routes/turn.horrorGrammar1.test.ts`
- `src/types/engineContract.ts`
- `src/types/horrorGrammar.ts`
- `src/lib/valueState.ts`
- `src/lib/characterPursuits.ts`
- `src/lib/characterDevelopment.ts`
- `src/lib/situatedPressure.ts`
- `src/components/forge/ExportReviewModal.tsx`
- `src/components/forge/ExportReviewModal.test.tsx`
- `src/lib/forgeCompiler.ts`
- `src/lib/sourceBaseline.ts`

Record the start revision and working-tree status in the final report.

## 1. Write the failing correction tests first

Add these exact test names before implementation:

```text
provider and Zod contracts agree on every HG1 discriminant enum bound and manifestation shape
every active HG1 provider variant survives the paired ingress parser
provider permitted malformed HG1 variants do not exist
generateStructuredResponse has no unpaired Zod-only fallback
SDK seam runs without a real Gemini credential
HG1 prompt projection is sorted capped canonical and evidence-addressable
HG1 prompt cause contract matches exact ratifier causes
fabricated causal prefixes are rejected by every causal HG1 ratifier
conditional ACTIVITY cause is accepted only after same-turn activity acceptance
rejected manifestation sentinels are absent from the next real turn prompt
source-backed compliant Blueprint compiles and enables both export actions
compilation failure cannot display a compliant export banner
```

The tests must fail for the observed pre-fix reasons. Do not weaken an assertion to make a failure disappear.

## Track A — HG1 exact provider closure

## 2. Make the canonical enum lists reusable

In `src/types/horrorGrammar.ts`, replace inline `z.enum([...])` ownership for the provider-facing HG1 enums with exported readonly tuples. Use these names and values exactly:

```ts
export const PERCEPTION_PATHS = [
  'DIRECT',
  'MEDIATED',
  'LOCAL_TRACE',
  'UNOBSERVED',
] as const;

export const PRESSURE_OPERATORS = [
  'EXPOSE',
  'CONSTRAIN_ACCESS',
  'ACCELERATE',
  'CORRUPT_TRUST',
  'DEGRADE_CAPABILITY',
  'CLOSE_DISTANCE',
  'DESTABILIZE_KNOWLEDGE',
  'VIOLATE_EXPECTATION',
  'IMPOSE_COST',
  'OTHER',
] as const;

export const AFFECTED_DIMENSIONS = [
  'ACCESS',
  'KNOWLEDGE',
  'TIME',
  'TRUST',
  'EXPOSURE',
  'CAPABILITY',
  'SAFETY',
  'RELATIONSHIP',
  'FREEDOM',
  'IDENTITY',
  'OTHER',
] as const;

export const PERSISTENCE_TARGETS = [
  'CANONICAL_CONDITION',
  'WORLD_MEMORY',
  'PRESSURE_THREAD',
  'SCENARIO_STATE',
] as const;

export const VALUE_LIFECYCLES = ['ACTIVE', 'REVISED', 'RETIRED'] as const;

export const VALUE_CONDITIONS = [
  'ESTABLISHED',
  'THREATENED',
  'COMPROMISED',
  'SECURED',
  'LOST',
  'TRANSFORMED',
] as const;

export const VALUE_OPERATIONS = [
  'SET_CONDITION',
  'REVISE',
  'RETIRE',
  'RESTORE',
] as const;

export const PURSUIT_STATUSES = [
  'ACTIVE',
  'DORMANT',
  'BLOCKED',
  'COMPLETED',
  'ABANDONED',
] as const;

export const PURSUIT_OPERATIONS = [
  'ADVANCE',
  'SETBACK',
  'REDIRECT',
  'BLOCK',
  'COMPLETE',
  'ABANDON',
  'PAUSE',
  'RESUME',
] as const;

export const DEVELOPMENT_DIMENSIONS = [
  'GOAL',
  'BELIEF',
  'IDENTITY',
  'ATTACHMENT',
  'DISPOSITION',
  'OTHER',
] as const;

export const DEVELOPMENT_OPERATIONS = ['ESTABLISH', 'REVISE', 'RETIRE'] as const;

export const PRESSURE_THREAD_TERMINAL_STATUSES = [
  'RESOLVED',
  'REALIZED',
  'RELEASED',
  'TRANSFORMED',
] as const;
```

Each canonical schema must consume its tuple directly:

```ts
export const PerceptionPathSchema = z.enum(PERCEPTION_PATHS);
export const PressureOperatorSchema = z.enum(PRESSURE_OPERATORS);
export const AffectedDimensionSchema = z.enum(AFFECTED_DIMENSIONS);
export const PersistenceTargetSchema = z.enum(PERSISTENCE_TARGETS);
export const ValueLifecycleSchema = z.enum(VALUE_LIFECYCLES);
export const ValueConditionSchema = z.enum(VALUE_CONDITIONS);
export const ValueOperationSchema = z.enum(VALUE_OPERATIONS);
export const PursuitStatusSchema = z.enum(PURSUIT_STATUSES);
export const PursuitOperationSchema = z.enum(PURSUIT_OPERATIONS);
export const DevelopmentDimensionSchema = z.enum(DEVELOPMENT_DIMENSIONS);
export const DevelopmentOperationSchema = z.enum(DEVELOPMENT_OPERATIONS);
```

Use `z.enum(PRESSURE_THREAD_TERMINAL_STATUSES)` for `PressureThreadTransitionProposalEntrySchema.proposedStatus`.

Also bind the four causal-reference strings to the same provider cap. In
`ValueStateProposalEntrySchema`, `CharacterPursuitProposalEntrySchema`,
`CharacterDevelopmentProposalEntrySchema`, and
`PressureThreadTransitionProposalEntrySchema`, replace the current
`causeReference` declaration with:

```ts
causeReference: z.string().trim().min(1).max(300),
```

Remove the nested neutral-array defaults as well. These four envelope members
must be explicitly present rather than synthesized by Zod:

```ts
// ValueStateProposalSchema
changes: z.array(ValueStateProposalEntrySchema).max(3),

// CharacterPursuitProposalSchema
changes: z.array(CharacterPursuitProposalEntrySchema).max(2),

// CharacterDevelopmentProposalSchema
changes: z.array(CharacterDevelopmentProposalEntrySchema).max(2),

// PressureThreadTransitionProposalSchema
transitions: z.array(PressureThreadTransitionProposalEntrySchema).max(2),
```

Tighten optional ID fields so the canonical parser and provider projection have
the same non-empty semantics:

```ts
// CastActivityProposalActiveSchema
pursuitId: z.string().min(1).nullable().optional(),
locationNodeId: z.string().min(1).nullable().optional(),

// CharacterPursuitProposalEntrySchema
proposedLocationNodeId: z.string().min(1).nullable().optional(),

// CharacterDevelopmentProposalEntrySchema
targetFactId: z.string().min(1).nullable().optional(),
```

Do not change any value or broaden any canonical enum.

## 3. Replace the six Gemini HG1 definitions with an exact constrained projection

In `server/utils/aiClient.ts`, import the tuples above from `../../src/types/horrorGrammar`.

Add these helpers immediately before `turnResponseSchema`:

```ts
const enumStringSchema = (values: readonly string[]): Schema => ({
  type: Type.STRING,
  format: 'enum',
  enum: [...values],
});

const nonEmptyStringSchema = (maxLength?: number): Schema => ({
  type: Type.STRING,
  minLength: '1',
  ...(maxLength === undefined ? {} : { maxLength: String(maxLength) }),
});

const nonBlankStringSchema = (maxLength?: number): Schema => ({
  type: Type.STRING,
  minLength: '1',
  pattern: '\\S',
  ...(maxLength === undefined ? {} : { maxLength: String(maxLength) }),
});

const nonEmptyStringArraySchema: Schema = {
  type: Type.ARRAY,
  items: nonBlankStringSchema(),
};

const manifestationBlockResponseSchema: Schema = {
  anyOf: [
    {
      type: Type.OBJECT,
      properties: {
        type: enumStringSchema(['prose']),
        content: nonBlankStringSchema(2000),
      },
      required: ['type', 'content'],
    },
    {
      type: Type.OBJECT,
      properties: {
        type: enumStringSchema(['dialogue']),
        speaker: nonBlankStringSchema(100),
        content: nonBlankStringSchema(1000),
      },
      required: ['type', 'speaker', 'content'],
    },
  ],
};

const nullableManifestationBlockResponseSchema: Schema = {
  ...manifestationBlockResponseSchema,
  nullable: true,
};
```

Replace the six properties inside `turnResponseSchema.properties` with the following exact shapes. Preserve the six names in the root `required` array.

### 3.1 `cast_activity_proposal`

```ts
cast_activity_proposal: {
  anyOf: [
    {
      type: Type.OBJECT,
      properties: {
        kind: enumStringSchema(['NONE']),
        reason: { type: Type.STRING, maxLength: '200' },
      },
      required: ['kind'],
    },
    {
      type: Type.OBJECT,
      properties: {
        kind: enumStringSchema(['ACTIVITY']),
        proposalId: nonEmptyStringSchema(),
        castMemberId: nonEmptyStringSchema(),
        pursuitId: { ...nonEmptyStringSchema(), nullable: true },
        locationNodeId: { ...nonEmptyStringSchema(), nullable: true },
        perceptionPath: enumStringSchema(PERCEPTION_PATHS),
        activitySummary: nonBlankStringSchema(500),
        authorityReferences: nonEmptyStringArraySchema,
        manifestationBlock: nullableManifestationBlockResponseSchema,
      },
      required: [
        'kind',
        'proposalId',
        'castMemberId',
        'perceptionPath',
        'activitySummary',
      ],
    },
  ],
},
```

### 3.2 `situated_pressure_proposal`

```ts
situated_pressure_proposal: {
  anyOf: [
    {
      type: Type.OBJECT,
      properties: {
        kind: enumStringSchema(['NONE']),
        reason: { type: Type.STRING, maxLength: '200' },
      },
      required: ['kind'],
    },
    {
      type: Type.OBJECT,
      properties: {
        kind: enumStringSchema(['PRESSURE']),
        proposalId: nonEmptyStringSchema(),
        valueAnchorId: nonEmptyStringSchema(),
        sourceReference: nonEmptyStringSchema(),
        operator: enumStringSchema(PRESSURE_OPERATORS),
        affectedDimension: enumStringSchema(AFFECTED_DIMENSIONS),
        adverseProspect: nonBlankStringSchema(500),
        authorityReferences: nonEmptyStringArraySchema,
        persistenceTarget: enumStringSchema(PERSISTENCE_TARGETS),
        responseWindowOpen: { type: Type.BOOLEAN },
        manifestationBlock: nullableManifestationBlockResponseSchema,
      },
      required: [
        'kind',
        'proposalId',
        'valueAnchorId',
        'sourceReference',
        'operator',
        'affectedDimension',
        'adverseProspect',
      ],
    },
  ],
},
```

### 3.3 `value_state_proposal`

```ts
value_state_proposal: {
  type: Type.OBJECT,
  properties: {
    changes: {
      type: Type.ARRAY,
      maxItems: '3',
      items: {
        type: Type.OBJECT,
        properties: {
          anchorId: nonEmptyStringSchema(),
          operation: enumStringSchema(VALUE_OPERATIONS),
          expectedBeforeCondition: enumStringSchema(VALUE_CONDITIONS),
          expectedBeforeLifecycle: enumStringSchema(VALUE_LIFECYCLES),
          proposedCondition: enumStringSchema(VALUE_CONDITIONS),
          proposedLifecycle: enumStringSchema(VALUE_LIFECYCLES),
          proposedFormNote: { type: Type.STRING, maxLength: '300', nullable: true },
          causeReference: nonBlankStringSchema(300),
          rationale: nonBlankStringSchema(300),
        },
        required: [
          'anchorId',
          'operation',
          'proposedCondition',
          'causeReference',
          'rationale',
        ],
      },
    },
  },
  required: ['changes'],
},
```

### 3.4 `character_pursuit_proposal`

```ts
character_pursuit_proposal: {
  type: Type.OBJECT,
  properties: {
    changes: {
      type: Type.ARRAY,
      maxItems: '2',
      items: {
        type: Type.OBJECT,
        properties: {
          pursuitId: nonEmptyStringSchema(),
          operation: enumStringSchema(PURSUIT_OPERATIONS),
          expectedStatus: enumStringSchema(PURSUIT_STATUSES),
          proposedObjective: nonBlankStringSchema(300),
          proposedApproach: nonBlankStringSchema(300),
          proposedLocationNodeId: { ...nonEmptyStringSchema(), nullable: true },
          proposedStatus: enumStringSchema(PURSUIT_STATUSES),
          progressSummary: nonBlankStringSchema(300),
          causeReference: nonBlankStringSchema(300),
          rationale: nonBlankStringSchema(300),
        },
        required: [
          'pursuitId',
          'operation',
          'progressSummary',
          'causeReference',
          'rationale',
        ],
      },
    },
  },
  required: ['changes'],
},
```

### 3.5 `character_development_proposal`

```ts
character_development_proposal: {
  type: Type.OBJECT,
  properties: {
    changes: {
      type: Type.ARRAY,
      maxItems: '2',
      items: {
        type: Type.OBJECT,
        properties: {
          castMemberId: nonEmptyStringSchema(),
          operation: enumStringSchema(DEVELOPMENT_OPERATIONS),
          targetFactId: { ...nonEmptyStringSchema(), nullable: true },
          dimension: enumStringSchema(DEVELOPMENT_DIMENSIONS),
          statement: nonBlankStringSchema(300),
          causeReference: nonBlankStringSchema(300),
          rationale: nonBlankStringSchema(300),
        },
        required: [
          'castMemberId',
          'operation',
          'dimension',
          'statement',
          'causeReference',
          'rationale',
        ],
      },
    },
  },
  required: ['changes'],
},
```

### 3.6 `pressure_transition_proposal`

```ts
pressure_transition_proposal: {
  type: Type.OBJECT,
  properties: {
    transitions: {
      type: Type.ARRAY,
      maxItems: '2',
      items: {
        type: Type.OBJECT,
        properties: {
          threadId: nonEmptyStringSchema(),
          proposedStatus: enumStringSchema(PRESSURE_THREAD_TERMINAL_STATUSES),
          causeReference: nonBlankStringSchema(300),
          replacementAdverseProspect: nonBlankStringSchema(500),
          rationale: nonBlankStringSchema(300),
        },
        required: ['threadId', 'proposedStatus', 'causeReference', 'rationale'],
      },
    },
  },
  required: ['transitions'],
},
```

Do not add `system_voice` or `environmental_description` to `manifestationBlock`. Those are legal ordinary `narrative_blocks`, not legal isolated HG1 manifestation alternatives.

The installed `@google/genai` `Schema.enum` property is typed as `string[]` even for `Type.INTEGER`; its own declaration documents integer enum examples using string literals. Therefore retain the existing relationship delta schema as `type: Type.INTEGER` with `enum: ['-1', '1']`, but add the proof required in Section 5 that emitted/provider-shaped JSON is numeric `-1 | 1`, never a string and never zero. Do not replace it with a string field.

## 4. Remove the unpaired generator fallback completely

Replace the live function signature and setup in `server/utils/aiClient.ts` with this contract-only form:

```ts
export const generateStructuredResponse = async <T>(
  prompt: string,
  contract: StructuredResponseContract<T>
): Promise<T> => {
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  const policy = getGeminiPolicy('ENGINE_TURN');
  const response = await getAiClient().models.generateContent({
    model: policy.model,
    contents,
    config: {
      thinkingConfig: {
        thinkingLevel: policy.thinkingLevel,
      },
      responseMimeType: 'application/json',
      responseSchema: contract.responseSchema,
    },
  });

  const classification = classifyProviderResponse(response);
  if (classification.kind === 'PROVIDER_REFUSAL') {
    throw new ProviderRefusalError(classification.reason);
  }
  if (classification.kind === 'EMPTY_PROVIDER_RESPONSE') {
    throw new EmptyProviderResponseError();
  }

  return parseStructuredTurnResponse(classification.text, contract.zodSchema);
};
```

Delete all of the following:

- the `contractOrSchema` union parameter;
- structural detection of `responseSchema` / `zodSchema`;
- `CUSTOM_ZOD_SCHEMA`;
- any fallback to module-global `turnResponseSchema` when a caller supplies only Zod.

All production callers must pass a named paired contract. `/api/turn` must continue to call:

```ts
generateStructuredResponse(prompt, EngineTurnStructuredResponseContract)
```

Run:

```bash
rg -n "generateStructuredResponse\(" server src
rg -n "contractOrSchema|CUSTOM_ZOD_SCHEMA" server src
```

The second command must return no matches. Every non-declaration call found by the first command must pass a paired contract.

## 5. Make the provider soundness gate real and credential-independent

### 5.1 Test-only credential setup

The SDK-seam suites must pass when the shell has no real Gemini credential. They may provide a deterministic fake key solely so `getAiClient()` can construct the mocked/spied SDK client.

In `server/utils/aiClient.test.ts`, import `afterAll` and install only the
credential fixture before module initialization:

```ts
const { originalGeminiKey } = vi.hoisted(() => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'ttm-hg1-test-only-key';
  return { originalGeminiKey };
});
```

In `server/routes/turn.horrorGrammar1.test.ts`, import `afterAll` and adapt the
existing SDK mock with this hoisted setup. Do not mock
`generateStructuredResponse()`:

```ts
const { mockGenerateContent, originalGeminiKey } = vi.hoisted(() => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'ttm-hg1-test-only-key';
  return {
    mockGenerateContent: vi.fn(),
    originalGeminiKey,
  };
});
```

Restore the original environment value in `afterAll`:

```ts
afterAll(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});
```

Do not use a real key in automated tests. Do not mock `generateStructuredResponse`, `parseStructuredTurnResponse`, the route, or any ratifier.

### 5.2 Provider-valid fixtures

Every SDK-returned success fixture must satisfy both the Gemini schema and `TurnResultSchema`. In particular, every `logic_state` fixture must explicitly include:

```ts
logic_state: {
  current_phase: 'MANIFEST',
  requested_transition: null,
  suggested_tension: 20,
  terminal_flags: [],
  cast_deltas: [],
},
```

Do not call a fixture “provider-shaped” while omitting fields that the provider schema requires.

### 5.3 Required soundness assertions

Expand `server/utils/aiClient.test.ts` so the named tests prove all of the following:

1. All live `TurnResultSchema` root fields are declared by the Gemini schema.
2. All six HG1 fields are in the Gemini root `required` list.
3. All six are required by `TurnResultSchema`; deleting each one fails.
4. Every explicit neutral envelope parses, while omitting `changes` or
   `transitions` from the four array envelopes fails instead of creating `[]`.
5. One active variant for each of the six fields parses through `EngineTurnStructuredResponseContract.zodSchema`.
6. The provider persistence enum equals `PERSISTENCE_TARGETS` exactly.
7. The provider manifestation union contains exactly:
   - prose with required `type` and `content`;
   - dialogue with required `type`, `speaker`, and `content`.
8. Provider activity summary is capped at 500.
9. Provider activity and pressure manifestations enforce the canonical 2000/1000 content bounds and 100-character speaker bound.
10. Provider list caps are exactly value 3, pursuit 2, development 2, transition 2.
11. Invalid activity/pressure discriminants fail.
12. A persistence value outside `PERSISTENCE_TARGETS` fails.
13. `system_voice`, `environmental_description`, and dialogue without speaker fail as HG1 manifestations.
14. Over-limit proposal arrays fail.
15. Empty/blank required canonical strings fail.
16. Relationship delta numeric `-1` and `1` parse; string `'-1'`, string `'1'`, and numeric `0` fail.
17. The SDK receives the exact `contract.responseSchema` object.
18. The returned text is parsed by the exact `contract.zodSchema` object.

Do not satisfy these checks with snapshots of manually rewritten types. Inspect the exported Gemini schema and parse raw JSON through the paired Zod owner.

## 6. Close causal-reference ownership

The current ratifiers accept arbitrary `act-*`, `thr-*`, or `csq-*` prefixes even when those IDs were never admitted. Remove that permissive behavior.

Create `src/lib/horrorGrammarCauseReferences.ts` with this exact owner:

```ts
import type { ActionKind } from '../types/engineContract';

export interface BuildHorrorGrammarValidCausesInput {
  actionKind: ActionKind;
  acceptedActivityEventId?: string | null;
  appliedConsequenceReferences?: readonly string[];
}

export const HG1_UNCONDITIONAL_CAUSE_REFERENCES = [
  'USER_ACTION',
  'BASELINE',
] as const;

export function buildHorrorGrammarValidCauses({
  actionKind,
  acceptedActivityEventId = null,
  appliedConsequenceReferences = [],
}: BuildHorrorGrammarValidCausesInput): string[] {
  const causes = [
    ...HG1_UNCONDITIONAL_CAUSE_REFERENCES,
    actionKind,
    ...(acceptedActivityEventId ? [acceptedActivityEventId, 'ACTIVITY'] : []),
    ...[...appliedConsequenceReferences].sort((a, b) => a.localeCompare(b)),
  ];

  return [...new Set(causes.filter((cause) => cause.trim().length > 0))];
}

export function isHorrorGrammarCauseReferenceValid(
  causeReference: string,
  validCauses: readonly string[]
): boolean {
  return validCauses.includes(causeReference);
}

export const HG1_CAUSE_REFERENCE_PROMPT = `[HG1 CAUSE REFERENCE CONTRACT]
Unconditional exact references:
• USER_ACTION
• BASELINE
Conditional exact references:
• The exact action_kind emitted in intent_proposal, only when that action kind is the cause.
• ACTIVITY, only when this same response emits an ACTIVITY proposal and that proposal survives ratification.
• csq-<DOMAIN>-<OPERATION>, only when this same response emits the matching consequence mutation and that mutation survives ratification.
Do not invent event IDs, thread IDs, consequence IDs, prefixes, aliases, or CANONICAL_CONDITION. When no listed cause precisely supports a change, emit the explicit neutral HG1 envelope.`;
```

In all four causal ratifier input interfaces, make `validCauses` required and readonly:

```ts
validCauses: readonly string[];
```

Remove each `validCauses = []` default.

In these four files:

- `src/lib/valueState.ts`
- `src/lib/characterPursuits.ts`
- `src/lib/characterDevelopment.ts`
- `src/lib/situatedPressure.ts` (`resolvePressureThreadTransitions` only)

replace the complete permissive cause expression with:

```ts
const isCauseValid = isHorrorGrammarCauseReferenceValid(
  causeReference,
  validCauses
);
```

Import the helper. Delete all unconditional acceptance of `USER_ACTION`, `ACTIVITY`, `act-*`, `thr-*`, and `csq-*` from individual ratifiers. The exact set supplied by the route is the only authority.

In `server/routes/turn.ts`, replace manual `validCauses` construction with:

```ts
const validCauses = buildHorrorGrammarValidCauses({
  actionKind: intentReceipt.action_kind,
  acceptedActivityEventId: castActivityProposalReceipt.acceptedEventId,
  appliedConsequenceReferences: (canonicalConsequenceReceipt.decisions || [])
    .filter((decision) => decision.outcome === 'APPLIED')
    .map(
      (decision) =>
        `csq-${decision.mutation.domain}-${decision.mutation.operation}`
    ),
});
```

Import and embed `HG1_CAUSE_REFERENCE_PROMPT` in the HG1 prompt. Delete the current hardcoded array containing `CANONICAL_CONDITION`.

Update direct ratifier tests to pass an explicit exact cause list. This is a mechanical fixture correction, not permission to weaken causal rejection.

## 7. Bound and complete the HG1 prompt projection

In `server/routes/turn.ts`, define these caps near the HG1 formatting owner:

```ts
const HG1_PROMPT_CAPS = Object.freeze({
  presentOpportunities: 6,
  offscreenOpportunities: 2,
  valueAnchors: 8,
  pursuitOverlays: 8,
  developmentFacts: 12,
  pressureThreads: 5,
  evidenceEntries: 12,
  textCharacters: 500,
});
```

Use deterministic helpers:

```ts
const clipPromptText = (value: string | null | undefined): string => {
  const normalized = (value || '').trim();
  return normalized.length <= HG1_PROMPT_CAPS.textCharacters
    ? normalized
    : `${normalized.slice(0, HG1_PROMPT_CAPS.textCharacters - 1)}…`;
};

const compareIds = (a: string, b: string): number => a.localeCompare(b);
```

Before formatting:

1. Copy every source array before sorting.
2. Sort opportunities by `castMemberId`, then `pursuitId || ''`.
3. Cap present opportunities at 6 and offscreen opportunities at 2.
4. Sort relevant value anchors by `id`; cap at 8.
5. Build relevant non-User cast and pursuit ID sets from the capped opportunities.
6. Sort pursuit records by `pursuitId`; include only non-User relevant pursuits; cap at 8.
7. Flatten active development facts for relevant non-User cast, sort by `castMemberId` then fact `id`; cap at 12.
8. Sort open pressure threads by `id`; cap at 5.
9. Sort canonical `evidenceRegistry` entries by `id`; cap at 12.
10. Clip every free-text prompt projection to 500 characters.

The formatted pursuit line must include all material current state:

```text
• [pursuitId] Cast ID: castMemberId | Status: status | Objective: "currentObjective" | Approach: "currentApproach" | Location: currentLocationNodeId-or-NONE | Progress: "progressSummary"
```

The evidence line must use:

```text
• [evidenceId] category | Owner: ownerRef | "description"
```

The HG1 prompt section must contain these exact headings:

```text
Current Value States:
Current Character Pursuit Overlays:
Current Character Development Facts:
Active Pressure Threads (Eligible for Transition):
Available Authority Evidence:
[HG1 CAUSE REFERENCE CONTRACT]
```

Do not project the entire store. Do not include forensic records, proposal snapshots, rejected material, or prior raw model JSON.

## 8. Strengthen the real SDK-seam route proof

Keep `server/routes/turn.horrorGrammar1.test.ts` at the external SDK seam. It may mock only `@google/genai` `generateContent()`.

The suite must capture and assert the exact SDK request on an active HG1 case:

```ts
const sdkRequest = mockGenerateContent.mock.calls[0][0];
expect(sdkRequest.config.responseSchema).toBe(
  EngineTurnStructuredResponseContract.responseSchema
);
```

Required route cases:

1. Active activity + active pressure accepted through real ratifiers.
2. Active value + pursuit + development + pressure transition accepted through real ratifiers using exact allowed causes and typed pre-state.
3. Each explicit neutral envelope preserves exact pre-state.
4. Missing each HG1 field returns `MODEL_CONTRACT_MISMATCH` and no successful turn.
5. Structural invalidity returns `MODEL_CONTRACT_MISMATCH` before ratification.
6. A fabricated causal prefix parses structurally but every owning ratifier rejects it with `UNSUPPORTED_CAUSE_REFERENCE` and unchanged state.
7. An `ACTIVITY` cause is rejected when activity is `NONE` or rejected.
8. An `ACTIVITY` cause is accepted only when the same-turn activity receipt is accepted.
9. User-targeted activity, pursuit, and development are rejected with unchanged User-owned state.
10. Refusal and empty output return no successful turn, no fictional-time advance, and no HG1 post-state.
11. Accepted post-state becomes the exact typed pre-state of turn two.
12. Rejected activity and pressure manifestation sentinels are absent from:
    - ordinary turn-one narrative;
    - memory and World Memory surfaces;
    - canonical post-state;
    - a captured turn-two prompt generated from the returned turn-one state.

The rejected-text test must actually execute turn two and inspect the second captured SDK prompt. Serializing only the first response is insufficient.

## 9. Focused HG1 gate

Run in this order:

```bash
env -u GEMINI_API_KEY npx vitest run server/utils/aiClient.test.ts src/types/horrorGrammar.test.ts
```

```bash
env -u GEMINI_API_KEY npx vitest run server/utils/aiClient.test.ts server/routes/turn.horrorGrammar1.test.ts src/lib/ratificationPipeline.horrorGrammar1.test.ts src/lib/turnResponseReader.test.ts
```

On Windows, remove `GEMINI_API_KEY` from the command environment using the native shell equivalent. The important assertion is that the automated SDK-seam tests pass without a real credential because the test installs its own fake key before module initialization.

Then run:

```bash
npx tsc --noEmit
```

Do not start Track B until these focused commands and TypeScript pass.

## Track B — Source-backed Blueprint export hotfix

## 10. Pass the source registry through the compilation boundary

In `src/components/forge/ExportReviewModal.tsx`, import `ForgeCompilationError` with the existing compilation exports.

Replace `executeCompilation` with:

```ts
const executeCompilation = (
  draft: typeof draftBlueprint,
  dRev: number,
  bRev: number
): BlueprintExportArtifact | null => {
  if (!draft) return null;
  return prepareBlueprintExport(draft, {
    draftRevision: dRev,
    sourceBaselineRevision: bRev,
    sourceAnalyses,
  });
};
```

Add this pure mapper above the component:

```ts
const mergeCompilationFailure = (
  readiness: ForgeExportReadinessResult,
  error: unknown
): ForgeExportReadinessResult => {
  const compilationErrors: Record<string, string[]> =
    error instanceof ForgeCompilationError
      ? Object.fromEntries(
          Object.entries(error.errors).map(([field, messages]) => [
            `compilation.${field}`,
            messages,
          ])
        )
      : {
          compilation: [
            error instanceof Error
              ? error.message
              : 'Unknown Blueprint compilation failure.',
          ],
        };

  return {
    ...readiness,
    valid: false,
    errors: {
      ...readiness.errors,
      ...compilationErrors,
    },
  };
};
```

Replace the silent initial catch:

```ts
} catch (error: unknown) {
  return {
    artifact: null,
    validation: mergeCompilationFailure(readiness, error),
    draftRevision: currentDraftRev,
    sourceBaselineRevision: currentBaseRev,
  };
}
```

The modal must never show “COMPLIANT” when `artifact` creation failed. Both actions remain disabled on a real compilation failure, but the red validation panel must expose the structured `compilation.*` errors.

Keep refresh compilation bound to the same `sourceAnalyses` registry. On refresh failure, preserve the prior immutable artifact and display the error; do not silently replace it with null.

## 11. Add the exact export regression

Extend `src/components/forge/ExportReviewModal.test.tsx` with a production-shaped source-backed draft:

- one registered source analysis;
- one exact evidence record with `category: 'topology'`;
- one rich `nodeDefinition` containing matching `sourceId` and `evidenceIds`;
- one source-backed topology connection or expandable anchor;
- a compliant canonical Depiction Contract populated in the fixture without a model call;
- no unresolved unknowns;
- all candidates applied;
- the modal mounted through the same conditional-open boundary used by `Forge.tsx`.

Assert:

```ts
expect(container?.textContent).toContain('COMPLIANT');
expect(copyButton.disabled).toBe(false);
expect(downloadButton.disabled).toBe(false);
```

Click both actions and prove their bytes are identical canonical Blueprint JSON.

Add a second case whose draft is readiness-valid but whose
`topology.startingNodeProvenance` names an absent source/evidence pair. The
readiness owner does not inspect that legacy field, while the compiler does;
this deliberately traverses the exact previously swallowed compilation-only
failure. Assert:

```ts
expect(container?.textContent).not.toContain('COMPLIANT');
expect(container?.textContent).toContain('compilation.');
expect(copyButton.disabled).toBe(true);
expect(downloadButton.disabled).toBe(true);
```

The test must fail if `prepareBlueprintExport()` is called without `sourceAnalyses`.

Run:

```bash
npx vitest run src/components/forge/ExportReviewModal.test.tsx src/lib/depictionAndAtomicExport.test.ts src/lib/forgeReadiness.test.ts
```

## 12. Bounded live Gemini provider proof

After all automated focused gates pass, inspect only whether the normal execution environment already contains its ordinary Gemini credential. Never print, log, transform, copy, or expose the credential.

If absent, record exactly:

```text
LIVE_PROVIDER_PROOF_PENDING
```

and do not claim independent Gemini closure.

If present, make exactly one live generation call through `generateStructuredResponse()` and `EngineTurnStructuredResponseContract`. Use a temporary local script containing no uploaded or private source material:

```ts
import {
  EngineTurnStructuredResponseContract,
  generateStructuredResponse,
} from './server/utils/aiClient';

const requiredHg1Fields = [
  'cast_activity_proposal',
  'situated_pressure_proposal',
  'value_state_proposal',
  'character_pursuit_proposal',
  'character_development_proposal',
  'pressure_transition_proposal',
] as const;

const result = await generateStructuredResponse(
  `Produce one compact fictional Engine turn set in an empty maintenance corridor.
Return no dialogue, no consequences, no memory candidates, no topology expansion,
and explicit neutral envelopes for all six Horror Grammar proposal fields.
Use current_phase LATENT, suggested_tension 10, and concise prose.`,
  EngineTurnStructuredResponseContract
);

const missing = requiredHg1Fields.filter((field) => !(field in result));
if (missing.length > 0) {
  throw new Error(`Missing HG1 fields: ${missing.join(', ')}`);
}

console.log(
  JSON.stringify({
    schemaAccepted: true,
    allSixHg1FieldsPresent: true,
    relationshipDeltaEncoding:
      result.character_relationship_proposal.changes.length === 0
        ? 'NOT_EMITTED_IN_NEUTRAL_PROBE'
        : typeof result.character_relationship_proposal.changes[0].delta,
  })
);
```

Run it once with the project’s existing TypeScript execution path, record only the bounded JSON result above, then remove the temporary script before the final diff. Do not retry a failed call. A provider schema rejection, refusal, empty response, or parse failure is a failed live gate and must be reported exactly.

## 13. Final stabilization gate

Run once after both tracks are complete:

```bash
npx vitest run
npx tsc --noEmit
npm run lint
npm run build
git diff --check
barred_first='eve''lyn'
barred_family='van''ce'
barred_other='thor''ne'
git diff --unified=0 ca6f569d2cac65424dd6de45ee73b4bb4c5b30b2 HEAD | rg -n -i "^\+.*(${barred_first}[[:space:]]+${barred_family}|${barred_other})"
git status --short
```

The prohibited-name command must return no added-line matches. Do not claim a repo-wide zero if older historical documents contain inherited text; report the new-diff result accurately.

No skipped test, `test.only`, `describe.only`, `@ts-ignore`, `@ts-expect-error`, broad `any`, `as unknown as`, permissive record cast, weakened Zod schema, silent default, or swallowed compilation error may be introduced.

## Stop conditions

Stop and report the exact owner and evidence if any of these occur:

- the baseline revision differs;
- the installed Gemini API rejects a canonical union or supported schema keyword;
- the complete schema exceeds a documented provider limit;
- exact cause closure would require a second generation;
- structural failure reaches a ratifier;
- rejected manifestation text enters ordinary fiction, memory, next-turn prompt, or canonical state;
- refusal or empty output advances state;
- User-authored intent or choice is generated or mutated;
- source-backed export still fails after `sourceAnalyses` crosses the compilation boundary;
- fixing the remaining defect requires redesigning Forge, topology, Depiction, Engine Setup, or HG1 mechanics.

Do not substitute permissive parsing, neutral defaults, a mock above the SDK seam, manual state mutation, or a narrower completion claim for a stop condition.

## Acceptance gate

This packet is complete only when every statement below is true:

- `/api/turn` uses one paired Gemini/Zod contract with no Zod-only fallback.
- All six HG1 fields are provider-declared, provider-required, and Zod-required.
- Explicit neutral and active forms for all six cross the SDK-shaped boundary.
- Gemini and Zod agree on HG1 discriminants, enums, optionality/nullability, list caps, string bounds, and manifestation alternatives.
- Numeric relationship deltas are proven as numeric `-1 | 1` at parsed ingress.
- Automated SDK-seam tests pass without a real credential.
- Prompt projection is sorted, capped, canonical, evidence-addressable, and complete enough for all six proposals.
- Prompt cause instructions and ratifier cause acceptance share the exact same semantics.
- Fabricated causal prefixes are rejected.
- Conditional activity/consequence causes work only after the owning proposal is ratified.
- Rejection, malformed output, refusal, and empty output remain fail-closed.
- Rejected manifestation text is absent from the next real turn prompt.
- Accepted post-state becomes the next turn’s exact typed pre-state.
- A compliant imported source-backed Blueprint produces one immutable artifact and enables Copy and Download.
- A compiler failure cannot display a compliant banner and exposes structured errors.
- Focused tests, full Vitest, TypeScript, lint, build, and diff checks pass.
- The new-diff prohibited-name scan is clean.
- The live provider result is recorded, or the exact status is `LIVE_PROVIDER_PROOF_PENDING`.
- No non-goal work was started.

## Required final report

Return one consolidated report with exactly these sections:

1. `Revisions and Working Tree`
2. `Paired Provider Contract`
3. `Six HG1 Envelope Parity`
4. `Exact Causal Reference Closure`
5. `Bounded Prompt Projection`
6. `SDK-Seam and Fail-Closed Evidence`
7. `Consecutive-Turn and Rejected-Text Evidence`
8. `Source-Backed Export Repair`
9. `Focused Verification`
10. `Full Stabilization Verification`
11. `Live Provider Proof`
12. `Remaining Critical Defects`

For every command, report the exact exit result and exact file/test count. If the live probe did not run, Section 11 must contain exactly `LIVE_PROVIDER_PROOF_PENDING`. If any critical seam remains open, do not call HG1 or source-backed export closed.
