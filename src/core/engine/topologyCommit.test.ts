import { describe, it, expect } from 'vitest';
import { applyTopologyDeltaToGraph } from './topologyCommit';
import { SpatialNode, TopologyDelta, TransitionReceipt } from '../../types';

describe('applyTopologyDeltaToGraph Authorization Boundary', () => {
  const initialGraph: SpatialNode[] = [
    {
      id: 'ORIGIN',
      name: 'Origin Chamber',
      description: 'A cold concrete chamber',
      connectedNodes: [],
      exits: [
        { description: 'north', targetNodeId: 'NODE_UNMAPPED', isOpen: true },
        { description: 'east', targetNodeId: 'EAST_HALL', isOpen: true },
        { description: 'vent', targetNodeId: 'unmaterialized_vent', isOpen: true },
      ],
    },
    {
      id: 'EAST_HALL',
      name: 'East Hallway',
      description: 'Long corridor',
      connectedNodes: [],
      exits: [{ description: 'west', targetNodeId: 'ORIGIN', isOpen: true }],
    },
  ];

  it('1. applies authorized expansion when all 5 conditions pass', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'north',
      newNodeDef: {
        id: 'CORRIDOR_9',
        geometry: 'Narrow Ventilation Corridor',
        hazards: ['Rust flakes', 'Asbestos'],
        exitVectors: [{ direction: 'south', targetNodeId: 'ORIGIN' }],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(true);
    expect(result.reason).toBe('EXPANSION_APPLIED');
    expect(result.nextNodeId).toBe('CORRIDOR_9');
    expect(result.nextGraph).toHaveLength(3);

    // Verify origin chamber exit updated
    const updatedOrigin = result.nextGraph.find((n) => n.id === 'ORIGIN');
    const northExit = updatedOrigin?.exits.find((e) => e.description === 'north');
    expect(northExit?.targetNodeId).toBe('CORRIDOR_9');

    // Verify new node created
    const newNode = result.nextGraph.find((n) => n.id === 'CORRIDOR_9');
    expect(newNode).toBeDefined();
    expect(newNode?.name).toBe('Narrow Ventilation Corridor');
    expect(newNode?.description).toBe('Rust flakes Asbestos');
    expect(newNode?.exits).toHaveLength(1);
    expect(newNode?.exits[0]).toEqual({
      targetNodeId: 'ORIGIN',
      description: 'south',
      isOpen: true,
      kind: 'PHYSICAL',
      requires: undefined,
      userInitiated: true,
    });
  });

  it('2. supports unmaterialized_ boundary format as valid unmapped exit', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'vent',
      newNodeDef: {
        id: 'VENT_CHAMBER',
        geometry: 'Small Vent Chamber',
        hazards: [],
        exitVectors: [{ direction: 'back', targetNodeId: 'ORIGIN' }],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(true);
    expect(result.reason).toBe('EXPANSION_APPLIED');
    expect(result.nextNodeId).toBe('VENT_CHAMBER');
  });

  it('3. rejects expansion if source node does not exist in graph', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'north',
      newNodeDef: {
        id: 'CORRIDOR_9',
        geometry: 'Ventilation',
        hazards: [],
        exitVectors: [],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'NONEXISTENT_SOURCE',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('SOURCE_NODE_NOT_FOUND');
    expect(result.nextGraph).toEqual(initialGraph);
    expect(result.nextNodeId).toBe('NONEXISTENT_SOURCE');
  });

  it('4. rejects expansion if exitDirection is missing', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: null,
      newNodeDef: {
        id: 'CORRIDOR_9',
        geometry: 'Ventilation',
        hazards: [],
        exitVectors: [],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('MISSING_EXIT_DIRECTION');
    expect(result.nextGraph).toEqual(initialGraph);
    expect(result.nextNodeId).toBe('ORIGIN');
  });

  it('5. rejects expansion if exit direction does not match any source exit', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'south', // No south exit on ORIGIN
      newNodeDef: {
        id: 'CORRIDOR_9',
        geometry: 'Ventilation',
        hazards: [],
        exitVectors: [],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('NO_MATCHING_SOURCE_EXIT');
    expect(result.nextGraph).toEqual(initialGraph);
    expect(result.nextNodeId).toBe('ORIGIN');
  });

  it('6. rejects expansion if matched exit is already mapped to an existing node', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'east', // east leads to EAST_HALL, not NODE_UNMAPPED
      newNodeDef: {
        id: 'NEW_EAST_CAVE',
        geometry: 'Cave',
        hazards: [],
        exitVectors: [],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('EXIT_ALREADY_MAPPED');
    expect(result.nextGraph).toEqual(initialGraph);
    expect(result.nextNodeId).toBe('ORIGIN');
  });

  it('7. guards against duplicate insertion and DOES NOT move player to duplicate', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'north',
      newNodeDef: {
        id: 'EAST_HALL', // Already in graph
        geometry: 'Duplicate East Hall',
        hazards: [],
        exitVectors: [],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('NODE_ALREADY_EXISTS');
    expect(result.nextGraph).toHaveLength(2);
    expect(result.nextNodeId).toBe('ORIGIN'); // Preserves currentNodeId!
  });

  it('8. in non-expansion turn, validates that transition target exists in runtime graph', () => {
    // Valid target
    const validTransition: TransitionReceipt = {
      requestedNodeId: 'EAST_HALL',
      accepted: true,
      fromNodeId: 'ORIGIN',
      toNodeId: 'EAST_HALL',
      reason: 'TRANSITION_ACCEPTED',
    };

    const validResult = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
      transitionReceipt: validTransition,
    });

    expect(validResult.applied).toBe(false);
    expect(validResult.reason).toBe('NO_EXPANSION_REQUESTED');
    expect(validResult.nextNodeId).toBe('EAST_HALL');

    // Nonexistent target in receipt -> must NOT move player
    const staleTransition: TransitionReceipt = {
      requestedNodeId: 'GHOST_CHAMBER_99',
      accepted: true,
      fromNodeId: 'ORIGIN',
      toNodeId: 'GHOST_CHAMBER_99',
      reason: 'STALE_TRANSITION',
    };

    const staleResult = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
      transitionReceipt: staleTransition,
    });

    expect(staleResult.applied).toBe(false);
    expect(staleResult.nextNodeId).toBe('ORIGIN'); // Retained source node!
  });

  it('9. in non-expansion turn, rejected or absent receipt leaves currentNodeId unchanged', () => {
    // 1. Rejected receipt targeting valid node EAST_HALL
    const rejectedTransition: TransitionReceipt = {
      requestedNodeId: 'EAST_HALL',
      accepted: false,
      fromNodeId: 'ORIGIN',
      toNodeId: 'EAST_HALL',
      reason: 'TRANSITION_BLOCKED',
    };

    const rejectedResult = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
      transitionReceipt: rejectedTransition,
    });

    expect(rejectedResult.nextNodeId).toBe('ORIGIN'); // Did not move

    // 2. Absent receipt
    const absentResult = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
    });

    expect(absentResult.nextNodeId).toBe('ORIGIN'); // Did not move
  });

  it('10. in non-expansion turn, accepted receipt with stale fromNodeId leaves currentNodeId unchanged', () => {
    const staleFromTransition: TransitionReceipt = {
      requestedNodeId: 'EAST_HALL',
      accepted: true,
      fromNodeId: 'SOME_OLD_NODE', // Does not match currentNodeId ('ORIGIN')
      toNodeId: 'EAST_HALL',
      reason: 'TRANSITION_ACCEPTED',
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
      transitionReceipt: staleFromTransition,
    });

    expect(result.nextNodeId).toBe('ORIGIN'); // Retained current node
  });

  it('11. preserves generated-edge metadata (kind, requires, userInitiated) on newly created SpatialNode exits', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'north',
      newNodeDef: {
        id: 'RITUAL_SANCTUM',
        geometry: 'Obsidian Sanctum',
        hazards: ['Whispering shadows'],
        exitVectors: [
          {
            direction: 'south_portal',
            targetNodeId: 'ORIGIN',
            kind: 'AUTHORED_PARADOX',
            requires: ['OBSIDIAN_KEY'],
            userInitiated: false,
          },
        ],
      },
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: delta,
    });

    expect(result.applied).toBe(true);
    const newNode = result.nextGraph.find((n) => n.id === 'RITUAL_SANCTUM');
    expect(newNode).toBeDefined();
    expect(newNode?.exits).toHaveLength(1);
    expect(newNode?.exits?.[0]).toEqual({
      targetNodeId: 'ORIGIN',
      description: 'south_portal',
      isOpen: true,
      kind: 'AUTHORED_PARADOX',
      requires: ['OBSIDIAN_KEY'],
      userInitiated: false,
    });
  });

  describe('Packet 1E-2 Perceptual Integrity and Failure Isolation', () => {
    it('12. perceptual displacement does not mutate graph or physical node', () => {
      // Supported perceptual displacement: no expansion, no mapped transition
      const result = applyTopologyDeltaToGraph({
        spatialGraph: initialGraph,
        currentNodeId: 'ORIGIN',
        topologyDelta: { isExpansion: false, newNodeDef: null },
        transitionReceipt: {
          requestedNodeId: null,
          accepted: false,
          fromNodeId: 'ORIGIN',
          toNodeId: 'ORIGIN',
          reason: 'NO_MOVEMENT_REQUESTED',
        },
      });

      expect(result.applied).toBe(false);
      expect(result.nextNodeId).toBe('ORIGIN');
      expect(result.nextGraph).toEqual(initialGraph);
    });

    it('13. failure isolation: rejected transition produces no graph or node changes', () => {
      const rejectedTransition: TransitionReceipt = {
        requestedNodeId: 'NONEXISTENT_NODE',
        accepted: false,
        fromNodeId: 'ORIGIN',
        toNodeId: 'ORIGIN',
        reason: 'UNKNOWN_OR_UNCONNECTED_TARGET',
      };

      const result = applyTopologyDeltaToGraph({
        spatialGraph: initialGraph,
        currentNodeId: 'ORIGIN',
        topologyDelta: { isExpansion: false, newNodeDef: null },
        transitionReceipt: rejectedTransition,
      });

      expect(result.applied).toBe(false);
      expect(result.nextNodeId).toBe('ORIGIN');
      expect(result.nextGraph).toEqual(initialGraph);
    });
  });
});
