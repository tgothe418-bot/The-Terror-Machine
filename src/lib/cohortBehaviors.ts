import type { CohortMember, CohortTraceEmission, CohortState } from '../types/cohort';
import { ingestEvidenceEvent, dismissEvidenceEvent } from './cohortCognition';

export interface TopologyNode {
  id: string;
  name: string;
}

export interface TopologyConnection {
  fromNodeId: string;
  toNodeId: string;
  status: 'OPEN' | 'LOCKED' | 'BLOCKED';
  kind: 'DOOR' | 'HALLWAY' | 'DUCT' | 'STAIRS' | string;
}

export interface NodeEvidenceItem {
  id: string;
  targetHypothesisId: string;
  weightDelta: number;
  text: string;
  dissonanceDelta?: number;
}

export interface BehaviorExecutionContext {
  turnNumber: number;
  fictionalTime: number;
  currentNodeId: string;
  memberLocations: Record<string, string>;
  topologyNodes: TopologyNode[];
  topologyConnections: TopologyConnection[];
  allMembers: Record<string, CohortMember>;
  activeEvidenceAtNode: NodeEvidenceItem[];
  threatProximity?: number;
  threatNodeId?: string;
  exitNodeIds?: string[];
  nearbyNonCohortCast?: Array<{ characterId: string; nodeId: string }>;
  recruitCandidates?: Array<{
    characterId: string;
    nodeId: string;
    dissonanceWeight: number;
    relationshipAffinity: number;
  }>;
  breakingProximity?: Record<string, number>;
  hypothesisNodeMap?: Record<string, string>;
  cohort?: CohortState;
}

export interface BehaviorExecutionResult {
  member: CohortMember;
  otherMemberDeltas?: Record<string, CohortMember>;
  emittedTraces: CohortTraceEmission[];
  fictionalTimeSeconds: number;
  locationDelta?: string;
  actedOnLocationBelief?: boolean;
  parleyAttempted?: boolean;
  warnedCharacterIds?: string[];
  recruitTargetId?: string;
  recruitSucceeded?: boolean;
  newMember?: CohortMember;
  removedMemberId?: string;
  nodeTrapDelta?: {
    nodeId: string;
    trap: { setByCharacterId: string; setAtFictionalTime: number };
  };
  fortifiedNodeDelta?: {
    nodeId: string;
    fortified: { barredByCharacterId: string; fortifiedAtFictionalTime: number; strength: number };
  };
  fractureDelta?: {
    aCharacterId: string;
    bCharacterId: string;
    sinceTurn: number;
    sinceFictionalTime: number;
  };
}

/**
 * Spatial BFS pathfinding over OPEN edges (§3, §4).
 */
export function findReachableNodes(
  startNodeId: string,
  connections: TopologyConnection[],
  maxHops = Infinity
): Map<string, number> {
  const distances = new Map<string, number>();
  distances.set(startNodeId, 0);
  const queue: Array<{ nodeId: string; dist: number }> = [{ nodeId: startNodeId, dist: 0 }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.dist >= maxHops) continue;

    for (const edge of connections) {
      if (edge.status !== 'OPEN') continue;
      let neighbor: string | undefined;
      if (edge.fromNodeId === current.nodeId) neighbor = edge.toNodeId;
      else if (edge.toNodeId === current.nodeId) neighbor = edge.fromNodeId;

      if (neighbor && !distances.has(neighbor)) {
        distances.set(neighbor, current.dist + 1);
        queue.push({ nodeId: neighbor, dist: current.dist + 1 });
      }
    }
  }

  return distances;
}

/**
 * Diegetic sharing spatial gate (§3):
 * Same node = true; Direct neighbor via OPEN edge = true; otherwise false.
 */
export function canShareDiegetically(
  sender: CohortMember,
  receiver: CohortMember,
  context: BehaviorExecutionContext
): boolean {
  const senderNode = context.memberLocations[sender.characterId] || context.currentNodeId;
  const receiverNode = context.memberLocations[receiver.characterId];

  if (!senderNode || !receiverNode) return false;
  if (senderNode === receiverNode) return true;

  const directEdge = context.topologyConnections.find(
    (c) =>
      (c.fromNodeId === senderNode && c.toNodeId === receiverNode) ||
      (c.fromNodeId === receiverNode && c.toNodeId === senderNode)
  );

  return directEdge !== undefined && directEdge.status === 'OPEN';
}

