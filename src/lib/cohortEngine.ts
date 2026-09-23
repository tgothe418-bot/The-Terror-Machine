import type {
  CohortState,
  CohortMember,
  CohortPhase,
  CohortCycleReceipt,
} from '../types/cohort';
import type { ScenarioBlueprint } from '../types';
import { isOppositionCastMember } from './castVillain';
import {
  isBehaviorExecutable,
  executeInvestigate,
  executeShare,
  type BehaviorExecutionContext,
  type NodeEvidenceItem,
} from './cohortBehaviors';

const VERB_UNIVERSE = ['INVESTIGATE', 'SHARE'];

/**
 * Phase progression thresholds (§12 - playtest placeholders).
 */
export const PHASE_THRESHOLDS = {
  DISCOVERY: 0.3,
  CONFIRMATION_MAX: 0.6,
  CONFIRMATION_SEAT: 0.5,
  CONFRONTATION_MAX: 0.85,
  CONFRONTATION_SEAT: 0.75,
} as const;

/**
 * Anti-stagnation fatigue multiplier (§4)
 */
export const FATIGUE_MULTIPLIER = 0.4;

/**
 * Default succession vulnerability window duration in fictional-time seconds (§2.2, §12)
 */
export const DEFAULT_SUCCESSION_WINDOW_SECONDS = 300; // 5 minutes

export const PHASE_RANKS: Record<CohortPhase, number> = {
  ONSET: 0,
  DISCOVERY: 1,
  CONFIRMATION: 2,
  CONFRONTATION: 3,
};

/**
 * Recency fatigue multiplier: Score = Base * 0.4 if repeated consecutively
 */
export function scoreCandidateBehavior(verb: string, member: CohortMember): number {
  const baseAffinity = member.affinities[verb] ?? (verb === 'INVESTIGATE' ? 1.0 : 0.8);
  const fatigueMultiplier = member.lastAction === verb ? FATIGUE_MULTIPLIER : 1.0;
  return baseAffinity * fatigueMultiplier;
}

/**
 * Aggregate collective phase and peak phase from hypothesis weights (§7).
 * Maintains monotonic peakPhase; freezes when cohort status is DORMANT.
 */
export function evaluateCollectivePhase(
  cohort: CohortState,
  threatHypothesisId = 'hyp-threat-exists'
): { collectivePhase: CohortPhase; peakPhase: CohortPhase } {
  const members = Object.values(cohort.members);
  const currentPeak = cohort.peakPhase || cohort.ratifiedRatchetPhase || 'ONSET';

  if (members.length === 0) {
    // Frozen at highest ratified peak phase reached (§7)
    return { collectivePhase: currentPeak, peakPhase: currentPeak };
  }

  const maxWeight = Math.max(
    0,
    ...members.map((m) => m.cognition.hypotheses[threatHypothesisId]?.weight || 0)
  );
  const seatHolder = cohort.seatHolderId ? cohort.members[cohort.seatHolderId] : undefined;
  const seatWeight = seatHolder?.cognition.hypotheses[threatHypothesisId]?.weight || 0;

  let calculated: CohortPhase = 'ONSET';
  if (maxWeight >= PHASE_THRESHOLDS.DISCOVERY) {
    calculated = 'DISCOVERY';
  }
  // Phase Anchor (§2.2): CONFIRMATION and CONFRONTATION require seat-holder weight to cross threshold
  if (
    maxWeight >= PHASE_THRESHOLDS.CONFIRMATION_MAX &&
    seatWeight >= PHASE_THRESHOLDS.CONFIRMATION_SEAT
  ) {
    calculated = 'CONFIRMATION';
  }
  if (
    maxWeight >= PHASE_THRESHOLDS.CONFRONTATION_MAX &&
    seatWeight >= PHASE_THRESHOLDS.CONFRONTATION_SEAT
  ) {
    calculated = 'CONFRONTATION';
  }

  // Peak phase update (monotonic)
  const newPeak =
    PHASE_RANKS[calculated] > PHASE_RANKS[currentPeak] ? calculated : currentPeak;

  // Ratchet rule: once CONFRONTATION is reached, live phase cannot regress
  const livePhase = newPeak === 'CONFRONTATION' ? 'CONFRONTATION' : calculated;

  return { collectivePhase: livePhase, peakPhase: newPeak };
}

