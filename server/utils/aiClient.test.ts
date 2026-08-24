import { describe, expect, it } from 'vitest';
import {
  unwrapStrictJsonResponse,
  parseStructuredTurnResponse,
  turnResponseSchema,
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
