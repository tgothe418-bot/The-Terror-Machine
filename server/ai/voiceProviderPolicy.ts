export const VOICE_PROVIDERS = ['openai', 'gemini', 'zai', 'hemmingway', 'local'] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export const APPROVED_OPENAI_VOICE_MODELS = [
  'gpt-5.6-luna',
  'gpt-6-astra',
  'gpt-5.6-terra',
] as const;

export type OpenAiVoiceModelId = (typeof APPROVED_OPENAI_VOICE_MODELS)[number];

export const DEFAULT_VOICE_PROVIDER: VoiceProvider = 'openai';
export const DEFAULT_OPENAI_VOICE_MODEL: OpenAiVoiceModelId = 'gpt-5.6-luna';
export const DEFAULT_LOCAL_VOICE_BASE_URL = 'http://127.0.0.1:1234/v1';

function readConfiguredProvider(): VoiceProvider {
  const configured = process.env.VOICE_AI_PROVIDER?.trim().toLowerCase();
  if (configured === 'gemini') return 'gemini';
  if (configured === 'openai') return 'openai';
  if (configured === 'zai') return 'zai';
  if (configured === 'hemmingway') return 'hemmingway';
  if (configured === 'local') return 'local';
  return DEFAULT_VOICE_PROVIDER;
}

function readConfiguredOpenAiModel(): OpenAiVoiceModelId {
  const configured = process.env.OPENAI_VOICE_MODEL as OpenAiVoiceModelId | undefined;
  return configured && APPROVED_OPENAI_VOICE_MODELS.includes(configured)
    ? configured
    : DEFAULT_OPENAI_VOICE_MODEL;
}

let runtimeVoiceProvider: VoiceProvider = readConfiguredProvider();
let runtimeOpenAiVoiceModel: OpenAiVoiceModelId | null = null;
let runtimeLocalVoiceBaseUrl: string | null = null;
let runtimeLocalVoiceModel: string | null = null;
let runtimeLocalEngineModel: string | null = null;
let runtimeLocalAutopilotModel: string | null = null;
let runtimeLocalForgeModel: string | null = null;

export function getVoiceProvider(): VoiceProvider {
  return runtimeVoiceProvider;
}

export function setVoiceProvider(provider: VoiceProvider): void {
  if (!VOICE_PROVIDERS.includes(provider)) {
    throw new Error(`Provider ${provider} is not supported by The Voice.`);
  }
  runtimeVoiceProvider = provider;
}

export function getOpenAiVoiceModel(): OpenAiVoiceModelId {
  return runtimeOpenAiVoiceModel ?? readConfiguredOpenAiModel();
}

export function setOpenAiVoiceModel(model: OpenAiVoiceModelId | null): void {
  if (model && !APPROVED_OPENAI_VOICE_MODELS.includes(model)) {
    throw new Error(`Model ${model} is not approved for The Voice.`);
  }
  runtimeOpenAiVoiceModel = model;
}

export function getLocalVoiceBaseUrl(): string {
  return (
    runtimeLocalVoiceBaseUrl ??
    process.env.LOCAL_AI_BASE_URL?.trim() ??
    DEFAULT_LOCAL_VOICE_BASE_URL
  );
}

export function setLocalVoiceBaseUrl(baseUrl: string | null): void {
  runtimeLocalVoiceBaseUrl = baseUrl?.trim() || null;
}

export function getLocalVoiceModel(): string {
  return (
    runtimeLocalVoiceModel ??
    process.env.LOCAL_VOICE_MODEL?.trim() ??
    process.env.LOCAL_AI_MODEL?.trim() ??
    ''
  );
}

export function setLocalVoiceModel(model: string | null): void {
  runtimeLocalVoiceModel = model?.trim() || null;
}

export function getLocalEngineModel(): string {
  return (
    runtimeLocalEngineModel ??
    process.env.LOCAL_ENGINE_MODEL?.trim() ??
    getLocalVoiceModel()
  );
}

export function setLocalEngineModel(model: string | null): void {
  runtimeLocalEngineModel = model?.trim() || null;
}

export function getLocalAutopilotModel(): string {
  return (
    runtimeLocalAutopilotModel ??
    process.env.LOCAL_AUTOPILOT_MODEL?.trim() ??
    getLocalVoiceModel()
  );
}

export function setLocalAutopilotModel(model: string | null): void {
  runtimeLocalAutopilotModel = model?.trim() || null;
}

export function getLocalForgeModel(): string {
  return (
    runtimeLocalForgeModel ??
    process.env.LOCAL_FORGE_MODEL?.trim() ??
    getLocalVoiceModel()
  );
}

export function setLocalForgeModel(model: string | null): void {
  runtimeLocalForgeModel = model?.trim() || null;
}

