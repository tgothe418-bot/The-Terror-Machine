import {
  Blueprint,
  CastMember,
} from '../types';
import {
  FictionalTimeLedger,
  PursuitScheduleLedger,
  CastActivityEligibilityReceipt,
  ActivityOpportunityCandidate,
  CharacterPursuit,
  ValueAnchor,
} from '../types/horrorGrammar';

export const MAX_OFFSCREEN_PURSUITS_PER_TURN = 2;

export interface SelectCastActivityEligibilityParams {
  blueprint?: Blueprint | null;
  currentTopologyNode: string;
  fictionalTime: FictionalTimeLedger;
  pursuitSchedule?: PursuitScheduleLedger | null;
  characterPursuitLedger?: import('../types/horrorGrammar').CharacterPursuitLedger | null;
  userCharacterId?: string | null;
  turnNumber: number;
  acceptedTriggerReferences?: string[];
  castPresenceMap?: Record<string, string>;
}

/**
 * Finds value anchor IDs relevant to a specific cast member or scenario context.
 */
export function findRelevantValueAnchorIds(
  castMemberId: string,
  blueprint?: Blueprint | null
): string[] {
  if (!blueprint?.horrorGrammar?.valueAnchors) return [];
  const relevantIds: string[] = [];

  for (const anchor of blueprint.horrorGrammar.valueAnchors) {
    if (anchor.holder.kind === 'CHARACTER' && anchor.holder.castMemberId === castMemberId) {
      relevantIds.push(anchor.id);
    } else if (
      anchor.holder.kind === 'RELATIONSHIP' &&
      anchor.holder.castMemberIds.includes(castMemberId)
    ) {
      relevantIds.push(anchor.id);
    } else if (anchor.holder.kind === 'SCENARIO') {
      relevantIds.push(anchor.id);
    }
  }

  return relevantIds;
}

/**
 * Derives the list of relevant value anchors for a selected set of opportunities.
 */
export function getRelevantValueAnchorsForOpportunities(
  opportunities: ActivityOpportunityCandidate[],
  blueprint?: Blueprint | null
): ValueAnchor[] {
  if (!blueprint?.horrorGrammar?.valueAnchors) return [];
  const anchorIds = new Set<string>();

  for (const opp of opportunities) {
    for (const valId of opp.referencedValueIds) {
      anchorIds.add(valId);
    }
  }

  return blueprint.horrorGrammar.valueAnchors.filter((a) => anchorIds.has(a.id));
}

/**
 * Resolves the User character ID from explicit parameter or Blueprint definition.
 */
function resolveUserCharacterId(
  userCharacterId?: string | null,
  blueprint?: Blueprint | null
): string | null {
  if (userCharacterId && userCharacterId.trim()) {
    return userCharacterId.trim();
  }
  if (blueprint?.userCharacterId && blueprint.userCharacterId.trim()) {
    return blueprint.userCharacterId.trim();
  }
  const userCast = blueprint?.cast?.find((c) => c.isUserCharacter);
  if (userCast?.id) {
    return userCast.id;
  }
  return null;
}

interface DueOffscreenCandidate {
  pursuit: CharacterPursuit;
  castMember: CastMember;
  lastConsideredTurn: number | null;
  referencedValueIds: string[];
}

/**
 * Pure, deterministic selector for cast activity opportunities.
 */
