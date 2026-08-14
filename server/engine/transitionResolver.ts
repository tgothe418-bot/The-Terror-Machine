import { TransitionReceipt } from '../schemas/engine';

export interface ResolveTransitionParams {
  currentNodeId: string | null;
  requestedTransition: string | null | undefined;
  allowedOutgoingExits: Array<{
    from: string;
    to: string;
    kind: string;
    requires?: string[];
    userInitiated: boolean;
  }>;
  activeFlags?: string[];
}

/**
 * Pure, deterministic resolver for engine spatial transitions.
 * Authoritative boundary between LLM proposal and runtime state.
 */
export function resolveTransition({
  currentNodeId,
  requestedTransition,
  allowedOutgoingExits = [],
  activeFlags = [],
}: ResolveTransitionParams): TransitionReceipt {
  // 1. If no transition was requested or requestedTransition is explicitly null / empty
  if (!requestedTransition || requestedTransition.trim() === '') {
    return {
      requestedNodeId: null,
      accepted: false,
      fromNodeId: currentNodeId,
      toNodeId: currentNodeId,
      reason: 'NO_MOVEMENT_REQUESTED',
    };
  }

  const target = requestedTransition.trim();

  // 2. Find matching exit from allowedOutgoingExits
  const matchingExit = allowedOutgoingExits.find((exit) => exit.to === target);

  if (!matchingExit) {
    return {
      requestedNodeId: target,
      accepted: false,
      fromNodeId: currentNodeId,
      toNodeId: currentNodeId,
      reason: 'UNKNOWN_OR_UNCONNECTED_TARGET',
    };
  }

  // 3. Reject non-user-initiated edges for player movement
  if (matchingExit.userInitiated === false) {
    return {
      requestedNodeId: target,
      accepted: false,
      fromNodeId: currentNodeId,
      toNodeId: currentNodeId,
      reason: 'NON_USER_INITIATED_EDGE',
    };
  }

  // 4. Validate unsatisfied flag requirements
  if (matchingExit.requires && matchingExit.requires.length > 0) {
    const missingFlags = matchingExit.requires.filter((flag) => !activeFlags.includes(flag));
    if (missingFlags.length > 0) {
      return {
        requestedNodeId: target,
        accepted: false,
        fromNodeId: currentNodeId,
        toNodeId: currentNodeId,
        reason: `UNSATISFIED_EDGE_REQUIREMENTS:${missingFlags.join(',')}`,
      };
    }
  }

  // 5. Accepted valid movement
  return {
    requestedNodeId: target,
    accepted: true,
    fromNodeId: currentNodeId,
    toNodeId: matchingExit.to,
    reason: 'TRANSITION_ACCEPTED',
  };
}
