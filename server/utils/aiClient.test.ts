import { describe, expect, it, vi, afterAll } from 'vitest';
import {
  unwrapStrictJsonResponse,
  parseStructuredTurnResponse,
  classifyProviderResponse,
  ProviderRefusalError,
  EmptyProviderResponseError,
  ProviderRequestRejectedError,
  getAiClient,
  generateStructuredResponse,
  EngineTurnStructuredResponseContract,
} from './aiClient';
import {
  geminiTurnResponseJsonSchema,
  assertGeminiJsonSchemaSubset,
  type GeminiJsonSchema,
} from '../ai/geminiTurnJsonSchema';
import {
  GEMINI_TURN_NULL_SENTINEL,
  normalizeGeminiTurnProviderPayload,
} from '../ai/geminiTurnTransport';
import { TurnResultSchema } from '../schemas/engine';
import {
  PERCEPTION_PATHS,
  PRESSURE_OPERATORS,
  AFFECTED_DIMENSIONS,
  PERSISTENCE_TARGETS,
  VALUE_LIFECYCLES,
  VALUE_CONDITIONS,
  VALUE_OPERATIONS,
  PURSUIT_STATUSES,
  PURSUIT_OPERATIONS,
  DEVELOPMENT_DIMENSIONS,
  DEVELOPMENT_OPERATIONS,
  PRESSURE_THREAD_TERMINAL_STATUSES,
} from '../../src/types/horrorGrammar';

const { originalGeminiKey } = vi.hoisted(() => {
  const originalGeminiKey = process.env.GEMINI_API_KEY;
  process.env.GEMINI_API_KEY = 'ttm-hg1-test-only-key';
  return { originalGeminiKey };
});

afterAll(() => {
  if (originalGeminiKey === undefined) {
    delete process.env.GEMINI_API_KEY;
  } else {
    process.env.GEMINI_API_KEY = originalGeminiKey;
  }
});

const HG1_FIELDS = [
  'cast_activity_proposal',
  'situated_pressure_proposal',
  'value_state_proposal',
  'character_pursuit_proposal',
  'character_development_proposal',
  'pressure_transition_proposal',
] as const;

function createBaseValidPayload(): Record<string, unknown> {
  return {
    narrative_blocks: [
      { type: 'dialogue', speaker: 'Dr. Vane', content: 'Did you hear that sound in the ventilation?' },
      { type: 'prose', content: 'The station hull groans under the benthic pressure.' },
    ],
    intent_proposal: {
      action_kind: 'COMMUNICATE',
      action_subtype: null,
      pressure_direction: 'MAINTAIN',
      dramatic_tactic: 'EXPOSURE',
      intent_synergy: 'SUCCESS',
    },
    reconciliation_proposal: {
      mode: 'CANONICAL',
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      fictional_time_cost: 'MOMENT',
      authority_alignment: 'WITHIN_CONTRACT',
      memory_echo_candidate: 'ventilation rumble',
    },
    consequence_proposal: {
      mutations: [
        {
          domain: 'INVENTORY',
          operation: 'ADD',
          value: 'Acoustic Sensor Key',
          rationale: 'Retrieved from console.',
        },
      ],
    },
    character_stance_proposal: {
      changes: [
        {
          character_id: 'char-vane',
          focus: 'PLAYER',
          stance: 'GUARDED',
          rationale: 'Suspicious of protagonist motives.',
        },
      ],
    },
    character_relationship_proposal: {
      changes: [
        {
          source_character_id: 'char-vane',
          target_character_id: 'char-protagonist',
          kind: 'TRUST',
          delta: -1,
          rationale: 'Hesitation during query.',
        },
      ],
    },
    character_memory_proposal: {
      candidates: [
        {
          character_id: 'char-vane',
          fact: 'Protagonist questioned the ventilation noise.',
          source: 'OBSERVED',
          certainty: 'KNOWN',
          rationale: 'Direct interpersonal exchange.',
        },
      ],
    },
    world_memory_proposal: {
      candidates: [
        {
          kind: 'ESTABLISHED_FACT',
          scope: 'GLOBAL',
          node_id: null,
          statement: 'Sub-level power distribution is failing.',
          rationale: 'Station telemetry fact.',
        },
      ],
    },
    cast_activity_proposal: {
      kind: 'NONE',
      reason: 'NO_OPPORTUNITY_CHOSEN',
    },
    situated_pressure_proposal: {
      kind: 'NONE',
      reason: 'NO_PRESSURE_CHOSEN',
    },
    value_state_proposal: {
      changes: [],
    },
    character_pursuit_proposal: {
      changes: [],
    },
    character_development_proposal: {
      changes: [],
    },
    pressure_transition_proposal: {
      transitions: [],
    },
    logic_state: {
      current_phase: 'MANIFEST',
      requested_transition: null,
      suggested_tension: 45,
      terminal_flags: [],
      cast_deltas: [],
      cast_ledger: [],
    },
    topologyDelta: {
      isExpansion: false,
      newNodeDef: null,
    },
  };
}

