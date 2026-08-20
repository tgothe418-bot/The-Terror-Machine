import type { Blueprint, PlayerRole, PerspectiveMode } from '../types';

export interface PlayerCharacterBinding {
  playerRole: PlayerRole;
  characterId: string | null;
  perspectiveMode: PerspectiveMode;
}

export type PlayerCharacterBindingErrorCode =
  | 'INVALID_CHARACTER_ID'
  | 'UNKNOWN_CHARACTER_ID'
  | 'AMBIGUOUS_CHARACTER_ID'
  | 'ROLE_CHARACTER_MISMATCH'
  | 'NON_EMBODIED_ROLE';

export class PlayerCharacterBindingError extends Error {
  readonly code: PlayerCharacterBindingErrorCode;

  constructor(code: PlayerCharacterBindingErrorCode, message: string) {
    super(message);
    this.name = 'PlayerCharacterBindingError';
    this.code = code;
    Object.setPrototypeOf(this, PlayerCharacterBindingError.prototype);
  }
}

export function isCharacterEligibleForRole(
  character: Blueprint['cast'][number],
  role: PlayerRole
): boolean {
  if (role === 'protagonist') {
    return character.isEntity !== true;
  }
  if (role === 'antagonist') {
    return character.isEntity === true;
  }
  if (role === 'possessed') {
    // For possessed mode, return true for any exact cast member to allow authored-perspective validation
    return true;
  }
  return false;
}

