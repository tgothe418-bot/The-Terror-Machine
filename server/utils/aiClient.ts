import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { z } from "zod";
import { getGeminiPolicy } from "../ai/modelPolicy";
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
  TurnResultSchema,
  type TurnResult,
} from "../schemas/engine";

let aiClient: GoogleGenAI | null = null;
const STARTUP_API_KEY = process.env.GEMINI_API_KEY;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY || STARTUP_API_KEY;
    if (!key) {
      throw new Error('Please configure your Gemini API Key in the AI Studio Secrets panel.');
    }
    const cleanKey = key.trim().replace(/^['"]|['"]$/g, '');
    aiClient = new GoogleGenAI({ 
      apiKey: cleanKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

const engineResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    engine_thoughts: { 
      type: Type.STRING, 
      description: "Step-by-step reasoning for the current simulation state." 
    },
    narrative_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: { type: Type.STRING, description: "exposition, dialogue, sensory, or system_alert" },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING },
          emotional_weight: { type: Type.NUMBER, nullable: true }
        },
        required: ["id", "type", "content"]
      }
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING },
        requested_transition: { type: Type.STRING, nullable: true },
        suggested_tension: { type: Type.NUMBER },
        terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["current_phase", "suggested_tension", "terminal_flags"]
    }
  },
  required: ["engine_thoughts", "narrative_blocks", "logic_state"]
};

export const generateEngineTurn = async (prompt: string, history: unknown[] = []) => {
  const contents = [
    ...history,
    { role: "user", parts: [{ text: prompt }] }
  ];

  const policy = getGeminiPolicy('ENGINE_TURN');
  const response = await getAiClient().models.generateContent({
    model: policy.model,
    contents,
    config: {
      thinkingConfig: {
        thinkingLevel: policy.thinkingLevel,
      },
      responseMimeType: "application/json",
      responseSchema: engineResponseSchema,
    }
  });

  return response.text;
};