export function selectCastActivityEligibility({
  blueprint,
  currentTopologyNode,
  fictionalTime,
  pursuitSchedule = {},
  characterPursuitLedger,
  userCharacterId,
  turnNumber,
  acceptedTriggerReferences = [],
  castPresenceMap = {},
}: SelectCastActivityEligibilityParams): CastActivityEligibilityReceipt {
  const resolvedUserId = resolveUserCharacterId(userCharacterId, blueprint);
  const castList = blueprint?.cast || [];
  const pursuitsList = blueprint?.horrorGrammar?.characterPursuits || [];

  const presentOpportunities: ActivityOpportunityCandidate[] = [];
  const presentCharacterIds = new Set<string>();

  // 1. Identify present non-User characters
  for (const member of castList) {
    // Never include User character
    if (member.isUserCharacter || member.id === resolvedUserId) {
      continue;
    }

    const memberLocation =
      castPresenceMap[member.id] || member.starting_location || currentTopologyNode;

    if (memberLocation === currentTopologyNode) {
      presentCharacterIds.add(member.id);

      // Find primary pursuit if any
      const matchingPursuit = pursuitsList.find((p) => {
        if (p.castMemberId !== member.id) return false;
        const currentStatus =
          characterPursuitLedger?.[p.id]?.status ?? p.status;
        return currentStatus === 'ACTIVE';
      });
      const relevantValueIds = findRelevantValueAnchorIds(member.id, blueprint);

      const effectiveObjective =
        characterPursuitLedger?.[matchingPursuit?.id || '']?.currentObjective ??
        matchingPursuit?.objective ??
        null;
      const effectiveApproach =
        characterPursuitLedger?.[matchingPursuit?.id || '']?.currentApproach ??
        matchingPursuit?.presentApproach ??
        null;

      presentOpportunities.push({
        castMemberId: member.id,
        opportunityKind: 'PRESENT',
        locationNodeId: currentTopologyNode,
        pursuitId: matchingPursuit?.id || null,
        objective: effectiveObjective,
        presentApproach: effectiveApproach,
        reviewWindow: matchingPursuit?.reviewWindow || null,
        referencedValueIds: relevantValueIds,
      });
    }
  }

  // 2. Evaluate offscreen non-User character pursuits
  let dormantCount = 0;
  let notDueCount = 0;
  const dueCandidates: DueOffscreenCandidate[] = [];
  const charactersWithDuePursuits = new Set<string>();

  for (const pursuit of pursuitsList) {
    // If pursuit belongs to a user character or present character, skip offscreen evaluation
    if (pursuit.castMemberId === resolvedUserId || presentCharacterIds.has(pursuit.castMemberId)) {
      continue;
    }

    const castMember = castList.find((c) => c.id === pursuit.castMemberId);
    if (!castMember || castMember.isUserCharacter) {
      continue;
    }

    const effectiveStatus =
      characterPursuitLedger?.[pursuit.id]?.status ?? pursuit.status;

    if (
      effectiveStatus === 'DORMANT' ||
      effectiveStatus === 'COMPLETED' ||
      effectiveStatus === 'ABANDONED' ||
      effectiveStatus === 'BLOCKED'
    ) {
      dormantCount++;
      continue;
    }

    // Determine if due based on reviewed window
    const schedRecord = pursuitSchedule ? pursuitSchedule[pursuit.id] : undefined;
    let isDue = false;

    switch (pursuit.reviewWindow) {
      case 'MOMENT':
        isDue = fictionalTime.moment_revision > (schedRecord?.lastConsideredMomentRevision ?? 0);
        break;
      case 'SCENE_BEAT':
        isDue = fictionalTime.scene_beat_revision > (schedRecord?.lastConsideredSceneBeatRevision ?? 0);
        break;
      case 'EXTENDED':
        isDue = fictionalTime.extended_revision > (schedRecord?.lastConsideredExtendedRevision ?? 0);
        break;
      case 'EVENT_DRIVEN':
        isDue =
          Array.isArray(pursuit.triggerReferences) &&
          pursuit.triggerReferences.length > 0 &&
          pursuit.triggerReferences.some((trig) => acceptedTriggerReferences.includes(trig));
        break;
    }

    if (!isDue) {
      notDueCount++;
      continue;
    }

    // Fairness: select at most one pursuit per offscreen character per turn
    if (!charactersWithDuePursuits.has(pursuit.castMemberId)) {
      charactersWithDuePursuits.add(pursuit.castMemberId);
      const relevantValueIds = findRelevantValueAnchorIds(pursuit.castMemberId, blueprint);
      dueCandidates.push({
        pursuit,
        castMember,
        lastConsideredTurn: schedRecord?.lastConsideredTurn ?? null,
        referencedValueIds: relevantValueIds,
      });
    }
  }

  // 3. Sort due offscreen candidates:
  // Oldest lastConsideredTurn first (nulls / never-considered first = -1), then stable pursuit ID
  dueCandidates.sort((a, b) => {
    const turnA = a.lastConsideredTurn !== null ? a.lastConsideredTurn : -1;
    const turnB = b.lastConsideredTurn !== null ? b.lastConsideredTurn : -1;
    if (turnA !== turnB) {
      return turnA - turnB;
    }
    return a.pursuit.id.localeCompare(b.pursuit.id);
  });

  // 4. Bounded selection
  const selectedDue = dueCandidates.slice(0, MAX_OFFSCREEN_PURSUITS_PER_TURN);
  const boundedOut = dueCandidates.slice(MAX_OFFSCREEN_PURSUITS_PER_TURN);

  const offscreenOpportunities: ActivityOpportunityCandidate[] = selectedDue.map((item) => ({
    castMemberId: item.pursuit.castMemberId,
    opportunityKind: 'OFFSCREEN_PURSUIT',
    locationNodeId: item.pursuit.locationNodeId || null,
    pursuitId: item.pursuit.id,
    objective: item.pursuit.objective,
    presentApproach: item.pursuit.presentApproach,
    reviewWindow: item.pursuit.reviewWindow,
    referencedValueIds: item.referencedValueIds,
  }));

  const boundedOutPursuitIds = boundedOut.map((item) => item.pursuit.id);

  return {
    version: 1,
    presentOpportunities,
    offscreenOpportunities,
    boundedOutPursuitIds,
    dormantCount,
    notDueCount,
    ledgerSnapshot: fictionalTime,
    scheduleSnapshotRevision: turnNumber,
  };
}

