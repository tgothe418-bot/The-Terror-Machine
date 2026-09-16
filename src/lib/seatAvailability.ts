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
  const mortalMember = cast.find((c) => !c.isEntity);
  const protagonistAvailable = Boolean(mortalMember);

  // Antagonist: Requires an entity cast member, explicit antagonist perspective, or antagonist haunted house provenance
  const entityMember = cast.find(
    (c) => c.isEntity === true || String(c.role).toUpperCase() === 'ANTAGONIST'
  );
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
      boundMember = cast.find((c) => !c.isEntity);
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
      boundMember = cast.find(
        (c) => c.isEntity === true || String(c.role).toUpperCase() === 'ANTAGONIST'
      );
    }

    const ap = blueprint.antagonistProfile;
    const name = ap?.name || boundMember?.name || 'Opposition Force';
    const isForce = ap ? ap.kind === 'FORCE' : !boundMember;

    const authorityText =
      ap && ap.apparatusControls.length > 0
        ? `Authorized to actuate facility apparatus across nodes: ${ap.apparatusControls
            .map(
              (c) =>
                `${c.name} [${c.kind}] affecting (${c.affectedNodeIds.join(', ') || 'all'}) with actions: ${c.availableActions.join(', ')}`
            )
            .join('; ')}`
        : 'Authored scenario apparatus and environmental reach.';

    const limitsText =
      ap && ap.sadisticDirectives.length > 0
        ? `Operational boundaries & directives: ${ap.sadisticDirectives.join('; ')}`
        : 'Bounded strictly to scenario rules and apparatus reach.';

    let victimField: any = undefined;
    if (ap && ap.preyCohort.length > 0) {
      if (ap.preyCohort.length === 1) {
        const p = ap.preyCohort[0];
        victimField = {
          kind: 'individual',
          name: p.name,
          description: `Vulnerabilities: ${p.vulnerabilities.join(', ')}`,
          goal: 'Survive and escape enclosure.',
          knownFact: `Breaking point: ${p.breakingPoint}`,
        };
      } else {
        victimField = {
          kind: 'group',
          collectiveDesignation: 'Trapped Subjects / Prey Cohort',
          description: 'Autonomous mortal survivors trapped within enclosure.',
          members: ap.preyCohort.map((p) => ({
            id: p.id,
            name: p.name,
            description: `Vulnerabilities: ${p.vulnerabilities.join(', ')}`,
            goal: 'Survive and escape enclosure.',
            knownFact: `Breaking point: ${p.breakingPoint}`,
          })),
        };
      }
    }

    const boundedFacts: string[] = [
      `Location: ${blueprint.setting?.location || 'Unknown'}`,
      `Antagonist: ${name} (${isForce ? 'Environmental Force' : 'Autonomous Apparatus'})`,
      `Apparatus Count: ${ap?.apparatusControls?.length ?? 0} active subsystems`,
      `Prey Cohort: ${ap?.preyCohort?.length ?? 0} tracked subjects`,
    ];
    if (ap?.sadisticDirectives) {
      ap.sadisticDirectives.forEach((d) => {
        if (boundedFacts.length < 8) boundedFacts.push(`Directive: ${d}`);
      });
    }

    return normalizeParticipationContext({
      mode: 'antagonist',
      seat: {
        kind: isForce ? 'force' : 'character',
        name,
        description:
          boundMember?.description ||
          (ap ? `Autonomous ${ap.kind.toLowerCase()} controlling enclosure subsystems.` : undefined),
        ability: authorityText,
        limitation: limitsText,
      },
      initialGoal:
        blueprint.narrativeRules?.incitingIncident ||
        blueprint.globalPremise ||
        'Enforce environmental pressure and containment.',
      boundedFacts: boundedFacts.slice(0, 8),
      authorityContract: {
        authority: authorityText,
        limits: limitsText,
      },
      victimField,
    });
  }

  return null;
}
