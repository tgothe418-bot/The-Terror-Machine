import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { executeRatificationPipeline, formatRecentHistory, TurnResponseError } from './ratificationPipeline';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { engineReducer } from '../core/engine/reducer';
import { Blueprint, RuntimeStateSnapshot } from '../types';

describe('executeRatificationPipeline single pre-turn snapshot lifecycle', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    // Set EngineStore active blueprint
    useEngineStore.setState({
      activeBlueprint: {
        title: 'Test Chamber',
        topology: { nodes: ['STORE_NODE_ORIGIN', 'SUPPLIED_SANCTUM_NODE'], connections: [] },
      } as unknown as Blueprint,
    });

    // Set AppStore to a baseline state
    useAppStore.setState({
      currentNodeId: 'STORE_NODE_ORIGIN',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      tensionLevel: 10,
      phase: 'LATENT',
      turnCount: 1,
      reconciliationRevision: 0,
      activeMemory: { systemFlags: ['FLAG_A'], somaState: [], geomState: [] },
      storyLog: [],
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('uses the exact passed preSnapshot for context and network payload without re-capturing from store', async () => {
    // Distinct supplied snapshot differing from current store state
    const suppliedSnapshot: RuntimeStateSnapshot = {
      version: 1,
      sessionId: 'sess_custom_99',
      blueprintId: 'bp_custom_88',
      turnCount: 5,
      currentNodeId: 'SUPPLIED_SANCTUM_NODE',
      activeVector: 'SOMATIC',
      activeTier: 'GATEWAY',
      phase: 'MANIFEST',
      tension: 75,
      coherence: 0.8,
      decayRate: 0.02,
      reconciliationRevision: 4,
      activeFlags: ['FLAG_SUPPLIED_SPECIAL'],
    };

    let capturedRequestBody: {
      stateContext: {
        currentNodeId?: string;
        activeVector?: string;
        activeTier?: string;
        tensionLevel?: number;
        currentPhase?: string;
        reconciliationRevision?: number;
      };
      context: {
        topology: { currentNodeId: string };
        runtime: {
          activeVector: string;
          activeTier: string;
          tension: number;
          phase: string;
          reconciliationRevision: number;
        };
      };
    } | null = null;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
      if (init?.body) {
        capturedRequestBody = JSON.parse(init.body as string);
      }
      return new Response(
        JSON.stringify({
          narrative_blocks: [{ type: 'prose', content: 'The iron heavy air vibrates.' }],
          logic_state: {
            current_phase: 'MANIFEST',
            suggested_tension: 80,
          },
          topologyDelta: { isExpansion: false },
          validation: { accepted: true },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const frame = await executeRatificationPipeline('Check the glyphs', suppliedSnapshot);

    // 1. Verify that network payload received the exact supplied snapshot coordinates and context
    expect(capturedRequestBody).not.toBeNull();
    expect(capturedRequestBody.stateContext.currentNodeId).toBe('SUPPLIED_SANCTUM_NODE');
    expect(capturedRequestBody.stateContext.activeVector).toBe('SOMATIC');
    expect(capturedRequestBody.stateContext.activeTier).toBe('GATEWAY');
    expect(capturedRequestBody.stateContext.tensionLevel).toBe(75);
    expect(capturedRequestBody.stateContext.currentPhase).toBe('MANIFEST');
    expect(capturedRequestBody.stateContext.reconciliationRevision).toBe(4);

    // Context runtime/topology matches supplied snapshot, not the different store state
    expect(capturedRequestBody.context.topology.currentNodeId).toBe('SUPPLIED_SANCTUM_NODE');
    expect(capturedRequestBody.context.runtime.activeVector).toBe('SOMATIC');
    expect(capturedRequestBody.context.runtime.activeTier).toBe('GATEWAY');
    expect(capturedRequestBody.context.runtime.tension).toBe(75);
    expect(capturedRequestBody.context.runtime.phase).toBe('MANIFEST');
    expect(capturedRequestBody.context.runtime.reconciliationRevision).toBe(4);

    // 2. The returned frame preserves reference identity to the exact supplied snapshot
    expect(frame.preSnapshot).toBe(suppliedSnapshot);
    expect(frame.preSnapshot?.currentNodeId).toBe('SUPPLIED_SANCTUM_NODE');
    expect(frame.preSnapshot?.activeVector).toBe('SOMATIC');
  });

  it('falls back to local capture only when no snapshot is supplied (e.g. internal/SYSTEM_INIT caller)', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          narrative_blocks: [{ type: 'prose', content: 'Simulation initiated.' }],
          logic_state: { current_phase: 'LATENT', suggested_tension: 0 },
          topologyDelta: { isExpansion: false },
          validation: { accepted: true },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    const frame = await executeRatificationPipeline('SYSTEM_INIT');
    expect(frame.preSnapshot).toBeDefined();
    expect(frame.preSnapshot?.currentNodeId).toBe('STORE_NODE_ORIGIN');
    expect(frame.preSnapshot?.activeVector).toBe('COGNITIVE');
    expect(frame.preSnapshot?.activeTier).toBe('LATENT');
  });

  it('rejects with STRUCTURAL_RESPONSE_MISMATCH when 2xx body fails TurnResponseSchema and leaves runtime state untouched', async () => {
    const preSnapshot: RuntimeStateSnapshot = {
      version: 1,
      turnCount: 2,
      currentNodeId: 'STORE_NODE_ORIGIN',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      phase: 'LATENT',
      tension: 10,
      coherence: 1.0,
      reconciliationRevision: 0,
      activeFlags: [],
    };

    // 200 OK but invalid JSON structure (missing narrative_blocks and logic_state)
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          corrupted: true,
          random_payload: 12345,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Examine console', preSnapshot);
    } catch (err) {
      caughtError = err as TurnResponseError;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('STRUCTURAL_RESPONSE_MISMATCH');
    expect(caughtError.status).toBe(200);

    // Verify engineReducer handling when dispatched as TURN_FAILED
    const appState = useAppStore.getState();
    const nextState = engineReducer(appState, {
      type: 'TURN_FAILED',
      payload: {
        commandText: 'Examine console',
        errorCategory: caughtError.code,
        errorMessage: caughtError.message,
        statusCode: caughtError.status,
        contentType: caughtError.contentType,
        preSnapshot,
      },
    });

    expect(nextState.turnCount).toBe(appState.turnCount);
    expect(nextState.currentNodeId).toBe(appState.currentNodeId);
    expect(nextState.activeVector).toBe(appState.activeVector);
    expect(nextState.activeTier).toBe(appState.activeTier);
    expect(nextState.tensionLevel).toBe(appState.tensionLevel);

    const failMsg = nextState.history[1];
    expect(failMsg.role).toBe('assistant');
    expect(failMsg.turnReceipt?.accepted).toBe(false);
    expect(failMsg.turnReceipt?.preSnapshot).toEqual(preSnapshot);
    expect(failMsg.turnReceipt?.postSnapshot).toEqual(preSnapshot);
  });

  it('rejects with FRAME_VALIDATION_REJECTED when schema-valid body fails ratification (e.g. empty narrative_blocks) and leaves runtime state untouched', async () => {
    const preSnapshot: RuntimeStateSnapshot = {
      version: 1,
      turnCount: 2,
      currentNodeId: 'STORE_NODE_ORIGIN',
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      phase: 'LATENT',
      tension: 10,
      coherence: 1.0,
      reconciliationRevision: 0,
      activeFlags: [],
    };

    // Schema-valid format for TurnResultSchema/TurnResponseSchema, but narrative_blocks is empty
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(
        JSON.stringify({
          narrative_blocks: [], // Rejected by ratification rule: narrative_blocks must not be empty
          logic_state: {
            current_phase: 'MANIFEST',
            suggested_tension: 30,
          },
          topologyDelta: { isExpansion: false },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await executeRatificationPipeline('Listen closely', preSnapshot);
    } catch (err) {
      caughtError = err as TurnResponseError;
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError.code).toBe('FRAME_VALIDATION_REJECTED');

    // Verify engineReducer handling when dispatched as TURN_FAILED
    const appState = useAppStore.getState();
    const nextState = engineReducer(appState, {
      type: 'TURN_FAILED',
      payload: {
        commandText: 'Listen closely',
        errorCategory: caughtError.code,
        errorMessage: caughtError.message,
        statusCode: caughtError.status,
        contentType: caughtError.contentType,
        preSnapshot,
      },
    });

    expect(nextState.turnCount).toBe(appState.turnCount);
    expect(nextState.currentNodeId).toBe(appState.currentNodeId);
    expect(nextState.activeVector).toBe(appState.activeVector);
    expect(nextState.activeTier).toBe(appState.activeTier);

    const failMsg = nextState.history[1];
    expect(failMsg.role).toBe('assistant');
    expect(failMsg.turnReceipt?.accepted).toBe(false);
    expect(failMsg.turnReceipt?.preSnapshot).toEqual(preSnapshot);
    expect(failMsg.turnReceipt?.postSnapshot).toEqual(preSnapshot);
  });

  it('preserves dialogue speaker attribution in compact history', () => {
    expect(formatRecentHistory([
      { type: 'dialogue', speaker: 'Jules Mercer', content: 'The receiver only repeats what it heard.' },
      { type: 'prose', content: 'Rain tightens against the shutters.' },
    ])).toBe(
      '[DIALOGUE | Jules Mercer]: The receiver only repeats what it heard....\n' +
      '[PROSE]: Rain tightens against the shutters....'
    );
  });
});

