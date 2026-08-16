import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  compileAdLibInduction,
  initiateAdLibSession,
} from '../../lib/adLibCompiler';
import {
  AdLibInductionSchema,
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
  ParticipationContextSchema,
} from '../../types/adLib';
import {
  RatifiedEngineFrame,
  TurnReceipt,
} from '../../types';
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';
import { captureRuntimeSnapshot } from './snapshot';
import { CommittedTurnPayload } from './events';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Phase 3A: Ad Lib Induction & Participation Context', () => {
  beforeEach(() => {
    useEngineStore.getState().clearBlueprint();
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();
  });

  describe('AdLibInductionSchema Zod validation', () => {
    it('accepts a valid protagonist induction payload', () => {
      const payload: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Sub-Level 4 Cryogenic Vault',
        goal: 'Restore cooling manifold before stasis fails',
        unsettlingDetail: 'Frost patterns in the shape of human fingers',
        participantName: 'Sgt. David Ward',
        identity: 'Night-shift Cryo-Tech Specialist',
        ability: 'Thermal diagnostic overrides',
        limitation: 'Oxygen toxicity tremors under pressure',
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('protagonist');
      expect(parsed.placeSeed).toBe('Sub-Level 4 Cryogenic Vault');
    });

    it('rejects protagonist induction when required participantName is missing or empty', () => {
      const invalid = {
        participationMode: 'protagonist',
        placeSeed: 'Sub-Level 4 Cryogenic Vault',
        goal: 'Restore cooling manifold',
        participantName: '   ',
      };

      expect(() => AdLibInductionSchema.parse(invalid)).toThrow();
    });

    it('accepts a valid antagonist induction payload with force seat', () => {
      const payload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Derelict Atmospheric Siphon',
        goal: 'Collapse structural bulkheads',
        unsettlingDetail: 'Metallic shrieking from the ventilation shafts',
        oppositionSeat: {
          kind: 'force',
          name: 'The Abyssal Siphon',
          description: 'A sentient pressure anomaly crushing the habitat.',
          goal: 'Crush the survivors under deep-ocean barometric load.',
          ability: 'Pressure wave pulses',
          limitation: 'Cannot pierce hermetic quartz barriers',
        },
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('antagonist');
      if (parsed.participationMode === 'antagonist') {
        expect(parsed.oppositionSeat.kind).toBe('force');
        expect(parsed.oppositionSeat.name).toBe('The Abyssal Siphon');
      }
    });

    it('accepts a valid antagonist induction payload with character seat', () => {
      const payload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Sector',
        goal: 'Stalk and isolate the perimeter patrol',
        unsettlingDetail: 'Rattling hydraulic valves in the darkness',
        oppositionSeat: {
          kind: 'character',
          name: 'The Sub-Level Warden',
          description: 'A cybernetically augmented containment sentinel.',
          goal: 'Execute lethal quarantine protocols.',
          ability: 'Thermal tracking and blast door override',
          limitation: 'Vulnerable to high-voltage EMP discharge',
        },
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('antagonist');
      if (parsed.participationMode === 'antagonist') {
        expect(parsed.oppositionSeat.kind).toBe('character');
        expect(parsed.oppositionSeat.name).toBe('The Sub-Level Warden');
        expect(parsed.oppositionSeat.ability).toBe('Thermal tracking and blast door override');
      }
    });

    it('rejects malformed antagonist induction with missing or invalid seat data', () => {
      // Missing oppositionSeat
      expect(() =>
        AdLibInductionSchema.parse({
          participationMode: 'antagonist',
          placeSeed: 'Sub-Level Quarantine Sector',
          goal: 'Stalk patrol',
        })
      ).toThrow();

      // Empty name in oppositionSeat
      expect(() =>
        AdLibInductionSchema.parse({
          participationMode: 'antagonist',
          placeSeed: 'Sub-Level Quarantine Sector',
          goal: 'Stalk patrol',
          oppositionSeat: {
            kind: 'character',
            name: '   ',
            goal: 'Execute quarantine',
          },
        })
      ).toThrow();

      // Invalid kind in oppositionSeat
      expect(() =>
        AdLibInductionSchema.parse({
          participationMode: 'antagonist',
          placeSeed: 'Sub-Level Quarantine Sector',
          goal: 'Stalk patrol',
          oppositionSeat: {
            kind: 'spectator',
            name: 'Watcher Unit',
            goal: 'Observe',
          },
        })
      ).toThrow();
    });

    it('accepts a valid director induction payload', () => {
      const payload: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Fog-Bound Pine Barrens Sanitarium',
        goal: 'Stage the gradual psychological collapse of the research unit',
        unsettlingDetail: 'Reverse bell chimes from the clocktower',
        directorFocus: 'Claustrophobic dread, acoustic isolation, slow burn',
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('director');
    });

    it('rejects invalid director induction when required common fields are missing or empty', () => {
      // Empty placeSeed
      expect(() =>
        AdLibInductionSchema.parse({
          participationMode: 'director',
          placeSeed: '   ',
          goal: 'Stage gradual collapse',
        })
      ).toThrow();

      // Empty goal
      expect(() =>
        AdLibInductionSchema.parse({
          participationMode: 'director',
          placeSeed: 'Fog-Bound Sanitarium',
          goal: '',
        })
      ).toThrow();
    });
  });

  describe('compileAdLibInduction pure compiler', () => {
    it('compiles protagonist mode with single controlled character and bounded facts', () => {
      const input: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Derelict Station Alpha',
        goal: 'Power on the primary comms dish',
        unsettlingDetail: 'Static clicks matching a heartbeat',
        participantName: 'Lt. Ripley',
        identity: 'Warrant Officer',
        ability: 'Thermal diagnostic proficiency',
        limitation: 'Exhaustion',
      };

      const compiled = compileAdLibInduction(input);

      expect(compiled.blueprint.cast).toHaveLength(1);
      expect(compiled.blueprint.cast[0].name).toBe('Lt. Ripley');
      expect(compiled.blueprint.cast[0].role).toBe('protagonist');
      expect(compiled.blueprint.cast[0].isUserCharacter).toBe(true);

      expect(compiled.participationContext.mode).toBe('protagonist');
      expect(compiled.participationContext.seat?.name).toBe('Lt. Ripley');
      expect(compiled.participationContext.seat?.kind).toBe('protagonist');
      expect(compiled.participationContext.initialGoal).toBe('Power on the primary comms dish');
      expect(compiled.participationContext.boundedFacts).toContain('Location: Derelict Station Alpha');
      expect(compiled.participationContext.boundedFacts).toContain('Aptitude: Thermal diagnostic proficiency');

      expect(compiled.initialSpatialNode.id).toBe('NODE_ENTRY');
      expect(compiled.initialSpatialNode.name).toBe('Derelict Station Alpha');
    });

    it('compiles antagonist force seat WITHOUT inventing an NPC character in cast', () => {
      const input: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Subterranean Aquifer',
        goal: 'Flood the lowest chambers',
        unsettlingDetail: 'Rising oily black tide',
        oppositionSeat: {
          kind: 'force',
          name: 'The Stygian Tide',
          description: 'A subterranean liquid biomass inundating all passages.',
          goal: 'Drown the remaining lights.',
          ability: 'Corrosive flooding',
          limitation: 'Blocked by dry fire barriers',
        },
      };

      const compiled = compileAdLibInduction(input);

      // Force seat MUST NOT create an NPC in cast
      expect(compiled.blueprint.cast).toHaveLength(0);

      expect(compiled.participationContext.mode).toBe('antagonist');
      expect(compiled.participationContext.seat?.kind).toBe('force');
      expect(compiled.participationContext.seat?.name).toBe('The Stygian Tide');
      const envRules = Array.isArray(compiled.blueprint.environmentalRules)
        ? compiled.blueprint.environmentalRules
        : [compiled.blueprint.environmentalRules || ''];
      expect(envRules.some((r) => r.includes('The Stygian Tide'))).toBe(true);
    });

    it('compiles antagonist character seat WITH controlled character in cast and bounded facts', () => {
      const input: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Sector',
        goal: 'Stalk and isolate the perimeter patrol',
        unsettlingDetail: 'Rattling hydraulic valves',
        oppositionSeat: {
          kind: 'character',
          name: 'The Sub-Level Warden',
          description: 'A cybernetically augmented containment sentinel.',
          goal: 'Execute lethal quarantine protocols.',
          ability: 'Thermal tracking and blast door override',
          limitation: 'Vulnerable to high-voltage EMP discharge',
        },
      };

      const compiled = compileAdLibInduction(input);

      expect(compiled.blueprint.cast).toHaveLength(1);
      expect(compiled.blueprint.cast[0].name).toBe('The Sub-Level Warden');
      expect(compiled.blueprint.cast[0].role).toBe('antagonist');
      expect(compiled.blueprint.cast[0].isUserCharacter).toBe(true);

      expect(compiled.participationContext.mode).toBe('antagonist');
      expect(compiled.participationContext.seat?.kind).toBe('character');
      expect(compiled.participationContext.seat?.name).toBe('The Sub-Level Warden');
      expect(
        compiled.participationContext.boundedFacts.some((f) => f.includes('The Sub-Level Warden'))
      ).toBe(true);
      expect(compiled.participationContext.boundedFacts).toContain(
        'Threat Vector: Thermal tracking and blast door override'
      );
    });

    it('compiles director mode WITHOUT inventing any player character', () => {
      const input: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Abandoned Radio Observatory',
        goal: 'Orchestrate the crescendo of paranoia',
        unsettlingDetail: 'Radio telescopes turning spontaneously in the dark',
        directorFocus: 'Pacing escalation and sensory dissonance',
      };

      const compiled = compileAdLibInduction(input);

      expect(compiled.blueprint.cast).toHaveLength(0);
      expect(compiled.participationContext.mode).toBe('director');
      expect(compiled.participationContext.seat?.kind).toBe('director');
      expect(compiled.participationContext.boundedFacts).toContain('Location: Abandoned Radio Observatory');
      expect(compiled.participationContext.boundedFacts).toContain(
        'Framing Directive: Pacing escalation and sensory dissonance'
      );
    });
  });

  describe('initiateAdLibSession end-to-end flow', () => {
    it('initializes canonical session and stores state in both EngineStore and AppStore', () => {
      const rawInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Orbital Airway Bay',
        goal: 'Reach the atmospheric shuttle',
        unsettlingDetail: 'Flashing red depressurization beacons',
        participantName: 'Chief Engineer Miller',
        identity: 'Systems Tech',
        ability: 'Airlock manual cycling',
        limitation: 'Damaged pressure helmet visor',
      };

      const session = initiateAdLibSession(rawInduction, 'session-adlib-test-01');

      expect(session.blueprint.title).toContain('Orbital Airway Bay');
      expect(session.participationContext.mode).toBe('protagonist');

      // Verify AppStore canonical state
      const appState = useAppStore.getState();
      expect(appState.sessionId).toBe('session-adlib-test-01');
      expect(appState.participationContext?.mode).toBe('protagonist');
      expect(appState.currentNodeId).toBe('NODE_ENTRY');
      expect(appState.spatialGraph).toHaveLength(1);
      expect(appState.spatialGraph[0].id).toBe('NODE_ENTRY');

      // Verify EngineStore state
      const engineState = useEngineStore.getState();
      expect(engineState.activeBlueprint).toBeDefined();
      expect(engineState.participationContext?.mode).toBe('protagonist');
    });
  });

  describe('Participation context reset and token bounds', () => {
    it('clears participationContext on useEngineStore.resetEngine()', () => {
      const rawInduction = {
        participationMode: 'protagonist' as const,
        placeSeed: 'Sub-Level 4 Cryogenic Vault',
        goal: 'Restore the cooling manifold',
        participantName: 'Sgt. David Ward',
      };
      initiateAdLibSession(rawInduction, 'session-test-reset-1');
      expect(useEngineStore.getState().participationContext).not.toBeNull();

      useEngineStore.getState().resetEngine();
      expect(useEngineStore.getState().participationContext).toBeNull();
      expect(useEngineStore.getState().activeBlueprint).toBeNull();
    });

    it('clears participationContext on useAppStore.resetSession()', () => {
      const rawInduction = {
        participationMode: 'protagonist' as const,
        placeSeed: 'Sub-Level 4 Cryogenic Vault',
        goal: 'Restore the cooling manifold',
        participantName: 'Sgt. David Ward',
      };
      initiateAdLibSession(rawInduction, 'session-test-reset-2');
      expect(useAppStore.getState().participationContext).not.toBeNull();

      useAppStore.getState().resetSession();
      expect(useAppStore.getState().participationContext).toBeNull();
      expect(useAppStore.getState().sessionId).toBe('');
    });

    it('enforces token bounds on ParticipationContextSchema', () => {
      const validContext = {
        mode: 'protagonist' as const,
        seat: {
          kind: 'protagonist' as const,
          name: 'Sgt. David Ward',
          description: 'Cryo technician',
          ability: 'Diagnostics',
          limitation: 'Oxygen toxicity',
        },
        initialGoal: 'Restore cooling manifold',
        boundedFacts: ['Fact 1', 'Fact 2'],
      };

      const parsed = ParticipationContextSchema.parse(validContext);
      expect(parsed.mode).toBe('protagonist');

      // Reject oversized name > 100
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          seat: { ...validContext.seat, name: 'a'.repeat(101) },
        })
      ).toThrow();

      // Reject oversized description > 300
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          seat: { ...validContext.seat, description: 'a'.repeat(301) },
        })
      ).toThrow();

      // Reject oversized ability > 200
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          seat: { ...validContext.seat, ability: 'a'.repeat(201) },
        })
      ).toThrow();

      // Reject oversized limitation > 200
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          seat: { ...validContext.seat, limitation: 'a'.repeat(201) },
        })
      ).toThrow();

      // Reject oversized initialGoal > 200
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          initialGoal: 'a'.repeat(201),
        })
      ).toThrow();

      // Reject > 8 boundedFacts
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          boundedFacts: Array.from({ length: 9 }, (_, i) => `Fact ${i}`),
        })
      ).toThrow();

      // Reject oversized fact string > 250
      expect(() =>
        ParticipationContextSchema.parse({
          ...validContext,
          boundedFacts: ['a'.repeat(251)],
        })
      ).toThrow();
    });
  });

  describe('buildEngineTurnContext propagation across modes', () => {
    it('propagates protagonist participation context, seat kind, and bounded facts', () => {
      const input: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Derelict Station Alpha',
        goal: 'Power on the primary comms dish',
        participantName: 'Lt. Ripley',
        identity: 'Warrant Officer',
        ability: 'Thermal diagnostic proficiency',
      };

      const compiled = compileAdLibInduction(input);

      const turnContext = buildEngineTurnContext({
        blueprint: compiled.blueprint,
        selectedRole: 'protagonist',
        participationContext: compiled.participationContext,
        spatialGraph: [compiled.initialSpatialNode],
      });

      expect(turnContext.participationContext).toBeDefined();
      expect(turnContext.participationContext?.mode).toBe('protagonist');
      expect(turnContext.participationContext?.seat?.kind).toBe('protagonist');
      expect(turnContext.participationContext?.seat?.name).toBe('Lt. Ripley');
      expect(turnContext.participationContext?.boundedFacts).toContain('Location: Derelict Station Alpha');
      expect(turnContext.player.name).toBe('Lt. Ripley');
      expect(turnContext.topology.currentNodeId).toBe('NODE_ENTRY');
    });

    it('propagates antagonist force seat context, seat kind, and bounded facts', () => {
      const input: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Subterranean Aquifer',
        goal: 'Flood the lowest chambers',
        oppositionSeat: {
          kind: 'force',
          name: 'The Stygian Tide',
          description: 'A subterranean liquid biomass.',
          goal: 'Drown the remaining lights.',
          ability: 'Corrosive flooding',
        },
      };

      const compiled = compileAdLibInduction(input);

      const turnContext = buildEngineTurnContext({
        blueprint: compiled.blueprint,
        selectedRole: 'antagonist',
        participationContext: compiled.participationContext,
        spatialGraph: [compiled.initialSpatialNode],
      });

      expect(turnContext.participationContext).toBeDefined();
      expect(turnContext.participationContext?.mode).toBe('antagonist');
      expect(turnContext.participationContext?.seat?.kind).toBe('force');
      expect(turnContext.participationContext?.seat?.name).toBe('The Stygian Tide');
      expect(
        turnContext.participationContext?.boundedFacts.some((f) => f.includes('The Stygian Tide'))
      ).toBe(true);
    });

    it('propagates antagonist character seat context, seat kind, and bounded facts', () => {
      const input: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Sector',
        goal: 'Stalk and isolate the perimeter patrol',
        oppositionSeat: {
          kind: 'character',
          name: 'The Sub-Level Warden',
          description: 'A cybernetically augmented containment sentinel.',
          goal: 'Execute lethal quarantine protocols.',
          ability: 'Thermal tracking and blast door override',
        },
      };

      const compiled = compileAdLibInduction(input);

      const turnContext = buildEngineTurnContext({
        blueprint: compiled.blueprint,
        selectedRole: 'antagonist',
        participationContext: compiled.participationContext,
        spatialGraph: [compiled.initialSpatialNode],
      });

      expect(turnContext.participationContext).toBeDefined();
      expect(turnContext.participationContext?.mode).toBe('antagonist');
      expect(turnContext.participationContext?.seat?.kind).toBe('character');
      expect(turnContext.participationContext?.seat?.name).toBe('The Sub-Level Warden');
      expect(turnContext.player.name).toBe('The Sub-Level Warden');
    });

    it('propagates director participation context, seat kind, and bounded facts', () => {
      const input: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Abandoned Radio Observatory',
        goal: 'Orchestrate the crescendo of paranoia',
        directorFocus: 'Pacing escalation and sensory dissonance',
      };

      const compiled = compileAdLibInduction(input);

      const turnContext = buildEngineTurnContext({
        blueprint: compiled.blueprint,
        selectedRole: 'director',
        participationContext: compiled.participationContext,
        spatialGraph: [compiled.initialSpatialNode],
      });

      expect(turnContext.participationContext).toBeDefined();
      expect(turnContext.participationContext?.mode).toBe('director');
      expect(turnContext.participationContext?.seat?.kind).toBe('director');
      expect(turnContext.participationContext?.boundedFacts).toContain(
        'Framing Directive: Pacing escalation and sensory dissonance'
      );
    });
  });

  describe('Committed turn lifecycle across participation modes', () => {
    it('executes a committed turn lifecycle in protagonist mode while preserving receipts and snapshot coherence', () => {
      const session = initiateAdLibSession(
        {
          participationMode: 'protagonist',
          placeSeed: 'Sub-Level Cryogenic Vault',
          goal: 'Restore cooling manifold',
          participantName: 'Sgt. David Ward',
          ability: 'Thermal diagnostics',
        },
        'session-lifecycle-protagonist-01'
      );

      const storeState = useAppStore.getState();
      expect(storeState.turnCount).toBe(0);
      expect(storeState.participationContext?.mode).toBe('protagonist');

      const preSnapshot = captureRuntimeSnapshot({
        sessionId: storeState.sessionId,
        blueprintId: session.blueprint.id,
        turnCount: storeState.turnCount,
        currentNodeId: storeState.currentNodeId,
        activeVector: storeState.activeVector,
        activeTier: storeState.activeTier,
        tensionLevel: storeState.tensionLevel,
        currentPhase: storeState.currentPhase,
      });

      const frame: RatifiedEngineFrame = {
        engine_thoughts: 'Player recalibrates the primary refrigeration cycle valve.',
        narrative_blocks: [
          {
            type: 'prose',
            content: 'The manual valve spins against frosty resistance. Amber warning indicators flash.',
          },
        ],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
        topologyDelta: { isExpansion: false },
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      };

      const turnReceipt: TurnReceipt = {
        turnNumber: 1,
        nodeBefore: 'NODE_ENTRY',
        requestedTarget: null,
        accepted: true,
        reason: 'NO_MOVEMENT_REQUESTED',
        nodeAfter: 'NODE_ENTRY',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Rotate the primary refrigeration valve',
        formattedText: 'The manual valve spins against frosty resistance. Amber warning indicators flash.',
        preSnapshot,
        frame,
        turnReceipt,
      };

      useAppStore.getState().commitTurnResult(payload);

      const nextState = useAppStore.getState();
      expect(nextState.turnCount).toBe(1);
      expect(nextState.currentNodeId).toBe('NODE_ENTRY');
      expect(nextState.tensionLevel).toBe(20);
      expect(nextState.history).toHaveLength(2);
      expect(nextState.history[0].role).toBe('user');
      expect(nextState.history[1].role).toBe('assistant');
      expect(nextState.history[1].turnReceipt?.preSnapshot).toEqual(preSnapshot);
      // Guarantee participationContext is preserved on the store
      expect(nextState.participationContext?.mode).toBe('protagonist');
      expect(nextState.participationContext?.seat?.name).toBe('Sgt. David Ward');
    });

    it('executes a committed turn lifecycle in antagonist force mode while maintaining topology and snapshot authority', () => {
      const session = initiateAdLibSession(
        {
          participationMode: 'antagonist',
          placeSeed: 'Subterranean Aquifer',
          goal: 'Flood the lowest chambers',
          oppositionSeat: {
            kind: 'force',
            name: 'The Stygian Tide',
            description: 'Subterranean liquid biomass.',
            goal: 'Drown remaining lights.',
            ability: 'Corrosive flooding',
          },
        },
        'session-lifecycle-antagonist-01'
      );

      const storeState = useAppStore.getState();
      expect(storeState.turnCount).toBe(0);
      expect(storeState.participationContext?.mode).toBe('antagonist');
      expect(storeState.participationContext?.seat?.kind).toBe('force');

      const preSnapshot = captureRuntimeSnapshot({
        sessionId: storeState.sessionId,
        blueprintId: session.blueprint.id,
        turnCount: storeState.turnCount,
        currentNodeId: storeState.currentNodeId,
        activeVector: storeState.activeVector,
        activeTier: storeState.activeTier,
        tensionLevel: storeState.tensionLevel,
        currentPhase: storeState.currentPhase,
      });

      const frame: RatifiedEngineFrame = {
        engine_thoughts: 'Hostile force expands pressure against drainage sluices.',
        narrative_blocks: [
          {
            type: 'prose',
            content: 'Dark liquid surges up the drainage grates, rising six inches across the lower tier.',
          },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 35,
        },
        topologyDelta: { isExpansion: false },
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      };

      const turnReceipt: TurnReceipt = {
        turnNumber: 1,
        nodeBefore: 'NODE_ENTRY',
        requestedTarget: null,
        accepted: true,
        reason: 'NO_MOVEMENT_REQUESTED',
        nodeAfter: 'NODE_ENTRY',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 35,
        preSnapshot,
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Surge pressure through lower sluices',
        formattedText: 'Dark liquid surges up the drainage grates, rising six inches across the lower tier.',
        preSnapshot,
        frame,
        turnReceipt,
      };

      useAppStore.getState().commitTurnResult(payload);

      const nextState = useAppStore.getState();
      expect(nextState.turnCount).toBe(1);
      expect(nextState.currentNodeId).toBe('NODE_ENTRY');
      expect(nextState.tensionLevel).toBe(35);
      expect(nextState.history[1].turnReceipt?.preSnapshot).toEqual(preSnapshot);
      expect(nextState.participationContext?.mode).toBe('antagonist');
      expect(nextState.participationContext?.seat?.name).toBe('The Stygian Tide');
    });

    it('executes a committed turn lifecycle in director mode while maintaining topology and snapshot authority', () => {
      const session = initiateAdLibSession(
        {
          participationMode: 'director',
          placeSeed: 'Abandoned Radio Observatory',
          goal: 'Orchestrate paranoia crescendo',
          directorFocus: 'Sensory dissonance',
        },
        'session-lifecycle-director-01'
      );

      const storeState = useAppStore.getState();
      expect(storeState.turnCount).toBe(0);
      expect(storeState.participationContext?.mode).toBe('director');
      expect(storeState.participationContext?.seat?.kind).toBe('director');

      const preSnapshot = captureRuntimeSnapshot({
        sessionId: storeState.sessionId,
        blueprintId: session.blueprint.id,
        turnCount: storeState.turnCount,
        currentNodeId: storeState.currentNodeId,
        activeVector: storeState.activeVector,
        activeTier: storeState.activeTier,
        tensionLevel: storeState.tensionLevel,
        currentPhase: storeState.currentPhase,
      });

      const frame: RatifiedEngineFrame = {
        engine_thoughts: 'Director cues ambient discordance. Acoustic hum deepens.',
        narrative_blocks: [
          {
            type: 'prose',
            content: 'The low-frequency hum from the dish motors shifts into a minor chord.',
          },
        ],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 25,
        },
        topologyDelta: { isExpansion: false },
        validation: { accepted: true, rejected_fields: [], repair_notes: [] },
      };

      const turnReceipt: TurnReceipt = {
        turnNumber: 1,
        nodeBefore: 'NODE_ENTRY',
        requestedTarget: null,
        accepted: true,
        reason: 'NO_MOVEMENT_REQUESTED',
        nodeAfter: 'NODE_ENTRY',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 25,
        preSnapshot,
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Focus framing on the harmonic discordance of the antenna dish',
        formattedText: 'The low-frequency hum from the dish motors shifts into a minor chord.',
        preSnapshot,
        frame,
        turnReceipt,
      };

      useAppStore.getState().commitTurnResult(payload);

      const nextState = useAppStore.getState();
      expect(nextState.turnCount).toBe(1);
      expect(nextState.currentNodeId).toBe('NODE_ENTRY');
      expect(nextState.tensionLevel).toBe(25);
      expect(nextState.history[1].turnReceipt?.preSnapshot).toEqual(preSnapshot);
      expect(nextState.participationContext?.mode).toBe('director');
      expect(nextState.participationContext?.seat?.kind).toBe('director');
    });
  });
});

