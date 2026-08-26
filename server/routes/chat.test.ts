import http from 'http';
import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app';

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
});
