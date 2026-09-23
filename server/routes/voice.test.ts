import http from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  generateGemini: vi.fn(),
  generateOpenAiVoice: vi.fn(),
  pingOpenAiVoice: vi.fn(),
  generateLocalVoice: vi.fn(),
  pingLocalVoice: vi.fn(),
  discoverLocalVoiceModels: vi.fn(),
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

vi.mock('../utils/localVoiceClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/localVoiceClient')>();
  return {
    ...actual,
    generateLocalVoice: (...args: unknown[]) => mocks.generateLocalVoice(...args),
    pingLocalVoice: (...args: unknown[]) => mocks.pingLocalVoice(...args),
    discoverLocalVoiceModels: (...args: unknown[]) => mocks.discoverLocalVoiceModels(...args),
  };
});

import { createApp } from '../app';
import { setActiveModelId, setActiveTier } from '../ai/modelPolicy';
import {
  setLocalVoiceBaseUrl,
  setLocalVoiceModel,
  setOpenAiVoiceModel,
  setVoiceProvider,
} from '../ai/voiceProviderPolicy';

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
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setActiveTier('free');
    setActiveModelId(null);
    setVoiceProvider('gemini');
    setOpenAiVoiceModel(null);
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
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

  it('routes The Voice through the selected Local provider', async () => {
    setVoiceProvider('local');
    mocks.generateLocalVoice.mockResolvedValueOnce({
      text: 'Local Voice online.',
      model: 'Qwen/Qwen3.8-27B',
      provider: 'local',
    });

    const response = await fetch(`${baseUrl}/api/voice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ history: [{ role: 'user', content: 'Hello.' }] }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      text: 'Local Voice online.',
      provider: 'local',
      model: 'Qwen/Qwen3.8-27B',
    });
    expect(mocks.generateLocalVoice).toHaveBeenCalledOnce();
    expect(mocks.generateGemini).not.toHaveBeenCalled();
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

  it('updates and persists subsystem local models via /api/ai/config', async () => {
    const response = await fetch(`${baseUrl}/api/ai/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        localEngineModel: 'mistralai/mistral-nemo-instruct-2407',
        localAutopilotModel: 'google/gemma-4-e4b',
        localVoiceModel: 'magnum-v4-12b',
        localForgeModel: 'qwen/qwen3.8-27b',
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.localEngineModel).toBe('mistralai/mistral-nemo-instruct-2407');
    expect(body.localAutopilotModel).toBe('google/gemma-4-e4b');
    expect(body.localVoiceModel).toBe('magnum-v4-12b');
    expect(body.localForgeModel).toBe('qwen/qwen3.8-27b');
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

  it('discovers and pings a Local provider without saving the configuration first', async () => {
    mocks.discoverLocalVoiceModels.mockResolvedValueOnce(['Qwen/Qwen3.8-27B']);
    const models = await fetch(
      `${baseUrl}/api/ai/local-models?baseUrl=${encodeURIComponent('http://127.0.0.1:8080/v1')}`
    );
    expect(models.status).toBe(200);
    expect(await models.json()).toEqual({ models: ['Qwen/Qwen3.8-27B'] });
    expect(mocks.discoverLocalVoiceModels).toHaveBeenCalledWith('http://127.0.0.1:8080/v1');

    mocks.pingLocalVoice.mockResolvedValueOnce({
      ok: true,
      provider: 'local',
      model: 'Qwen/Qwen3.8-27B',
      models: ['Qwen/Qwen3.8-27B'],
      baseUrl: 'http://127.0.0.1:8080/v1',
      latencyMs: 8,
    });
    const ping = await fetch(`${baseUrl}/api/ai/ping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'local',
        baseUrl: 'http://127.0.0.1:8080/v1',
        model: 'Qwen/Qwen3.8-27B',
      }),
    });
    expect(ping.status).toBe(200);
    expect(await ping.json()).toMatchObject({ ok: true, provider: 'local' });
    expect(mocks.pingLocalVoice).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:8080/v1',
      model: 'Qwen/Qwen3.8-27B',
    });
  });

  describe('/api/voice — Engine Telemetry Injection', () => {
    it('accepts payload without telemetry for backward compatibility', async () => {
      mocks.generateGemini.mockResolvedValueOnce({
        text: 'Voice response without telemetry.',
        candidates: [],
      });
      const payload = { message: 'What is this place?' };
      const res = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).not.toBe(400);
      expect(res.status).toBe(200);
    });

    it('accepts and validates complete engineTelemetry payload', async () => {
      mocks.generateGemini.mockResolvedValueOnce({
        text: 'You are in the embalming room.',
        candidates: [],
      });
      const payload = {
        message: 'Who is here with me?',
        engineTelemetry: {
          scenarioTitle: 'The Black Iron Mortuary',
          macroPhase: 'TENSION_COMPLICATIONS',
          currentChamber: { id: 'room-embalming', name: 'Embalming Room' },
          coPresentCast: [{ id: 'char-entity-41', name: 'Entity 41', status: 'ALIVE' }],
          activeClocks: [{ id: 'clk-drain', name: 'Vat Draining', value: 2, max: 4 }],
          manifestations: ['Ammonia odor fills the room'],
        },
      };
      const res = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).not.toBe(400);
      expect(res.status).toBe(200);
    });

    it('rejects malformed telemetry missing required fields', async () => {
      const payload = {
        message: 'Status check',
        engineTelemetry: {
          scenarioTitle: 'Broken Mortuary',
          // Missing currentChamber, coPresentCast, etc.
        },
      };
      const res = await fetch(`${baseUrl}/api/voice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(400);
    });
  });
});
