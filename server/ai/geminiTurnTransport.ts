export const GEMINI_TURN_NULL_SENTINEL = '__TTM_NULL__' as const;

type JsonRecord = Record<string, unknown>;

const SITUATED_PRESSURE_PROPOSAL_FIELDS = new Set([
  'kind',
  'reason',
  'proposalId',
  'valueAnchorId',
  'sourceReference',
  'operator',
  'affectedDimension',
  'adverseProspect',
  'authorityReferences',
  'persistenceTarget',
  'responseWindowOpen',
  'manifestationBlock',
]);

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
 * Gemini's provider schema cannot express the active/neutral discriminated
 * union as an exact object. It can occasionally add descriptive root keys to
 * this one envelope. Discard only keys outside the complete transport field
 * vocabulary; Zod still rejects missing fields, invalid values, and fields
 * which are invalid for the selected `kind` (for example `reason` on
 * `PRESSURE`).
 */
function normalizeSituatedPressureProposal(record: JsonRecord): JsonRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([key]) => SITUATED_PRESSURE_PROPOSAL_FIELDS.has(key))
  );
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

  if (isJsonRecord(payload.situated_pressure_proposal)) {
    normalized.situated_pressure_proposal = normalizeSituatedPressureProposal(
      payload.situated_pressure_proposal
    );
  }

  return normalized;
}
