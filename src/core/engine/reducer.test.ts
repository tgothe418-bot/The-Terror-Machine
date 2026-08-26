import { describe, it, expect } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import type { CommittedTurnPayload, FailedTurnPayload } from './events';
import { captureRuntimeSnapshot } from './snapshot';
import type {
  CanonicalConsequenceReceipt,
  HorrorVector,
  NarrativeReconciliationReceipt,
  LogicState,
} from '../../types';

describe('engineReducer atomic turn commits', () => {
  it('atomically commits a successful turn and updates state in a single step', () => {
    const startState = {
      ...initialEngineState,
      currentNodeId: 'ORIGIN',
      spatialGraph: [
        { id: 'ORIGIN', name: 'Origin', description: '', exits: [] },
        { id: 'INNER_SANCTUM', name: 'Inner Sanctum', description: '', exits: [] },
      ],
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
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
        preSnapshot,
      },
    };

    const nextState = engineReducer(startState, {
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

    const preSnapshot = captureRuntimeSnapshot(startState);

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

  it('presents upstream HTML warm-up responses as runtime notices while preserving the full receipt', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 5,
      currentNodeId: 'SUITE_1408',
    };

    const preSnapshot = captureRuntimeSnapshot(startState);
    const failureReceipt = {
      code: 'NON_JSON_TURN_RESPONSE',
      status: 200,
      contentType: 'text/html; charset=utf-8',
      message: 'The turn service returned an unexpected response. The session state was not changed.',
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_FAILED',
      payload: {
        commandText: 'Wait for the runtime',
        failureReceipt,
        errorCategory: failureReceipt.code,
        errorMessage: failureReceipt.message,
        statusCode: failureReceipt.status,
        contentType: failureReceipt.contentType,
        preSnapshot,
      },
    });

    const failMsg = nextState.history[1];
    expect(failMsg.content).toBe(
      '[RUNTIME NOTICE // DEVELOPMENT HOST RESTART]\nThe development runtime is restarting. Your state was not changed. Please retry shortly.'
    );
    expect(failMsg.content).not.toContain('[ENGINE FAILURE');
    expect(failMsg.failureReceipt).toEqual(failureReceipt);
    expect(failMsg.turnReceipt?.reason).toContain('FAILED: NON_JSON_TURN_RESPONSE');
    expect(nextState.turnCount).toBe(5);
    expect(nextState.currentNodeId).toBe('SUITE_1408');
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
        preSnapshot,
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
        preSnapshot,
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
        preSnapshot,
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
        preSnapshot,
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
    const startState = {
      ...initialEngineState,
      turnCount: 2,
      currentNodeId: 'CELLAR',
      spatialGraph: [
        { id: 'CELLAR', name: 'Cellar', description: '', exits: [] },
        { id: 'ATTIC', name: 'Attic', description: '', exits: [] },
      ],
      tensionLevel: 15,
      activeVector: 'SOMATIC' as const,
      activeTier: 'GATEWAY' as const,
      reconciliationRevision: 1,
    };

    const preSnapshot = {
      version: 1 as const,
      turnCount: 2,
      currentNodeId: 'CELLAR',
      activeVector: 'SOMATIC' as const,
      activeTier: 'GATEWAY' as const,
      phase: 'LATENT',
      tension: 15,
      coherence: 1.0,
      decayRate: 0,
      reconciliationRevision: 1,
      activeFlags: [] as readonly string[],
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
        preSnapshot,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    const receipt = nextState.history[1].turnReceipt;
    expect(receipt?.preSnapshot).toBeDefined();
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

  it('increments reconciliationRevision exactly once when narrativeReconciliationReceipt has EXPERIENTIAL_REANCHORED and commits turn', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 4,
      reconciliationRevision: 2,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    const reconciliationReceipt: NarrativeReconciliationReceipt = {
      version: 1,
      mode: 'EXPERIENTIAL_REANCHORED',
      feasibility: 'IMPOSSIBLE',
      reason_code: 'UNSUPPORTED_PREMISE',
      fictional_time_cost: 'MOMENT',
      authority_alignment: 'NOT_APPLICABLE',
      memory_echo_candidate: null,
      revision_increment: 1,
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Take the non-existent pistol',
      formattedText: 'You reach out, but your hand grasps empty air.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Experientially reanchored.',
        narrative_blocks: [
          { type: 'prose', content: 'You reach out, but your hand grasps empty air.' },
        ],
        logic_state: {
          suggested_tension: 25,
        },
        narrativeReconciliationReceipt: reconciliationReceipt,
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
        preSnapshot,
        narrativeReconciliationReceipt: reconciliationReceipt,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.reconciliationRevision).toBe(3);
    expect(nextState.turnCount).toBe(5);
    expect(nextState.storyLog).toHaveLength(1);
    expect(nextState.storyLog?.[0].content).toContain('grasps empty air');
  });

  it('does not increment reconciliationRevision for CANONICAL, MIXED, or NOT_REQUIRED receipts', () => {
    const modes: Array<'CANONICAL' | 'MIXED' | 'NOT_REQUIRED'> = [
      'CANONICAL',
      'MIXED',
      'NOT_REQUIRED',
    ];

    for (const mode of modes) {
      const startState = {
        ...initialEngineState,
        turnCount: 2,
        reconciliationRevision: 5,
      };

      const preSnapshot = captureRuntimeSnapshot(startState);

      const reconciliationReceipt: NarrativeReconciliationReceipt = {
        version: 1,
        mode,
        feasibility: mode === 'CANONICAL' ? 'SUPPORTED' : 'CONSTRAINED',
        reason_code: 'NONE',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'NOT_APPLICABLE',
        memory_echo_candidate: null,
        revision_increment: 0,
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Examine surroundings',
        formattedText: 'You look around.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'You look around.' }],
          logic_state: { suggested_tension: 20 },
          narrativeReconciliationReceipt: reconciliationReceipt,
        },
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'ORIGIN',
          requestedTarget: 'ORIGIN',
          accepted: true,
          nodeAfter: 'ORIGIN',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 20,
          preSnapshot,
          narrativeReconciliationReceipt: reconciliationReceipt,
        },
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.reconciliationRevision).toBe(5);
      expect(nextState.turnCount).toBe(3);
    }
  });

  it('preserves legacy reconciliation increment fallback when receipts are absent', () => {
    const startState = {
      ...initialEngineState,
      turnCount: 4,
      reconciliationRevision: 2,
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    const payload: CommittedTurnPayload = {
      commandText: 'Old legacy action',
      formattedText: 'Old legacy response.',
      preSnapshot,
      frame: {
        narrative_blocks: [
          { type: 'system_voice', content: 'Legacy collision' },
        ],
        logic_state: {
          intent_classification: 'HALLUCINATION_COLLISION',
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
        preSnapshot,
      },
    };

    const nextState = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.reconciliationRevision).toBe(3);
  });

  it('preserves the submitted preSnapshot object by reference identity in receipt', () => {
    const submittedSnapshot = {
      version: 1 as const,
      turnCount: 10,
      currentNodeId: 'VAULT_7',
      activeVector: 'SOMATIC' as const,
      activeTier: 'TERMINAL' as const,
      phase: 'TERMINAL',
      tension: 95,
      coherence: 0.2,
      reconciliationRevision: 3,
      activeFlags: ['FLAG_ALPHA'],
    };

    const payload: CommittedTurnPayload = {
      commandText: 'Breathe',
      formattedText: 'The air burns.',
      preSnapshot: submittedSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The air burns.' }],
        logic_state: {
          current_phase: 'TERMINAL',
          suggested_tension: 95,
        },
      },
      turnReceipt: {
        turnNumber: 11,
        nodeBefore: 'VAULT_7',
        requestedTarget: 'VAULT_7',
        accepted: true,
        nodeAfter: 'VAULT_7',
        activeVector: 'SOMATIC',
        activeTier: 'TERMINAL',
        tension: 95,
        preSnapshot: submittedSnapshot,
      },
    };

    const nextState = engineReducer(initialEngineState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    // The receipt on the history message strictly preserves the exact reference to submittedSnapshot
    expect(nextState.history[1].turnReceipt?.preSnapshot).toBe(submittedSnapshot);
  });

  it('leaves currentNodeId unchanged when transitionReceipt is rejected or absent despite turnReceipt.nodeAfter naming an existing node', () => {
    const startState = {
      ...initialEngineState,
      currentNodeId: 'ORIGIN',
      spatialGraph: [
        { id: 'ORIGIN', name: 'Origin', description: '', exits: [] },
        { id: 'EXISTING_TARGET', name: 'Existing Target', description: '', exits: [] },
      ],
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    // 1. Rejected transition receipt
    const rejectedPayload: CommittedTurnPayload = {
      commandText: 'Walk through wall to Existing Target',
      formattedText: 'The wall is solid stone.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The wall is solid stone.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
      },
      transitionReceipt: {
        requestedNodeId: 'EXISTING_TARGET',
        accepted: false,
        fromNodeId: 'ORIGIN',
        toNodeId: 'ORIGIN',
        reason: 'TRANSITION_REJECTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EXISTING_TARGET',
        accepted: false,
        nodeAfter: 'EXISTING_TARGET', // Telemetry rogue value
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      },
    };

    const stateAfterRejected = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: rejectedPayload,
    });

    expect(stateAfterRejected.currentNodeId).toBe('ORIGIN'); // Did NOT move to EXISTING_TARGET!

    // 2. Absent transition receipt
    const absentReceiptPayload: CommittedTurnPayload = {
      commandText: 'Teleport to Existing Target',
      formattedText: 'You remain in place.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'You remain in place.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EXISTING_TARGET',
        accepted: false,
        nodeAfter: 'EXISTING_TARGET', // Telemetry rogue value
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      },
    };

    const stateAfterAbsent = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: absentReceiptPayload,
    });

    expect(stateAfterAbsent.currentNodeId).toBe('ORIGIN'); // Still in ORIGIN
  });

  it('leaves currentNodeId unchanged when transitionReceipt is accepted but fromNodeId is stale', () => {
    const startState = {
      ...initialEngineState,
      currentNodeId: 'ORIGIN',
      spatialGraph: [
        { id: 'ORIGIN', name: 'Origin', description: '', exits: [] },
        { id: 'EXISTING_TARGET', name: 'Existing Target', description: '', exits: [] },
        { id: 'STALE_ORIGIN', name: 'Stale Origin', description: '', exits: [] },
      ],
    };

    const preSnapshot = captureRuntimeSnapshot(startState);

    // fromNodeId is STALE_ORIGIN instead of ORIGIN
    const stalePayload: CommittedTurnPayload = {
      commandText: 'Move forward',
      formattedText: 'Movement anomaly.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'Movement anomaly.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
      },
      transitionReceipt: {
        requestedNodeId: 'EXISTING_TARGET',
        accepted: true,
        fromNodeId: 'STALE_ORIGIN', // Mismatch with reducer's state.currentNodeId ('ORIGIN')
        toNodeId: 'EXISTING_TARGET',
        reason: 'TRANSITION_ACCEPTED',
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'EXISTING_TARGET',
        accepted: true,
        nodeAfter: 'EXISTING_TARGET',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      },
    };

    const stateAfterStale = engineReducer(startState, {
      type: 'TURN_COMMITTED',
      payload: stalePayload,
    });

    expect(stateAfterStale.currentNodeId).toBe('ORIGIN'); // Kept current node due to stale fromNodeId
  });

  describe('Phase 3G.5: Single-turn bounded checkpointing & TURN_RETAKEN', () => {
    it('records a valid lastTurnCheckpoint holding pre-turn state, commandText, and engineGameStateBefore on TURN_COMMITTED', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 2,
        currentNodeId: 'ORIGIN',
        activeVector: 'COGNITIVE' as const,
        activeTier: 'LATENT' as const,
        tensionLevel: 10,
        reconciliationRevision: 1,
        activeMemory: {
          systemFlags: ['FLAG_A'],
          somaState: [],
          geomState: [],
        },
      };

      const preSnapshot = captureRuntimeSnapshot(startState);
      const prevGameState: LogicState = {
        current_location: 'Origin Chamber',
        player_injuries: [],
        inventory: [],
        psychological_status: 'Stable',
        player_role: 'witness',
        player_character_id: null,
        perspective_mode: 'witness',
        current_tension_level: 'buildup',
        lore_and_memory: {
          established_facts: [],
          permanent_consequences: [],
        },
        npc_fixations: [],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Examine the anomaly',
        formattedText: 'The anomaly hums with dark frequency.',
        preSnapshot,
        engineGameStateBefore: prevGameState,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'The anomaly hums.' }],
          logic_state: {
            current_phase: 'MANIFEST',
            suggested_tension: 30,
            terminal_flags: ['FLAG_B'],
          },
        },
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'ORIGIN',
          requestedTarget: 'ORIGIN',
          accepted: true,
          nodeAfter: 'ORIGIN',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 30,
          preSnapshot,
        },
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.turnCount).toBe(3);
      expect(nextState.tensionLevel).toBe(30);
      expect(nextState.lastTurnCheckpoint).toBeDefined();
      expect(nextState.lastTurnCheckpoint?.version).toBe(1);
      expect(nextState.lastTurnCheckpoint?.commandText).toBe('Examine the anomaly');
      expect(nextState.lastTurnCheckpoint?.engineGameStateBefore).toEqual(prevGameState);
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.turnCount).toBe(2);
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.tensionLevel).toBe(10);
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.activeMemory.systemFlags).toEqual(['FLAG_A']);
    });

    it('unconditionally captures valid lastTurnCheckpoint on every TURN_COMMITTED including terminal turns', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 2,
      };

      const preSnapshot = captureRuntimeSnapshot(startState);
      const payload: CommittedTurnPayload = {
        commandText: 'Commit irreversible terminal action',
        formattedText: 'The gateway seals permanently.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'The gateway seals permanently.' }],
          logic_state: { suggested_tension: 50, terminal_flags: ['TERMINAL_CONVERGED'] },
        },
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'ORIGIN',
          requestedTarget: 'ORIGIN',
          accepted: true,
          nodeAfter: 'ORIGIN',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          tension: 50,
          preSnapshot,
        },
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.lastTurnCheckpoint).not.toBeNull();
      expect(nextState.lastTurnCheckpoint?.commandText).toBe('Commit irreversible terminal action');
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.turnCount).toBe(2);
    });

    it('preserves existing lastTurnCheckpoint on TURN_FAILED without replacing it with failed attempt', () => {
      const priorCheckpoint = {
        version: 1 as const,
        commandText: 'Examine vault door',
        engineStateBefore: { ...initialEngineState, turnCount: 3, currentNodeId: 'CORRIDOR' },
        engineGameStateBefore: null,
      };

      const startState = {
        ...initialEngineState,
        turnCount: 4,
        currentNodeId: 'VAULT',
        tensionLevel: 25,
        lastTurnCheckpoint: priorCheckpoint,
      };

      const preSnapshot = captureRuntimeSnapshot(startState);
      const prevGameState: LogicState = {
        current_location: 'Vault',
        player_injuries: [],
        inventory: [],
        psychological_status: 'Tense',
        player_role: 'witness',
        player_character_id: null,
        perspective_mode: 'witness',
        current_tension_level: 'peak',
        lore_and_memory: {
          established_facts: [],
          permanent_consequences: [],
        },
        npc_fixations: [],
      };

      const payload: FailedTurnPayload = {
        commandText: 'Force door open',
        errorCategory: 'NETWORK_TIMEOUT',
        errorMessage: 'The connection timed out.',
        preSnapshot,
        engineGameStateBefore: prevGameState,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_FAILED',
        payload,
      });

      expect(nextState.lastTurnCheckpoint).toBe(priorCheckpoint);
      expect(nextState.lastTurnCheckpoint?.commandText).toBe('Examine vault door');
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.turnCount).toBe(3);
      expect(nextState.lastTurnCheckpoint?.engineStateBefore.currentNodeId).toBe('CORRIDOR');
    });

    it('restores exact pre-turn state and clears checkpoint on TURN_RETAKEN', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 2,
        currentNodeId: 'ORIGIN',
        activeVector: 'SOMATIC' as const,
        activeTier: 'GATEWAY' as const,
        tensionLevel: 15,
        reconciliationRevision: 2,
        activeMemory: {
          systemFlags: ['FLAG_INITIAL'],
          somaState: [],
          geomState: [],
        },
        history: [
          { id: '1', role: 'user' as const, content: 'Initial prompt', timestamp: 1000 },
          { id: '2', role: 'assistant' as const, content: 'Initial narrative', timestamp: 1001 },
        ],
      };

      const preSnapshot = captureRuntimeSnapshot(startState);

      // Execute a turn that advances state
      const committedPayload: CommittedTurnPayload = {
        commandText: 'Step into the abyss',
        formattedText: 'You fall into darkness.',
        preSnapshot,
        frame: {
          narrative_blocks: [{ type: 'prose', content: 'You fall into darkness.' }],
          logic_state: {
            current_phase: 'MANIFEST',
            suggested_tension: 65,
            terminal_flags: ['FLAG_FALLEN'],
            matrix_mutation: {
              next_vector: 'COSMIC',
              next_tier: 'MANIFEST',
            },
          },
        },
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'ORIGIN',
          requestedTarget: 'ORIGIN',
          accepted: true,
          nodeAfter: 'ORIGIN',
          activeVector: 'COSMIC',
          activeTier: 'MANIFEST',
          tension: 65,
          preSnapshot,
        },
      };

      const stateAfterTurn = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload: committedPayload,
      });

      expect(stateAfterTurn.turnCount).toBe(3);
      expect(stateAfterTurn.activeVector).toBe('COSMIC');
      expect(stateAfterTurn.activeTier).toBe('MANIFEST');
      expect(stateAfterTurn.tensionLevel).toBe(65);
      expect(stateAfterTurn.activeMemory.systemFlags).toContain('FLAG_FALLEN');
      expect(stateAfterTurn.history.length).toBe(4);
      expect(stateAfterTurn.lastTurnCheckpoint).not.toBeNull();

      // Now retake the turn
      const stateAfterRetake = engineReducer(stateAfterTurn, {
        type: 'TURN_RETAKEN',
      });

      expect(stateAfterRetake.turnCount).toBe(2);
      expect(stateAfterRetake.currentNodeId).toBe('ORIGIN');
      expect(stateAfterRetake.activeVector).toBe('SOMATIC');
      expect(stateAfterRetake.activeTier).toBe('GATEWAY');
      expect(stateAfterRetake.tensionLevel).toBe(15);
      expect(stateAfterRetake.reconciliationRevision).toBe(2);
      expect(stateAfterRetake.activeMemory.systemFlags).toEqual(['FLAG_INITIAL']);
      expect(stateAfterRetake.history.length).toBe(2);
      expect(stateAfterRetake.history[0].content).toBe('Initial prompt');
      expect(stateAfterRetake.history[1].content).toBe('Initial narrative');
      expect(stateAfterRetake.lastTurnCheckpoint).toBeNull();
    });

    it('returns state unchanged when TURN_RETAKEN is dispatched without a checkpoint', () => {
      const stateWithoutCheckpoint = {
        ...initialEngineState,
        turnCount: 5,
        lastTurnCheckpoint: null,
      };

      const resultState = engineReducer(stateWithoutCheckpoint, {
        type: 'TURN_RETAKEN',
      });

      expect(resultState).toBe(stateWithoutCheckpoint);
      expect(resultState.turnCount).toBe(5);
    });

    it('bounds checkpoints to exactly 1 level across successive turns', () => {
      let state = {
        ...initialEngineState,
        turnCount: 0,
      };

      // Turn 1
      const preSnapshot1 = captureRuntimeSnapshot(state);
      state = engineReducer(state, {
        type: 'TURN_COMMITTED',
        payload: {
          commandText: 'Turn 1 command',
          formattedText: 'Turn 1 result',
          preSnapshot: preSnapshot1,
          frame: {
            narrative_blocks: [{ type: 'prose', content: 'Turn 1 result' }],
            logic_state: { suggested_tension: 10 },
          },
          turnReceipt: {
            turnNumber: 1,
            nodeBefore: 'ORIGIN',
            requestedTarget: 'ORIGIN',
            accepted: true,
            nodeAfter: 'ORIGIN',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            tension: 10,
            preSnapshot: preSnapshot1,
          },
        },
      });

      expect(state.turnCount).toBe(1);
      expect(state.lastTurnCheckpoint?.commandText).toBe('Turn 1 command');
      expect(state.lastTurnCheckpoint?.engineStateBefore.turnCount).toBe(0);

      // Turn 2
      const preSnapshot2 = captureRuntimeSnapshot(state);
      state = engineReducer(state, {
        type: 'TURN_COMMITTED',
        payload: {
          commandText: 'Turn 2 command',
          formattedText: 'Turn 2 result',
          preSnapshot: preSnapshot2,
          frame: {
            narrative_blocks: [{ type: 'prose', content: 'Turn 2 result' }],
            logic_state: { suggested_tension: 20 },
          },
          turnReceipt: {
            turnNumber: 2,
            nodeBefore: 'ORIGIN',
            requestedTarget: 'ORIGIN',
            accepted: true,
            nodeAfter: 'ORIGIN',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            tension: 20,
            preSnapshot: preSnapshot2,
          },
        },
      });

      expect(state.turnCount).toBe(2);
      // Checkpoint holds Turn 2's pre-turn state (Turn 1 state), not Turn 0
      expect(state.lastTurnCheckpoint?.commandText).toBe('Turn 2 command');
      expect(state.lastTurnCheckpoint?.engineStateBefore.turnCount).toBe(1);

      // Retake restores Turn 1
      state = engineReducer(state, { type: 'TURN_RETAKEN' });
      expect(state.turnCount).toBe(1);
      expect(state.lastTurnCheckpoint).toBeNull();
    });

    it('preserves canonicalConsequenceReceipt in turnReceipt on committed history message', () => {
      const state = { ...initialEngineState };
      const preSnapshot = captureRuntimeSnapshot(state);

      const consequenceReceipt: CanonicalConsequenceReceipt = {
        version: 1,
        pre_state: {
          inventory: [],
          player_injuries: [],
          psychological_status: 'STABLE',
        },
        decisions: [
          {
            mutation: {
              domain: 'INVENTORY' as const,
              operation: 'ADD' as const,
              value: 'Rusty Screwdriver',
              rationale: 'Found in tool rack',
            },
            outcome: 'APPLIED' as const,
            reason: 'APPLIED' as const,
          },
        ],
        patch: {
          inventory_added: ['Rusty Screwdriver'],
          inventory_removed: [],
          injuries_added: [],
          injuries_removed: [],
          psychological_status_change: null,
        },
        post_state: {
          inventory: ['Rusty Screwdriver'],
          player_injuries: [],
          psychological_status: 'STABLE',
        },
      };

      const nextState = engineReducer(state, {
        type: 'TURN_COMMITTED',
        payload: {
          commandText: 'Take screwdriver',
          formattedText: 'You grab the rusty screwdriver.',
          preSnapshot,
          frame: {
            narrative_blocks: [{ type: 'prose', content: 'You grab the rusty screwdriver.' }],
            logic_state: { suggested_tension: 10 },
          },
          turnReceipt: {
            turnNumber: 1,
            nodeBefore: 'WORKSHOP',
            requestedTarget: 'WORKSHOP',
            accepted: true,
            nodeAfter: 'WORKSHOP',
            activeVector: 'COGNITIVE',
            activeTier: 'LATENT',
            tension: 10,
            preSnapshot,
            canonicalConsequenceReceipt: consequenceReceipt,
          },
        },
      });

      expect(nextState.history.length).toBe(2);
      const assistantMsg = nextState.history[1];
      expect(assistantMsg.turnReceipt?.canonicalConsequenceReceipt).toBeDefined();
      expect(assistantMsg.turnReceipt?.canonicalConsequenceReceipt?.post_state.inventory).toEqual([
        'Rusty Screwdriver',
      ]);
    });

    it('preserves existing lastTurnCheckpoint on TURN_FAILED so failed turn does not destroy retake', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 1,
        currentNodeId: 'PARLOR',
        lastTurnCheckpoint: {
          version: 1 as const,
          commandText: 'Examine bookcase',
          engineStateBefore: { ...initialEngineState, currentNodeId: 'FOYER' },
          engineGameStateBefore: null,
        },
      };

      const preSnapshot = captureRuntimeSnapshot(startState);
      const failedPayload: FailedTurnPayload = {
        commandText: 'Try impossible action',
        errorCategory: 'PROVIDER_FAILURE',
        errorMessage: 'The AI provider turn generation failed.',
        statusCode: 502,
        preSnapshot,
      };

      const afterFailed = engineReducer(startState, {
        type: 'TURN_FAILED',
        payload: failedPayload,
      });

      // Checkpoint must be preserved unchanged (both reference and content)
      expect(afterFailed.lastTurnCheckpoint).toBe(startState.lastTurnCheckpoint);
      expect(afterFailed.lastTurnCheckpoint?.commandText).toBe('Examine bookcase');
      expect(afterFailed.lastTurnCheckpoint?.engineStateBefore.currentNodeId).toBe('FOYER');

      // Repeated failure must still preserve the same checkpoint
      const secondFailed = engineReducer(afterFailed, {
        type: 'TURN_FAILED',
        payload: {
          ...failedPayload,
          commandText: 'Another failing action',
        },
      });

      expect(secondFailed.lastTurnCheckpoint).toBe(startState.lastTurnCheckpoint);
      expect(secondFailed.lastTurnCheckpoint?.commandText).toBe('Examine bookcase');
    });
  });
});
