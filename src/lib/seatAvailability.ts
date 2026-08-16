import { Blueprint, ParticipationContext, ParticipationMode, normalizeParticipationContext } from '../types';

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
  const mortalMember = cast.find((c) => c.isEntity !== true);
  const protagonistAvailable = Boolean(mortalMember);

  // Antagonist: Requires an entity cast member, explicit antagonist perspective, or antagonist haunted house provenance
  const entityMember = cast.find((c) => c.isEntity === true || String(c.role).toLowerCase() === 'antagonist');
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
  selectedRole: ParticipationMode
): ParticipationContext | null {
  // If the user selected the exact recommended seat and provenance exists, reuse that context
  if (
    blueprint.hauntedHouse?.recommendedParticipationMode === selectedRole &&
    blueprint.hauntedHouse.participationContext
  ) {
    return normalizeParticipationContext(blueprint.hauntedHouse.participationContext);
  }

  if (selectedRole === 'director') {
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

  if (selectedRole === 'protagonist') {
    const mortal = (blueprint.cast || []).find((c) => c.isEntity !== true);
    const name = mortal?.name || 'Protagonist';
    return {
      mode: 'protagonist',
      seat: {
        kind: 'protagonist',
        name,
        description: mortal?.description,
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
    if (blueprint.hauntedHouse?.participationContext?.mode === 'antagonist') {
      return normalizeParticipationContext(blueprint.hauntedHouse.participationContext);
    }
    const entity = (blueprint.cast || []).find(
      (c) => c.isEntity === true || String(c.role).toLowerCase() === 'antagonist'
    );
    const name = entity?.name || 'Opposition Force';
    return normalizeParticipationContext({
      mode: 'antagonist',
      seat: {
        kind: entity ? 'character' : 'force',
        name,
        description: entity?.description,
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
