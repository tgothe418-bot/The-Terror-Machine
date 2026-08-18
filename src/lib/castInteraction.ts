import { CastInteractionReceipt } from '../types/engineContract';

export interface CastInteractionReceiptInput {
  addressedCharacterId?: string | null;
  respondingCharacterId?: string | null;
}

function normalizeCharacterId(id?: string | null): string | null {
  if (typeof id !== 'string') return null;
  const trimmed = id.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function createCastInteractionReceipt(
  input: CastInteractionReceiptInput,
): CastInteractionReceipt {
  const addressedCharacterId = normalizeCharacterId(input.addressedCharacterId);
  const respondingCharacterId = normalizeCharacterId(input.respondingCharacterId);

  let outcome: CastInteractionReceipt['outcome'];

  if (addressedCharacterId !== null && respondingCharacterId !== null) {
    if (addressedCharacterId === respondingCharacterId) {
      outcome = 'RESPONDED';
    } else {
      outcome = 'MISMATCH';
    }
  } else if (addressedCharacterId !== null && respondingCharacterId === null) {
    outcome = 'ADDRESS_UNANSWERED';
  } else if (addressedCharacterId === null && respondingCharacterId !== null) {
    outcome = 'UNSOLICITED_DIALOGUE';
  } else {
    outcome = 'NONE';
  }

  return {
    version: 1,
    addressedCharacterId,
    respondingCharacterId,
    outcome,
  };
}
