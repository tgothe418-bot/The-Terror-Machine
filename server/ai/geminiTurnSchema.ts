import { Type, type Schema } from '@google/genai';
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
} from '../../src/types/horrorGrammar';

const enumStringSchema = (values: readonly string[]): Schema => ({
  type: Type.STRING,
  format: 'enum',
  enum: [...values],
});

const nonEmptyStringSchema = (maxLength?: number): Schema => ({
  type: Type.STRING,
  minLength: '1',
  ...(maxLength === undefined ? {} : { maxLength: String(maxLength) }),
});

const nonBlankStringSchema = (maxLength?: number): Schema => ({
  type: Type.STRING,
  minLength: '1',
  pattern: '\\S',
  ...(maxLength === undefined ? {} : { maxLength: String(maxLength) }),
});

const nonEmptyStringArraySchema: Schema = {
  type: Type.ARRAY,
  items: nonBlankStringSchema(),
};

const manifestationBlockResponseSchema: Schema = {
  anyOf: [
    {
      type: Type.OBJECT,
      properties: {
        type: enumStringSchema(['prose']),
        content: nonBlankStringSchema(2000),
      },
      required: ['type', 'content'],
    },
    {
      type: Type.OBJECT,
      properties: {
        type: enumStringSchema(['dialogue']),
        speaker: nonBlankStringSchema(100),
        content: nonBlankStringSchema(1000),
      },
      required: ['type', 'speaker', 'content'],
    },
  ],
};

const nullableManifestationBlockResponseSchema: Schema = {
  ...manifestationBlockResponseSchema,
  nullable: true,
};

