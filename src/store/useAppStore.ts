import { create } from 'zustand';
import { AppState, AppPhase } from '../types';

export const useAppStore = create<AppState>((set) => ({
  phase: 'hub',
  setPhase: (phase: AppPhase) => set({ phase }),
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
  spatialGraph: [{ id: "NODE_INIT", name: "Void", description: "Empty", connectedNodes: [] }],
  currentNodeId: "NODE_INIT",
  setCurrentNode: (nodeId) => set(() => ({
    currentNodeId: nodeId
  })),
  isShattered: false,
  triggerShatter: () => set({ isShattered: true }),
  initializeSimulation: (forgeTopology) => {
    // Compile the raw Forge topology into the clean runtime graph
    const nodesList = Array.isArray(forgeTopology?.nodes) ? forgeTopology.nodes : [];
    const connectionsList = Array.isArray(forgeTopology?.connections) ? forgeTopology.connections : [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compiledGraph = nodesList.map((nodeName: any) => {
      // Find connections where this node is the source
      const connectedNodes = connectionsList
        .filter((c: string) => c.startsWith(`${nodeName} -> `))
        .map((c: string) => c.split(' -> ')[1]);

      return {
        id: nodeName,
        name: nodeName,
        description: "No description",
        connectedNodes
      };
    });

    set({ spatialGraph: compiledGraph, isShattered: false, currentNodeId: compiledGraph[0]?.id || "NODE_INIT" });
  }
}));
