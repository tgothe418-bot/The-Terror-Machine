import { describe, expect, it, vi } from 'vitest';
import {
  QwenAdapter,
  QWEN_ENGINE_MODEL_ID,
  QWEN_PROVIDER_ID,
} from './qwenAdapter';
import { ProviderRequestError } from '../providerTypes';
import { qwenTurnResponseSchema } from '../qwenSchemaProjection';

describe('Qwen Provider Adapter (Packet 1-11A)', () => {
  it('Qwen Engine selection requires a private key and explicit compatible base URL', () => {
    // Missing key
    const noKeyAdapter = new QwenAdapter({
      apiKey: '',
      baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
    expect(noKeyAdapter.isConfigured()).toBe(false);

    // Missing or invalid URL
    const noUrlAdapter = new QwenAdapter({
      apiKey: 'sk-test-fake-key-12345',
      baseUrl: '',
    });
    expect(noUrlAdapter.isConfigured()).toBe(false);

    const httpUrlAdapter = new QwenAdapter({
      apiKey: 'sk-test-fake-key-12345',
      baseUrl: 'http://insecure.example.com/compatible-mode/v1',
    });
    expect(httpUrlAdapter.isConfigured()).toBe(false);

    const validAdapter = new QwenAdapter({
      apiKey: 'sk-test-fake-key-12345',
      baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/',
    });
    expect(validAdapter.isConfigured()).toBe(true);
  });

  it('Qwen adapter accepts only the single pinned admitted model', () => {
    expect(QWEN_PROVIDER_ID).toBe('qwen');
    expect(QWEN_ENGINE_MODEL_ID).toBe('qwen3.7-flash-2026-07-15');

    const adapter = new QwenAdapter({
      apiKey: 'sk-test-fake-key-12345',
      baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
    });
    expect(adapter.defaultModelId).toBe('qwen3.7-flash-2026-07-15');
    expect(adapter.structuredOutput).toBe('STRICT_JSON_SCHEMA');
  });

  it('Qwen request sends the exact paired strict JSON Schema in one provider call', async () => {
    let capturedUrl = '';
    let capturedOptions: RequestInit | undefined;

    const mockFetch = vi.fn().mockImplementation(async (url: string, options: RequestInit) => {
      capturedUrl = url;
      capturedOptions = options;
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({ narrative_blocks: [] }),
              },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const adapter = new QwenAdapter(
      {
        apiKey: 'sk-test-fake-key-12345',
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      },
      mockFetch as unknown as typeof fetch
    );

    const result = await adapter.generateStructured({
      prompt: 'Test prompt for Qwen',
      modelId: QWEN_ENGINE_MODEL_ID,
      contractName: 'ENGINE_TURN',
      responseSchema: qwenTurnResponseSchema,
    });

    expect(result.kind).toBe('CONTENT');
    if (result.kind === 'CONTENT') {
      expect(result.text).toBe(JSON.stringify({ narrative_blocks: [] }));
    }

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(capturedUrl).toBe('https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions');

    const headers = capturedOptions?.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer sk-test-fake-key-12345');
    expect(headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(capturedOptions?.body as string);
    expect(body.model).toBe('qwen3.7-flash-2026-07-15');
    expect(body.messages).toEqual([{ role: 'user', content: 'Test prompt for Qwen' }]);
    expect(body.enable_thinking).toBe(false);
    expect(body.stream).toBe(false);
    expect(body.max_tokens).toBeUndefined();

    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.name).toBe('engine_turn');
    expect(body.response_format.json_schema.strict).toBe(true);
    expect(body.response_format.json_schema.schema).toEqual(qwenTurnResponseSchema);
  });

  it('Qwen refusal empty response and transport failure expose bounded provider errors only', async () => {
    // 1. Refusal finish_reason
    const refusalFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '' },
              finish_reason: 'content_filter',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    const refusalAdapter = new QwenAdapter(
      {
        apiKey: 'sk-test-fake-key-12345',
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      },
      refusalFetch as unknown as typeof fetch
    );

    const refusalResult = await refusalAdapter.generateStructured({
      prompt: 'Refusal probe',
      modelId: QWEN_ENGINE_MODEL_ID,
      contractName: 'ENGINE_TURN',
      responseSchema: qwenTurnResponseSchema,
    });
    expect(refusalResult.kind).toBe('PROVIDER_REFUSAL');

    // 2. Blank content with stop
    const blankFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: '   ' },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const blankAdapter = new QwenAdapter(
      {
        apiKey: 'sk-test-fake-key-12345',
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      },
      blankFetch as unknown as typeof fetch
    );
    const blankResult = await blankAdapter.generateStructured({
      prompt: 'Blank probe',
      modelId: QWEN_ENGINE_MODEL_ID,
      contractName: 'ENGINE_TURN',
      responseSchema: qwenTurnResponseSchema,
    });
    expect(blankResult.kind).toBe('EMPTY_PROVIDER_RESPONSE');

    // 3. Non-2xx HTTP status
    const errorFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { message: 'Invalid API key', code: 'invalid_api_key' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    );
    const errorAdapter = new QwenAdapter(
      {
        apiKey: 'sk-test-fake-key-12345',
        baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
      },
      errorFetch as unknown as typeof fetch
    );
    await expect(
      errorAdapter.generateStructured({
        prompt: 'Error probe',
        modelId: QWEN_ENGINE_MODEL_ID,
        contractName: 'ENGINE_TURN',
        responseSchema: qwenTurnResponseSchema,
      })
    ).rejects.toThrow(ProviderRequestError);
  });
});