describe('Structured AI Response Handling', () => {
  it('unwraps markdown fences from structured output', () => {
    const raw = '```json\n{"test": true}\n```';
    expect(unwrapStrictJsonResponse(raw)).toBe('{"test": true}');
  });

  it('preserves text without fences', () => {
    const raw = '{"test": true}';
    expect(unwrapStrictJsonResponse(raw)).toBe('{"test": true}');
  });

  it('classifies successful responses as SUCCESS', () => {
    const result = classifyProviderResponse({
      text: '{"narrative_blocks":[]}',
    });
    expect(result.kind).toBe('CONTENT');
    if (result.kind === 'CONTENT') {
      expect(result.text).toBe('{"narrative_blocks":[]}');
    }
  });

  it('classifies empty responses as EMPTY_PROVIDER_RESPONSE', () => {
    const result = classifyProviderResponse({ text: '' });
    expect(result.kind).toBe('EMPTY_PROVIDER_RESPONSE');
  });

  it('classifies safety blocks as PROVIDER_REFUSAL', () => {
    const result = classifyProviderResponse({
      candidates: [
        {
          finishReason: 'SAFETY',
        },
      ],
    });
    expect(result.kind).toBe('PROVIDER_REFUSAL');
    if (result.kind === 'PROVIDER_REFUSAL') {
      expect(result.reason).toContain('SAFETY');
    }
  });

  it('throws EmptyProviderResponseError for empty responses in parseStructuredTurnResponse', () => {
    expect(() => parseStructuredTurnResponse('', TurnResultSchema)).toThrow(
      EmptyProviderResponseError
    );
  });
});