/**
 * Build initial CohortState from scenario blueprint (§2, §13).
 */
export function initializeCohortState(blueprint: ScenarioBlueprint): CohortState {
  const cast = Array.isArray(blueprint.cast) ? blueprint.cast : [];
  const members: Record<string, CohortMember> = {};

  // Find opposition candidates or eligible non-villain mortals
  const oppositionCast = cast.filter(isOppositionCastMember);
  const eligibleCast = oppositionCast.length > 0 ? oppositionCast : cast.filter((c) => !c.isEntity);

  let seatHolderId: string | undefined = undefined;

  for (let i = 0; i < eligibleCast.length; i++) {
    const c = eligibleCast[i];
    const isLead = i === 0;
    if (isLead) seatHolderId = c.id;

    members[c.id] = {
      characterId: c.id,
      isSeatHolder: isLead,
      tenureTurns: 0,
      affinities: {
        INVESTIGATE: 1.0,
        SHARE: 0.8,
      },
      cognition: {
        characterId: c.id,
        skepticism:
          typeof (c as unknown as { skepticism?: unknown }).skepticism === 'number'
            ? ((c as unknown as { skepticism: number }).skepticism)
            : 0.8,
        cognitiveDissonance: 0,
        ingestedEvidenceIds: [],
        hypotheses: {
          'hyp-threat-exists': {
            id: 'hyp-threat-exists',
            weight: 0.1,
            provenance: { lastUpdatedTurn: 0 },
          },
        },
      },
    };
  }

  const initialStatus = Object.keys(members).length > 0 ? 'ACTIVE' : 'DORMANT';

  return {
    status: initialStatus,
    collectivePhase: 'ONSET',
    peakPhase: 'ONSET',
    ratifiedRatchetPhase: 'ONSET',
    seatHolderId,
    successionVulnerabilityWindowRemaining: 0,
    members,
    dormantCastCognition: {},
    institutionalMemory: {
      'hyp-threat-exists': {
        id: 'hyp-threat-exists',
        weight: 0.1,
        provenance: { lastUpdatedTurn: 0 },
      },
    },
    recentReceipts: [],
  };
}

/**
 * Handle seat-holder loss (death/flee/fracture): open vulnerability window and apply disruption shock (§2.2).
 */
export function handleSeatHolderLoss(
  state: CohortState,
  vulnerabilityWindowSeconds = DEFAULT_SUCCESSION_WINDOW_SECONDS
): CohortState {
  const updatedMembers: Record<string, CohortMember> = {};

  for (const [id, member] of Object.entries(state.members)) {
    // Disruption shock: increase skepticism (+0.1, max 1.0) and bump cognitive dissonance (+0.2)
    const newSkepticism = Math.min(1.0, member.cognition.skepticism + 0.1);
    const newDissonance = member.cognition.cognitiveDissonance + 0.2;

    updatedMembers[id] = {
      ...member,
      isSeatHolder: false,
      cognition: {
        ...member.cognition,
        skepticism: newSkepticism,
        cognitiveDissonance: newDissonance,
      },
    };
  }

  return {
    ...state,
    seatHolderId: undefined,
    successionVulnerabilityWindowRemaining: vulnerabilityWindowSeconds,
    members: updatedMembers,
  };
}

/**
 * Remove a member from the cohort (death, flee, fracture, drift).
 * If the removed member was the seat-holder, opens succession vulnerability window.
 */
