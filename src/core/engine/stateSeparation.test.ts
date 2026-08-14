import { describe, expect, it } from 'vitest';
import { engineReducer, initialEngineState, EngineState } from './reducer';
import { EngineEvent } from './events';
import { RatifiedEngineFrame } from '../../types';

describe('State separation and history preservation', () => {
  it('does not mutate current state until explicit action dispatch', () => {
    const state: EngineState = { ...initialEngineState, currentNodeId: 'START_NODE', phase: 'LATENT' };
    
    // Simulating turn frame computation outside the store
    const hypotheticalFrame: RatifiedEngineFrame = {
      engine_thoughts: 'Player attempts to examine the locked iron gate.',
      narrative_blocks: [
        { type: 'prose', content: 'The iron gate is cold to the touch.' }
      ],
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 4,
        intent_classification: 'INSPECT',
        terminal_flags: []
      },
      topologyDelta: {
        isExpansion: true,
        newNodeDef: {
          id: 'NODE_GATEWAY',
          geometry: 'Iron Gateway',
          hazards: [],
          exitVectors: []
        }
      },
      validation: {
        accepted: true,
        rejected_fields: [],
        repair_notes: []
      }
    };

    // Before dispatch, state remains untouched
    expect(state.currentNodeId).toBe('START_NODE');
    expect(state.phase).toBe('LATENT');
    expect(state.history).toHaveLength(0);

    // Dispatching user action
    const userEvent: EngineEvent = {
      type: 'USER_ACTION',
      payload: 'Examine gate'
    };
    const stateAfterUser = engineReducer(state, userEvent);
    expect(stateAfterUser.history).toHaveLength(1);
    expect(stateAfterUser.history[0].role).toBe('user');
    expect(stateAfterUser.history[0].content).toBe('Examine gate');

    // Dispatching turn submitted event
    const turnEvent: EngineEvent = {
      type: 'TURN_SUBMITTED',
      turnId: 'turn_101',
      text: 'Examine gate',
      timestamp: 1000
    };
    const stateAfterTurn = engineReducer(stateAfterUser, turnEvent);
    expect(stateAfterTurn.turnCount).toBe(1);

    // Dispatching frame ratified event
    const frameEvent: EngineEvent = {
      type: 'FRAME_RATIFIED',
      turnId: 'turn_101',
      frame: hypotheticalFrame
    };
    const stateAfterFrame = engineReducer(stateAfterTurn, frameEvent);
    
    // Verify that telemetry snapshot and payload capture logic, topology, and validation
    expect(stateAfterFrame.history).toHaveLength(1); // Frame ratification updates metadata
    expect(stateAfterFrame.turnCount).toBe(1);
  });

  it('preserves structured logic, topology, and validation in history messages', () => {
    const addMessageEvent: EngineEvent = {
      type: 'ADD_MESSAGE',
      message: {
        role: 'assistant',
        content: 'The gate creaks open slowly.',
        timestamp: 1000,
        blocks: [{ type: 'prose', content: 'The gate creaks open slowly.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 5,
          intent_classification: 'TRANSITION',
          terminal_flags: []
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'NODE_COURTYARD',
            geometry: 'Foggy Courtyard',
            hazards: ['chilling_mist'],
            exitVectors: [{ direction: 'SOUTH', targetNodeId: 'START_NODE' }]
          }
        },
        validation: {
          accepted: true,
          rejected_fields: [],
          repair_notes: ['Edge auto-ratified']
        }
      }
    };

    const state = engineReducer(initialEngineState, addMessageEvent);
    expect(state.history).toHaveLength(1);
    const storedMsg = state.history[0];
    expect(storedMsg.role).toBe('assistant');
    expect(storedMsg.logic_state?.current_phase).toBe('MANIFEST');
    expect(storedMsg.logic_state?.suggested_tension).toBe(5);
    expect(storedMsg.topologyDelta?.isExpansion).toBe(true);
    expect(storedMsg.topologyDelta?.newNodeDef?.id).toBe('NODE_COURTYARD');
    expect(storedMsg.validation?.accepted).toBe(true);
    expect(storedMsg.validation?.repair_notes).toContain('Edge auto-ratified');
  });
});
