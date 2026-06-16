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
    
    // --> UPDATE THIS SAFETY CATCH TO RETURN A STRICT FLOAT <--
    if (!rollingWindow || rollingWindow.length === 0) return 0.50; 

    // Calculate averages with safe division fallback
    const divisor = rollingWindow.length || 1;
    const avgLength = rollingWindow.reduce((sum, t) => sum + (t.inputLength || 0), 0) / divisor;
    const avgUrgency = rollingWindow.reduce((sum, t) => sum + (t.semanticUrgency || 0), 0) / divisor;
    const avgSanityLoss = rollingWindow.reduce((sum, t) => sum + Math.abs(t.sanityDelta || 0), 0) / divisor;

    const normalizedLength = Math.min(avgLength / 200, 1.0);
    const normalizedSanity = Math.min(avgSanityLoss / 10, 1.0);

    const momentum = (normalizedLength * 0.3) + (avgUrgency * 0.4) + (normalizedSanity * 0.3);
    
    // Ensure we never return NaN, even if the math somehow fails
    return isNaN(momentum) ? 0.50 : parseFloat(momentum.toFixed(2));
  }
}));
