import type { Blueprint } from '../types';

export interface ResolveCharacterEntryOptions {
  blueprint: Blueprint;
  characterId?: string | null;
  defaultFallbackNodeId?: string;
}

/**
 * Deterministically resolves entry node for an Engine session:
 * 1. If characterId is provided and exists in cast:
 *    - If presenceDisposition.kind === 'AT_NODE' and nodeId is in topology, return presenceDisposition.nodeId.
 *    - If starting_location is set and in topology, return starting_location.
 * 2. Deterministic legacy / blueprint fallback:
 *    - If blueprint.topology.startingNodeId exists and is in topology, return startingNodeId.
 *    - If blueprint.topology.nodeDefinitions has entries, return nodeDefinitions[0].id.
 *    - If blueprint.topology.nodes has entries, return nodes[0].
 *    - Return defaultFallbackNodeId or 'ORIGIN'.
 */
export function resolveCharacterEntryPlacement(options: ResolveCharacterEntryOptions): string {
  const { blueprint, characterId, defaultFallbackNodeId = 'ORIGIN' } = options;
  const topology = blueprint.topology;

  const availableNodes = new Set<string>();
  if (Array.isArray(topology?.nodeDefinitions) && topology.nodeDefinitions.length > 0) {
    topology.nodeDefinitions.forEach((d) => d?.id && availableNodes.add(d.id));
  }
  if (Array.isArray(topology?.nodes)) {
    topology.nodes.forEach((n) => n && availableNodes.add(n));
  }

  if (characterId && Array.isArray(blueprint.cast)) {
    const char = blueprint.cast.find((c) => c.id === characterId);
    if (char) {
      if (char.presenceDisposition?.kind === 'AT_NODE' && char.presenceDisposition.nodeId) {
        const targetNode = char.presenceDisposition.nodeId.trim();
        if (availableNodes.size === 0 || availableNodes.has(targetNode)) {
          return targetNode;
        }
      }
      if (char.starting_location && char.starting_location.trim().length > 0) {
        const targetNode = char.starting_location.trim();
        if (availableNodes.size === 0 || availableNodes.has(targetNode)) {
          return targetNode;
        }
      }
    }
  }

  // Legacy fallback
  if (topology?.startingNodeId && topology.startingNodeId.trim().length > 0) {
    const startId = topology.startingNodeId.trim();
    if (availableNodes.size === 0 || availableNodes.has(startId)) {
      return startId;
    }
  }

  if (Array.isArray(topology?.nodeDefinitions) && topology.nodeDefinitions.length > 0) {
    const firstDef = topology.nodeDefinitions[0];
    if (firstDef?.id) {
      return firstDef.id;
    }
  }

  if (Array.isArray(topology?.nodes) && topology.nodes.length > 0) {
    const firstNode = topology.nodes[0];
    if (firstNode) {
      return firstNode;
    }
  }

  return defaultFallbackNodeId;
}