describe('Track D1: Provider schema subset tests (Packet 1-10B)', () => {
  it('provider JSON schema uses only the documented TTM Gemini allowlist', () => {
    expect(() => assertGeminiJsonSchemaSubset(geminiTurnResponseJsonSchema)).not.toThrow();

    const invalidSchemaWithDisallowedKey = {
      ...geminiTurnResponseJsonSchema,
      definitions: {},
    };
    expect(() => assertGeminiJsonSchemaSubset(invalidSchemaWithDisallowedKey)).toThrow(
      /Disallowed schema keyword "definitions"/
    );
  });

  it('provider JSON schema contains no anyOf or legacy Schema dialect keywords', () => {
    const serialized = JSON.stringify(geminiTurnResponseJsonSchema);
    expect(serialized).not.toContain('"anyOf"');
    expect(serialized).not.toContain('"oneOf"');
    expect(serialized).not.toContain('"allOf"');
    expect(serialized).not.toContain('"format"');
    expect(serialized).not.toContain('"nullable"');
    expect(serialized).not.toContain('"minLength"');
    expect(serialized).not.toContain('"maxLength"');
    expect(serialized).not.toContain('"pattern"');
  });

  it('provider JSON schema uses lowercase types and numeric constraint literals', () => {
    const checkTypesAndLimits = (node: GeminiJsonSchema) => {
      if (node.type) {
        const types = Array.isArray(node.type) ? node.type : [node.type];
        for (const t of types) {
          expect(t).toBe(t.toLowerCase());
          expect(['string', 'number', 'integer', 'boolean', 'array', 'object', 'null']).toContain(t);
        }
      }
      if (node.maxItems !== undefined) {
        expect(typeof node.maxItems).toBe('number');
      }
      if (node.minItems !== undefined) {
        expect(typeof node.minItems).toBe('number');
      }
      if (node.minimum !== undefined) {
        expect(typeof node.minimum).toBe('number');
      }
      if (node.maximum !== undefined) {
        expect(typeof node.maximum).toBe('number');
      }
      if (node.properties) {
        for (const child of Object.values(node.properties)) {
          checkTypesAndLimits(child);
        }
      }
      if (node.items) {
        checkTypesAndLimits(node.items);
      }
    };

    checkTypesAndLimits(geminiTurnResponseJsonSchema);
  });

  it('provider JSON schema declares every TurnResult root property', () => {
    const props = geminiTurnResponseJsonSchema.properties as Record<string, GeminiJsonSchema>;
    expect(props).toBeDefined();

    const zodShape = TurnResultSchema.shape;
    for (const key of Object.keys(zodShape)) {
      expect(props[key], `Gemini schema must declare root property "${key}"`).toBeDefined();
    }
  });

  it('provider JSON schema requires all six HG1 proposal envelopes', () => {
    const required = (geminiTurnResponseJsonSchema.required || []) as string[];
    for (const field of HG1_FIELDS) {
      expect(required, `Gemini schema required list must include "${field}"`).toContain(field);
    }
  });

  it('provider JSON schema keeps nullable transport fields optional to remain live-admissible', () => {
    const props = geminiTurnResponseJsonSchema.properties as Record<string, GeminiJsonSchema>;
    const intent = props.intent_proposal;
    const intentProps = intent.properties as Record<string, GeminiJsonSchema>;
    const reconciliation = props.reconciliation_proposal;

    expect(intent.required).not.toContain('action_subtype');
    expect(intentProps.action_subtype.enum).toEqual(['FLEE', 'HIDE']);
    expect(reconciliation.required).not.toContain('memory_echo_candidate');

    const worldCandidate = (
      (props.world_memory_proposal.properties as Record<string, GeminiJsonSchema>).candidates
        .items as GeminiJsonSchema
    );
    expect(worldCandidate.required).toContain('node_id');
  });

  it('provider JSON schema declares only the canonical narrative block cap', () => {
    const properties = geminiTurnResponseJsonSchema.properties as Record<
      string,
      GeminiJsonSchema
    >;
    expect(properties.narrative_blocks.maxItems).toBe(2);

    const visit = (node: GeminiJsonSchema, path: string): void => {
      if (path !== '$.narrative_blocks') {
        expect(node.maxItems, `Unexpected array cap at ${path}`).toBeUndefined();
      }
      for (const [key, child] of Object.entries(node.properties ?? {})) {
        visit(child, `${path}.${key}`);
      }
      if (node.items) visit(node.items, `${path}[]`);
    };

    for (const [key, child] of Object.entries(properties)) {
      visit(child, `$.${key}`);
    }

    const oversized = createBaseValidPayload();
    oversized.narrative_blocks = Array.from({ length: 3 }, () => ({
      type: 'prose',
      content: 'Bounded by the canonical Zod contract.',
    }));
    expect(TurnResultSchema.safeParse(oversized).success).toBe(false);
  });

  it('provider JSON schema keeps every HG1 discriminant enum domain', () => {
    const props = geminiTurnResponseJsonSchema.properties as Record<string, GeminiJsonSchema>;

    const actProps = props.cast_activity_proposal.properties as Record<string, GeminiJsonSchema>;
    expect(actProps.kind.enum).toEqual(['NONE', 'ACTIVITY']);
    expect(actProps.perceptionPath.enum).toEqual([...PERCEPTION_PATHS]);

    const pressProps = props.situated_pressure_proposal.properties as Record<string, GeminiJsonSchema>;
    expect(pressProps.kind.enum).toEqual(['NONE', 'PRESSURE']);
    expect(pressProps.operator.enum).toEqual([...PRESSURE_OPERATORS]);
    expect(pressProps.affectedDimension.enum).toEqual([...AFFECTED_DIMENSIONS]);
    expect(pressProps.persistenceTarget.enum).toEqual([...PERSISTENCE_TARGETS]);

    const valChangesItem = (props.value_state_proposal.properties as Record<string, GeminiJsonSchema>).changes.items as GeminiJsonSchema;
    const valItemProps = valChangesItem.properties as Record<string, GeminiJsonSchema>;
    expect(valItemProps.operation.enum).toEqual([...VALUE_OPERATIONS]);
    expect(valItemProps.proposedCondition.enum).toEqual([...VALUE_CONDITIONS]);
    expect(valItemProps.proposedLifecycle.enum).toEqual([...VALUE_LIFECYCLES]);
    expect(valItemProps.expectedBeforeCondition.enum).toEqual([...VALUE_CONDITIONS]);
    expect(valItemProps.expectedBeforeLifecycle.enum).toEqual([...VALUE_LIFECYCLES]);

    const purChangesItem = (props.character_pursuit_proposal.properties as Record<string, GeminiJsonSchema>).changes.items as GeminiJsonSchema;
    const purItemProps = purChangesItem.properties as Record<string, GeminiJsonSchema>;
    expect(purItemProps.operation.enum).toEqual([...PURSUIT_OPERATIONS]);
    expect(purItemProps.proposedStatus.enum).toEqual([...PURSUIT_STATUSES]);
    expect(purItemProps.expectedStatus.enum).toEqual([...PURSUIT_STATUSES]);

    const devChangesItem = (props.character_development_proposal.properties as Record<string, GeminiJsonSchema>).changes.items as GeminiJsonSchema;
    const devItemProps = devChangesItem.properties as Record<string, GeminiJsonSchema>;
    expect(devItemProps.operation.enum).toEqual([...DEVELOPMENT_OPERATIONS]);
    expect(devItemProps.dimension.enum).toEqual([...DEVELOPMENT_DIMENSIONS]);

    const transChangesItem = (props.pressure_transition_proposal.properties as Record<string, GeminiJsonSchema>).transitions.items as GeminiJsonSchema;
    const transItemProps = transChangesItem.properties as Record<string, GeminiJsonSchema>;
    expect(transItemProps.proposedStatus.enum).toEqual([...PRESSURE_THREAD_TERMINAL_STATUSES]);
  });

  it('relationship delta is an integer range and never a string enum', () => {
    const props = geminiTurnResponseJsonSchema.properties as Record<string, GeminiJsonSchema>;
    const relChanges = (props.character_relationship_proposal.properties as Record<string, GeminiJsonSchema>).changes.items as GeminiJsonSchema;
    const deltaSchema = (relChanges.properties as Record<string, GeminiJsonSchema>).delta;

    expect(deltaSchema.type).toBe('integer');
    expect(deltaSchema.minimum).toBe(-1);
    expect(deltaSchema.maximum).toBe(1);
    expect(deltaSchema.enum).toBeUndefined();
  });

  it('generateStructuredResponse sends responseJsonSchema and never responseSchema', async () => {
    const client = getAiClient();
    const providerPayload = createBaseValidPayload();
    delete (providerPayload.intent_proposal as Record<string, unknown>).action_subtype;
    delete (providerPayload.reconciliation_proposal as Record<string, unknown>)
      .memory_echo_candidate;
    const worldCandidate = (
      providerPayload.world_memory_proposal as { candidates: Array<Record<string, unknown>> }
    ).candidates[0];
    worldCandidate.node_id = GEMINI_TURN_NULL_SENTINEL;
    const generateSpy = vi.spyOn(client.models, 'generateContent').mockResolvedValueOnce({
      text: JSON.stringify(providerPayload),
    } as never);

    const result = await generateStructuredResponse('Test prompt', EngineTurnStructuredResponseContract);

    expect(generateSpy).toHaveBeenCalledTimes(1);
    const sdkRequest = generateSpy.mock.calls[0][0];

    expect(sdkRequest.config?.responseJsonSchema).toBe(
      EngineTurnStructuredResponseContract.responseJsonSchema
    );
    expect(sdkRequest.config).not.toHaveProperty('responseSchema');

    expect(result.intent_proposal.action_kind).toBe('COMMUNICATE');
    expect(result.intent_proposal.action_subtype).toBeNull();
    expect(result.reconciliation_proposal.memory_echo_candidate).toBeNull();
    expect(result.world_memory_proposal.candidates[0].node_id).toBeNull();
    expect(result.narrative_blocks).toHaveLength(2);

    generateSpy.mockRestore();
  });
});

