import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APPROVED_OPENAI_VOICE_MODELS,
  DEFAULT_OPENAI_VOICE_MODEL,
  getOpenAiVoiceModel,
  getVoiceProvider,
  setOpenAiVoiceModel,
  setVoiceProvider,
} from './voiceProviderPolicy';

describe('Voice provider policy', () => {
  beforeEach(() => {
    setVoiceProvider('gemini');
    setOpenAiVoiceModel(null);
  });

  afterEach(() => {
    setVoiceProvider('gemini');
    setOpenAiVoiceModel(null);
  });

  it('keeps Gemini as the default while allowing an isolated OpenAI Voice selection', () => {
    expect(getVoiceProvider()).toBe('gemini');
    setVoiceProvider('openai');
    expect(getVoiceProvider()).toBe('openai');
  });

  it('uses an approved OpenAI model and rejects unknown model IDs', () => {
    expect(APPROVED_OPENAI_VOICE_MODELS).toContain(DEFAULT_OPENAI_VOICE_MODEL);
    expect(getOpenAiVoiceModel()).toBe(DEFAULT_OPENAI_VOICE_MODEL);
    setOpenAiVoiceModel('gpt-5.6-terra');
    expect(getOpenAiVoiceModel()).toBe('gpt-5.6-terra');
    expect(() => {
      // @ts-expect-error verify the runtime boundary rejects arbitrary model strings
      setOpenAiVoiceModel('unknown-model');
    }).toThrow('not approved');
  });
});
