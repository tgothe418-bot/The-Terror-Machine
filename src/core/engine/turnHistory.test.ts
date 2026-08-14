import { describe, expect, it } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import { createEngineHistoryMessage, createTurnHistoryEvents } from './turnHistory';

const frame = {
  narrative_blocks: [{ type: 'prose', content: 'The latch refuses to move.' }],
  logic_state: {
    current_phase: 'LATENT',
    suggested_tension: 2,
    intent_classification: 'INSPECT',
    terminal_flags: [],
  },
  topologyDelta: { isExpansion: false },
  validation: { accepted: true, rejected_fields: [], repair_notes: [] },
  contextReceipt: {
    version: 1,
    scenarioTitle: 'Test Scenario',
    selectedRole: 'protagonist',
    resolvedPlayerName: 'Investigator',
    currentNodeId: 'ROOM_01',
    readableNodeLabel: 'Room 01',
    activeVector: 'COGNITIVE',
    activeTier: 'LATENT',
    castCount: 1,
    worldRuleCount: 1,
    topologyNodeCount: 1,
    topologyConnectionCount: 0
  }
};

describe('turn history recording', () => {
  it('records one user action and one structured Engine response with context receipt', () => {
    const events = createTurnHistoryEvents(
      'I test the latch.',
      'The latch refuses to move.',
      frame,
      1234
    );

    expect(events).toHaveLength(2);
    expect(events.filter((event) => event.type === 'USER_ACTION')).toHaveLength(1);
    expect(
      events.filter((event) => event.type === 'ADD_MESSAGE' && event.message.role === 'user')
    ).toHaveLength(0);

    const responseEvent = events.find((event) => event.type === 'ADD_MESSAGE');
    expect(responseEvent).toMatchObject({
      type: 'ADD_MESSAGE',
      message: {
        role: 'assistant',
        content: 'The latch refuses to move.',
        timestamp: 1234,
        blocks: frame.narrative_blocks,
        logic_state: frame.logic_state,
        topologyDelta: frame.topologyDelta,
        validation: frame.validation,
        contextReceipt: frame.contextReceipt
      },
    });

    const nextState = events.reduce(engineReducer, initialEngineState);
    expect(nextState.history.map((message) => message.role)).toEqual(['user', 'assistant']);
    expect(nextState.history.map((message) => message.content)).toEqual([
      'I test the latch.',
      'The latch refuses to move.',
    ]);
  });

  it('uses the same structured Engine message for initialization output with context receipt', () => {
    expect(createEngineHistoryMessage('Initialization complete.', frame, 99)).toMatchObject({
      role: 'assistant',
      content: 'Initialization complete.',
      timestamp: 99,
      logic_state: frame.logic_state,
      topologyDelta: frame.topologyDelta,
      contextReceipt: frame.contextReceipt
    });
  });
});
