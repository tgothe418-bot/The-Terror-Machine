import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  compileAdLibInduction,
  initiateAdLibSession,
  initiateCompiledAdLibSession,
} from '../../lib/adLibCompiler';
import {
  AdLibInductionSchema,
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
  MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
} from '../../types/adLib';
import {
  RatifiedEngineFrame,
  TurnFailureReceipt,
  ParticipationContext,
  normalizeParticipationContext,
  RuntimeStateSnapshot,
} from '../../types';
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { CommittedTurnPayload, FailedTurnPayload } from './events';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Phase 3B: Antagonist Authority Contracts & Victim Framing', () => {
  beforeEach(() => {
    useEngineStore.getState().clearBlueprint();
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();
  });

  describe('Zod Schema Validation for Authority & Victim Contracts', () => {
    it('accepts a valid Antagonist-character induction with Authority, Limits, and an individual Victim', () => {
      const payload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Sector',
        goal: 'Stalk and isolate the perimeter security officer',
        unsettlingDetail: 'Rattling hydraulic valves in the dark',
        oppositionSeat: {
          kind: 'character',
          name: 'The Cybernetic Warden',
          description: 'A cybernetically augmented containment sentinel.',
          goal: 'Execute lethal containment protocols.',
        },
        authorityContract: {
          authority: 'Direct physical pursuit, thermal sensor tracking, pneumatic door overrides, and local sensory disruption.',
          limits: 'Cannot manifest outside physical line of movement; susceptible to high-voltage discharge barriers; cannot alter electrical grid logic.',
        },
        victimField: {
          kind: 'individual',
          name: 'Officer Marcus Cole',
          description: 'A night-patrol security officer attempting to reach the communications array.',
          goal: 'Activate the emergency distress frequency.',
          knownFact: 'Suffers from damaged hearing in his left ear from a previous conduit rupture.',
        },
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('antagonist');
      if (parsed.participationMode === 'antagonist') {
        expect(parsed.oppositionSeat.kind).toBe('character');
        expect(parsed.authorityContract.authority).toContain('thermal sensor tracking');
        expect(parsed.victimField.kind).toBe('individual');
        if (parsed.victimField.kind === 'individual') {
          expect(parsed.victimField.name).toBe('Officer Marcus Cole');
          expect(parsed.victimField.goal).toBe('Activate the emergency distress frequency.');
        }
      }
    });

    it('accepts a valid Antagonist-force induction with a collective Victim group and no invented named cast', () => {
      const payload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Derelict Atmospheric Siphon',
        goal: 'Collapse structural bulkheads and isolate the maintenance cohort',
        unsettlingDetail: 'Metallic shrieking and localized barometric drops along the ductwork',
        oppositionSeat: {
          kind: 'force',
          name: 'The Abyssal Pressure Anomaly',
          description: 'An unseen sentience manifesting as deep-ocean hydraulic pressure and structural resonance.',
          goal: 'Crush exterior bulkhead seals and force the crew into flooded sub-sectors.',
        },
        authorityContract: {
          authority: 'Distributed barometric manipulation, structural crushing along external bulkheads, acoustic metal resonance, and rapid water vapor condensation.',
          limits: 'Cannot breach hermetic quartz bulkheads without mechanical failure; cannot manifest dry heat or electrical sparks; bound to continuous air volume.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Sub-Level 4 Maintenance Shift',
          description: 'Three isolated engineers attempting manual hydraulic lockdown.',
          members: [],
        },
      };

      const parsed = AdLibInductionSchema.parse(payload);
      expect(parsed.participationMode).toBe('antagonist');
      if (parsed.participationMode === 'antagonist') {
        expect(parsed.oppositionSeat.kind).toBe('force');
        expect(parsed.victimField.kind).toBe('group');
        if (parsed.victimField.kind === 'group') {
          expect(parsed.victimField.collectiveDesignation).toBe('Sub-Level 4 Maintenance Shift');
          expect(parsed.victimField.members).toHaveLength(0);
        }
      }
    });

    it('accepts a valid group induction with optional named members (up to 8)', () => {
      const payload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Cryogenic Vault Beta',
        goal: 'Drain thermal reserves',
        oppositionSeat: {
          kind: 'force',
          name: 'Thermal Decay Field',
          description: 'An entropic anomaly absorbing heat.',
          goal: 'Induce hypothermic stasis failure.',
        },
        authorityContract: {
          authority: 'Rapid temperature drops, frost crystallization, thermal sensor blindness.',
          limits: 'Cannot extinguish active chemical plasma torches.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Cryo-Engineering Research Team',
          description: 'Researchers trapped in the cryogenic corridor.',
          members: [
            {
              id: 'v1',
              name: 'Dr. Aaron Ramos',
              description: 'Lead Cryobiologist.',
              goal: 'Secure stasis pod telemetry.',
              knownFact: 'Has emergency stimpack in coat pocket.',
            },
            {
              id: 'v2',
              name: 'Technician Clara Osei',
              description: 'Coolant line technician.',
              goal: 'Close the primary nitrogen release valve.',
              knownFact: 'Frostbite on right fingers.',
            },
          ],
        },
      };

      const parsed = AdLibInductionSchema.parse(payload);
      if (parsed.participationMode === 'antagonist' && parsed.victimField.kind === 'group') {
        expect(parsed.victimField.members).toHaveLength(2);
        expect(parsed.victimField.members[0].name).toBe('Dr. Aaron Ramos');
        expect(parsed.victimField.members[1].name).toBe('Technician Clara Osei');
      }
    });

    it('rejects missing or empty Authority', () => {
      const invalid = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate the perimeter',
        oppositionSeat: {
          kind: 'character',
          name: 'Infiltrator',
          description: 'An entity.',
          goal: 'Hunt.',
        },
        authorityContract: {
          authority: '   ',
          limits: 'Valid limits.',
        },
        victimField: {
          kind: 'individual',
          name: 'Subject One',
        },
      };

      expect(() => AdLibInductionSchema.parse(invalid)).toThrow();
    });

    it('rejects missing or empty Limits', () => {
      const invalid = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate the perimeter',
        oppositionSeat: {
          kind: 'character',
          name: 'Infiltrator',
          description: 'An entity.',
          goal: 'Hunt.',
        },
        authorityContract: {
          authority: 'Valid authority.',
          limits: '',
        },
        victimField: {
          kind: 'individual',
          name: 'Subject One',
        },
      };

      expect(() => AdLibInductionSchema.parse(invalid)).toThrow();
    });

    it('rejects missing Victim designation for individual and group targets', () => {
      const invalidIndividual = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate',
        oppositionSeat: {
          kind: 'character',
          name: 'Infiltrator',
          description: 'Entity',
          goal: 'Hunt',
        },
        authorityContract: {
          authority: 'Authority scope',
          limits: 'Limits boundary',
        },
        victimField: {
          kind: 'individual',
          name: '   ',
        },
      };
      expect(() => AdLibInductionSchema.parse(invalidIndividual)).toThrow();

      const invalidGroup = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate',
        oppositionSeat: {
          kind: 'character',
          name: 'Infiltrator',
          description: 'Entity',
          goal: 'Hunt',
        },
        authorityContract: {
          authority: 'Authority scope',
          limits: 'Limits boundary',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: '',
        },
      };
      expect(() => AdLibInductionSchema.parse(invalidGroup)).toThrow();
    });

    it('rejects member-count violations (> 8 members in group)', () => {
      const invalidMembers = Array.from({ length: 9 }, (_, i) => ({
        name: `Victim Member ${i + 1}`,
      }));

      const invalid = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate',
        oppositionSeat: {
          kind: 'force',
          name: 'Anomaly',
          description: 'Force',
          goal: 'Hunt',
        },
        authorityContract: {
          authority: 'Authority scope',
          limits: 'Limits boundary',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Large Research Cohort',
          members: invalidMembers,
        },
      };

      expect(() => AdLibInductionSchema.parse(invalid)).toThrow();
    });

    it('rejects string-bound violations (> 500 characters for authority or limits)', () => {
      const longAuthority = 'A'.repeat(501);
      const invalid = {
        participationMode: 'antagonist',
        placeSeed: 'Research Outpost',
        goal: 'Infiltrate',
        oppositionSeat: {
          kind: 'character',
          name: 'Entity',
          description: 'Desc',
          goal: 'Goal',
        },
        authorityContract: {
          authority: longAuthority,
          limits: 'Normal limits',
        },
        victimField: {
          kind: 'individual',
          name: 'Subject',
        },
      };

      expect(() => AdLibInductionSchema.parse(invalid)).toThrow();
    });

    it('accepts the exact 207-character reproduction scenario premise across all induction modes', () => {
      const reproPremise =
        'Mary and Joseph are in a manger behind a sold-out hotel in Bethlehem. Mary is heavy with Child, and about to give birth. Lucifer appears in the dark of night outside of their manger with a knock at the door.';
      expect(reproPremise.length).toBe(207);

      // Protagonist mode with reproduction premise
      const protagonistPayload: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Bethlehem Manger',
        goal: reproPremise,
        participantName: 'Joseph of Nazareth',
        identity: 'Protector and Carpenter',
        ability: 'Resolute faith and physical vigilance',
        limitation: 'Unarmed and weary from travel',
      };
      const parsedProtagonist = AdLibInductionSchema.parse(protagonistPayload);
      expect(parsedProtagonist.goal).toBe(reproPremise);

      // Antagonist mode with reproduction premise
      const antagonistPayload: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Bethlehem Manger Outer Perimeter',
        goal: reproPremise,
        oppositionSeat: {
          kind: 'character',
          name: 'Lucifer',
          description: 'A shadowy wanderer cloaked in winter stillness.',
          goal: 'Beguile the travelers and claim the unborn Child before daybreak.',
        },
        authorityContract: {
          authority: 'Supernatural illusion, auditory mimicry, shadows, chilling draft manifestation.',
          limits: 'Cannot cross consecrated thresholds without invitation; repelled by earnest prayer.',
        },
        victimField: {
          kind: 'individual',
          name: 'Mary and Joseph',
          goal: 'Protect the Child until morning light.',
        },
      };
      const parsedAntagonist = AdLibInductionSchema.parse(antagonistPayload);
      expect(parsedAntagonist.goal).toBe(reproPremise);

      // Director mode with reproduction premise
      const directorPayload: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Bethlehem Manger',
        goal: reproPremise,
        directorFocus: 'Atmospheric dread, historical isolation, and impending spiritual crisis',
      };
      const parsedDirector = AdLibInductionSchema.parse(directorPayload);
      expect(parsedDirector.goal).toBe(reproPremise);
    });

    it('accepts shared premise up to MAX_HAUNTED_HOUSE_PREMISE_LENGTH (1,000 chars) and rejects 1,001 chars with clear message', () => {
      const maxPremise = 'A'.repeat(MAX_HAUNTED_HOUSE_PREMISE_LENGTH);
      const overMaxPremise = 'A'.repeat(MAX_HAUNTED_HOUSE_PREMISE_LENGTH + 1);

      const validProtagonist: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Derelict Station',
        goal: maxPremise,
        participantName: 'Survivor',
      };
      expect(() => AdLibInductionSchema.parse(validProtagonist)).not.toThrow();

      const invalidProtagonist = {
        ...validProtagonist,
        goal: overMaxPremise,
      };
      expect(() => AdLibInductionSchema.parse(invalidProtagonist)).toThrow(
        /Scenario premise must be 1,000 characters or fewer/
      );
    });

    it('enforces that role-specific goal bounds remain at 200 characters', () => {
      const longRoleGoal = 'G'.repeat(201);

      // Opposition threat goal bound (max 200)
      const invalidOppositionGoal: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Vault',
        goal: 'Valid shared premise within 1,000 characters.',
        oppositionSeat: {
          kind: 'character',
          name: 'Entity',
          description: 'Desc',
          goal: longRoleGoal,
        },
        authorityContract: {
          authority: 'Valid authority',
          limits: 'Valid limits',
        },
        victimField: {
          kind: 'individual',
          name: 'Victim',
        },
      };
      expect(() => AdLibInductionSchema.parse(invalidOppositionGoal)).toThrow();

      // Individual victim goal bound (max 200)
      const invalidVictimGoal: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Vault',
        goal: 'Valid shared premise.',
        oppositionSeat: {
          kind: 'character',
          name: 'Entity',
          description: 'Desc',
          goal: 'Valid threat goal under 200 chars.',
        },
        authorityContract: {
          authority: 'Valid authority',
          limits: 'Valid limits',
        },
        victimField: {
          kind: 'individual',
          name: 'Victim',
          goal: longRoleGoal,
        },
      };
      expect(() => AdLibInductionSchema.parse(invalidVictimGoal)).toThrow();
    });

    it('rejects an empty oppositionSeat.goal and does not inherit the long shared premise', () => {
      const invalidPayload = {
        participationMode: 'antagonist',
        placeSeed: 'Bethlehem Manger',
        goal: 'Mary and Joseph are in a manger behind a sold-out hotel in Bethlehem.',
        oppositionSeat: {
          kind: 'character',
          name: 'Lucifer',
          description: 'A shadowy wanderer.',
          goal: '', // empty role goal
        },
        authorityContract: {
          authority: 'Supernatural illusions.',
          limits: 'Cannot cross thresholds.',
        },
        victimField: {
          kind: 'individual',
          name: 'Mary and Joseph',
        },
      };

      const result = AdLibInductionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
      if (!result.success) {
        const goalIssue = result.error.issues.find(
          (issue) => issue.path[0] === 'oppositionSeat' && issue.path[1] === 'goal'
        );
        expect(goalIssue).toBeDefined();
      }
    });

    it('compiles and initiates a session with a 207-character premise preserving ParticipationContext', () => {
      const reproPremise =
        'Mary and Joseph are in a manger behind a sold-out hotel in Bethlehem. Mary is heavy with Child, and about to give birth. Lucifer appears in the dark of night outside of their manger with a knock at the door.';

      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Bethlehem Manger',
        goal: reproPremise,
        oppositionSeat: {
          kind: 'character',
          name: 'Lucifer',
          description: 'A shadowy wanderer cloaked in winter stillness.',
          goal: 'Beguile the travelers and claim the unborn Child before daybreak.',
        },
        authorityContract: {
          authority: 'Supernatural illusions, shadow manipulation, auditory mimicry.',
          limits: 'Cannot cross consecrated thresholds without invitation.',
        },
        victimField: {
          kind: 'individual',
          name: 'Mary and Joseph',
          goal: 'Protect the Child until morning light.',
        },
      };

      const compiled = initiateAdLibSession(induction);
      expect(compiled.blueprint.title).toBe('Bethlehem Manger (Haunted House Antagonist)');
      expect(compiled.blueprint.contentLevelDescription).toBe('ANTAGONIST HAUNTED HOUSE INDUCTION');
      expect(compiled.blueprint.globalPremise).toContain(induction.oppositionSeat.goal);
      expect(compiled.participationContext.mode).toBe('antagonist');
      expect(compiled.participationContext.authorityContract?.authority).toContain(
        'Supernatural illusions'
      );
      expect(useEngineStore.getState().activeBlueprint).toBeDefined();
      expect(useEngineStore.getState().gameState?.player_role).toBe('antagonist');

      // Also verify Protagonist compilation preserves the full 207-character premise in globalPremise
      const protagonistInduction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Bethlehem Manger',
        goal: reproPremise,
        participantName: 'Joseph',
      };
      const compiledProtagonist = initiateAdLibSession(protagonistInduction);
      expect(compiledProtagonist.blueprint.globalPremise).toContain(reproPremise);
    });
  });

  describe('Ad Lib Compiler Compilation Logic', () => {
    it('compiles an Antagonist-character induction into a ScenarioBlueprint with cast and ParticipationContext', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Derelict Hydroponics Dome',
        goal: 'Sever the life-support root system',
        unsettlingDetail: 'Chlorophyll veins pulsating in the dark',
        oppositionSeat: {
          kind: 'character',
          name: 'The Bio-Mechanical Stalker',
          description: 'A cybernetic apex predator prowling the canopy.',
          goal: 'Eliminate the biology team.',
        },
        authorityContract: {
          authority: 'Arboreal climbing, thermal cloak projection, pheromone mimicry.',
          limits: 'Vulnerable to concentrated ultraviolet flare exposure.',
        },
        victimField: {
          kind: 'individual',
          name: 'Botanist Elena Rostova',
          description: 'Senior botanist defending the gene-bank.',
          goal: 'Retrieve the cryogenic seed samples.',
          knownFact: 'Carries an industrial UV arc-welder.',
        },
      };

      const { blueprint, participationContext } = compileAdLibInduction(induction);

      expect(blueprint.title).toBe('Derelict Hydroponics Dome (Haunted House Antagonist)');
      expect(blueprint.contentLevelDescription).toBe('ANTAGONIST HAUNTED HOUSE INDUCTION');
      expect(blueprint.cast).toHaveLength(2);

      // Controlled Antagonist cast entry
      const antagCast = blueprint.cast.find((c) => c.role === 'antagonist');
      expect(antagCast).toBeDefined();
      expect(antagCast?.name).toBe('The Bio-Mechanical Stalker');
      expect(antagCast?.isUserCharacter).toBe(true);
      expect(antagCast?.isEntity).toBe(true);

      // Non-user Victim cast entry
      const victimCast = blueprint.cast.find((c) => c.role === 'victim');
      expect(victimCast).toBeDefined();
      expect(victimCast?.name).toBe('Botanist Elena Rostova');
      expect(victimCast?.isUserCharacter).toBe(false);
      expect(victimCast?.isEntity).toBe(false);
      expect(victimCast?.goals).toBe('Retrieve the cryogenic seed samples.');

      // Bounded facts in participation context
      expect(participationContext.mode).toBe('antagonist');
      expect(participationContext.authorityContract?.authority).toContain('Arboreal climbing');
      expect(participationContext.authorityContract?.limits).toContain('ultraviolet flare');
      expect(participationContext.victimField?.kind).toBe('individual');
      expect(participationContext.boundedFacts.some((f) => f.includes('Authority Scope'))).toBe(true);
      expect(participationContext.boundedFacts.some((f) => f.includes('Authority Limit'))).toBe(true);
      expect(participationContext.boundedFacts.some((f) => f.includes('Target Victim: Botanist Elena Rostova'))).toBe(true);
    });

    it('compiles an Antagonist-force induction without inventing a controlled NPC, and compiles named group victims into non-user cast', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Zero Geothermal Facility',
        goal: 'Extinguish the geothermal core',
        oppositionSeat: {
          kind: 'force',
          name: 'The Cryo-Entropy Front',
          description: 'A creeping wave of absolute zero flash-freezing metal and flesh.',
          goal: 'Shatter the heating conduits.',
        },
        authorityContract: {
          authority: 'Ambient thermal draining, frost fracturing of structural alloy, acoustic freezing of sound.',
          limits: 'Cannot cross active plasma conduit streams; requires continuous spatial adjacency.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Geothermal Core Engineering Shift',
          description: 'Engineers maintaining the thermal generators.',
          members: [
            {
              id: 'vic-1',
              name: 'Engineer Silas Karr',
              description: 'Lead thermal operator.',
              goal: 'Keep the plasma pumps flowing.',
              knownFact: 'Carries emergency thermal flares.',
            },
            {
              id: 'vic-2',
              name: 'Technician Maya Lind',
              description: 'Electrical tech.',
              goal: 'Bypass blown circuit relays.',
              knownFact: 'Wearing heavy thermal insulation suit.',
            },
          ],
        },
      };

      const { blueprint, participationContext } = compileAdLibInduction(induction);

      expect(blueprint.title).toBe('Sub-Zero Geothermal Facility (Haunted House Force)');
      expect(blueprint.contentLevelDescription).toBe('ANTAGONIST HAUNTED HOUSE INDUCTION');
      // Force has NO controlled antagonist cast member
      expect(blueprint.cast.some((c) => c.role === 'antagonist')).toBe(false);

      // But has 2 non-user victim cast members
      expect(blueprint.cast).toHaveLength(2);
      expect(blueprint.cast.every((c) => c.role === 'victim' && c.isUserCharacter === false)).toBe(true);
      expect(blueprint.cast[0].name).toBe('Engineer Silas Karr');
      expect(blueprint.cast[1].name).toBe('Technician Maya Lind');

      expect(participationContext.seat?.kind).toBe('force');
      expect(participationContext.authorityContract?.authority).toContain('frost fracturing');
      expect(participationContext.victimField?.kind).toBe('group');
    });

    it('compiles an Antagonist-force with an unnamed group into zero fabricated cast members', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Flooded Sub-Sector 7',
        goal: 'Drown the lower deck',
        oppositionSeat: {
          kind: 'force',
          name: 'The Rising Surge',
          description: 'Sentient seawater rising through ruptured drainage pipes.',
          goal: 'Submerge electrical junctions.',
        },
        authorityContract: {
          authority: 'Water pressure surges, electrical short-circuiting in submerged zones, acoustic cavitation.',
          limits: 'Cannot penetrate watertight hatch seals without physical rupture.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Trapped Lower-Deck Colonists',
          description: 'Unidentified survivors scrambling for the upper ladders.',
          members: [],
        },
      };

      const { blueprint, participationContext } = compileAdLibInduction(induction);

      expect(blueprint.cast).toHaveLength(0); // Zero fabricated characters
      expect(participationContext.boundedFacts.some((f) => f.includes('Target Group: Trapped Lower-Deck Colonists'))).toBe(true);
    });
  });

  describe('Store Integration & buildEngineTurnContext Propagation', () => {
    it('initiates an Ad Lib Antagonist session and preserves Authority & Victim contracts in both stores', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Decommissioned Lunar Silo',
        goal: 'Vent atmospheric pressure to vacuum',
        oppositionSeat: {
          kind: 'character',
          name: 'The Rogue Cyber-Sentry',
          description: 'A rogue security automaton patrolling the missile gantry.',
          goal: 'Depressurize the command bunker.',
        },
        authorityContract: {
          authority: 'Heavy mechanical strength, pneumatic door override, acoustic triangulation, infra-red vision.',
          limits: 'Cannot leave physical structure of the silo; vulnerable to high-intensity microwave radiation.',
        },
        victimField: {
          kind: 'individual',
          name: 'Commander Sarah Jensen',
          description: 'Bunker commander holding the manual atmospheric lock.',
          goal: 'Manually seal the blast doors.',
          knownFact: 'Suffering from low-oxygen disorientation.',
        },
      };

      const session = initiateAdLibSession(induction);

      // Verify engine store
      const engineState = useEngineStore.getState();
      expect(engineState.activeBlueprint?.id).toBe(session.blueprint.id);
      expect(engineState.gameState?.player_role).toBe('antagonist');
      expect(engineState.participationContext?.authorityContract?.authority).toContain('Heavy mechanical strength');
      expect(engineState.participationContext?.victimField?.kind).toBe('individual');

      // Verify app store
      const appState = useAppStore.getState();
      expect(appState.blueprintId).toBe(session.blueprint.id);
      expect(appState.participationContext?.authorityContract?.limits).toContain('microwave radiation');
      expect(appState.participationContext?.victimField?.kind).toBe('individual');

      // Verify buildEngineTurnContext propagation
      const turnContext = buildEngineTurnContext({
        blueprint: session.blueprint,
        selectedRole: 'antagonist',
        spatialGraph: [session.initialSpatialNode],
        participationContext: session.participationContext,
      });

      expect(turnContext.participationContext).toBeDefined();
      expect(turnContext.participationContext?.mode).toBe('antagonist');
      expect(turnContext.participationContext?.authorityContract?.authority).toContain('Heavy mechanical strength');
      expect(turnContext.participationContext?.authorityContract?.limits).toContain('microwave radiation');
      expect(turnContext.participationContext?.victimField?.kind).toBe('individual');
    });

    it('clears Authority and Victim context upon full system reset via both store reset paths', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Vault',
        goal: 'Eliminate targets',
        oppositionSeat: {
          kind: 'character',
          name: 'Apex Predator',
          description: 'Hunting unit',
          goal: 'Purge',
        },
        authorityContract: {
          authority: 'Physical speed and cloaking.',
          limits: 'Cannot enter salt-lined boundaries.',
        },
        victimField: {
          kind: 'individual',
          name: 'Survivor Tom',
        },
      };

      initiateAdLibSession(induction);

      // Verify loaded
      expect(useEngineStore.getState().participationContext).not.toBeNull();
      expect(useAppStore.getState().participationContext).not.toBeNull();

      // Reset Engine store
      useEngineStore.getState().resetEngine();
      expect(useEngineStore.getState().participationContext).toBeNull();
      expect(useEngineStore.getState().activeBlueprint).toBeNull();

      // Reset App store
      useAppStore.getState().resetSession();
      expect(useAppStore.getState().participationContext).toBeNull();
      expect(useAppStore.getState().blueprintId).toBe('');
    });
  });

  describe('Persistence across Committed Turns & Ratified Frames', () => {
    it('preserves Authority and Victim data after committing a ratified frame turn', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Derelict Atmospheric Siphon',
        goal: 'Collapse containment',
        oppositionSeat: {
          kind: 'force',
          name: 'Pressure Anomaly',
          description: 'A crushing barometric anomaly.',
          goal: 'Crush the bulkhead.',
        },
        authorityContract: {
          authority: 'Barometric surges, metal buckling, localized air compression.',
          limits: 'Cannot puncture reinforced lead plates; bound to contiguous ducts.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Maintenance Crew',
          description: 'Technicians trying to reach safety.',
          members: [
            {
              id: 'vic-1',
              name: 'Tech Jonas Reed',
              description: 'Junior technician.',
              goal: 'Find an emergency rebreather.',
            },
          ],
        },
      };

      const session = initiateAdLibSession(induction);

      // Build context and simulate turn response
      const turnContext = buildEngineTurnContext({
        blueprint: session.blueprint,
        selectedRole: 'antagonist',
        spatialGraph: [session.initialSpatialNode],
        participationContext: session.participationContext,
      });
      expect(turnContext.participationContext?.authorityContract?.authority).toContain('Barometric surges');

      const preSnapshot: RuntimeStateSnapshot = {
        version: 1,
        turnCount: 0,
        currentNodeId: session.initialSpatialNode.id,
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        phase: 'ENGINE',
        tension: 0,
        coherence: 1.0,
        decayRate: 0,
        reconciliationRevision: 0,
        activeFlags: [],
      };

      const ratifiedFrame: RatifiedEngineFrame = {
        narrative_blocks: [
          {
            type: 'prose',
            content: 'The ducts groan and buckle inward under sudden barometric load.',
          },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 20,
          terminal_flags: ['DUCTS_CRACKED'],
          player_role: 'antagonist',
        },
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: session.initialSpatialNode.id,
          requestedTarget: null,
          accepted: true,
          reason: 'Ratified frame applied successfully',
          nodeAfter: session.initialSpatialNode.id,
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 20,
          preSnapshot,
        },
      };

      const committedTurnPayload: CommittedTurnPayload = {
        commandText: 'Exert crushing atmospheric pressure along the vent shaft',
        formattedText: 'Exert crushing atmospheric pressure along the vent shaft',
        frame: ratifiedFrame,
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: session.initialSpatialNode.id,
          requestedTarget: null,
          accepted: true,
          reason: 'Ratified frame applied successfully',
          nodeAfter: session.initialSpatialNode.id,
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 20,
          preSnapshot,
        },
        preSnapshot,
      };

      // Dispatch event to app store
      useAppStore.getState().dispatch({
        type: 'TURN_COMMITTED',
        payload: committedTurnPayload,
      });

      // Confirm ParticipationContext and Authority Contract remain intact in store
      const appState = useAppStore.getState();
      expect(appState.participationContext).toBeDefined();
      expect(appState.participationContext?.authorityContract?.authority).toContain('Barometric surges');
      expect(appState.participationContext?.authorityContract?.limits).toContain('reinforced lead plates');
      expect(appState.participationContext?.victimField?.kind).toBe('group');

      // Next turn context generation still includes full contracts
      const nextTurnContext = buildEngineTurnContext({
        blueprint: session.blueprint,
        selectedRole: 'antagonist',
        spatialGraph: appState.spatialGraph,
        participationContext: appState.participationContext,
      });

      expect(nextTurnContext.participationContext?.authorityContract?.authority).toContain('Barometric surges');
      expect(nextTurnContext.participationContext?.victimField?.kind).toBe('group');
    });

    it('preserves Authority, Limits, and Victim data without state drift on a TURN_FAILED event', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Sector',
        goal: 'Stalk and isolate the perimeter security officer',
        unsettlingDetail: 'Rattling hydraulic valves in the dark',
        oppositionSeat: {
          kind: 'character',
          name: 'The Cybernetic Warden',
          description: 'A cybernetically augmented containment sentinel.',
          goal: 'Execute lethal containment protocols.',
        },
        authorityContract: {
          authority: 'Direct physical pursuit, thermal sensor tracking, pneumatic door overrides.',
          limits: 'Cannot manifest outside physical line of movement; susceptible to high-voltage discharge.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Perimeter Security Detachment',
          description: 'Two security officers separated near the bulkhead.',
          members: [
            {
              id: 'vic-01',
              name: 'Officer Marcus Cole',
              description: 'Senior security guard.',
              goal: 'Reach the emergency comms console.',
              knownFact: 'Damaged left ear.',
            },
            {
              id: 'vic-02',
              name: 'Officer Sarah Chen',
              description: 'Junior patrol guard.',
              goal: 'Seal the security blast gate.',
              knownFact: 'Carries emergency bypass keycard.',
            },
          ],
        },
      };

      const session = initiateAdLibSession(induction);
      const appStateBefore = useAppStore.getState();

      const preSnapshot: RuntimeStateSnapshot = {
        version: 1,
        turnCount: 0,
        currentNodeId: session.initialSpatialNode.id,
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        phase: 'ENGINE',
        tension: 0,
        coherence: 1.0,
        decayRate: 0,
        reconciliationRevision: 0,
        activeFlags: [],
      };

      const failureReceipt: TurnFailureReceipt = {
        code: 'API_TIMEOUT',
        status: 504,
        contentType: 'application/json',
        message: 'The simulation model timed out. Canonical state was not modified.',
      };

      const failedTurnPayload: FailedTurnPayload = {
        commandText: 'Override pneumatic security gates to trap Officer Cole',
        preSnapshot,
        failureReceipt,
        errorCategory: 'API_TIMEOUT',
        errorMessage: 'The simulation model timed out. Canonical state was not modified.',
        statusCode: 504,
        contentType: 'application/json',
        timestamp: Date.now(),
      };

      // Dispatch failed turn event
      useAppStore.getState().dispatch({
        type: 'TURN_FAILED',
        payload: failedTurnPayload,
      });

      const appStateAfter = useAppStore.getState();

      // 1. Participation context must be preserved completely
      expect(appStateAfter.participationContext).toBeDefined();
      expect(appStateAfter.participationContext?.mode).toBe('antagonist');
      expect(appStateAfter.participationContext?.authorityContract?.authority).toContain('Direct physical pursuit');
      expect(appStateAfter.participationContext?.authorityContract?.limits).toContain('high-voltage discharge');
      expect(appStateAfter.participationContext?.victimField?.kind).toBe('group');
      if (appStateAfter.participationContext?.victimField?.kind === 'group') {
        expect(appStateAfter.participationContext.victimField.collectiveDesignation).toBe('Perimeter Security Detachment');
        expect(appStateAfter.participationContext.victimField.members).toHaveLength(2);
        expect(appStateAfter.participationContext.victimField.members[0].name).toBe('Officer Marcus Cole');
        expect(appStateAfter.participationContext.victimField.members[1].name).toBe('Officer Sarah Chen');
      }

      // 2. Canonical state must not drift: turn count, location, tension, vector, tier, memory flags remain invariant
      expect(appStateAfter.turnCount).toBe(appStateBefore.turnCount);
      expect(appStateAfter.currentNodeId).toBe(appStateBefore.currentNodeId);
      expect(appStateAfter.tensionLevel).toBe(appStateBefore.tensionLevel);
      expect(appStateAfter.activeVector).toBe(appStateBefore.activeVector);
      expect(appStateAfter.activeTier).toBe(appStateBefore.activeTier);
      expect(appStateAfter.activeMemory).toEqual(appStateBefore.activeMemory);
      expect(appStateAfter.spatialGraph).toEqual(appStateBefore.spatialGraph);

      // 3. Turn failure message recorded into history with failure receipt
      expect(appStateAfter.history.length).toBe(appStateBefore.history.length + 2);
      const lastMsg = appStateAfter.history[appStateAfter.history.length - 1];
      expect(lastMsg.role).toBe('assistant');
      expect(lastMsg.failureReceipt?.code).toBe('API_TIMEOUT');
      expect(lastMsg.turnReceipt?.accepted).toBe(false);

      // 4. Next turn context generation still includes full contracts
      const nextTurnContext = buildEngineTurnContext({
        blueprint: session.blueprint,
        selectedRole: 'antagonist',
        spatialGraph: appStateAfter.spatialGraph,
        participationContext: appStateAfter.participationContext,
      });

      expect(nextTurnContext.participationContext?.authorityContract?.authority).toContain('Direct physical pursuit');
      expect(nextTurnContext.participationContext?.victimField?.kind).toBe('group');
    });
  });

  describe('Conservative Legacy Antagonist Normalization', () => {
    it('normalizes legacy antagonist character without authority contract into conservative non-fabricating contract', () => {
      const legacyContext: ParticipationContext = {
        mode: 'antagonist',
        seat: {
          kind: 'character',
          name: 'The Lurker',
          description: 'A legacy adversary from an older save.',
        },
        initialGoal: 'Infiltrate the perimeter',
        boundedFacts: ['Legacy encounter'],
      };

      const normalized = normalizeParticipationContext(legacyContext);
      expect(normalized).not.toBeNull();
      expect(normalized?.authorityContract).toBeDefined();
      expect(normalized?.authorityContract?.authority).toBe(
        'Only already authored and ratified scenario facts apply. Grants no new reach, perception, mutation, omniscience, or control until re-inducted with an explicit Authority Contract.'
      );
      expect(normalized?.authorityContract?.limits).toBe(
        'Strictly bounded to authored scenario facts and ratified state. Grants no new reach, perception, mutation, omniscience, or control without an explicit Authority Contract.'
      );
      // Ensures no fabricated mortal/physical presence strings
      expect(normalized?.authorityContract?.authority).not.toContain('Local physical presence');
      expect(normalized?.authorityContract?.limits).not.toContain('mortal counterplay');
    });

    it('normalizes legacy antagonist environmental force without imposing an embodied/mortal interpretation', () => {
      const legacyForceContext: ParticipationContext = {
        mode: 'antagonist',
        seat: {
          kind: 'force',
          name: 'Cosmic Entropy',
          description: 'An omnipresent cosmic force.',
        },
        initialGoal: 'Decay the containment perimeter',
        boundedFacts: ['Universal constant'],
      };

      const normalized = normalizeParticipationContext(legacyForceContext);
      expect(normalized).not.toBeNull();
      expect(normalized?.authorityContract?.authority).toBe(
        'Only already authored and ratified scenario facts apply. Grants no new reach, perception, mutation, omniscience, or control until re-inducted with an explicit Authority Contract.'
      );
      expect(normalized?.authorityContract?.limits).toBe(
        'Strictly bounded to authored scenario facts and ratified state. Grants no new reach, perception, mutation, omniscience, or control without an explicit Authority Contract.'
      );
      expect(normalized?.authorityContract?.authority).not.toContain('Local physical presence');
      expect(normalized?.authorityContract?.limits).not.toContain('mortal counterplay');
    });

    it('preserves legacy explicit seat ability and limitation when present', () => {
      const legacyContextWithAbility: ParticipationContext = {
        mode: 'antagonist',
        seat: {
          kind: 'character',
          name: 'Cybernetically Enhanced Sentinel',
          description: 'A hunter droid.',
          ability: 'Thermal optic scanning and door bypass',
          limitation: 'Vulnerable to EMP pulses',
        },
        initialGoal: 'Track survivors',
        boundedFacts: [],
      };

      const normalized = normalizeParticipationContext(legacyContextWithAbility);
      expect(normalized?.authorityContract?.authority).toBe('Thermal optic scanning and door bypass');
      expect(normalized?.authorityContract?.limits).toBe('Vulnerable to EMP pulses');
    });

    it('leaves protagonist and director contexts untouched without injecting authority contracts', () => {
      const protagonistContext: ParticipationContext = {
        mode: 'protagonist',
        seat: {
          kind: 'protagonist',
          name: 'Elena',
        },
        initialGoal: 'Escape',
        boundedFacts: [],
      };

      const normalizedProtag = normalizeParticipationContext(protagonistContext);
      expect(normalizedProtag?.authorityContract).toBeUndefined();
      expect(normalizedProtag?.victimField).toBeUndefined();
    });
  });

  describe('Non-Regression of Protagonist and Director Modes', () => {
    it('compiles a valid Protagonist induction correctly without Authority or Victim contracts', () => {
      const induction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Sub-Level Cryo Archive',
        goal: 'Retrieve the cryogenic logs before power failure',
        unsettlingDetail: 'Rhythmic tapping from inside pod 14',
        participantName: 'Specialist Nora Diaz',
        identity: 'Maintenance Archivist',
        ability: 'Data decryption and electrical repairs',
        limitation: 'Asthmatic response to cold air',
      };

      const { blueprint, participationContext } = compileAdLibInduction(induction);

      expect(blueprint.title).toBe('Sub-Level Cryo Archive (Haunted House)');
      expect(blueprint.contentLevelDescription).toBe('PROTAGONIST HAUNTED HOUSE INDUCTION');
      expect(blueprint.cast).toHaveLength(1);
      expect(blueprint.cast[0].name).toBe('Specialist Nora Diaz');
      expect(blueprint.cast[0].role).toBe('protagonist');
      expect(blueprint.cast[0].isUserCharacter).toBe(true);

      expect(participationContext.mode).toBe('protagonist');
      expect(participationContext.seat?.name).toBe('Specialist Nora Diaz');
      expect(participationContext.authorityContract).toBeUndefined();
      expect(participationContext.victimField).toBeUndefined();
    });

    it('compiles a valid Director induction correctly without Authority or Victim contracts', () => {
      const induction: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Abandoned Radio Observatory',
        goal: 'Stage the gradual communication collapse',
        unsettlingDetail: 'Feedback loops broadcasting dead radio voices',
        directorFocus: 'Pacing tension, sensory withholding, psychological dread',
      };

      const { blueprint, participationContext } = compileAdLibInduction(induction);

      expect(blueprint.title).toBe('Abandoned Radio Observatory (Haunted House Director)');
      expect(blueprint.contentLevelDescription).toBe('DIRECTOR HAUNTED HOUSE INDUCTION');
      expect(blueprint.cast).toHaveLength(0); // Director has no player character
      expect(participationContext.mode).toBe('director');
      expect(participationContext.seat?.kind).toBe('director');
      expect(participationContext.authorityContract).toBeUndefined();
      expect(participationContext.victimField).toBeUndefined();
    });

    it('initializes engine and app stores from a pre-compiled Haunted House payload without re-compilation', () => {
      const induction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Deep Core Relay Station',
        goal: 'Reroute emergency communications',
        participantName: 'Operator Maya',
      };

      const compiled = compileAdLibInduction(induction);
      const originalBlueprint = normalizeBlueprint(compiled.blueprint);
      const originalContext = compiled.participationContext;
      const originalNode = compiled.initialSpatialNode;

      const sessionResult = initiateCompiledAdLibSession({
        blueprint: originalBlueprint,
        participationContext: originalContext,
        initialSpatialNode: originalNode,
      });

      // The precompiled initializer must retain the exact reviewed artifact.
      expect(sessionResult.blueprint).toBe(originalBlueprint);
      expect(sessionResult.participationContext).toBe(originalContext);
      expect(sessionResult.initialSpatialNode).toBe(originalNode);

      const engineState = useEngineStore.getState();
      expect(engineState.activeBlueprint).toBe(originalBlueprint);
      expect(engineState.participationContext).toBe(originalContext);

      const appState = useAppStore.getState();
      expect(appState.blueprintId).toBe(originalBlueprint.id);
      expect(appState.participationContext).toBe(originalContext);
      expect(appState.spatialGraph[0]).toBe(originalNode);
    });
  });
});
