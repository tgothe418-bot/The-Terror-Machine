import type { GeminiPurpose } from './modelPolicy';

export const APPROVED_ZAI_MODELS = [
  'glm-5',
  'glm-4.7',
  'glm-4.6',
  'glm-4.5-air',
  'glm-4.5-flash',
] as const;

export type ZaiModelId = (typeof APPROVED_ZAI_MODELS)[number];

export const DEFAULT_ZAI_MODEL: ZaiModelId = 'glm-4.6';

export const DEFAULT_ZAI_BASE_URL = 'https://api.z.ai/api/paas/v4';
export const ZAI_CODING_BASE_URL = 'https://api.z.ai/api/coding/paas/v4';

export type ZaiEndpointVariant = 'general' | 'coding';

let runtimeZaiModel: ZaiModelId | null = null;
let runtimeZaiEndpointVariant: ZaiEndpointVariant | null = null;

function readConfiguredZaiModel(): ZaiModelId | null {
  const configured = process.env.ZAI_MODEL?.trim().toLowerCase();
  return configured && APPROVED_ZAI_MODELS.includes(configured as ZaiModelId)
    ? (configured as ZaiModelId)
    : null;
}

function readConfiguredEndpointVariant(): ZaiEndpointVariant {
  const configured = process.env.ZAI_ENDPOINT?.trim().toLowerCase();
  return configured === 'coding' ? 'coding' : 'general';
}

export function getZaiModel(): ZaiModelId {
  return runtimeZaiModel ?? readConfiguredZaiModel() ?? DEFAULT_ZAI_MODEL;
}

export function setZaiModel(model: ZaiModelId | null): void {
  if (model && !APPROVED_ZAI_MODELS.includes(model)) {
    throw new Error(`Model ${model} is not an approved Z.ai model.`);
  }
  runtimeZaiModel = model;
}

export function getZaiEndpointVariant(): ZaiEndpointVariant {
  return runtimeZaiEndpointVariant ?? readConfiguredEndpointVariant();
}

export function setZaiEndpointVariant(variant: ZaiEndpointVariant | null): void {
  if (variant && variant !== 'general' && variant !== 'coding') {
    throw new Error(`Z.ai endpoint variant ${variant} is not supported.`);
  }
  runtimeZaiEndpointVariant = variant;
}

export function getZaiBaseUrl(): string {
  return getZaiEndpointVariant() === 'coding' ? ZAI_CODING_BASE_URL : DEFAULT_ZAI_BASE_URL;
}

export function getZaiFallbackModelId(currentModel?: ZaiModelId): ZaiModelId {
  const active = currentModel || getZaiModel();
  if (active === 'glm-5') return 'glm-4.7';
  if (active === 'glm-4.7') return 'glm-4.6';
  if (active === 'glm-4.6') return 'glm-4.5-air';
  if (active === 'glm-4.5-air') return 'glm-4.5-flash';
  return DEFAULT_ZAI_MODEL;
}

/**
 * GLM exposes a binary thinking toggle rather than Gemini's graded thinking
 * levels. Fast mechanical actions run without thinking; every other purpose
 * keeps reasoning enabled for contract adherence.
 */
export function getZaiThinking(purpose: GeminiPurpose): 'enabled' | 'disabled' {
  return purpose === 'AUTOPILOT_ACTION' ? 'disabled' : 'enabled';
}
