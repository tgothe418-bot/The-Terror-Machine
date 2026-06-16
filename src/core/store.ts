import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { ScenarioBlueprint, LogicState, Message } from '../types';
import { idbStorage } from '../lib/idbStorage';
import { distillContext } from '../services/geminiService';

import { flattenTurnsForDistillation } from '../lib/jsonParser';
import { HorrorVector, ExposureTier } from './matrix';

// Add these model definitions to your store fields in src/core/store.ts
export interface TelemetryMetrics {
  tension: string;
  pacing: string;
  castLedger: Array<{ character_name: string; current_location: string; psychological_status: string }>;
  engineLogic: string;
}

interface EngineState {
  activeBlueprint: ScenarioBlueprint | null;
  gameState: LogicState | null;
  engineMessages: Message[]; // Used for UI display
  engineTextBuffer: Message[]; // The sliding window specifically for the Engine
  maxBufferTurns: number;
  engineWorldStateSummary: string;
  currentVector: 'SOMATIC' | 'COGNITIVE' | 'COSMIC' | 'SOCIO_MORAL';
  currentTier: 'GATEWAY' | 'LATENT' | 'MANIFEST' | 'TERMINAL';
  currentTensionLevel: 'buildup' | 'visceral_climax' | 'aftermath';
  telemetry: TelemetryMetrics | null;
  turnCount: number;
  incrementTurn: () => void;
  shiftMatrixCoordinates: (vector: HorrorVector, tier: ExposureTier) => void;
  updateTension: (tension: 'buildup' | 'visceral_climax' | 'aftermath') => void;
  updateTelemetry: (metrics: TelemetryMetrics) => void;
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
  enduringTrauma: string[];
  executeActBreak: (trauma: string[], cinematicSummary: string) => void;
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
      currentVector: 'COGNITIVE',
      currentTier: 'LATENT',
      currentTensionLevel: 'buildup',
      telemetry: null,
      turnCount: 1,
      enduringTrauma: [],
      executeActBreak: (trauma, cinematicSummary) => set((state) => {
        const messages = state.engineMessages || [];
        const preservedStart = messages.length > 0 ? [messages[0]] : [];
        const preservedEnd = messages.length > 2 ? messages.slice(-2) : messages;

        const actBreakMessage: Message = {
          role: 'system_cinematic',
          content: cinematicSummary,
          timestamp: Date.now()
        };

        return {
          enduringTrauma: [...state.enduringTrauma, ...trauma],
          engineMessages: [...preservedStart, actBreakMessage, ...preservedEnd],
          engineTextBuffer: [...preservedEnd]
        };
      }),
      incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
      shiftMatrixCoordinates: (vector, tier) => set((state) => ({
        ...state,
        currentVector: vector,
        currentTier: tier
      })),
      updateTension: (tension) => set((state) => ({
        ...state,
        currentTensionLevel: tension
      })),
      updateTelemetry: (metrics) => set({ telemetry: metrics }),
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
          current_tension_level: 'buildup',
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
        ...state,
        activeBlueprint: null,
        gameState: null,
        engineTextBuffer: [],
        engineMessages: [],
        logicState: undefined,
        engineWorldStateSummary: "The subject is contained. Initial parameters active.",
      }))
    }),
    {
      name: 'the-engine-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
