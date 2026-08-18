import { GoogleGenAI, Type } from "@google/genai";
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

const engineResponseSchema = {
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
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, description: "prose, dialogue, system_voice, or environmental_description" },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING }
        },
        required: ["type", "content"]
      }
    },
    intent_proposal: {
      type: Type.OBJECT,
      properties: {
        action_kind: { type: Type.STRING, enum: [...ACTION_KINDS] },
        action_subtype: { type: Type.STRING, enum: [...ACTION_SUBTYPES], nullable: true },
        pressure_direction: { type: Type.STRING, enum: [...PRESSURE_DIRECTIONS] },
        dramatic_tactic: { type: Type.STRING, enum: [...DRAMATIC_TACTICS] },
        intent_synergy: { type: Type.STRING, enum: [...INTENT_SYNERGIES] },
      },
      required: [
        "action_kind",
        "action_subtype",
        "pressure_direction",
        "dramatic_tactic",
        "intent_synergy",
      ]
    },
    reconciliation_proposal: {
      type: Type.OBJECT,
      properties: {
        mode: { type: Type.STRING, enum: [...RECONCILIATION_MODES] },
        feasibility: { type: Type.STRING, enum: [...RECONCILIATION_FEASIBILITIES] },
        reason_code: { type: Type.STRING, enum: [...RECONCILIATION_REASON_CODES] },
        fictional_time_cost: { type: Type.STRING, enum: [...FICTIONAL_TIME_COSTS] },
        authority_alignment: { type: Type.STRING, enum: [...AUTHORITY_ALIGNMENTS] },
        memory_echo_candidate: { type: Type.STRING, nullable: true },
      },
      required: [
        "mode",
        "feasibility",
        "reason_code",
        "fictional_time_cost",
        "authority_alignment",
        "memory_echo_candidate",
      ]
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: { type: Type.STRING },
        requested_transition: { type: Type.STRING, nullable: true, description: "Exact target node ID if movement along an allowed exit completed, or null if no movement occurred." },
        suggested_tension: { type: Type.INTEGER },
        terminal_flags: { type: Type.ARRAY, items: { type: Type.STRING } },
        cast_deltas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              character_id: { type: Type.STRING },
              skepticism_delta: { type: Type.NUMBER }
            },
            required: ["character_id", "skepticism_delta"]
          }
        }
      },
      required: ["current_phase", "suggested_tension", "terminal_flags", "cast_deltas"]
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
                  targetNodeId: { type: Type.STRING }
                },
                required: ["direction", "targetNodeId"]
              }
            }
          },
          required: ["id", "geometry", "hazards", "exitVectors"],
          nullable: true
        }
      },
      required: ["isExpansion"],
      nullable: true
    }
  },
  required: ["narrative_blocks", "logic_state", "intent_proposal", "reconciliation_proposal"]
};

export function unwrapStrictJsonResponse(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?[ \t]*\r?\n([\s\S]*?)\r?\n```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const generateStructuredResponse = async (prompt: string, zodSchema: any) => {
  const contents = [{ role: "user", parts: [{ text: prompt }] }];

  const policy = getGeminiPolicy('ENGINE_TURN');
  const response = await getAiClient().models.generateContent({
    model: policy.model,
    contents,
    config: {
      thinkingConfig: {
        thinkingLevel: policy.thinkingLevel,
      },
      responseMimeType: "application/json",
      responseSchema: turnResponseSchema,
    }
  });

  try {
    const raw = JSON.parse(unwrapStrictJsonResponse(response.text ?? ''));
    return zodSchema.parse(raw);
  } catch (err) {
    console.error("Failed to parse or validate schema:", err);
    throw err;
  }
};
