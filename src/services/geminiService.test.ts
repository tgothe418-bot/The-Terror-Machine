import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fetchSimulatedPlayerAction } from './geminiService';
import type { Message, LogicState } from '../types';

describe('fetchSimulatedPlayerAction client service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const sampleHistory: Message[] = [{ role: 'assistant', content: 'The corridor is quiet.', timestamp: Date.now() }];
  const sampleLogicState: LogicState = { current_phase: 'MANIFEST', suggested_tension: 30 };

  it('returns { success: true, action } when server returns a valid action', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ action: 'Inspect the iron locker' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = await fetchSimulatedPlayerAction(sampleHistory, sampleLogicState);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.action).toBe('Inspect the iron locker');
    }
  });

  it('returns { success: false, code } without action string when server returns refusal', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Declined', code: 'PROVIDER_REFUSAL' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = (await fetchSimulatedPlayerAction(sampleHistory, sampleLogicState)) as { success: false; code: string };
    expect(result.success).toBe(false);
    expect(result.code).toBe('PROVIDER_REFUSAL');
    expect((result as Record<string, unknown>).action).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('SYSTEM OVERRIDE');
    expect(JSON.stringify(result)).not.toContain('I look around carefully');
  });

  it('returns { success: false, code } when server returns empty action or action failure', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Failed', code: 'AUTOPILOT_ACTION_FAILURE' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const result = (await fetchSimulatedPlayerAction(sampleHistory, sampleLogicState)) as { success: false; code: string };
    expect(result.success).toBe(false);
    expect(result.code).toBe('AUTOPILOT_ACTION_FAILURE');
    expect((result as Record<string, unknown>).action).toBeUndefined();
  });

  it('returns { success: false, code: "TURN_NETWORK_FAILURE" } on fetch network error without synthetic action string', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('Network connection lost'));

    const result = (await fetchSimulatedPlayerAction(sampleHistory, sampleLogicState)) as { success: false; code: string };
    expect(result.success).toBe(false);
    expect(result.code).toBe('TURN_NETWORK_FAILURE');
    expect((result as Record<string, unknown>).action).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('SYSTEM OVERRIDE');
  });
});
