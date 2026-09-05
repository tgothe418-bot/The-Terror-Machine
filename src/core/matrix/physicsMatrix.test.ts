import { describe, it, expect } from 'vitest';
import {
  calculatePhysicsState,
  classifyScenarioParadigm,
  ScenarioPhysicsContext,
} from './physicsMatrix';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { Blueprint } from '../../types';

describe('Scenario-Governed Physics (Packet 09)', () => {
  const groundedBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_grounded_submarine',
    title: 'The Steel Tomb',
    setting: {
      location: 'Decommissioned Submarine K-429',
      atmosphere: 'Freezing, damp, smelling of diesel and rust',
      timePeriod: '1978',
    },
    environmentalRules: [
      'Hull pressure increases with depth',
      'Battery power is finite and drains on heavy equipment usage',
      'No supernatural occurrences; all threats are strictly physical/environmental',
    ],
    cast: [
      {
        id: 'char_engineer',
        name: 'Chief Petrov',
        role: 'Engineer',
        description: 'Veteran naval engineer.',
        personality: 'Methodical, exhausted',
        goals: 'Keep auxiliary pumps running',
        traits: ['Practical'],
        isEntity: false,
      },
    ],
  });

  const supernaturalBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_haunted_asylum',
    title: 'Ward of Shadows',
    setting: {
      location: 'Blackwood Sanatorium',
      atmosphere: 'Sulfuric cold and peeling wallpaper',
      timePeriod: '1920',
    },
    environmentalRules: [
      'The Apparition can manipulate metal latches and cause localized temperature drops',
    ],
    cast: [
      {
        id: 'char_patient',
        name: 'Arthur Pendelton',
        role: 'Patient',
        description: 'Mortal inmate.',
        personality: 'Terrified',
        goals: 'Escape the ward',
        traits: ['Observant'],
        isEntity: false,
      },
      {
        id: 'char_specter',
        name: 'The Weeping Matron',
        role: 'Entity',
        description: 'A spectral presence bound to the third floor.',
        personality: 'Vengeful',
        goals: 'Trap intruders',
        traits: ['Spectral', 'Vengeful'],
        isEntity: true,
      },
    ],
  });

  const uncertaintyBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_paranoia_cabin',
    title: 'Static in the Pines',
    setting: {
      location: 'Remote Fire Lookout',
      atmosphere: 'Dense blizzard, howling wind, flickering fluorescent lights',
      timePeriod: '1995',
    },
    depictionContract: {
      dramaticRegister: 'Psychological thriller with creeping dread',
      directness: 'Sensory and grounded',
      aftermath: 'Lingering paranoia',
      ambiguityHandling: 'Deliberate ambiguity: whether sounds outside are human, natural, or hallucinations is never confirmed',
      specialBoundaries: '',
    },
    ambiguities: [
      {
        id: 'amb_scratches',
        category: 'Provenance',
        question: 'What made the scratches on the floorboards?',
        resolutionMode: 'CONTEXTUAL_DISCRETION',
        guidance: 'Never definitively declare whether they were made by claws or boots',
      },
    ],
    cast: [
      {
        id: 'char_lookout',
        name: 'Miller',
        role: 'Ranger',
        description: 'Solo fire lookout.',
        personality: 'Sleep-deprived',
        goals: 'Survive the blizzard',
        traits: ['Hyper-vigilant'],
        isEntity: false,
      },
    ],
  });

  describe('1. Grounded Human Horror — No Universal Supernatural Grants', () => {
    it('classifies grounded human horror scenario as GROUNDED', () => {
      const paradigm = classifyScenarioParadigm({ blueprint: groundedBlueprint });
      expect(paradigm).toBe('GROUNDED');
    });

    it('at low tension (0..33), strictly enforces consensus physics without supernatural overrides', () => {
      const state = calculatePhysicsState(10, 1.0, { blueprint: groundedBlueprint });
      expect(state.paradigm).toBe('GROUNDED');
      expect(state.realityState).toBe('STABLE');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: GROUNDED (STABLE)');
      expect(state.generativeDirective).toContain('Strictly enforce consensus physical laws');
      expect(state.generativeDirective).not.toContain('non-Euclidean');
      expect(state.generativeDirective).not.toContain('impossible entities');
      expect(state.generativeDirective).not.toContain('fluid');
    });

    it('at moderate tension (34..66), increases urgency without granting supernatural physics', () => {
      const state = calculatePhysicsState(50, 0.8, { blueprint: groundedBlueprint });
      expect(state.paradigm).toBe('GROUNDED');
      expect(state.realityState).toBe('DEGRADING');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: GROUNDED (ESCALATING PRESSURE)');
      expect(state.generativeDirective).toContain('NEVER grants supernatural powers, impossible entities, or non-Euclidean geometry');
    });

    it('at peak tension (67..100), intensifies mortal danger and panic, explicitly forbidding physics overrides', () => {
      // Diagnostic failure reproduction: Tension 80 or 100 previously yielded ONTOLOGICAL_SHEAR with commands to warp geometry!
      const state = calculatePhysicsState(100, 0.5, { blueprint: groundedBlueprint });
      expect(state.paradigm).toBe('GROUNDED');
      expect(state.realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: GROUNDED (ACUTE PRESSURE)');
      expect(state.generativeDirective).toContain('Do NOT bypass normal physics, warp spatial geometry, or spawn impossible entities');
      expect(state.generativeDirective).toContain('All outcomes must remain physically grounded within the scenario\'s mortal reality');
      expect(state.generativeDirective).not.toContain('Gravity, time, and spatial geometry are fluid');
    });

    it('at shattered coherence (0.0), maintains grounded mortal reality without non-Euclidean warping', () => {
      const state = calculatePhysicsState(20, 0.0, { blueprint: groundedBlueprint });
      expect(state.paradigm).toBe('GROUNDED');
      expect(state.realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(state.generativeDirective).toContain('Do NOT bypass normal physics, warp spatial geometry, or spawn impossible entities');
    });
  });

  describe('2. Scoped Supernatural Horror — Scoped Manifestations vs Unauthored Anomalies', () => {
    it('classifies scenario with entity in cast as SUPERNATURAL_SCOPED', () => {
      const paradigm = classifyScenarioParadigm({ blueprint: supernaturalBlueprint });
      expect(paradigm).toBe('SUPERNATURAL_SCOPED');
    });

    it('at low tension, restricts supernatural anomalies to explicitly authored scope', () => {
      const state = calculatePhysicsState(15, 1.0, { blueprint: supernaturalBlueprint });
      expect(state.paradigm).toBe('SUPERNATURAL_SCOPED');
      expect(state.realityState).toBe('STABLE');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (CONTROLLED)');
      expect(state.generativeDirective).toContain('Supernatural anomalies occur ONLY within their explicitly authored scope');
      expect(state.generativeDirective).toContain('Consensus physics and spatial continuity apply everywhere else');
      expect(state.generativeDirective).toContain('Do not invent arbitrary or unauthored supernatural phenomena');
    });

    it('at acute tension (85), intensifies authored manifestation without granting arbitrary unauthored omnipotence', () => {
      const state = calculatePhysicsState(85, 0.2, { blueprint: supernaturalBlueprint });
      expect(state.paradigm).toBe('SUPERNATURAL_SCOPED');
      expect(state.realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (ACUTE MANIFESTATION)');
      expect(state.generativeDirective).toContain('Authored supernatural forces operate at peak intensity');
      expect(state.generativeDirective).toContain('Do not grant universal omnipotence, unauthored spatial rewrites, or impossible powers');
      expect(state.generativeDirective).toContain('Pressure intensifies stakes within authored limits; it does not grant permission for every arbitrary anomaly');
    });

    it('classifies antagonist with supernatural authority contract as SUPERNATURAL_SCOPED', () => {
      const antagContext: ScenarioPhysicsContext = {
        blueprint: groundedBlueprint,
        participationContext: {
          mode: 'antagonist',
          initialGoal: 'Consume the crew',
          boundedFacts: [],
          seat: {
            kind: 'force',
            name: 'The Living Reactor',
            description: 'A paranormal radioactive consciousness',
          },
          authorityContract: {
            authority: 'Can manipulate electromagnetic radiation and emit supernatural visions through radio equipment',
            limits: 'Cannot physically warp the titanium hull or alter external ocean depth',
          },
        },
      };

      const paradigm = classifyScenarioParadigm(antagContext);
      expect(paradigm).toBe('SUPERNATURAL_SCOPED');
    });

    it('classifies antagonist without supernatural authority as GROUNDED', () => {
      const mortalAntagContext: ScenarioPhysicsContext = {
        blueprint: groundedBlueprint,
        participationContext: {
          mode: 'antagonist',
          initialGoal: 'Disable life support',
          boundedFacts: [],
          seat: {
            kind: 'character',
            name: 'Mutinous Officer',
            description: 'Mortal saboteur',
          },
          authorityContract: {
            authority: 'Can cut wire junctions and barricade doors',
            limits: 'Standard mortal physical strength and perception',
          },
        },
      };

      const paradigm = classifyScenarioParadigm(mortalAntagContext);
      expect(paradigm).toBe('GROUNDED');
    });
  });

  describe('3. Deliberate Uncertainty — Distinguishing Perception from Physical Proof', () => {
    it('classifies scenario with depiction ambiguity handling and ambiguities as DELIBERATE_UNCERTAINTY', () => {
      const paradigm = classifyScenarioParadigm({ blueprint: uncertaintyBlueprint });
      expect(paradigm).toBe('DELIBERATE_UNCERTAINTY');
    });

    it('at low tension, preserves subtle ambiguous boundaries between perception and reality', () => {
      const state = calculatePhysicsState(10, 1.0, { blueprint: uncertaintyBlueprint });
      expect(state.paradigm).toBe('DELIBERATE_UNCERTAINTY');
      expect(state.realityState).toBe('STABLE');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (SUBTLE)');
      expect(state.generativeDirective).toContain('narration must preserve deliberate ambiguity between subjective perception and external reality');
      expect(state.generativeDirective).toContain('Do not confirm supernatural occurrences as objective canonical facts');
    });

    it('at acute tension, peak paranoia does not turn subjective impressions into canonical physical changes', () => {
      const state = calculatePhysicsState(90, 0.4, { blueprint: uncertaintyBlueprint });
      expect(state.paradigm).toBe('DELIBERATE_UNCERTAINTY');
      expect(state.realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(state.generativeDirective).toContain('SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (ACUTE PARANOIA)');
      expect(state.generativeDirective).toContain('Distinguish vivid perception from physical reality');
      expect(state.generativeDirective).toContain('neither extreme pressure nor vivid sensory impressions should resolve authored ambiguity into impossible physical mutations');
      expect(state.generativeDirective).toContain('Authoritative physical reality remains grounded while subjective experience fractures');
    });
  });

  describe('4. Calibrated Tension & Coherence Value Domains', () => {
    it('maps tension ranges accurately across 0..100 scale', () => {
      // 0..33 -> STABLE (with coherence 1.0)
      expect(calculatePhysicsState(0, 1.0).realityState).toBe('STABLE');
      expect(calculatePhysicsState(33, 1.0).realityState).toBe('STABLE');

      // 34..66 -> DEGRADING
      expect(calculatePhysicsState(34, 1.0).realityState).toBe('DEGRADING');
      expect(calculatePhysicsState(50, 1.0).realityState).toBe('DEGRADING');
      expect(calculatePhysicsState(66, 1.0).realityState).toBe('DEGRADING');

      // 67..100 -> ONTOLOGICAL_SHEAR
      expect(calculatePhysicsState(67, 1.0).realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(calculatePhysicsState(80, 1.0).realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(calculatePhysicsState(100, 1.0).realityState).toBe('ONTOLOGICAL_SHEAR');
    });

    it('maps coherence ranges accurately across 0.0..1.0 scale', () => {
      // > 0.70 -> STABLE (with tension 0)
      expect(calculatePhysicsState(0, 1.0).realityState).toBe('STABLE');
      expect(calculatePhysicsState(0, 0.75).realityState).toBe('STABLE');

      // 0.31..0.70 -> DEGRADING
      expect(calculatePhysicsState(0, 0.70).realityState).toBe('DEGRADING');
      expect(calculatePhysicsState(0, 0.50).realityState).toBe('DEGRADING');
      expect(calculatePhysicsState(0, 0.31).realityState).toBe('DEGRADING');

      // <= 0.30 -> ONTOLOGICAL_SHEAR
      expect(calculatePhysicsState(0, 0.30).realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(calculatePhysicsState(0, 0.15).realityState).toBe('ONTOLOGICAL_SHEAR');
      expect(calculatePhysicsState(0, 0.0).realityState).toBe('ONTOLOGICAL_SHEAR');
    });

    it('clamps negative or out-of-bounds inputs safely', () => {
      const stateNeg = calculatePhysicsState(-10, -0.5);
      expect(stateNeg.realityState).toBe('ONTOLOGICAL_SHEAR'); // Clamped to coherence 0.0

      const stateOverflow = calculatePhysicsState(250, 1.5);
      expect(stateOverflow.realityState).toBe('ONTOLOGICAL_SHEAR'); // Clamped to tension 100
    });
  });
});
