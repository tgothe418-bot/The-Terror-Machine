import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setOpenAiVoiceModel } from '../ai/voiceProviderPolicy';
import {
  OpenAiVoiceError,
  buildOpenAiVoiceInput,
  generateOpenAiVoice,
  resetOpenAiApiKey,
} from './openaiVoiceClient';

describe('OpenAI Voice client', () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    resetOpenAiApiKey('sk-test-only');
    setOpenAiVoiceModel('gpt-6-astra');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    resetOpenAiApiKey(originalKey || '');
    setOpenAiVoiceModel(null);
    vi.restoreAllMocks();
  });

  it('translates bounded history plus text, image, and PDF attachments', () => {
    const input = buildOpenAiVoiceInput([
      { role: 'assistant', content: 'orphaned preface' },
      {
        role: 'user',
        content: 'Inspect these.',
        attachments: [
          {
            name: 'note.md',
            mimeType: 'text/markdown',
            data: Buffer.from('hello').toString('base64'),
          },
          { name: 'room.png', mimeType: 'image/png', data: 'aW1hZ2U=' },
          { name: 'report.pdf', mimeType: 'application/pdf', data: 'cGRm' },
        ],
      },
      { role: 'voice', content: 'I see them.' },
    ]);

    expect(input).toHaveLength(3);
    expect(input[0].role).toBe('user');
    expect(input[0].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'input_text', text: expect.stringContaining('hello') }),
        expect.objectContaining({
          type: 'input_image',
          image_url: 'data:image/png;base64,aW1hZ2U=',
        }),
        expect.objectContaining({ type: 'input_file', filename: 'report.pdf' }),
      ])
    );
    expect(input[1]).toEqual({ role: 'assistant', content: 'I see them.' });
    expect(input[2]).toEqual({ role: 'user', content: 'Proceed.' });
  });

  it('calls the Responses API and extracts text and search metadata', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [
            { type: 'web_search_call', action: { query: 'Greyhaven ferry terminal' } },
            { type: 'message', content: [{ type: 'output_text', text: 'The line is open.' }] },
          ],
        }),
        { status: 200 }
      )
    );
    globalThis.fetch = fetchMock;

    const result = await generateOpenAiVoice({
      instructions: 'Stay behind the glass.',
      history: [{ role: 'user', content: 'Can you hear me?' }],
    });

    expect(result).toEqual({
      text: 'The line is open.',
      model: 'gpt-6-astra',
      searchQueries: ['Greyhaven ferry terminal'],
    });
    const [url, request] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/responses');
    expect(request.headers.Authorization).toBe('Bearer sk-test-only');
    const body = JSON.parse(request.body);
    expect(body).toMatchObject({
      model: 'gpt-6-astra',
      instructions: 'Stay behind the glass.',
      reasoning: { effort: 'medium' },
      tools: [{ type: 'web_search_preview' }],
      store: false,
    });
  });

  it('turns HTTP and refusal responses into bounded errors', async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'sensitive provider detail' } }), {
          status: 401,
        })
      );
    await expect(
      generateOpenAiVoice({
        instructions: 'test',
        history: [{ role: 'user', content: 'hello' }],
      })
    ).rejects.toMatchObject({
      code: 'INVALID_API_KEY',
      status: 401,
      message: 'The OpenAI API key is invalid or unavailable to this project.',
    });

    globalThis.fetch = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          status: 'completed',
          output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'raw refusal' }] }],
        }),
        { status: 200 }
      )
    );
    await expect(
      generateOpenAiVoice({
        instructions: 'test',
        history: [{ role: 'user', content: 'hello' }],
      })
    ).rejects.toMatchObject({
      name: OpenAiVoiceError.name,
      code: 'PROVIDER_REFUSAL',
    });
  });
});