/**
 * Check whether two members have an active bilateral fracture (§4 FRACTURE).
 */
export function areMembersFractured(
  aId: string,
  bId: string,
  fractures?: Array<{ aCharacterId: string; bCharacterId: string }>
): boolean {
  if (!fractures || fractures.length === 0) return false;
  return fractures.some(
    (f) =>
      (f.aCharacterId === aId && f.bCharacterId === bId) ||
      (f.aCharacterId === bId && f.bCharacterId === aId)
  );
}

/**
 * Downgrade trace clarity by one step for HIDE mechanic (§4 HIDE).
 * STARK -> AUDIBLE -> OBSCURED -> FAINT; FAINT stays FAINT.
 */
export function downgradeClarity(
  clarity: 'FAINT' | 'OBSCURED' | 'AUDIBLE' | 'STARK'
): 'FAINT' | 'OBSCURED' | 'AUDIBLE' | 'STARK' {
  switch (clarity) {
    case 'STARK':
      return 'AUDIBLE';
    case 'AUDIBLE':
      return 'OBSCURED';
    case 'OBSCURED':
    case 'FAINT':
      return 'FAINT';
  }
}

/**
 * Helper to identify location hypotheses (§4 CLOSE_IN, MISDIRECT).
 */
export function isLocationHypothesis(
  hypId: string,
  hypothesisNodeMap?: Record<string, string>
): boolean {
  return hypId.startsWith('hyp-threat-in-') || (hypothesisNodeMap !== undefined && hypId in hypothesisNodeMap);
}

/**
 * Hard executability preconditions (§4 Layer 1b).
 */
