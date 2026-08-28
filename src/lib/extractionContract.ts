import {
  CharacterCommunicationModeSchema,
  CharacterCommunicationMode,
  PresenceDispositionKindSchema,
  PresenceDispositionKind,
  ForgeSourceCandidateTargetSchema,
  ForgeSourceCandidateTarget,
  ForgeSourceEvidenceCategorySchema,
  ForgeSourceEvidenceCategory,
  ForgeValidationIssue,
  ForgeValidationIssueCode,
} from '../types/forge';
import { EdgeKindSchema, EdgeKind } from '../types/engineContract';
import {
  CharacterPursuitReviewWindowSchema,
  CharacterPursuitReviewWindow,
  CharacterPursuitStatusSchema,
  CharacterPursuitStatus,
} from '../types/horrorGrammar';

// ============================================================================
// Canonical Extraction Contract Constants (Directly derived from schema owners)
// ============================================================================

export const EXTRACTION_COMMUNICATION_MODES: readonly CharacterCommunicationMode[] =
  CharacterCommunicationModeSchema.options;

export const EXTRACTION_EDGE_KINDS: readonly EdgeKind[] = EdgeKindSchema.options;

export const EXTRACTION_VALUE_HOLDER_KINDS = [
  'CHARACTER',
  'RELATIONSHIP',
  'PLACE',
  'SCENARIO',
] as const;
export type ExtractionValueHolderKind = (typeof EXTRACTION_VALUE_HOLDER_KINDS)[number];

export const EXTRACTION_PRESENCE_KINDS: readonly PresenceDispositionKind[] =
  PresenceDispositionKindSchema.options;

export const EXTRACTION_PURSUIT_REVIEW_WINDOWS: readonly CharacterPursuitReviewWindow[] =
  CharacterPursuitReviewWindowSchema.options;

export const EXTRACTION_PURSUIT_STATUSES: readonly CharacterPursuitStatus[] =
  CharacterPursuitStatusSchema.options;

export const EXTRACTION_EVIDENCE_CATEGORIES: readonly ForgeSourceEvidenceCategory[] =
  ForgeSourceEvidenceCategorySchema.options;

export const EXTRACTION_CANDIDATE_TARGETS: readonly ForgeSourceCandidateTarget[] =
  ForgeSourceCandidateTargetSchema.options;

// Maximum diagnostic bounds
export const MAX_VALIDATION_ISSUES = 50;
export const MAX_ISSUE_MESSAGE_LENGTH = 300;
export const MAX_ISSUE_LABEL_LENGTH = 100;
export const MAX_ISSUE_FIELD_PATH_LENGTH = 200;
export const MAX_ALLOWED_VALUES_COUNT = 20;

// ============================================================================
// Deterministic Alias Normalization Tables & Helpers
// ============================================================================

/**
 * Normalizes communication mode strings to canonical enum values:
 * 'spoken' | 'nonverbal' | 'mediated'
 */
const COMMUNICATION_MODE_ALIAS_MAP: Record<string, CharacterCommunicationMode> = {
  // Spoken aliases
  spoken: 'spoken',
  verbal: 'spoken',
  speech: 'spoken',
  voice: 'spoken',
  dialogue: 'spoken',
  oral: 'spoken',
  vocal: 'spoken',
  talking: 'spoken',

  // Nonverbal aliases
  nonverbal: 'nonverbal',
  'non-verbal': 'nonverbal',
  non_verbal: 'nonverbal',
  gestural: 'nonverbal',
  gesture: 'nonverbal',
  'body language': 'nonverbal',
  body_language: 'nonverbal',
  bodylanguage: 'nonverbal',
  physical: 'nonverbal',
  sign: 'nonverbal',
  silent: 'nonverbal',
  facial: 'nonverbal',
  expression: 'nonverbal',

  // Mediated aliases
  mediated: 'mediated',
  telephone: 'mediated',
  phone: 'mediated',
  radio: 'mediated',
  written: 'mediated',
  channel: 'mediated',
  broadcast: 'mediated',
  text: 'mediated',
  intercom: 'mediated',
  device: 'mediated',
  recorded: 'mediated',
};

