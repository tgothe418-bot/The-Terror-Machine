import { create } from 'zustand';
import { ScenarioBlueprint, LogicState } from '../types';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null; // NEW: Track the mechanical state
  setBlueprint: (blueprint: ScenarioBlueprint) => void;
  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void; // NEW: Action to update state
}

export const useEngineStore = create<EngineState>((set) => ({
  activeBlueprint: null,
  gameState: null,
  setBlueprint: (blueprint) => set({ activeBlueprint: blueprint, gameState: null }),
  clearBlueprint: () => set({ activeBlueprint: null, gameState: null }),
  updateGameState: (newState) => set({ gameState: newState }),
}));
