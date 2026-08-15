import { SpatialNode, TopologyDelta, TransitionReceipt } from '../../types';

export interface ApplyTopologyDeltaInput {
  spatialGraph?: SpatialNode[];
  currentNodeId: string | null;
  topologyDelta?: TopologyDelta | null;
  transitionReceipt?: TransitionReceipt | null;
}

export interface ApplyTopologyDeltaResult {
  nextGraph: SpatialNode[];
  nextNodeId: string | null;
  applied: boolean;
  reason: string;
}

/**
 * Pure helper that applies an authorized topology delta to the spatial graph.
 * Does not mutate inputs and has no side effects on any external store.
 */
export function applyTopologyDeltaToGraph(input: ApplyTopologyDeltaInput): ApplyTopologyDeltaResult {
  const currentGraph = input.spatialGraph ? [...input.spatialGraph] : [];
  const currentNodeId = input.currentNodeId;
  const delta = input.topologyDelta;
  const transitionReceipt = input.transitionReceipt;

  // If no expansion delta requested or missing node definition
  if (!delta || !delta.isExpansion || !delta.newNodeDef) {
    const nextNodeId =
      transitionReceipt?.accepted && transitionReceipt.toNodeId
        ? transitionReceipt.toNodeId
        : currentNodeId;

    return {
      nextGraph: currentGraph,
      nextNodeId,
      applied: false,
      reason: delta?.isExpansion ? 'MISSING_NEW_NODE_DEF' : 'NO_EXPANSION_REQUESTED',
    };
  }

  const newNodeDef = delta.newNodeDef;
  if (!newNodeDef.id || typeof newNodeDef.id !== 'string') {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'INVALID_NEW_NODE_ID',
    };
  }

  // Duplicate insertion guard: check if node already exists in graph
  const existingNode = currentGraph.find((n) => n.id === newNodeDef.id);
  if (existingNode) {
    return {
      nextGraph: currentGraph,
      nextNodeId: newNodeDef.id,
      applied: false,
      reason: 'NODE_ALREADY_EXISTS',
    };
  }

  // Build the new SpatialNode
  const newNode: SpatialNode = {
    id: newNodeDef.id,
    name: newNodeDef.geometry || 'Unmapped Region',
    description: Array.isArray(newNodeDef.hazards) ? newNodeDef.hazards.join(' ') : '',
    connectedNodes: [],
    exits: Array.isArray(newNodeDef.exitVectors)
      ? newNodeDef.exitVectors.map((ev) => ({
          targetNodeId: ev.targetNodeId,
          description: ev.direction,
          isOpen: true,
        }))
      : [],
  };

  // Update exits on the source node (currentNodeId) if exitDirection is provided
  const updatedGraph = currentGraph.map((node) => {
    if (node.id === currentNodeId && Array.isArray(node.exits)) {
      return {
        ...node,
        exits: node.exits.map((exit) => {
          if (!delta.exitDirection || exit.description === delta.exitDirection) {
            return { ...exit, targetNodeId: newNodeDef.id };
          }
          return exit;
        }),
      };
    }
    return node;
  });

  return {
    nextGraph: [...updatedGraph, newNode],
    nextNodeId: newNodeDef.id,
    applied: true,
    reason: 'EXPANSION_APPLIED',
  };
}