export function normalizeCommunicationMode(raw: unknown): CharacterCommunicationMode | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().toLowerCase();
  return COMMUNICATION_MODE_ALIAS_MAP[cleaned];
}

export function normalizeCommunicationModes(raw: unknown): CharacterCommunicationMode[] | undefined {
  if (typeof raw === 'string') {
    const single = normalizeCommunicationMode(raw);
    return single ? [single] : undefined;
  }
  if (Array.isArray(raw)) {
    const modes: CharacterCommunicationMode[] = [];
    for (const item of raw) {
      const mode = normalizeCommunicationMode(item);
      if (mode && !modes.includes(mode)) {
        modes.push(mode);
      } else if (!mode && typeof item === 'string' && item.trim()) {
        // If unmapped, return undefined so Zod validation catches it and quarantines cleanly
        return undefined;
      }
    }
    return modes.length > 0 ? modes : undefined;
  }
  return undefined;
}

/**
 * Normalizes topology connection kind strings to canonical EdgeKind:
 * 'PHYSICAL' | 'FORCED_EVENT' | 'MEMORY_RECONSTRUCTION' | 'HISTORICAL_REFERENCE' | 'TERMINAL_EJECTION' | 'AUTHORED_PARADOX'
 */
const EDGE_KIND_ALIAS_MAP: Record<string, EdgeKind> = {
  // PHYSICAL aliases
  PHYSICAL: 'PHYSICAL',
  DOOR: 'PHYSICAL',
  DOORWAY: 'PHYSICAL',
  CORRIDOR: 'PHYSICAL',
  HALLWAY: 'PHYSICAL',
  PASSAGE: 'PHYSICAL',
  PASSAGEWAY: 'PHYSICAL',
  PATH: 'PHYSICAL',
  PHYSICAL_PATH: 'PHYSICAL',
  'PHYSICAL-PATH': 'PHYSICAL',
  WALKWAY: 'PHYSICAL',
  PORTAL: 'PHYSICAL',
  ROOM_CONNECTION: 'PHYSICAL',
  ADJACENT: 'PHYSICAL',
  CONNECTED: 'PHYSICAL',
  STAIRS: 'PHYSICAL',
  STAIRCASE: 'PHYSICAL',

  // FORCED_EVENT aliases
  FORCED_EVENT: 'FORCED_EVENT',
  'FORCED-EVENT': 'FORCED_EVENT',
  FORCED: 'FORCED_EVENT',
  EVENT: 'FORCED_EVENT',
  TRAP: 'FORCED_EVENT',
  COLLAPSE: 'FORCED_EVENT',
  AMBUSH: 'FORCED_EVENT',

  // MEMORY_RECONSTRUCTION aliases
  MEMORY_RECONSTRUCTION: 'MEMORY_RECONSTRUCTION',
  'MEMORY-RECONSTRUCTION': 'MEMORY_RECONSTRUCTION',
  MEMORY: 'MEMORY_RECONSTRUCTION',
  RECONSTRUCTION: 'MEMORY_RECONSTRUCTION',
  FLASHBACK: 'MEMORY_RECONSTRUCTION',
  RECOLLECTION: 'MEMORY_RECONSTRUCTION',

  // HISTORICAL_REFERENCE aliases
  HISTORICAL_REFERENCE: 'HISTORICAL_REFERENCE',
  'HISTORICAL-REFERENCE': 'HISTORICAL_REFERENCE',
  HISTORICAL: 'HISTORICAL_REFERENCE',
  HISTORY: 'HISTORICAL_REFERENCE',
  LORE: 'HISTORICAL_REFERENCE',
  ARCHIVAL: 'HISTORICAL_REFERENCE',

  // TERMINAL_EJECTION aliases
  TERMINAL_EJECTION: 'TERMINAL_EJECTION',
  'TERMINAL-EJECTION': 'TERMINAL_EJECTION',
  TERMINAL: 'TERMINAL_EJECTION',
  EJECTION: 'TERMINAL_EJECTION',
  EXIT: 'TERMINAL_EJECTION',
  EXPULSION: 'TERMINAL_EJECTION',

  // AUTHORED_PARADOX aliases
  AUTHORED_PARADOX: 'AUTHORED_PARADOX',
  'AUTHORED-PARADOX': 'AUTHORED_PARADOX',
  PARADOX: 'AUTHORED_PARADOX',
  ANOMALY: 'AUTHORED_PARADOX',
  IMPOSSIBILITY: 'AUTHORED_PARADOX',
  NON_EUCLIDEAN: 'AUTHORED_PARADOX',
};

