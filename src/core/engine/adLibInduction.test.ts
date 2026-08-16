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
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Phase 3A: Ad Lib Induction & Participation Context', () => {
  beforeEach(() => {
    useEngineStore.getState().clearBlueprint();
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
        ability: 'Flamethrower proficiency',
        limitation: 'Exhaustion',
      };

      const compiled = compileAdLibInduction(input);

      expect(compiled.blueprint.cast).toHaveLength(1);
      expect(compiled.blueprint.cast[0].name).toBe('Lt. Ripley');
      expect(compiled.blueprint.cast[0].role).toBe('protagonist');
      expect(compiled.blueprint.userCharacterId).toBe('char-protagonist');

      expect(compiled.participationContext.mode).toBe('protagonist');
      expect(compiled.participationContext.seat?.name).toBe('Lt. Ripley');
      expect(compiled.participationContext.seat?.kind).toBe('protagonist');
      expect(compiled.participationContext.initialGoal).toBe('Power on the primary comms dish');
      expect(compiled.participationContext.boundedFacts).toContain('Location: Derelict Station Alpha');
      expect(compiled.participationContext.boundedFacts).toContain('Aptitude: Flamethrower proficiency');

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
      expect(compiled.blueprint.userCharacterId).toBeUndefined();

      expect(compiled.participationContext.mode).toBe('antagonist');
      expect(compiled.participationContext.seat?.kind).toBe('force');
      expect(compiled.participationContext.seat?.name).toBe('The Stygian Tide');
      expect(compiled.blueprint.environmentalRules.some((r) => r.includes('The Stygian Tide'))).toBe(true);
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
      expect(compiled.blueprint.userCharacterId).toBeUndefined();
      expect(compiled.participationContext.mode).toBe('director');
      expect(compiled.participationContext.seat?.kind).toBe('director');
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

  describe('buildEngineTurnContext with participation context', () => {
    it('attaches participationContext to the generated turn context', () => {
      const input: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Derelict Station Alpha',
        goal: 'Power on the primary comms dish',
        participantName: 'Lt. Ripley',
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
      expect(turnContext.participationContext?.seat?.name).toBe('Lt. Ripley');
      expect(turnContext.topology.currentNodeId).toBe('NODE_ENTRY');
    });
  });
});
