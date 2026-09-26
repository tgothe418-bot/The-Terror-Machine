import http from 'http';
import { describe, expect, it, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../app';
import { setVoiceProvider, setLocalVoiceBaseUrl, setLocalVoiceModel } from '../ai/voiceProviderPolicy';
import { setEngineProvider } from '../ai/modelPolicy';

const mockGenerateContent = vi.fn();
vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    getAiClient: () => ({
      models: {
        generateContent: (...args: unknown[]) => mockGenerateContent(...args),
      },
    }),
  };
});

describe('Chat Routes - /api/simulate-player', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = await createApp({ enableSpaFallback: false });
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    setVoiceProvider('gemini');
    setEngineProvider('gemini');
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
  });

  afterEach(() => {
    setVoiceProvider('gemini');
    setEngineProvider('gemini');
    setLocalVoiceBaseUrl(null);
    setLocalVoiceModel(null);
    vi.restoreAllMocks();
  });

  const basePayload = {
    history: [{ role: 'assistant', content: 'You hear footsteps.' }],
    logicState: { current_phase: 'MANIFEST', suggested_tension: 40 },
  };

  it('returns exact trimmed action for valid provider response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: 'STOP' }],
      text: '  I slowly back away towards the exit.  ',
    });

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { action: string };
    expect(data.action).toBe('I slowly back away towards the exit.');
  });

  it('injects active somatic state and felt wound knowledge into simulated player prompt', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: 'STOP' }],
      text: 'I clutch my bleeding shoulder and back away slowly.',
    });

    const payloadWithSomaticAndWounds = {
      history: [{ role: 'assistant', content: 'The creature strikes from the dark.' }],
      characterName: 'Mercer',
      logicState: {
        current_phase: 'MANIFEST',
        somaticState: '[SOMATIC STATE: Mercer (Band 2: HAND_TREMOR, COLD_SWEAT)]',
        deathLedger: {
          wounds: [
            {
              id: 'Mercer:w1',
              characterId: 'Mercer',
              severity: 'serious',
              mechanism: 'claw laceration',
              location: 'left shoulder',
              treated: false,
            },
          ],
        },
      },
    };

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithSomaticAndWounds),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { action: string };
    expect(data.action).toBe('I clutch my bleeding shoulder and back away slowly.');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateContent.mock.calls[0][0].contents;
    expect(promptArg).toContain('ACTIVE SOMATIC STATE:');
    expect(promptArg).toContain('[SOMATIC STATE: Mercer (Band 2: HAND_TREMOR, COLD_SWEAT)]');
    expect(promptArg).toContain('FELT WOUND KNOWLEDGE:');
    expect(promptArg).toContain('[FELT WOUNDS: serious claw laceration to left shoulder [active/untreated]]');
  });

  it('correctly derives somatic tokens and extracts felt wounds from canonical Record-shaped salienceLedger and deathLedger', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: 'STOP' }],
      text: 'I try to breathe through the pain and hold the door shut.',
    });

    const payloadCanonicalLedgers = {
      history: [{ role: 'assistant', content: 'The heavy iron door rattles violently.' }],
      characterName: 'Elena Mercer',
      logicState: {
        current_phase: 'MANIFEST',
        cast: [
          { id: 'char-mercer', name: 'Elena Mercer', disposition: 'SURVIVOR' },
        ],
        fearContract: {
          fearlessness: { 'char-mercer': 0.0 },
          somaticBands: { band1: 0.25, band2: 0.50, band3: 0.75, band4: 0.90 },
        },
        salienceLedger: {
          'char-mercer': {
            spike: 0.85,
            dread: 0.10,
            threatType: 'life',
            provenance: [],
            preyMode: true,
          },
        },
        deathLedger: {
          'char-mercer': [
            {
              id: 'wound-1',
              characterId: 'char-mercer',
              characterName: 'Elena Mercer',
              severity: 'grave',
              mechanism: 'crushing trauma',
              location: 'ribcage',
              treated: false,
            },
          ],
        },
      },
    };

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadCanonicalLedgers),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as { action: string };
    expect(data.action).toBe('I try to breathe through the pain and hold the door shut.');

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateContent.mock.calls[0][0].contents;
    expect(promptArg).toContain('ACTIVE SOMATIC STATE:');
    expect(promptArg).toContain('[SOMATIC STATE: Elena Mercer (Band 4: FREEZE_IMMOBILITY, DISSOCIATIVE_STARE, INVOLUNTARY_VOCALIZATION)]');
    expect(promptArg).toContain('FELT WOUND KNOWLEDGE:');
    expect(promptArg).toContain('[FELT WOUNDS: grave crushing trauma to ribcage [active/untreated]]');
  });

  it('returns HTTP 502 with PROVIDER_REFUSAL and no action field for prompt-level block', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      promptFeedback: { blockReason: 'SAFETY' },
      text: null,
    });

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    expect(res.status).toBe(502);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.code).toBe('PROVIDER_REFUSAL');
    expect(data.action).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('I look around carefully');
    expect(JSON.stringify(data)).not.toContain('SAFETY');
  });

  it('returns HTTP 502 with PROVIDER_REFUSAL and no action field for candidate finishReason block', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: 'PROHIBITED_CONTENT' }],
      text: '',
    });

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    expect(res.status).toBe(502);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.code).toBe('PROVIDER_REFUSAL');
    expect(data.action).toBeUndefined();
  });

  it('returns HTTP 502 with AUTOPILOT_ACTION_FAILURE and no action field for empty response', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      candidates: [{ finishReason: 'STOP' }],
      text: '   ',
    });

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    expect(res.status).toBe(502);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.code).toBe('AUTOPILOT_ACTION_FAILURE');
    expect(data.action).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('I look around carefully');
  });

  it('returns HTTP 502 with AUTOPILOT_ACTION_FAILURE and no action field for thrown provider error', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('https://generativelanguage.googleapis.com: 500 Internal Error with Key=AIzaSy_Secret')
    );

    const res = await fetch(`${baseUrl}/api/simulate-player`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(basePayload),
    });

    expect(res.status).toBe(502);
    const data = (await res.json()) as Record<string, unknown>;
    expect(data.code).toBe('AUTOPILOT_ACTION_FAILURE');
    expect(data.action).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('generativelanguage.googleapis.com');
    expect(JSON.stringify(data)).not.toContain('AIzaSy_Secret');
  });

  describe('when voiceProvider is local', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      setVoiceProvider('local');
      setLocalVoiceBaseUrl('http://127.0.0.1:1234/v1');
      setLocalVoiceModel('google/gemma-4-e4b');
    });

    it('routes through local model, cleaning fences and prefixes', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const urlStr = String(input);
        if (urlStr.startsWith(baseUrl)) {
          return originalFetch(input, init);
        }
        if (urlStr.endsWith('/v1/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'google/gemma-4-e4b' }] }), {
            status: 200,
          });
        }
        if (urlStr.endsWith('/v1/chat/completions')) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: '```text\nPLAYER: "I check the locked drawer."\n```',
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      const res = await fetch(`${baseUrl}/api/simulate-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { action: string };
      expect(data.action).toBe('I check the locked drawer.');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('returns exact trimmed action for valid local provider response when engineProvider is local and voiceProvider is gemini', async () => {
      setVoiceProvider('gemini');
      setEngineProvider('local');

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const urlStr = String(input);
        if (urlStr.startsWith(baseUrl)) {
          return originalFetch(input, init);
        }
        if (urlStr.endsWith('/v1/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'google/gemma-4-e4b' }] }), {
            status: 200,
          });
        }
        if (urlStr.endsWith('/v1/chat/completions')) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: 'Player: "I check the locked drawer."' } }],
            }),
            { status: 200 }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      const res = await fetch(`${baseUrl}/api/simulate-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { action: string };
      expect(data.action).toBe('I check the locked drawer.');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('returns HTTP 502 with AUTOPILOT_ACTION_FAILURE when local model returns empty response', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const urlStr = String(input);
        if (urlStr.startsWith(baseUrl)) {
          return originalFetch(input, init);
        }
        if (urlStr.endsWith('/v1/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'google/gemma-4-e4b' }] }), {
            status: 200,
          });
        }
        if (urlStr.endsWith('/v1/chat/completions')) {
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: '```\n\n```' } }],
            }),
            { status: 200 }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      const res = await fetch(`${baseUrl}/api/simulate-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      expect(res.status).toBe(502);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.code).toBe('AUTOPILOT_ACTION_FAILURE');
      expect(data.action).toBeUndefined();
    });

    it('returns HTTP 502 with AUTOPILOT_ACTION_FAILURE when local server is unreachable', async () => {
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const urlStr = String(input);
        if (urlStr.startsWith(baseUrl)) {
          return originalFetch(input, init);
        }
        throw new Error('connect ECONNREFUSED 127.0.0.1:1234');
      });

      const res = await fetch(`${baseUrl}/api/simulate-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(basePayload),
      });

      expect(res.status).toBe(502);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.code).toBe('AUTOPILOT_ACTION_FAILURE');
      expect(data.action).toBeUndefined();
    });
  });

  describe('POST /api/init', () => {
    const originalFetch = globalThis.fetch;

    it('generates prose via Gemini by default', async () => {
      setEngineProvider('gemini');
      mockGenerateContent.mockResolvedValueOnce({
        text: 'The limestone cavern drips in heavy silence.',
      });

      const res = await fetch(`${baseUrl}/api/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup: { aesthetic: 'subterranean', tone: 'dread' } }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { prose: string };
      expect(data.prose).toBe('The limestone cavern drips in heavy silence.');
      expect(mockGenerateContent).toHaveBeenCalled();
    });

    it('generates prose via local model when engineProvider is local', async () => {
      setEngineProvider('local');
      setLocalVoiceBaseUrl('http://127.0.0.1:1234/v1');
      setLocalVoiceModel('google/gemma-4-e4b');

      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
        const urlStr = String(input);
        if (urlStr.startsWith(baseUrl)) {
          return originalFetch(input, init);
        }
        if (urlStr.endsWith('/v1/models')) {
          return new Response(JSON.stringify({ data: [{ id: 'google/gemma-4-e4b' }] }), {
            status: 200,
          });
        }
        if (urlStr.endsWith('/v1/chat/completions')) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: '```text\nThe station bulkhead seals with a hydraulic hiss.\n```',
                  },
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response('Not Found', { status: 404 });
      });

      const res = await fetch(`${baseUrl}/api/init`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setup: { aesthetic: 'industrial', tone: 'cold' } }),
      });

      expect(res.status).toBe(200);
      const data = (await res.json()) as { prose: string };
      expect(data.prose).toBe('The station bulkhead seals with a hydraulic hiss.');
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });
  });
});
