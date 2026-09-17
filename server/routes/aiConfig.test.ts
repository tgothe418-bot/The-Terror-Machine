import http from 'http';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../app';

describe('AI Config and Warmup routes', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    process.env.DISABLE_LMS_CLI = 'true';
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
    delete process.env.DISABLE_LMS_CLI;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  });

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/ai/config', () => {
    it('returns configuration payload with local models and approved providers', async () => {
      const res = await fetch(`${baseUrl}/api/ai/config`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data).toHaveProperty('tier');
      expect(data).toHaveProperty('engineProvider');
      expect(data).toHaveProperty('voiceProvider');
      expect(data).toHaveProperty('localBaseUrl');
      expect(data).toHaveProperty('localForgeModel');
    });

    it('exposes the Z.ai provider on both subsystem provider lists with its policy surface', async () => {
      const res = await fetch(`${baseUrl}/api/ai/config`);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.engineProviders).toContain('zai');
      expect(data.voiceProviders).toContain('zai');
      expect(data.approvedZaiModels).toContain('glm-4.6');
      expect(data).toHaveProperty('zaiModel');
      expect(data).toHaveProperty('defaultZaiModel');
      expect(data).toHaveProperty('zaiEndpoint');
      expect(data).toHaveProperty('hasZaiApiKey');
      expect(data).toHaveProperty('maskedZaiApiKey');
    });
  });

  describe('POST /api/ai/ping for Z.ai', () => {
    it('rejects unapproved Z.ai model IDs before any provider request', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      const res = await fetch(`${baseUrl}/api/ai/ping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: 'zai', model: 'not-a-glm-model' }),
      });
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toContain('Z.ai model must be one of');
      const outboundProviderCalls = fetchSpy.mock.calls.filter(
        ([url]) => typeof url === 'string' && url.includes('api.z.ai')
      );
      expect(outboundProviderCalls).toHaveLength(0);
      vi.restoreAllMocks();
    });
  });

  describe('POST /api/ai/warmup', () => {
    it('returns empty results when no models are provided', async () => {
      const res = await fetch(`${baseUrl}/api/ai/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ models: [] }),
      });
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.results).toEqual([]);
    });

    it('pings each unique model concurrently with 1 token', async () => {
      const fetchCalls: { url: string; body: any }[] = [];
      const originalFetch = global.fetch;

      vi.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
        const urlStr = typeof input === 'string' ? input : input.url;
        if (urlStr.includes('/chat/completions')) {
          fetchCalls.push({
            url: urlStr,
            body: init?.body ? JSON.parse(init.body as string) : undefined,
          });
          return new Response(
            JSON.stringify({
              id: 'chatcmpl-test',
              choices: [{ message: { content: 'pong' } }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return originalFetch(input, init);
      });

      const res = await fetch(`${baseUrl}/api/ai/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://127.0.0.1:1234/v1',
          models: ['qwen2.5-vl-7b', 'mistral-nemo-instruct', 'google/gemma-4-e4b'],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.results).toHaveLength(3);
      expect(data.results.map((r: any) => r.model)).toEqual([
        'qwen2.5-vl-7b',
        'mistral-nemo-instruct',
        'google/gemma-4-e4b',
      ]);
      expect(data.results.every((r: any) => r.ok === true)).toBe(true);

      expect(fetchCalls).toHaveLength(3);
      for (const call of fetchCalls) {
        expect(call.url).toContain('/chat/completions');
        expect(call.body.max_tokens).toBe(1);
        expect(call.body.messages).toEqual([{ role: 'user', content: 'ping' }]);
      }
    });

    it('gracefully handles individual model failure without breaking others', async () => {
      const originalFetch = global.fetch;

      vi.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
        const urlStr = typeof input === 'string' ? input : input.url;
        if (urlStr.includes('/chat/completions')) {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          if (body.model === 'failing-model') {
            return new Response(JSON.stringify({ error: 'Model failed to load' }), {
              status: 500,
              headers: { 'Content-Type': 'application/json' },
            });
          }
          return new Response(
            JSON.stringify({
              id: 'chatcmpl-test',
              choices: [{ message: { content: 'pong' } }],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return originalFetch(input, init);
      });

      const res = await fetch(`${baseUrl}/api/ai/warmup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://127.0.0.1:1234/v1',
          models: ['working-model', 'failing-model'],
        }),
      });

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.results).toHaveLength(2);
      expect(data.results.find((r: any) => r.model === 'working-model')?.ok).toBe(true);
      expect(data.results.find((r: any) => r.model === 'failing-model')?.ok).toBe(false);
    });
  });
});
