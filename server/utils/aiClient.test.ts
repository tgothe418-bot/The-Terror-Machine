import { describe, expect, it, vi } from 'vitest';
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

describe('unwrapStrictJsonResponse', () => {
  it('leaves plain JSON unchanged', () => {
    expect(unwrapStrictJsonResponse('{"ok":true}')).toBe('{"ok":true}');
  });

  it('unwraps a complete fenced JSON response', () => {
    const fenced = ['```json', '{"ok":true}', '```'].join('\n');
    expect(unwrapStrictJsonResponse(fenced)).toBe('{"ok":true}');
  });

  it('does not scrape JSON from surrounding prose', () => {
    expect(unwrapStrictJsonResponse('Here is the result: {"ok":true}')).toBe(
      'Here is the result: {"ok":true}'
    );
  });
});

describe('HG1 provider contract restoration (Packet 1-10)', () => {
  const HG1_FIELDS = [
    'cast_activity_proposal',
    'situated_pressure_proposal',
    'value_state_proposal',
    'character_pursuit_proposal',
    'character_development_proposal',
    'pressure_transition_proposal',
  ] as const;

  it('provider schema declares and requires the complete HG1 proposal envelope', () => {
    const props = turnResponseSchema.properties as Record<string, unknown>;
    const required = (turnResponseSchema.required || []) as string[];

    for (const field of HG1_FIELDS) {
      expect(props[field], `Expected Gemini schema to declare property "${field}"`).toBeDefined();
      expect(required, `Expected Gemini schema required list to include "${field}"`).toContain(field);
    }
  });

  it('provider ingress rejects omission of every HG1 proposal field instead of manufacturing neutral defaults', () => {
    const fullPayload = {
      narrative_blocks: [{ type: 'prose', content: 'Corridor hum.' }],
      intent_proposal: {
        action_kind: 'OBSERVE',
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
        memory_echo_candidate: null,
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: { kind: 'NONE', reason: 'NO_OPPORTUNITY_CHOSEN' },
      situated_pressure_proposal: { kind: 'NONE', reason: 'NO_PRESSURE_CHOSEN' },
      value_state_proposal: { changes: [] },
      character_pursuit_proposal: { changes: [] },
      character_development_proposal: { changes: [] },
      pressure_transition_proposal: { transitions: [] },
      logic_state: {
        current_phase: 'MANIFEST',
        requested_transition: null,
        suggested_tension: 20,
        terminal_flags: [],
        cast_deltas: [],
      },
      topologyDelta: { isExpansion: false, newNodeDef: null },
    };

    for (const field of HG1_FIELDS) {
      const omitted = { ...fullPayload };
      delete (omitted as Record<string, unknown>)[field];
      expect(
        () => parseStructuredTurnResponse(JSON.stringify(omitted), TurnResultSchema),
        `Deleting "${field}" should fail provider ingress validation rather than using Zod defaults`
      ).toThrow();
    }
  });

  it('generateStructuredResponse sends the paired provider schema selected by its contract', async () => {
    const client = getAiClient();
    const generateSpy = vi.spyOn(client.models, 'generateContent').mockResolvedValueOnce({
      text: JSON.stringify({
        narrative_blocks: [{ type: 'prose', content: 'Ventilation hum.' }],
        intent_proposal: {
          action_kind: 'OBSERVE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'SUCCESS',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'WITHIN_CONTRACT',
          memory_echo_candidate: null,
        },
        consequence_proposal: { mutations: [] },
        character_stance_proposal: { changes: [] },
        character_relationship_proposal: { changes: [] },
        character_memory_proposal: { candidates: [] },
        world_memory_proposal: { candidates: [] },
        cast_activity_proposal: { kind: 'NONE', reason: 'NO_OPPORTUNITY_CHOSEN' },
        situated_pressure_proposal: { kind: 'NONE', reason: 'NO_PRESSURE_CHOSEN' },
        value_state_proposal: { changes: [] },
        character_pursuit_proposal: { changes: [] },
        character_development_proposal: { changes: [] },
        pressure_transition_proposal: { transitions: [] },
        logic_state: {
          terminal_flags: [],
          cast_deltas: [],
        },
        topologyDelta: { isExpansion: false, newNodeDef: null },
      }),
    } as never);

    await generateStructuredResponse('Test prompt', EngineTurnStructuredResponseContract);

    expect(generateSpy).toHaveBeenCalledTimes(1);
    const callConfig = generateSpy.mock.calls[0][0];
    expect(callConfig.config?.responseSchema).toBe(EngineTurnStructuredResponseContract.responseSchema);
    expect(callConfig.config?.responseSchema).toBe(turnResponseSchema);

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
