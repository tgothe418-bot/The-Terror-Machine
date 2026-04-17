import { create } from 'zustand';
import { ScenarioBlueprint, LogicState } from '../types';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null;
  setBlueprint: (blueprint: ScenarioBlueprint, role: 'protagonist' | 'antagonist') => void;
  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void;
}

export const useEngineStore = create<EngineState>((set) => ({
  activeBlueprint: null,
  gameState: null,
  setBlueprint: (blueprint, role) => set({ 
    activeBlueprint: blueprint, 
    gameState: {
      current_location: blueprint.setting.location,
      player_injuries: [],
      inventory: [],
      psychological_status: 'Stable',
      player_role: role
    } 
  }),
  clearBlueprint: () => set({ activeBlueprint: null, gameState: null }),
  updateGameState: (newState) => set({ gameState: newState }),
}));
