import { createCastInteractionReceipt } from './castInteraction';
import type { CastInteractionReceipt, IntentReceipt } from '../types/engineContract';
import type { CastTargetResolution } from './causalFeasibility';

export function getIntentBoundRequestedTransition(
  intentReceipt: IntentReceipt,
  proposedTarget: string | null
): string | null {
  if (intentReceipt.action_kind === 'MOVE') {
    return proposedTarget ?? null;
  }
  return null;
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
