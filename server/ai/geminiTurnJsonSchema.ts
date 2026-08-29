import {
  ACTION_KINDS,
  ACTION_SUBTYPES,
  PRESSURE_DIRECTIONS,
  DRAMATIC_TACTICS,
  INTENT_SYNERGIES,
  RECONCILIATION_MODES,
  RECONCILIATION_FEASIBILITIES,
  RECONCILIATION_REASON_CODES,
  FICTIONAL_TIME_COSTS,
  AUTHORITY_ALIGNMENTS,
} from '../schemas/engine';
import {
  PERCEPTION_PATHS,
  PRESSURE_OPERATORS,
  AFFECTED_DIMENSIONS,
  PERSISTENCE_TARGETS,
  VALUE_LIFECYCLES,
  VALUE_CONDITIONS,
  VALUE_OPERATIONS,
  PURSUIT_STATUSES,
  PURSUIT_OPERATIONS,
  DEVELOPMENT_DIMENSIONS,
  DEVELOPMENT_OPERATIONS,
  PRESSURE_THREAD_TERMINAL_STATUSES,
  MAX_VALUE_STATE_CHANGES_PER_TURN,
  MAX_CHARACTER_PURSUIT_CHANGES_PER_TURN,
  MAX_CHARACTER_DEVELOPMENT_CHANGES_PER_TURN,
  MAX_PRESSURE_THREAD_TRANSITIONS_PER_TURN,
} from '../../src/types/horrorGrammar';
import { MAX_CONSEQUENCE_MUTATIONS } from '../../src/types/consequence';
import { MAX_STANCE_CHANGES_PER_TURN } from '../../src/types/characterStance';
import { MAX_RELATIONSHIP_CHANGES_PER_TURN } from '../../src/types/characterRelationships';
import { MAX_CHARACTER_MEMORY_PROPOSALS } from '../../src/types/characterMemory';
import { MAX_WORLD_MEMORY_CANDIDATES } from '../../src/types/worldMemory';
import { GEMINI_TURN_NULL_SENTINEL } from './geminiTurnTransport';

export type GeminiJsonSchema = {
  type?: string | readonly string[];
  description?: string;
  properties?: Readonly<Record<string, GeminiJsonSchema>>;
  required?: readonly string[];
  items?: GeminiJsonSchema;
  enum?: readonly (string | number | boolean)[];
  minItems?: number;
  maxItems?: number;
  minimum?: number;
  maximum?: number;
};

const ALLOWED_SCHEMA_KEYS = new Set([
  'type',
  'description',
  'properties',
  'required',
  'items',
  'enum',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
]);

const SUPPORTED_PRIMITIVES = new Set([
  'string',
  'number',
  'integer',
  'boolean',
  'array',
  'object',
  'null',
]);

const REQUIRED_ROOT_FIELDS = [
  'narrative_blocks',
  'intent_proposal',
  'reconciliation_proposal',
  'consequence_proposal',
  'character_stance_proposal',
  'character_relationship_proposal',
  'character_memory_proposal',
  'world_memory_proposal',
  'cast_activity_proposal',
  'situated_pressure_proposal',
  'value_state_proposal',
  'character_pursuit_proposal',
  'character_development_proposal',
  'pressure_transition_proposal',
  'logic_state',
] as const;

