import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { executeRatificationPipeline } from './ratificationPipeline';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
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
});