describe('Track D2: Canonical ingress tests (Packet 1-10B)', () => {
  it('transport normalizer completes only the two known nullable omissions', () => {
    const omittedSubtype = createBaseValidPayload();
    delete (omittedSubtype.intent_proposal as Record<string, unknown>).action_subtype;
    expect(TurnResultSchema.safeParse(omittedSubtype).success).toBe(false);
    expect(
      parseStructuredTurnResponse(
        JSON.stringify(omittedSubtype),
        TurnResultSchema,
        normalizeGeminiTurnProviderPayload
      ).intent_proposal.action_subtype
    ).toBeNull();

    const omittedEcho = createBaseValidPayload();
    delete (omittedEcho.reconciliation_proposal as Record<string, unknown>)
      .memory_echo_candidate;
    expect(TurnResultSchema.safeParse(omittedEcho).success).toBe(false);
    expect(
      parseStructuredTurnResponse(
        JSON.stringify(omittedEcho),
        TurnResultSchema,
        normalizeGeminiTurnProviderPayload
      ).reconciliation_proposal.memory_echo_candidate
    ).toBeNull();
  });

  it('normalizes explicit provider null sentinels only at known paths', () => {
    const payload = createBaseValidPayload();
    (payload.intent_proposal as Record<string, unknown>).action_subtype =
      GEMINI_TURN_NULL_SENTINEL;
    (payload.reconciliation_proposal as Record<string, unknown>).memory_echo_candidate =
      GEMINI_TURN_NULL_SENTINEL;
    const candidate = (
      payload.world_memory_proposal as { candidates: Array<Record<string, unknown>> }
    ).candidates[0];
    candidate.node_id = GEMINI_TURN_NULL_SENTINEL;
    payload.engine_thoughts = GEMINI_TURN_NULL_SENTINEL;

    const parsed = parseStructuredTurnResponse(
      JSON.stringify(payload),
      TurnResultSchema,
      normalizeGeminiTurnProviderPayload
    );

    expect(parsed.intent_proposal.action_subtype).toBeNull();
    expect(parsed.reconciliation_proposal.memory_echo_candidate).toBeNull();
    expect(parsed.world_memory_proposal.candidates[0].node_id).toBeNull();
    expect(parsed.engine_thoughts).toBe(GEMINI_TURN_NULL_SENTINEL);
  });

  it('omission of each HG1 envelope fails TurnResultSchema', () => {
    for (const field of HG1_FIELDS) {
      const omitted = createBaseValidPayload();
      delete (omitted as Record<string, unknown>)[field];
      expect(
        () => parseStructuredTurnResponse(JSON.stringify(omitted), TurnResultSchema),
        `Deleting "${field}" should fail canonical validation`
      ).toThrow();
    }
  });

  it('explicit neutral HG1 envelopes parse without manufacturing defaults', () => {
    const neutral = createBaseValidPayload();
    const parsedNeutral = parseStructuredTurnResponse(
      JSON.stringify(neutral),
      EngineTurnStructuredResponseContract.zodSchema
    );
    expect(parsedNeutral.cast_activity_proposal.kind).toBe('NONE');
    expect(parsedNeutral.situated_pressure_proposal.kind).toBe('NONE');
    expect(parsedNeutral.value_state_proposal.changes).toEqual([]);
    expect(parsedNeutral.character_pursuit_proposal.changes).toEqual([]);
    expect(parsedNeutral.character_development_proposal.changes).toEqual([]);
    expect(parsedNeutral.pressure_transition_proposal.transitions).toEqual([]);
  });

  it('every active HG1 variant parses through the paired Zod contract', () => {
    const active = createBaseValidPayload();
    active.cast_activity_proposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      pursuitId: 'pur-1',
      locationNodeId: 'NODE_CORRIDOR',
      perceptionPath: 'DIRECT',
      activitySummary: 'Technician inspecting conduit.',
      authorityReferences: ['auth-ref-1'],
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'Technician',
        content: 'The conduit is loose.',
      },
    };
    active.situated_pressure_proposal = {
      kind: 'PRESSURE',
      proposalId: 'prop-press-1',
      valueAnchorId: 'val-reactor',
      sourceReference: 'BASELINE',
      operator: 'EXPOSE',
      affectedDimension: 'SAFETY',
      adverseProspect: 'Coolant line leaking toxic gas.',
      authorityReferences: ['auth-press-1'],
      persistenceTarget: 'PRESSURE_THREAD',
      responseWindowOpen: true,
      manifestationBlock: {
        type: 'prose',
        content: 'A hissing sound echoes from the manifold.',
      },
    };
    active.value_state_proposal = {
      changes: [
        {
          anchorId: 'val-reactor',
          operation: 'SET_CONDITION',
          expectedBeforeCondition: 'ESTABLISHED',
          expectedBeforeLifecycle: 'ACTIVE',
          proposedCondition: 'THREATENED',
          proposedLifecycle: 'ACTIVE',
          proposedFormNote: null,
          causeReference: 'USER_ACTION',
          rationale: 'Core heating up.',
        },
      ],
    };
    active.character_pursuit_proposal = {
      changes: [
        {
          pursuitId: 'pur-1',
          operation: 'ADVANCE',
          expectedStatus: 'ACTIVE',
          proposedObjective: 'Patch conduit',
          proposedApproach: 'Use thermal sealant',
          proposedLocationNodeId: 'NODE_CORRIDOR',
          proposedStatus: 'ACTIVE',
          progressSummary: 'Sealant applied.',
          causeReference: 'ACTIVITY',
          rationale: 'Work in progress.',
        },
      ],
    };
    active.character_development_proposal = {
      changes: [
        {
          castMemberId: 'char-tech',
          operation: 'ESTABLISH',
          targetFactId: null,
          dimension: 'BELIEF',
          statement: 'Believes the station is unsafe.',
          causeReference: 'BASELINE',
          rationale: 'Observed reactor instability.',
        },
      ],
    };
    active.pressure_transition_proposal = {
      transitions: [
        {
          threadId: 'thr-1',
          proposedStatus: 'RESOLVED',
          causeReference: 'USER_ACTION',
          replacementAdverseProspect: 'None',
          rationale: 'Valve closed.',
        },
      ],
    };

    const parsedActive = parseStructuredTurnResponse(
      JSON.stringify(active),
      EngineTurnStructuredResponseContract.zodSchema
    );
    expect(parsedActive.cast_activity_proposal.kind).toBe('ACTIVITY');
    expect(parsedActive.situated_pressure_proposal.kind).toBe('PRESSURE');
    expect(parsedActive.value_state_proposal.changes).toHaveLength(1);
    expect(parsedActive.character_pursuit_proposal.changes).toHaveLength(1);
    expect(parsedActive.character_development_proposal.changes).toHaveLength(1);
    expect(parsedActive.pressure_transition_proposal.transitions).toHaveLength(1);
  });

  it('provider-coarse invalid cross-field combinations are rejected by Zod', () => {
    // Missing required fields on active ACTIVITY proposal
    const invalidAct = createBaseValidPayload();
    invalidAct.cast_activity_proposal = {
      kind: 'ACTIVITY',
      reason: 'Missing required active fields',
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidAct), TurnResultSchema)).toThrow();

    // Missing required fields on active PRESSURE proposal
    const invalidPress = createBaseValidPayload();
    invalidPress.situated_pressure_proposal = {
      kind: 'PRESSURE',
      reason: 'Missing required active fields',
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidPress), TurnResultSchema)).toThrow();

    const activeReason = createBaseValidPayload();
    activeReason.cast_activity_proposal = {
      kind: 'ACTIVITY',
      reason: 'This key belongs only to the NONE variant.',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      perceptionPath: 'DIRECT',
      activitySummary: 'Working.',
    };
    expect(() =>
      parseStructuredTurnResponse(JSON.stringify(activeReason), TurnResultSchema)
    ).toThrow();

    const activePressureReason = createBaseValidPayload();
    activePressureReason.situated_pressure_proposal = {
      kind: 'PRESSURE',
      reason: 'This key belongs only to the NONE variant.',
      proposalId: 'prop-pressure-1',
      valueAnchorId: 'value-1',
      sourceReference: 'BASELINE',
      operator: 'EXPOSE',
      affectedDimension: 'SAFETY',
      adverseProspect: 'The failing seal may expose the chamber.',
    };
    expect(() =>
      parseStructuredTurnResponse(JSON.stringify(activePressureReason), TurnResultSchema)
    ).toThrow();

    // Dialogue manifestation block without speaker
    const invalidManifest = createBaseValidPayload();
    invalidManifest.cast_activity_proposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      pursuitId: null,
      locationNodeId: null,
      perceptionPath: 'DIRECT',
      activitySummary: 'Working.',
      authorityReferences: ['ref'],
      manifestationBlock: { type: 'dialogue', content: 'Missing speaker' },
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidManifest), TurnResultSchema)).toThrow();

    // Invalid consequence combination (SET on INVENTORY)
    const invalidCsq = createBaseValidPayload();
    invalidCsq.consequence_proposal = {
      mutations: [
        {
          domain: 'INVENTORY',
          operation: 'SET',
          value: 'Item',
          rationale: 'Invalid op for domain',
        },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidCsq), TurnResultSchema)).toThrow();

    // Invalid World Memory node scope with null node_id
    const invalidWorldNode = createBaseValidPayload();
    invalidWorldNode.world_memory_proposal = {
      candidates: [
        {
          kind: 'ESTABLISHED_FACT',
          scope: 'NODE',
          node_id: null,
          statement: 'Fact',
          rationale: 'Rationale',
        },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidWorldNode), TurnResultSchema)).toThrow();
  });

  it('overlong, blank, invalid-cause, and invalid-ID values remain rejected by Zod or their deterministic ratifier owner', () => {
    // Blank causeReference
    const blankCause = createBaseValidPayload();
    blankCause.value_state_proposal = {
      changes: [
        {
          anchorId: 'a1',
          operation: 'SET_CONDITION',
          proposedCondition: 'LOST',
          causeReference: '   ',
          rationale: 'R',
        },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(blankCause), TurnResultSchema)).toThrow();

    // Over-limit narrative blocks
    const overNarrative = createBaseValidPayload();
    overNarrative.narrative_blocks = [
      { type: 'prose', content: 'Block 1' },
      { type: 'prose', content: 'Block 2' },
      { type: 'prose', content: 'Block 3' },
    ];
    expect(() => parseStructuredTurnResponse(JSON.stringify(overNarrative), TurnResultSchema)).toThrow();

    // Numeric delta 0 rejected by relationship delta schema
    const zeroDelta = createBaseValidPayload();
    (zeroDelta.character_relationship_proposal as { changes: Array<{ delta: unknown }> }).changes[0].delta = 0;
    expect(() => parseStructuredTurnResponse(JSON.stringify(zeroDelta), TurnResultSchema)).toThrow();
  });
});