export function isBehaviorExecutable(
  behaviorId: string,
  member: CohortMember,
  context: BehaviorExecutionContext
): boolean {
  const phase = context.cohort?.collectivePhase ?? 'ONSET';

  if (behaviorId === 'INVESTIGATE') {
    return context.activeEvidenceAtNode.some(
      (ev) => !member.cognition.ingestedEvidenceIds.includes(ev.id)
    );
  }

  if (behaviorId === 'SHARE') {
    return Object.values(context.allMembers).some((other) => {
      if (other.characterId === member.characterId) return false;
      if (areMembersFractured(member.characterId, other.characterId, context.cohort?.fractures)) {
        return false;
      }
      return canShareDiegetically(member, other, context);
    });
  }

  if (behaviorId === 'CLOSE_IN') {
    if (phase !== 'CONFIRMATION' && phase !== 'CONFRONTATION') return false;
    const locationHyps = Object.values(member.cognition.hypotheses).filter(
      (h) => isLocationHypothesis(h.id, context.hypothesisNodeMap) && h.weight >= 0.6
    );
    return locationHyps.length > 0;
  }

  if (behaviorId === 'TRAP') {
    if (phase !== 'CONFIRMATION' && phase !== 'CONFRONTATION') return false;
    const locationHyps = Object.values(member.cognition.hypotheses).filter(
      (h) => isLocationHypothesis(h.id, context.hypothesisNodeMap) && h.weight >= 0.6
    );
    return locationHyps.length > 0;
  }

  if (behaviorId === 'DENY') {
    return true; // Always executable (§4 DENY)
  }

  if (behaviorId === 'HIDE') {
    return true; // Always executable (§4 HIDE)
  }

  if (behaviorId === 'FLEE') {
    const exitNodes = context.exitNodeIds || [];
    if (exitNodes.length === 0) return false;
    const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
    const reachable = findReachableNodes(startNode, context.topologyConnections);
    return exitNodes.some((exitId) => reachable.has(exitId));
  }

  if (behaviorId === 'MISDIRECT') {
    // 1. Collect all location hypotheses across all cohort members
    const allLocationHypIds = new Set<string>();
    for (const m of Object.values(context.allMembers)) {
      for (const hypId of Object.keys(m.cognition.hypotheses)) {
        if (isLocationHypothesis(hypId, context.hypothesisNodeMap)) {
          allLocationHypIds.add(hypId);
        }
      }
    }
    if (allLocationHypIds.size === 0) return false;

    // 2. Determine collective best guess: location hyp with highest max weight across members
    const sortedHypIds = Array.from(allLocationHypIds).sort();
    let collectiveBestGuessId = '';
    let collectiveBestWeight = -1;
    for (const hypId of sortedHypIds) {
      let maxW = 0;
      for (const m of Object.values(context.allMembers)) {
        maxW = Math.max(maxW, m.cognition.hypotheses[hypId]?.weight || 0);
      }
      if (maxW > collectiveBestWeight) {
        collectiveBestWeight = maxW;
        collectiveBestGuessId = hypId;
      }
    }

    // 3. Member's highest-weight location hypothesis
    const memberLocationHyps = Object.values(member.cognition.hypotheses).filter((h) =>
      isLocationHypothesis(h.id, context.hypothesisNodeMap)
    );
    if (memberLocationHyps.length === 0) return false;
    memberLocationHyps.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));
    const memberTopHyp = memberLocationHyps[0];

    return memberTopHyp.weight >= 0.3 && memberTopHyp.id !== collectiveBestGuessId;
  }

  if (behaviorId === 'PURSUE_AGENDA') {
    return true; // Always executable (§4 PURSUE_AGENDA)
  }

  if (behaviorId === 'MOURN') {
    const lastCasualty = context.cohort?.lastCasualtyFictionalTime;
    return (
      lastCasualty !== undefined &&
      context.fictionalTime - lastCasualty >= 0 &&
      context.fictionalTime - lastCasualty <= 1800
    );
  }

  if (behaviorId === 'PARLEY') {
    const threatWeight = member.cognition.hypotheses['hyp-threat-exists']?.weight ?? 0;
    return threatWeight >= 0.3;
  }

  if (behaviorId === 'FRACTURE') {
    const members = Object.values(context.allMembers);
    if (members.length < 2) return false;

    // Condition (a): belief spread max - min hyp-threat-exists >= 0.4
    const threatWeights = members.map((m) => m.cognition.hypotheses['hyp-threat-exists']?.weight ?? 0);
    const minW = Math.min(...threatWeights);
    const maxW = Math.max(...threatWeights);
    if (maxW - minW >= 0.4) return true;

    // Condition (b): any member cognitiveDissonance >= 0.8
    if (members.some((m) => m.cognition.cognitiveDissonance >= 0.8)) return true;

    // Condition (c): casualty recency window active (<= 1800s)
    const lastCasualty = context.cohort?.lastCasualtyFictionalTime;
    if (
      lastCasualty !== undefined &&
      context.fictionalTime - lastCasualty >= 0 &&
      context.fictionalTime - lastCasualty <= 1800
    ) {
      return true;
    }

    return false;
  }

  if (behaviorId === 'WARN') {
    const outsiders = context.nearbyNonCohortCast || [];
    if (outsiders.length === 0) return false;
    const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
    const reachable = findReachableNodes(startNode, context.topologyConnections, 1);
    return outsiders.some((o) => reachable.has(o.nodeId));
  }

  if (behaviorId === 'RECRUIT') {
    const candidates = context.recruitCandidates || [];
    if (candidates.length === 0) return false;
    const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
    const reachable = findReachableNodes(startNode, context.topologyConnections, 1);
    return candidates.some(
      (c) => reachable.has(c.nodeId) && c.dissonanceWeight * c.relationshipAffinity > 0
    );
  }

  if (behaviorId === 'FORTIFY') {
    return true; // Always executable (§4 FORTIFY)
  }

  return false;
}

// ------------------------------------------------------------------------------------------------
// Verb Executors
// ------------------------------------------------------------------------------------------------