export function normalizeEdgeKind(raw: unknown): EdgeKind | undefined {
  if (typeof raw !== 'string') return undefined;
  const cleaned = raw.trim().toUpperCase().replace(/-/g, '_');
  return EDGE_KIND_ALIAS_MAP[cleaned];
}

/**
 * Normalizes value holder objects to match ValueHolderRefSchema:
 * - CHARACTER (requires castMemberId)
 * - RELATIONSHIP (requires castMemberIds tuple)
 * - PLACE (requires nodeId)
 * - SCENARIO (no extra fields)
 */
export function normalizeValueHolder(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = { ...(raw as Record<string, unknown>) };
  const rawKind = typeof obj.kind === 'string' ? obj.kind.trim().toUpperCase() : '';

  // CHARACTER aliases
  if (
    rawKind === 'CHARACTER' ||
    rawKind === 'CASTMEMBER' ||
    rawKind === 'CAST_MEMBER' ||
    rawKind === 'PERSON' ||
    rawKind === 'ACTOR' ||
    rawKind === 'INDIVIDUAL' ||
    rawKind === 'SUBJECT' ||
    rawKind === 'ENTITY'
  ) {
    const castMemberId =
      typeof obj.castMemberId === 'string' && obj.castMemberId.trim()
        ? obj.castMemberId.trim()
        : typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : typeof obj.targetCastMemberId === 'string' && obj.targetCastMemberId.trim()
            ? obj.targetCastMemberId.trim()
            : undefined;
    if (castMemberId) {
      return { kind: 'CHARACTER', castMemberId };
    }
    return { ...obj, kind: 'CHARACTER' };
  }

  // RELATIONSHIP aliases
  if (
    rawKind === 'RELATIONSHIP' ||
    rawKind === 'RELATION' ||
    rawKind === 'PAIR' ||
    rawKind === 'INTERPERSONAL' ||
    rawKind === 'BOND'
  ) {
    let castMemberIds = Array.isArray(obj.castMemberIds)
      ? obj.castMemberIds.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      : undefined;
    if (!castMemberIds && Array.isArray(obj.members)) {
      castMemberIds = obj.members.filter((id): id is string => typeof id === 'string' && id.trim().length > 0);
    }
    if (castMemberIds && castMemberIds.length === 2 && castMemberIds[0] !== castMemberIds[1]) {
      return { kind: 'RELATIONSHIP', castMemberIds };
    }
    return { ...obj, kind: 'RELATIONSHIP' };
  }

  // PLACE aliases
  if (
    rawKind === 'PLACE' ||
    rawKind === 'LOCATION' ||
    rawKind === 'NODE' ||
    rawKind === 'SPACE' ||
    rawKind === 'ROOM' ||
    rawKind === 'AREA'
  ) {
    const nodeId =
      typeof obj.nodeId === 'string' && obj.nodeId.trim()
        ? obj.nodeId.trim()
        : typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : undefined;
    if (nodeId) {
      return { kind: 'PLACE', nodeId };
    }
    return { ...obj, kind: 'PLACE' };
  }

  // SCENARIO aliases
  if (
    rawKind === 'SCENARIO' ||
    rawKind === 'WORLD' ||
    rawKind === 'GLOBAL' ||
    rawKind === 'ENVIRONMENT' ||
    rawKind === 'SETTING' ||
    rawKind === 'STORY'
  ) {
    return { kind: 'SCENARIO' };
  }

  return obj;
}

