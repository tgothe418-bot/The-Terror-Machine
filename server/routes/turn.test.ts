import { describe, expect, it } from 'vitest';
import { TurnRequestSchema, TurnResultSchema, EngineTurnContextSchema } from '../schemas/engine';

describe('Turn schemas validation', () => {
  describe('EngineTurnContextSchema', () => {
    it('validates and supplies defaults for an engine turn context', () => {
      const parsed = EngineTurnContextSchema.parse({
        scenario: {
          title: 'The Blackwood Sanatorium',
          premise: 'A derelict wing where shadows detach.',
          worldRules: ['Shadows cannot cross running water.'],
          setting: {
            location: 'East Wing Ward',
            atmosphere: 'Damp and suffocating',
            timePeriod: '1924'
          }
        },
        player: {
          role: 'protagonist',
          name: 'Arthur Pendelton',
          description: 'A retired archivist.'
        },
        cast: [
          {
            id: 'char-1',
            name: 'Nurse Finch',
            role: 'Custodian',
            isEntity: false
          }
        ],
        topology: {
          currentNodeId: 'WARD_01',
          readableNodeLabel: 'Ward 01',
          allowedOutgoingExits: [
            {
              from: 'WARD_01',
              to: 'CORRIDOR_02',
              kind: 'PHYSICAL',
              userInitiated: true
            }
          ]
        },
        runtime: {
          phase: 'LATENT',
          tension: 2,
          coherence: 1.0,
          reconciliationRevision: 0,
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT'
        }
      });

      expect(parsed.version).toBe(1);
      expect(parsed.scenario.title).toBe('The Blackwood Sanatorium');
      expect(parsed.player.name).toBe('Arthur Pendelton');
      expect(parsed.cast).toHaveLength(1);
      expect(parsed.topology.allowedOutgoingExits).toHaveLength(1);
    });
  });

  describe('TurnRequestSchema', () => {
    it('validates a well-formed turn request payload including EngineTurnContext', () => {
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
        context: {
          version: 1,
          scenario: {
            title: 'Cellar Vault',
            premise: 'Subterranean isolation.',
            worldRules: ['No flame may ignite.'],
            setting: { location: 'Sub-level 3', atmosphere: 'Cold', timePeriod: '1970' },
            startingVector: 'SOMATIC',
            startingTier: 'GATEWAY',
            incitingIncident: 'The hatch locked.',
            pacingDirective: 'Slow burn.',
            keyPlotElements: ['The rusted valve']
          },
          player: {
            role: 'protagonist',
            name: 'Dr. Evans',
            description: 'Geologist',
            isEntity: false
          },
          cast: [],
          topology: {
            currentNodeId: 'ROOM_01',
            readableNodeLabel: 'Room 01',
            allowedOutgoingExits: []
          },
          runtime: {
            phase: 'LATENT',
            tension: 2,
            coherence: 1.0,
            reconciliationRevision: 0,
            activeVector: 'SOMATIC',
            activeTier: 'GATEWAY'
          }
        }
      };

      const parsed = TurnRequestSchema.parse(validPayload);
      expect(parsed.userAction).toBe('I check the locked wooden door for keyholes.');
      expect(parsed.stateContext.currentNodeId).toBe('ROOM_01');
      expect(parsed.stateContext.tensionLevel).toBe(2);
      expect(parsed.isExpansionExpected).toBe(false);
      expect(parsed.context.scenario.title).toBe('Cellar Vault');
      expect(parsed.context.player.name).toBe('Dr. Evans');
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
        context: {
          version: 1,
          scenario: { title: 'Test', premise: '', worldRules: [], setting: { location: 'L', atmosphere: '', timePeriod: '' }, startingVector: 'COGNITIVE', startingTier: 'LATENT', incitingIncident: '', pacingDirective: '', keyPlotElements: [] },
          player: { role: 'protagonist', name: 'P', description: '', isEntity: false },
          cast: [],
          topology: { currentNodeId: 'ROOM_01', readableNodeLabel: 'Room 01', allowedOutgoingExits: [] },
          runtime: { phase: 'LATENT', tension: 0, coherence: 1.0, reconciliationRevision: 0, activeVector: 'COGNITIVE', activeTier: 'LATENT' }
        }
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
      expect(parsed.topologyDelta?.isExpansion).toBe(true);
      expect(parsed.topologyDelta?.newNodeDef?.id).toBe('ROOM_02');
    });

    it('rejects more than 2 narrative blocks', () => {
      const invalidResult = {
        narrative_blocks: [
          { type: 'prose', content: 'Block 1' },
          { type: 'prose', content: 'Block 2' },
          { type: 'prose', content: 'Block 3' },
        ],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 1,
          intent_classification: 'WAIT',
          terminal_flags: [],
        },
      };

      expect(() => TurnResultSchema.parse(invalidResult)).toThrow();
    });

    it('rejects an unknown narrative block type', () => {
      expect(() => TurnResultSchema.parse({
        narrative_blocks: [{ type: 'invented_type', content: 'Not a valid block.' }],
        logic_state: {},
      })).toThrow();
    });

    it('rejects non-string narrative content', () => {
      expect(() => TurnResultSchema.parse({
        narrative_blocks: [{ type: 'prose', content: 42 }],
        logic_state: {},
      })).toThrow();
    });

    it('rejects an invalid topology expansion flag rather than coercing it', () => {
      expect(() => TurnResultSchema.parse({
        narrative_blocks: [{ type: 'prose', content: 'The corridor remains still.' }],
        logic_state: {},
        topologyDelta: { isExpansion: 'false' },
      })).toThrow();
    });
  });
});
