import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ScenarioBlueprint, LogicState, Message } from '../types';
import { idbStorage } from '../lib/idbStorage';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null;
  messages: Message[];
  setBlueprint: (blueprint: ScenarioBlueprint, role: 'protagonist' | 'antagonist') => void;
  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set) => ({
      activeBlueprint: null,
      gameState: null,
      messages: [],
      setBlueprint: (blueprint, role) => set({ 
        activeBlueprint: blueprint, 
        messages: [],
        gameState: {
          current_location: blueprint.setting.location,
          player_injuries: [],
          inventory: [],
          psychological_status: 'Stable',
          player_role: role,
          lore_and_memory: {
            established_facts: [],
            permanent_consequences: []
          },
          npc_fixations: []
        } 
      }),
      clearBlueprint: () => set({ activeBlueprint: null, gameState: null, messages: [] }),
      updateGameState: (newState) => set({ gameState: newState }),
      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
      setMessages: (messages) => set({ messages }),
    }),
    {
      name: 'the-engine-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
