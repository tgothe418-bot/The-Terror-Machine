import { create } from 'zustand';
import { AppState, AppPhase } from '../types';

export const useAppStore = create<AppState>((set) => ({
  phase: 'hub',
  setPhase: (phase: AppPhase) => set({ phase }),
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
}));
