import type { GeminiPurpose } from './modelPolicy';
import { getReasoningEffort } from './reasoningPolicy';

export const APPROVED_HEMMINGWAY_MODELS = ['hemmingway-27b'] as const;

export type HemmingwayModelId = (typeof APPROVED_HEMMINGWAY_MODELS)[number];

export const DEFAULT_HEMMINGWAY_MODEL: HemmingwayModelId = 'hemmingway-27b';

export const HEMMINGWAY_BASE_URL = 'https://hemmingway.io/v1';

let runtimeHemmingwayModel: HemmingwayModelId | null = null;

function readConfiguredHemmingwayModel(): HemmingwayModelId | null {
  const configured = process.env.HEMMINGWAY_MODEL?.trim().toLowerCase();
  return configured && APPROVED_HEMMINGWAY_MODELS.includes(configured as HemmingwayModelId)
    ? (configured as HemmingwayModelId)
    : null;
}

export function getHemmingwayModel(): HemmingwayModelId {
  return runtimeHemmingwayModel ?? readConfiguredHemmingwayModel() ?? DEFAULT_HEMMINGWAY_MODEL;
}

export function setHemmingwayModel(model: HemmingwayModelId | null): void {
  if (model && !APPROVED_HEMMINGWAY_MODELS.includes(model)) {
    throw new Error(`Model ${model} is not an approved Hemmingway model.`);
  }
  runtimeHemmingwayModel = model;
}

/**
 * Hemmingway thinking translation. The global dial overrides; 'default'
 * defers to the purpose-derived profile (autopilot runs thought-free,
 * engineering turns reason at medium, architecture at xhigh).
 */
export function getHemmingwayThinking(purpose: GeminiPurpose): {
  enable_thinking?: boolean;
  reasoning_effort?: 'low' | 'medium' | 'xhigh';
} {
  const effort = getReasoningEffort();
  if (effort === 'minimal') return { enable_thinking: false };
  if (effort === 'low') return { reasoning_effort: 'low' };
  if (effort === 'medium') return { reasoning_effort: 'medium' };
  if (effort === 'high') return { reasoning_effort: 'xhigh' };

  if (purpose === 'AUTOPILOT_ACTION') return { enable_thinking: false };
  if (purpose === 'FORGE_ARCHITECTURE') return { reasoning_effort: 'xhigh' };
  return { reasoning_effort: 'medium' };
}
