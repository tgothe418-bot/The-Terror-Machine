import { createCastInteractionReceipt } from './castInteraction';
import type {
  CastInteractionReceipt,
  IntentReceipt,
  TopologyDelta,
} from '../types/engineContract';
import type { CastTargetResolution } from './causalFeasibility';

export interface SpatialTransitionProposalInput {
  userAction: string;
  proposedTarget: string | null | undefined;
  isExpansionAuthorized?: boolean;
}

export function isSyntheticNonMovementCommand(userAction: string): boolean {
  const normalized = userAction.trim().toUpperCase();
  return (
    normalized === 'SYSTEM_INIT' ||
    normalized === '[USER_ACTION: OBSERVE]'
  );
}

export function getSpatiallyRatifiableRequestedTransition({
  userAction,
  proposedTarget,
  isExpansionAuthorized = false,
}: SpatialTransitionProposalInput): string | null {
  if (isSyntheticNonMovementCommand(userAction)) {
    return null;
  }

  // Expansion Precedence: If expansion is authorized, suppress mapped transition
  if (isExpansionAuthorized) {
    return null;
  }

  if (typeof proposedTarget !== 'string') {
    return null;
  }

  const normalizedTarget = proposedTarget.trim();
  return normalizedTarget.length > 0 ? normalizedTarget : null;
}

export function getIntentBoundAddressedCharacterId(
  intentReceipt: IntentReceipt,
  castTarget: CastTargetResolution
): string | null {
  if (
    intentReceipt.action_kind === 'COMMUNICATE' &&
    castTarget.status === 'PRESENT_ELIGIBLE'
  ) {
    return castTarget.characterId;
  }
  return null;
}

export function createIntentBoundCastInteractionReceipt(input: {
  intentReceipt: IntentReceipt;
  castTarget: CastTargetResolution;
  respondingCharacterId: string | null;
}): CastInteractionReceipt {
  const addressedCharacterId = getIntentBoundAddressedCharacterId(
    input.intentReceipt,
    input.castTarget
  );
  return createCastInteractionReceipt({
    addressedCharacterId,
    respondingCharacterId: input.respondingCharacterId,
  });
}

export interface ThresholdBoundTopologyDeltaInput {
  userAction: string;
  effectiveRole: string;
  isExpansionExpected: boolean;
  proposedTopologyDelta: TopologyDelta | null | undefined;
}

export function isEmbodiedRole(role: string): boolean {
  const normalized = role.trim().toLowerCase();
  return (
    normalized === 'protagonist' ||
    normalized === 'antagonist' ||
    normalized === 'possessed'
  );
}

export function getThresholdBoundTopologyDelta(
  input: ThresholdBoundTopologyDeltaInput
): TopologyDelta {
  if (isSyntheticNonMovementCommand(input.userAction)) {
    return { isExpansion: false, newNodeDef: null };
  }
  if (!isEmbodiedRole(input.effectiveRole)) {
    return { isExpansion: false, newNodeDef: null };
  }
  if (!input.isExpansionExpected) {
    return { isExpansion: false, newNodeDef: null };
  }
  if (input.proposedTopologyDelta?.isExpansion !== true) {
    return { isExpansion: false, newNodeDef: null };
  }
  const newNodeDef = input.proposedTopologyDelta.newNodeDef;
  if (
    !newNodeDef ||
    typeof newNodeDef.id !== 'string' ||
    newNodeDef.id.trim().length === 0
  ) {
    return { isExpansion: false, newNodeDef: null };
  }
  return input.proposedTopologyDelta;
}