describe('classifyProviderResponse', () => {
  it('classifies explicit prompt-level block reason as PROVIDER_REFUSAL', () => {
    const res = {
      promptFeedback: { blockReason: 'SAFETY' },
      text: null,
    };
    const result = classifyProviderResponse(res);
    expect(result.kind).toBe('PROVIDER_REFUSAL');
    if (result.kind === 'PROVIDER_REFUSAL') {
      expect(result.reason).toBe('SAFETY');
    }
  });

  it('classifies explicit candidate finishReason as PROVIDER_REFUSAL', () => {
    const refusalReasons = ['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'RECITATION', 'OTHER'];
    for (const finishReason of refusalReasons) {
      const res = {
        candidates: [{ finishReason }],
        text: '',
      };
      const result = classifyProviderResponse(res);
      expect(result.kind).toBe('PROVIDER_REFUSAL');
      if (result.kind === 'PROVIDER_REFUSAL') {
        expect(result.reason).toBe(finishReason);
      }
    }
  });

  it('does not classify unspecified block reason or unspecified finish reason as refusal', () => {
    const resUnspecBlock = {
      promptFeedback: { blockReason: 'BLOCK_REASON_UNSPECIFIED' },
      candidates: [{ finishReason: 'STOP' }],
      text: '{"ok": true}',
    };
    const resultBlock = classifyProviderResponse(resUnspecBlock);
    expect(resultBlock.kind).toBe('CONTENT');

    const resUnspecFinish = {
      candidates: [{ finishReason: 'FINISH_REASON_UNSPECIFIED' }],
      text: '{"ok": true}',
    };
    const resultFinish = classifyProviderResponse(resUnspecFinish);
    expect(resultFinish.kind).toBe('CONTENT');
  });

  it('classifies STOP with non-empty text as CONTENT', () => {
    const res = {
      candidates: [{ finishReason: 'STOP' }],
      text: '{"narrative_blocks": []}',
    };
    const result = classifyProviderResponse(res);
    expect(result.kind).toBe('CONTENT');
    if (result.kind === 'CONTENT') {
      expect(result.text).toBe('{"narrative_blocks": []}');
    }
  });

  it('classifies MAX_TOKENS with non-empty text as CONTENT (not automatically refusal)', () => {
    const res = {
      candidates: [{ finishReason: 'MAX_TOKENS' }],
      text: '{"partial": true}',
    };
    const result = classifyProviderResponse(res);
    expect(result.kind).toBe('CONTENT');
  });

  it('classifies empty or whitespace-only response without refusal metadata as EMPTY_PROVIDER_RESPONSE', () => {
    const resEmpty = {
      candidates: [{ finishReason: 'STOP' }],
      text: '',
    };
    expect(classifyProviderResponse(resEmpty).kind).toBe('EMPTY_PROVIDER_RESPONSE');

    const resWhitespace = {
      candidates: [{ finishReason: 'STOP' }],
      text: '   \n\t  ',
    };
    expect(classifyProviderResponse(resWhitespace).kind).toBe('EMPTY_PROVIDER_RESPONSE');

    expect(classifyProviderResponse(null).kind).toBe('EMPTY_PROVIDER_RESPONSE');
    expect(classifyProviderResponse({}).kind).toBe('EMPTY_PROVIDER_RESPONSE');
  });

  it('passes malformed non-empty JSON as CONTENT (which then fails through existing parser/schema boundary)', () => {
    const res = {
      candidates: [{ finishReason: 'STOP' }],
      text: '{"malformed json: true',
    };
    const result = classifyProviderResponse(res);
    expect(result.kind).toBe('CONTENT');
    if (result.kind === 'CONTENT') {
      expect(() => parseStructuredTurnResponse(result.text, TurnResultSchema)).toThrow();
    }
  });

  it('ensures raw response objects, stacks, URLs, and credentials are absent from sanitized error types', () => {
    const err = new ProviderRefusalError('SAFETY');
    expect(err.code).toBe('PROVIDER_REFUSAL');
    expect(err.reason).toBe('SAFETY');
    expect(err.message).toBe('AI provider declined turn generation');
    expect(JSON.stringify(err)).not.toContain('http://');
    expect(JSON.stringify(err)).not.toContain('AI_API_KEY');

    const emptyErr = new EmptyProviderResponseError();
    expect(emptyErr.code).toBe('EMPTY_PROVIDER_RESPONSE');
    expect(emptyErr.message).toBe('AI provider returned an empty response');

    const rejectedErr = new ProviderRequestRejectedError(400);
    expect(rejectedErr.code).toBe('PROVIDER_REQUEST_REJECTED');
    expect(rejectedErr.providerStatus).toBe(400);
    expect(rejectedErr.message).toBe('AI provider rejected the turn generation request');
    expect(JSON.stringify(rejectedErr)).not.toContain('generativelanguage.googleapis.com');
  });
});
