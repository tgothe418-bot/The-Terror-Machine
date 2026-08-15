import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import { validateEngineFrame } from '../../lib/ratificationPipeline';
import { projectPresentationPatch } from './presentationProjection';
import { captureRuntimeSnapshot } from './snapshot';
import { CommittedTurnPayload, FailedTurnPayload } from './events';
import { SpatialNode } from '../../types';

describe('Phase 2E Regression Test Suite', () => {
  const baseSpatialGraph: SpatialNode[] = [
    {
      id: 'ORIGIN',
      name: 'Origin Containment',
      description: 'Damp stone room',
      connectedNodes: [],
      exits: [{ description: 'vent', targetNodeId: 'NODE_UNMAPPED', isOpen: true }],
    },
  ];

  const baseState = {
    ...initialEngineState,
    turnCount: 3,
    currentNodeId: 'ORIGIN',
    spatialGraph: baseSpatialGraph,
    activeVector: 'COGNITIVE' as const,
    activeTier: 'LATENT' as const,
    currentPhase: 'LATENT',
    tensionLevel: 20,
    reconciliationRevision: 0,
  };

  beforeEach(() => {
    // Clean slate before each test
  });

  // 1. Valid authorized topology expansion applied atomically by TURN_COMMITTED and visible in postSnapshot
  it('1. applies authorized topology expansion atomically in TURN_COMMITTED and reflects in post-snapshot', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const payload: CommittedTurnPayload = {
      commandText: 'Crawl into the vent',
      formattedText: 'You squeeze into a narrow maintenance duct.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Vent expansion validated.',
        narrative_blocks: [{ type: 'prose', content: 'You squeeze into a narrow duct.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 35,
          matrix_mutation: {
            next_vector: 'SOMATIC',
            next_tier: 'MANIFEST',
          },
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'vent',
          newNodeDef: {
            id: 'MAINTENANCE_DUCT_4',
            geometry: 'Cramped steel duct',
            hazards: ['Sharp exposed screws'],
            exitVectors: [{ direction: 'back', targetNodeId: 'ORIGIN' }],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'MAINTENANCE_DUCT_4',
        accepted: true,
        nodeAfter: 'MAINTENANCE_DUCT_4',
        activeVector: 'SOMATIC',
        activeTier: 'MANIFEST',
        tension: 35,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.turnCount).toBe(4);
    expect(nextState.currentNodeId).toBe('MAINTENANCE_DUCT_4');
    expect(nextState.activeVector).toBe('SOMATIC');
    expect(nextState.activeTier).toBe('MANIFEST');
    expect(nextState.spatialGraph).toHaveLength(2);

    const postSnapshot = nextState.history[1]?.turnReceipt?.postSnapshot;
    expect(postSnapshot).toBeDefined();
    expect(postSnapshot?.currentNodeId).toBe('MAINTENANCE_DUCT_4');
    expect(postSnapshot?.activeVector).toBe('SOMATIC');
    expect(postSnapshot?.activeTier).toBe('MANIFEST');
    expect(postSnapshot?.turnCount).toBe(4);

    // Pre-snapshot is strictly preserved
    expect(nextState.history[1]?.turnReceipt?.preSnapshot?.currentNodeId).toBe('ORIGIN');
    expect(nextState.history[1]?.turnReceipt?.preSnapshot?.turnCount).toBe(3);
  });

  // 2. Ratification alone leaves spatialGraph, current node, coordinates, turn count, and history unchanged
  it('2. ratification validateEngineFrame is pure with respect to runtime state', () => {
    const rawPayload = {
      narrative_blocks: [{ type: 'prose', content: 'Shadows dance on the wall.' }],
      engine_thoughts: 'Validation test.',
      logic_state: {
        current_phase: 'LATENT',
        suggested_tension: 10,
        matrix_mutation: {
          next_vector: 'COSMIC',
          next_tier: 'TERMINAL',
        },
      },
      topologyDelta: {
        isExpansion: true,
        newNodeDef: {
          id: 'TEST_NODE',
          geometry: 'Test room',
          hazards: [],
          exitVectors: [],
        },
      },
    };

    const validated = validateEngineFrame(rawPayload);
    expect(validated.validation?.accepted).toBe(true);
    expect(validated.logic_state.matrix_mutation?.next_vector).toBe('COSMIC');
    // baseState was not mutated
    expect(baseState.turnCount).toBe(3);
    expect(baseState.currentNodeId).toBe('ORIGIN');
    expect(baseState.spatialGraph).toHaveLength(1);
  });

  // 3. Missing, invalid, rejected, or unauthorized topology deltas leave existing graph and node unchanged
  it('3. missing or invalid topology delta preserves existing graph and node position', () => {
    const payload: CommittedTurnPayload = {
      commandText: 'Wait silently',
      formattedText: 'Time passes without change.',
      frame: {
        engine_thoughts: 'No movement.',
        narrative_blocks: [{ type: 'prose', content: 'Time passes.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
        topologyDelta: {
          isExpansion: false,
          newNodeDef: null,
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: null,
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.currentNodeId).toBe('ORIGIN');
    expect(nextState.spatialGraph).toEqual(baseSpatialGraph);
  });

  // 4. Replaying a delta with same generated node ID does not duplicate the node or exits
  it('4. replaying a delta with existing node ID does not duplicate nodes in graph', () => {
    const payload: CommittedTurnPayload = {
      commandText: 'Crawl into the vent again',
      formattedText: 'You return to the duct.',
      frame: {
        engine_thoughts: 'Replay node.',
        narrative_blocks: [{ type: 'prose', content: 'You return to the duct.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'ORIGIN', // Already in graph
            geometry: 'Duplicate Origin',
            hazards: [],
            exitVectors: [],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.spatialGraph).toHaveLength(1);
  });

  // 5. Failed turn leaves canonical runtime state at pre-turn snapshot and records failure receipt
  it('5. failed turn leaves canonical runtime state at pre-turn snapshot', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const failedPayload: FailedTurnPayload = {
      commandText: 'Do something impossible',
      statusCode: 502,
      errorCategory: 'PROVIDER_FAILURE',
      errorMessage: 'Network timeout',
      preSnapshot,
    };

    const stateAfterFailure = engineReducer(baseState, {
      type: 'TURN_FAILED',
      payload: failedPayload,
    });

    expect(stateAfterFailure.turnCount).toBe(3); // Unchanged
    expect(stateAfterFailure.currentNodeId).toBe('ORIGIN'); // Unchanged
    expect(stateAfterFailure.activeVector).toBe('COGNITIVE'); // Unchanged
    expect(stateAfterFailure.history).toHaveLength(2); // User + assistant failure message
    expect(stateAfterFailure.history[1].failureReceipt?.code).toBe('PROVIDER_FAILURE');
    expect(stateAfterFailure.history[1].turnReceipt?.preSnapshot).toEqual(preSnapshot);
    expect(stateAfterFailure.history[1].turnReceipt?.postSnapshot).toEqual(preSnapshot);
  });

  // 6. matrix_mutation is accepted as canonical; matrix_shift compatibility input is normalized once at ingress
  it('6. normalizes matrix_shift to matrix_mutation once at boundary ingress', () => {
    const ingressPayload = {
      narrative_blocks: [{ type: 'prose', content: 'An alien frequency hums.' }],
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 40,
        matrix_shift: {
          next_vector: 'COSMIC',
          next_tier: 'MANIFEST',
        },
      },
    };

    const validated = validateEngineFrame(ingressPayload);
    expect(validated.logic_state.matrix_mutation).toEqual({
      next_vector: 'COSMIC',
      next_tier: 'MANIFEST',
    });

    // When committed through reducer, matrix_mutation is applied cleanly
    const payload: CommittedTurnPayload = {
      commandText: 'Listen to frequency',
      formattedText: 'An alien frequency hums.',
      frame: validated,
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COSMIC',
        activeTier: 'MANIFEST',
        tension: 40,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.activeVector).toBe('COSMIC');
    expect(nextState.activeTier).toBe('MANIFEST');
  });

  // 7. Telemetry / TurnReceipt contains matching preSnapshot and postSnapshot for topology change
  it('7. turn receipt contains verified preSnapshot and postSnapshot for topology changes', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const payload: CommittedTurnPayload = {
      commandText: 'Step into portal',
      formattedText: 'Reality shifts around you.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Portal traversed.',
        narrative_blocks: [{ type: 'prose', content: 'Reality shifts.' }],
        logic_state: {
          current_phase: 'TERMINAL',
          suggested_tension: 90,
          matrix_mutation: {
            next_vector: 'COSMIC',
            next_tier: 'TERMINAL',
          },
        },
        topologyDelta: {
          isExpansion: true,
          newNodeDef: {
            id: 'VOID_SPACE',
            geometry: 'Infinite non-euclidean expanse',
            hazards: ['Sensory obliteration'],
            exitVectors: [],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'VOID_SPACE',
        accepted: true,
        nodeAfter: 'VOID_SPACE',
        activeVector: 'COSMIC',
        activeTier: 'TERMINAL',
        tension: 90,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    const receipt = nextState.history[1].turnReceipt;
    expect(receipt?.preSnapshot.currentNodeId).toBe('ORIGIN');
    expect(receipt?.postSnapshot?.currentNodeId).toBe('VOID_SPACE');
    expect(receipt?.postSnapshot?.activeVector).toBe('COSMIC');
    expect(receipt?.postSnapshot?.activeTier).toBe('TERMINAL');
  });

  // 8. Presentation-state projection cannot overwrite canonical reducer-owned values
  it('8. projectPresentationPatch strips canonical fields and preserves presentation-only state', () => {
    const rawLogicState: Record<string, unknown> = {
      // Canonical fields that MUST be omitted
      currentNodeId: 'ROGUE_NODE',
      activeVector: 'COSMIC',
      activeTier: 'TERMINAL',
      current_phase: 'TERMINAL',
      turnCount: 999,
      suggested_tension: 100,
      spatialGraph: [],

      // Presentation fields that CAN be projected
      inventory: ['Rusty Key', 'Geiger Counter'],
      player_injuries: ['Lacerated palm'],
      lore_and_memory: { revelations: ['The machine is alive'] },
      npc_fixations: ['Entity stalks the perimeter'],
      psychological_status: 'Paranoid',
    };

    const projection = projectPresentationPatch(rawLogicState);
    const projectionRecord = projection as Record<string, unknown>;

    expect(projectionRecord.currentNodeId).toBeUndefined();
    expect(projectionRecord.activeVector).toBeUndefined();
    expect(projectionRecord.activeTier).toBeUndefined();
    expect(projectionRecord.current_phase).toBeUndefined();
    expect(projectionRecord.turnCount).toBeUndefined();

    expect(projection.inventory).toEqual(['Rusty Key', 'Geiger Counter']);
    expect(projection.player_injuries).toEqual(['Lacerated palm']);
    expect(projection.npc_fixations).toEqual(['Entity stalks the perimeter']);
    expect(projection.psychological_status).toBe('Paranoid');
  });
});
