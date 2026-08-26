import { describe, it, expect } from 'vitest';
import { evaluateSessionCoherence } from './sessionReconciliation';
import { normalizeBlueprint } from './normalizeBlueprint';
import { Blueprint } from '../types';

describe('evaluateSessionCoherence', () => {
  const mockBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_session_test',
    title: 'Echoes in the Dark',
    setting: {
      location: 'Sub-level 4',
      atmosphere: 'Oppressive cold',
      timePeriod: '1984',
    },
    cast: [],
    topology: { nodes: ['ORIGIN'], connections: [] },
  }) as Blueprint;

  it('returns CLEAN_SETUP when no blueprint and no session data exists', () => {
    const result = evaluateSessionCoherence(
      { activeSessionId: null, activeBlueprint: null, gameState: null },
      { blueprintId: null, sessionId: null, turnCount: 0, history: [] }
    );
    expect(result.isCoherent).toBe(true);
    expect(result.status).toBe('CLEAN_SETUP');
  });

  it('returns COHERENT when engine and app stores match active session and blueprint', () => {
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_123',
        activeBlueprint: mockBlueprint,
        gameState: { current_location: 'ORIGIN' },
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_123',
        turnCount: 1,
        history: [],
      }
    );
    expect(result.isCoherent).toBe(true);
    expect(result.status).toBe('COHERENT');
  });

  it('returns MISMATCH when session IDs differ across stores', () => {
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_engine_123',
        activeBlueprint: mockBlueprint,
        gameState: null,
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_app_999',
        turnCount: 1,
        history: [],
      }
    );
    expect(result.isCoherent).toBe(false);
    expect(result.status).toBe('MISMATCH');
  });
});
