import http from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateGemini: vi.fn(),
  generateOpenAiVoice: vi.fn(),
  pingOpenAiVoice: vi.fn(),
}));

vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    getAiClient: () => ({
      models: { generateContent: (...args: unknown[]) => mocks.generateGemini(...args) },
    }),
  };
});

vi.mock('../utils/openaiVoiceClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/openaiVoiceClient')>();
  return {
    ...actual,
    generateOpenAiVoice: (...args: unknown[]) => mocks.generateOpenAiVoice(...args),
    pingOpenAiVoice: (...args: unknown[]) => mocks.pingOpenAiVoice(...args),
  };
});

import { createApp } from '../app';
import { setActiveModelId, setActiveTier } from '../ai/modelPolicy';
import { setOpenAiVoiceModel, setVoiceProvider } from '../ai/voiceProviderPolicy';

describe('Voice provider route', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = await createApp({ enableSpaFallback: false });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const address = server.address();
        if (address && typeof address === 'object') baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    setActiveTier('free');
    setActiveModelId(null);
    setVoiceProvider('gemini');
    setOpenAiVoiceModel(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setActiveTier('free');
    setActiveModelId(null);
    setVoiceProvider('gemini');
    setOpenAiVoiceModel(null);
  });

  it('routes /api/voice through OpenAI when selected', async () => {
    setVoiceProvider('openai');
    mocks.generateOpenAiVoice.mockResolvedValueOnce({
      text: 'OpenAI Voice online.',
      model: 'gpt-6-astra',
      searchQueries: ['test query'],
    });

    const response = await fetch(`${baseUrl}/api/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [{ role: 'user', content: 'Hello.' }] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      text: 'OpenAI Voice online.',
      provider: 'openai',
      model: 'gpt-6-astra',
      searchQueries: ['test query'],
    });
    expect(mocks.generateOpenAiVoice).toHaveBeenCalledOnce();
    expect(mocks.generateGemini).not.toHaveBeenCalled();
  });

  it('keeps Gemini available through both the provider-neutral and legacy endpoints', async () => {
    mocks.generateGemini.mockResolvedValue({
      text: 'Gemini Voice online.',
      candidates: [],
    });

    for (const endpoint of ['/api/voice', '/api/gemini/voice']) {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: [{ role: 'user', content: 'Hello.' }] }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({
        text: 'Gemini Voice online.',
        provider: 'gemini',
      });
    }
    expect(mocks.generateOpenAiVoice).not.toHaveBeenCalled();
  });

  it('reports an unexpected OpenAI failure without mislabeling it as Gemini', async () => {
    setVoiceProvider('openai');
    mocks.generateOpenAiVoice.mockRejectedValueOnce(new TypeError('network detail'));

    const response = await fetch(`${baseUrl}/api/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [{ role: 'user', content: 'Hello.' }] }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: 'The OpenAI Voice request failed before a response was completed.',
      code: 'PROVIDER_FAILURE',
      provider: 'openai',
    });
  });

  it('validates a calibration update before changing any provider setting', async () => {
    const response = await fetch(`${baseUrl}/api/ai/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tier: 'paid',
        voiceProvider: 'openai',
        openAiModel: 'unapproved-model',
      }),
    });

    expect(response.status).toBe(400);
    const current = await fetch(`${baseUrl}/api/ai/config`).then((result) => result.json());
    expect(current).toMatchObject({
      tier: 'free',
      voiceProvider: 'gemini',
      openAiModel: 'gpt-5.6-luna',
    });
  });

  it('tests an unsaved OpenAI key and model through the selected provider diagnostic', async () => {
    mocks.pingOpenAiVoice.mockResolvedValueOnce({
      ok: true,
      provider: 'openai',
      model: 'gpt-5.6-luna',
      latencyMs: 12,
    });

    const response = await fetch(`${baseUrl}/api/ai/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'openai',
        model: 'gpt-5.6-luna',
        apiKey: 'sk-unsaved-test',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      provider: 'openai',
      model: 'gpt-5.6-luna',
    });
    expect(mocks.pingOpenAiVoice).toHaveBeenCalledWith({
      model: 'gpt-5.6-luna',
      apiKey: 'sk-unsaved-test',
    });
  });
});
