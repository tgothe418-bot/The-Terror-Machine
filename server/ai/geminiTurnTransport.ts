export const GEMINI_TURN_NULL_SENTINEL = '__TTM_NULL__' as const;

type JsonRecord = Record<string, unknown>;

const NEUTRAL_PROPOSAL_FIELDS = new Set(['kind', 'reason']);

const CAST_ACTIVITY_PROPOSAL_ACTIVE_FIELDS = new Set([
  'kind',
  'proposalId',
  'castMemberId',
  'pursuitId',
  'locationNodeId',
  'perceptionPath',
  'activitySummary',
  'authorityReferences',
  'manifestationBlock',
]);

const SITUATED_PRESSURE_PROPOSAL_ACTIVE_FIELDS = new Set([
  'kind',
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

const MANIFESTATION_PROSE_FIELDS = new Set(['type', 'content']);
const MANIFESTATION_DIALOGUE_FIELDS = new Set(['type', 'speaker', 'content']);

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

function projectProviderUnionBranch(
  record: JsonRecord,
  activeKind: string,
  activeFields: ReadonlySet<string>
): JsonRecord {
  const fields = record.kind === 'NONE'
    ? NEUTRAL_PROPOSAL_FIELDS
    : record.kind === activeKind
      ? activeFields
      : null;

  if (!fields) {
    return record;
  }

  return Object.fromEntries(
    Object.entries(record).filter(([key]) => fields.has(key))
  );
}

function normalizeManifestationBlock(value: unknown): unknown {
  if (!isJsonRecord(value)) {
    return value;
  }

  const fields = value.type === 'prose'
    ? MANIFESTATION_PROSE_FIELDS
    : value.type === 'dialogue'
      ? MANIFESTATION_DIALOGUE_FIELDS
      : null;

  if (!fields) {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([key]) => fields.has(key))
  );
}

function normalizeActiveManifestationBlock(record: JsonRecord): JsonRecord {
  if (!Object.prototype.hasOwnProperty.call(record, 'manifestationBlock')) {
    return record;
  }

  return {
    ...record,
    manifestationBlock: normalizeManifestationBlock(record.manifestationBlock),
  };
}

/**
 * Gemini's provider schema flattens each active/neutral discriminated union
 * into one object because the supported schema subset cannot express the
 * exact branch relationship. Project a recognized branch to its canonical
 * vocabulary before Zod validation so provider-only and opposite-branch keys
 * cannot invalidate an otherwise complete proposal. Missing fields, invalid
 * values, and unknown discriminants remain untouched and still fail closed at
 * the authoritative Zod boundary.
 */
function normalizeCastActivityProposal(record: JsonRecord): JsonRecord {
  const projected = projectProviderUnionBranch(
    record,
    'ACTIVITY',
    CAST_ACTIVITY_PROPOSAL_ACTIVE_FIELDS
  );

  return record.kind === 'ACTIVITY'
    ? normalizeActiveManifestationBlock(projected)
    : projected;
}

function normalizeSituatedPressureProposal(record: JsonRecord): JsonRecord {
  const projected = projectProviderUnionBranch(
    record,
    'PRESSURE',
    SITUATED_PRESSURE_PROPOSAL_ACTIVE_FIELDS
  );

  return record.kind === 'PRESSURE'
    ? normalizeActiveManifestationBlock(projected)
    : projected;
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

  if (isJsonRecord(payload.cast_activity_proposal)) {
    normalized.cast_activity_proposal = normalizeCastActivityProposal(
      payload.cast_activity_proposal
    );
  }

  if (isJsonRecord(payload.situated_pressure_proposal)) {
    normalized.situated_pressure_proposal = normalizeSituatedPressureProposal(
      payload.situated_pressure_proposal
    );
  }

  return normalized;
}
