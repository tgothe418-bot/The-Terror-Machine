import { describe, expect, it } from 'vitest';
import { TurnRequestSchema, TurnResultSchema } from '../schemas/engine';

describe('Turn schemas validation', () => {
  describe('TurnRequestSchema', () => {
    it('validates a well-formed turn request payload', () => {
      const validPayload = {
        userAction: 'I check the locked wooden door for keyholes.',
        recentHistory: 'You stand in a dimly lit hallway.',
        systemDirective: 'Keep prose clinical and tension moderate.',
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ROOM_01',
          currentPhase: 'LATENT',
          tensionLevel: 2,
          reconciliationRevision: 0,
        },
      };

      const parsed = TurnRequestSchema.parse(validPayload);
      expect(parsed.userAction).toBe('I check the locked wooden door for keyholes.');
      expect(parsed.stateContext.currentNodeId).toBe('ROOM_01');
      expect(parsed.stateContext.tensionLevel).toBe(2);
      expect(parsed.isExpansionExpected).toBe(false);
    });

    it('rejects an empty user action', () => {
      const invalidPayload = {
        userAction: '',
        recentHistory: 'Hallway...',
        systemDirective: 'Directive...',
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ROOM_01',
          currentPhase: 'LATENT',
          tensionLevel: 2,
          reconciliationRevision: 0,
        },
      };

      expect(() => TurnRequestSchema.parse(invalidPayload)).toThrow();
    });

    it('rejects missing state context', () => {
      const invalidPayload = {
        userAction: 'Walk forward',
        recentHistory: 'Hallway...',
        systemDirective: 'Directive...',
        isExpansionExpected: false,
      };

      expect(() => TurnRequestSchema.parse(invalidPayload)).toThrow();
    });
  });

  describe('TurnResultSchema', () => {
    it('validates a well-formed turn result frame', () => {
      const validResult = {
        narrative_blocks: [
          {
            type: 'prose',
            content: 'The keyhole is plugged with dried wax.',
          },
          {
            type: 'environmental_description',
            content: 'The air smells faintly of sulfur.',
          },
        ],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 3,
          intent_classification: 'INSPECT',
          terminal_flags: [],
          cast_deltas: [
            {
              character_id: 'char_1',
              skepticism_delta: -0.1,
            },
          ],
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'ROOM_02',
            geometry: 'Narrow passage',
            hazards: ['toxic_spores'],
            exitVectors: [
              {
                direction: 'NORTH',
                targetNodeId: 'ROOM_01',
              },
            ],
          },
        },
      };

      const parsed = TurnResultSchema.parse(validResult);
      expect(parsed.narrative_blocks).toHaveLength(2);
      expect(parsed.narrative_blocks[0].type).toBe('prose');
      expect(parsed.logic_state.suggested_tension).toBe(3);
      expect(parsed.logic_state.cast_deltas).toHaveLength(1);
      expect(parsed.topologyDelta?.isExpansion).toBe(true);
      expect(parsed.topologyDelta?.newNodeDef?.id).toBe('ROOM_02');
    });

    it('caps narrative blocks at 2 blocks max', () => {
      const excessBlocks = {
        narrative_blocks: [
          { type: 'prose', content: 'Block 1' },
          { type: 'prose', content: 'Block 2' },
          { type: 'prose', content: 'Block 3' },
        ],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 1,
          intent_classification: 'NONE',
          terminal_flags: [],
          cast_deltas: [],
        },
      };

      expect(() => TurnResultSchema.parse(excessBlocks)).toThrow();
    });

    it('rejects out-of-range tension', () => {
      const invalidTension = {
        narrative_blocks: [{ type: 'prose', content: 'Testing' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 15, // max is 10
          intent_classification: 'NONE',
          terminal_flags: [],
          cast_deltas: [],
        },
      };

      expect(() => TurnResultSchema.parse(invalidTension)).toThrow();
    });
  });
});
