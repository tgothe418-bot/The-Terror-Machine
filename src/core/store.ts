import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ScenarioBlueprint, LogicState, Message } from '../types';
import { idbStorage } from '../lib/idbStorage';
import { distillContext } from '../services/geminiService';

import { flattenTurnsForDistillation } from '../lib/jsonParser';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null;
  engineMessages: Message[]; // Used for UI display
  engineTextBuffer: Message[]; // The sliding window specifically for the Engine
  maxBufferTurns: number;
  engineWorldStateSummary: string;
  setBlueprint: (blueprint: ScenarioBlueprint, role: 'protagonist' | 'antagonist') => void;
  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void;
  addEngineMessage: (message: Message) => void;
  setEngineMessages: (messages: Message[]) => void;
  ingestTurn: (turn: Message) => void;
  pruneContext: () => void;
  updateWorldStateSummary: (newSummary: string) => void;
  addEngineTurn: (turn: Message) => void;
  resetEngine: () => void;
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      activeBlueprint: null,
      gameState: null,
      engineMessages: [],
      engineTextBuffer: [],
      maxBufferTurns: 12,
      engineWorldStateSummary: "The subject is contained. Initial parameters active.",
      setBlueprint: (blueprint, role) => set({ 
        activeBlueprint: blueprint, 
        engineMessages: [],
        engineTextBuffer: [],
        engineWorldStateSummary: "The subject is contained. Initial parameters active.",
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
      clearBlueprint: () => set({ activeBlueprint: null, gameState: null, engineMessages: [], engineTextBuffer: [], engineWorldStateSummary: "The subject is contained. Initial parameters active." }),
      updateGameState: (newState) => set({ gameState: newState }),
      addEngineMessage: (message) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const msg = {
            ...message,
            frozen_psychological_status: message.frozen_psychological_status || currentStatus
          };
          return {
            engineMessages: [...state.engineMessages, msg]
          };
        });
        get().addEngineTurn(message);
      },
      setEngineMessages: (messages) => set({ engineMessages: messages, engineTextBuffer: messages.slice(-get().maxBufferTurns) }),
      ingestTurn: (turn) => get().addEngineTurn(turn),
      addEngineTurn: (turn) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const newBuffer = [...state.engineTextBuffer, {
            ...turn,
            frozen_psychological_status: turn.frozen_psychological_status || currentStatus
          }];
          return { engineTextBuffer: newBuffer };
        });
        
        if (get().engineTextBuffer.length > get().maxBufferTurns) {
          get().pruneContext();
        }
      },
      pruneContext: async () => {
        const currentBuffer = get().engineTextBuffer;
        const currentSummary = get().engineWorldStateSummary;
        
        // 1. Isolate the oldest message cluster
        const turnsToPrune = currentBuffer.slice(0, 2);
        const remainingBuffer = currentBuffer.slice(2);
        
        // 2. Clear from active text memory immediately for UI responsiveness
        set({ engineTextBuffer: remainingBuffer });

        // 3. Flatten the complex JSON payload into structured plain text
        const flattenedTranscript = flattenTurnsForDistillation(turnsToPrune);

        // 4. Dispatch the streamlined text string to the background processing tier
        try {
          const updatedSummary = await distillContext(currentSummary, flattenedTranscript);
          set({ engineWorldStateSummary: updatedSummary });
          console.log('// BACKGROUND SEMANTIC DISTILLATION lossless pass complete //');
        } catch (error) {
          console.error('// DISTILLATION BACKGROUND FAILURE // Fallback state maintained.', error);
        }
      },
      updateWorldStateSummary: (newSummary) => {
        set({ engineWorldStateSummary: newSummary });
      },
      resetEngine: () => set((state) => ({
        engineTextBuffer: [],
        engineMessages: [],
        engineWorldStateSummary: "The subject is contained. Initial parameters active.",
        gameState: state.activeBlueprint ? {
          current_location: state.activeBlueprint.setting.location,
          player_injuries: [],
          inventory: [],
          psychological_status: 'Stable',
          player_role: state.gameState?.player_role || 'protagonist',
          current_tension_level: state.activeBlueprint.narrativeRules?.currentTensionLevel || 'buildup',
          lore_and_memory: { established_facts: [], permanent_consequences: [] },
          npc_fixations: []
        } : null,
        engineMessages: []
      }))
    }),
    {
      name: 'the-engine-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
