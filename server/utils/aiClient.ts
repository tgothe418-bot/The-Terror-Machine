import { GoogleGenAI } from "@google/genai";
import { getGeminiPolicy } from "../ai/modelPolicy";
import {
  TurnResultSchema,
  type TurnResult,
} from "../schemas/engine";

let aiClient: GoogleGenAI | null = null;

export function getAiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key.trim().length === 0) {
      throw new Error('Please configure your GEMINI_API_KEY in the private local .env file.');
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
      description: "Step-by-step reasoning for the current simulation state.",
    },
    narrative_blocks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          type: {
            type: Type.STRING,
            format: "enum",
            enum: ["prose", "dialogue", "system_voice", "environmental_description"],
          },
          speaker: { type: Type.STRING, nullable: true },
          content: { type: Type.STRING },
        },
        required: ["id", "type", "content"],
      },
    },
    logic_state: {
      type: Type.OBJECT,
      properties: {
        current_phase: {
          type: Type.STRING,
          format: "enum",
          enum: ["LATENT", "MANIFEST", "RELEASE"],
        },
        requested_transition: { type: Type.STRING, nullable: true },
        suggested_tension: { type: Type.INTEGER },
        terminal_flags: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        },
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
      required: ["current_phase", "requested_transition", "suggested_tension", "terminal_flags"]
    }
  },
  required: ["engine_thoughts", "narrative_blocks", "logic_state"]
} satisfies Schema;

export const generateEngineTurn = async (prompt: string): Promise<string | null | undefined> => {
  const contents = [
    {
      role: "user",
      parts: [{ text: prompt }]
    }
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



export { turnResponseSchema } from '../ai/geminiTurnSchema';

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

export {
  ProviderRefusalError,
  EmptyProviderResponseError,
  ProviderConfigurationError,
  ProviderRequestError,
} from '../ai/providerTypes';

export type {
  StructuredResponseContract,
  GenerationProviderId,
  GenerationSelection,
  PublicProviderDescriptor,
} from '../ai/providerTypes';

import type { StructuredResponseContract } from '../ai/providerTypes';
import { turnResponseSchema } from '../ai/geminiTurnSchema';
import { qwenTurnResponseSchema } from '../ai/qwenSchemaProjection';

export {
  unwrapStrictJsonResponse,
  parseStructuredTurnResponse,
  generateStructuredResponse,
} from '../ai/structuredGeneration';

export const EngineTurnStructuredResponseContract: StructuredResponseContract<TurnResult> = {
  name: 'ENGINE_TURN',
  zodSchema: TurnResultSchema,
  providerSchemas: {
    gemini: turnResponseSchema as unknown as Readonly<Record<string, unknown>>,
    qwen: qwenTurnResponseSchema,
  },
};

