import { create } from 'zustand';
import { AppPhase, SpatialNode, TelemetryState, TopologyEdge } from '../types';
import { calculateDecayState } from '../lib/ratificationPipeline';
import { EngineEvent } from '../core/engine/events';
import { engineReducer, initialEngineState, EngineState } from '../core/engine/reducer';

export interface AppStore extends EngineState {
  setPhase: (phase: AppPhase) => void;
  telemetry: TelemetryState | null;
  setTelemetry: (telemetry: TelemetryState) => void;
  spatialGraph: SpatialNode[];
  isShattered: boolean;
  decayMetrics: {
    currentStage: string;
    coherenceRating: number;
    divergenceMode: string;
  };
  updateDecayMetrics: (skepticism: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compileTopology: (forgeTopology: any, startNodeId: string) => void;
  triggerShatter: () => void;
  setCurrentNodeId: (nodeId: string) => void;
  dispatch: (event: EngineEvent) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  ...initialEngineState,
  
  // Legacy phase setter (still needed if UI expects AppPhase, but our reducer uses Phase)
  setPhase: (phase: AppPhase) => set({ phase: phase as 'HUB' | 'FORGE' | 'LATENT' | 'MANIFEST' | 'TERMINAL' | 'TERMINATED' | 'VOICE' | 'ENGINE' }),
  
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
  
  spatialGraph: [],
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
        .filter((e: TopologyEdge) => e && typeof e === 'object' && e.from === nodeName)
        .map((e: TopologyEdge) => e.to);

      return {
        id: nodeName,
        name: nodeName,
        description: "No description",
        connectedNodes
      };
    });

    set({ spatialGraph: compiledGraph, isShattered: false, currentNodeId: startNodeId || compiledGraph[0]?.id || "NODE_INIT" });
  },

  dispatch: (event: EngineEvent) => {
    set((state) => {
      // Isolate the EngineState properties
      const currentEngineState: EngineState = {
        phase: state.phase,
        currentNodeId: state.currentNodeId,
        decay: state.decay,
        turnCount: state.turnCount,
        traumaLedger: state.traumaLedger,
        activeMemory: state.activeMemory,
        history: state.history || [],
      };
      
      // Calculate the new state
      const nextEngineState = engineReducer(currentEngineState, event);
      
      // Merge the new state back into the Zustand store
      return { ...state, ...nextEngineState };
    });
  }
}));