export const turnResponseSchema = {
  type: Type.OBJECT,
  properties: {
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
            kind: { type: Type.STRING, format: "enum", enum: ["NONE"] },
            reason: { type: Type.STRING, maxLength: "200" },
          },
          required: ["kind"],
        },
        {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, format: "enum", enum: ["ACTIVITY"] },
            proposalId: { type: Type.STRING },
            castMemberId: { type: Type.STRING },
            pursuitId: { type: Type.STRING, nullable: true },
            locationNodeId: { type: Type.STRING, nullable: true },
            perceptionPath: {
              type: Type.STRING,
              format: "enum",
              enum: ["DIRECT", "MEDIATED", "LOCAL_TRACE", "UNOBSERVED"],
            },
            activitySummary: { type: Type.STRING },
            authorityReferences: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            manifestationBlock: {
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
              nullable: true,
            },
          },
          required: [
            "kind",
            "proposalId",
            "castMemberId",
            "perceptionPath",
            "activitySummary",
          ],
        },
      ],
    },
    situated_pressure_proposal: {
      anyOf: [
        {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, format: "enum", enum: ["NONE"] },
            reason: { type: Type.STRING, maxLength: "200" },
          },
          required: ["kind"],
        },
        {
          type: Type.OBJECT,
          properties: {
            kind: { type: Type.STRING, format: "enum", enum: ["PRESSURE"] },
            proposalId: { type: Type.STRING },
            valueAnchorId: { type: Type.STRING },
            sourceReference: { type: Type.STRING },
            operator: {
              type: Type.STRING,
              format: "enum",
              enum: [
                "EXPOSE",
                "CONSTRAIN_ACCESS",
                "ACCELERATE",
                "CORRUPT_TRUST",
                "DEGRADE_CAPABILITY",
                "CLOSE_DISTANCE",
                "DESTABILIZE_KNOWLEDGE",
                "VIOLATE_EXPECTATION",
                "IMPOSE_COST",
                "OTHER",
              ],
            },
            affectedDimension: {
              type: Type.STRING,
              format: "enum",
              enum: [
                "ACCESS",
                "KNOWLEDGE",
                "TIME",
                "TRUST",
                "EXPOSURE",
                "CAPABILITY",
                "SAFETY",
                "RELATIONSHIP",
                "FREEDOM",
                "IDENTITY",
                "OTHER",
              ],
            },
            adverseProspect: { type: Type.STRING, maxLength: "500" },
            authorityReferences: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            persistenceTarget: {
              type: Type.STRING,
              format: "enum",
              enum: ["PRESSURE_THREAD", "EPHEMERAL_EVENT"],
            },
            responseWindowOpen: { type: Type.BOOLEAN },
            manifestationBlock: {
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
              nullable: true,
            },
          },
          required: [
            "kind",
            "proposalId",
            "valueAnchorId",
            "sourceReference",
            "operator",
            "affectedDimension",
            "adverseProspect",
          ],
        },
      ],
    },
    value_state_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: "3",
          items: {
            type: Type.OBJECT,
            properties: {
              anchorId: { type: Type.STRING },
              operation: {
                type: Type.STRING,
                format: "enum",
                enum: ["SET_CONDITION", "REVISE", "RETIRE", "RESTORE"],
              },
              expectedBeforeCondition: {
                type: Type.STRING,
                format: "enum",
                enum: [
                  "ESTABLISHED",
                  "THREATENED",
                  "COMPROMISED",
                  "SECURED",
                  "LOST",
                  "TRANSFORMED",
                ],
              },
              expectedBeforeLifecycle: {
                type: Type.STRING,
                format: "enum",
                enum: ["ACTIVE", "REVISED", "RETIRED"],
              },
              proposedCondition: {
                type: Type.STRING,
                format: "enum",
                enum: [
                  "ESTABLISHED",
                  "THREATENED",
                  "COMPROMISED",
                  "SECURED",
                  "LOST",
                  "TRANSFORMED",
                ],
              },
              proposedLifecycle: {
                type: Type.STRING,
                format: "enum",
                enum: ["ACTIVE", "REVISED", "RETIRED"],
              },
              proposedFormNote: { type: Type.STRING, maxLength: "300", nullable: true },
              causeReference: { type: Type.STRING },
              rationale: { type: Type.STRING, maxLength: "300" },
            },
            required: [
              "anchorId",
              "operation",
              "proposedCondition",
              "causeReference",
              "rationale",
            ],
          },
        },
      },
      required: ["changes"],
    },
    character_pursuit_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              pursuitId: { type: Type.STRING },
              operation: {
                type: Type.STRING,
                format: "enum",
                enum: [
                  "ADVANCE",
                  "SETBACK",
                  "REDIRECT",
                  "BLOCK",
                  "COMPLETE",
                  "ABANDON",
                  "PAUSE",
                  "RESUME",
                ],
              },
              expectedStatus: {
                type: Type.STRING,
                format: "enum",
                enum: ["ACTIVE", "DORMANT", "BLOCKED", "COMPLETED", "ABANDONED"],
              },
              proposedObjective: { type: Type.STRING, maxLength: "300" },
              proposedApproach: { type: Type.STRING, maxLength: "300" },
              proposedLocationNodeId: { type: Type.STRING, nullable: true },
              proposedStatus: {
                type: Type.STRING,
                format: "enum",
                enum: ["ACTIVE", "DORMANT", "BLOCKED", "COMPLETED", "ABANDONED"],
              },
              progressSummary: { type: Type.STRING, maxLength: "300" },
              causeReference: { type: Type.STRING },
              rationale: { type: Type.STRING, maxLength: "300" },
            },
            required: [
              "pursuitId",
              "operation",
              "progressSummary",
              "causeReference",
              "rationale",
            ],
          },
        },
      },
      required: ["changes"],
    },
    character_development_proposal: {
      type: Type.OBJECT,
      properties: {
        changes: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              castMemberId: { type: Type.STRING },
              operation: {
                type: Type.STRING,
                format: "enum",
                enum: ["ESTABLISH", "REVISE", "RETIRE"],
              },
              targetFactId: { type: Type.STRING, nullable: true },
              dimension: {
                type: Type.STRING,
                format: "enum",
                enum: ["GOAL", "BELIEF", "IDENTITY", "ATTACHMENT", "DISPOSITION", "OTHER"],
              },
              statement: { type: Type.STRING, maxLength: "300" },
              causeReference: { type: Type.STRING },
              rationale: { type: Type.STRING, maxLength: "300" },
            },
            required: [
              "castMemberId",
              "operation",
              "dimension",
              "statement",
              "causeReference",
              "rationale",
            ],
          },
        },
      },
      required: ["changes"],
    },
    pressure_transition_proposal: {
      type: Type.OBJECT,
      properties: {
        transitions: {
          type: Type.ARRAY,
          maxItems: "2",
          items: {
            type: Type.OBJECT,
            properties: {
              threadId: { type: Type.STRING },
              proposedStatus: {
                type: Type.STRING,
                format: "enum",
                enum: ["RESOLVED", "REALIZED", "RELEASED", "TRANSFORMED"],
              },
              causeReference: { type: Type.STRING },
              replacementAdverseProspect: { type: Type.STRING, maxLength: "500" },
              rationale: { type: Type.STRING, maxLength: "300" },
            },
            required: ["threadId", "proposedStatus", "causeReference", "rationale"],
          },
        },
      },
      required: ["transitions"],
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

export type ProviderResponseClassification =
  | { kind: 'CONTENT'; text: string }
  | { kind: 'PROVIDER_REFUSAL'; reason?: string }
  | { kind: 'EMPTY_PROVIDER_RESPONSE' };

export const EXPLICIT_REFUSAL_FINISH_REASONS = new Set([
  'SAFETY',
  'BLOCKLIST',
  'PROHIBITED_CONTENT',
  'SPII',
  'RECITATION',
  'OTHER',
]);

/**
 * Pure server-side classifier for @google/genai response metadata.
 * Inspects promptFeedback.blockReason and candidates[0].finishReason prior to accessing response.text.
 * Retains only bounded code/reason and sanitizes all raw response, prompt, stack, or credential sentinels.
 */
export function classifyProviderResponse(response: unknown): ProviderResponseClassification {
  if (!response || typeof response !== 'object') {
    return { kind: 'EMPTY_PROVIDER_RESPONSE' };
  }

  const res = response as {
    promptFeedback?: { blockReason?: string | null };
    candidates?: Array<{ finishReason?: string | null }>;
    text?: string | null;
  };

  // 1. Check prompt-level block reason
  const blockReason = res.promptFeedback?.blockReason;
  if (
    blockReason &&
    typeof blockReason === 'string' &&
    blockReason !== 'BLOCK_REASON_UNSPECIFIED' &&
    blockReason !== 'UNKNOWN'
  ) {
    return {
      kind: 'PROVIDER_REFUSAL',
      reason: blockReason,
    };
  }

  // 2. Check candidate-level finish reason
  const firstCandidate = res.candidates?.[0];
  const finishReason = firstCandidate?.finishReason;
  if (finishReason && typeof finishReason === 'string') {
    const normalized = finishReason.toUpperCase();
    if (EXPLICIT_REFUSAL_FINISH_REASONS.has(normalized)) {
      return {
        kind: 'PROVIDER_REFUSAL',
        reason: normalized,
      };
    }
  }

  // 3. Inspect text content
  const rawText = typeof res.text === 'string' ? res.text : '';
  const trimmed = rawText.trim();
  if (trimmed.length > 0) {
    return {
      kind: 'CONTENT',
      text: rawText,
    };
  }

  return { kind: 'EMPTY_PROVIDER_RESPONSE' };
}

export class ProviderRefusalError extends Error {
  readonly code = 'PROVIDER_REFUSAL';
  readonly reason?: string;
  constructor(reason?: string) {
    super('AI provider declined turn generation');
    this.name = 'ProviderRefusalError';
    this.reason = reason;
  }
}

export class EmptyProviderResponseError extends Error {
  readonly code = 'EMPTY_PROVIDER_RESPONSE';
  constructor() {
    super('AI provider returned an empty response');
    this.name = 'EmptyProviderResponseError';
  }
}

export function unwrapStrictJsonResponse(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Paired contract interface linking the Gemini JSON Schema sent to generateContent()
 * with the authoritative Zod schema used to parse and validate the returned response.
 */
export interface StructuredResponseContract<T> {
  name: string;
  responseSchema: Schema;
  zodSchema: z.ZodType<T>;
}

export const EngineTurnStructuredResponseContract: StructuredResponseContract<TurnResult> = {
  name: 'ENGINE_TURN',
  responseSchema: turnResponseSchema,
  zodSchema: TurnResultSchema,
};

/**
 * Pure parsing and Zod validation boundary extracted for testability and deterministic validation.
 */
export function parseStructuredTurnResponse<T>(rawText: string, zodSchema: z.ZodType<T>): T {
  const unwrapped = unwrapStrictJsonResponse(rawText);
  const parsed = JSON.parse(unwrapped);
  return zodSchema.parse(parsed);
}

export const generateStructuredResponse = async <T = unknown>(
  prompt: string,
  contractOrSchema: StructuredResponseContract<T> | z.ZodType<T>
): Promise<T> => {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  const contract: StructuredResponseContract<T> =
    typeof contractOrSchema === 'object' &&
    contractOrSchema !== null &&
    'responseSchema' in contractOrSchema &&
    'zodSchema' in contractOrSchema
      ? (contractOrSchema as StructuredResponseContract<T>)
      : {
          name: 'CUSTOM_ZOD_SCHEMA',
          responseSchema: turnResponseSchema,
          zodSchema: contractOrSchema as z.ZodType<T>,
        };

  const policy = getGeminiPolicy('ENGINE_TURN');
  const response = await getAiClient().models.generateContent({
    model: policy.model,
    contents,
    config: {
      thinkingConfig: {
        thinkingLevel: policy.thinkingLevel,
      },
      responseMimeType: "application/json",
      responseSchema: contract.responseSchema,
    },
  });

  const classification = classifyProviderResponse(response);
  if (classification.kind === 'PROVIDER_REFUSAL') {
    throw new ProviderRefusalError(classification.reason);
  }
  if (classification.kind === 'EMPTY_PROVIDER_RESPONSE') {
    throw new EmptyProviderResponseError();
  }

  try {
    return parseStructuredTurnResponse(classification.text, contract.zodSchema);
  } catch (err) {
    console.error("Failed to parse or validate schema:", err);
    throw err;
  }
};
