import { describe, it, expect } from 'vitest';
import {
  resolvePerspectiveBinding,
  isCharacterEligibleForRole,
  PlayerCharacterBindingError,
} from './playerCharacterBinding';
import { normalizeBlueprint } from './normalizeBlueprint';

describe('playerCharacterBinding', () => {
  const genericBlueprint = normalizeBlueprint({
    title: 'Generic Enclosure',
    contentScale: 3,
    contentLevelDescription: 'Standard',
    globalPremise: 'A generic test premise.',
    environmentalRules: ['Rule 1'],
    cast: [
      {
        id: 'char-1',
        name: 'Mortal One',
        role: 'Specialist',
        description: 'First generic mortal subject.',
        personality: 'Cautious',
        goals: 'Survive',
        traits: ['Observant'],
        isEntity: false,
      },
      {
        id: 'char-2',
        name: 'Mortal Two',
        role: 'Operator',
        description: 'Second generic mortal subject.',
        personality: 'Pragmatic',
        goals: 'Repair systems',
        traits: ['Analytical'],
        isEntity: false,
      },
      {
        id: 'entity-1',
        name: 'Entity One',
        role: 'Apparition',
        description: 'First generic entity presence.',
        personality: 'Hostile',
        goals: 'Isolate subjects',
        traits: ['Incorporeal'],
        isEntity: true,
      },
    ],
    setting: {
      location: 'Chamber 01',
      timePeriod: 'Present',
      atmosphere: 'Sterile',
    },
    narrativeRules: {
      incitingIncident: 'System alert triggered.',
    },
    topology: {
      nodes: ['CHAMBER_01', 'CHAMBER_02'],
      connections: [],
    },
  });

  describe('isCharacterEligibleForRole', () => {
    it('identifies mortal characters as eligible for protagonist only', () => {
      const mortal = genericBlueprint.cast[0];
      expect(isCharacterEligibleForRole(mortal, 'protagonist')).toBe(true);
      expect(isCharacterEligibleForRole(mortal, 'antagonist')).toBe(false);
      expect(isCharacterEligibleForRole(mortal, 'possessed')).toBe(true);
    });

    it('identifies entity characters as eligible for antagonist only', () => {
      const entity = genericBlueprint.cast[2];
      expect(isCharacterEligibleForRole(entity, 'protagonist')).toBe(false);
      expect(isCharacterEligibleForRole(entity, 'antagonist')).toBe(true);
      expect(isCharacterEligibleForRole(entity, 'possessed')).toBe(true);
    });
  });

  describe('resolvePerspectiveBinding with explicit selection', () => {
    it('binds explicitly to non-default mortal for protagonist (second eligible)', () => {
      const binding = resolvePerspectiveBinding(genericBlueprint, 'protagonist', 'char-2');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-2',
        perspectiveMode: 'embodied',
      });
    });

    it('binds explicitly to entity for antagonist', () => {
      const binding = resolvePerspectiveBinding(genericBlueprint, 'antagonist', 'entity-1');
      expect(binding).toEqual({
        playerRole: 'antagonist',
        characterId: 'entity-1',
        perspectiveMode: 'entity_embodied',
      });
    });

    it('throws INVALID_CHARACTER_ID when selecting an empty string', () => {
      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', '   ');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', '   ');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('INVALID_CHARACTER_ID');
      }
    });

    it('throws UNKNOWN_CHARACTER_ID when selecting an unknown character ID', () => {
      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', 'char-unknown');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', 'char-unknown');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('UNKNOWN_CHARACTER_ID');
      }
    });

    it('throws AMBIGUOUS_CHARACTER_ID when selecting a duplicated character ID in cast', () => {
      const duplicateBlueprint = normalizeBlueprint({
        ...genericBlueprint,
        cast: [
          ...genericBlueprint.cast,
          {
            id: 'char-1',
            name: 'Duplicate Mortal',
            description: 'Duplicate',
            isEntity: false,
          },
        ],
      });

      expect(() => {
        resolvePerspectiveBinding(duplicateBlueprint, 'protagonist', 'char-1');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(duplicateBlueprint, 'protagonist', 'char-1');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('AMBIGUOUS_CHARACTER_ID');
      }
    });

    it('throws ROLE_CHARACTER_MISMATCH when selecting an entity for protagonist role', () => {
      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', 'entity-1');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'protagonist', 'entity-1');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('ROLE_CHARACTER_MISMATCH');
      }
    });

    it('throws ROLE_CHARACTER_MISMATCH when selecting a mortal for antagonist role', () => {
      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'antagonist', 'char-1');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'antagonist', 'char-1');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('ROLE_CHARACTER_MISMATCH');
      }
    });

    it('throws NON_EMBODIED_ROLE when attempting explicit character binding for director or witness', () => {
      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'director', 'char-1');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'director', 'char-1');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('NON_EMBODIED_ROLE');
      }

      expect(() => {
        resolvePerspectiveBinding(genericBlueprint, 'witness', 'char-1');
      }).toThrow(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(genericBlueprint, 'witness', 'char-1');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('NON_EMBODIED_ROLE');
      }
    });
  });

  describe('resolvePerspectiveBinding with default binding (undefined)', () => {
    it('defaults protagonist to first mortal member when no authored perspectives exist', () => {
      const binding = resolvePerspectiveBinding(genericBlueprint, 'protagonist');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-1',
        perspectiveMode: 'embodied',
      });
    });

    it('defaults antagonist to first entity member when no authored perspectives exist', () => {
      const binding = resolvePerspectiveBinding(genericBlueprint, 'antagonist');
      expect(binding).toEqual({
        playerRole: 'antagonist',
        characterId: 'entity-1',
        perspectiveMode: 'entity_embodied',
      });
    });

    it('binds to authored subjectCharacterId from top-level Blueprint.perspectives array', () => {
      const blueprintWithPerspectives = normalizeBlueprint({
        ...genericBlueprint,
        perspectives: [
          {
            role: 'PROTAGONIST',
            subjectCharacterId: 'char-2',
            mode: 'embodied',
          },
          {
            role: 'ANTAGONIST',
            subjectCharacterId: 'entity-1',
            mode: 'entity_embodied',
          },
        ],
      });

      const protagBinding = resolvePerspectiveBinding(blueprintWithPerspectives, 'protagonist');
      expect(protagBinding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-2',
        perspectiveMode: 'embodied',
      });

      const antagBinding = resolvePerspectiveBinding(blueprintWithPerspectives, 'antagonist');
      expect(antagBinding).toEqual({
        playerRole: 'antagonist',
        characterId: 'entity-1',
        perspectiveMode: 'entity_embodied',
      });
    });

    it('proves hauntedHouse is not read for perspectives array and top-level takes precedence', () => {
      const blueprintWithHauntedHouse = normalizeBlueprint({
        ...genericBlueprint,
        perspectives: [
          {
            role: 'PROTAGONIST',
            subjectCharacterId: 'char-2',
          },
        ],
        hauntedHouse: {
          source: 'haunted-house',
          version: 1,
          recommendedParticipationMode: 'protagonist',
          participationContext: {
            mode: 'protagonist',
            initialGoal: 'Escape',
            boundedFacts: [],
          },
        },
      });

      const binding = resolvePerspectiveBinding(blueprintWithHauntedHouse, 'protagonist');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-2',
        perspectiveMode: 'embodied',
      });
    });

    it('defaults director to perspectiveMode director with characterId null', () => {
      const directorBinding = resolvePerspectiveBinding(genericBlueprint, 'director');
      expect(directorBinding).toEqual({
        playerRole: 'director',
        characterId: null,
        perspectiveMode: 'director',
      });
    });

    it('defaults witness to perspectiveMode witness with characterId null', () => {
      const witnessBinding = resolvePerspectiveBinding(genericBlueprint, 'witness');
      expect(witnessBinding).toEqual({
        playerRole: 'witness',
        characterId: null,
        perspectiveMode: 'witness',
      });
    });

    it('Forge 1C-6: resolves blueprint.userCharacterId strictly for protagonist', () => {
      const blueprintWithUserChar = normalizeBlueprint({
        ...genericBlueprint,
        userCharacterId: 'char-2',
      });

      const binding = resolvePerspectiveBinding(blueprintWithUserChar, 'protagonist');
      expect(binding).toEqual({
        playerRole: 'protagonist',
        characterId: 'char-2',
        perspectiveMode: 'embodied',
      });
    });

    it('Forge 1C-6: blocks explicit selection when it mismatches reviewed blueprint.userCharacterId', () => {
      const blueprintWithUserChar = normalizeBlueprint({
        ...genericBlueprint,
        userCharacterId: 'char-1',
      });

      expect(() => {
        resolvePerspectiveBinding(blueprintWithUserChar, 'protagonist', 'char-2');
      }).toThrowError(PlayerCharacterBindingError);

      try {
        resolvePerspectiveBinding(blueprintWithUserChar, 'protagonist', 'char-2');
      } catch (err) {
        expect((err as PlayerCharacterBindingError).code).toBe('ROLE_CHARACTER_MISMATCH');
        expect((err as Error).message).toContain('does not match the reviewed user character ID');
      }
    });

    it('Forge 1C-6: throws UNKNOWN_CHARACTER_ID if blueprint.userCharacterId is not in cast', () => {
      const invalidBlueprint = normalizeBlueprint({
        ...genericBlueprint,
        userCharacterId: 'char-nonexistent',
      });

      expect(() => {
        resolvePerspectiveBinding(invalidBlueprint, 'protagonist');
      }).toThrow(PlayerCharacterBindingError);
    });
  });
});
