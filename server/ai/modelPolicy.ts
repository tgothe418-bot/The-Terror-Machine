import { ThinkingLevel } from '@google/genai';

export const GEMINI_MODEL_ID = 'gemini-3.7-flash' as const;

export type GeminiPurpose =
  | 'ENGINE_INIT'
  | 'ENGINE_TURN'
  | 'ENGINE_PREVIEW'
  | 'FORGE_ARCHITECTURE'
  | 'FORGE_PREVIEW'
  | 'LORE_ANALYSIS'
  | 'VOICE'
  | 'AUTOPILOT_ACTION'
  | 'LEGACY_RECONCILIATION';

export interface GeminiPolicy {
  readonly model: typeof GEMINI_MODEL_ID;
  readonly thinkingLevel: ThinkingLevel;
}

export const GEMINI_POLICIES: Readonly<Record<GeminiPurpose, GeminiPolicy>> = Object.freeze({
  ENGINE_INIT: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
  ENGINE_TURN: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
  ENGINE_PREVIEW: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
  FORGE_ARCHITECTURE: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.HIGH,
  }),
  FORGE_PREVIEW: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.HIGH,
  }),
  LORE_ANALYSIS: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
  VOICE: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
  AUTOPILOT_ACTION: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.LOW,
  }),
  LEGACY_RECONCILIATION: Object.freeze({
    model: GEMINI_MODEL_ID,
    thinkingLevel: ThinkingLevel.MEDIUM,
  }),
});

export function getGeminiPolicy(purpose: GeminiPurpose): GeminiPolicy {
  return GEMINI_POLICIES[purpose];
}