export function removeCohortMember(
  state: CohortState,
  characterId: string,
  _reason: 'DEATH' | 'FLEE' | 'FRACTURE' | 'DRIFT',
  vulnerabilityWindowSeconds = DEFAULT_SUCCESSION_WINDOW_SECONDS
): CohortState {
  const memberToRemove = state.members[characterId];
  if (!memberToRemove) return state;

  const remainingMembers = { ...state.members };
  delete remainingMembers[characterId];

  // Capture leaving cognition for institutional memory / future re-formation
  const updatedDormantCognition = {
    ...state.dormantCastCognition,
    [characterId]: memberToRemove.cognition,
  };

  const wasSeatHolder = state.seatHolderId === characterId || memberToRemove.isSeatHolder;

  let nextState: CohortState = {
    ...state,
    members: remainingMembers,
    dormantCastCognition: updatedDormantCognition,
  };

  if (wasSeatHolder) {
    nextState = handleSeatHolderLoss(nextState, vulnerabilityWindowSeconds);
  }

  if (Object.keys(remainingMembers).length === 0) {
    // Entering DORMANT status: preserve top hypothesis weights into institutional memory
    const institutionalMemory: Record<string, CohortState['institutionalMemory'][string]> = {
      ...state.institutionalMemory,
    };
    for (const [hypId, hyp] of Object.entries(memberToRemove.cognition.hypotheses)) {
      if (!institutionalMemory[hypId] || hyp.weight > institutionalMemory[hypId].weight) {
        institutionalMemory[hypId] = hyp;
      }
    }

    nextState = {
      ...nextState,
      status: 'DORMANT',
      institutionalMemory,
    };
  }

  return nextState;
}

/**
 * Advance cohort simulation tick against ratified fictional time delta (§6).
 * Bounded tick rate contract: Exactly one completion + at most one initiation per member per player turn.
 */
