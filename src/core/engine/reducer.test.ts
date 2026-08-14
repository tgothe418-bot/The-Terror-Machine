import { describe, it, expect } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import type { CommittedTurnPayload, FailedTurnPayload } from './events';

describe('engineReducer atomic turn commits', () => {
  it('atomically commits a successful turn and updates state in a single step', () => {
    const payload: CommittedTurnPayload = {
      commandText: 'Inspect the ancient mirror',
      formattedText: 'The glass ripples with cold silver light.',
      frame: {
        engine_thoughts: 'Player engages with anomaly.',
        narrative_blocks: [
          { type: 'sensory', content: 'The glass ripples with cold silver light.' },
        ],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 45,
          terminal_flags: ['FLAG_MIRROR_TOUCHED'],
        },
      },
      transitionReceipt: {
        requestedNodeId: 'INNER_SANCTUM',
        accepted: true,
        fromNodeId: 'FOYER',
        toNodeId: 'INNER_SANCTUM',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'FOYER',
        requestedTarget: 'INNER_SANCTUM',
        accepted: true,
        reason: 'TRANSITION_ACCEPTED',
        nodeAfter: 'INNER_SANCTUM',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 45,
      },
    };

    const nextState = engineReducer(initialEngineState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.turnCount).toBe(1);
    expect(nextState.currentNodeId).toBe('INNER_SANCTUM');
    expect(nextState.currentPhase).toBe('MANIFEST');
    expect(nextState.tensionLevel).toBe(45);
    expect(nextState.activeMemory.systemFlags).toContain('FLAG_MIRROR_TOUCHED');
    expect(nextState.history.length).toBe(2);
    expect(nextState.history[0].role).toBe('user');
    expect(nextState.history[0].content).toBe('Inspect the ancient mirror');
    expect(nextState.history[1].role).toBe('assistant');
    expect(nextState.history[1].turnReceipt?.accepted).toBe(true);
    expect(nextState.storyLog?.length).toBe(1);
  });

  it('atomically handles a failed turn without incrementing turnCount or modifying position', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 3,
      currentNodeId: 'LIBRARY',
      tensionLevel: 20,
    };

    const payload: FailedTurnPayload = {
      commandText: 'Open the locked hatch',
      errorCategory: 'MODEL_CONTRACT_MISMATCH',
      errorMessage: 'Invalid output format',
      statusCode: 502,
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_FAILED',
      payload,
    });

    expect(nextState.turnCount).toBe(3);
    expect(nextState.currentNodeId).toBe('LIBRARY');
    expect(nextState.tensionLevel).toBe(20);
    expect(nextState.history.length).toBe(2);
    expect(nextState.history[0].role).toBe('user');
    expect(nextState.history[1].role).toBe('assistant');
    expect(nextState.history[1].turnReceipt?.accepted).toBe(false);
    expect(nextState.history[1].turnReceipt?.reason).toContain('MODEL_CONTRACT_MISMATCH');
  });

  it('records a non-JSON turn failure receipt safely with exact message and no state progression', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 5,
      currentNodeId: 'SUITE_1408',
      currentPhase: 'MANIFEST' as const,
      tensionLevel: 65,
    };

    const failureReceipt = {
      code: 'NON_JSON_TURN_RESPONSE',
      status: 502,
      contentType: 'text/html; charset=utf-8',
      message: 'The turn service returned an unexpected response. The session state was not changed.',
    };

    const payload: FailedTurnPayload = {
      commandText: 'Examine the telephone',
      failureReceipt,
      errorCategory: failureReceipt.code,
      errorMessage: failureReceipt.message,
      statusCode: failureReceipt.status,
      contentType: failureReceipt.contentType,
      activeVector: 'SOMATIC',
      activeTier: 'GATEWAY',
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_FAILED',
      payload,
    });

    expect(nextState.turnCount).toBe(5);
    expect(nextState.currentNodeId).toBe('SUITE_1408');
    expect(nextState.currentPhase).toBe('MANIFEST');
    expect(nextState.tensionLevel).toBe(65);

    // Exactly 1 user action and 1 failure message recorded
    expect(nextState.history.length).toBe(2);
    expect(nextState.history[0].role).toBe('user');
    expect(nextState.history[0].content).toBe('Examine the telephone');

    const failMsg = nextState.history[1];
    expect(failMsg.role).toBe('assistant');
    expect(failMsg.content).toBe(
      '[ENGINE FAILURE // NON_JSON_TURN_RESPONSE // HTTP 502]\nThe turn service returned an unexpected response. The session state was not changed.'
    );
    expect(failMsg.content).not.toContain('<!doctype');
    expect(failMsg.content).not.toContain('<html');
    expect(failMsg.failureReceipt).toEqual(failureReceipt);
    expect(failMsg.turnReceipt?.accepted).toBe(false);
    expect(failMsg.turnReceipt?.nodeBefore).toBe('SUITE_1408');
    expect(failMsg.turnReceipt?.nodeAfter).toBe('SUITE_1408');
    expect(failMsg.turnReceipt?.activeVector).toBe('SOMATIC');
    expect(failMsg.turnReceipt?.activeTier).toBe('GATEWAY');
  });
});
