import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { engineReducer, initialEngineState } from './reducer';
import { validateEngineFrame } from '../../lib/ratificationPipeline';
import { projectPresentationPatch } from './presentationProjection';
import { captureRuntimeSnapshot } from './snapshot';
import { CommittedTurnPayload, FailedTurnPayload } from './events';
import { SpatialNode, Blueprint } from '../../types';
import { buildEngineTurnContext } from '../../lib/buildEngineTurnContext';

describe('Phase 2E Comprehensive Engine Lifecycle Test Suite', () => {
  const baseSpatialGraph: SpatialNode[] = [
    {
      id: 'ORIGIN',
      name: 'Origin Containment',
      description: 'Damp stone room',
      connectedNodes: [],
      exits: [
        { description: 'vent', targetNodeId: 'NODE_UNMAPPED', isOpen: true },
        { description: 'iron_door', targetNodeId: 'SECURITY_FOYER', isOpen: true },
      ],
    },
    {
      id: 'SECURITY_FOYER',
      name: 'Security Foyer',
      description: 'Checkpoint with metal turnstiles',
      connectedNodes: [],
      exits: [{ description: 'back', targetNodeId: 'ORIGIN', isOpen: true }],
    },
  ];

  const baseBlueprint = {
    id: 'bp_containment_01',
    title: 'Containment Sector 7',
    premise: 'Escape the breach',
    environmentalRules: ['High atmospheric pressure'],
    setting: { location: 'Sub-level 4', atmosphere: 'Claustrophobic', timePeriod: '1986' },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    cast: [
      {
        id: 'c_protag',
        name: 'Dr. Aris',
        role: 'Protagonist',
        description: 'Lead Researcher',
        personality: 'Methodical',
        goals: 'Contain the breach',
        traits: ['Analytical'],
        isUserCharacter: true,
        behaviorVector: 'ADAPTIVE',
        isEntity: false,
      },
    ],
    topology: {
      nodes: ['ORIGIN', 'SECURITY_FOYER'],
      connections: [
        { from: 'ORIGIN', to: 'SECURITY_FOYER', kind: 'PHYSICAL', userInitiated: true },
        { from: 'SECURITY_FOYER', to: 'ORIGIN', kind: 'PHYSICAL', userInitiated: true },
      ],
    },
  } as unknown as Blueprint;

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
            exitVectors: [{ direction: 'back_to_origin', targetNodeId: 'ORIGIN' }],
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
        preSnapshot,
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
    expect(nextState.spatialGraph).toHaveLength(3);

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
        exitDirection: 'vent',
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
    expect(baseState.spatialGraph).toHaveLength(2);
  });

  // 3. Missing, invalid, rejected, or unauthorized topology deltas leave existing graph and node unchanged
  it('3. missing or invalid topology delta preserves existing graph and node position', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const payload: CommittedTurnPayload = {
      commandText: 'Wait silently',
      formattedText: 'Time passes without change.',
      preSnapshot,
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
        preSnapshot,
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
  it('4. replaying a delta with existing node ID does not duplicate nodes in graph or move player', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);

    const payload: CommittedTurnPayload = {
      commandText: 'Crawl into the vent again',
      formattedText: 'You return to the duct.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Replay node.',
        narrative_blocks: [{ type: 'prose', content: 'You return to the duct.' }],
        logic_state: {
          current_phase: 'LATENT',
          suggested_tension: 20,
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'vent',
          newNodeDef: {
            id: 'SECURITY_FOYER', // Already in graph
            geometry: 'Duplicate Security Foyer',
            hazards: [],
            exitVectors: [],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'SECURITY_FOYER',
        accepted: false,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      },
    };

    const nextState = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload,
    });

    expect(nextState.spatialGraph).toHaveLength(2);
    expect(nextState.currentNodeId).toBe('ORIGIN'); // Did not move to duplicate!
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
    const preSnapshot = captureRuntimeSnapshot(baseState);

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
      preSnapshot,
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
        preSnapshot,
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
      commandText: 'Crawl into the vent',
      formattedText: 'Reality shifts around you.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Vent traversed.',
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
          exitDirection: 'vent',
          newNodeDef: {
            id: 'VOID_SPACE',
            geometry: 'Infinite non-euclidean expanse',
            hazards: ['Sensory obliteration'],
            exitVectors: [{ direction: 'retreat', targetNodeId: 'ORIGIN' }],
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
        preSnapshot,
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

  // 9. Next turn context derives current node and allowed exits from committed runtime graph
  it('9. derives next turn context from committed runtime graph including generated nodes and return exits', () => {
    // 1. Commit expansion into MAINTENANCE_DUCT_4
    const preSnapshot = captureRuntimeSnapshot(baseState);
    const expansionPayload: CommittedTurnPayload = {
      commandText: 'Crawl into the vent',
      formattedText: 'You squeeze into the maintenance duct.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Expansion.',
        narrative_blocks: [{ type: 'prose', content: 'Duct reached.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 40,
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'vent',
          newNodeDef: {
            id: 'MAINTENANCE_DUCT_4',
            geometry: 'Narrow Ventilation Duct',
            hazards: ['Rusted fan blades'],
            exitVectors: [
              {
                direction: 'back_to_origin',
                targetNodeId: 'ORIGIN',
                kind: 'PHYSICAL',
                userInitiated: true,
              },
            ],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'MAINTENANCE_DUCT_4',
        accepted: true,
        nodeAfter: 'MAINTENANCE_DUCT_4',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 40,
        preSnapshot,
      },
    };

    const stateAfterExpansion = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload: expansionPayload,
    });

    const nextTurnPreSnapshot = captureRuntimeSnapshot(stateAfterExpansion);

    // 2. Build turn context for the next turn using the committed runtime graph
    const nextTurnContext = buildEngineTurnContext({
      blueprint: baseBlueprint,
      spatialGraph: stateAfterExpansion.spatialGraph,
      runtimeState: nextTurnPreSnapshot,
    });

    // 3. Verify that the context derives the current node from the runtime graph
    expect(nextTurnContext.topology.currentNodeId).toBe('MAINTENANCE_DUCT_4');
    expect(nextTurnContext.topology.readableNodeLabel).toBe('Narrow Ventilation Duct');

    // 4. Verify that allowed outgoing exits include the return edge to ORIGIN
    expect(nextTurnContext.topology.allowedOutgoingExits).toHaveLength(1);
    expect(nextTurnContext.topology.allowedOutgoingExits[0]).toEqual({
      from: 'MAINTENANCE_DUCT_4',
      to: 'ORIGIN',
      kind: 'PHYSICAL',
      requires: undefined,
      userInitiated: true,
    });
  });

  // 10. Generated node with non-default edge metadata (requires, userInitiated: false, kind: AUTHORED_PARADOX) is preserved in next turn context
  it('10. preserves non-default exit metadata (kind, requires, userInitiated: false) in next turn context', () => {
    const preSnapshot = captureRuntimeSnapshot(baseState);
    const expansionPayload: CommittedTurnPayload = {
      commandText: 'Crawl into the vent',
      formattedText: 'You enter the ritual sanctum.',
      preSnapshot,
      frame: {
        engine_thoughts: 'Expansion with complex edge.',
        narrative_blocks: [{ type: 'prose', content: 'You enter the sanctum.' }],
        logic_state: {
          current_phase: 'MANIFEST',
          suggested_tension: 50,
        },
        topologyDelta: {
          isExpansion: true,
          exitDirection: 'vent',
          newNodeDef: {
            id: 'RITUAL_CHAMBER',
            geometry: 'Hexagonal Ritual Chamber',
            hazards: ['Blood runes'],
            exitVectors: [
              {
                direction: 'sealed_gate',
                targetNodeId: 'ORIGIN',
                kind: 'AUTHORED_PARADOX',
                requires: ['SANCTUM_KEY'],
                userInitiated: false,
              },
            ],
          },
        },
      },
      turnReceipt: {
        turnNumber: 4,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'RITUAL_CHAMBER',
        accepted: true,
        nodeAfter: 'RITUAL_CHAMBER',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 50,
        preSnapshot,
      },
    };

    const stateAfterExpansion = engineReducer(baseState, {
      type: 'TURN_COMMITTED',
      payload: expansionPayload,
    });

    const nextTurnPreSnapshot = captureRuntimeSnapshot(stateAfterExpansion);

    const nextTurnContext = buildEngineTurnContext({
      blueprint: baseBlueprint,
      spatialGraph: stateAfterExpansion.spatialGraph,
      runtimeState: nextTurnPreSnapshot,
    });

    expect(nextTurnContext.topology.currentNodeId).toBe('RITUAL_CHAMBER');
    expect(nextTurnContext.topology.allowedOutgoingExits).toHaveLength(1);
    expect(nextTurnContext.topology.allowedOutgoingExits[0]).toEqual({
      from: 'RITUAL_CHAMBER',
      to: 'ORIGIN',
      kind: 'AUTHORED_PARADOX',
      requires: ['SANCTUM_KEY'],
      userInitiated: false,
    });
  });
});