export function assertGeminiJsonSchemaSubset(schema: unknown, path = '$'): void {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    throw new Error(`[assertGeminiJsonSchemaSubset] Schema at path "${path}" must be a non-null object.`);
  }

  const obj = schema as Record<string, unknown>;

  for (const key of Object.keys(obj)) {
    if (!ALLOWED_SCHEMA_KEYS.has(key)) {
      throw new Error(
        `[assertGeminiJsonSchemaSubset] Disallowed schema keyword "${key}" at path "${path}". Only documented allowlist keys are permitted.`
      );
    }
  }

  if ('type' in obj && obj.type !== undefined) {
    const types = Array.isArray(obj.type) ? obj.type : [obj.type];
    for (const t of types) {
      if (typeof t !== 'string' || !SUPPORTED_PRIMITIVES.has(t)) {
        throw new Error(
          `[assertGeminiJsonSchemaSubset] Unsupported type "${String(t)}" at path "${path}". Type must be a lowercase supported primitive.`
        );
      }
    }
  }

  const isObjectType =
    obj.type === 'object' ||
    (Array.isArray(obj.type) && obj.type.includes('object')) ||
    (!obj.type && Boolean(obj.properties));

  if (isObjectType) {
    if (!obj.properties || typeof obj.properties !== 'object' || Array.isArray(obj.properties)) {
      throw new Error(`[assertGeminiJsonSchemaSubset] Object node at path "${path}" must declare a properties object.`);
    }
    const propKeys = Object.keys(obj.properties);
    if (propKeys.length === 0) {
      throw new Error(`[assertGeminiJsonSchemaSubset] Object node at path "${path}" must contain at least one property.`);
    }

    if ('required' in obj && obj.required !== undefined) {
      if (!Array.isArray(obj.required)) {
        throw new Error(`[assertGeminiJsonSchemaSubset] "required" at path "${path}" must be an array of strings.`);
      }
      for (const reqField of obj.required) {
        if (typeof reqField !== 'string' || !(reqField in obj.properties)) {
          throw new Error(
            `[assertGeminiJsonSchemaSubset] Required field "${String(reqField)}" at path "${path}" does not exist in properties.`
          );
        }
      }
    }

    for (const [propName, propSchema] of Object.entries(obj.properties)) {
      assertGeminiJsonSchemaSubset(propSchema, `${path}.${propName}`);
    }
  }

  const isArrayType =
    obj.type === 'array' ||
    (Array.isArray(obj.type) && obj.type.includes('array')) ||
    (!obj.type && Boolean(obj.items));

  if (isArrayType) {
    if (!obj.items) {
      throw new Error(`[assertGeminiJsonSchemaSubset] Array node at path "${path}" must declare an items schema.`);
    }
    assertGeminiJsonSchemaSubset(obj.items, `${path}.items`);
  }

  for (const numKey of ['minItems', 'maxItems', 'minimum', 'maximum'] as const) {
    if (numKey in obj && obj[numKey] !== undefined) {
      if (typeof obj[numKey] !== 'number' || !Number.isFinite(obj[numKey])) {
        throw new Error(
          `[assertGeminiJsonSchemaSubset] Numeric constraint "${numKey}" at path "${path}" must be a finite number, received ${typeof obj[numKey]}.`
        );
      }
    }
  }

  if ('enum' in obj && obj.enum !== undefined) {
    if (!Array.isArray(obj.enum) || obj.enum.length === 0) {
      throw new Error(`[assertGeminiJsonSchemaSubset] "enum" at path "${path}" must be a non-empty array.`);
    }
    for (const val of obj.enum) {
      const valType = typeof val;
      if (valType !== 'string' && valType !== 'number' && valType !== 'boolean') {
        throw new Error(
          `[assertGeminiJsonSchemaSubset] Enum value ${JSON.stringify(val)} at path "${path}" must be a primitive string, number, or boolean.`
        );
      }
    }
  }

  if (path === '$') {
    if (obj.type !== 'object') {
      throw new Error(`[assertGeminiJsonSchemaSubset] Root schema must have type "object".`);
    }
    const rootRequired = new Set(Array.isArray(obj.required) ? obj.required : []);
    for (const reqField of REQUIRED_ROOT_FIELDS) {
      if (!rootRequired.has(reqField)) {
        throw new Error(
          `[assertGeminiJsonSchemaSubset] Root required set must include required field "${reqField}".`
        );
      }
    }
  }
}