export function executeInvestigate(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  let updatedCognition = member.cognition;

  for (const evidence of context.activeEvidenceAtNode) {
    if (!updatedCognition.ingestedEvidenceIds.includes(evidence.id)) {
      updatedCognition = ingestEvidenceEvent(
        updatedCognition,
        {
          id: evidence.id,
          targetHypothesisId: evidence.targetHypothesisId,
          weightDelta: evidence.weightDelta,
          dissonanceDelta: evidence.dissonanceDelta ?? 0.1,
        },
        context.turnNumber
      );
    }
  }

  const traceEmission: CohortTraceEmission = {
    id: `trace-inv-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: 'Cautious footsteps and the clicking of a flashlight switch.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'INVESTIGATE',
      cognition: updatedCognition,
    },
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 180, // playtest placeholder
  };
}

export function executeShare(
  sender: CohortMember,
  targetReceiverIdOrContext: string | BehaviorExecutionContext,
  maybeHypothesisId?: string,
  maybeContext?: BehaviorExecutionContext
): BehaviorExecutionResult {
  let targetReceiverId: string | undefined;
  let hypothesisId = 'hyp-threat-exists';
  let context: BehaviorExecutionContext;

  if (typeof targetReceiverIdOrContext === 'string') {
    targetReceiverId = targetReceiverIdOrContext;
    hypothesisId = maybeHypothesisId || 'hyp-threat-exists';
    context = maybeContext!;
  } else {
    context = targetReceiverIdOrContext;
    const eligiblePeers = Object.values(context.allMembers)
      .filter(
        (other) =>
          other.characterId !== sender.characterId &&
          !areMembersFractured(sender.characterId, other.characterId, context.cohort?.fractures) &&
          canShareDiegetically(sender, other, context)
      )
      .sort((a, b) => a.characterId.localeCompare(b.characterId));

    if (eligiblePeers.length > 0) {
      targetReceiverId = eligiblePeers[0].characterId;
    }
  }

  if (!targetReceiverId) {
    return { member: sender, emittedTraces: [], fictionalTimeSeconds: 60 };
  }

  const receiver = context.allMembers[targetReceiverId];
  if (
    !receiver ||
    !canShareDiegetically(sender, receiver, context) ||
    areMembersFractured(sender.characterId, receiver.characterId, context.cohort?.fractures)
  ) {
    return { member: sender, emittedTraces: [], fictionalTimeSeconds: 60 };
  }

  const senderWeight = sender.cognition.hypotheses[hypothesisId]?.weight || 0;
  const receiverCurrent = receiver.cognition.hypotheses[hypothesisId]?.weight || 0;
  const convergedWeight = receiverCurrent + (senderWeight - receiverCurrent) * 0.5;

  const updatedReceiver: CohortMember = {
    ...receiver,
    cognition: {
      ...receiver.cognition,
      hypotheses: {
        ...receiver.cognition.hypotheses,
        [hypothesisId]: {
          id: hypothesisId,
          weight: Math.max(0, Math.min(1, convergedWeight)),
          provenance: {
            lastSupportRef: `share-from-${sender.characterId}`,
            lastUpdatedTurn: context.turnNumber,
          },
        },
      },
    },
  };

  const traceEmission: CohortTraceEmission = {
    id: `trace-share-${sender.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: 'Hushed, urgent whispering exchanging findings.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: { ...sender, lastAction: 'SHARE' },
    otherMemberDeltas: { [targetReceiverId]: updatedReceiver },
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 60, // playtest placeholder
  };
}

export function executeCloseIn(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const validLocationHyps = Object.values(member.cognition.hypotheses).filter(
    (h) => isLocationHypothesis(h.id, context.hypothesisNodeMap) && h.weight >= 0.6
  );
  validLocationHyps.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  const hasValidHyp = validLocationHyps.length > 0;
  const targetNodeId = hasValidHyp
    ? context.hypothesisNodeMap?.[validLocationHyps[0].id] || context.currentNodeId
    : undefined;

  const traceEmission: CohortTraceEmission = {
    id: `trace-close-in-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: 'Deliberate footsteps converging; low, urgent voices coordinating.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'CLOSE_IN',
    },
    ...(targetNodeId !== undefined ? { locationDelta: targetNodeId, actedOnLocationBelief: true } : {}),
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 300, // playtest placeholder
  };
}

export function executeTrap(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const targetNodeId = context.currentNodeId;

  const traceEmission: CohortTraceEmission = {
    id: `trace-trap-${member.characterId}-${context.turnNumber}`,
    channel: 'EVIDENTIAL',
    nodeId: targetNodeId,
    clarity: 'OBSCURED',
    cueText: 'Furniture shifted a few inches; a door left ajar that was closed.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'TRAP',
    },
    nodeTrapDelta: {
      nodeId: targetNodeId,
      trap: {
        setByCharacterId: member.characterId,
        setAtFictionalTime: context.fictionalTime,
      },
    },
    actedOnLocationBelief: true,
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 600, // playtest placeholder
  };
}

export function executeDeny(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  let updatedCognition = member.cognition;

  for (const evidence of context.activeEvidenceAtNode) {
    if (!updatedCognition.ingestedEvidenceIds.includes(evidence.id)) {
      updatedCognition = dismissEvidenceEvent(updatedCognition, evidence.id);
    }
  }

  updatedCognition = {
    ...updatedCognition,
    cognitiveDissonance: Math.max(0, updatedCognition.cognitiveDissonance - 0.3),
  };

  const traceEmission: CohortTraceEmission = {
    id: `trace-deny-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: "Nervous laughter. 'It's nothing. It's always nothing.'",
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'DENY',
      cognition: updatedCognition,
    },
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 120, // playtest placeholder
  };
}

