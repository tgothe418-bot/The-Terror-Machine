export const VOICE_PROVIDERS = ['openai', 'gemini'] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export const APPROVED_OPENAI_VOICE_MODELS = [
  'gpt-5.6-luna',
  'gpt-6-astra',
  'gpt-5.6-terra',
] as const;

export type OpenAiVoiceModelId = (typeof APPROVED_OPENAI_VOICE_MODELS)[number];

export const DEFAULT_VOICE_PROVIDER: VoiceProvider = 'openai';
export const DEFAULT_OPENAI_VOICE_MODEL: OpenAiVoiceModelId = 'gpt-5.6-luna';

function readConfiguredProvider(): VoiceProvider {
  const configured = process.env.VOICE_AI_PROVIDER?.trim().toLowerCase();
  if (configured === 'gemini') return 'gemini';
  if (configured === 'openai') return 'openai';
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
