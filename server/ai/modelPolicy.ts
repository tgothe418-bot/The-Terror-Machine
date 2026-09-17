import { ThinkingLevel } from '@google/genai';

export const APPROVED_GEMINI_MODELS = [
  'gemini-3.6-flash',
  'gemini-3.5-flash-lite',
  'gemini-3.7-flash',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
] as const;

export type GeminiModelId = (typeof APPROVED_GEMINI_MODELS)[number];
export type GeminiTier = 'free' | 'paid';

export const DEFAULT_FREE_MODEL: GeminiModelId = 'gemini-3.6-flash';
export const DEFAULT_PAID_MODEL: GeminiModelId = 'gemini-3.7-flash';

// Backwards compatibility alias
export const GEMINI_MODEL_ID: GeminiModelId = DEFAULT_FREE_MODEL;

export const ENGINE_PROVIDERS = ['gemini', 'zai', 'local'] as const;
export type EngineProvider = (typeof ENGINE_PROVIDERS)[number];
export const DEFAULT_ENGINE_PROVIDER: EngineProvider = 'gemini';

function readConfiguredEngineProvider(): EngineProvider {
  const configured = process.env.ENGINE_AI_PROVIDER?.trim().toLowerCase();
  if (configured === 'gemini') return 'gemini';
  if (configured === 'zai') return 'zai';
  if (configured === 'local') return 'local';
  return DEFAULT_ENGINE_PROVIDER;
}

let runtimeEngineProvider: EngineProvider = readConfiguredEngineProvider();

export function getEngineProvider(): EngineProvider {
  return runtimeEngineProvider;
}

export function setEngineProvider(provider: EngineProvider): void {
  if (!ENGINE_PROVIDERS.includes(provider)) {
    throw new Error(`Provider ${provider} is not supported for the simulation engine.`);
  }
  runtimeEngineProvider = provider;
}

let runtimeTier: GeminiTier = (process.env.GEMINI_TIER?.toLowerCase() === 'paid') ? 'paid' : 'free';
let runtimeModelOverride: GeminiModelId | null = null;
let runtimeThinkingOverride: ThinkingLevel | null = null;

export function getActiveTier(): GeminiTier {
  return runtimeTier;
}

export function setActiveTier(tier: GeminiTier): void {
  runtimeTier = tier;
}

export function getActiveModelId(): GeminiModelId {
  if (runtimeModelOverride) {
    return runtimeModelOverride;
  }
  const envModel = process.env.GEMINI_MODEL as GeminiModelId | undefined;
  if (envModel && APPROVED_GEMINI_MODELS.includes(envModel)) {
    return envModel;
  }
  return runtimeTier === 'paid' ? DEFAULT_PAID_MODEL : DEFAULT_FREE_MODEL;
}

export function setActiveModelId(model: GeminiModelId | null): void {
  if (model && !APPROVED_GEMINI_MODELS.includes(model)) {
    throw new Error(`Model ${model} is not an approved Gemini model.`);
  }
  runtimeModelOverride = model;
}

export function getFallbackModelId(currentModel?: GeminiModelId): GeminiModelId {
  const active = currentModel || getActiveModelId();
  if (active === 'gemini-3.7-flash') return 'gemini-3.6-flash';
  if (active === 'gemini-3.6-flash') return 'gemini-3.5-flash-lite';
  if (active === 'gemini-3.5-flash-lite') return 'gemini-3.6-flash';
  if (active === 'gemini-2.5-flash') return 'gemini-3.6-flash';
  if (active === 'gemini-2.5-flash-lite') return 'gemini-3.5-flash-lite';
  return 'gemini-3.6-flash';
}

export function setThinkingLevelOverride(level: ThinkingLevel | null): void {
  runtimeThinkingOverride = level;
}

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
  readonly model: GeminiModelId;
  readonly thinkingLevel: ThinkingLevel;
}

const DEFAULT_PURPOSE_THINKING: Readonly<Record<GeminiPurpose, ThinkingLevel>> = Object.freeze({
  ENGINE_INIT: ThinkingLevel.MEDIUM,
  ENGINE_TURN: ThinkingLevel.MEDIUM,
  ENGINE_PREVIEW: ThinkingLevel.MEDIUM,
  FORGE_ARCHITECTURE: ThinkingLevel.HIGH,
  FORGE_PREVIEW: ThinkingLevel.HIGH,
  LORE_ANALYSIS: ThinkingLevel.MEDIUM,
  VOICE: ThinkingLevel.MEDIUM,
  AUTOPILOT_ACTION: ThinkingLevel.LOW,
  LEGACY_RECONCILIATION: ThinkingLevel.MEDIUM,
});

export function getGeminiPolicy(
  purpose: GeminiPurpose,
  modelOverride?: GeminiModelId
): GeminiPolicy {
  const model = modelOverride || getActiveModelId();
  const baseLevel = DEFAULT_PURPOSE_THINKING[purpose];

  // In Free Tier, if user explicitly set low thinking or override, apply it;
  // otherwise use the base level.
  const thinkingLevel = runtimeThinkingOverride ?? baseLevel;

  return Object.freeze({
    model,
    thinkingLevel,
  });
}

// Retain frozen object representation for backwards compatibility and test assertions
export const GEMINI_POLICIES: Readonly<Record<GeminiPurpose, GeminiPolicy>> = Object.freeze(
  Object.fromEntries(
    (Object.keys(DEFAULT_PURPOSE_THINKING) as GeminiPurpose[]).map((purpose) => [
      purpose,
      Object.freeze({
        model: DEFAULT_FREE_MODEL,
        thinkingLevel: DEFAULT_PURPOSE_THINKING[purpose],
      }),
    ])
  ) as Record<GeminiPurpose, GeminiPolicy>
);
