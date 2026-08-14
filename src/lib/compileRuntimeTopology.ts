import { SpatialNode, TopologyEdge } from '../types';

export interface CompiledTopologyResult {
  spatialGraph: SpatialNode[];
  startNodeId: string;
}

export interface CompileRuntimeTopologyOptions {
  topology?: {
    nodes?: string[];
    connections?: TopologyEdge[];
  };
  fallbackSetting?: {
    location?: string;
    atmosphere?: string;
  };
}

/**
 * Pure, typed runtime topology compiler.
 * Transforms authored Blueprint topology into the SpatialNode[] graph required by the runtime.
 */
export function compileRuntimeTopology(
  options: CompileRuntimeTopologyOptions = {}
): CompiledTopologyResult {
  const nodes = options.topology?.nodes || [];
  const connections = options.topology?.connections || [];

  if (nodes.length === 0) {
    const rawLoc = options.fallbackSetting?.location || 'ORIGIN';
    const fallbackId = rawLoc.trim().replace(/\s+/g, '_').toUpperCase() || 'ORIGIN';
    const fallbackName = options.fallbackSetting?.location || 'Origin';
    const fallbackDesc = options.fallbackSetting?.atmosphere || 'Initial spatial enclosure.';

    const fallbackNode: SpatialNode = {
      id: fallbackId,
      name: fallbackName,
      description: fallbackDesc,
      connectedNodes: [],
      exits: []
    };

    return {
      spatialGraph: [fallbackNode],
      startNodeId: fallbackId
    };
  }

  const spatialGraph: SpatialNode[] = nodes.map((nodeId) => {
    // Exits are derived strictly from outgoing connections where `conn.from === nodeId`
    const outgoing = connections.filter((conn) => conn.from === nodeId);
    const connectedNodes = Array.from(new Set(outgoing.map((conn) => conn.to)));

    const exits = outgoing.map((conn) => ({
      targetNodeId: conn.to,
      description: typeof conn.to === 'string' ? conn.to.replace(/_/g, ' ') : String(conn.to),
      isOpen: true,
      kind: conn.kind || 'PHYSICAL',
      requires: conn.requires && conn.requires.length > 0 ? conn.requires : undefined,
      userInitiated: conn.userInitiated !== false
    }));

    return {
      id: nodeId,
      name: nodeId.replace(/_/g, ' '),
      description: '',
      connectedNodes,
      exits
    };
  });

  return {
    spatialGraph,
    startNodeId: nodes[0]
  };
}
