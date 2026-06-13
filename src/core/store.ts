import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ScenarioBlueprint, LogicState, Message } from '../types';
import { idbStorage } from '../lib/idbStorage';
import { distillContext } from '../services/geminiService';

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null;
  messages: Message[]; // Used for UI display
  textBuffer: Message[]; // Used for the LLM payload
  maxBufferTurns: number;
  worldStateSummary: string;
  setBlueprint: (blueprint: ScenarioBlueprint, role: 'protagonist' | 'antagonist') => void;
  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void;
  addMessage: (message: Message) => void;
  setMessages: (messages: Message[]) => void;
  ingestTurn: (turn: Message) => void;
  pruneContext: () => void;
  updateWorldStateSummary: (newSummary: string) => void;
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      activeBlueprint: null,
      gameState: null,
      messages: [],
      textBuffer: [],
      maxBufferTurns: 12,
      worldStateSummary: "The subject is contained. Initial parameters active.",
      setBlueprint: (blueprint, role) => set({ 
        activeBlueprint: blueprint, 
        messages: [],
        textBuffer: [],
        worldStateSummary: "The subject is contained. Initial parameters active.",
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
      clearBlueprint: () => set({ activeBlueprint: null, gameState: null, messages: [], textBuffer: [], worldStateSummary: "The subject is contained. Initial parameters active." }),
      updateGameState: (newState) => set({ gameState: newState }),
      addMessage: (message) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const msg = {
            ...message,
            frozen_psychological_status: message.frozen_psychological_status || currentStatus
          };
          return {
            messages: [...state.messages, msg]
          };
        });
        get().ingestTurn(message);
      },
      setMessages: (messages) => set({ messages, textBuffer: messages.slice(-get().maxBufferTurns) }),
      ingestTurn: (turn) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const newBuffer = [...state.textBuffer, {
            ...turn,
            frozen_psychological_status: turn.frozen_psychological_status || currentStatus
          }];
          return { textBuffer: newBuffer };
        });
        
        if (get().textBuffer.length > get().maxBufferTurns) {
          get().pruneContext();
        }
      },
      pruneContext: async () => {
        const currentBuffer = get().textBuffer;
        const currentSummary = get().worldStateSummary;
        
        // 1. Identify the turns heading to the incinerator
        const turnsToPrune = currentBuffer.slice(0, 2);
        
        // 2. Immediately update the UI/Buffer so the user experiences zero lag
        const remainingBuffer = currentBuffer.slice(2);
        set({ textBuffer: remainingBuffer });

        // 3. Fire the background distillation worker
        try {
          const updatedSummary = await distillContext(currentSummary, turnsToPrune);
          // 4. Silently inject the compressed summary back into the permanent state
          set({ worldStateSummary: updatedSummary });
          console.log('// BACKGROUND DISTILLATION COMPLETE //');
        } catch (error) {
          console.error('// DISTILLATION WORKER FAILED // Context may be lost.', error);
        }
      },
      updateWorldStateSummary: (newSummary) => {
        set({ worldStateSummary: newSummary });
      }
    }),
    {
      name: 'the-engine-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
