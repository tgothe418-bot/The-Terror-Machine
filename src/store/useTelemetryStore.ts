import { create } from 'zustand';

export type SimulationPhase = 'LATENT' | 'MANIFEST' | 'TERMINAL';

export interface TurnData {
  inputLength: number;
  semanticUrgency: number; // 0.0 to 1.0
  sanityDelta: number;     // Negative number representing cast sanity loss
}

export interface TelemetryState {
  turnCount: number;
  currentPhase: SimulationPhase;
  rollingWindow: TurnData[]; // Max length of 3
  
  // Actions
  recordTurn: (data: TurnData) => void;
  updatePhase: (phase: SimulationPhase) => void;
  getMomentumIndex: () => number;
}

export const useTelemetryStore = create<TelemetryState>((set, get) => ({
  turnCount: 1,
  currentPhase: 'LATENT',
  rollingWindow: [],

  updatePhase: (phase) => set({ currentPhase: phase }),

  recordTurn: (data) => set((state) => {
    const newWindow = [...state.rollingWindow, data];
    if (newWindow.length > 3) newWindow.shift(); // Keep only the last 3 turns
    return {
      turnCount: state.turnCount + 1,
      rollingWindow: newWindow
    };
  }),

  getMomentumIndex: () => {
    const { rollingWindow } = get();
    if (rollingWindow.length === 0) return 0.5; // Baseline start

    // Calculate averages
    const avgLength = rollingWindow.reduce((sum, t) => sum + t.inputLength, 0) / rollingWindow.length;
    const avgUrgency = rollingWindow.reduce((sum, t) => sum + t.semanticUrgency, 0) / rollingWindow.length;
    const avgSanityLoss = rollingWindow.reduce((sum, t) => sum + Math.abs(t.sanityDelta), 0) / rollingWindow.length;

    // Weights: Length (normalize to ~0-1 assuming 200 chars is long), Urgency (already 0-1), Sanity (assume max drop is 10)
    const normalizedLength = Math.min(avgLength / 200, 1.0);
    const normalizedSanity = Math.min(avgSanityLoss / 10, 1.0);

    // Momentum Formula (Weighted)
    const momentum = (normalizedLength * 0.3) + (avgUrgency * 0.4) + (normalizedSanity * 0.3);
    
    return parseFloat(momentum.toFixed(2));
  }
}));