export const geminiTurnResponseJsonSchema: GeminiJsonSchema = {
  type: 'object',
  properties: {
    engine_thoughts: {
      type: 'string',
    },
    narrative_blocks: {
      type: 'array',
      maxItems: 2,
      items: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['prose', 'dialogue', 'system_voice', 'environmental_description'],
          },
          speaker: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['type', 'content'],
      },
    },
    intent_proposal: {
      type: 'object',
      properties: {
        action_kind: { type: 'string', enum: [...ACTION_KINDS] },
        action_subtype: {
          type: 'string',
          enum: [...ACTION_SUBTYPES, GEMINI_TURN_NULL_SENTINEL],
          description: `Use ${GEMINI_TURN_NULL_SENTINEL} when no action subtype applies.`,
        },
        pressure_direction: { type: 'string', enum: [...PRESSURE_DIRECTIONS] },
        dramatic_tactic: { type: 'string', enum: [...DRAMATIC_TACTICS] },
        intent_synergy: { type: 'string', enum: [...INTENT_SYNERGIES] },
      },
      required: [
        'action_kind',
        'action_subtype',
        'pressure_direction',
        'dramatic_tactic',
        'intent_synergy',
      ],
    },
    reconciliation_proposal: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: [...RECONCILIATION_MODES] },
        feasibility: { type: 'string', enum: [...RECONCILIATION_FEASIBILITIES] },
        reason_code: { type: 'string', enum: [...RECONCILIATION_REASON_CODES] },
        fictional_time_cost: { type: 'string', enum: [...FICTIONAL_TIME_COSTS] },
        authority_alignment: { type: 'string', enum: [...AUTHORITY_ALIGNMENTS] },
        memory_echo_candidate: {
          type: 'string',
          description: `Use ${GEMINI_TURN_NULL_SENTINEL} when no memory echo is proposed.`,
        },
      },
      required: [
        'mode',
        'feasibility',
        'reason_code',
        'fictional_time_cost',
        'authority_alignment',
        'memory_echo_candidate',
      ],
    },
    consequence_proposal: {
      type: 'object',
      properties: {
        mutations: {
          type: 'array',
          maxItems: MAX_CONSEQUENCE_MUTATIONS,
          items: {
            type: 'object',
            properties: {
              domain: {
                type: 'string',
                enum: ['INVENTORY', 'PLAYER_INJURY', 'PSYCHOLOGICAL_STATUS'],
              },
              operation: { type: 'string', enum: ['ADD', 'REMOVE', 'SET'] },
              value: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['domain', 'operation', 'value', 'rationale'],
          },
        },
      },
      required: ['mutations'],
    },
    character_stance_proposal: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          maxItems: MAX_STANCE_CHANGES_PER_TURN,
          items: {
            type: 'object',
            properties: {
              character_id: { type: 'string' },
              focus: { type: 'string', enum: ['PLAYER', 'SITUATION'] },
              stance: {
                type: 'string',
                enum: ['OPEN', 'GUARDED', 'RESISTANT', 'HOSTILE', 'AFRAID', 'WITHDRAWN'],
              },
              rationale: { type: 'string' },
            },
            required: ['character_id', 'focus', 'stance', 'rationale'],
          },
        },
      },
      required: ['changes'],
    },
    character_relationship_proposal: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          maxItems: MAX_RELATIONSHIP_CHANGES_PER_TURN,
          items: {
            type: 'object',
            properties: {
              source_character_id: { type: 'string' },
              target_character_id: { type: 'string' },
              kind: {
                type: 'string',
                enum: ['TRUST', 'HOSTILITY', 'DEPENDENCE', 'LEVERAGE'],
              },
              delta: {
                type: 'integer',
                minimum: -1,
                maximum: 1,
              },
              rationale: { type: 'string' },
            },
            required: [
              'source_character_id',
              'target_character_id',
              'kind',
              'delta',
              'rationale',
            ],
          },
        },
      },
      required: ['changes'],
    },
    character_memory_proposal: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          maxItems: MAX_CHARACTER_MEMORY_PROPOSALS,
          items: {
            type: 'object',
            properties: {
              character_id: { type: 'string' },
              fact: { type: 'string' },
              source: { type: 'string', enum: ['OBSERVED', 'TOLD'] },
              certainty: { type: 'string', enum: ['KNOWN', 'BELIEVED'] },
              rationale: { type: 'string' },
            },
            required: ['character_id', 'fact', 'source', 'certainty', 'rationale'],
          },
        },
      },
      required: ['candidates'],
    },
    world_memory_proposal: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          maxItems: MAX_WORLD_MEMORY_CANDIDATES,
          items: {
            type: 'object',
            properties: {
              kind: {
                type: 'string',
                enum: [
                  'ESTABLISHED_FACT',
                  'DISCOVERED_EVIDENCE',
                  'ENVIRONMENTAL_CONDITION',
                  'PERSISTENT_CONSEQUENCE',
                ],
              },
              scope: { type: 'string', enum: ['GLOBAL', 'NODE'] },
              node_id: {
                type: 'string',
                description: `Use ${GEMINI_TURN_NULL_SENTINEL} for GLOBAL scope; use the exact node ID for NODE scope.`,
              },
              statement: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['kind', 'scope', 'node_id', 'statement', 'rationale'],
          },
        },
      },
      required: ['candidates'],
    },
    cast_activity_proposal: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['NONE', 'ACTIVITY'] },
        reason: { type: 'string' },
        proposalId: { type: 'string' },
        castMemberId: { type: 'string' },
        pursuitId: { type: 'string' },
        locationNodeId: { type: 'string' },
        perceptionPath: { type: 'string', enum: [...PERCEPTION_PATHS] },
        activitySummary: { type: 'string' },
        authorityReferences: { type: 'array', items: { type: 'string' } },
        manifestationBlock: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['prose', 'dialogue'] },
            speaker: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['type', 'content'],
        },
      },
      required: ['kind'],
    },
    situated_pressure_proposal: {
      type: 'object',
      properties: {
        kind: { type: 'string', enum: ['NONE', 'PRESSURE'] },
        reason: { type: 'string' },
        proposalId: { type: 'string' },
        valueAnchorId: { type: 'string' },
        sourceReference: { type: 'string' },
        operator: { type: 'string', enum: [...PRESSURE_OPERATORS] },
        affectedDimension: { type: 'string', enum: [...AFFECTED_DIMENSIONS] },
        adverseProspect: { type: 'string' },
        authorityReferences: { type: 'array', items: { type: 'string' } },
        persistenceTarget: { type: 'string', enum: [...PERSISTENCE_TARGETS] },
        responseWindowOpen: { type: 'boolean' },
        manifestationBlock: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['prose', 'dialogue'] },
            speaker: { type: 'string' },
            content: { type: 'string' },
          },
          required: ['type', 'content'],
        },
      },
      required: ['kind'],
    },
    value_state_proposal: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          maxItems: MAX_VALUE_STATE_CHANGES_PER_TURN,
          items: {
            type: 'object',
            properties: {
              anchorId: { type: 'string' },
              operation: { type: 'string', enum: [...VALUE_OPERATIONS] },
              expectedBeforeCondition: { type: 'string', enum: [...VALUE_CONDITIONS] },
              expectedBeforeLifecycle: { type: 'string', enum: [...VALUE_LIFECYCLES] },
              proposedCondition: { type: 'string', enum: [...VALUE_CONDITIONS] },
              proposedLifecycle: { type: 'string', enum: [...VALUE_LIFECYCLES] },
              proposedFormNote: { type: 'string' },
              causeReference: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: [
              'anchorId',
              'operation',
              'proposedCondition',
              'causeReference',
              'rationale',
            ],
          },
        },
      },
      required: ['changes'],
    },
    character_pursuit_proposal: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          maxItems: MAX_CHARACTER_PURSUIT_CHANGES_PER_TURN,
          items: {
            type: 'object',
            properties: {
              pursuitId: { type: 'string' },
              operation: { type: 'string', enum: [...PURSUIT_OPERATIONS] },
              expectedStatus: { type: 'string', enum: [...PURSUIT_STATUSES] },
              proposedObjective: { type: 'string' },
              proposedApproach: { type: 'string' },
              proposedLocationNodeId: { type: 'string' },
              proposedStatus: { type: 'string', enum: [...PURSUIT_STATUSES] },
              progressSummary: { type: 'string' },
              causeReference: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: [
              'pursuitId',
              'operation',
              'progressSummary',
              'causeReference',
              'rationale',
            ],
          },
        },
      },
      required: ['changes'],
    },
    character_development_proposal: {
      type: 'object',
      properties: {
        changes: {
          type: 'array',
          maxItems: MAX_CHARACTER_DEVELOPMENT_CHANGES_PER_TURN,
          items: {
            type: 'object',
            properties: {
              castMemberId: { type: 'string' },
              operation: { type: 'string', enum: [...DEVELOPMENT_OPERATIONS] },
              targetFactId: { type: 'string' },
              dimension: { type: 'string', enum: [...DEVELOPMENT_DIMENSIONS] },
              statement: { type: 'string' },
              causeReference: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: [
              'castMemberId',
              'operation',
              'dimension',
              'statement',
              'causeReference',
              'rationale',
            ],
          },
        },
      },
      required: ['changes'],
    },
    pressure_transition_proposal: {
      type: 'object',
      properties: {
        transitions: {
          type: 'array',
          maxItems: MAX_PRESSURE_THREAD_TRANSITIONS_PER_TURN,
          items: {
            type: 'object',
            properties: {
              threadId: { type: 'string' },
              proposedStatus: {
                type: 'string',
                enum: [...PRESSURE_THREAD_TERMINAL_STATUSES],
              },
              causeReference: { type: 'string' },
              replacementAdverseProspect: { type: 'string' },
              rationale: { type: 'string' },
            },
            required: ['threadId', 'proposedStatus', 'causeReference', 'rationale'],
          },
        },
      },
      required: ['transitions'],
    },
    logic_state: {
      type: 'object',
      properties: {
        current_phase: { type: 'string' },
        requested_transition: {
          type: 'string',
        },
        suggested_tension: {
          type: 'integer',
          minimum: 0,
          maximum: 100,
        },
        terminal_flags: { type: 'array', items: { type: 'string' } },
        cast_deltas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              character_id: { type: 'string' },
              skepticism_delta: { type: 'number' },
            },
            required: ['character_id', 'skepticism_delta'],
          },
        },
      },
      required: ['current_phase', 'suggested_tension', 'terminal_flags', 'cast_deltas'],
    },
    topologyDelta: {
      type: 'object',
      properties: {
        isExpansion: { type: 'boolean' },
        newNodeDef: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            geometry: { type: 'string' },
            hazards: { type: 'array', items: { type: 'string' } },
            exitVectors: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  direction: { type: 'string' },
                  targetNodeId: { type: 'string' },
                },
                required: ['direction', 'targetNodeId'],
              },
            },
          },
          required: ['id', 'geometry', 'hazards', 'exitVectors'],
        },
      },
      required: ['isExpansion'],
    },
  },
  required: [...REQUIRED_ROOT_FIELDS],
};

assertGeminiJsonSchemaSubset(geminiTurnResponseJsonSchema);
