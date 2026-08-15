import { SpatialNode, TopologyDelta, TransitionReceipt } from '../../types';

export interface ApplyTopologyDeltaInput {
  spatialGraph?: SpatialNode[];
  currentNodeId: string | null;
  topologyDelta?: TopologyDelta | null;
  transitionReceipt?: TransitionReceipt | null;
  requestedTargetNodeId?: string | null;
}

export interface ApplyTopologyDeltaResult {
  nextGraph: SpatialNode[];
  nextNodeId: string | null;
  applied: boolean;
  reason: string;
}

export function isUnmappedBoundary(targetNodeId?: string | null): boolean {
  if (!targetNodeId || typeof targetNodeId !== 'string') return false;
  return targetNodeId === 'NODE_UNMAPPED' || targetNodeId.startsWith('unmaterialized_');
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

  // Non-expansion turn handling
  if (!delta || !delta.isExpansion) {
    let nextNodeId = currentNodeId;
    const targetCandidate =
      (transitionReceipt?.accepted ? transitionReceipt.toNodeId : null) ||
      input.requestedTargetNodeId;

    if (targetCandidate) {
      // Only move to target if target exists in current runtime graph or graph is not defined/empty
      const targetExists =
        currentGraph.length === 0 || currentGraph.some((n) => n.id === targetCandidate);
      if (targetExists) {
        nextNodeId = targetCandidate;
      }
    }

    return {
      nextGraph: currentGraph,
      nextNodeId,
      applied: false,
      reason: 'NO_EXPANSION_REQUESTED',
    };
  }

  // 1. Check if current source node exists in graph
  if (!currentNodeId) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'MISSING_CURRENT_NODE_ID',
    };
  }

  const sourceNode = currentGraph.find((n) => n.id === currentNodeId);
  if (!sourceNode) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'SOURCE_NODE_NOT_FOUND',
    };
  }

  // 2. The delta must name one explicit exit direction
  const exitDirection = delta.exitDirection?.trim();
  if (!exitDirection) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'MISSING_EXIT_DIRECTION',
    };
  }

  // 3. Exactly one source exit matches that direction
  const sourceExits = Array.isArray(sourceNode.exits) ? sourceNode.exits : [];
  const matchingExits = sourceExits.filter(
    (e) => e.description && e.description.toLowerCase().trim() === exitDirection.toLowerCase().trim()
  );

  if (matchingExits.length === 0) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'NO_MATCHING_SOURCE_EXIT',
    };
  }

  if (matchingExits.length > 1) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'AMBIGUOUS_SOURCE_EXITS',
    };
  }

  // 4. That exit is currently an unmapped/unmaterialized expansion boundary
  const targetExit = matchingExits[0];
  if (!isUnmappedBoundary(targetExit.targetNodeId)) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'EXIT_ALREADY_MAPPED',
    };
  }

  // 5. The new node ID is nonempty and does not already exist
  const newNodeDef = delta.newNodeDef;
  if (!newNodeDef || !newNodeDef.id || typeof newNodeDef.id !== 'string' || !newNodeDef.id.trim()) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId,
      applied: false,
      reason: 'INVALID_NEW_NODE_DEF',
    };
  }

  const newId = newNodeDef.id.trim();
  const existingNode = currentGraph.find((n) => n.id === newId);
  if (existingNode) {
    return {
      nextGraph: currentGraph,
      nextNodeId: currentNodeId, // Do NOT move player on duplicate
      applied: false,
      reason: 'NODE_ALREADY_EXISTS',
    };
  }

  // All 5 conditions passed! Build the new SpatialNode
  const newNode: SpatialNode = {
    id: newId,
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

  // Update only the single matched exit on the source node
  const updatedGraph = currentGraph.map((node) => {
    if (node.id === currentNodeId && Array.isArray(node.exits)) {
      return {
        ...node,
        exits: node.exits.map((exit) => {
          if (
            exit.description &&
            exit.description.toLowerCase().trim() === exitDirection.toLowerCase().trim()
          ) {
            return { ...exit, targetNodeId: newId };
          }
          return exit;
        }),
      };
    }
    return node;
  });

  return {
    nextGraph: [...updatedGraph, newNode],
    nextNodeId: newId,
    applied: true,
    reason: 'EXPANSION_APPLIED',
  };
}