/**
 * Normalizes character presence disposition objects:
 * - AT_NODE (nodeId)
 * - OFFSTAGE
 * - NONLOCAL
 */
export function normalizePresenceDisposition(raw: unknown): Record<string, unknown> | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = { ...(raw as Record<string, unknown>) };
  const rawKind = typeof obj.kind === 'string' ? obj.kind.trim().toUpperCase() : '';

  if (
    rawKind === 'AT_NODE' ||
    rawKind === 'ATNODE' ||
    rawKind === 'NODE' ||
    rawKind === 'LOCATION' ||
    rawKind === 'PRESENT' ||
    rawKind === 'IN_ROOM' ||
    rawKind === 'ROOM' ||
    rawKind === 'PLACE' ||
    rawKind === 'SPATIAL'
  ) {
    const nodeId =
      typeof obj.nodeId === 'string' && obj.nodeId.trim()
        ? obj.nodeId.trim()
        : typeof obj.id === 'string' && obj.id.trim()
          ? obj.id.trim()
          : undefined;
    if (nodeId) {
      return { kind: 'AT_NODE', nodeId };
    }
    return { ...obj, kind: 'AT_NODE' };
  }

  if (
    rawKind === 'OFFSTAGE' ||
    rawKind === 'OFF_STAGE' ||
    rawKind === 'OFF-STAGE' ||
    rawKind === 'ABSENT' ||
    rawKind === 'HIDDEN' ||
    rawKind === 'WAITING'
  ) {
    return { kind: 'OFFSTAGE' };
  }

  if (
    rawKind === 'NONLOCAL' ||
    rawKind === 'NON_LOCAL' ||
    rawKind === 'NON-LOCAL' ||
    rawKind === 'OMNIPRESENT' ||
    rawKind === 'EVERYWHERE' ||
    rawKind === 'AMBIENT'
  ) {
    return { kind: 'NONLOCAL' };
  }

  return obj;
}

/**
 * Normalizes candidate fields deterministically before schema validation.
 */
export function normalizeCandidateAliases(
  rawCandidate: Record<string, unknown>
): Record<string, unknown> {
  const candidate = { ...rawCandidate };
  const target = candidate.target;
  let proposedValue = candidate.proposedValue;

  if (proposedValue && typeof proposedValue === 'object' && !Array.isArray(proposedValue)) {
    const obj = { ...(proposedValue as Record<string, unknown>) };

    // 1. Cast expression guidance
    if (target === 'cast_expression_guidance') {
      if (obj.communicationModes !== undefined) {
        const normalizedModes = normalizeCommunicationModes(obj.communicationModes);
        if (normalizedModes) {
          obj.communicationModes = normalizedModes;
        }
      }
      proposedValue = obj;
    }

    // 2. Topology connection
    else if (target === 'topology_connection') {
      if (obj.kind !== undefined) {
        const normalizedKind = normalizeEdgeKind(obj.kind);
        if (normalizedKind) {
          obj.kind = normalizedKind;
        }
      }
      proposedValue = obj;
    }

    // 3. Value anchor
    else if (target === 'value_anchor') {
      if (obj.holder !== undefined) {
        const normalizedHolder = normalizeValueHolder(obj.holder);
        if (normalizedHolder) {
          obj.holder = normalizedHolder;
        }
      }
      proposedValue = obj;
    }

    // 4. Cast opening placement
    else if (target === 'cast_opening_placement') {
      const normalizedPlacement = normalizePresenceDisposition(obj);
      if (normalizedPlacement) {
        proposedValue = normalizedPlacement;
      }
    }

    // 5. Cast seed presence disposition and expressionProfile
    else if (target === 'cast_seed') {
      if (obj.presenceDisposition !== undefined) {
        const normalizedPlacement = normalizePresenceDisposition(obj.presenceDisposition);
        if (normalizedPlacement) {
          obj.presenceDisposition = normalizedPlacement;
        }
      }
      if (obj.expressionProfile && typeof obj.expressionProfile === 'object') {
        const expObj = { ...(obj.expressionProfile as Record<string, unknown>) };
        if (expObj.communicationModes !== undefined) {
          const normalizedModes = normalizeCommunicationModes(expObj.communicationModes);
          if (normalizedModes) {
            expObj.communicationModes = normalizedModes;
          }
        }
        obj.expressionProfile = expObj;
      }
      proposedValue = obj;
    }
  }

  candidate.proposedValue = proposedValue;
  return candidate;
}

