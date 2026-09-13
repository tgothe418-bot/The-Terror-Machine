export const VOICE_PROVIDERS = ['gemini', 'openai'] as const;
export type VoiceProvider = (typeof VOICE_PROVIDERS)[number];

export const APPROVED_OPENAI_VOICE_MODELS = [
  'gpt-6-astra',
  'gpt-5.6-terra',
  'gpt-5.6-luna',
] as const;

export type OpenAiVoiceModelId = (typeof APPROVED_OPENAI_VOICE_MODELS)[number];

export const DEFAULT_OPENAI_VOICE_MODEL: OpenAiVoiceModelId = 'gpt-6-astra';

function readConfiguredProvider(): VoiceProvider {
  const configured = process.env.VOICE_AI_PROVIDER?.trim().toLowerCase();
  return configured === 'openai' ? 'openai' : 'gemini';
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
