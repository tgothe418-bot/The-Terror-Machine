import { describe, expect, it } from 'vitest';
import { TurnRequestSchema, TurnResultSchema, EngineTurnContextSchema, TurnResponseSchema } from '../schemas/engine';
import {
  validateDialogueBlocks,
  resolveExplicitAddressedSpeakerId,
  resolveDialogueSpeakerId,
  formatCastLedger,
  normalizeCastSkepticismDeltas,
} from './turn';
import { createCastInteractionReceipt } from '../../src/lib/castInteraction';

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
            description: 'Night shift custodian.',
            personality: 'Guarded and obsessive about door seals.',
            goals: 'Ensure no corridor breaches occur before dawn.',
            traits: ['Methodical', 'Paranoid'],
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
      expect(parsed.cast[0].personality).toBe('Guarded and obsessive about door seals.');
      expect(parsed.cast[0].goals).toBe('Ensure no corridor breaches occur before dawn.');
      expect(parsed.cast[0].traits).toEqual(['Methodical', 'Paranoid']);
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

  describe('validateDialogueBlocks and resolveExplicitAddressedSpeakerId', () => {
    const context = EngineTurnContextSchema.parse({
      scenario: {
        title: 'Relay Outpost',
        premise: 'Isolated transmission tower.',
        worldRules: ['Atmospheric interference.'],
        setting: { location: 'Control Room', atmosphere: 'Cold', timePeriod: '1984' },
      },
      player: {
        role: 'protagonist',
        characterId: 'char-aria',
        name: 'Aria Bell',
        description: 'Protagonist operator.',
        isEntity: false,
      },
      cast: [
        {
          id: 'char-aria',
          name: 'Aria Bell',
          role: 'Protagonist',
          description: 'Lead operator.',
          isUserCharacter: true,
          isEntity: false,
          expressionProfile: {
            communicationModes: ['spoken'],
            expressionGuidance: 'Direct tone.',
          },
        },
        {
          id: 'char-jules',
          name: 'Jules Mercer',
          role: 'Technician',
          description: 'Relay technician.',
          isUserCharacter: false,
          isEntity: false,
          expressionProfile: {
            communicationModes: ['spoken', 'mediated'],
            expressionGuidance: 'Speaks rapidly.',
          },
        },
        {
          id: 'char-marcus',
          name: 'Dr. Marcus Sterling',
          role: 'Scientist',
          description: 'Station researcher.',
          isUserCharacter: false,
          isEntity: false,
          expressionProfile: {
            communicationModes: ['spoken'],
            expressionGuidance: 'Measured and analytical.',
          },
        },
        {
          id: 'char-signal',
          name: 'The Signal',
          role: 'Entity',
          description: 'An anomalous static frequency.',
          isUserCharacter: false,
          isEntity: true,
          expressionProfile: {
            communicationModes: ['nonverbal'],
            expressionGuidance: 'Pulsing interference.',
          },
        },
      ],
      topology: {
        currentNodeId: 'RELAY_ROOM',
        readableNodeLabel: 'Relay Room',
        allowedOutgoingExits: [],
      },
      runtime: {
        phase: 'LATENT',
        tension: 0,
        coherence: 1.0,
        reconciliationRevision: 0,
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
      },
    });

    describe('resolveExplicitAddressedSpeakerId', () => {
      it('resolves an action with exactly one eligible full authored name to that member ID', () => {
        expect(
          resolveExplicitAddressedSpeakerId(
            'I turn to Jules Mercer and ask if the signal is stable.',
            context
          )
        ).toBe('char-jules');

        expect(
          resolveExplicitAddressedSpeakerId(
            'I request an analysis from Dr. Marcus Sterling on the readings.',
            context
          )
        ).toBe('char-marcus');
      });

      it('matches full authored names regardless of punctuation and case', () => {
        expect(
          resolveExplicitAddressedSpeakerId(
            'Hey, "jules mercer"... can you hear that frequency?!',
            context
          )
        ).toBe('char-jules');

        expect(
          resolveExplicitAddressedSpeakerId(
            'DR. MARCUS STERLING: check the oscilloscope right now!',
            context
          )
        ).toBe('char-marcus');
      });

      it('resolves to null when two or more eligible names appear in the action', () => {
        expect(
          resolveExplicitAddressedSpeakerId(
            'I look between Jules Mercer and Dr. Marcus Sterling for an explanation.',
            context
          )
        ).toBeNull();
      });

      it('resolves to null when naming a member whose isPresent is false', () => {
        const contextWithRemote = EngineTurnContextSchema.parse({
          ...context,
          cast: context.cast.map((c) =>
            c.id === 'char-jules' ? { ...c, isPresent: false } : c
          ),
        });

        expect(
          resolveExplicitAddressedSpeakerId(
            'I shout to Jules Mercer across the intercom.',
            contextWithRemote
          )
        ).toBeNull();
      });

      it('resolves to null when naming only a nonverbal-only member', () => {
        expect(
          resolveExplicitAddressedSpeakerId(
            'I tune the radio dial toward The Signal to analyze its cadence.',
            context
          )
        ).toBeNull();
      });

      it('resolves to null when no eligible full name is addressed', () => {
        expect(
          resolveExplicitAddressedSpeakerId('I check the dials on the mainframe.', context)
        ).toBeNull();

        // Partial name only - should not infer
        expect(
          resolveExplicitAddressedSpeakerId('I ask Jules if the breaker tripped.', context)
        ).toBeNull();

        // Player character addressed - should not match non-player target
        expect(
          resolveExplicitAddressedSpeakerId('Aria Bell inspects her own reflection.', context)
        ).toBeNull();
      });
    });

    it('validates dialogue blocks correctly against authorized cast and constraints', () => {
      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'Jules Mercer' }],
        context
      )).toBeNull();

      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'Dr. Marcus Sterling' }],
        context
      )).toBeNull();

      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'A Stranger' }],
        context
      )).toContain('authorized cast');

      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'Aria Bell' }],
        context
      )).toContain('player-controlled');

      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'The Signal' }],
        context
      )).toContain('lacks spoken or mediated');

      const contextWithRemote = EngineTurnContextSchema.parse({
        ...context,
        cast: context.cast.map((c) =>
          c.id === 'char-jules' ? { ...c, isPresent: false } : c
        ),
      });

      expect(validateDialogueBlocks(
        [{ type: 'dialogue', speaker: 'Jules Mercer' }],
        contextWithRemote
      )).toBe('Dialogue speaker "Jules Mercer" is not present at the current node.');

      expect(validateDialogueBlocks(
        [
          { type: 'dialogue', speaker: 'Jules Mercer' },
          { type: 'dialogue', speaker: 'Jules Mercer' },
        ],
        context
      )).toContain('at most one');
    });

    it('accepts dialogue from the explicitly addressed speaker and rejects dialogue from a different speaker', () => {
      // Explicitly addressed speaker matches returned dialogue block
      expect(
        validateDialogueBlocks(
          [{ type: 'dialogue', speaker: 'Jules Mercer' }],
          context,
          'char-jules'
        )
      ).toBeNull();

      // Explicitly addressed speaker differs from returned dialogue block
      expect(
        validateDialogueBlocks(
          [{ type: 'dialogue', speaker: 'Dr. Marcus Sterling' }],
          context,
          'char-jules'
        )
      ).toContain('does not match the explicitly addressed cast member');
    });

    it('preserves cast expression profile through EngineTurnContextSchema.parse', () => {
      const castWithProfile = [
        {
          id: 'char-jules',
          name: 'Jules Mercer',
          role: 'Technician',
          expressionProfile: {
            communicationModes: ['spoken', 'mediated'] as const,
            expressionGuidance: 'Terse sentences.',
            silenceGuidance: 'Silence means checking instruments.',
          },
        },
      ];
      const parsed = EngineTurnContextSchema.parse({
        scenario: {
          title: 'Test',
          setting: {
            location: 'Relay Room',
            atmosphere: '',
            timePeriod: 'Present',
          },
        },
        player: { role: 'protagonist', name: 'Aria' },
        cast: castWithProfile,
        topology: { currentNodeId: 'ROOM_1', readableNodeLabel: 'Room 1' },
        runtime: {},
      });
      expect(parsed.cast[0].expressionProfile).toEqual({
        communicationModes: ['spoken', 'mediated'],
        expressionGuidance: 'Terse sentences.',
        silenceGuidance: 'Silence means checking instruments.',
      });
    });
  });

  describe('formatCastLedger', () => {
    it('formats authored behavior and expression profile when present and gracefully handles empty behavioral fields and missing profiles', () => {
      const contextWithAuthored = EngineTurnContextSchema.parse({
        scenario: {
          title: 'Deep Research Station',
          setting: {
            location: 'Sub-Level 4',
            atmosphere: 'Pressurized humming',
            timePeriod: '2088',
          },
        },
        player: {
          role: 'protagonist',
          name: 'Elena Rostova',
        },
        cast: [
          {
            id: 'char-jules',
            name: 'Jules Mercer',
            role: 'Technician',
            description: 'Avionics and radio technician.',
            personality: 'Taciturn and anxious under pressure.',
            goals: 'Restore primary relay power without alerting the entity.',
            traits: ['Analytical', 'Pragmatic', 'Jittery'],
            isEntity: false,
            expressionProfile: {
              communicationModes: ['spoken', 'mediated'],
              expressionGuidance: 'Terse, fragmented telemetry reports.',
              silenceGuidance: 'Long pauses mean manual re-wiring.',
            },
          },
          {
            id: 'char-sentry',
            name: 'Automated Sentry',
            role: 'Defense Grid',
            description: 'Hardwired ceiling turret.',
            personality: '',
            goals: '',
            traits: [],
            isEntity: true,
          },
        ],
        topology: {
          currentNodeId: 'SUB_04',
          readableNodeLabel: 'Sub-Level 04',
        },
        runtime: {},
      });

      const formatted = formatCastLedger(contextWithAuthored);

      // Assert member with all three authored behavioral fields and expression profile
      expect(formatted).toContain('• Jules Mercer (ID: char-jules, Role: Technician, Entity: FALSE, Skepticism: 0.50, Presence: HERE): Avionics and radio technician.');
      expect(formatted).toContain('Personality: Taciturn and anxious under pressure.');
      expect(formatted).toContain('Goals: Restore primary relay power without alerting the entity.');
      expect(formatted).toContain('Traits: Analytical, Pragmatic, Jittery.');
      expect(formatted).toContain('Communication modes: spoken, mediated.');
      expect(formatted).toContain('Expression guidance: Terse, fragmented telemetry reports.');
      expect(formatted).toContain('Silence guidance: Long pauses mean manual re-wiring.');

      // Assert member with empty behavioral fields
      expect(formatted).toContain('• Automated Sentry (ID: char-sentry, Role: Defense Grid, Entity: TRUE, Skepticism: 0.50, Presence: HERE): Hardwired ceiling turret.');
      expect(formatted).toContain('Communication modes: spoken (legacy compatibility; no additional expression guidance).');

      // Ensure empty member line does NOT contain "Personality:", "Goals:", or "Traits:"
      const sentryLine = formatted.split('\n').find((l) => l.includes('Automated Sentry'));
      expect(sentryLine).toBeDefined();
      expect(sentryLine).not.toContain('Personality:');
      expect(sentryLine).not.toContain('Goals:');
      expect(sentryLine).not.toContain('Traits:');
    });

    it('formats Presence: ELSEWHERE when isPresent is false', () => {
      const contextWithRemote = EngineTurnContextSchema.parse({
        scenario: {
          title: 'Deep Research Station',
          setting: {
            location: 'Sub-Level 4',
            atmosphere: '',
            timePeriod: '',
          },
        },
        player: {
          role: 'protagonist',
          name: 'Elena Rostova',
        },
        cast: [
          {
            id: 'char-remote',
            name: 'Remote Observer',
            role: 'Witness',
            description: 'Monitoring from surface station.',
            isPresent: false,
          },
        ],
        topology: {
          currentNodeId: 'SUB_04',
          readableNodeLabel: 'Sub-Level 04',
        },
        runtime: {},
      });

      const formatted = formatCastLedger(contextWithRemote);
      expect(formatted).toContain('• Remote Observer (ID: char-remote, Role: Witness, Entity: FALSE, Skepticism: 0.50, Presence: ELSEWHERE): Monitoring from surface station.');
    });

    it('returns solitary subject when cast is empty', () => {
      const emptyContext = EngineTurnContextSchema.parse({
        scenario: {
          title: 'Empty Void',
          setting: {
            location: 'Void',
            atmosphere: '',
            timePeriod: '',
          },
        },
        player: { role: 'protagonist', name: 'Alone' },
        cast: [],
        topology: { currentNodeId: 'VOID', readableNodeLabel: 'Void' },
        runtime: {},
      });
      expect(formatCastLedger(emptyContext)).toBe('• Solitary subject.');
    });
  });

  describe('normalizeCastSkepticismDeltas', () => {
    const testContext = EngineTurnContextSchema.parse({
      scenario: {
        title: 'Facility',
        setting: { location: 'Lab', atmosphere: '', timePeriod: '' },
      },
      player: {
        role: 'protagonist',
        characterId: 'char-player',
        name: 'Player',
      },
      cast: [
        {
          id: 'char-player',
          name: 'Player',
          isUserCharacter: true,
        },
        {
          id: 'char-npc1',
          name: 'NPC 1',
          skepticism: 0.7,
        },
        {
          id: 'char-npc2',
          name: 'NPC 2',
          skepticism: 0.4,
        },
      ],
      topology: {
        currentNodeId: 'LAB',
        readableNodeLabel: 'Lab',
      },
      runtime: {},
    });

    it('normalizes valid deltas and clamps magnitude to [-0.15, 0.15]', () => {
      const result = normalizeCastSkepticismDeltas(
        [
          { character_id: 'char-npc1', skepticism_delta: 0.1 },
          { character_id: 'char-npc2', skepticism_delta: -0.5 }, // clamped to -0.15
        ],
        testContext
      );

      expect(result).toEqual([
        { character_id: 'char-npc1', skepticism_delta: 0.1 },
        { character_id: 'char-npc2', skepticism_delta: -0.15 },
      ]);
    });

    it('discards deltas for player character, unknown IDs, duplicates, and zero deltas', () => {
      const result = normalizeCastSkepticismDeltas(
        [
          { character_id: 'char-player', skepticism_delta: -0.1 }, // player: discard
          { character_id: 'unknown-npc', skepticism_delta: 0.05 }, // unknown: discard
          { character_id: 'char-npc1', skepticism_delta: 0.12 }, // valid
          { character_id: 'char-npc1', skepticism_delta: -0.05 }, // duplicate: discard
          { character_id: 'char-npc2', skepticism_delta: 0 }, // zero delta: discard
        ],
        testContext
      );

      expect(result).toEqual([
        { character_id: 'char-npc1', skepticism_delta: 0.12 },
      ]);
    });
  });

  describe('resolveDialogueSpeakerId', () => {
    const testContext = EngineTurnContextSchema.parse({
      scenario: {
        title: 'Facility',
        setting: { location: 'Node-1', atmosphere: '', timePeriod: '' },
      },
      player: {
        role: 'protagonist',
        characterId: 'char-p',
        name: 'Subject P',
      },
      cast: [
        {
          id: 'char-a',
          name: 'Operative A',
          isUserCharacter: false,
        },
        {
          id: 'char-b',
          name: 'Operative B',
          isUserCharacter: false,
        },
      ],
      topology: {
        currentNodeId: 'NODE_01',
        readableNodeLabel: 'Node 01',
      },
      runtime: {},
    });

    it('resolves dialogue speaker name to corresponding authorized cast member ID, not raw speaker text', () => {
      const blocks = [
        { type: 'prose', content: 'Observation recorded.' },
        { type: 'dialogue', speaker: 'Operative A', content: 'Status normal.' },
      ];

      const resolvedId = resolveDialogueSpeakerId(blocks, testContext);
      expect(resolvedId).toBe('char-a');
      expect(resolvedId).not.toBe('Operative A');
    });

    it('returns null when no dialogue block is present', () => {
      const blocks = [
        { type: 'prose', content: 'Only ambient prose.' },
        { type: 'environmental_description', content: 'Humming frequency.' },
      ];

      expect(resolveDialogueSpeakerId(blocks, testContext)).toBeNull();
    });

    it('returns null when dialogue speaker is missing or does not match authorized cast', () => {
      expect(
        resolveDialogueSpeakerId(
          [{ type: 'dialogue', speaker: '', content: '...' }],
          testContext
        )
      ).toBeNull();

      expect(
        resolveDialogueSpeakerId(
          [{ type: 'dialogue', speaker: 'Unknown Subject', content: '...' }],
          testContext
        )
      ).toBeNull();
    });

    it('returns null when multiple dialogue blocks exist', () => {
      const blocks = [
        { type: 'dialogue', speaker: 'Operative A', content: 'First line.' },
        { type: 'dialogue', speaker: 'Operative A', content: 'Second line.' },
      ];

      expect(resolveDialogueSpeakerId(blocks, testContext)).toBeNull();
    });
  });

  describe('Server response cast interaction receipt derivation', () => {
    const testContext = EngineTurnContextSchema.parse({
      scenario: {
        title: 'Enclosure',
        setting: { location: 'Node-1', atmosphere: '', timePeriod: '' },
      },
      player: {
        role: 'protagonist',
        characterId: 'char-p',
        name: 'Player',
      },
      cast: [
        {
          id: 'char-a',
          name: 'Operative A',
          isPresent: true,
          expressionProfile: { communicationModes: ['spoken'], expressionGuidance: 'Terse' },
        },
        {
          id: 'char-b',
          name: 'Operative B',
          isPresent: true,
          expressionProfile: { communicationModes: ['spoken'], expressionGuidance: 'Direct' },
        },
      ],
      topology: {
        currentNodeId: 'NODE_01',
        readableNodeLabel: 'Node 01',
      },
      runtime: {},
    });

    it('derives RESPONDED receipt with cast IDs for valid addressed reply', () => {
      const userAction = 'I speak to Operative A about telemetry.';
      const addressedId = resolveExplicitAddressedSpeakerId(userAction, testContext);
      expect(addressedId).toBe('char-a');

      const narrativeBlocks = [
        { type: 'dialogue', speaker: 'Operative A', content: 'Telemetry verified.' },
      ];

      const respondingId = resolveDialogueSpeakerId(narrativeBlocks, testContext);
      expect(respondingId).toBe('char-a');

      const receipt = createCastInteractionReceipt({
        addressedCharacterId: addressedId,
        respondingCharacterId: respondingId,
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-a',
        respondingCharacterId: 'char-a',
        outcome: 'RESPONDED',
      });

      // Verify TurnResponseSchema parses the response with receipt
      const validatedEnvelope = TurnResponseSchema.parse({
        narrative_blocks: narrativeBlocks,
        logic_state: {},
        castInteractionReceipt: receipt,
      });

      expect(validatedEnvelope.castInteractionReceipt?.outcome).toBe('RESPONDED');
      expect(validatedEnvelope.castInteractionReceipt?.addressedCharacterId).toBe('char-a');
      expect(validatedEnvelope.castInteractionReceipt?.respondingCharacterId).toBe('char-a');
    });

    it('derives ADDRESS_UNANSWERED receipt for addressed turn with no dialogue', () => {
      const userAction = 'I ask Operative A for confirmation.';
      const addressedId = resolveExplicitAddressedSpeakerId(userAction, testContext);
      expect(addressedId).toBe('char-a');

      const narrativeBlocks = [
        { type: 'prose', content: 'Operative A remains silent, observing the monitor.' },
      ];

      const respondingId = resolveDialogueSpeakerId(narrativeBlocks, testContext);
      expect(respondingId).toBeNull();

      const receipt = createCastInteractionReceipt({
        addressedCharacterId: addressedId,
        respondingCharacterId: respondingId,
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-a',
        respondingCharacterId: null,
        outcome: 'ADDRESS_UNANSWERED',
      });
    });

    it('derives UNSOLICITED_DIALOGUE receipt for valid unaddressed dialogue turn', () => {
      const userAction = 'I check the console interface.';
      const addressedId = resolveExplicitAddressedSpeakerId(userAction, testContext);
      expect(addressedId).toBeNull();

      const narrativeBlocks = [
        { type: 'dialogue', speaker: 'Operative B', content: 'Grid power fluctuating.' },
      ];

      const respondingId = resolveDialogueSpeakerId(narrativeBlocks, testContext);
      expect(respondingId).toBe('char-b');

      const receipt = createCastInteractionReceipt({
        addressedCharacterId: addressedId,
        respondingCharacterId: respondingId,
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: null,
        respondingCharacterId: 'char-b',
        outcome: 'UNSOLICITED_DIALOGUE',
      });
    });

    it('derives MISMATCH receipt when addressed and responding characters are distinct', () => {
      const receipt = createCastInteractionReceipt({
        addressedCharacterId: 'char-a',
        respondingCharacterId: 'char-b',
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: 'char-a',
        respondingCharacterId: 'char-b',
        outcome: 'MISMATCH',
      });
    });

    it('derives NONE receipt when neither addressed nor responding dialogue is present', () => {
      const receipt = createCastInteractionReceipt({
        addressedCharacterId: null,
        respondingCharacterId: null,
      });

      expect(receipt).toEqual({
        version: 1,
        addressedCharacterId: null,
        respondingCharacterId: null,
        outcome: 'NONE',
      });
    });
  });
});
