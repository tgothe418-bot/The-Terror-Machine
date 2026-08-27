import { SpatialNode, TopologyEdge } from '../types';
import { ForgeTopologyNode, ForgeExpandableAnchor } from '../types/forge';

export interface CompiledTopologyResult {
  spatialGraph: SpatialNode[];
  startNodeId: string;
}

export interface CompileRuntimeTopologyOptions {
  topology?: {
    startingNodeId?: string;
    nodes?: string[];
    nodeDefinitions?: ForgeTopologyNode[];
    connections?: TopologyEdge[];
    anchors?: ForgeExpandableAnchor[];
  };
  fallbackSetting?: {
    location?: string;
    atmosphere?: string;
  };
}

/**
 * Pure, typed runtime topology compiler.
 * Transforms authored Blueprint topology into the SpatialNode[] graph required by the runtime.
 * Preserves authored node labels, descriptions, and explicit startingNodeId.
 * Expandable anchors remain absent from initial runtime nodes and exits.
 */
export function compileRuntimeTopology(
  options: CompileRuntimeTopologyOptions = {}
): CompiledTopologyResult {
  const nodeDefs = options.topology?.nodeDefinitions || [];
  const rawNodes = options.topology?.nodes || [];

  // Union of node IDs preserving order: nodeDefinitions first, then any extra raw nodes
  const nodeIds: string[] = [];
  const seenIds = new Set<string>();

  for (const def of nodeDefs) {
    if (def?.id && !seenIds.has(def.id)) {
      seenIds.add(def.id);
      nodeIds.push(def.id);
    }
  }

  for (const n of rawNodes) {
    if (n && !seenIds.has(n)) {
      seenIds.add(n);
      nodeIds.push(n);
    }
  }

  const connections = options.topology?.connections || [];

  if (nodeIds.length === 0) {
    const rawLoc = options.fallbackSetting?.location || 'ORIGIN';
    const fallbackId = rawLoc.trim().replace(/\s+/g, '_').toUpperCase() || 'ORIGIN';
    const fallbackName = options.fallbackSetting?.location || 'Origin';
    const fallbackDesc = options.fallbackSetting?.atmosphere || 'Initial spatial enclosure.';

    const fallbackNode: SpatialNode = {
      id: fallbackId,
      name: fallbackName,
      description: fallbackDesc,
      connectedNodes: [],
      exits: [],
    };

    return {
      spatialGraph: [fallbackNode],
      startNodeId: fallbackId,
    };
  }

  const spatialGraph: SpatialNode[] = nodeIds.map((nodeId) => {
    // Exits are derived strictly from outgoing connections where `conn.from === nodeId`
    const outgoing = connections.filter((conn) => conn.from === nodeId);
    const connectedNodes = Array.from(new Set(outgoing.map((conn) => conn.to)));

    const exits = outgoing.map((conn) => ({
      targetNodeId: conn.to,
      description: typeof conn.to === 'string' ? conn.to.replace(/_/g, ' ') : String(conn.to),
      isOpen: true,
      kind: conn.kind || 'PHYSICAL',
      requires: conn.requires && conn.requires.length > 0 ? conn.requires : undefined,
      userInitiated: conn.userInitiated !== false,
    }));

    const def = nodeDefs.find((d) => d.id === nodeId);

    return {
      id: nodeId,
      name: def?.label || nodeId.replace(/_/g, ' '),
      description: def?.description || '',
      connectedNodes,
      exits,
    };
  });

  const explicitStart = options.topology?.startingNodeId;
  const isRichTopology = nodeDefs.length > 0;

  let startNodeId: string;
  if (isRichTopology) {
    if (!explicitStart || !explicitStart.trim()) {
      throw new Error('Explicit startingNodeId is required for rich authored topology.');
    }
    if (options.topology?.anchors?.some((a) => a.id === explicitStart)) {
      throw new Error(`Starting node ID "${explicitStart}" cannot be an expandable space anchor.`);
    }
    if (!nodeIds.includes(explicitStart)) {
      throw new Error(`Explicit startingNodeId "${explicitStart}" not found in topology node definitions.`);
    }
    startNodeId = explicitStart;
  } else {
    // Legacy flat topology compatibility path: fallback to explicit start if present, else first node
    startNodeId = explicitStart && nodeIds.includes(explicitStart) ? explicitStart : nodeIds[0];
  }

  return {
    spatialGraph,
    startNodeId,
  };
}
