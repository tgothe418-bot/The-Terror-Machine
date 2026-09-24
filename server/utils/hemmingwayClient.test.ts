/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  EmptyProviderResponseError,
  ProviderPrepaymentDepletedError,
  type StructuredResponseContract,
} from './aiClient';
import {
  generateHemmingwayPlayerAction,
  generateHemmingwayProse,
  generateHemmingwayStructuredResponse,
  generateHemmingwayText,
  generateHemmingwayVoice,
  hasHemmingwayApiKey,
  pingHemmingway,
  resetHemmingwayApiKey,
} from './hemmingwayClient';

type FetchCall = { url: string; headers: Record<string, string>; body: any };

function makeCompletionPayload(content: unknown, reasoning?: string, finishReason = 'stop') {
  return {
    id: 'chatcmpl-hemmingway-test',
    choices: [
      {
        finish_reason: finishReason,
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

const minimalContract: StructuredResponseContract<{ answer: string }> = {
  name: 'TEST_CONTRACT',
  responseJsonSchema: {
    type: 'object',
    properties: {
      answer: { type: 'string' },
    },
    required: ['answer'],
  },
  normalizeProviderPayload: (payload) => payload,
  zodSchema: z.object({ answer: z.string() }),
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

describe('Hemmingway client', () => {
  beforeEach(() => {
    process.env.HEMMINGWAY_API_KEY = 'test-hemmingway-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetHemmingwayApiKey('');
    delete process.env.HEMMINGWAY_API_KEY;
  });

  it('reports key presence and fails closed with MISSING_API_KEY when absent', async () => {
    expect(hasHemmingwayApiKey()).toBe(true);
    resetHemmingwayApiKey('');
    expect(hasHemmingwayApiKey()).toBe(false);

    await expect(
      generateHemmingwayStructuredResponse('turn prompt', minimalContract)
    ).rejects.toMatchObject({ code: 'MISSING_API_KEY', status: 400 });
  });

  it('generates a structured turn through JSON mode with bearer auth', async () => {
    const calls = captureFetch(() =>
      jsonResponse(makeCompletionPayload('{"answer":"survived"}'))
    );

    const result = await generateHemmingwayStructuredResponse('turn prompt', minimalContract);

    expect(result).toEqual({ answer: 'survived' });
    expect(calls).toHaveLength(1);
    const call = calls[0];
    expect(call.url).toBe('https://hemmingway.io/v1/chat/completions');
    expect(call.headers.Authorization).toBe('Bearer test-hemmingway-key');
    expect(call.body.model).toBe('hemmingway-27b');
    expect(call.body.response_format).toEqual({ type: 'json_object' });
  });

  it('salvages JSON structured output from reasoning_content when content is empty', async () => {
    captureFetch(() =>
      jsonResponse(makeCompletionPayload('', 'Thinking... {"answer":"salvaged"} done.'))
    );

    const result = await generateHemmingwayStructuredResponse('turn prompt', minimalContract);
    expect(result).toEqual({ answer: 'salvaged' });
  });

  it('throws EmptyProviderResponseError when response text is completely empty', async () => {
    captureFetch(() => jsonResponse(makeCompletionPayload('')));

    await expect(
      generateHemmingwayStructuredResponse('turn prompt', minimalContract)
    ).rejects.toBeInstanceOf(EmptyProviderResponseError);
  });

  it('translates HTTP 402 or out_of_credit into ProviderPrepaymentDepletedError', async () => {
    captureFetch(() =>
      jsonResponse({ error: { code: 'out_of_credit', message: 'No credits remaining' } }, 402)
    );

    await expect(
      generateHemmingwayStructuredResponse('turn prompt', minimalContract)
    ).rejects.toBeInstanceOf(ProviderPrepaymentDepletedError);
  });

  it('translates HTTP 429 into RATE_LIMIT_EXCEEDED HemmingwayProviderError', async () => {
    captureFetch(() =>
      jsonResponse({ error: { code: 'busy', message: 'Concurrency limit reached' } }, 429)
    );

    await expect(
      generateHemmingwayText('forge prompt')
    ).rejects.toMatchObject({ code: 'RATE_LIMIT_EXCEEDED', status: 429 });
  });

  it('generates text for Forge architecture and strips think tags', async () => {
    captureFetch(() =>
      jsonResponse(makeCompletionPayload('<think>Analyzing blueprint</think>Extracted Blueprint'))
    );

    const text = await generateHemmingwayText('forge prompt');
    expect(text).toBe('Extracted Blueprint');
  });

  it('generates prose and cleans simulation dialogue tags', async () => {
    captureFetch(() =>
      jsonResponse(makeCompletionPayload('The crypt door groans in the cold darkness.'))
    );

    const prose = await generateHemmingwayProse('init prompt');
    expect(prose).toBe('The crypt door groans in the cold darkness.');
  });

  it('generates simulated player action with reasoning disabled', async () => {
    const calls = captureFetch(() =>
      jsonResponse(makeCompletionPayload('I turn the heavy bronze valve to the left.'))
    );

    const action = await generateHemmingwayPlayerAction('player prompt');
    expect(action).toBe('I turn the heavy bronze valve to the left.');
    expect(calls[0].body.enable_thinking).toBe(false);
  });

  it('generates Historian voice response', async () => {
    captureFetch(() =>
      jsonResponse(makeCompletionPayload('The records confirm the mortuary was sealed in 1928.'))
    );

    const result = await generateHemmingwayVoice({
      instructions: 'You are the Historian',
      history: [{ role: 'user', content: 'What year was the mortuary built?' }],
    });

    expect(result).toEqual({
      text: 'The records confirm the mortuary was sealed in 1928.',
      model: 'hemmingway-27b',
      provider: 'hemmingway',
    });
  });

  it('pings the Hemmingway provider endpoint with OK and error states', async () => {
    captureFetch(() => jsonResponse(makeCompletionPayload('OK.')));

    const ok = await pingHemmingway();
    expect(ok).toMatchObject({ ok: true, provider: 'hemmingway', model: 'hemmingway-27b' });

    vi.restoreAllMocks();
    captureFetch(() => jsonResponse({ message: 'Bad key' }, 401));

    const fail = await pingHemmingway();
    expect(fail).toMatchObject({
      ok: false,
      provider: 'hemmingway',
      code: 'INVALID_API_KEY',
      status: 401,
    });
  });
});
