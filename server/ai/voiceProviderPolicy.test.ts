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
    setVoiceProvider('openai');
    setOpenAiVoiceModel(null);
  });

  afterEach(() => {
    setVoiceProvider('openai');
    setOpenAiVoiceModel(null);
  });

  it('defaults to OpenAI while allowing switching to Gemini', () => {
    expect(getVoiceProvider()).toBe('openai');
    setVoiceProvider('gemini');
    expect(getVoiceProvider()).toBe('gemini');
    setVoiceProvider('openai');
    expect(getVoiceProvider()).toBe('openai');
  });

  it('uses approved OpenAI model gpt-5.6-luna by default and rejects unknown model IDs', () => {
    expect(DEFAULT_OPENAI_VOICE_MODEL).toBe('gpt-5.6-luna');
    expect(APPROVED_OPENAI_VOICE_MODELS).toContain(DEFAULT_OPENAI_VOICE_MODEL);
    expect(getOpenAiVoiceModel()).toBe('gpt-5.6-luna');
    setOpenAiVoiceModel('gpt-5.6-terra');
    expect(getOpenAiVoiceModel()).toBe('gpt-5.6-terra');
    expect(() => {
      // @ts-expect-error verify the runtime boundary rejects arbitrary model strings
      setOpenAiVoiceModel('unknown-model');
    }).toThrow('not approved');
  });
});