// ============================================================================
// Sanitized Issue Building
// ============================================================================

/**
 * Creates a bounded, sanitized ForgeValidationIssue without sensitive payloads.
 */
export function createQuarantinedIssue(
  sourceId: string,
  candidateIndex: number,
  candidate: Record<string, unknown>,
  errorInfo: {
    fieldPath: string;
    code: ForgeValidationIssueCode;
    message: string;
    allowedValues?: readonly string[];
  }
): ForgeValidationIssue {
  const candidateTarget =
    typeof candidate.target === 'string'
      ? candidate.target.slice(0, MAX_ISSUE_LABEL_LENGTH)
      : undefined;

  const label =
    typeof candidate.label === 'string'
      ? candidate.label.slice(0, MAX_ISSUE_LABEL_LENGTH)
      : undefined;

  const fieldPath = (errorInfo.fieldPath || 'proposedValue').slice(0, MAX_ISSUE_FIELD_PATH_LENGTH);
  const message = errorInfo.message.slice(0, MAX_ISSUE_MESSAGE_LENGTH);

  const allowedValues = errorInfo.allowedValues
    ? errorInfo.allowedValues.slice(0, MAX_ALLOWED_VALUES_COUNT).map((v) => v.slice(0, 100))
    : undefined;

  return {
    id: `${sourceId}-issue-${candidateIndex}`,
    sourceId,
    candidateIndex,
    candidateTarget,
    label,
    fieldPath,
    code: errorInfo.code,
    message,
    allowedValues,
    disposition: 'QUARANTINED',
  };
}

// ============================================================================
// Structured Extraction Prompt Builder
// ============================================================================

