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
  executeCloseIn,
  executeTrap,
  executeDeny,
  executeHide,
  executeFlee,
  executeMisdirect,
  executePursueAgenda,
  executeMourn,
  executeParley,
  executeFracture,
  executeWarn,
  executeRecruit,
  executeFortify,
  downgradeClarity,
  type BehaviorExecutionContext,
  type BehaviorExecutionResult,
  type NodeEvidenceItem,
} from './cohortBehaviors';

export const VERB_UNIVERSE = [
  'INVESTIGATE',
  'SHARE',
  'CLOSE_IN',
  'TRAP',
  'DENY',
  'HIDE',
  'FLEE',
  'MISDIRECT',
  'PURSUE_AGENDA',
  'MOURN',
  'PARLEY',
  'FRACTURE',
  'WARN',
  'RECRUIT',
  'FORTIFY',
] as const;

export const SURVIVAL_VERBS = ['FORTIFY', 'HIDE', 'FLEE', 'CLOSE_IN'] as const;

export const DEFAULT_AFFINITIES: Record<string, number> = {
  INVESTIGATE: 1.0,
  SHARE: 0.8,
  CLOSE_IN: 0.7,
  FORTIFY: 0.7,
  MOURN: 0.7,
  DENY: 0.6,
  HIDE: 0.6,
  WARN: 0.6,
  PURSUE_AGENDA: 0.6,
  TRAP: 0.5,
  MISDIRECT: 0.5,
  RECRUIT: 0.5,
  PARLEY: 0.4,
  FLEE: 0.4,
  FRACTURE: 0.3,
};

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
 * Layer 1: Environmental consideration set gating (§3, §4).
 * Collapses to survival subset under immediate threat or breaking point.
 */
export function computeConsiderationSet(
  member: CohortMember,
  context: BehaviorExecutionContext,
  cohort?: CohortState
): string[] {
  void cohort;
  const threatProximity = context.threatProximity ?? 0;
  const breakingProx = context.breakingProximity?.[member.characterId] ?? 0;

  if (threatProximity >= 0.8 || breakingProx >= 1.0) {
    return [...SURVIVAL_VERBS];
  }

  return [...VERB_UNIVERSE];
}

/**
 * Layer 2: Environmental scoring modulation (§7).
 * Multiplier applied before fatigue.
 */
export function computeEnvironmentalWeight(
  verb: string,
  member: CohortMember,
  context: BehaviorExecutionContext,
  cohort?: CohortState
): number {
  let weight = 1.0;
  const phase = cohort?.collectivePhase ?? 'ONSET';

  // DENY: * (1 + skepticism) when collectivePhase is ONSET (§7)
  if (verb === 'DENY' && phase === 'ONSET') {
    const skepticism = member.cognition.skepticism ?? 0.8;
    weight *= 1 + skepticism;
  }

  // DENY, HIDE: * 2.0 / * 1.5 when breakingProximity[member] >= 0.7. CLOSE_IN * 0.5 under same condition (§4, §7)
  const breakingProx = context.breakingProximity?.[member.characterId] ?? 0;
  if (breakingProx >= 0.7) {
    if (verb === 'DENY') weight *= 2.0;
    else if (verb === 'HIDE') weight *= 1.5;
    else if (verb === 'CLOSE_IN') weight *= 0.5;
  }

  // MOURN, DENY, FRACTURE: * 1.5 when casualty recency window is active (§4, §7)
  if (cohort?.lastCasualtyFictionalTime !== undefined) {
    const timeSinceCasualty = context.fictionalTime - cohort.lastCasualtyFictionalTime;
    if (timeSinceCasualty >= 0 && timeSinceCasualty <= 1800) {
      if (verb === 'MOURN' || verb === 'DENY' || verb === 'FRACTURE') {
        weight *= 1.5;
      }
    }
  }

  // PURSUE_AGENDA, MISDIRECT: * 1.5 when calm (collectivePhase is ONSET and threatProximity < 0.2) (§4, §7)
  const threatProx = context.threatProximity ?? 0;
  if (phase === 'ONSET' && threatProx < 0.2) {
    if (verb === 'PURSUE_AGENDA' || verb === 'MISDIRECT') {
      weight *= 1.5;
    }
  }

  return weight;
}

