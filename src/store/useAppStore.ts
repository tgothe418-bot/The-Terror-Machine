import { create } from 'zustand';
import { AppState, AppPhase } from '../types';
import { calculateDecayState } from '../lib/ratificationPipeline';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { engineReducer, initialEngineState } from '../core/engine/reducer';

export const useAppStore = create<AppState>((set) => ({
  phase: 'hub',
  setPhase: (phase: AppPhase) => set({ phase }),
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
  spatialGraph: [],
  currentNodeId: "NODE_INIT",
  setCurrentNodeId: (nodeId) => set(() => ({
    currentNodeId: nodeId
  })),
  isShattered: false,
  triggerShatter: () => set({ isShattered: true }),
  decayMetrics: {
    currentStage: 'STABLE',
    coherenceRating: 1.0,
    divergenceMode: 'NONE'
  },
  updateDecayMetrics: (skepticism) => {
    const nextMetrics = calculateDecayState(skepticism);
    
    set(() => {
      const isShatteredNow = nextMetrics.currentStage === 'SHATTERED';
      return {
        decayMetrics: nextMetrics,
        isShattered: isShatteredNow
      };
    });
  },
  compileTopology: (forgeTopology, startNodeId) => {
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

    set({ spatialGraph: compiledGraph, isShattered: false, currentNodeId: startNodeId || compiledGraph[0]?.id || "NODE_INIT" });
  }
}));