export function tickCohortState(
  state: CohortState,
  deltaFictionalTimeSeconds: number,
  baseContext: Omit<
    BehaviorExecutionContext,
    'currentNodeId' | 'allMembers' | 'activeEvidenceAtNode' | 'memberLocations'
  >,
  memberLocations: Record<string, string>,
  evidenceByNode: Record<string, NodeEvidenceItem[]>
): { nextState: CohortState; receipts: CohortCycleReceipt[] } {
  if (state.status === 'DORMANT' || deltaFictionalTimeSeconds <= 0) {
    return { nextState: state, receipts: [] };
  }

  let updatedMembers = { ...state.members };
  const receipts: CohortCycleReceipt[] = [];

  // 1. Process succession vulnerability window decay (§2.2)
  let windowRemaining = state.successionVulnerabilityWindowRemaining;
  let currentSeatHolder = state.seatHolderId;

  if (windowRemaining > 0) {
    windowRemaining = Math.max(0, windowRemaining - deltaFictionalTimeSeconds);
    if (windowRemaining === 0 && (!currentSeatHolder || !updatedMembers[currentSeatHolder])) {
      // Vulnerability window expired: Succession fires
      const candidates = Object.values(updatedMembers);
      if (candidates.length > 0) {
        // Elect remaining member with highest threat weight, ties broken by tenure
        candidates.sort((a, b) => {
          const wA = a.cognition.hypotheses['hyp-threat-exists']?.weight || 0;
          const wB = b.cognition.hypotheses['hyp-threat-exists']?.weight || 0;
          if (wB !== wA) return wB - wA;
          return b.tenureTurns - a.tenureTurns;
        });
        currentSeatHolder = candidates[0].characterId;
        updatedMembers[currentSeatHolder] = {
          ...updatedMembers[currentSeatHolder],
          isSeatHolder: true,
        };
      }
    }
  }

  // 2. Member behavior tick loop (Bounded: 1 completion + 1 initiation per member)
  for (const [id, member] of Object.entries(updatedMembers)) {
    const currentNodeId = memberLocations[id] || 'node-default';
    const activeEvidenceAtNode = evidenceByNode[currentNodeId] || [];

    const memberContext: BehaviorExecutionContext = {
      ...baseContext,
      currentNodeId,
      memberLocations,
      allMembers: updatedMembers,
      activeEvidenceAtNode,
    };

    let activeDuration = member.behaviorDuration;
    let completedThisTurn = false;
    let progressBeforeCompletion = 0;

    // A. Advance existing in-progress behavior
    if (activeDuration && activeDuration.status === 'IN_PROGRESS') {
      progressBeforeCompletion = activeDuration.progressSeconds;
      const newProgress = activeDuration.progressSeconds + deltaFictionalTimeSeconds;
      if (newProgress >= activeDuration.durationSeconds) {
        activeDuration = {
          ...activeDuration,
          progressSeconds: activeDuration.durationSeconds,
          status: 'COMPLETED',
        };
        completedThisTurn = true;
      } else {
        activeDuration = { ...activeDuration, progressSeconds: newProgress };
        updatedMembers[id] = { ...member, behaviorDuration: activeDuration };
        continue; // Still in progress: exempt from re-selection
      }
    }

    // B. Initiate at most one new behavior if free or just completed
    const considerationSet = VERB_UNIVERSE;
    const executableSet = considerationSet.filter((verb) =>
      isBehaviorExecutable(verb, member, memberContext)
    );

    if (executableSet.length === 0) {
      updatedMembers[id] = { ...member, behaviorDuration: undefined };
      continue;
    }

    // Score executables with affinity profile and 0.4 fatigue penalty
    const scores: Record<string, number> = {};
    for (const verb of executableSet) {
      scores[verb] = scoreCandidateBehavior(verb, member);
    }

    // Deterministic selection: highest score, tie broken by verb order
    executableSet.sort((a, b) => (scores[b] || 0) - (scores[a] || 0));
    const winner = executableSet[0];

    // Execute winner
    let execResult;
    if (winner === 'INVESTIGATE') {
      execResult = executeInvestigate(member, memberContext);
    } else {
      const peer =
        Object.keys(updatedMembers).find((pId) => pId !== id) || id;
      execResult = executeShare(member, peer, 'hyp-threat-exists', memberContext);
    }

    // Accurate leftover delta math:
    // If completing an in-progress behavior, time spent was (duration - progressBeforeCompletion).
    // Leftover is delta minus that spent time. If starting fresh, full delta is available.
    const timeSpentToComplete = completedThisTurn
      ? Math.max(0, (activeDuration?.durationSeconds || 0) - progressBeforeCompletion)
      : 0;
    const leftoverDelta = completedThisTurn
      ? Math.max(0, deltaFictionalTimeSeconds - timeSpentToComplete)
      : deltaFictionalTimeSeconds;

    const initialProgress = Math.min(
      Math.max(0, execResult.fictionalTimeSeconds - 1),
      leftoverDelta
    );

    updatedMembers[id] = {
      ...execResult.member,
      behaviorDuration: {
        currentBehaviorId: winner,
        startedAtFictionalTime: baseContext.fictionalTime,
        durationSeconds: execResult.fictionalTimeSeconds,
        progressSeconds: initialProgress,
        status: 'IN_PROGRESS',
      },
    };

    if (execResult.otherMemberDeltas) {
      updatedMembers = { ...updatedMembers, ...execResult.otherMemberDeltas };
    }

    receipts.push({
      turnNumber: baseContext.turnNumber,
      characterId: id,
      selectedBehavior: winner,
      considerationSet,
      executableSet,
      scores,
      fatigueApplied: member.lastAction === winner,
      fictionalTimeCost: execResult.fictionalTimeSeconds,
      tracesEmitted: execResult.emittedTraces,
    });
  }

  // 3. Evaluate phase & dormant transitions
  const memberList = Object.values(updatedMembers);
  const nextStatus = memberList.length === 0 ? 'DORMANT' : 'ACTIVE';

  let nextCohort: CohortState = {
    ...state,
    status: nextStatus,
    members: updatedMembers,
    seatHolderId: currentSeatHolder,
    successionVulnerabilityWindowRemaining: windowRemaining,
    recentReceipts: [...state.recentReceipts, ...receipts].slice(-20),
  };

  const { collectivePhase, peakPhase } = evaluateCollectivePhase(nextCohort);

  nextCohort = {
    ...nextCohort,
    collectivePhase,
    peakPhase,
    ratifiedRatchetPhase: peakPhase,
  };

  return { nextState: nextCohort, receipts };
}
