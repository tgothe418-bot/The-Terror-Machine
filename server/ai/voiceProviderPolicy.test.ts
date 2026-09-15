import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APPROVED_OPENAI_VOICE_MODELS,
  DEFAULT_LOCAL_VOICE_BASE_URL,
  DEFAULT_OPENAI_VOICE_MODEL,
  getLocalAutopilotModel,
  getLocalEngineModel,
  getLocalForgeModel,
  getLocalVoiceBaseUrl,
  getLocalVoiceModel,
  getOpenAiVoiceModel,
  getVoiceProvider,
  setLocalAutopilotModel,
  setLocalEngineModel,
  setLocalForgeModel,
  setOpenAiVoiceModel,
  setLocalVoiceBaseUrl,
  setLocalVoiceModel,
  setVoiceProvider,
} from './voiceProviderPolicy';

describe('Voice provider policy', () => {
  beforeEach(() => {
    setVoiceProvider('openai');
    setOpenAiVoiceModel(null);
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
    setLocalEngineModel(null);
    setLocalAutopilotModel(null);
    setLocalForgeModel(null);
  });

  afterEach(() => {
    setVoiceProvider('openai');
    setOpenAiVoiceModel(null);
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
    setLocalEngineModel(null);
    setLocalAutopilotModel(null);
    setLocalForgeModel(null);
  });

  it('defaults to OpenAI while allowing switching to Gemini', () => {
    expect(getVoiceProvider()).toBe('openai');
    setVoiceProvider('gemini');
    expect(getVoiceProvider()).toBe('gemini');
    setVoiceProvider('openai');
    expect(getVoiceProvider()).toBe('openai');
  });

  it('keeps Local provider settings independent from the selected provider', () => {
    setVoiceProvider('local');
    setLocalVoiceBaseUrl('http://127.0.0.1:8080/v1');
    setLocalVoiceModel('Qwen/Qwen3.8-27B');

    expect(getVoiceProvider()).toBe('local');
    expect(DEFAULT_LOCAL_VOICE_BASE_URL).toBe('http://127.0.0.1:1234/v1');
    expect(getLocalVoiceBaseUrl()).toBe('http://127.0.0.1:8080/v1');
    expect(getLocalVoiceModel()).toBe('Qwen/Qwen3.8-27B');
  });

  it('inherits localVoiceModel for subsystem models by default and allows distinct overrides', () => {
    setLocalVoiceModel('mistralai/mistral-nemo-instruct-2407');
    expect(getLocalEngineModel()).toBe('mistralai/mistral-nemo-instruct-2407');
    expect(getLocalAutopilotModel()).toBe('mistralai/mistral-nemo-instruct-2407');
    expect(getLocalForgeModel()).toBe('mistralai/mistral-nemo-instruct-2407');

    setLocalEngineModel('qwen/qwen3-14b');
    setLocalAutopilotModel('google/gemma-4-e4b');
    setLocalForgeModel('qwen/qwen3.8-27b');

    expect(getLocalEngineModel()).toBe('qwen/qwen3-14b');
    expect(getLocalAutopilotModel()).toBe('google/gemma-4-e4b');
    expect(getLocalForgeModel()).toBe('qwen/qwen3.8-27b');
    expect(getLocalVoiceModel()).toBe('mistralai/mistral-nemo-instruct-2407');
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