export interface AdvancePursuitScheduleLedgerParams {
  preSchedule?: PursuitScheduleLedger | null;
  eligibilityReceipt: CastActivityEligibilityReceipt;
  fictionalTime: FictionalTimeLedger;
  turnNumber: number;
  blueprint?: Blueprint | null;
}

/**
 * Purely advances the pursuit schedule ledger based on the turn's eligibility receipt.
 */
export function advancePursuitScheduleLedger({
  preSchedule,
  eligibilityReceipt,
  fictionalTime,
  turnNumber,
  blueprint,
}: AdvancePursuitScheduleLedgerParams): PursuitScheduleLedger {
  const nextSchedule: PursuitScheduleLedger = { ...(preSchedule || {}) };
  const validPursuitIds = new Set(
    (blueprint?.horrorGrammar?.characterPursuits || []).map((p) => p.id)
  );

  // Purge unknown or removed pursuits
  for (const pId of Object.keys(nextSchedule)) {
    if (!validPursuitIds.has(pId)) {
      delete nextSchedule[pId];
    }
  }

  const selectedPresentPursuitIds = new Set(
    eligibilityReceipt.presentOpportunities.map((o) => o.pursuitId).filter(Boolean) as string[]
  );
  const selectedOffscreenPursuitIds = new Set(
    eligibilityReceipt.offscreenOpportunities.map((o) => o.pursuitId).filter(Boolean) as string[]
  );
  const boundedOutIds = new Set(eligibilityReceipt.boundedOutPursuitIds);

  for (const pursuit of blueprint?.horrorGrammar?.characterPursuits || []) {
    const pId = pursuit.id;
    const existing = nextSchedule[pId] || {
      pursuitId: pId,
      castMemberId: pursuit.castMemberId,
      lastConsideredMomentRevision: 0,
      lastConsideredSceneBeatRevision: 0,
      lastConsideredExtendedRevision: 0,
      lastConsideredTurn: null,
      latestDisposition: 'OFFSCREEN_NOT_DUE',
    };

    if (selectedPresentPursuitIds.has(pId)) {
      nextSchedule[pId] = {
        ...existing,
        lastConsideredMomentRevision: fictionalTime.moment_revision,
        lastConsideredSceneBeatRevision: fictionalTime.scene_beat_revision,
        lastConsideredExtendedRevision: fictionalTime.extended_revision,
        lastConsideredTurn: turnNumber,
        latestDisposition: 'PRESENT_OPPORTUNITY',
      };
    } else if (selectedOffscreenPursuitIds.has(pId)) {
      nextSchedule[pId] = {
        ...existing,
        lastConsideredMomentRevision: fictionalTime.moment_revision,
        lastConsideredSceneBeatRevision: fictionalTime.scene_beat_revision,
        lastConsideredExtendedRevision: fictionalTime.extended_revision,
        lastConsideredTurn: turnNumber,
        latestDisposition: 'OFFSCREEN_SELECTED',
      };
    } else if (boundedOutIds.has(pId)) {
      nextSchedule[pId] = {
        ...existing,
        latestDisposition: 'OFFSCREEN_DUE_BOUNDED_OUT',
      };
    } else if (pursuit.status === 'DORMANT') {
      nextSchedule[pId] = {
        ...existing,
        latestDisposition: 'DORMANT',
      };
    } else {
      nextSchedule[pId] = {
        ...existing,
        latestDisposition: 'OFFSCREEN_NOT_DUE',
      };
    }
  }

  return nextSchedule;
}
