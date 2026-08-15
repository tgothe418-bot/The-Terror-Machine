import { describe, it, expect } from 'vitest';
import { applyTopologyDeltaToGraph } from './topologyCommit';
import { SpatialNode, TopologyDelta, TransitionReceipt } from '../../types';

describe('applyTopologyDeltaToGraph', () => {
  const initialGraph: SpatialNode[] = [
    {
      id: 'ORIGIN',
      name: 'Origin Chamber',
      description: 'A cold concrete chamber',
      connectedNodes: [],
      exits: [
        { description: 'north', targetNodeId: 'NODE_UNMAPPED', isOpen: true },
        { description: 'east', targetNodeId: 'EAST_HALL', isOpen: true },
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

  it('applies a valid authorized topology expansion, updates source exit and returns new node ID', () => {
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
    });
  });

  it('guards against duplicate insertion when generated node ID already exists', () => {
    const delta: TopologyDelta = {
      isExpansion: true,
      exitDirection: 'east',
      newNodeDef: {
        id: 'EAST_HALL',
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
    expect(result.nextNodeId).toBe('EAST_HALL');
  });

  it('leaves graph unchanged and applies normal transition when no expansion delta is provided', () => {
    const transitionReceipt: TransitionReceipt = {
      requestedNodeId: 'EAST_HALL',
      accepted: true,
      fromNodeId: 'ORIGIN',
      toNodeId: 'EAST_HALL',
      reason: 'TRANSITION_ACCEPTED',
    };

    const result = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: false, newNodeDef: null },
      transitionReceipt,
    });

    expect(result.applied).toBe(false);
    expect(result.reason).toBe('NO_EXPANSION_REQUESTED');
    expect(result.nextNodeId).toBe('EAST_HALL');
    expect(result.nextGraph).toEqual(initialGraph);
  });

  it('handles missing or malformed newNodeDef gracefully without mutating graph', () => {
    const resultMissingDef = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: { isExpansion: true, newNodeDef: null },
    });

    expect(resultMissingDef.applied).toBe(false);
    expect(resultMissingDef.reason).toBe('MISSING_NEW_NODE_DEF');
    expect(resultMissingDef.nextGraph).toEqual(initialGraph);
    expect(resultMissingDef.nextNodeId).toBe('ORIGIN');

    const resultInvalidId = applyTopologyDeltaToGraph({
      spatialGraph: initialGraph,
      currentNodeId: 'ORIGIN',
      topologyDelta: {
        isExpansion: true,
        newNodeDef: { id: '', geometry: 'Void', hazards: [], exitVectors: [] },
      },
    });

    expect(resultInvalidId.applied).toBe(false);
    expect(resultInvalidId.reason).toBe('INVALID_NEW_NODE_ID');
    expect(resultInvalidId.nextGraph).toEqual(initialGraph);
  });
});
