import * as fs from 'fs';
import * as path from 'path';
import { describe, expect, it } from 'vitest';
import { TurnRequestSchema, TurnResultSchema, EngineTurnContextSchema, TurnResponseSchema } from '../schemas/engine';
import {
  validateDialogueBlocks,
  resolveExplicitAddressedSpeakerId,
  resolveDialogueSpeakerId,
  formatCastLedger,
  normalizeCastSkepticismDeltas,
  enforceNarrativeReconciliationBoundaries,
  finalizeTurnCausality,
} from './turn';
import { createCastInteractionReceipt } from '../../src/lib/castInteraction';
import { createIntentReceipt } from '../../src/lib/intentReceipt';
import { createNarrativeReconciliationReceipt } from '../../src/lib/narrativeReconciliation';

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

  describe('TurnResultSchema and TurnResponseSchema', () => {
    const validIntentProposal = {
      action_kind: 'INVESTIGATE' as const,
      action_subtype: null,
      pressure_direction: 'MAINTAIN' as const,
      dramatic_tactic: 'NONE' as const,
      intent_synergy: 'N/A' as const,
    };

    const validReconciliationProposal = {
      mode: 'CANONICAL' as const,
      feasibility: 'SUPPORTED' as const,
      reason_code: 'NONE' as const,
      fictional_time_cost: 'MOMENT' as const,
      authority_alignment: 'NOT_APPLICABLE' as const,
      memory_echo_candidate: null,
    };

    it('validates a well-formed turn result frame with proposals', () => {
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
        intent_proposal: validIntentProposal,
        reconciliation_proposal: validReconciliationProposal,
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 3,
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
      expect(parsed.intent_proposal.action_kind).toBe('INVESTIGATE');
      expect(parsed.reconciliation_proposal.mode).toBe('CANONICAL');
      expect(parsed.logic_state.suggested_tension).toBe(3);
      expect(parsed.topologyDelta?.isExpansion).toBe(true);
      expect(parsed.topologyDelta?.newNodeDef?.id).toBe('ROOM_02');
    });

    it('rejects missing intent_proposal or reconciliation_proposal', () => {
      const baseResult = {
        narrative_blocks: [{ type: 'prose', content: 'Observation.' }],
        logic_state: {},
      };

      expect(() =>
        TurnResultSchema.parse({
          ...baseResult,
          reconciliation_proposal: validReconciliationProposal,
        })
      ).toThrow();

      expect(() =>
        TurnResultSchema.parse({
          ...baseResult,
          intent_proposal: validIntentProposal,
        })
      ).toThrow();
    });

    it('rejects invalid enum values in proposals', () => {
      const baseResult = {
        narrative_blocks: [{ type: 'prose', content: 'Observation.' }],
        logic_state: {},
      };

      expect(() =>
        TurnResultSchema.parse({
          ...baseResult,
          intent_proposal: {
            ...validIntentProposal,
            action_kind: 'INVALID_ACTION',
          },
          reconciliation_proposal: validReconciliationProposal,
        })
      ).toThrow();

      expect(() =>
        TurnResultSchema.parse({
          ...baseResult,
          intent_proposal: validIntentProposal,
          reconciliation_proposal: {
            ...validReconciliationProposal,
            mode: 'INVALID_MODE',
          },
        })
      ).toThrow();
    });

    it('rejects more than 2 narrative blocks', () => {
      const invalidResult = {
        narrative_blocks: [
          { type: 'prose', content: 'Block 1' },
          { type: 'prose', content: 'Block 2' },
          { type: 'prose', content: 'Block 3' },
        ],
        intent_proposal: validIntentProposal,
        reconciliation_proposal: validReconciliationProposal,
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 1,
          terminal_flags: [],
        },
      };

      expect(() => TurnResultSchema.parse(invalidResult)).toThrow();
    });

    it('rejects an unknown narrative block type', () => {
      expect(() =>
        TurnResultSchema.parse({
          narrative_blocks: [{ type: 'invented_type', content: 'Not a valid block.' }],
          intent_proposal: validIntentProposal,
          reconciliation_proposal: validReconciliationProposal,
          logic_state: {},
        })
      ).toThrow();
    });

    it('rejects non-string narrative content', () => {
      expect(() =>
        TurnResultSchema.parse({
          narrative_blocks: [{ type: 'prose', content: 42 }],
          intent_proposal: validIntentProposal,
          reconciliation_proposal: validReconciliationProposal,
          logic_state: {},
        })
      ).toThrow();
    });

    it('rejects an invalid topology expansion flag rather than coercing it', () => {
      expect(() =>
        TurnResultSchema.parse({
          narrative_blocks: [{ type: 'prose', content: 'The corridor remains still.' }],
          intent_proposal: validIntentProposal,
          reconciliation_proposal: validReconciliationProposal,
          logic_state: {},
          topologyDelta: { isExpansion: 'false' },
        })
      ).toThrow();
    });

    it('validates TurnResponseSchema and confirms proposal keys are omitted from required schema', () => {
      const responseEnvelope = {
        narrative_blocks: [{ type: 'prose', content: 'Neutral observation.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 1,
          requested_transition: null,
          terminal_flags: [],
          cast_deltas: [],
        },
        intentReceipt: createIntentReceipt(validIntentProposal),
        narrativeReconciliationReceipt: createNarrativeReconciliationReceipt(
          validReconciliationProposal,
          'protagonist'
        ),
      };

      const parsed = TurnResponseSchema.parse(responseEnvelope);
      expect(parsed.intentReceipt?.action_kind).toBe('INVESTIGATE');
      expect(parsed.narrativeReconciliationReceipt?.mode).toBe('CANONICAL');
      expect((parsed as Record<string, unknown>).intent_proposal).toBeUndefined();
      expect((parsed as Record<string, unknown>).reconciliation_proposal).toBeUndefined();
    });
  });

  describe('enforceNarrativeReconciliationBoundaries', () => {
    const baseModelResult = {
      narrative_blocks: [
        { type: 'prose' as const, content: 'A sudden burst of unreal light appears.' },
      ],
      intent_proposal: {
        action_kind: 'MOVE' as const,
        action_subtype: null,
        pressure_direction: 'MAINTAIN' as const,
        dramatic_tactic: 'NONE' as const,
        intent_synergy: 'N/A' as const,
      },
      reconciliation_proposal: {
        mode: 'EXPERIENTIAL_REANCHORED' as const,
        feasibility: 'IMPOSSIBLE' as const,
        reason_code: 'PHYSICAL_LIMIT' as const,
        fictional_time_cost: 'MOMENT' as const,
        authority_alignment: 'NOT_APPLICABLE' as const,
        memory_echo_candidate: 'Unreal light flash.',
      },
      logic_state: {
        current_phase: 'LATENT',
        suggested_tension: 4,
        requested_transition: 'IMPOSSIBLE_ROOM',
        terminal_flags: ['FLAG_A'],
        cast_deltas: [{ character_id: 'char_1', skepticism_delta: 0.1 }],
        cast_ledger: [],
      },
      topologyDelta: {
        isExpansion: true,
        newNodeDef: {
          id: 'IMPOSSIBLE_ROOM',
          geometry: 'Chamber',
          hazards: [],
          exitVectors: [],
        },
      },
    };

    it('suppresses transition, expansion, and cast deltas for EXPERIENTIAL_REANCHORED mode', () => {
      const bounded = enforceNarrativeReconciliationBoundaries(baseModelResult);

      expect(bounded.logic_state.requested_transition).toBeNull();
      expect(bounded.logic_state.cast_deltas).toEqual([]);
      expect(bounded.topologyDelta).toEqual({ isExpansion: false, newNodeDef: null });

      // Preserves narrative, phase, tension, terminal flags, and proposals
      expect(bounded.narrative_blocks).toEqual(baseModelResult.narrative_blocks);
      expect(bounded.logic_state.current_phase).toBe('LATENT');
      expect(bounded.logic_state.suggested_tension).toBe(4);
      expect(bounded.logic_state.terminal_flags).toEqual(['FLAG_A']);
      expect(bounded.intent_proposal).toEqual(baseModelResult.intent_proposal);
      expect(bounded.reconciliation_proposal).toEqual(baseModelResult.reconciliation_proposal);
    });

    it('does not alter CANONICAL or MIXED results', () => {
      const canonicalResult = {
        ...baseModelResult,
        reconciliation_proposal: {
          ...baseModelResult.reconciliation_proposal,
          mode: 'CANONICAL' as const,
        },
      };

      const boundedCanonical = enforceNarrativeReconciliationBoundaries(canonicalResult);
      expect(boundedCanonical.logic_state.requested_transition).toBe('IMPOSSIBLE_ROOM');
      expect(boundedCanonical.logic_state.cast_deltas).toHaveLength(1);
      expect(boundedCanonical.topologyDelta?.isExpansion).toBe(true);

      const mixedResult = {
        ...baseModelResult,
        reconciliation_proposal: {
          ...baseModelResult.reconciliation_proposal,
          mode: 'MIXED' as const,
        },
      };

      const boundedMixed = enforceNarrativeReconciliationBoundaries(mixedResult);
      expect(boundedMixed.logic_state.requested_transition).toBe('IMPOSSIBLE_ROOM');
      expect(boundedMixed.logic_state.cast_deltas).toHaveLength(1);
      expect(boundedMixed.topologyDelta?.isExpansion).toBe(true);
    });

    it('normalizes authority alignment for antagonist vs non-antagonist roles', () => {
      const antagonistProposal = {
        mode: 'CANONICAL' as const,
        feasibility: 'SUPPORTED' as const,
        reason_code: 'NONE' as const,
        fictional_time_cost: 'MOMENT' as const,
        authority_alignment: 'WITHIN_CONTRACT' as const,
        memory_echo_candidate: null,
      };

      const nonAntagonistReceipt = createNarrativeReconciliationReceipt(
        antagonistProposal,
        'protagonist'
      );
      expect(nonAntagonistReceipt.authority_alignment).toBe('NOT_APPLICABLE');

      const antagonistReceipt = createNarrativeReconciliationReceipt(
        antagonistProposal,
        'antagonist'
      );
      expect(antagonistReceipt.authority_alignment).toBe('WITHIN_CONTRACT');
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

  describe('Phase 3G.2B: Causal Feasibility Integration (finalizeTurnCausality)', () => {
    const baseContext = EngineTurnContextSchema.parse({
      scenario: {
        title: 'Sector 7 Facility',
        premise: 'Contained environmental research compound.',
        worldRules: ['Air filtration requires active power.'],
        setting: { location: 'Control Hub', atmosphere: 'Sterile', timePeriod: '2094' },
      },
      player: {
        role: 'protagonist',
        characterId: 'char-player',
        name: 'Operative Cole',
        description: 'Lead surveyor',
      },
      cast: [
        {
          id: 'char-player',
          name: 'Operative Cole',
          role: 'Surveyor',
          isUserCharacter: true,
        },
        {
          id: 'char-elena',
          name: 'Dr. Elena Rhodes',
          role: 'Analyst',
          isPresent: true,
          skepticism: 0.8,
          expressionProfile: {
            communicationModes: ['spoken', 'mediated'],
            expressionGuidance: 'Precise and methodical.',
          },
        },
        {
          id: 'char-remote',
          name: 'Supervisor Ward',
          role: 'Coordinator',
          isPresent: false,
          skepticism: 0.5,
          expressionProfile: {
            communicationModes: ['spoken'],
            expressionGuidance: 'Remote coordination instructions.',
          },
        },
        {
          id: 'char-probe',
          name: 'Autonomous Probe',
          role: 'Sensor Drone',
          isPresent: true,
          skepticism: 0.5,
          expressionProfile: {
            communicationModes: ['nonverbal'],
            expressionGuidance: 'Mechanical sensor sweeps and light indicators.',
          },
        },
      ],
      topology: {
        currentNodeId: 'CONTROL_HUB',
        readableNodeLabel: 'Control Hub',
        allowedOutgoingExits: [
          {
            from: 'CONTROL_HUB',
            to: 'AIRLOCK_01',
            kind: 'PHYSICAL',
            userInitiated: true,
          },
        ],
      },
      runtime: {
        phase: 'LATENT',
        tension: 1,
        coherence: 1.0,
        reconciliationRevision: 0,
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
      },
    });

    it('handles invalid move despite optimistic model metadata (Case 1)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You sprint through a non-existent breach into Sector Zero.' },
        ],
        intent_proposal: {
          action_kind: 'MOVE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 3,
          requested_transition: 'UNCONNECTED_SECTOR_ZERO',
          terminal_flags: [],
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: -0.1 }],
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'UNCONNECTED_SECTOR_ZERO',
            geometry: 'Chamber',
            hazards: [],
            exitVectors: [],
          },
        },
      });

      const userAction = 'I run into Sector Zero.';
      const output = finalizeTurnCausality({
        result: modelResult,
        userAction,
        context: baseContext,
      });

      // Assert causal feasibility result
      expect(output.causal.feasibility).toBe('IMPOSSIBLE');
      expect(output.causal.reason_code).toBe('TOPOLOGY_LIMIT');
      expect(output.causal.suppressStructuralDeltas).toBe(true);

      // Assert narrative reconciliation receipt
      expect(output.narrativeReconciliationReceipt.feasibility).toBe('IMPOSSIBLE');
      expect(output.narrativeReconciliationReceipt.reason_code).toBe('TOPOLOGY_LIMIT');
      expect(output.narrativeReconciliationReceipt.mode).toBe('EXPERIENTIAL_REANCHORED');
      expect(output.narrativeReconciliationReceipt.revision_increment).toBe(1);

      // Assert structural suppression
      expect(output.boundedResult.logic_state.requested_transition).toBeNull();
      expect(output.boundedResult.logic_state.cast_deltas).toEqual([]);
      expect(output.boundedResult.topologyDelta).toEqual({ isExpansion: false, newNodeDef: null });

      // Assert narrative blocks preserved
      expect(output.boundedResult.narrative_blocks).toEqual(modelResult.narrative_blocks);

      // Assert final transition is not accepted
      expect(output.transitionReceipt.accepted).toBe(false);
      expect(output.transitionReceipt.requestedNodeId).toBeNull();
    });

    it('handles accepted mapped move (Case 2)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You cycle through the primary airlock hatch.' },
        ],
        intent_proposal: {
          action_kind: 'MOVE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 2,
          requested_transition: 'AIRLOCK_01',
          terminal_flags: [],
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: 0.05 }],
        },
        topologyDelta: { isExpansion: false, newNodeDef: null },
      });

      const userAction = 'I proceed to Airlock 01.';
      const output = finalizeTurnCausality({
        result: modelResult,
        userAction,
        context: baseContext,
      });

      // Assert causal feasibility and receipt
      expect(output.causal.feasibility).toBe('SUPPORTED');
      expect(output.causal.reason_code).toBe('NONE');
      expect(output.causal.suppressStructuralDeltas).toBe(false);
      expect(output.narrativeReconciliationReceipt.feasibility).toBe('SUPPORTED');
      expect(output.narrativeReconciliationReceipt.reason_code).toBe('NONE');
      expect(output.narrativeReconciliationReceipt.mode).toBe('CANONICAL');
      expect(output.narrativeReconciliationReceipt.revision_increment).toBe(0);

      // Assert transition remains accepted
      expect(output.transitionReceipt.accepted).toBe(true);
      expect(output.transitionReceipt.toNodeId).toBe('AIRLOCK_01');
      expect(output.boundedResult.logic_state.requested_transition).toBe('AIRLOCK_01');
    });

    it('handles communication to an absent exact target (Case 3)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You speak into the empty control room calling for Ward.' },
        ],
        intent_proposal: {
          action_kind: 'COMMUNICATE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 2,
          requested_transition: null,
          terminal_flags: [],
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: 0.1 }],
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: { id: 'EXTRA_ROOM', geometry: 'Chamber', hazards: [], exitVectors: [] },
        },
      });

      const userAction = 'I ask Supervisor Ward for clearance.';
      const output = finalizeTurnCausality({
        result: modelResult,
        userAction,
        context: baseContext,
      });

      expect(output.castTarget.status).toBe('ABSENT');
      expect(output.causal.feasibility).toBe('IMPOSSIBLE');
      expect(output.causal.reason_code).toBe('CAST_PRESENCE_LIMIT');
      expect(output.causal.suppressStructuralDeltas).toBe(true);
      expect(output.narrativeReconciliationReceipt.feasibility).toBe('IMPOSSIBLE');
      expect(output.narrativeReconciliationReceipt.reason_code).toBe('CAST_PRESENCE_LIMIT');
      expect(output.narrativeReconciliationReceipt.mode).toBe('EXPERIENTIAL_REANCHORED');

      // Assert structural deltas suppressed while prose remains
      expect(output.boundedResult.logic_state.cast_deltas).toEqual([]);
      expect(output.boundedResult.topologyDelta).toEqual({ isExpansion: false, newNodeDef: null });
      expect(output.boundedResult.narrative_blocks).toEqual(modelResult.narrative_blocks);
    });

    it('handles communication to an ineligible nonverbal exact target (Case 3 variant)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You talk to the sensor drone.' },
        ],
        intent_proposal: {
          action_kind: 'COMMUNICATE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 1,
          requested_transition: null,
          terminal_flags: [],
          cast_deltas: [],
        },
      });

      const userAction = 'I ask Autonomous Probe for a status report.';
      const output = finalizeTurnCausality({
        result: modelResult,
        userAction,
        context: baseContext,
      });

      expect(output.castTarget.status).toBe('INELIGIBLE');
      expect(output.causal.feasibility).toBe('IMPOSSIBLE');
      expect(output.causal.reason_code).toBe('CAST_PRESENCE_LIMIT');
      expect(output.causal.suppressStructuralDeltas).toBe(true);
    });

    it('evaluates insufficient server evidence as UNCLEAR / NONE without forced suppression (Case 4)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You attempt to bypass the pneumatic valve linkage.' },
        ],
        intent_proposal: {
          action_kind: 'MANIPULATE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 2,
          requested_transition: null,
          terminal_flags: [],
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: 0.05 }],
        },
      });

      const userAction = 'I force the pneumatic valve lever.';
      const output = finalizeTurnCausality({
        result: modelResult,
        userAction,
        context: baseContext,
      });

      // Feasibility becomes UNCLEAR / NONE
      expect(output.causal.feasibility).toBe('UNCLEAR');
      expect(output.causal.reason_code).toBe('NONE');
      expect(output.causal.suppressStructuralDeltas).toBe(false);

      expect(output.narrativeReconciliationReceipt.feasibility).toBe('UNCLEAR');
      expect(output.narrativeReconciliationReceipt.reason_code).toBe('NONE');
      expect(output.narrativeReconciliationReceipt.mode).toBe('CANONICAL');

      // Does not gain structural suppression merely because evidence is unknown
      expect(output.boundedResult.logic_state.cast_deltas).toHaveLength(1);
    });

    it('normalizes authority alignment for non-antagonist and antagonist roles (Case 5)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [{ type: 'prose', content: 'Observation.' }],
        intent_proposal: {
          action_kind: 'INVESTIGATE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'WITHIN_CONTRACT',
          memory_echo_candidate: null,
        },
        logic_state: {},
      });

      // 1. Non-antagonist: role is protagonist -> NOT_APPLICABLE
      const nonAntagonistOutput = finalizeTurnCausality({
        result: modelResult,
        userAction: 'I inspect the gauges.',
        context: baseContext,
      });
      expect(nonAntagonistOutput.causal.authority_alignment).toBe('NOT_APPLICABLE');
      expect(nonAntagonistOutput.narrativeReconciliationReceipt.authority_alignment).toBe(
        'NOT_APPLICABLE'
      );

      // 2. Antagonist with complete contract: preserves WITHIN_CONTRACT
      const antagonistContext = EngineTurnContextSchema.parse({
        ...baseContext,
        player: {
          role: 'antagonist',
          characterId: 'char-antagonist',
          name: 'The Facility AI',
          description: 'Hostile mainframe',
        },
        participationContext: {
          mode: 'antagonist',
          seat: { kind: 'force', name: 'The Facility AI' },
          initialGoal: 'Subdue occupants',
          boundedFacts: ['All cameras are functional.'],
          authorityContract: {
            authority: 'Can control facility lighting and door seals.',
            limits: 'Cannot mutate physical bulkheads directly.',
          },
          victimField: {
            kind: 'group',
            collectiveDesignation: 'Survivors',
            members: [],
          },
        },
      });

      const antagonistOutput = finalizeTurnCausality({
        result: modelResult,
        userAction: 'I observe the survivors from the ceiling monitors.',
        context: antagonistContext,
      });
      expect(antagonistOutput.causal.authority_alignment).toBe('WITHIN_CONTRACT');
      expect(antagonistOutput.narrativeReconciliationReceipt.authority_alignment).toBe('WITHIN_CONTRACT');

      // 3. Antagonist without contract: normalized to EXCEEDS_CONTRACT
      const antagonistNoContractContext = EngineTurnContextSchema.parse({
        ...baseContext,
        player: {
          role: 'antagonist',
          characterId: 'char-antagonist',
          name: 'The Facility AI',
          description: 'Hostile mainframe',
        },
      });

      const antagonistNoContractOutput = finalizeTurnCausality({
        result: modelResult,
        userAction: 'I observe the survivors.',
        context: antagonistNoContractContext,
      });
      expect(antagonistNoContractOutput.causal.feasibility).toBe('IMPOSSIBLE');
      expect(antagonistNoContractOutput.causal.reason_code).toBe('AUTHORITY_LIMIT');
      expect(antagonistNoContractOutput.causal.authority_alignment).toBe('EXCEEDS_CONTRACT');
      expect(antagonistNoContractOutput.narrativeReconciliationReceipt.authority_alignment).toBe('EXCEEDS_CONTRACT');
    });

    it('suppresses structural deltas for Director MOVE and MANIPULATE while retaining prose', () => {
      const directorContext = EngineTurnContextSchema.parse({
        ...baseContext,
        player: {
          role: 'director',
          name: 'Director',
          description: 'Framing narrative',
        },
      });

      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'The camera cuts to the airlock corridor.' },
        ],
        intent_proposal: {
          action_kind: 'MOVE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          requested_transition: 'AIRLOCK_01',
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: 0.1 }],
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: { id: 'NEW_ZONE', geometry: 'Corridor', hazards: [], exitVectors: [] },
        },
      });

      const output = finalizeTurnCausality({
        result: modelResult,
        userAction: 'Cut to the airlock corridor.',
        context: directorContext,
      });

      expect(output.causal.feasibility).toBe('CONSTRAINED');
      expect(output.causal.reason_code).toBe('AUTHORITY_LIMIT');
      expect(output.causal.suppressStructuralDeltas).toBe(true);
      expect(output.narrativeReconciliationReceipt.mode).toBe('EXPERIENTIAL_REANCHORED');

      expect(output.boundedResult.logic_state.requested_transition).toBeNull();
      expect(output.boundedResult.logic_state.cast_deltas).toEqual([]);
      expect(output.boundedResult.topologyDelta).toEqual({ isExpansion: false, newNodeDef: null });
      expect(output.boundedResult.narrative_blocks).toEqual(modelResult.narrative_blocks);
      expect(output.transitionReceipt.accepted).toBe(false);
    });

    it('suppresses structural deltas for Witness active actions while retaining prose', () => {
      const witnessContext = EngineTurnContextSchema.parse({
        ...baseContext,
        player: {
          role: 'witness',
          name: 'Witness',
          description: 'Observer in shadows',
        },
      });

      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [
          { type: 'prose', content: 'You try to turn the lever but remain merely a phantom observer.' },
        ],
        intent_proposal: {
          action_kind: 'MANIPULATE',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {
          cast_deltas: [{ character_id: 'char-elena', skepticism_delta: 0.1 }],
        },
      });

      const output = finalizeTurnCausality({
        result: modelResult,
        userAction: 'I pull the lever.',
        context: witnessContext,
      });

      expect(output.causal.feasibility).toBe('CONSTRAINED');
      expect(output.causal.reason_code).toBe('AUTHORITY_LIMIT');
      expect(output.causal.suppressStructuralDeltas).toBe(true);
      expect(output.narrativeReconciliationReceipt.mode).toBe('EXPERIENTIAL_REANCHORED');

      expect(output.boundedResult.logic_state.cast_deltas).toEqual([]);
      expect(output.boundedResult.narrative_blocks).toEqual(modelResult.narrative_blocks);
    });

    it('ensures final TurnResponseSchema output omits proposal keys (Case 6)', () => {
      const modelResult = TurnResultSchema.parse({
        narrative_blocks: [{ type: 'prose', content: 'Telemetry updated.' }],
        intent_proposal: {
          action_kind: 'SYSTEM',
          action_subtype: null,
          pressure_direction: 'MAINTAIN',
          dramatic_tactic: 'NONE',
          intent_synergy: 'N/A',
        },
        reconciliation_proposal: {
          mode: 'CANONICAL',
          feasibility: 'SUPPORTED',
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        },
        logic_state: {},
      });

      const {
        boundedResult,
        intentReceipt,
        narrativeReconciliationReceipt,
        transitionReceipt,
      } = finalizeTurnCausality({
        result: modelResult,
        userAction: 'SYSTEM_INIT',
        context: baseContext,
      });

      const responseEnvelope: Record<string, unknown> = {
        narrative_blocks: boundedResult.narrative_blocks,
        logic_state: boundedResult.logic_state,
        topologyDelta: boundedResult.topologyDelta,
        transitionReceipt,
        intentReceipt,
        narrativeReconciliationReceipt,
      };

      const validated = TurnResponseSchema.parse(responseEnvelope);
      expect(validated.intentReceipt).toBeDefined();
      expect(validated.narrativeReconciliationReceipt).toBeDefined();
      expect((validated as Record<string, unknown>).intent_proposal).toBeUndefined();
      expect((validated as Record<string, unknown>).reconciliation_proposal).toBeUndefined();
    });

    it('verifies the route file contains one and only one generateStructuredResponse invocation (Case 8)', () => {
      const turnRoutePath = path.resolve(__dirname, 'turn.ts');
      const turnRouteCode = fs.readFileSync(turnRoutePath, 'utf-8');

      // Match all function call occurrences of generateStructuredResponse(
      const matches = turnRouteCode.match(/generateStructuredResponse\s*\(/g);
      expect(matches).not.toBeNull();
      expect(matches?.length).toBe(1);
    });
  });
});
