import { Blueprint, ParticipationContext, ParticipationMode, normalizeParticipationContext } from '../types';
import { isCharacterEligibleForRole } from './playerCharacterBinding';

export interface SeatAvailability {
  role: ParticipationMode;
  available: boolean;
  reason?: string;
  boundCharacterId?: string | null;
  boundCharacterName?: string | null;
}

/**
 * Pure resolver to determine seat availability for Protagonist, Antagonist, and Director
 * based on the provided Scenario Blueprint.
 */
export function resolveSeatAvailabilities(
  blueprint: Blueprint
): Record<ParticipationMode, SeatAvailability> {
  const cast = blueprint.cast || [];

  // Protagonist: Requires a viable mortal cast member (isEntity !== true)
  const mortalMember = cast.find((c) => isCharacterEligibleForRole(c, 'protagonist'));
  const protagonistAvailable = Boolean(mortalMember);

  // Antagonist: Requires an entity cast member, explicit antagonist perspective, or antagonist haunted house provenance
  const entityMember = cast.find((c) => isCharacterEligibleForRole(c, 'antagonist'));
  const hasAntagonistPerspective = blueprint.perspectives?.some(
    (p) => String(p.role).toUpperCase() === 'ANTAGONIST'
  );
  const hasAntagonistProvenance =
    blueprint.hauntedHouse?.recommendedParticipationMode === 'antagonist' ||
    blueprint.hauntedHouse?.participationContext?.mode === 'antagonist';

  const antagonistAvailable = Boolean(entityMember || hasAntagonistPerspective || hasAntagonistProvenance);

  // Director: Always available without requiring cast bindings
  return {
    protagonist: {
      role: 'protagonist',
      available: protagonistAvailable,
      reason: protagonistAvailable
        ? undefined
        : 'No mortal protagonist cast member found in blueprint.',
      boundCharacterId: mortalMember ? mortalMember.id : null,
      boundCharacterName: mortalMember ? mortalMember.name : null,
    },
    antagonist: {
      role: 'antagonist',
      available: antagonistAvailable,
      reason: antagonistAvailable
        ? undefined
        : 'No antagonist entity or opposition authority found in blueprint.',
      boundCharacterId: entityMember ? entityMember.id : null,
      boundCharacterName: entityMember
        ? entityMember.name
        : blueprint.hauntedHouse?.participationContext?.seat?.name || 'Opposition Force',
    },
    director: {
      role: 'director',
      available: true,
      reason: undefined,
      boundCharacterId: null,
      boundCharacterName: 'Director',
    },
  };
}

/**
 * Builds an active participation context for the selected role without mutating
 * or corrupting the scenario's stored provenance.
 */
export function buildActiveParticipationContext(
  blueprint: Blueprint,
  selectedRole: ParticipationMode,
  resolvedCharacterId?: string | null
): ParticipationContext | null {
  const cast = blueprint.cast || [];

  if (selectedRole === 'director') {
    const existing =
      blueprint.hauntedHouse?.participationContext?.mode === 'director'
        ? normalizeParticipationContext(blueprint.hauntedHouse.participationContext)
        : null;

    if (existing) {
      return {
        ...existing,
        mode: 'director',
        seat: {
          ...existing.seat,
          kind: 'director',
          name: 'Director',
        },
      };
    }

    return {
      mode: 'director',
      seat: {
        kind: 'director',
        name: 'Director',
        description: 'External Narrative Framing & Pacing Authority',
      },
      initialGoal:
        blueprint.globalPremise ||
        blueprint.setting?.location ||
        'Direct scene pacing, tension, and dramatic withholding.',
      boundedFacts: [
        `Location: ${blueprint.setting?.location || 'Unknown'}`,
        `Atmosphere: ${blueprint.setting?.atmosphere || 'Staged narrative enclosure'}`,
      ].slice(0, 8),
    };
  }

  // Find exact resolved cast member if resolvedCharacterId is supplied
  let boundMember =
    resolvedCharacterId !== undefined
      ? resolvedCharacterId !== null
        ? cast.find((c) => c.id === resolvedCharacterId)
        : null
      : undefined;

  if (selectedRole === 'protagonist') {
    if (boundMember === undefined) {
      boundMember = cast.find((c) => isCharacterEligibleForRole(c, 'protagonist'));
    }

    const name = boundMember?.name || 'Protagonist';
    const existing =
      blueprint.hauntedHouse?.participationContext?.mode === 'protagonist'
        ? normalizeParticipationContext(blueprint.hauntedHouse.participationContext)
        : null;

    if (existing) {
      return {
        ...existing,
        mode: 'protagonist',
        seat: {
          ...existing.seat,
          kind: 'protagonist',
          name: boundMember ? boundMember.name : existing.seat.name,
          description: boundMember ? boundMember.description : existing.seat.description,
        },
      };
    }

    return {
      mode: 'protagonist',
      seat: {
        kind: 'protagonist',
        name,
        description: boundMember?.description,
      },
      initialGoal:
        blueprint.narrativeRules?.incitingIncident ||
        blueprint.globalPremise ||
        `Investigate and survive ${blueprint.setting?.location || 'the enclosure'}.`,
      boundedFacts: [
        `Location: ${blueprint.setting?.location || 'Unknown'}`,
        `Identity: ${name}`,
      ].slice(0, 8),
    };
  }

  if (selectedRole === 'antagonist') {
    if (boundMember === undefined) {
      boundMember = cast.find((c) => isCharacterEligibleForRole(c, 'antagonist'));
    }

    const existing =
      blueprint.hauntedHouse?.participationContext?.mode === 'antagonist'
        ? normalizeParticipationContext(blueprint.hauntedHouse.participationContext)
        : null;

    if (existing) {
      if (boundMember) {
        return {
          ...existing,
          mode: 'antagonist',
          seat: {
            ...existing.seat,
            kind: 'character',
            name: boundMember.name,
            description: boundMember.description,
          },
        };
      }
      return {
        ...existing,
        mode: 'antagonist',
        seat: {
          ...existing.seat,
          kind: existing.seat.kind || 'force',
        },
      };
    }

    const name = boundMember?.name || 'Opposition Force';
    return normalizeParticipationContext({
      mode: 'antagonist',
      seat: {
        kind: boundMember ? 'character' : 'force',
        name,
        description: boundMember?.description,
        ability: 'Authored scenario entity presence.',
        limitation: 'Bounded strictly to scenario rules.',
      },
      initialGoal:
        blueprint.narrativeRules?.incitingIncident ||
        blueprint.globalPremise ||
        'Enforce environmental pressure and containment.',
      boundedFacts: [
        `Location: ${blueprint.setting?.location || 'Unknown'}`,
        `Entity: ${name}`,
      ].slice(0, 8),
    });
  }

  return null;
}
