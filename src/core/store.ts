/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Blueprint, BlueprintSchema, LogicState, Message, PlayerRole, PerspectiveMode, ParticipationContext } from '../types';
import { idbStorage } from '../lib/idbStorage';
import { distillContext } from '../services/geminiService';
import { useAppStore } from '../store/useAppStore';
import { normalizeBlueprint } from '../lib/normalizeBlueprint';

// Add these model definitions to your store fields in src/core/store.ts
export interface TelemetryMetrics {
  tension: string;
  pacing: string;
  castLedger: Array<{
    character_name: string;
    current_location: string;
    psychological_status: string;
  }>;
  engineLogic: string;
}

interface EngineState {
  activeBlueprint: Blueprint | null;
  participationContext: ParticipationContext | null;
  gameState: LogicState | null;
  engineMessages: Message[]; // Used for UI display
  engineTextBuffer: Message[]; // The sliding window specifically for the Engine
  maxBufferTurns: number;
  engineWorldStateSummary: string;
  telemetry: TelemetryMetrics | null;
  updateTelemetry: (metrics: TelemetryMetrics) => void;
  setBlueprint: (
    blueprint: unknown,
    role: PlayerRole,
    participationContext?: ParticipationContext | null
  ) => void;

  clearBlueprint: () => void;
  updateGameState: (newState: LogicState) => void;
  patchGameState: (patch: Partial<LogicState>) => void;
  addEngineMessage: (message: Message) => void;
  setEngineMessages: (messages: Message[]) => void;
  ingestTurn: (turn: Message) => void;
  pruneContext: () => void;
  updateWorldStateSummary: (newSummary: string) => void;
  addEngineTurn: (turn: Message) => void;
  resetEngine: () => void;
}

export function resolvePerspectiveBinding(
  blueprint: Blueprint,
  role: PlayerRole
): { playerRole: PlayerRole; characterId: string | null; perspectiveMode: PerspectiveMode } {
  const normalizedRole = role.toUpperCase();
  const perspective = blueprint.perspectives?.find(
    (p: any) => String(p.role).toUpperCase() === normalizedRole
  );

  if (role === 'director' || role === 'witness') {
    return { playerRole: role, characterId: null, perspectiveMode: role };
  }

  if (perspective?.subjectCharacterId) {
    const isEntity = blueprint.cast?.find(
      (c: any) => c.id === perspective.subjectCharacterId
    )?.isEntity;
    return {
      playerRole: role,
      characterId: perspective.subjectCharacterId,
      perspectiveMode: isEntity ? 'entity_embodied' : 'embodied',
    };
  }

  if (role === 'antagonist') {
    const entity = blueprint.cast?.find((c: any) => c.isEntity === true);
    return {
      playerRole: role,
      characterId: entity?.id ?? null,
      perspectiveMode: 'entity_embodied',
    };
  }

  if (role === 'protagonist') {
    const mortal = blueprint.cast?.find((c: any) => c.isEntity !== true);
    return { playerRole: role, characterId: mortal?.id ?? null, perspectiveMode: 'embodied' };
  }

  return { playerRole: role, characterId: null, perspectiveMode: 'witness' };
}

export const useEngineStore = create<EngineState>()(
  persist(
    (set, get) => ({
      activeBlueprint: null,
      participationContext: null,
      gameState: null,
      engineMessages: [],
      engineTextBuffer: [],
      maxBufferTurns: 12,
      engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
      telemetry: null,
      updateTelemetry: (metrics) => set({ telemetry: metrics }),
      setBlueprint: (blueprint, role, participationContext = null) => {
        // If blueprint is already valid canonical Blueprint, preserve exact object reference; otherwise normalize
        const parsed = BlueprintSchema.safeParse(blueprint);
        const normalizedBlueprint = parsed.success ? (blueprint as Blueprint) : normalizeBlueprint(blueprint);
        const { playerRole, characterId, perspectiveMode } = resolvePerspectiveBinding(
          normalizedBlueprint,
          role
        );

        // Invoke the canonical AppStore session initialization action
        useAppStore.getState().initializeSession({
          blueprint: normalizedBlueprint,
          participationContext,
        });

        set({
          activeBlueprint: normalizedBlueprint,
          participationContext: participationContext || null,
          engineMessages: [],
          engineTextBuffer: [],
          engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
          gameState: {
            current_location: normalizedBlueprint.setting?.location || 'Unknown',
            player_injuries: [],
            inventory: [],
            psychological_status: 'Stable',
            player_role: playerRole,
            player_character_id: characterId,
            perspective_mode: perspectiveMode,
            current_tension_level: 'buildup',
            lore_and_memory: {
              established_facts: [],
              permanent_consequences: [],
            },
            npc_fixations: [],
          },
        });
      },
      clearBlueprint: () =>
        set({
          activeBlueprint: null,
          participationContext: null,
          gameState: null,
          engineMessages: [],
          engineTextBuffer: [],
          engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
        }),
      updateGameState: (newState) => set({ gameState: newState }),
      patchGameState: (patch) =>
        set((state) => {
          if (!state.gameState) return state;
          return {
            gameState: {
              ...state.gameState,
              ...patch,
              player_role: state.gameState.player_role,
              player_character_id: state.gameState.player_character_id,
              perspective_mode: state.gameState.perspective_mode,
              inventory: patch.inventory ?? state.gameState.inventory ?? [],
              player_injuries: patch.player_injuries ?? state.gameState.player_injuries ?? [],
              lore_and_memory: patch.lore_and_memory ?? state.gameState.lore_and_memory,
              npc_fixations: patch.npc_fixations ?? state.gameState.npc_fixations ?? [],
            },
          };
        }),
      addEngineMessage: (message) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const msg = {
            ...message,
            frozen_psychological_status: message.frozen_psychological_status || currentStatus,
          };
          return {
            engineMessages: [...state.engineMessages, msg],
          };
        });
        get().addEngineTurn(message);
      },
      setEngineMessages: (messages) =>
        set({ engineMessages: messages, engineTextBuffer: messages.slice(-get().maxBufferTurns) }),
      ingestTurn: (turn) => get().addEngineTurn(turn),
      addEngineTurn: (turn) => {
        set((state) => {
          const currentStatus = state.gameState?.psychological_status || 'Stable';
          const newBuffer = [
            ...state.engineTextBuffer,
            {
              ...turn,
              frozen_psychological_status: turn.frozen_psychological_status || currentStatus,
            },
          ];
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
        const flattenedTranscript = turnsToPrune
          .map((t) => (typeof t.content === 'string' ? t.content : JSON.stringify(t.content)))
          .join('\n');

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
      resetEngine: () =>
        set((state) => ({
          ...state,
          activeBlueprint: null,
          participationContext: null,
          gameState: null,
          engineTextBuffer: [],
          engineMessages: [],
          logicState: undefined,
          engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
        })),
    }),
    {
      name: 'the-engine-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
