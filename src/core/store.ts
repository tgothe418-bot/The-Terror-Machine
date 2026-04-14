import { create } from 'zustand';
import { ScenarioBlueprint } from '../types';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  loadBlueprint: (blueprint: ScenarioBlueprint) => void;
  clearBlueprint: () => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  activeBlueprint: null,
  loadBlueprint: (blueprint: ScenarioBlueprint) => set({ activeBlueprint: blueprint }),
  clearBlueprint: () => set({ activeBlueprint: null }),
}));
