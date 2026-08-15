import { describe, it, expect } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import { captureRuntimeSnapshot } from './snapshot';
import type { CommittedTurnPayload, FailedTurnPayload } from './events';
import type { HorrorVector, RuntimeStateSnapshot, SpatialNode } from '../../types';

describe('engineReducer atomic turn commits', () => {
  it('atomically commits a successful turn and updates state in a single step', () => {
    const preSnapshot = captureRuntimeSnapshot(initialEngineState);
    const payload: CommittedTurnPayload = {
      commandText: 'Inspect the ancient mirror',
      formattedText: 'The glass ripples with cold silver light.',
      preSnapshot,
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
        fromNodeId: 'ORIGIN',
        toNodeId: 'INNER_SANCTUM',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
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

    const preSnapshot = captureRuntimeSnapshot(startState);
    const payload: FailedTurnPayload = {
      commandText: 'Open the locked hatch',
      errorCategory: 'MODEL_CONTRACT_MISMATCH',
      errorMessage: 'Invalid output format',
      statusCode: 502,
      preSnapshot,
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
      activeVector: 'SOMATIC' as const,
      activeTier: 'GATEWAY' as const,
    };

    const failureReceipt = {
      code: 'NON_JSON_TURN_RESPONSE',
      status: 502,
      contentType: 'text/html; charset=utf-8',
      message: 'The turn service returned an unexpected response. The session state was not changed.',
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    const payload: FailedTurnPayload = {
      commandText: 'Examine the telephone',
      failureReceipt,
      errorCategory: failureReceipt.code,
      errorMessage: failureReceipt.message,
      statusCode: failureReceipt.status,
      contentType: failureReceipt.contentType,
      preSnapshot,
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_FAILED',
      payload,
    });

    expect(nextState.turnCount).toBe(5);
    expect(nextState.currentNodeId).toBe('SUITE_1408');
    expect(nextState.currentPhase).toBe('MANIFEST');
    expect(nextState.tensionLevel).toBe(65);
    expect(nextState.activeVector).toBe('SOMATIC');
    expect(nextState.activeTier).toBe('GATEWAY');

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
    expect(failMsg.turnReceipt?.preSnapshot?.activeVector).toBe('SOMATIC');
    expect(failMsg.turnReceipt?.preSnapshot?.activeTier).toBe('GATEWAY');
    expect(failMsg.turnReceipt?.postSnapshot?.activeVector).toBe('SOMATIC');
    expect(failMsg.turnReceipt?.postSnapshot?.activeTier).toBe('GATEWAY');
  });

  it('preserves canonical coordinates when no matrix mutation is returned', () => {
    const startState = {
      ...initialEngineState,
      activeVector: 'COSMIC' as const,
      activeTier: 'MANIFEST' as const,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    const payload: CommittedTurnPayload = {
      commandText: 'Wait silently',
      formattedText: 'The silence thickens.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Player waits.',
        narrative_blocks: [{ type: 'sensory', content: 'The silence thickens.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 50,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COSMIC',
        activeTier: 'MANIFEST',
        tension: 50,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.activeVector).toBe('COSMIC');
    expect(nextState.activeTier).toBe('MANIFEST');
    expect(nextState.history[1].turnReceipt?.activeVector).toBe('COSMIC');
    expect(nextState.history[1].turnReceipt?.activeTier).toBe('MANIFEST');
  });

  it('atomically changes both coordinates when valid complete next_vector and next_tier mutation is returned', () => {
    const startState = {
      ...initialEngineState,
      activeVector: 'SOMATIC' as const,
      activeTier: 'LATENT' as const,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    const payload: CommittedTurnPayload = {
      commandText: 'Touch the strange glyph',
      formattedText: 'Your mind unfurls into mathematical abstraction.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Matrix shift triggered.',
        narrative_blocks: [{ type: 'prose', content: 'Your mind unfurls.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 60,
          matrix_mutation: {
            next_vector: 'COGNITIVE',
            next_tier: 'MANIFEST',
          },
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'SOMATIC',
        activeTier: 'LATENT',
        tension: 60,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.activeVector).toBe('COGNITIVE');
    expect(nextState.activeTier).toBe('MANIFEST');
    expect(nextState.history[1].turnReceipt?.activeVector).toBe('COGNITIVE');
    expect(nextState.history[1].turnReceipt?.activeTier).toBe('MANIFEST');
  });

  it('changes neither coordinate when matrix mutation is partial or invalid', () => {
    const startState = {
      ...initialEngineState,
      activeVector: 'SOMATIC' as const,
      activeTier: 'GATEWAY' as const,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    // Partial mutation (missing next_tier)
    const partialPayload: CommittedTurnPayload = {
      commandText: 'Blink',
      formattedText: 'Nothing happens.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Partial shift ignored.',
        narrative_blocks: [{ type: 'prose', content: 'Nothing happens.' }],
        logic_state: {
          matrix_mutation: {
            next_vector: 'COSMIC',
          },
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'SOMATIC',
        activeTier: 'GATEWAY',
        tension: 0,
      },
    };

    const stateAfterPartial = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: partialPayload,
    });
    expect(stateAfterPartial.activeVector).toBe('SOMATIC');
    expect(stateAfterPartial.activeTier).toBe('GATEWAY');

    // Invalid mutation string
    const invalidPayload: CommittedTurnPayload = {
      commandText: 'Blink again',
      formattedText: 'Still nothing.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Invalid shift ignored.',
        narrative_blocks: [{ type: 'prose', content: 'Still nothing.' }],
        logic_state: {
          matrix_mutation: {
            next_vector: 'UNKNOWN_VEC' as unknown as HorrorVector,
            next_tier: 'MANIFEST',
          },
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'SOMATIC',
        activeTier: 'GATEWAY',
        tension: 0,
      },
    };

    const stateAfterInvalid = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: invalidPayload,
    });
    expect(stateAfterInvalid.activeVector).toBe('SOMATIC');
    expect(stateAfterInvalid.activeTier).toBe('GATEWAY');
  });

  it('records distinct pre-snapshot and post-snapshot reflecting accepted state transition', () => {
    const startGraph: SpatialNode[] = [
      { id: 'CELLAR', name: 'Cellar', description: 'Dark', connectedNodes: [], exits: [] },
      { id: 'ATTIC', name: 'Attic', description: 'Dusty', connectedNodes: [], exits: [] },
    ];
    const startState = {
      ...initialEngineState,
      turnCount: 2,
      currentNodeId: 'CELLAR',
      spatialGraph: startGraph,
      tensionLevel: 15,
      activeVector: 'SOMATIC' as const,
      activeTier: 'GATEWAY' as const,
      reconciliationRevision: 1,
    };

    const preSnapshot: RuntimeStateSnapshot = {
      version: 1,
      turnCount: 2,
      currentNodeId: 'CELLAR',
      activeVector: 'SOMATIC',
      activeTier: 'GATEWAY',
      phase: 'LATENT',
      tension: 15,
      coherence: 1.0,
      decayRate: 0,
      reconciliationRevision: 1,
      activeFlags: [],
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Climb stairs to Attic',
      formattedText: 'You emerge into the dusty attic.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Transition to ATTIC accepted.',
        narrative_blocks: [{ type: 'prose', content: 'You emerge into the dusty attic.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 40,
          matrix_mutation: {
            next_vector: 'COSMIC',
            next_tier: 'MANIFEST',
          },
        },
      },
      transitionReceipt: {
        requestedNodeId: 'ATTIC',
        accepted: true,
        fromNodeId: 'CELLAR',
        toNodeId: 'ATTIC',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 3,
        nodeBefore: 'CELLAR',
        requestedTarget: 'ATTIC',
        accepted: true,
        nodeAfter: 'ATTIC',
        activeVector: 'COSMIC',
        activeTier: 'MANIFEST',
        tension: 40,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    const receipt = nextState.history[1].turnReceipt;
    expect(receipt?.preSnapshot).toBe(preSnapshot); // Reference identity preserved!
    expect(receipt?.preSnapshot?.turnCount).toBe(2);
    expect(receipt?.preSnapshot?.currentNodeId).toBe('CELLAR');
    expect(receipt?.preSnapshot?.activeVector).toBe('SOMATIC');
    expect(receipt?.preSnapshot?.activeTier).toBe('GATEWAY');
    expect(receipt?.preSnapshot?.tension).toBe(15);

    expect(receipt?.postSnapshot).toBeDefined();
    expect(receipt?.postSnapshot?.turnCount).toBe(3);
    expect(receipt?.postSnapshot?.currentNodeId).toBe('ATTIC');
    expect(receipt?.postSnapshot?.activeVector).toBe('COSMIC');
    expect(receipt?.postSnapshot?.activeTier).toBe('MANIFEST');
    expect(receipt?.postSnapshot?.tension).toBe(40);
  });

  it('preserves preSnapshot by reference identity in normal TURN_COMMITTED receipt and consumes it directly', () => {
    const distinctSnapshot: RuntimeStateSnapshot = {
      version: 1,
      sessionId: 'sess_fixed_id',
      blueprintId: 'bp_fixed_id',
      turnCount: 9,
      currentNodeId: 'ORIGIN',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      phase: 'LATENT',
      tension: 25,
      coherence: 0.9,
      decayRate: 0.01,
      reconciliationRevision: 2,
      activeFlags: ['FLAG_FROZEN'],
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Observe frozen state',
      formattedText: 'Nothing stirs.',
      preSnapshot: distinctSnapshot,
      frame: {
        engine_thoughts: 'Identity verification.',
        narrative_blocks: [{ type: 'prose', content: 'Nothing stirs.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 25,
        },
      },
      turnReceipt: {
        turnNumber: 10,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 25,
      },
    };

    const nextState = engineReducer(initialEngineState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    const receipt = nextState.history[1].turnReceipt;
    // Exactly matches the passed reference without fresh re-capture
    expect(receipt?.preSnapshot).toBe(distinctSnapshot);
  });

  it('leaves currentNodeId unchanged when receipt is rejected or absent even if turnReceipt.nodeAfter names an existing node', () => {
    const testGraph: SpatialNode[] = [
      { id: 'ORIGIN', name: 'Origin', description: '', connectedNodes: [], exits: [] },
      { id: 'EAST_HALL', name: 'East Hall', description: '', connectedNodes: [], exits: [] },
    ];

    const startState = {
      ...initialEngineState,
      currentNodeId: 'ORIGIN',
      spatialGraph: testGraph,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    // Case 1: transitionReceipt rejected, but turnReceipt.nodeAfter names EAST_HALL
    const rejectedPayload: CommittedTurnPayload = {
      commandText: 'Try to enter East Hall',
      formattedText: 'The door is welded shut.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Transition rejected.',
        narrative_blocks: [{ type: 'prose', content: 'The door is welded shut.' }],
        logic_state: {
          requested_transition: 'EAST_HALL',
          current_phase: 'LATENT',
        },
      },
      transitionReceipt: {
        requestedNodeId: 'EAST_HALL',
        accepted: false,
        fromNodeId: 'ORIGIN',
        toNodeId: 'ORIGIN',
        reason: 'DOOR_WELDED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EAST_HALL',
        accepted: false,
        nodeAfter: 'EAST_HALL', // Telemetry rogue value!
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
      },
    };

    const state1 = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: rejectedPayload,
    });

    expect(state1.currentNodeId).toBe('ORIGIN'); // MUST NOT move to EAST_HALL

    // Case 2: transitionReceipt absent, logic_state requested_transition set to EAST_HALL
    const absentReceiptPayload: CommittedTurnPayload = {
      commandText: 'Try to enter East Hall without receipt',
      formattedText: 'Nothing happens.',
      preSnapshot,
      frame: {
        engine_thoughts: 'No receipt.',
        narrative_blocks: [{ type: 'prose', content: 'Nothing happens.' }],
        logic_state: {
          requested_transition: 'EAST_HALL',
          current_phase: 'LATENT',
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EAST_HALL',
        accepted: false,
        nodeAfter: 'EAST_HALL',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
      },
    };

    const state2 = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: absentReceiptPayload,
    });

    expect(state2.currentNodeId).toBe('ORIGIN'); // MUST NOT move to EAST_HALL
  });

  it('leaves currentNodeId unchanged when an accepted receipt fromNodeId is stale', () => {
    const testGraph: SpatialNode[] = [
      { id: 'ORIGIN', name: 'Origin', description: '', connectedNodes: [], exits: [] },
      { id: 'EAST_HALL', name: 'East Hall', description: '', connectedNodes: [], exits: [] },
    ];

    const startState = {
      ...initialEngineState,
      currentNodeId: 'ORIGIN',
      spatialGraph: testGraph,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    // Stale fromNodeId: receipt says from 'CELLAR' to 'EAST_HALL', but current node is 'ORIGIN'
    const staleReceiptPayload: CommittedTurnPayload = {
      commandText: 'Move to East Hall',
      formattedText: 'You step through.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Stale transition.',
        narrative_blocks: [{ type: 'prose', content: 'You step through.' }],
        logic_state: {
          current_phase: 'LATENT',
        },
      },
      transitionReceipt: {
        requestedNodeId: 'EAST_HALL',
        accepted: true,
        fromNodeId: 'STALE_OLD_CELLAR',
        toNodeId: 'EAST_HALL',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EAST_HALL',
        accepted: true,
        nodeAfter: 'EAST_HALL',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: staleReceiptPayload,
    });

    expect(nextState.currentNodeId).toBe('ORIGIN'); // Must remain at ORIGIN
  });

  it('increments reconciliationRevision exactly once during hallucination collision', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 4,
      reconciliationRevision: 2,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    const payload: CommittedTurnPayload = {
      commandText: 'Take the non-existent pistol',
      formattedText: 'There is no weapon here. The cold floor remains bare.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Hallucination collision handled.',
        narrative_blocks: [
          { type: 'system_voice', content: 'There is no weapon here. The cold floor remains bare.' },
        ],
        logic_state: {
          intent_classification: 'HALLUCINATION_COLLISION',
          suggested_tension: 25,
        },
      },
      turnReceipt: {
        turnNumber: 5,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 25,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.reconciliationRevision).toBe(3);
    expect(nextState.turnCount).toBe(5);
    expect(nextState.storyLog).toHaveLength(1);
    expect(nextState.storyLog?.[0].content).toContain('There is no weapon here');
  });
});
