import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  compileAdLibInduction,
  initiateAdLibSession,
} from '../../lib/adLibCompiler';
import {
  AdLibProtagonistInduction,
  AdLibAntagonistInduction,
  AdLibDirectorInduction,
} from '../../types/adLib';
import {
  Blueprint,
  BlueprintSchema,
} from '../../types';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import {
  resolveSeatAvailabilities,
  buildActiveParticipationContext,
} from '../../lib/seatAvailability';
import {
  generateHauntedHouseBlueprintFilename,
} from '../../lib/download';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Phase 3C: Haunted House Induction Convergence, Provenance & Seat Availability', () => {
  beforeEach(() => {
    useEngineStore.getState().clearBlueprint();
    useEngineStore.getState().resetEngine();
    useAppStore.getState().resetSession();
  });

  describe('1. Haunted House Induction Modes & Provenance Generation', () => {
    it('compiles a Protagonist induction carrying valid Haunted House provenance', () => {
      const induction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Derelict Atmospheric Siphon',
        goal: 'Repair oxygen regulator valve 3 before pressure threshold drops below 10%',
        unsettlingDetail: 'Sub-harmonic vibration echoing through bulkhead C-4',
        participantName: 'Specialist Sean Thorne',
        identity: 'Station Atmospheric Engineer',
        ability: 'Pneumatics diagnostic bypass and emergency welding',
        limitation: 'Suffers vertigo in unpressurized corridors',
      };

      const compiled = compileAdLibInduction(induction);

      expect(compiled.blueprint.hauntedHouse).toBeDefined();
      expect(compiled.blueprint.hauntedHouse?.source).toBe('haunted-house');
      expect(compiled.blueprint.hauntedHouse?.version).toBe(1);
      expect(compiled.blueprint.hauntedHouse?.recommendedParticipationMode).toBe('protagonist');
      expect(compiled.blueprint.setting.location).toBe('Derelict Atmospheric Siphon');
      expect(compiled.blueprint.narrativeRules?.incitingIncident).toBe(
        'Repair oxygen regulator valve 3 before pressure threshold drops below 10%'
      );
      expect(compiled.participationContext.mode).toBe('protagonist');
      expect(compiled.blueprint.hauntedHouse?.participationContext.mode).toBe('protagonist');
      expect(compiled.blueprint.hauntedHouse?.participationContext.seat.name).toBe('Specialist Sean Thorne');
    });

    it('compiles an Antagonist induction carrying valid Haunted House provenance with Authority and Limits', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Level Quarantine Vault',
        goal: 'Breach the bio-containment seals and trap the remaining survivors',
        unsettlingDetail: 'Acoustic feedback loops emitting low frequencies',
        oppositionSeat: {
          kind: 'character',
          name: 'The Stalker Unit',
          description: 'A rogue security android with compromised neural heuristics.',
          goal: 'Sever power routing before manual override activates.',
        },
        authorityContract: {
          authority: 'Can override magnetic blast doors, extinguish emergency lighting, and vent nitrogen into airlocks.',
          limits: 'Cannot manifest outside Sector 4 grid; vulnerable to thermal flare pulses; cannot rewrite mainframe root access.',
        },
        victimField: {
          kind: 'individual',
          name: 'Dr. Alistair Vance',
          description: 'Chief research immunologist carrying the antidote synthesizer.',
          goal: 'Reach the central terminal and broadcast the evacuation distress cipher.',
          knownFact: 'Limps due to a fractured tibia from the initial breach.',
        },
      };

      const compiled = compileAdLibInduction(induction);

      expect(compiled.blueprint.hauntedHouse).toBeDefined();
      expect(compiled.blueprint.hauntedHouse?.source).toBe('haunted-house');
      expect(compiled.blueprint.hauntedHouse?.recommendedParticipationMode).toBe('antagonist');
      expect(compiled.blueprint.hauntedHouse?.participationContext.mode).toBe('antagonist');
      expect(compiled.blueprint.hauntedHouse?.participationContext.authorityContract?.authority).toBe(
        'Can override magnetic blast doors, extinguish emergency lighting, and vent nitrogen into airlocks.'
      );
      expect(compiled.blueprint.hauntedHouse?.participationContext.authorityContract?.limits).toBe(
        'Cannot manifest outside Sector 4 grid; vulnerable to thermal flare pulses; cannot rewrite mainframe root access.'
      );
      expect(compiled.blueprint.hauntedHouse?.participationContext.victimField?.kind).toBe('individual');
      if (compiled.blueprint.hauntedHouse?.participationContext.victimField?.kind === 'individual') {
        expect(compiled.blueprint.hauntedHouse.participationContext.victimField.name).toBe('Dr. Alistair Vance');
        expect(compiled.blueprint.hauntedHouse.participationContext.victimField.knownFact).toBe(
          'Limps due to a fractured tibia from the initial breach.'
        );
      }
    });

    it('compiles a Director induction carrying valid Haunted House provenance', () => {
      const induction: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Deep Trench Research Rig',
        goal: 'Orchestrate mounting psychological dread and structural degradation',
        unsettlingDetail: 'Water temperature steadily rising in the observation dome',
        directorFocus: 'Sensory deprivation, sudden hydrophone signals, and rising panic.',
      };

      const compiled = compileAdLibInduction(induction);

      expect(compiled.blueprint.hauntedHouse).toBeDefined();
      expect(compiled.blueprint.hauntedHouse?.source).toBe('haunted-house');
      expect(compiled.blueprint.hauntedHouse?.recommendedParticipationMode).toBe('director');
      expect(compiled.blueprint.hauntedHouse?.participationContext.mode).toBe('director');
      expect(compiled.blueprint.hauntedHouse?.participationContext.seat.kind).toBe('director');
      expect(compiled.blueprint.cast).toHaveLength(0);
    });
  });

  describe('2. Canonical Blueprint Schema Parse / Normalize / Serialize Round-Trips', () => {
    it('preserves Haunted House provenance exactly across JSON serialize and parse', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Hydrothermal Submersible',
        goal: 'Disrupt depth stabilizers before ascent',
        unsettlingDetail: 'Cracking hull seams in darkness',
        oppositionSeat: {
          kind: 'force',
          name: 'The Abyssal Current',
          description: 'A violent hydro-dynamic vortex crushing external ballast.',
          goal: 'Overwhelm hull pressure ratings.',
        },
        authorityContract: {
          authority: 'Can warp exterior hull plating, flood ballast tanks, and shear electrical cables.',
          limits: 'Cannot penetrate double-reinforced titanium escape sphere.',
        },
        victimField: {
          kind: 'individual',
          name: 'Pilot Evelyn Reed',
          goal: 'Fire emergency ascent thrusters.',
        },
      };

      const compiled = compileAdLibInduction(induction);
      const serialized = JSON.stringify(compiled.blueprint);
      const deserialized = JSON.parse(serialized);

      const normalized = normalizeBlueprint(deserialized);
      const parsed = BlueprintSchema.parse(normalized);

      expect(parsed.hauntedHouse).toBeDefined();
      expect(parsed.hauntedHouse?.source).toBe('haunted-house');
      expect(parsed.hauntedHouse?.recommendedParticipationMode).toBe('antagonist');
      expect(parsed.hauntedHouse?.participationContext.authorityContract?.authority).toBe(
        induction.authorityContract.authority
      );
      expect(parsed.hauntedHouse?.participationContext.authorityContract?.limits).toBe(
        induction.authorityContract.limits
      );
      expect(parsed.hauntedHouse?.participationContext.victimField?.kind).toBe('individual');
    });
  });

  describe('3. Exported Haunted House Blueprint accepted by Ordinary Blueprint Normalizer', () => {
    it('normalizes exported Haunted House blueprint with all schema invariants intact', () => {
      const induction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Abandoned Radio Observatory',
        goal: 'Align the radio dish before solar flare blackout',
        participantName: 'Technician Clara Frost',
      };

      const compiled = compileAdLibInduction(induction);
      const exportedJson = JSON.parse(JSON.stringify(compiled.blueprint));

      const imported = normalizeBlueprint(exportedJson);
      expect(imported.title).toBe('Abandoned Radio Observatory (Ad Lib)');
      expect(imported.setting.location).toBe('Abandoned Radio Observatory');
      expect(imported.hauntedHouse).toBeDefined();
      expect(imported.hauntedHouse?.recommendedParticipationMode).toBe('protagonist');
    });
  });

  describe('4. Legacy Blueprints without Provenance', () => {
    it('preserves existing import behavior for legacy blueprints without adding hauntedHouse provenance', () => {
      const legacyBlueprint = {
        title: 'Legacy Space Station',
        setting: {
          location: 'Orbital Array Theta',
          timePeriod: '2199',
          atmosphere: 'Zero-g silence',
        },
        cast: [
          {
            id: 'char-1',
            name: 'Commander Hayes',
            role: 'protagonist',
            isUserCharacter: true,
            isEntity: false,
          },
        ],
        topology: {
          nodes: ['NODE_1', 'NODE_2'],
          connections: [{ from: 'NODE_1', to: 'NODE_2', kind: 'PHYSICAL', userInitiated: true }],
        },
      };

      const normalized = normalizeBlueprint(legacyBlueprint);
      expect(normalized.hauntedHouse).toBeUndefined();
      expect(normalized.title).toBe('Legacy Space Station');
      expect(normalized.cast).toHaveLength(1);
    });
  });

  describe('5. Antagonist Authority/Limits and Victim Framing survive Export/Import', () => {
    it('preserves group victim framing and multi-member data through round trip', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Subterranean Bunker Complex',
        goal: 'Exterminate the survivor enclave',
        oppositionSeat: {
          kind: 'character',
          name: 'The Infiltrator Stalker',
          description: 'A shapeshifting synthetic organism.',
          goal: 'Eliminate high command personnel.',
        },
        authorityContract: {
          authority: 'Can vent carbon monoxide into ventilation ducts and mimic voices.',
          limits: 'Cannot pass through active ultrasonic perimeter fields.',
        },
        victimField: {
          kind: 'group',
          collectiveDesignation: 'Bravo Engineering Squad',
          description: 'Three surviving technicians sheltering in the armory.',
          members: [
            {
              id: 'm1',
              name: 'Sgt. Miller',
              description: 'Squad leader',
              goal: 'Fortify the armory barricade',
              knownFact: 'Holds the last functional shotgun',
            },
            {
              id: 'm2',
              name: 'Medic Chen',
              description: 'Field surgeon',
              goal: 'Stabilize wounded teammates',
              knownFact: 'Has limited morphine supplies',
            },
          ],
        },
      };

      const compiled = compileAdLibInduction(induction);
      const json = JSON.stringify(compiled.blueprint);
      const roundTripped = normalizeBlueprint(JSON.parse(json));

      const victimField = roundTripped.hauntedHouse?.participationContext.victimField;
      expect(victimField?.kind).toBe('group');
      if (victimField?.kind === 'group') {
        expect(victimField.collectiveDesignation).toBe('Bravo Engineering Squad');
        expect(victimField.members).toHaveLength(2);
        expect(victimField.members[0].name).toBe('Sgt. Miller');
        expect(victimField.members[0].knownFact).toBe('Holds the last functional shotgun');
        expect(victimField.members[1].name).toBe('Medic Chen');
      }
    });
  });

  describe('6. Director-origin Haunted House Recognition & Review Selection', () => {
    it('recognizes Director-origin Haunted House blueprint and identifies Director as recommended mode', () => {
      const induction: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Lighthouse at World End',
        goal: 'Drive the lighthouse keeper to madness through atmospheric isolation',
        directorFocus: 'Foghorn rhythm, spectral optical illusions, psychological breakdown',
      };

      const compiled = compileAdLibInduction(induction);
      const normalized = normalizeBlueprint(compiled.blueprint);

      expect(normalized.hauntedHouse?.recommendedParticipationMode).toBe('director');

      const availabilities = resolveSeatAvailabilities(normalized);
      expect(availabilities.director.available).toBe(true);
      expect(availabilities.director.role).toBe('director');
    });
  });

  describe('7. Seat Availability Resolver Consistency', () => {
    it('handles blueprint with no mortal cast (protagonist unavailable, entity antagonist available)', () => {
      const blueprint: Blueprint = normalizeBlueprint({
        title: 'Haunted Ruins',
        setting: { location: 'Cursed Crypt', timePeriod: 'Ancient', atmosphere: 'Cold mist' },
        cast: [
          {
            id: 'ent-1',
            name: 'The Wraith',
            role: 'antagonist',
            isEntity: true,
          },
        ],
      });

      const availabilities = resolveSeatAvailabilities(blueprint);
      expect(availabilities.protagonist.available).toBe(false);
      expect(availabilities.protagonist.reason).toBeDefined();
      expect(availabilities.antagonist.available).toBe(true);
      expect(availabilities.antagonist.boundCharacterName).toBe('The Wraith');
      expect(availabilities.director.available).toBe(true);
    });

    it('handles blueprint with no entity cast (antagonist unavailable, mortal protagonist available)', () => {
      const blueprint: Blueprint = normalizeBlueprint({
        title: 'Survival Cabin',
        setting: { location: 'Snowy Woods', timePeriod: 'Present', atmosphere: 'Blizzard' },
        cast: [
          {
            id: 'mort-1',
            name: 'Sarah Connor',
            role: 'protagonist',
            isEntity: false,
          },
        ],
      });

      const availabilities = resolveSeatAvailabilities(blueprint);
      expect(availabilities.protagonist.available).toBe(true);
      expect(availabilities.protagonist.boundCharacterName).toBe('Sarah Connor');
      expect(availabilities.antagonist.available).toBe(false);
      expect(availabilities.antagonist.reason).toBeDefined();
      expect(availabilities.director.available).toBe(true);
    });

    it('handles Director-without-cast scenarios gracefully', () => {
      const blueprint: Blueprint = normalizeBlueprint({
        title: 'Empty Void',
        setting: { location: 'Deep Space', timePeriod: 'Future', atmosphere: 'Silent' },
        cast: [],
      });

      const availabilities = resolveSeatAvailabilities(blueprint);
      expect(availabilities.protagonist.available).toBe(false);
      expect(availabilities.antagonist.available).toBe(false);
      expect(availabilities.director.available).toBe(true);
      expect(availabilities.director.boundCharacterName).toBe('Director');
    });
  });

  describe('8. Selecting Compatible Seat leaves Stored Provenance Unchanged', () => {
    it('leaves stored Haunted House provenance pristine when switching active seat', () => {
      const induction: AdLibProtagonistInduction = {
        participationMode: 'protagonist',
        placeSeed: 'Submerged Hydro-Lab',
        goal: 'Repair seal A-12 before flooding',
        participantName: 'Diver Kane',
      };

      const compiled = compileAdLibInduction(induction);
      const blueprint = normalizeBlueprint(compiled.blueprint);

      // Select Director seat instead of Protagonist
      const activeContext = buildActiveParticipationContext(blueprint, 'director');

      // Active context is Director
      expect(activeContext?.mode).toBe('director');
      expect(activeContext?.seat?.kind).toBe('director');

      // Stored provenance inside blueprint remains unchanged (Protagonist)
      expect(blueprint.hauntedHouse?.recommendedParticipationMode).toBe('protagonist');
      expect(blueprint.hauntedHouse?.participationContext.mode).toBe('protagonist');
      expect(blueprint.hauntedHouse?.participationContext.seat.name).toBe('Diver Kane');
    });
  });

  describe('9. Filename Generation & Download Validation', () => {
    it('generates a clean sanitized filename for Haunted House blueprints', () => {
      const filename = generateHauntedHouseBlueprintFilename('Derelict Atmospheric Siphon // Unit 4');
      expect(filename).toBe('haunted-house-derelict-atmospheric-siphon-unit-4.json');
    });

    it('validates canonical blueprint download payload without launching a session', () => {
      const induction: AdLibDirectorInduction = {
        participationMode: 'director',
        placeSeed: 'Abandoned Observatory',
        goal: 'Stir deep dread in the night shift',
      };

      const compiled = compileAdLibInduction(induction);
      const normalized = normalizeBlueprint(compiled.blueprint);

      expect(normalized).toBeDefined();
      expect(normalized.hauntedHouse).toBeDefined();
      expect(normalized.hauntedHouse?.source).toBe('haunted-house');

      // Verify engine store was not initialized simply by preparing/normalizing download
      expect(useEngineStore.getState().activeBlueprint).toBeNull();
      expect(useEngineStore.getState().participationContext).toBeNull();
      expect(useAppStore.getState().sessionId).toBeFalsy();
    });
  });

  describe('10. Session Initiation from Haunted House Induction', () => {
    it('initiates active session and registers participation context in EngineStore', () => {
      const induction: AdLibAntagonistInduction = {
        participationMode: 'antagonist',
        placeSeed: 'Sub-Zero Cryo Storage',
        goal: 'Sabotage temperature regulators',
        oppositionSeat: {
          kind: 'character',
          name: 'Cryo Entity',
          description: 'Glacial manifestation.',
          goal: 'Freeze all corridors.',
        },
        authorityContract: {
          authority: 'Flash-freeze airlocks and shatter hydraulic lines.',
          limits: 'Cannot manifest near high-heat thermal furnaces.',
        },
        victimField: {
          kind: 'individual',
          name: 'Watchman Diaz',
          goal: 'Ignite thermal furnace.',
        },
      };

      const result = initiateAdLibSession(induction);

      expect(result.blueprint).toBeDefined();
      expect(result.participationContext).toBeDefined();
      expect(result.participationContext.mode).toBe('antagonist');

      // Verify engine store is updated with active context
      const storeContext = useEngineStore.getState().participationContext;
      expect(storeContext?.mode).toBe('antagonist');
      expect(storeContext?.authorityContract?.authority).toBe(
        'Flash-freeze airlocks and shatter hydraulic lines.'
      );
    });
  });
});