export function resolvePerspectiveBinding(
  blueprint: Blueprint,
  role: PlayerRole,
  selectedCharacterId?: string | null
): PlayerCharacterBinding {
  const cast = blueprint.cast ?? [];

  // Director and Witness roles must remain unbound
  if (role === 'director' || role === 'witness') {
    if (selectedCharacterId !== undefined && selectedCharacterId !== null) {
      throw new PlayerCharacterBindingError(
        'NON_EMBODIED_ROLE',
        `Role "${role}" cannot be bound to an explicit character ID.`
      );
    }
    return {
      playerRole: role,
      characterId: null,
      perspectiveMode: role === 'director' ? 'director' : 'witness',
    };
  }

  // If explicitly requested as null, keep unbound
  if (selectedCharacterId === null) {
    return {
      playerRole: role,
      characterId: null,
      perspectiveMode:
        role === 'director'
          ? 'director'
          : role === 'witness'
          ? 'witness'
          : role === 'antagonist'
          ? 'entity_embodied'
          : 'embodied',
    };
  }

  // Handle explicit selection (non-null string)
  if (selectedCharacterId !== undefined) {
    if (typeof selectedCharacterId !== 'string' || selectedCharacterId.trim() === '') {
      throw new PlayerCharacterBindingError(
        'INVALID_CHARACTER_ID',
        'Explicit character selection must be a non-empty string.'
      );
    }

    const matches = cast.filter((c) => c.id === selectedCharacterId);
    if (matches.length === 0) {
      throw new PlayerCharacterBindingError(
        'UNKNOWN_CHARACTER_ID',
        `Character ID "${selectedCharacterId}" does not exist in blueprint cast.`
      );
    }
    if (matches.length > 1) {
      throw new PlayerCharacterBindingError(
        'AMBIGUOUS_CHARACTER_ID',
        `Character ID "${selectedCharacterId}" is duplicated in blueprint cast.`
      );
    }

    const matchedChar = matches[0];

    if (role === 'possessed') {
      throw new PlayerCharacterBindingError(
        'NON_EMBODIED_ROLE',
        'Explicit character selection is not permitted for possessed role in this phase.'
      );
    }

    if (!isCharacterEligibleForRole(matchedChar, role)) {
      throw new PlayerCharacterBindingError(
        'ROLE_CHARACTER_MISMATCH',
        `Character "${matchedChar.id}" is not eligible for role "${role}".`
      );
    }

    return {
      playerRole: role,
      characterId: matchedChar.id,
      perspectiveMode: role === 'antagonist' ? 'entity_embodied' : 'embodied',
    };
  }

  // selectedCharacterId === undefined (canonical top-level perspectives lookup)
  const perspectives = blueprint.perspectives;

  const findPerspective = (roleToken: string) => {
    if (!Array.isArray(perspectives)) return undefined;
    return perspectives.find(
      (p): p is { role?: string; subjectCharacterId?: string; mode?: unknown } =>
        typeof p === 'object' &&
        p !== null &&
        !Array.isArray(p) &&
        typeof (p as { role?: unknown }).role === 'string' &&
        (p as { role: string }).role.toUpperCase() === roleToken
    );
  };

  const isSupportedMode = (mode: unknown): mode is PerspectiveMode => {
    return (
      mode === 'embodied' ||
      mode === 'entity_embodied' ||
      mode === 'director' ||
      mode === 'witness'
    );
  };

  if (role === 'possessed') {
    const possessedPersp = findPerspective('POSSESSED');
    if (
      possessedPersp &&
      typeof possessedPersp.subjectCharacterId === 'string' &&
      possessedPersp.subjectCharacterId.trim() !== ''
    ) {
      const charMatches = cast.filter((c) => c.id === possessedPersp.subjectCharacterId);
      if (charMatches.length === 1 && isCharacterEligibleForRole(charMatches[0], 'possessed')) {
        return {
          playerRole: 'possessed',
          characterId: charMatches[0].id,
          perspectiveMode: isSupportedMode(possessedPersp.mode)
            ? possessedPersp.mode
            : 'embodied',
        };
      }
    }
    return {
      playerRole: 'possessed',
      characterId: null,
      perspectiveMode: 'witness',
    };
  }

  if (role === 'antagonist') {
    const antagonistPersp = findPerspective('ANTAGONIST');
    if (
      antagonistPersp &&
      typeof antagonistPersp.subjectCharacterId === 'string' &&
      antagonistPersp.subjectCharacterId.trim() !== ''
    ) {
      const charMatches = cast.filter((c) => c.id === antagonistPersp.subjectCharacterId);
      if (charMatches.length === 1 && isCharacterEligibleForRole(charMatches[0], 'antagonist')) {
        return {
          playerRole: 'antagonist',
          characterId: charMatches[0].id,
          perspectiveMode: isSupportedMode(antagonistPersp.mode)
            ? antagonistPersp.mode
            : 'entity_embodied',
        };
      }
    }

    const firstEntity = cast.find((c) => isCharacterEligibleForRole(c, 'antagonist'));
    return {
      playerRole: 'antagonist',
      characterId: firstEntity ? firstEntity.id : null,
      perspectiveMode: 'entity_embodied',
    };
  }

  if (role === 'protagonist') {
    const protagonistPersp = findPerspective('PROTAGONIST');
    if (
      protagonistPersp &&
      typeof protagonistPersp.subjectCharacterId === 'string' &&
      protagonistPersp.subjectCharacterId.trim() !== ''
    ) {
      const charMatches = cast.filter((c) => c.id === protagonistPersp.subjectCharacterId);
      if (charMatches.length === 1 && isCharacterEligibleForRole(charMatches[0], 'protagonist')) {
        return {
          playerRole: 'protagonist',
          characterId: charMatches[0].id,
          perspectiveMode: isSupportedMode(protagonistPersp.mode)
            ? protagonistPersp.mode
            : 'embodied',
        };
      }
    }

    const firstMortal = cast.find((c) => isCharacterEligibleForRole(c, 'protagonist'));
    return {
      playerRole: 'protagonist',
      characterId: firstMortal ? firstMortal.id : null,
      perspectiveMode: 'embodied',
    };
  }

  return {
    playerRole: role,
    characterId: null,
    perspectiveMode: 'embodied',
  };
}