export function executeHide(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  return {
    member: {
      ...member,
      lastAction: 'HIDE',
      hidingUntilFictionalTime: context.fictionalTime + 1800, // 30 fictional minutes, playtest placeholder
    },
    emittedTraces: [],
    fictionalTimeSeconds: 300, // playtest placeholder
  };
}

export function executeFlee(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const exitNodes = context.exitNodeIds || [];
  const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
  const reachable = findReachableNodes(startNode, context.topologyConnections);

  const reachableExits = exitNodes
    .filter((exitId) => reachable.has(exitId))
    .map((exitId) => ({ exitId, hops: reachable.get(exitId)! }))
    .sort((a, b) => a.hops - b.hops || a.exitId.localeCompare(b.exitId));

  const hasReachableExit = reachableExits.length > 0;
  const targetExit = hasReachableExit ? reachableExits[0].exitId : startNode;

  const traceEmission: CohortTraceEmission = {
    id: `trace-flee-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: 'Running footsteps, receding. A door slamming somewhere.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'FLEE',
    },
    ...(hasReachableExit ? { removedMemberId: member.characterId, locationDelta: targetExit } : {}),
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 180, // playtest placeholder
  };
}

export function executeMisdirect(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const memberLocationHyps = Object.values(member.cognition.hypotheses).filter((h) =>
    isLocationHypothesis(h.id, context.hypothesisNodeMap)
  );
  memberLocationHyps.sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id));

  const wrongHyp = memberLocationHyps[0];
  const targetNodeId =
    (wrongHyp && context.hypothesisNodeMap?.[wrongHyp.id]) || context.currentNodeId;

  const traceEmission: CohortTraceEmission = {
    id: `trace-misdirect-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: 'Confident footsteps, heading the wrong way.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'MISDIRECT',
    },
    locationDelta: targetNodeId,
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 300, // playtest placeholder
  };
}

export function executePursueAgenda(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const currentProgress = member.agendaProgress ?? 0;
  const newProgress = Math.min(1, currentProgress + 0.34);
  const isFulfilled = newProgress >= 1;

  let traceEmission: CohortTraceEmission;
  if (isFulfilled) {
    traceEmission = {
      id: `trace-agenda-fulfill-${member.characterId}-${context.turnNumber}`,
      channel: 'EVIDENTIAL',
      nodeId: context.currentNodeId,
      clarity: 'STARK',
      cueText: "A stash found: bandages, pills, food — someone's been hoarding.",
      fictionalTime: context.fictionalTime,
    };
  } else {
    traceEmission = {
      id: `trace-agenda-${member.characterId}-${context.turnNumber}`,
      channel: 'EVIDENTIAL',
      nodeId: context.currentNodeId,
      clarity: 'FAINT',
      cueText: "Something's missing from the cabinet; drawers closed too carefully.",
      fictionalTime: context.fictionalTime,
    };
  }

  return {
    member: {
      ...member,
      lastAction: 'PURSUE_AGENDA',
      agendaProgress: isFulfilled ? 0 : newProgress,
    },
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 240, // playtest placeholder
  };
}

