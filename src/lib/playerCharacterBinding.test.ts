import { describe, it, expect } from 'vitest';
import {
  resolvePerspectiveBinding,
  isCharacterEligibleForRole,
  PlayerCharacterBindingError,
} from './playerCharacterBinding';
import type { Blueprint } from '../types';

describe('playerCharacterBinding', () => {
  const sampleBlueprint: Blueprint = {
    title: 'The Whispering Mill',
    contentScale: 'chamber',
    contentLevelDescription: 'Standard',
    globalPremise: 'A mill that grinds bones.',
    environmentalRules: 'Do not sleep near the gears.',
    cast: [
      {
        id: 'char-elena',
        name: 'Elena Ward',
        role: 'Historian',
        description: 'An archivist investigating the mill.',
        personality: 'Curious, cautious',
        goals: 'Find the mill ledger',
        traits: ['Meticulous', 'Observant'],
        isEntity: false,
      },
      {
        id: 'char-marcus',
        name: 'Marcus Gray',
        role: 'Engineer',
        description: 'A surveyor inspecting the water wheel.',
        personality: 'Pragmatic, cynical',
        goals: 'Fix the machinery and leave',
        traits: ['Analytical'],
        isEntity: false,
      },
      {
        id: 'entity-miller',
        name: 'The Dust Miller',
        role: 'Specter',
        description: 'A pale entity woven from grain dust.',
        personality: 'Relentless, quiet',
        goals: 'Feed the grinding stones',
        traits: ['Incorporeal', 'Vengeful'],
        isEntity: true,
      },
    ],
    setting: {
      location: 'Derelict Mill',
      timePeriod: '1920s',
      atmosphere: 'Suffocating flour dust',
    },
    narrativeRules: {
      incitingIncident: 'The water wheel started spinning on its own.',
    },
    topology: {
      nodes: ['MILL_ENTRY', 'MILL_GEAR_ROOM'],
      connections: [],
    },
  };

  describe('isCharacterEligibleForRole', () => {
    it('identifies mortal characters as eligible for protagonist only', () => {
      const elena = sampleBlueprint.cast[0];
      expect(isCharacterEligibleForRole(elena, 'protagonist')).toBe(true);
      expect(isCharacterEligibleForRole(elena, 'antagonist')).toBe(false);
      expect(isCharacterEligibleForRole(elena, 'possessed')).toBe(true);
    });

    it('identifies entity characters as eligible for antagonist only', () => {
      const miller = sampleBlueprint.cast[2];
      expect(isCharacterEligibleForRole(miller, 'protagonist')).toBe(false);
      expect(isCharacterEligibleForRole(miller, 'antagonist')).toBe(true);
      expect(isCharacterEligibleForRole(miller, 'possessed')).toBe(true);
    });
  });

  describe('resolvePerspectiveBinding with explicit selection', () => {
    it('binds explicitly to non-default mortal for protagonist', () => {
      const binding = resolvePerspectiveBinding(sampleBlueprint, 'protagonist', 'char-marcus');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-marcus',
        perspectiveMode: 'embodied',
      });
    });

    it('binds explicitly to entity for antagonist', () => {
      const binding = resolvePerspectiveBinding(sampleBlueprint, 'antagonist', 'entity-miller');
      expect(binding).toEqual({
        playerRole: 'antagonist',
        characterId: 'entity-miller',
        perspectiveMode: 'entity_embodied',
      });
    });

    it('throws when selecting an unknown character ID', () => {
      expect(() => {
        resolvePerspectiveBinding(sampleBlueprint, 'protagonist', 'unknown-id');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(sampleBlueprint, 'protagonist', 'unknown-id');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('UNKNOWN_CHARACTER_ID');
      }
    });

    it('throws when selecting an entity for protagonist role', () => {
      expect(() => {
        resolvePerspectiveBinding(sampleBlueprint, 'protagonist', 'entity-miller');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(sampleBlueprint, 'protagonist', 'entity-miller');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('ROLE_CHARACTER_MISMATCH');
      }
    });

    it('throws when selecting a mortal for antagonist role', () => {
      expect(() => {
        resolvePerspectiveBinding(sampleBlueprint, 'antagonist', 'char-elena');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(sampleBlueprint, 'antagonist', 'char-elena');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('ROLE_CHARACTER_MISMATCH');
      }
    });

    it('throws when attempting explicit character binding for director or witness', () => {
      expect(() => {
        resolvePerspectiveBinding(sampleBlueprint, 'director', 'char-elena');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(sampleBlueprint, 'director', 'char-elena');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('NON_EMBODIED_ROLE');
      }
    });
  });

  describe('resolvePerspectiveBinding with default binding (undefined)', () => {
    it('defaults protagonist to first mortal member', () => {
      const binding = resolvePerspectiveBinding(sampleBlueprint, 'protagonist');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-elena',
        perspectiveMode: 'embodied',
      });
    });

    it('defaults antagonist to first entity member', () => {
      const binding = resolvePerspectiveBinding(sampleBlueprint, 'antagonist');
      expect(binding).toEqual({
        playerRole: 'antagonist',
        characterId: 'entity-miller',
        perspectiveMode: 'entity_embodied',
      });
    });

    it('defaults director and witness to unbound mode', () => {
      const directorBinding = resolvePerspectiveBinding(sampleBlueprint, 'director');
      expect(directorBinding).toEqual({
        playerRole: 'director',
        characterId: null,
        perspectiveMode: 'witness',
      });

      const witnessBinding = resolvePerspectiveBinding(sampleBlueprint, 'witness');
      expect(witnessBinding).toEqual({
        playerRole: 'witness',
        characterId: null,
        perspectiveMode: 'witness',
      });
    });
  });
});
