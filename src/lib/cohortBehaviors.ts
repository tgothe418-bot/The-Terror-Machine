import type { CohortMember, CohortTraceEmission } from '../types/cohort';
import { ingestEvidenceEvent } from './cohortCognition';

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
}

export interface BehaviorExecutionResult {
  member: CohortMember;
  otherMemberDeltas?: Record<string, CohortMember>;
  emittedTraces: CohortTraceEmission[];
  fictionalTimeSeconds: number;
}

/**
 * Hard executability preconditions (§4 Layer 1b)
 */
export function isBehaviorExecutable(
  behaviorId: string,
  member: CohortMember,
  context: BehaviorExecutionContext
): boolean {
  if (behaviorId === 'INVESTIGATE') {
    // Requires uninspected evidence clues at current node
    return context.activeEvidenceAtNode.some(
      (ev) => !member.cognition.ingestedEvidenceIds.includes(ev.id)
    );
  }

  if (behaviorId === 'SHARE') {
    // Requires at least one reachable peer via topology connection
    return Object.values(context.allMembers).some((other) => {
      if (other.characterId === member.characterId) return false;
      return canShareDiegetically(member, other, context);
    });
  }

  return false;
}

/**
 * Spatial gating on SHARE (§3):
 * Same node = instant; Adjacent node = valid only if edge is OPEN; Distant/Blocked = false.
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
    fictionalTimeSeconds: 180, // 3 minutes
  };
}

export function executeShare(
  sender: CohortMember,
  targetReceiverId: string,
  hypothesisId: string,
  context: BehaviorExecutionContext
): BehaviorExecutionResult {
  const receiver = context.allMembers[targetReceiverId];
  if (!receiver || !canShareDiegetically(sender, receiver, context)) {
    return { member: sender, emittedTraces: [], fictionalTimeSeconds: 30 };
  }

  const senderWeight = sender.cognition.hypotheses[hypothesisId]?.weight || 0;
  const receiverCurrent = receiver.cognition.hypotheses[hypothesisId]?.weight || 0;

  // Move receiver weight 50% toward sender's weight
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
    fictionalTimeSeconds: 60, // 1 minute
  };
}
