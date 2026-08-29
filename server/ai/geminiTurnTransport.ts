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

/**
 * Converts only the explicit Gemini transport sentinel at known nullable paths.
 * Missing fields are deliberately left missing so the canonical Zod schema fails closed.
 */
export function normalizeGeminiTurnProviderPayload(payload: unknown): unknown {
  if (!isJsonRecord(payload)) {
    return payload;
  }

  const normalized: JsonRecord = { ...payload };

  if (isJsonRecord(payload.intent_proposal)) {
    normalized.intent_proposal = normalizeSentinelField(
      payload.intent_proposal,
      'action_subtype'
    );
  }

  if (isJsonRecord(payload.reconciliation_proposal)) {
    normalized.reconciliation_proposal = normalizeSentinelField(
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
