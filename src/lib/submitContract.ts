import { FearContract } from '../types/fear';
import { CharacterStance } from '../types/characterStance';
import { TopologyConnection } from './cohortBehaviors';
import { SpatialNode } from '../types';

export type SubmitOutcome =
  | 'ACCEPT'
  | 'REJECT'
  | 'PUNISH'
  | 'IGNORE'
  | 'AWAITING_HUMAN_CHOICE'
  | 'UNPERCEIVED'
  | string;

export interface HumanSubmitChoicePromptPayload {
  villainId: string;
  targetCharacterId: string;
  description: string;
  suggestedOptions: string[];
}

export interface EvaluateSubmitResponseParams {
  villainId: string;
  submittedCharId: string;
  submitResponseContract?: Record<string, 'ACCEPT' | 'REJECT' | 'PUNISH' | 'IGNORE' | string>;
  isVillainHuman?: boolean;
  spatialGraph?: SpatialNode[];
  castPlacement?: Record<string, string>; // characterId -> nodeId
  topologyConnections?: TopologyConnection[];
  fearContract?: Partial<FearContract>;
}

export interface SubmitResponseResult {
  canPerceive: boolean;
  outcome: SubmitOutcome;
  humanPromptPayload?: HumanSubmitChoicePromptPayload;
  description: string;
  targetStancePostState: CharacterStance;
}

/**
 * Checks whether the villain can diegetically perceive the submission.
 * Same node -> true; directly adjacent node via OPEN edge -> true; otherwise false.
 */
export function canVillainPerceiveSubmission(
  villainId: string,
  submittedCharId: string,
  castPlacement?: Record<string, string>,
  topologyConnections?: TopologyConnection[],
  spatialGraph?: SpatialNode[]
): boolean {
  if (!castPlacement) {
    return true; // If no placement map is provided, assume co-presence in unit tests
  }

  const villainNode = castPlacement[villainId];
  const submittedNode = castPlacement[submittedCharId];

  if (!villainNode || !submittedNode) {
    return true; // Fallback to perceivable if locations unmapped
  }

  if (villainNode === submittedNode) {
    return true;
  }

  if (topologyConnections && Array.isArray(topologyConnections)) {
    const directEdge = topologyConnections.find(
      (c) =>
        ((c.fromNodeId === villainNode && c.toNodeId === submittedNode) ||
          (c.fromNodeId === submittedNode && c.toNodeId === villainNode)) &&
        c.status === 'OPEN'
    );
    if (directEdge) return true;
  }

  if (spatialGraph && Array.isArray(spatialGraph)) {
    const vNode = spatialGraph.find((n) => n.id === villainNode);
    if (vNode && vNode.exits) {
      const exit = vNode.exits.find(
        (e) => e.targetNodeId === submittedNode && e.isOpen !== false
      );
      if (exit) return true;
    }
    const sNode = spatialGraph.find((n) => n.id === submittedNode);
    if (sNode && sNode.exits) {
      const exit = sNode.exits.find(
        (e) => e.targetNodeId === villainNode && e.isOpen !== false
      );
      if (exit) return true;
    }
  }

  return false;
}

/**
 * Evaluates the Turn N+1 response contract when a character executes SUBMIT (§5.4).
 * - Turn N: Character executes SUBMIT, setting stance: 'SUBMITTED' and emitting acoustic/social pleas.
 * - Turn N+1: The villain evaluates the authored response contract:
 *   1. If villain cannot perceive the plea, stance persists without crashing (UNPERCEIVED).
 *   2. If villain is a human player, returns prompt payload presenting the choice (AWAITING_HUMAN_CHOICE).
 *   3. If villain is autonomous NPC, evaluates authored submitResponse (ACCEPT, REJECT, PUNISH, IGNORE; default REJECT).
 */
export function evaluateSubmitResponse(
  params: EvaluateSubmitResponseParams
): SubmitResponseResult {
  const {
    villainId,
    submittedCharId,
    submitResponseContract,
    isVillainHuman = false,
    spatialGraph,
    castPlacement,
    topologyConnections,
    fearContract,
  } = params;

  // 1. Gating: Diegetic Perception
  const canPerceive = canVillainPerceiveSubmission(
    villainId,
    submittedCharId,
    castPlacement,
    topologyConnections,
    spatialGraph
  );

  if (!canPerceive) {
    return {
      canPerceive: false,
      outcome: 'UNPERCEIVED',
      description: `The villain (${villainId}) is not in position to perceive ${submittedCharId}'s submission. The plea goes unheard; submission stance persists.`,
      targetStancePostState: 'SUBMITTED',
    };
  }

  // 2. Human Villain / Antagonist Sovereignty (Invariant 6)
  if (isVillainHuman) {
    return {
      canPerceive: true,
      outcome: 'AWAITING_HUMAN_CHOICE',
      humanPromptPayload: {
        villainId,
        targetCharacterId: submittedCharId,
        description: `${submittedCharId} has collapsed before you, hands raised in total surrender, begging for their life.`,
        suggestedOptions: [
          'Accept surrender and command obedience',
          'Reject the plea and strike without hesitation',
          'Inflict punishment to demonstrate absolute dominance',
          'Ignore the defenseless subject and continue forward',
        ],
      },
      description: `The victim (${submittedCharId}) has submitted. Awaiting human player decision.`,
      targetStancePostState: 'SUBMITTED',
    };
  }

  // 3. Autonomous NPC Villain Authoring Evaluation
  const authoredContract =
    submitResponseContract || fearContract?.submitResponse || {};

  // Check specific character key or villain key or default
  const rawResponse =
    authoredContract[villainId] ||
    authoredContract[submittedCharId] ||
    authoredContract['default'] ||
    'REJECT';

  const normalizedResponse = rawResponse.toUpperCase();

  switch (normalizedResponse) {
    case 'ACCEPT':
      return {
        canPerceive: true,
        outcome: 'ACCEPT',
        description: `The villain (${villainId}) pauses, accepting ${submittedCharId}'s capitulation and sparing them for now.`,
        targetStancePostState: 'WITHDRAWN',
      };

    case 'PUNISH':
      return {
        canPerceive: true,
        outcome: 'PUNISH',
        description: `The villain (${villainId}) punishes ${submittedCharId}'s weakness with calculated violence or psychological humiliation.`,
        targetStancePostState: 'AFRAID',
      };

    case 'IGNORE':
      return {
        canPerceive: true,
        outcome: 'IGNORE',
        description: `The villain (${villainId}) regards ${submittedCharId} with contempt and steps past them, pursuing a higher priority.`,
        targetStancePostState: 'WITHDRAWN',
      };

    case 'REJECT':
      return {
        canPerceive: true,
        outcome: 'REJECT',
        description: `The villain (${villainId}) rejects ${submittedCharId}'s plea without mercy.`,
        targetStancePostState: 'AFRAID',
      };

    default:
      return {
        canPerceive: true,
        outcome: normalizedResponse || 'REJECT',
        description: `The villain (${villainId}) responds with ${rawResponse} to ${submittedCharId}'s submission.`,
        targetStancePostState: 'WITHDRAWN',
      };
  }
}
