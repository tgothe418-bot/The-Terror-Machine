/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  EmptyProviderResponseError,
  type StructuredResponseContract,
} from './aiClient';
import {
  ZaiProviderError,
  generateZaiPlayerAction,
  generateZaiStructuredResponse,
  generateZaiText,
  hasZaiApiKey,
  pingZai,
  resetZaiApiKey,
} from './zaiClient';

type FetchCall = { url: string; headers: Record<string, string>; body: any };

function makeCompletionPayload(content: unknown, reasoning?: string) {
  return {
    id: 'chatcmpl-zai-test',
    choices: [
      {
        finish_reason: 'stop',
        message: {
          content,
          ...(reasoning !== undefined ? { reasoning_content: reasoning } : {}),
        },
      },
    ],
  };
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

const minimalContract: StructuredResponseContract<{ foo: string }> = {
  name: 'TEST_CONTRACT',
  responseJsonSchema: {
    type: 'object',
    properties: {
      foo: { type: 'string' },
    },
    required: ['foo'],
  },
  normalizeProviderPayload: (payload) => payload,
  zodSchema: z.object({ foo: z.string() }),
};

function captureFetch(responseFactory: (body: any) => Response) {
  const calls: FetchCall[] = [];
  vi.spyOn(global, 'fetch').mockImplementation(async (input: any, init?: any) => {
    const urlStr = typeof input === 'string' ? input : input.url;
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({
      url: urlStr,
      headers: (init?.headers ?? {}) as Record<string, string>,
      body,
    });
    return responseFactory(body);
  });
  return calls;
}

describe('Z.ai client', () => {
  beforeEach(() => {
    process.env.ZAI_API_KEY = 'test-zai-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetZaiApiKey('');
    delete process.env.ZAI_API_KEY;
  });

  it('reports key presence and fails closed with MISSING_API_KEY when absent', async () => {
    expect(hasZaiApiKey()).toBe(true);
    resetZaiApiKey('');
    expect(hasZaiApiKey()).toBe(false);

    await expect(
      generateZaiStructuredResponse('turn prompt', minimalContract)
    ).rejects.toMatchObject({ code: 'MISSING_API_KEY', status: 400 });
  });

  it('generates a structured turn through JSON mode with keyed auth and thinking enabled', async () => {
    const calls = captureFetch(() =>
      jsonResponse(makeCompletionPayload('{"foo":"bar"}'))
    );

    const result = await generateZaiStructuredResponse('turn prompt', minimalContract);

    expect(result).toEqual({ foo: 'bar' });
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.url).toBe('https://api.z.ai/api/paas/v4/chat/completions');
    expect(call.headers.Authorization).toBe('Bearer test-zai-key');
    expect(call.body.model).toBe('glm-4.6');
    expect(call.body.response_format).toEqual({ type: 'json_object' });
    expect(call.body.thinking).toEqual({ type: 'enabled' });
    expect(call.body.stream).toBe(false);
    expect(call.body.messages[0].content).toContain('FORMAT DIRECTIVE');
    expect(call.body.messages[0].content).toContain('RESPONSE SCHEMA');
  });

  it('unwraps fenced JSON before Zod validation', async () => {
    captureFetch(() =>
      jsonResponse(makeCompletionPayload('```json\n{"foo":"bar"}\n```'))
    );

    const result = await generateZaiStructuredResponse('turn prompt', minimalContract);
    expect(result).toEqual({ foo: 'bar' });
  });

  it('salvages JSON from reasoning_content when content is empty', async () => {
    captureFetch(() =>
      jsonResponse(
        makeCompletionPayload('', 'Let me think. {"foo":"from-reasoning"} done.')
      )
    );

    const result = await generateZaiStructuredResponse('turn prompt', minimalContract);
    expect(result).toEqual({ foo: 'from-reasoning' });
  });

  it('rejects empty responses instead of manufacturing content', async () => {
    captureFetch(() => jsonResponse(makeCompletionPayload('')));

    await expect(
      generateZaiStructuredResponse('turn prompt', minimalContract)
    ).rejects.toBeInstanceOf(EmptyProviderResponseError);
  });

  it('classifies an invalid key as INVALID_API_KEY without retrying', async () => {
    const calls = captureFetch(() =>
      jsonResponse({ error: { code: '1002', message: 'bad key' } }, 401)
    );

    await expect(
      generateZaiStructuredResponse('turn prompt', minimalContract)
    ).rejects.toMatchObject({ code: 'INVALID_API_KEY', status: 401 });
    expect(calls).toHaveLength(1);
  });

  it('treats Z.ai content-policy rejections (1301) as provider refusals', async () => {
    captureFetch(() =>
      jsonResponse({ error: { code: '1301', message: 'sensitive content' } }, 400)
    );

    await expect(
      generateZaiStructuredResponse('turn prompt', minimalContract)
    ).rejects.toMatchObject({ code: 'PROVIDER_REFUSAL' });
  });

  it('retries transient server failures once before giving up', async () => {
    let attempt = 0;
    const calls = captureFetch(() => {
      attempt++;
      if (attempt === 1) {
        return jsonResponse({ error: { message: 'overloaded' } }, 503);
      }
      return jsonResponse(makeCompletionPayload('{"foo":"recovered"}'));
    });

    const result = await generateZaiStructuredResponse('turn prompt', minimalContract);
    expect(result).toEqual({ foo: 'recovered' });
    expect(calls).toHaveLength(2);
  });

  it('falls back down the approved model chain on model-level 404 failure', async () => {
    const calls = captureFetch((body) => {
      if (body.model === 'glm-4.6') {
        return jsonResponse({ error: { message: 'model not found' } }, 404);
      }
      return jsonResponse(makeCompletionPayload('{"foo":"fallback"}'));
    });

    const result = await generateZaiStructuredResponse('turn prompt', minimalContract);
    expect(result).toEqual({ foo: 'fallback' });
    expect(calls).toHaveLength(2);
    expect(calls[0].body.model).toBe('glm-4.6');
    expect(calls[1].body.model).toBe('glm-4.5-air');
  });

  it('generates autopilot actions with thinking disabled and cleaned output', async () => {
    const calls = captureFetch(() =>
      jsonResponse(makeCompletionPayload('"Walks toward the door."'))
    );

    const action = await generateZaiPlayerAction('role directive');
    expect(action).toBe('Walks toward the door.');
    expect(calls[0].body.thinking).toEqual({ type: 'disabled' });
    expect(calls[0].body.max_tokens).toBe(2048);
  });

  it('generates Forge text with JSON mode only when requested', async () => {
    const calls = captureFetch(() => jsonResponse(makeCompletionPayload('{"ok":true}')));

    const plain = await generateZaiText('analyze this');
    expect(plain).toBe('{"ok":true}');
    expect(calls[0].body.response_format).toBeUndefined();

    const withJson = await generateZaiText('extract lore', { jsonMode: true });
    expect(withJson).toBe('{"ok":true}');
    expect(calls[1].body.response_format).toEqual({ type: 'json_object' });
    expect(calls[1].body.messages[0].content).toContain('FORMAT DIRECTIVE');
  });

  it('pings the provider and reports structured failure codes', async () => {
    const okCalls = captureFetch(() => jsonResponse(makeCompletionPayload('OK')));
    const ok = await pingZai();
    expect(ok).toMatchObject({ ok: true, provider: 'zai', model: 'glm-4.6' });
    expect(okCalls[0].headers.Authorization).toBe('Bearer test-zai-key');

    vi.restoreAllMocks();
    captureFetch(() => jsonResponse({ error: { code: '1002' } }, 401));
    const failed = await pingZai();
    expect(failed).toMatchObject({
      ok: false,
      provider: 'zai',
      code: 'INVALID_API_KEY',
      status: 401,
    });
  });

  it('throws a typed error instance usable for route-level handling', async () => {
    captureFetch(() => jsonResponse({ error: { message: 'nope' } }, 500));

    try {
      await generateZaiStructuredResponse('turn prompt', minimalContract);
      expect.unreachable('expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ZaiProviderError);
      const zaiError = error as ZaiProviderError;
      expect(zaiError.code).toBe('PROVIDER_FAILURE');
      expect(zaiError.status).toBe(500);
    }
  });
});