export function getForgeExtractionPrompt(fileName: string): string {
  return `You are the Forge Source Baseline Analyst for an atmospheric text-based horror engine.
Read the attached source document ("${fileName}").
Extract explicit evidence, candidate fields for authoring review, and identified gaps/unknowns.

OUTPUT FORMAT REQUIREMENTS:
You MUST output ONLY a valid JSON object matching this schema. Do not include markdown formatting or conversational text outside the JSON block.

{
  "summary": "Short 1-2 sentence overview of the analyzed document and its key themes.",
  "evidence": [
    {
      "id": "ev-1",
      "category": "one of: ${EXTRACTION_EVIDENCE_CATEGORIES.join(', ')}",
      "claim": "Clear claim of what this fact or element is",
      "excerpt": "Verbatim quote or short passage snippet from document if available"
    }
  ],
  "candidates": [
    {
      "id": "cand-1",
      "classification": "evidence or inference",
      "target": "one of: ${EXTRACTION_CANDIDATE_TARGETS.join(', ')}",
      "label": "Short human-readable label",
      "explanation": "Why this candidate was extracted from the evidence",
      "evidenceIds": ["ev-1"],
      "proposedValue": "Target-specific typed value matching EXACT schema rules below",
      "targetCastMemberId": "optional cast member ID (strictly required if target is cast_expression_guidance, cast_opening_placement, character_pursuit, or user_opening_aim_default)"
    }
  ],
  "unknowns": [
    {
      "id": "unk-1",
      "category": "one of: ${EXTRACTION_EVIDENCE_CATEGORIES.join(', ')}",
      "question": "Important gap or ambiguity in the source material requiring creator decision",
      "targetEffect": "Brief statement of why resolving this matters to the simulation or runtime behavior"
    }
  ]
}

CRITICAL EXTRACTION SCHEMAS & ENUMS:
1. 'cast_expression_guidance':
   - proposedValue: { "communicationModes": ["${EXTRACTION_COMMUNICATION_MODES.join('" | "')}"], "expressionGuidance": string, "silenceGuidance"?: string }
   - targetCastMemberId: string (REQUIRED)

2. 'topology_connection':
   - proposedValue: { "from": string, "to": string, "kind": "${EXTRACTION_EDGE_KINDS.join('" | "')}", "requires"?: string[], "userInitiated": boolean }

3. 'value_anchor':
   - proposedValue: {
       "id": string,
       "holder": 
         | { "kind": "CHARACTER", "castMemberId": string }
         | { "kind": "RELATIONSHIP", "castMemberIds": [string, string] }
         | { "kind": "PLACE", "nodeId": string }
         | { "kind": "SCENARIO" },
       "label": string (max 100 chars),
       "description": string (max 1000 chars),
       "basisSummary": string (max 1000 chars),
       "provenance": { "kind": "REVIEWED_SOURCE", "sourceId": string, "evidenceIds": string[] }
     }

4. 'cast_opening_placement':
   - proposedValue:
       | { "kind": "AT_NODE", "nodeId": string }
       | { "kind": "OFFSTAGE" }
       | { "kind": "NONLOCAL" }
   - targetCastMemberId: string (REQUIRED)

5. 'character_pursuit':
   - proposedValue: {
       "id": string,
       "castMemberId": string,
       "objective": string,
       "presentApproach": string,
       "locationNodeId"?: string,
       "status": "${EXTRACTION_PURSUIT_STATUSES.join('" | "')}",
       "reviewWindow": "${EXTRACTION_PURSUIT_REVIEW_WINDOWS.join('" | "')}",
       "triggerReferences": string[],
       "basisSummary": string,
       "provenance": { "kind": "REVIEWED_SOURCE", "sourceId": string, "evidenceIds": string[] }
     }
   - targetCastMemberId: string (REQUIRED)

6. 'cast_seed':
   - proposedValue: { "id"?: string, "name": string, "role": string, "description"?: string, "isEntity": boolean, "isUserCharacter": boolean, "behaviorVector"?: string, "vulnerabilityBase"?: { "resilience": number, "skepticism": number, "baggage": number } }
   - Explicit "isUserCharacter" boolean is strictly required.

7. 'user_opening_aim_default':
   - proposedValue: { "castMemberId"?: string, "aimText": string }
   - targetCastMemberId: string (REQUIRED)

8. 'topology_node':
   - proposedValue: { "id": string, "label": string, "description"?: string, "sensoryGuidance"?: string }

9. 'expandable_space_anchor':
   - proposedValue: { "id": string, "parentNodeId": string, "label": string, "description"?: string, "statement"?: string }

10. String Targets:
   - 'scenario_title': String title.
   - 'premise': String scenario premise.
   - 'setting_location': String location name.
   - 'setting_atmosphere': String atmosphere / tone.
   - 'setting_time_period': String time period.
   - 'environmental_rule': String environmental rule.
   - 'narrative_rule': String narrative rule.
   - 'starting_node_selection': String node ID.
   - 'initial_topology_node': String initial node name.
   - 'reference_attribution': String file name ("${fileName}").

EXTRACTION POLICIES:
- Extract all primary characters and entities/monsters found in the document.
- Link candidate evidenceIds to corresponding entries in the evidence list.
- Keep opening topology compact: map primary spaces as topology_nodes and secondary areas as expandable_space_anchors.
`;
}
