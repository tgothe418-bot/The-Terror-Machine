import {
  Blueprint,
  EngineTurnContext,
} from '../types';
import {
  CastActivityProposal,
  CastActivityReceipt,
  CastActivityEvent,
  CastActivityEligibilityReceipt,
  MAX_RECENT_ACTIVITY_EVENTS,
} from '../types/horrorGrammar';
import { getEligibleEvidenceRegistryMap } from './evidenceRegistry';

export interface ResolveCastActivityInput {
  proposal?: CastActivityProposal | null;
  eligibilityReceipt?: CastActivityEligibilityReceipt | null;
  currentContext: EngineTurnContext;
  preEvents?: CastActivityEvent[] | null;
  currentTurn: number;
  blueprint?: Blueprint | null;
}

/**
 * Pure, deterministic ratifier for Non-User Cast Activity proposals.
 */
export function resolveCastActivity({
  proposal,
  eligibilityReceipt,
  currentContext,
  preEvents = [],
  currentTurn,
}: ResolveCastActivityInput): CastActivityReceipt {
  const normalizedPreState = Array.isArray(preEvents) ? [...preEvents] : [];

  // 1. Handle missing or NONE proposal
  if (!proposal || proposal.kind === 'NONE') {
    const reason =
      proposal && proposal.kind === 'NONE'
        ? proposal.reason || 'NO_OPPORTUNITY_CHOSEN'
        : 'NO_OPPORTUNITY_CHOSEN';
    return {
      version: 1,
      outcome: 'NO_PROPOSAL',
      reasonCode: reason,
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot: proposal ? { kind: 'NONE', reason } : undefined,
    };
  }

  const {
    proposalId,
    castMemberId,
    pursuitId,
    locationNodeId,
    activitySummary,
    authorityReferences = [],
    perceptionPath,
    manifestationBlock,
  } = proposal;

  const proposalSnapshot = {
    kind: 'ACTIVITY',
    proposalId,
    castMemberId,
    pursuitId,
    locationNodeId,
    activitySummary,
    authorityReferences,
    perceptionPath,
    hasManifestationBlock: !!manifestationBlock,
  };

  // 2. Reject if actor is User Character
  const playerCharId = currentContext.player.characterId;
  if (castMemberId === playerCharId) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'USER_CHARACTER_CANNOT_BE_ACTIVITY_ACTOR',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  const castMember = (currentContext.cast || []).find((c) => c.id === castMemberId);
  if (!castMember || castMember.isUserCharacter) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'ACTOR_NOT_IN_AUTHORIZED_CAST',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  // 3. Match against exact pre-turn eligibility receipt
  const presentOpps = eligibilityReceipt?.presentOpportunities || [];
  const offscreenOpps = eligibilityReceipt?.offscreenOpportunities || [];

  const rawPresentMatch = presentOpps.find((o) => o.castMemberId === castMemberId);
  const offscreenMatch = offscreenOpps.find((o) => o.castMemberId === castMemberId);

  if (!rawPresentMatch && !offscreenMatch) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'ACTOR_NOT_IN_ELIGIBILITY_SET',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  const isCanonicallyPresent = Boolean(castMember.isPresent);
  const presentMatch = isCanonicallyPresent ? rawPresentMatch : undefined;

  // A forged or contradictory PRESENT opportunity cannot override canonical absence during ratification
  if (rawPresentMatch && !isCanonicallyPresent && !offscreenMatch) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'DIRECT_PERCEPTION_REQUIRES_CO_PRESENCE',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  // 4. Validate offscreen pursuit reference
  if (offscreenMatch) {
    if (!pursuitId || pursuitId !== offscreenMatch.pursuitId) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'MISMATCHED_PURSUIT_ID',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
  }

  // 5. Validate location consistency
  const playerNodeId = currentContext.topology.currentNodeId;
  if (presentMatch) {
    if (locationNodeId && locationNodeId !== playerNodeId) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'PRESENT_ACTOR_LOCATION_MISMATCH',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
  }

  // 7. Validate perception path rules
  if (perceptionPath === 'DIRECT') {
    // DIRECT requires actor to be canonically present at player's node
    if (!isCanonicallyPresent || !presentMatch || (locationNodeId && locationNodeId !== playerNodeId)) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'DIRECT_PERCEPTION_REQUIRES_CO_PRESENCE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
  } else if (perceptionPath === 'MEDIATED') {
    // MEDIATED requires mediated communication mode support in expression profile
    const commModes = castMember.expressionProfile?.communicationModes || ['spoken'];
    if (!commModes.includes('mediated')) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'MEDIATED_PERCEPTION_UNSUPPORTED_BY_ACTOR_PROFILE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
  } else if (perceptionPath === 'LOCAL_TRACE') {
    // LOCAL_TRACE must concern the player's current node and cannot use dialogue
    if (locationNodeId && locationNodeId !== playerNodeId) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'LOCAL_TRACE_MUST_BE_AT_PLAYER_NODE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
    if (manifestationBlock && manifestationBlock.type === 'dialogue') {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'LOCAL_TRACE_CANNOT_USE_DIALOGUE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }
  }

  // 8. Validate manifestation block
  if (manifestationBlock) {
    if (perceptionPath === 'UNOBSERVED') {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'UNOBSERVED_ACTIVITY_CANNOT_HAVE_MANIFESTATION',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }

    if (manifestationBlock.type === 'dialogue') {
      const speakerName = manifestationBlock.speaker?.trim();
      const speakerCast = (currentContext.cast || []).find((c) => c.name === speakerName);
      if (
        !speakerCast ||
        speakerCast.isUserCharacter ||
        speakerCast.id === playerCharId ||
        speakerCast.id !== castMemberId
      ) {
        return {
          version: 1,
          outcome: 'REJECTED',
          reasonCode: 'INVALID_MANIFESTATION_DIALOGUE_SPEAKER',
          preState: normalizedPreState,
          postState: normalizedPreState,
          admittedManifestation: false,
          acceptedEventId: null,
          proposalSnapshot,
        };
      }
    }
  }

  // 8. Validate authority references against exact canonical evidence
  const registryMap = getEligibleEvidenceRegistryMap(
    currentContext,
    eligibilityReceipt,
    preEvents
  );

  if (authorityReferences.length === 0) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'UNAUTHORIZED_ACTIVITY_CLAIM',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  let hasAuthorizingRef = false;
  for (const ref of authorityReferences) {
    const matchInRegistry = registryMap.get(ref);

    if (!matchInRegistry) {
      return {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'INVALID_AUTHORITY_REFERENCE',
        preState: normalizedPreState,
        postState: normalizedPreState,
        admittedManifestation: false,
        acceptedEventId: null,
        proposalSnapshot,
      };
    }

    // Strict ownership & scope validation
    if (
      matchInRegistry.category === 'OPPORTUNITY' ||
      matchInRegistry.category === 'EXPRESSION_CAPABILITY' ||
      matchInRegistry.category === 'TOPOLOGY_PRESENCE' ||
      matchInRegistry.category === 'ACTIVITY_EVENT'
    ) {
      if (matchInRegistry.ownerRef !== castMemberId) {
        return {
          version: 1,
          outcome: 'REJECTED',
          reasonCode: 'UNAUTHORIZED_ACTIVITY_CLAIM',
          preState: normalizedPreState,
          postState: normalizedPreState,
          admittedManifestation: false,
          acceptedEventId: null,
          proposalSnapshot,
        };
      }
    }

    if (matchInRegistry.category === 'VALUE_ANCHOR') {
      const referencedValueIds =
        presentMatch?.referencedValueIds || offscreenMatch?.referencedValueIds || [];
      const isReferencedInOpp = referencedValueIds.includes(ref);
      const isCastMemberHolder =
        currentContext.horrorGrammar?.authoringBaseline?.valueAnchors?.some(
          (a) =>
            a.id === ref &&
            a.holder.kind === 'CHARACTER' &&
            a.holder.castMemberId === castMemberId
        );
      if (!isReferencedInOpp && !isCastMemberHolder) {
        return {
          version: 1,
          outcome: 'REJECTED',
          reasonCode: 'UNAUTHORIZED_ACTIVITY_CLAIM',
          preState: normalizedPreState,
          postState: normalizedPreState,
          admittedManifestation: false,
          acceptedEventId: null,
          proposalSnapshot,
        };
      }
    }

    if (
      matchInRegistry.category === 'SCENARIO_RULE' ||
      (matchInRegistry.category === 'OPPORTUNITY' && matchInRegistry.ownerRef === castMemberId) ||
      (matchInRegistry.category === 'EXPRESSION_CAPABILITY' && matchInRegistry.ownerRef === castMemberId) ||
      (matchInRegistry.category === 'TOPOLOGY_PRESENCE' && matchInRegistry.ownerRef === castMemberId) ||
      (offscreenMatch && ref === offscreenMatch.pursuitId)
    ) {
      hasAuthorizingRef = true;
    }
  }

  if (!hasAuthorizingRef) {
    return {
      version: 1,
      outcome: 'REJECTED',
      reasonCode: 'UNAUTHORIZED_ACTIVITY_CLAIM',
      preState: normalizedPreState,
      postState: normalizedPreState,
      admittedManifestation: false,
      acceptedEventId: null,
      proposalSnapshot,
    };
  }

  // 9. Accept proposal and record event
  const admittedManifestation = perceptionPath !== 'UNOBSERVED' && !!manifestationBlock;
  const eventId = proposalId || `act-evt-${currentTurn}-${castMemberId}`;

  const newEvent: CastActivityEvent = {
    id: eventId,
    castMemberId,
    pursuitId: pursuitId || null,
    activitySummary: activitySummary.trim(),
    locationNodeId: locationNodeId || (presentMatch ? playerNodeId : null),
    perceptionPath,
    committedTurn: currentTurn,
    authorityReferences,
    wasManifested: admittedManifestation,
  };

  const postState = [...normalizedPreState, newEvent].slice(-MAX_RECENT_ACTIVITY_EVENTS);

  return {
    version: 1,
    outcome: 'ACCEPTED',
    reasonCode: 'ACTIVITY_RATIFIED',
    preState: normalizedPreState,
    postState,
    admittedManifestation,
    acceptedEventId: eventId,
    proposalSnapshot,
  };
}