export function executeMourn(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const updatedCognition = {
    ...member.cognition,
    cognitiveDissonance: Math.max(0, member.cognition.cognitiveDissonance - 0.2),
  };

  const otherMemberDeltas: Record<string, CohortMember> = {};
  for (const other of Object.values(context.allMembers)) {
    if (other.characterId === member.characterId) continue;
    const otherNode = context.memberLocations[other.characterId] || context.currentNodeId;
    const isConcurrentlyMourning =
      other.behaviorDuration?.currentBehaviorId === 'MOURN' || other.lastAction === 'MOURN';
    const alreadyStartedThisTick =
      other.behaviorDuration?.currentBehaviorId === 'MOURN' &&
      other.behaviorDuration.startedAtFictionalTime === context.fictionalTime;

    if (otherNode === context.currentNodeId && isConcurrentlyMourning && !alreadyStartedThisTick) {
      otherMemberDeltas[other.characterId] = {
        ...other,
        cognition: {
          ...other.cognition,
          cognitiveDissonance: Math.max(0, other.cognition.cognitiveDissonance - 0.2),
        },
      };
    }
  }

  const acousticTrace: CohortTraceEmission = {
    id: `trace-mourn-ac-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: 'Quiet crying, trying not to be heard.',
    fictionalTime: context.fictionalTime,
  };

  const evidentialTrace: CohortTraceEmission = {
    id: `trace-mourn-ev-${member.characterId}-${context.turnNumber}`,
    channel: 'EVIDENTIAL',
    nodeId: context.currentNodeId,
    clarity: 'OBSCURED',
    cueText: 'A makeshift marker: a folded jacket, a name whispered.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'MOURN',
      cognition: updatedCognition,
    },
    otherMemberDeltas,
    emittedTraces: [acousticTrace, evidentialTrace],
    fictionalTimeSeconds: 900, // playtest placeholder
  };
}

export function executeParley(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const targetNodeId = context.threatNodeId || context.currentNodeId;

  const traceEmission: CohortTraceEmission = {
    id: `trace-parley-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: targetNodeId,
    clarity: 'AUDIBLE',
    cueText: "A raised voice, shaking: 'Hello? Is someone there? We just want to talk.'",
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'PARLEY',
    },
    parleyAttempted: true,
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 180, // playtest placeholder
  };
}

export function executeFracture(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const actorWeight = member.cognition.hypotheses['hyp-threat-exists']?.weight ?? 0;
  const otherMembers = Object.values(context.allMembers).filter(
    (m) => m.characterId !== member.characterId
  );

  otherMembers.sort((a, b) => {
    const wA = a.cognition.hypotheses['hyp-threat-exists']?.weight ?? 0;
    const wB = b.cognition.hypotheses['hyp-threat-exists']?.weight ?? 0;
    const diffA = Math.abs(actorWeight - wA);
    const diffB = Math.abs(actorWeight - wB);
    if (diffB !== diffA) return diffB - diffA;
    return a.characterId.localeCompare(b.characterId);
  });

  const target = otherMembers[0];
  const targetId = target?.characterId ?? member.characterId;

  const otherMemberDeltas: Record<string, CohortMember> = {};
  if (target) {
    otherMemberDeltas[targetId] = {
      ...target,
      cognition: {
        ...target.cognition,
        cognitiveDissonance: target.cognition.cognitiveDissonance + 0.2,
      },
    };
  }

  const acousticTrace: CohortTraceEmission = {
    id: `trace-fracture-ac-${member.characterId}-${context.turnNumber}`,
    channel: 'ACOUSTIC',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: "Shouting. 'You're lying!' Something thrown.",
    fictionalTime: context.fictionalTime,
  };

  const socialTrace: CohortTraceEmission = {
    id: `trace-fracture-so-${member.characterId}-${context.turnNumber}`,
    channel: 'SOCIAL',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: 'Two people who arrived together now walk apart.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'FRACTURE',
      cognition: {
        ...member.cognition,
        cognitiveDissonance: member.cognition.cognitiveDissonance + 0.2,
      },
    },
    otherMemberDeltas,
    fractureDelta: {
      aCharacterId: member.characterId,
      bCharacterId: targetId,
      sinceTurn: context.turnNumber,
      sinceFictionalTime: context.fictionalTime,
    },
    emittedTraces: [acousticTrace, socialTrace],
    fictionalTimeSeconds: 120, // playtest placeholder
  };
}

