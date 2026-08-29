import { describe, expect, it, vi, afterAll } from 'vitest';
import {
  unwrapStrictJsonResponse,
  parseStructuredTurnResponse,
  turnResponseSchema,
  classifyProviderResponse,
  ProviderRefusalError,
  EmptyProviderResponseError,
  getAiClient,
  generateStructuredResponse,
  EngineTurnStructuredResponseContract,
} from './aiClient';
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

describe('HG1 Provider Schema & Contract Soundness (Packet 1-10A)', () => {
  it('provider and Zod contracts agree on every HG1 discriminant enum bound and manifestation shape', () => {
    const props = turnResponseSchema.properties as Record<string, Record<string, unknown>>;
    const required = (turnResponseSchema.required || []) as string[];

    // 1. All live TurnResultSchema root fields declared by Gemini schema
    const zodShape = TurnResultSchema.shape;
    for (const key of Object.keys(zodShape)) {
      expect(props[key], `Gemini schema must declare root property "${key}"`).toBeDefined();
    }

    // 2. All six HG1 fields in Gemini schema required list
    for (const field of HG1_FIELDS) {
      expect(required, `Gemini schema required list must include "${field}"`).toContain(field);
    }

    // 6. Provider persistence enum equals PERSISTENCE_TARGETS exactly
    const pressureActiveSchema = (props.situated_pressure_proposal as { anyOf: Array<{ properties: Record<string, { enum: string[] }> }> }).anyOf[1];
    expect(pressureActiveSchema.properties.persistenceTarget.enum).toEqual([...PERSISTENCE_TARGETS]);
    expect(pressureActiveSchema.properties.operator.enum).toEqual([...PRESSURE_OPERATORS]);
    expect(pressureActiveSchema.properties.affectedDimension.enum).toEqual([...AFFECTED_DIMENSIONS]);

    const activityActiveSchema = (props.cast_activity_proposal as { anyOf: Array<{ properties: Record<string, { enum: string[]; maxLength?: string }> }> }).anyOf[1];
    expect(activityActiveSchema.properties.perceptionPath.enum).toEqual([...PERCEPTION_PATHS]);

    const valueChangesItem = (props.value_state_proposal as { properties: { changes: { maxItems: string; items: { properties: Record<string, { enum: string[] }> } } } }).properties.changes.items;
    expect(valueChangesItem.properties.operation.enum).toEqual([...VALUE_OPERATIONS]);
    expect(valueChangesItem.properties.proposedCondition.enum).toEqual([...VALUE_CONDITIONS]);
    expect(valueChangesItem.properties.proposedLifecycle.enum).toEqual([...VALUE_LIFECYCLES]);
    expect(valueChangesItem.properties.expectedBeforeCondition.enum).toEqual([...VALUE_CONDITIONS]);
    expect(valueChangesItem.properties.expectedBeforeLifecycle.enum).toEqual([...VALUE_LIFECYCLES]);

    const pursuitChangesItem = (props.character_pursuit_proposal as { properties: { changes: { maxItems: string; items: { properties: Record<string, { enum: string[] }> } } } }).properties.changes.items;
    expect(pursuitChangesItem.properties.operation.enum).toEqual([...PURSUIT_OPERATIONS]);
    expect(pursuitChangesItem.properties.proposedStatus.enum).toEqual([...PURSUIT_STATUSES]);
    expect(pursuitChangesItem.properties.expectedStatus.enum).toEqual([...PURSUIT_STATUSES]);

    const devChangesItem = (props.character_development_proposal as { properties: { changes: { maxItems: string; items: { properties: Record<string, { enum: string[] }> } } } }).properties.changes.items;
    expect(devChangesItem.properties.operation.enum).toEqual([...DEVELOPMENT_OPERATIONS]);
    expect(devChangesItem.properties.dimension.enum).toEqual([...DEVELOPMENT_DIMENSIONS]);

    const transChangesItem = (props.pressure_transition_proposal as { properties: { transitions: { maxItems: string; items: { properties: Record<string, { enum: string[] }> } } } }).properties.transitions.items;
    expect(transChangesItem.properties.proposedStatus.enum).toEqual([...PRESSURE_THREAD_TERMINAL_STATUSES]);

    // 7. Provider manifestation union contains exactly prose and dialogue
    const actManifest = (activityActiveSchema.properties.manifestationBlock as unknown as { anyOf: Array<{ properties: { type: { enum: string[] }; content: { maxLength: string }; speaker?: { maxLength: string } }; required: string[] }> });
    expect(actManifest.anyOf).toHaveLength(2);
    expect(actManifest.anyOf[0].properties.type.enum).toEqual(['prose']);
    expect(actManifest.anyOf[0].required).toEqual(['type', 'content']);
    expect(actManifest.anyOf[1].properties.type.enum).toEqual(['dialogue']);
    expect(actManifest.anyOf[1].required).toEqual(['type', 'speaker', 'content']);

    // 8. Provider activity summary is capped at 500
    const actSummary = activityActiveSchema.properties.activitySummary;
    expect(actSummary.maxLength).toBe('500');

    // 9. Provider activity and pressure manifestations enforce 2000/1000 content and 100 speaker
    expect(actManifest.anyOf[0].properties.content.maxLength).toBe('2000');
    expect(actManifest.anyOf[1].properties.content.maxLength).toBe('1000');
    expect(actManifest.anyOf[1].properties.speaker?.maxLength).toBe('100');

    // 10. Provider list caps are exactly value 3, pursuit 2, development 2, transition 2
    expect((props.value_state_proposal as { properties: { changes: { maxItems: string } } }).properties.changes.maxItems).toBe('3');
    expect((props.character_pursuit_proposal as { properties: { changes: { maxItems: string } } }).properties.changes.maxItems).toBe('2');
    expect((props.character_development_proposal as { properties: { changes: { maxItems: string } } }).properties.changes.maxItems).toBe('2');
    expect((props.pressure_transition_proposal as { properties: { transitions: { maxItems: string } } }).properties.transitions.maxItems).toBe('2');
  });

  it('every active HG1 provider variant survives the paired ingress parser', () => {
    // 4. Every explicit neutral envelope parses
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

    // 5. One active variant for each of the six fields parses through zodSchema
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

    // 16. Relationship delta numeric -1 and 1 parse; string '-1', string '1', and numeric 0 fail
    const posDelta = createBaseValidPayload() as { character_relationship_proposal: { changes: Array<{ delta: unknown }> } };
    posDelta.character_relationship_proposal.changes[0].delta = 1;
    expect(parseStructuredTurnResponse(JSON.stringify(posDelta), TurnResultSchema).character_relationship_proposal.changes[0].delta).toBe(1);

    const negDelta = createBaseValidPayload() as { character_relationship_proposal: { changes: Array<{ delta: unknown }> } };
    negDelta.character_relationship_proposal.changes[0].delta = -1;
    expect(parseStructuredTurnResponse(JSON.stringify(negDelta), TurnResultSchema).character_relationship_proposal.changes[0].delta).toBe(-1);

    const strNeg = createBaseValidPayload() as { character_relationship_proposal: { changes: Array<{ delta: unknown }> } };
    strNeg.character_relationship_proposal.changes[0].delta = '-1';
    expect(() => parseStructuredTurnResponse(JSON.stringify(strNeg), TurnResultSchema)).toThrow();

    const strPos = createBaseValidPayload() as { character_relationship_proposal: { changes: Array<{ delta: unknown }> } };
    strPos.character_relationship_proposal.changes[0].delta = '1';
    expect(() => parseStructuredTurnResponse(JSON.stringify(strPos), TurnResultSchema)).toThrow();

    const zeroDelta = createBaseValidPayload() as { character_relationship_proposal: { changes: Array<{ delta: unknown }> } };
    zeroDelta.character_relationship_proposal.changes[0].delta = 0;
    expect(() => parseStructuredTurnResponse(JSON.stringify(zeroDelta), TurnResultSchema)).toThrow();
  });

  it('provider permitted malformed HG1 variants do not exist', () => {
    // 3. All six HG1 fields are required by TurnResultSchema; deleting each one fails
    for (const field of HG1_FIELDS) {
      const omitted = createBaseValidPayload();
      delete (omitted as Record<string, unknown>)[field];
      expect(
        () => parseStructuredTurnResponse(JSON.stringify(omitted), TurnResultSchema),
        `Deleting "${field}" should fail provider ingress validation`
      ).toThrow();
    }

    // 4b. Omitting changes or transitions from the four array envelopes fails instead of creating []
    const noChangesVal = createBaseValidPayload();
    delete (noChangesVal.value_state_proposal as Record<string, unknown>).changes;
    expect(() => parseStructuredTurnResponse(JSON.stringify(noChangesVal), TurnResultSchema)).toThrow();

    const noChangesPur = createBaseValidPayload();
    delete (noChangesPur.character_pursuit_proposal as Record<string, unknown>).changes;
    expect(() => parseStructuredTurnResponse(JSON.stringify(noChangesPur), TurnResultSchema)).toThrow();

    const noChangesDev = createBaseValidPayload();
    delete (noChangesDev.character_development_proposal as Record<string, unknown>).changes;
    expect(() => parseStructuredTurnResponse(JSON.stringify(noChangesDev), TurnResultSchema)).toThrow();

    const noTrans = createBaseValidPayload();
    delete (noTrans.pressure_transition_proposal as Record<string, unknown>).transitions;
    expect(() => parseStructuredTurnResponse(JSON.stringify(noTrans), TurnResultSchema)).toThrow();

    // 11. Invalid activity/pressure discriminants fail
    const invalidActKind = createBaseValidPayload();
    (invalidActKind.cast_activity_proposal as Record<string, unknown>) = { kind: 'AUTONOMOUS', reason: 'None' };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidActKind), TurnResultSchema)).toThrow();

    const invalidPressKind = createBaseValidPayload();
    (invalidPressKind.situated_pressure_proposal as Record<string, unknown>) = { kind: 'ATTACK', reason: 'None' };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidPressKind), TurnResultSchema)).toThrow();

    // 12. A persistence value outside PERSISTENCE_TARGETS fails
    const invalidPersist = createBaseValidPayload();
    invalidPersist.situated_pressure_proposal = {
      kind: 'PRESSURE',
      proposalId: 'prop-press-1',
      valueAnchorId: 'val-reactor',
      sourceReference: 'BASELINE',
      operator: 'EXPOSE',
      affectedDimension: 'SAFETY',
      adverseProspect: 'Coolant line leaking toxic gas.',
      authorityReferences: ['auth-press-1'],
      persistenceTarget: 'PERMANENT' as unknown as 'TRANSIENT',
      responseWindowOpen: true,
      manifestationBlock: null,
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidPersist), TurnResultSchema)).toThrow();

    // 13. system_voice, environmental_description, and dialogue without speaker fail as HG1 manifestations
    const sysVoiceAct = createBaseValidPayload();
    sysVoiceAct.cast_activity_proposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      pursuitId: null,
      locationNodeId: null,
      perceptionPath: 'DIRECT',
      activitySummary: 'Working.',
      authorityReferences: ['ref'],
      manifestationBlock: { type: 'system_voice', content: 'Alert' } as unknown as { type: 'prose'; content: string },
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(sysVoiceAct), TurnResultSchema)).toThrow();

    const envDescAct = createBaseValidPayload();
    envDescAct.cast_activity_proposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      pursuitId: null,
      locationNodeId: null,
      perceptionPath: 'DIRECT',
      activitySummary: 'Working.',
      authorityReferences: ['ref'],
      manifestationBlock: { type: 'environmental_description', content: 'Dark' } as unknown as { type: 'prose'; content: string },
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(envDescAct), TurnResultSchema)).toThrow();

    const noSpeakerDialAct = createBaseValidPayload();
    noSpeakerDialAct.cast_activity_proposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-act-1',
      castMemberId: 'char-tech',
      pursuitId: null,
      locationNodeId: null,
      perceptionPath: 'DIRECT',
      activitySummary: 'Working.',
      authorityReferences: ['ref'],
      manifestationBlock: { type: 'dialogue', content: 'Missing speaker' } as unknown as { type: 'dialogue'; speaker: string; content: string },
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(noSpeakerDialAct), TurnResultSchema)).toThrow();

    // 14. Over-limit proposal arrays fail
    const overVal = createBaseValidPayload();
    overVal.value_state_proposal = {
      changes: [
        { anchorId: 'a1', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: 'BASELINE', rationale: 'R' },
        { anchorId: 'a2', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: 'BASELINE', rationale: 'R' },
        { anchorId: 'a3', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: 'BASELINE', rationale: 'R' },
        { anchorId: 'a4', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: 'BASELINE', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(overVal), TurnResultSchema)).toThrow();

    const overPur = createBaseValidPayload();
    overPur.character_pursuit_proposal = {
      changes: [
        { pursuitId: 'p1', operation: 'ADVANCE', progressSummary: 'S', causeReference: 'BASELINE', rationale: 'R' },
        { pursuitId: 'p2', operation: 'ADVANCE', progressSummary: 'S', causeReference: 'BASELINE', rationale: 'R' },
        { pursuitId: 'p3', operation: 'ADVANCE', progressSummary: 'S', causeReference: 'BASELINE', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(overPur), TurnResultSchema)).toThrow();

    const overDev = createBaseValidPayload();
    overDev.character_development_proposal = {
      changes: [
        { castMemberId: 'c1', operation: 'ESTABLISH', dimension: 'BELIEF', statement: 'S1', causeReference: 'BASELINE', rationale: 'R' },
        { castMemberId: 'c2', operation: 'ESTABLISH', dimension: 'BELIEF', statement: 'S2', causeReference: 'BASELINE', rationale: 'R' },
        { castMemberId: 'c3', operation: 'ESTABLISH', dimension: 'BELIEF', statement: 'S3', causeReference: 'BASELINE', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(overDev), TurnResultSchema)).toThrow();

    const overTrans = createBaseValidPayload();
    overTrans.pressure_transition_proposal = {
      transitions: [
        { threadId: 't1', proposedStatus: 'RESOLVED', causeReference: 'BASELINE', rationale: 'R' },
        { threadId: 't2', proposedStatus: 'RESOLVED', causeReference: 'BASELINE', rationale: 'R' },
        { threadId: 't3', proposedStatus: 'RESOLVED', causeReference: 'BASELINE', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(overTrans), TurnResultSchema)).toThrow();

    // 15. Empty/blank required canonical strings fail
    const blankCauseVal = createBaseValidPayload();
    blankCauseVal.value_state_proposal = {
      changes: [
        { anchorId: 'a1', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: '   ', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(blankCauseVal), TurnResultSchema)).toThrow();

    const emptyCauseVal = createBaseValidPayload();
    emptyCauseVal.value_state_proposal = {
      changes: [
        { anchorId: 'a1', operation: 'SET_CONDITION', proposedCondition: 'LOST', causeReference: '', rationale: 'R' },
      ],
    };
    expect(() => parseStructuredTurnResponse(JSON.stringify(emptyCauseVal), TurnResultSchema)).toThrow();
  });

  it('generateStructuredResponse has no unpaired Zod-only fallback', async () => {
    const client = getAiClient();
    const generateSpy = vi.spyOn(client.models, 'generateContent').mockResolvedValueOnce({
      text: JSON.stringify(createBaseValidPayload()),
    } as never);

    // 17. The SDK receives the exact contract.responseSchema object
    const result = await generateStructuredResponse('Test prompt', EngineTurnStructuredResponseContract);

    expect(generateSpy).toHaveBeenCalledTimes(1);
    const callConfig = generateSpy.mock.calls[0][0];
    expect(callConfig.config?.responseSchema).toBe(EngineTurnStructuredResponseContract.responseSchema);
    expect(callConfig.config?.responseSchema).toBe(turnResponseSchema);

    // 18. The returned text is parsed by the exact contract.zodSchema object
    expect(result.intent_proposal.action_kind).toBe('COMMUNICATE');
    expect(result.narrative_blocks).toHaveLength(2);

    generateSpy.mockRestore();
  });
});

describe('provider turn response contract', () => {
  const createValidBaseResult = () => ({
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
        {
          domain: 'PLAYER_INJURY',
          operation: 'ADD',
          value: 'Barotrauma headache',
          rationale: 'Pressure gradient spike.',
        },
        {
          domain: 'PSYCHOLOGICAL_STATUS',
          operation: 'SET',
          value: 'UNEASY',
          rationale: 'Unexplained auditory cues.',
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
          kind: 'ENVIRONMENTAL_CONDITION',
          scope: 'NODE',
          node_id: 'NODE_BENTHIC_01',
          statement: 'Ventilation conduit vibrating at 40Hz.',
          rationale: 'Established ambient physical symptom.',
        },
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
      cast_deltas: [{ character_id: 'char-vane', skepticism_delta: 0.1 }],
    },
    topologyDelta: { isExpansion: false, newNodeDef: null },
  });

  it('aligns provider turn output with the authoritative application schema', () => {
    // 1. Concise two-block dialogue result passes the same pure parser used by generateStructuredResponse
    const base = createValidBaseResult();
    const rawJson = JSON.stringify(base);
    const parsed = parseStructuredTurnResponse(rawJson, TurnResultSchema);
    expect(parsed.narrative_blocks).toHaveLength(2);
    expect(parsed.narrative_blocks[0].type).toBe('dialogue');
    expect(parsed.narrative_blocks[0].speaker).toBe('Dr. Vane');

    // 2. Each provider-permitted narrative block type is accepted by Zod and an unknown type fails
    const validTypes = ['prose', 'dialogue', 'system_voice', 'environmental_description'] as const;
    for (const blockType of validTypes) {
      const sample = createValidBaseResult();
      sample.narrative_blocks = [{ type: blockType, content: 'Testing narrative block type.' }];
      expect(() => parseStructuredTurnResponse(JSON.stringify(sample), TurnResultSchema)).not.toThrow();
    }
    const invalidBlockSample = createValidBaseResult();
    (invalidBlockSample.narrative_blocks as unknown[]) = [{ type: 'hallucination_stream', content: 'Invalid.' }];
    expect(() => parseStructuredTurnResponse(JSON.stringify(invalidBlockSample), TurnResultSchema)).toThrow();

    // 3. Provider schema caps narrative blocks at two
    expect(String(turnResponseSchema.properties?.narrative_blocks?.maxItems)).toBe('2');

    // 4. Numeric relationship deltas -1 and 1 pass
    const sampleDeltaPos = createValidBaseResult();
    sampleDeltaPos.character_relationship_proposal.changes[0].delta = 1;
    const parsedPos = parseStructuredTurnResponse(JSON.stringify(sampleDeltaPos), TurnResultSchema);
    expect(parsedPos.character_relationship_proposal.changes[0].delta).toBe(1);

    const sampleDeltaNeg = createValidBaseResult();
    sampleDeltaNeg.character_relationship_proposal.changes[0].delta = -1;
    const parsedNeg = parseStructuredTurnResponse(JSON.stringify(sampleDeltaNeg), TurnResultSchema);
    expect(parsedNeg.character_relationship_proposal.changes[0].delta).toBe(-1);

    // 5. String "-1", string "1", and numeric 0 fail without coercion
    const sampleStringNeg = createValidBaseResult();
    (sampleStringNeg.character_relationship_proposal.changes[0] as Record<string, unknown>).delta = '-1';
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleStringNeg), TurnResultSchema)).toThrow();

    const sampleStringPos = createValidBaseResult();
    (sampleStringPos.character_relationship_proposal.changes[0] as Record<string, unknown>).delta = '1';
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleStringPos), TurnResultSchema)).toThrow();

    const sampleZero = createValidBaseResult();
    sampleZero.character_relationship_proposal.changes[0].delta = 0 as 1;
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleZero), TurnResultSchema)).toThrow();

    // 6. Valid consequence variants pass
    const sampleConsequences = createValidBaseResult();
    sampleConsequences.consequence_proposal.mutations = [
      { domain: 'INVENTORY', operation: 'REMOVE', value: 'Old Keycard', rationale: 'Discarded.' },
      { domain: 'PLAYER_INJURY', operation: 'REMOVE', value: 'Splinter', rationale: 'Extracted.' },
      { domain: 'PSYCHOLOGICAL_STATUS', operation: 'SET', value: 'PANICKED', rationale: 'Trauma trigger.' },
    ];
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleConsequences), TurnResultSchema)).not.toThrow();

    // 7. Invalid domain/operation combinations fail
    const sampleInvalidOp1 = createValidBaseResult();
    (sampleInvalidOp1.consequence_proposal.mutations[0] as Record<string, unknown>).operation = 'SET';
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleInvalidOp1), TurnResultSchema)).toThrow();

    const sampleInvalidOp2 = createValidBaseResult();
    (sampleInvalidOp2.consequence_proposal.mutations[2] as Record<string, unknown>).operation = 'ADD';
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleInvalidOp2), TurnResultSchema)).toThrow();

    // 8. Valid empty proposal envelopes pass
    const sampleEmptyProposals = createValidBaseResult();
    sampleEmptyProposals.consequence_proposal.mutations = [];
    sampleEmptyProposals.character_stance_proposal.changes = [];
    sampleEmptyProposals.character_relationship_proposal.changes = [];
    sampleEmptyProposals.character_memory_proposal.candidates = [];
    sampleEmptyProposals.world_memory_proposal.candidates = [];
    const parsedEmpty = parseStructuredTurnResponse(JSON.stringify(sampleEmptyProposals), TurnResultSchema);
    expect(parsedEmpty.consequence_proposal.mutations).toEqual([]);
    expect(parsedEmpty.character_stance_proposal.changes).toEqual([]);
    expect(parsedEmpty.character_relationship_proposal.changes).toEqual([]);
    expect(parsedEmpty.character_memory_proposal.candidates).toEqual([]);
    expect(parsedEmpty.world_memory_proposal.candidates).toEqual([]);

    // 9. Bounded stance, relationship, character-memory, and World Memory proposals pass
    expect(parsed.character_stance_proposal.changes).toHaveLength(1);
    expect(parsed.character_relationship_proposal.changes).toHaveLength(1);
    expect(parsed.character_memory_proposal.candidates).toHaveLength(1);
    expect(parsed.world_memory_proposal.candidates).toHaveLength(2);

    // 10. Over-limit field or proposal list fails closed
    // 10a. More than 2 narrative blocks fails
    const sample3Blocks = createValidBaseResult();
    sample3Blocks.narrative_blocks.push({ type: 'prose', content: 'Third block.' });
    expect(() => parseStructuredTurnResponse(JSON.stringify(sample3Blocks), TurnResultSchema)).toThrow();

    // 10b. More than 4 consequence mutations fails
    const sample5Mutations = createValidBaseResult();
    sample5Mutations.consequence_proposal.mutations.push(
      { domain: 'INVENTORY', operation: 'ADD', value: 'Item 4', rationale: 'R' },
      { domain: 'INVENTORY', operation: 'ADD', value: 'Item 5', rationale: 'R' }
    );
    expect(() => parseStructuredTurnResponse(JSON.stringify(sample5Mutations), TurnResultSchema)).toThrow();

    // 10c. Suggested tension > 100 fails
    const sampleHighTension = createValidBaseResult();
    sampleHighTension.logic_state.suggested_tension = 101;
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleHighTension), TurnResultSchema)).toThrow();

    // 10d. World Memory scope NODE with null node_id fails
    const sampleInvalidWorldNode = createValidBaseResult();
    (sampleInvalidWorldNode.world_memory_proposal.candidates[0] as Record<string, unknown>).node_id = null;
    expect(() => parseStructuredTurnResponse(JSON.stringify(sampleInvalidWorldNode), TurnResultSchema)).toThrow();
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
  });
});