/**
 * Recency fatigue multiplier: Score = Base * EnvironmentalWeight * 0.4 if repeated consecutively.
 */
export function scoreCandidateBehavior(
  verb: string,
  member: CohortMember,
  environmentalWeight = 1.0
): number {
  let baseAffinity: number;
  if (verb in member.affinities) {
    baseAffinity = member.affinities[verb];
  } else if (Object.keys(member.affinities).length === 0) {
    baseAffinity = DEFAULT_AFFINITIES[verb] ?? (verb === 'INVESTIGATE' ? 1.0 : 0.8);
  } else {
    baseAffinity = 0;
  }
  const fatigueMultiplier = member.lastAction === verb ? FATIGUE_MULTIPLIER : 1.0;
  return baseAffinity * environmentalWeight * fatigueMultiplier;
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

    const castAffinities = (c as unknown as { affinities?: Record<string, number> }).affinities;
    const castAgendaText = (c as unknown as { agendaText?: string }).agendaText;

    members[c.id] = {
      characterId: c.id,
      isSeatHolder: isLead,
      tenureTurns: 0,
      agendaProgress: 0,
      agendaText: castAgendaText || 'personal business',
      affinities: {
        ...DEFAULT_AFFINITIES,
        ...(castAffinities || {}),
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
    nodeTraps: {},
    fortifiedNodes: {},
    fractures: [],
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
  vulnerabilityWindowSeconds = DEFAULT_SUCCESSION_WINDOW_SECONDS,
  fictionalTime?: number
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
    lastCasualtyFictionalTime:
      _reason === 'DEATH'
        ? (fictionalTime ?? state.lastCasualtyFictionalTime ?? 0)
        : state.lastCasualtyFictionalTime,
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

const EXECUTORS: Record<
  string,
  (member: CohortMember, context: BehaviorExecutionContext) => BehaviorExecutionResult
> = {
  INVESTIGATE: executeInvestigate,
  SHARE: executeShare,
  CLOSE_IN: executeCloseIn,
  TRAP: executeTrap,
  DENY: executeDeny,
  HIDE: executeHide,
  FLEE: executeFlee,
  MISDIRECT: executeMisdirect,
  PURSUE_AGENDA: executePursueAgenda,
  MOURN: executeMourn,
  PARLEY: executeParley,
  FRACTURE: executeFracture,
  WARN: executeWarn,
  RECRUIT: executeRecruit,
  FORTIFY: executeFortify,
};

/**
 * Advance cohort simulation tick against ratified fictional time delta (§6).
 * Bounded tick rate contract: Exactly one completion + at most one initiation per member per player turn.
 */
export function tickCohortState(
  state: CohortState,
  deltaFictionalTimeSeconds: number,
  baseContext: Omit<
    BehaviorExecutionContext,
    'currentNodeId' | 'allMembers' | 'activeEvidenceAtNode' | 'memberLocations' | 'cohort'
  >,
  memberLocations: Record<string, string>,
  evidenceByNode: Record<string, NodeEvidenceItem[]>
): { nextState: CohortState; receipts: CohortCycleReceipt[] } {
  if (state.status === 'DORMANT' || deltaFictionalTimeSeconds <= 0) {
    return { nextState: state, receipts: [] };
  }

  // Fracture decay pass (§9):
  // 1. Drop fractures where either party has departed the cohort.
  // 2. Drop fractures older than 3600 fictional seconds with no intervening FRACTURE involving either party.
  const allFractures = state.fractures || [];
  const currentFractures = allFractures.filter((f) => {
    if (!state.members[f.aCharacterId] || !state.members[f.bCharacterId]) {
      return false;
    }
    const age = baseContext.fictionalTime - f.sinceFictionalTime;
    if (age <= 3600) {
      return true;
    }
    return allFractures.some(
      (other) =>
        other.sinceFictionalTime > f.sinceFictionalTime &&
        (other.aCharacterId === f.aCharacterId ||
          other.bCharacterId === f.aCharacterId ||
          other.aCharacterId === f.bCharacterId ||
          other.bCharacterId === f.bCharacterId)
    );
  });
  const currentNodeTraps = { ...(state.nodeTraps || {}) };
  const currentFortifiedNodes = { ...(state.fortifiedNodes || {}) };
  let currentDormantCognition = { ...(state.dormantCastCognition || {}) };
  let currentInstitutionalMemory = { ...(state.institutionalMemory || {}) };

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
  const memberIdsSnapshot = Object.keys(updatedMembers);

  for (const id of memberIdsSnapshot) {
    const member = updatedMembers[id];
    if (!member) continue; // Member fled or removed earlier in this tick

    const currentNodeId = memberLocations[id] || 'node-default';
    const activeEvidenceAtNode = evidenceByNode[currentNodeId] || [];

    const currentCohortSnapshot: CohortState = {
      ...state,
      members: updatedMembers,
      seatHolderId: currentSeatHolder,
      fractures: currentFractures,
      nodeTraps: currentNodeTraps,
      fortifiedNodes: currentFortifiedNodes,
    };

    const memberContext: BehaviorExecutionContext = {
      ...baseContext,
      currentNodeId,
      memberLocations,
      allMembers: updatedMembers,
      activeEvidenceAtNode,
      cohort: currentCohortSnapshot,
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
    const considerationSet = computeConsiderationSet(member, memberContext, currentCohortSnapshot);
    const executableSet = considerationSet.filter((verb) =>
      isBehaviorExecutable(verb, member, memberContext)
    );

    if (executableSet.length === 0) {
      updatedMembers[id] = { ...member, behaviorDuration: undefined };
      continue;
    }

    // Score executables with affinity profile, Layer 2 environmental modulation, and fatigue
    const scores: Record<string, number> = {};
    for (const verb of executableSet) {
      const envWeight = computeEnvironmentalWeight(verb, member, memberContext, currentCohortSnapshot);
      scores[verb] = scoreCandidateBehavior(verb, member, envWeight);
    }

    // Deterministic selection: highest score, tie broken by verb order in considerationSet
    executableSet.sort((a, b) => {
      const scoreDiff = (scores[b] ?? 0) - (scores[a] ?? 0);
      if (scoreDiff !== 0) return scoreDiff;
      return considerationSet.indexOf(a) - considerationSet.indexOf(b);
    });
    const winner = executableSet[0];

    // Dispatch winner
    const executor = EXECUTORS[winner];
    const execResult = executor(member, memberContext);

    // HIDE cover break & clarity downgrade (§4 HIDE)
    if (winner === 'CLOSE_IN' || winner === 'TRAP') {
      execResult.member.hidingUntilFictionalTime = undefined;
    } else if (
      member.hidingUntilFictionalTime !== undefined &&
      baseContext.fictionalTime < member.hidingUntilFictionalTime
    ) {
      execResult.emittedTraces = execResult.emittedTraces.map((trace) => ({
        ...trace,
        clarity: downgradeClarity(trace.clarity),
      }));
    }

    // Apply deltas
    if (execResult.locationDelta) {
      memberLocations[id] = execResult.locationDelta;
    }

    if (execResult.otherMemberDeltas) {
      updatedMembers = { ...updatedMembers, ...execResult.otherMemberDeltas };
    }

    if (execResult.nodeTrapDelta) {
      currentNodeTraps[execResult.nodeTrapDelta.nodeId] = execResult.nodeTrapDelta.trap;
    }

    if (execResult.fortifiedNodeDelta) {
      currentFortifiedNodes[execResult.fortifiedNodeDelta.nodeId] =
        execResult.fortifiedNodeDelta.fortified;
    }

    if (execResult.fractureDelta) {
      const fDelta = execResult.fractureDelta;
      const existingIdx = currentFractures.findIndex(
        (f) =>
          (f.aCharacterId === fDelta.aCharacterId && f.bCharacterId === fDelta.bCharacterId) ||
          (f.aCharacterId === fDelta.bCharacterId && f.bCharacterId === fDelta.aCharacterId)
      );
      if (existingIdx >= 0) {
        currentFractures[existingIdx] = fDelta;
      } else {
        currentFractures.push(fDelta);
      }
    }

    if (execResult.newMember) {
      updatedMembers[execResult.newMember.characterId] = execResult.newMember;
      memberLocations[execResult.newMember.characterId] = currentNodeId;
    }

    if (execResult.removedMemberId) {
      // FLEE departure transition (§4, §6)
      const fleeState = removeCohortMember(
        {
          ...state,
          members: updatedMembers,
          seatHolderId: currentSeatHolder,
          fractures: currentFractures,
          nodeTraps: currentNodeTraps,
          fortifiedNodes: currentFortifiedNodes,
          dormantCastCognition: currentDormantCognition,
          institutionalMemory: currentInstitutionalMemory,
        },
        execResult.removedMemberId,
        'FLEE',
        undefined,
        baseContext.fictionalTime
      );
      currentSeatHolder = fleeState.seatHolderId;
      windowRemaining = fleeState.successionVulnerabilityWindowRemaining;
      currentDormantCognition = fleeState.dormantCastCognition;
      currentInstitutionalMemory = fleeState.institutionalMemory;
      updatedMembers = { ...fleeState.members };

      // Remaining members each get +0.2 cognitive dissonance (§4 FLEE)
      for (const remId of Object.keys(updatedMembers)) {
        updatedMembers[remId] = {
          ...updatedMembers[remId],
          cognition: {
            ...updatedMembers[remId].cognition,
            cognitiveDissonance: updatedMembers[remId].cognition.cognitiveDissonance + 0.2,
          },
        };
      }
    }

    const timeSpentToComplete = completedThisTurn
      ? Math.max(0, (activeDuration?.durationSeconds || 0) - progressBeforeCompletion)
      : 0;
    const leftoverDelta = completedThisTurn
      ? Math.max(0, deltaFictionalTimeSeconds - timeSpentToComplete)
      : deltaFictionalTimeSeconds;

    if (execResult.removedMemberId !== id) {
      const initialProgress = Math.min(
        Math.max(0, execResult.fictionalTimeSeconds - 1),
        leftoverDelta
      );

      updatedMembers[id] = {
        ...execResult.member,
        behaviorDuration: {
          currentBehaviorId: winner,
          target: execResult.locationDelta,
          startedAtFictionalTime: baseContext.fictionalTime,
          durationSeconds: execResult.fictionalTimeSeconds,
          progressSeconds: initialProgress,
          status: 'IN_PROGRESS',
        },
      };
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
      ...(execResult.actedOnLocationBelief !== undefined
        ? { actedOnLocationBelief: execResult.actedOnLocationBelief }
        : {}),
      ...(execResult.parleyAttempted !== undefined
        ? { parleyAttempted: execResult.parleyAttempted }
        : {}),
      ...(execResult.warnedCharacterIds !== undefined
        ? { warnedCharacterIds: execResult.warnedCharacterIds }
        : {}),
      ...(execResult.recruitTargetId !== undefined
        ? { recruitTargetId: execResult.recruitTargetId }
        : {}),
      ...(execResult.recruitSucceeded !== undefined
        ? { recruitSucceeded: execResult.recruitSucceeded }
        : {}),
      ...(execResult.locationDelta !== undefined
        ? { locationDelta: execResult.locationDelta }
        : {}),
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
    fractures: currentFractures,
    nodeTraps: currentNodeTraps,
    fortifiedNodes: currentFortifiedNodes,
    dormantCastCognition: currentDormantCognition,
    institutionalMemory: currentInstitutionalMemory,
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