export const turnResponseSchema = {
  type: Type.OBJECT,
  properties: {
    engine_thoughts: {
      type: Type.STRING,
      description: "Step-by-step reasoning for the current simulation state.",
    },
    narrative_blocks: {
      type: Type.ARRAY,
      maxItems: "2",
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            format: "enum",
            enum: ["prose", "dialogue", "system_voice", "environmental_description"],
          },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING },
        },
        required: ["type", "content"],
      },
    },
    intent_proposal: {
      type: Type.OBJECT,
      properties: {
        action_kind: { type: Type.STRING, format: "enum", enum: [...ACTION_KINDS] },
        action_subtype: { type: Type.STRING, format: "enum", enum: [...ACTION_SUBTYPES], nullable: true },
        pressure_direction: { type: Type.STRING, format: "enum", enum: [...PRESSURE_DIRECTIONS] },
        dramatic_tactic: { type: Type.STRING, format: "enum", enum: [...DRAMATIC_TACTICS] },
        intent_synergy: { type: Type.STRING, format: "enum", enum: [...INTENT_SYNERGIES] },
      },
      required: [
        "action_kind",
        "action_subtype",
        "pressure_direction",
        "dramatic_tactic",
        "intent_synergy",
      ],
    },
    reconciliation_proposal: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, format: "enum", enum: [...RECONCILIATION_MODES] },
        feasibility: { type: Type.STRING, format: "enum", enum: [...RECONCILIATION_FEASIBILITIES] },
        reason_code: { type: Type.STRING, format: "enum", enum: [...RECONCILIATION_REASON_CODES] },
        fictional_time_cost: { type: Type.STRING, format: "enum", enum: [...FICTIONAL_TIME_COSTS] },
        authority_alignment: { type: Type.STRING, format: "enum", enum: [...AUTHORITY_ALIGNMENTS] },
        memory_echo_candidate: {
          type: Type.STRING,
          maxLength: "240",
          nullable: true,
          description: "Optional memorable phrase or echo from this beat; null when none.",
        },
      },
      required: [
        "mode",
        "feasibility",
        "reason_code",
        "fictional_time_cost",
        "authority_alignment",
        "memory_echo_candidate",
      ],
    },
    consequence_proposal: {
      type: Type.OBJECT,
      properties: {
        mutations: {
          type: Type.ARRAY,
          maxItems: "4",
          items: {
            anyOf: [
              {
                type: Type.OBJECT,
                properties: {
                  domain: { type: Type.STRING, format: "enum", enum: ["INVENTORY"] },
                  operation: { type: Type.STRING, format: "enum", enum: ["ADD", "REMOVE"] },
                  value: { type: Type.STRING, maxLength: "120" },
                  rationale: { type: Type.STRING, maxLength: "240" },
                },
                required: ["domain", "operation", "value", "rationale"],
              },
              {
                type: Type.OBJECT,
                properties: {
                  domain: { type: Type.STRING, format: "enum", enum: ["PLAYER_INJURY"] },
                  operation: { type: Type.STRING, format: "enum", enum: ["ADD", "REMOVE"] },
                  value: { type: Type.STRING, maxLength: "120" },
                  rationale: { type: Type.STRING, maxLength: "240" },
                },
                required: ["domain", "operation", "value", "rationale"],
              },
              {
                type: Type.OBJECT,
                properties: {
                  domain: { type: Type.STRING, format: "enum", enum: ["PSYCHOLOGICAL_STATUS"] },
                  operation: { type: Type.STRING, format: "enum", enum: ["SET"] },
                  value: {
                    type: Type.STRING,
                    format: "enum",
                    enum: ["STABLE", "UNEASY", "DISTRESSED", "PANICKED", "DISSOCIATED"],
                  },
                  rationale: { type: Type.STRING, maxLength: "240" },
                },
                required: ["domain", "operation", "value", "rationale"],
              },
            ],
          },
        },
      },
      required: ["mutations"],
    },
    character_stance_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING, maxLength: "120" },
              focus: { type: Type.STRING, format: "enum", enum: ["PLAYER", "SITUATION"] },
              stance: {
                type: Type.STRING,
                format: "enum",
                enum: ["OPEN", "GUARDED", "RESISTANT", "HOSTILE", "AFRAID", "WITHDRAWN"],
              },
              rationale: { type: Type.STRING, maxLength: "240" },
            },
            required: ["character_id", "focus", "stance", "rationale"],
          },
        },
      },
      required: ["changes"],
    },
    character_relationship_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              source_character_id: { type: Type.STRING, maxLength: "120" },
              target_character_id: { type: Type.STRING, maxLength: "120" },
              kind: {
                type: Type.STRING,
                format: "enum",
                enum: ["TRUST", "HOSTILITY", "DEPENDENCE", "LEVERAGE"],
              },
              delta: {
                type: Type.INTEGER,
                format: "enum",
                enum: ["-1", "1"],
                description: "Exact signed relationship intensity change. Use -1 to decrease or 1 to increase; never 0.",
              },
              rationale: { type: Type.STRING, maxLength: "240" },
            },
            required: [
              "source_character_id",
              "target_character_id",
              "kind",
              "delta",
              "rationale",
            ],
          },
        },
      },
      required: ["changes"],
    },
    character_memory_proposal: {
      type: Type.OBJECT,
      properties: {
        candidates: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING, maxLength: "120" },
              fact: {
                type: Type.STRING,
                maxLength: "200",
                description: "Concise, durable factual memory acquired this turn (max 200 chars).",
              },
              source: {
                type: Type.STRING,
                format: "enum",
                enum: ["OBSERVED", "TOLD"],
                description: "OBSERVED for witnessed non-verbal actions; TOLD for statements communicated to character.",
              },
              certainty: {
                type: Type.STRING,
                format: "enum",
                enum: ["KNOWN", "BELIEVED"],
                description: "KNOWN for verifiable objective facts; BELIEVED for subjective impressions or hearsay.",
              },
              rationale: { type: Type.STRING, maxLength: "240" },
            },
            required: [
              "character_id",
              "fact",
              "source",
              "certainty",
              "rationale",
            ],
          },
        },
      },
      required: ["candidates"],
    },
    world_memory_proposal: {
      type: Type.OBJECT,
      properties: {
        candidates: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            anyOf: [
              {
                type: Type.OBJECT,
                properties: {
                  kind: {
                    type: Type.STRING,
                    format: "enum",
                    enum: [
                      "ESTABLISHED_FACT",
                      "DISCOVERED_EVIDENCE",
                      "ENVIRONMENTAL_CONDITION",
                      "PERSISTENT_CONSEQUENCE",
                    ],
                  },
                  scope: { type: Type.STRING, format: "enum", enum: ["GLOBAL"] },
                  node_id: {
                    type: Type.STRING,
                    nullable: true,
                    description: "null for GLOBAL scope",
                  },
                  statement: { type: Type.STRING, maxLength: "240" },
                  rationale: { type: Type.STRING, maxLength: "240" },
                },
                required: ["kind", "scope", "node_id", "statement", "rationale"],
              },
              {
                type: Type.OBJECT,
                properties: {
                  kind: {
                    type: Type.STRING,
                    format: "enum",
                    enum: [
                      "ESTABLISHED_FACT",
                      "DISCOVERED_EVIDENCE",
                      "ENVIRONMENTAL_CONDITION",
                      "PERSISTENT_CONSEQUENCE",
                    ],
                  },
                  scope: { type: Type.STRING, format: "enum", enum: ["NODE"] },
                  node_id: {
                    type: Type.STRING,
                    maxLength: "120",
                    description: "Exact non-empty node ID for NODE scope",
                  },
                  statement: { type: Type.STRING, maxLength: "240" },
                  rationale: { type: Type.STRING, maxLength: "240" },
                },
                required: ["kind", "scope", "node_id", "statement", "rationale"],
              },
            ],
          },
        },
      },
      required: ["candidates"],
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING },
        requested_transition: {
          type: Type.STRING,
          nullable: true,
          description: "Exact target node ID if movement along an allowed exit completed, or null if no movement occurred.",
        },
        suggested_tension: {
          type: Type.INTEGER,
          minimum: 0,
          maximum: 100,
          description: "Suggested tension integer bounded between 0 and 100.",
        },
        terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cast_deltas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING },
              skepticism_delta: { type: Type.NUMBER },
            },
            required: ["character_id", "skepticism_delta"],
          },
        },
      },
      required: ["current_phase", "suggested_tension", "terminal_flags", "cast_deltas"],
    },
    topologyDelta: {
      type: Type.OBJECT,
      properties: {
        isExpansion: { type: Type.BOOLEAN },
        newNodeDef: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            geometry: { type: Type.STRING },
            hazards: { type: Type.ARRAY, items: { type: Type.STRING } },
            exitVectors: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  direction: { type: Type.STRING },
                  targetNodeId: { type: Type.STRING },
                },
                required: ["direction", "targetNodeId"],
              },
            },
          },
          required: ["id", "geometry", "hazards", "exitVectors"],
          nullable: true,
        },
      },
      required: ["isExpansion"],
      nullable: true,
    },
    cast_activity_proposal: {
      anyOf: [
        {
          type: Type.OBJECT,
          properties: {
            kind: enumStringSchema(['NONE']),
            reason: { type: Type.STRING, maxLength: '200' },
          },
          required: ['kind'],
        },
        {
          type: Type.OBJECT,
          properties: {
            kind: enumStringSchema(['ACTIVITY']),
            proposalId: nonEmptyStringSchema(),
            castMemberId: nonEmptyStringSchema(),
            pursuitId: { ...nonEmptyStringSchema(), nullable: true },
            locationNodeId: { ...nonEmptyStringSchema(), nullable: true },
            perceptionPath: enumStringSchema(PERCEPTION_PATHS),
            activitySummary: nonBlankStringSchema(500),
            authorityReferences: nonEmptyStringArraySchema,
            manifestationBlock: nullableManifestationBlockResponseSchema,
          },
          required: [
            'kind',
            'proposalId',
            'castMemberId',
            'perceptionPath',
            'activitySummary',
          ],
        },
      ],
    },
    situated_pressure_proposal: {
      anyOf: [
        {
          type: Type.OBJECT,
          properties: {
            kind: enumStringSchema(['NONE']),
            reason: { type: Type.STRING, maxLength: '200' },
          },
          required: ['kind'],
        },
        {
          type: Type.OBJECT,
          properties: {
            kind: enumStringSchema(['PRESSURE']),
            proposalId: nonEmptyStringSchema(),
            valueAnchorId: nonEmptyStringSchema(),
            sourceReference: nonEmptyStringSchema(),
            operator: enumStringSchema(PRESSURE_OPERATORS),
            affectedDimension: enumStringSchema(AFFECTED_DIMENSIONS),
            adverseProspect: nonBlankStringSchema(500),
            authorityReferences: nonEmptyStringArraySchema,
            persistenceTarget: enumStringSchema(PERSISTENCE_TARGETS),
            responseWindowOpen: { type: Type.BOOLEAN },
            manifestationBlock: nullableManifestationBlockResponseSchema,
          },
          required: [
            'kind',
            'proposalId',
            'valueAnchorId',
            'sourceReference',
            'operator',
            'affectedDimension',
            'adverseProspect',
          ],
        },
      ],
    },
    value_state_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: '3',
          items: {
            type: Type.OBJECT,
            properties: {
              anchorId: nonEmptyStringSchema(),
              operation: enumStringSchema(VALUE_OPERATIONS),
              expectedBeforeCondition: enumStringSchema(VALUE_CONDITIONS),
              expectedBeforeLifecycle: enumStringSchema(VALUE_LIFECYCLES),
              proposedCondition: enumStringSchema(VALUE_CONDITIONS),
              proposedLifecycle: enumStringSchema(VALUE_LIFECYCLES),
              proposedFormNote: { type: Type.STRING, maxLength: '300', nullable: true },
              causeReference: nonBlankStringSchema(300),
              rationale: nonBlankStringSchema(300),
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
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: '2',
          items: {
            type: Type.OBJECT,
            properties: {
              pursuitId: nonEmptyStringSchema(),
              operation: enumStringSchema(PURSUIT_OPERATIONS),
              expectedStatus: enumStringSchema(PURSUIT_STATUSES),
              proposedObjective: nonBlankStringSchema(300),
              proposedApproach: nonBlankStringSchema(300),
              proposedLocationNodeId: { ...nonEmptyStringSchema(), nullable: true },
              proposedStatus: enumStringSchema(PURSUIT_STATUSES),
              progressSummary: nonBlankStringSchema(300),
              causeReference: nonBlankStringSchema(300),
              rationale: nonBlankStringSchema(300),
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
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: '2',
          items: {
            type: Type.OBJECT,
            properties: {
              castMemberId: nonEmptyStringSchema(),
              operation: enumStringSchema(DEVELOPMENT_OPERATIONS),
              targetFactId: { ...nonEmptyStringSchema(), nullable: true },
              dimension: enumStringSchema(DEVELOPMENT_DIMENSIONS),
              statement: nonBlankStringSchema(300),
              causeReference: nonBlankStringSchema(300),
              rationale: nonBlankStringSchema(300),
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
      type: Type.OBJECT,
      properties: {
        transitions: {
          type: Type.ARRAY,
          maxItems: '2',
          items: {
            type: Type.OBJECT,
            properties: {
              threadId: nonEmptyStringSchema(),
              proposedStatus: enumStringSchema(PRESSURE_THREAD_TERMINAL_STATUSES),
              causeReference: nonBlankStringSchema(300),
              replacementAdverseProspect: nonBlankStringSchema(500),
              rationale: nonBlankStringSchema(300),
            },
            required: ['threadId', 'proposedStatus', 'causeReference', 'rationale'],
          },
        },
      },
      required: ['transitions'],
    },
  },
  required: [
    "narrative_blocks",
    "logic_state",
    "intent_proposal",
    "reconciliation_proposal",
    "consequence_proposal",
    "character_stance_proposal",
    "character_relationship_proposal",
    "character_memory_proposal",
    "world_memory_proposal",
    "cast_activity_proposal",
    "situated_pressure_proposal",
    "value_state_proposal",
    "character_pursuit_proposal",
    "character_development_proposal",
    "pressure_transition_proposal",
  ],
} satisfies Schema;