export function executeWarn(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const outsiders = context.nearbyNonCohortCast || [];
  const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
  const reachable = findReachableNodes(startNode, context.topologyConnections, 1);

  const eligible = outsiders
    .filter((o) => reachable.has(o.nodeId))
    .map((o) => ({ ...o, hops: reachable.get(o.nodeId)! }))
    .sort((a, b) => a.hops - b.hops || a.characterId.localeCompare(b.characterId));

  const targetId = eligible.length > 0 ? eligible[0].characterId : undefined;

  const socialTrace: CohortTraceEmission = {
    id: `trace-warn-so-${member.characterId}-${context.turnNumber}`,
    channel: 'SOCIAL',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: "Urgent whispering: 'You need to leave. Now. Don't ask.'",
    fictionalTime: context.fictionalTime,
  };

  const evidentialTrace: CohortTraceEmission = {
    id: `trace-warn-ev-${member.characterId}-${context.turnNumber}`,
    channel: 'EVIDENTIAL',
    nodeId: context.currentNodeId,
    clarity: 'FAINT',
    cueText: 'A hurried note pressed into someone\'s hand.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'WARN',
    },
    warnedCharacterIds: targetId ? [targetId] : [],
    emittedTraces: [socialTrace, evidentialTrace],
    fictionalTimeSeconds: 90, // playtest placeholder
  };
}

export function executeRecruit(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const candidates = context.recruitCandidates || [];
  const startNode = context.memberLocations[member.characterId] || context.currentNodeId;
  const reachable = findReachableNodes(startNode, context.topologyConnections, 1);

  const eligible = candidates
    .filter((c) => reachable.has(c.nodeId) && c.dissonanceWeight * c.relationshipAffinity > 0)
    .sort((a, b) => {
      const scoreA = a.dissonanceWeight * a.relationshipAffinity;
      const scoreB = b.dissonanceWeight * b.relationshipAffinity;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return a.characterId.localeCompare(b.characterId);
    });

  const target = eligible[0];
  const targetScore = target ? target.dissonanceWeight * target.relationshipAffinity : 0;
  const success = targetScore >= 0.5;

  const traceEmission: CohortTraceEmission = {
    id: `trace-recruit-${member.characterId}-${context.turnNumber}`,
    channel: 'SOCIAL',
    nodeId: context.currentNodeId,
    clarity: 'AUDIBLE',
    cueText: "A low, earnest pitch: 'Listen — we need people. People who've seen it too.'",
    fictionalTime: context.fictionalTime,
  };

  let newMember: CohortMember | undefined;
  let updatedMember = member;

  if (target && success) {
    const memory = context.cohort?.institutionalMemory || {};
    const seededHyps = Object.keys(memory).length > 0
      ? JSON.parse(JSON.stringify(memory))
      : {
          'hyp-threat-exists': {
            id: 'hyp-threat-exists',
            weight: 0.1,
            provenance: { lastUpdatedTurn: context.turnNumber },
          },
        };

    newMember = {
      characterId: target.characterId,
      isSeatHolder: false,
      tenureTurns: 0,
      agendaProgress: 0,
      agendaText: 'personal business',
      affinities: {
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
      },
      cognition: {
        characterId: target.characterId,
        skepticism: 0.8,
        cognitiveDissonance: 0,
        ingestedEvidenceIds: [],
        hypotheses: seededHyps,
      },
    };
  } else {
    // Rejection stings: recruiter gets +0.1 dissonance
    updatedMember = {
      ...member,
      cognition: {
        ...member.cognition,
        cognitiveDissonance: member.cognition.cognitiveDissonance + 0.1,
      },
    };
  }

  return {
    member: {
      ...updatedMember,
      lastAction: 'RECRUIT',
    },
    recruitTargetId: target?.characterId,
    recruitSucceeded: success,
    newMember,
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 300, // playtest placeholder
  };
}

export function executeFortify(
  member: CohortMember,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const targetNodeId = context.currentNodeId;
  const currentStrength = context.cohort?.fortifiedNodes?.[targetNodeId]?.strength ?? 0;
  const newStrength = Math.min(3, currentStrength + 1);

  const traceEmission: CohortTraceEmission = {
    id: `trace-fortify-${member.characterId}-${context.turnNumber}`,
    channel: 'VISUAL',
    nodeId: targetNodeId,
    clarity: 'STARK',
    cueText: 'The door is barred from the inside — furniture stacked, deliberate.',
    fictionalTime: context.fictionalTime,
  };

  return {
    member: {
      ...member,
      lastAction: 'FORTIFY',
    },
    fortifiedNodeDelta: {
      nodeId: targetNodeId,
      fortified: {
        barredByCharacterId: member.characterId,
        fortifiedAtFictionalTime: context.fictionalTime,
        strength: newStrength,
      },
    },
    emittedTraces: [traceEmission],
    fictionalTimeSeconds: 420, // playtest placeholder
  };
}
