import { create } from 'zustand';
import { AppState, AppPhase } from '../types';

export const useAppStore = create<AppState>((set) => ({
  phase: 'hub',
  setPhase: (phase: AppPhase) => set({ phase }),
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
  spatialGraph: {
    regionId: "UNINITIALIZED_REGION",
    currentNodeId: "NODE_INIT",
    nodes: {
      "NODE_INIT": {
        id: "NODE_INIT",
        name: "The Void",
        baseDescription: "Awaiting scenario geometry...",
        connectedNodes: [],
        state: "SECURE"
      }
    }
  },
  setCurrentNode: (nodeId) => set((state) => ({
    spatialGraph: state.spatialGraph ? { ...state.spatialGraph, currentNodeId: nodeId } : null
  })),
}));
