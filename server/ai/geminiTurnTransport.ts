export const GEMINI_TURN_NULL_SENTINEL = '__TTM_NULL__' as const;

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSentinelField(record: JsonRecord, field: string): JsonRecord {
  if (record[field] !== GEMINI_TURN_NULL_SENTINEL) {
    return record;
  }

  return {
    ...record,
    [field]: null,
  };
}

function normalizeMissingNullableField(record: JsonRecord, field: string): JsonRecord {
  if (Object.prototype.hasOwnProperty.call(record, field)) {
    return normalizeSentinelField(record, field);
  }

  return {
    ...record,
    [field]: null,
  };
}

/**
 * Adapts the deliberately minimized Gemini transport schema to the canonical turn schema.
 * Gemini may omit the two optional transport properties that mean "no value"; only those
 * known nullable paths are completed with null. All HG1 envelopes and every non-nullable
 * canonical field still fail closed at the authoritative Zod boundary.
 */
export function normalizeGeminiTurnProviderPayload(payload: unknown): unknown {
  if (!isJsonRecord(payload)) {
    return payload;
  }

  const normalized: JsonRecord = { ...payload };

  if (isJsonRecord(payload.intent_proposal)) {
    normalized.intent_proposal = normalizeMissingNullableField(
      payload.intent_proposal,
      'action_subtype'
    );
  }

  if (isJsonRecord(payload.reconciliation_proposal)) {
    normalized.reconciliation_proposal = normalizeMissingNullableField(
      payload.reconciliation_proposal,
      'memory_echo_candidate'
    );
  }

  if (isJsonRecord(payload.world_memory_proposal)) {
    const proposal = payload.world_memory_proposal;
    normalized.world_memory_proposal = {
      ...proposal,
      ...(Array.isArray(proposal.candidates)
        ? {
            candidates: proposal.candidates.map((candidate) =>
              isJsonRecord(candidate)
                ? normalizeSentinelField(candidate, 'node_id')
                : candidate
            ),
          }
        : {}),
    };
  }

  return normalized;
}
