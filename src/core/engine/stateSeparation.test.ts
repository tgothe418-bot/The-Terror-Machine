import { describe, expect, it } from 'vitest';
import { engineReducer, initialEngineState, EngineState } from './reducer';
import { EngineEvent, CommittedTurnPayload } from './events';
import { captureRuntimeSnapshot } from './snapshot';
import { RatifiedEngineFrame, CastContinuityReceipt, CastPresenceReceipt, CastInteractionReceipt } from '../../types';

describe('State separation and history preservation', () => {
  it('does not mutate current state until explicit action dispatch', () => {
    const state: EngineState = {
      ...initialEngineState,
      currentNodeId: 'START_NODE',
      phase: 'LATENT',
    };

    // Simulating turn frame computation outside the store
    const hypotheticalFrame: RatifiedEngineFrame = {
      engine_thoughts: 'Player attempts to examine the locked iron gate.',
      narrative_blocks: [{ type: 'prose', content: 'The iron gate is cold to the touch.' }],
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 4,
        intent_classification: 'INSPECT',
        terminal_flags: [],
      },
      topologyDelta: {
        isExpansion: true,
        newNodeDef: {
          id: 'NODE_GATEWAY',
          geometry: 'Iron Gateway',
          hazards: [],
          exitVectors: [],
        },
      },
      validation: {
        accepted: true,
        rejected_fields: [],
        repair_notes: [],
      },
    };

    // Before dispatch, state remains untouched
    expect(state.currentNodeId).toBe('START_NODE');
    expect(state.phase).toBe('LATENT');
    expect(state.history).toHaveLength(0);

    // Dispatching user action
    const userEvent: EngineEvent = {
      type: 'USER_ACTION',
      payload: 'Examine gate',
    };
    const stateAfterUser = engineReducer(state, userEvent);
    expect(stateAfterUser.history).toHaveLength(1);
    expect(stateAfterUser.history[0].role).toBe('user');
    expect(stateAfterUser.history[0].content).toBe('Examine gate');

    // Dispatching legacy turn submitted event (canonical turn count is preserved until TURN_COMMITTED)
    const turnEvent: EngineEvent = {
      type: 'TURN_SUBMITTED',
      turnId: 'turn_101',
      text: 'Examine gate',
      timestamp: 1000,
    };
    const stateAfterTurn = engineReducer(stateAfterUser, turnEvent);
    expect(stateAfterTurn.turnCount).toBe(0);

    // Dispatching frame ratified event
    const frameEvent: EngineEvent = {
      type: 'FRAME_RATIFIED',
      turnId: 'turn_101',
      frame: hypotheticalFrame,
    };
    const stateAfterFrame = engineReducer(stateAfterTurn, frameEvent);

    // Verify that telemetry snapshot and payload capture logic, topology, and validation
    expect(stateAfterFrame.history).toHaveLength(1); // Frame ratification updates metadata
    expect(stateAfterFrame.turnCount).toBe(0);
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
          terminal_flags: [],
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'NODE_COURTYARD',
            geometry: 'Foggy Courtyard',
            hazards: ['chilling_mist'],
            exitVectors: [{ direction: 'SOUTH', targetNodeId: 'START_NODE' }],
          },
        },
        validation: {
          accepted: true,
          rejected_fields: [],
          repair_notes: ['Edge auto-ratified'],
        },
      },
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

  it('preserves castContinuityReceipt in history message upon TURN_COMMITTED', () => {
    const startState: EngineState = {
      ...initialEngineState,
      currentNodeId: 'NODE_A',
      spatialGraph: [
        { id: 'NODE_A', name: 'Node A', description: '', exits: [] },
        { id: 'NODE_B', name: 'Node B', description: '', exits: [] },
      ],
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    const castContinuityReceipt: CastContinuityReceipt = {
      version: 1,
      state: {
        'char-1': { skepticism: 0.6 },
        'char-2': { skepticism: 0.35 },
      },
      acceptedDeltas: [
        { character_id: 'char-1', skepticism_delta: 0.1 },
      ],
    };

    const castPresenceReceipt: CastPresenceReceipt = {
      version: 1,
      state: {
        'char-1': { nodeId: 'NODE_B' },
        'char-2': { nodeId: 'NODE_A' },
      },
    };

    const castInteractionReceipt: CastInteractionReceipt = {
      version: 1,
      addressedCharacterId: 'char-1',
      respondingCharacterId: 'char-1',
      outcome: 'RESPONDED',
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Proceed to Node B',
      formattedText: 'You enter Node B.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'You enter Node B.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 30,
        },
      },
      transitionReceipt: {
        requestedNodeId: 'NODE_B',
        accepted: true,
        fromNodeId: 'NODE_A',
        toNodeId: 'NODE_B',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'NODE_A',
        requestedTarget: 'NODE_B',
        accepted: true,
        nodeAfter: 'NODE_B',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 30,
        preSnapshot,
        castContinuityReceipt,
        castPresenceReceipt,
        castInteractionReceipt,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.history).toHaveLength(2);
    const assistantMsg = nextState.history[1];
    expect(assistantMsg.role).toBe('assistant');
    expect(assistantMsg.turnReceipt?.castContinuityReceipt).toEqual(castContinuityReceipt);
    expect(assistantMsg.turnReceipt?.castPresenceReceipt).toEqual(castPresenceReceipt);
    expect(assistantMsg.turnReceipt?.castInteractionReceipt).toEqual(castInteractionReceipt);
    expect(assistantMsg.turnReceipt?.castInteractionReceipt?.version).toBe(1);
    expect(assistantMsg.turnReceipt?.castInteractionReceipt?.outcome).toBe('RESPONDED');
    expect(assistantMsg.turnReceipt?.castInteractionReceipt?.addressedCharacterId).toBe('char-1');
    expect(assistantMsg.turnReceipt?.castInteractionReceipt?.respondingCharacterId).toBe('char-1');
    expect(assistantMsg.turnReceipt?.castPresenceReceipt?.version).toBe(1);
    expect(assistantMsg.turnReceipt?.castPresenceReceipt?.state).toEqual({
      'char-1': { nodeId: 'NODE_B' },
      'char-2': { nodeId: 'NODE_A' },
    });
    expect(assistantMsg.turnReceipt?.castContinuityReceipt?.version).toBe(1);
    expect(assistantMsg.turnReceipt?.castContinuityReceipt?.state).toEqual({
      'char-1': { skepticism: 0.6 },
      'char-2': { skepticism: 0.35 },
    });
    expect(assistantMsg.turnReceipt?.castContinuityReceipt?.acceptedDeltas).toEqual([
      { character_id: 'char-1', skepticism_delta: 0.1 },
    ]);
    expect(assistantMsg.turnReceipt?.preSnapshot.currentNodeId).toBe('NODE_A');
    expect(assistantMsg.turnReceipt?.postSnapshot?.currentNodeId).toBe('NODE_B');
    expect(assistantMsg.turnReceipt?.nodeAfter).toBe('NODE_B');
  });
});
