import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { z } from "zod";
import { getGeminiPolicy } from "../ai/modelPolicy";
import { TurnResultSchema, type TurnResult } from "../schemas/engine";
import {
  type GeminiJsonSchema,
  geminiTurnResponseJsonSchema,
} from "../ai/geminiTurnJsonSchema";
import { normalizeGeminiTurnProviderPayload } from '../ai/geminiTurnTransport';

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

export class ProviderRequestRejectedError extends Error {
  readonly code = 'PROVIDER_REQUEST_REJECTED';
  readonly providerStatus: number;

  constructor(providerStatus: number) {
    super('AI provider rejected the turn generation request');
    this.name = 'ProviderRequestRejectedError';
    this.providerStatus = providerStatus;
  }
}

function readProviderStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') {
    return null;
  }

  const directStatus = (error as { status?: unknown }).status;
  if (typeof directStatus === 'number' && Number.isInteger(directStatus)) {
    return directStatus;
  }

  const responseStatus = (error as { response?: { status?: unknown } }).response?.status;
  return typeof responseStatus === 'number' && Number.isInteger(responseStatus)
    ? responseStatus
    : null;
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
  responseJsonSchema: GeminiJsonSchema;
  normalizeProviderPayload: (payload: unknown) => unknown;
  zodSchema: z.ZodType<T>;
}

export const EngineTurnStructuredResponseContract: StructuredResponseContract<TurnResult> = {
  name: 'ENGINE_TURN',
  responseJsonSchema: geminiTurnResponseJsonSchema,
  normalizeProviderPayload: normalizeGeminiTurnProviderPayload,
  zodSchema: TurnResultSchema,
};

/**
 * Pure parsing and Zod validation boundary extracted for testability and deterministic validation.
 */
export function parseStructuredTurnResponse<T>(
  rawText: string,
  zodSchema: z.ZodType<T>,
  normalizeProviderPayload: (payload: unknown) => unknown = (payload) => payload
): T {
  const unwrapped = unwrapStrictJsonResponse(rawText);
  if (!unwrapped) {
    throw new EmptyProviderResponseError();
  }
  const parsed = JSON.parse(unwrapped);
  return zodSchema.parse(normalizeProviderPayload(parsed));
}

export const generateStructuredResponse = async <T>(
  prompt: string,
  contract: StructuredResponseContract<T>
): Promise<T> => {
  const contents = [{ role: 'user', parts: [{ text: prompt }] }];

  const policy = getGeminiPolicy('ENGINE_TURN');
  let response;
  try {
    response = await getAiClient().models.generateContent({
      model: policy.model,
      contents,
      config: {
        thinkingConfig: {
          thinkingLevel: policy.thinkingLevel,
        },
        responseMimeType: 'application/json',
        responseJsonSchema: contract.responseJsonSchema,
      },
    });
  } catch (error: unknown) {
    const providerStatus = readProviderStatus(error);
    if (providerStatus === 400) {
      throw new ProviderRequestRejectedError(providerStatus);
    }
    throw error;
  }

  const classification = classifyProviderResponse(response);
  if (classification.kind === 'PROVIDER_REFUSAL') {
    throw new ProviderRefusalError(classification.reason);
  }
  if (classification.kind === 'EMPTY_PROVIDER_RESPONSE') {
    throw new EmptyProviderResponseError();
  }

  return parseStructuredTurnResponse(
    classification.text,
    contract.zodSchema,
    contract.normalizeProviderPayload
  );
};
