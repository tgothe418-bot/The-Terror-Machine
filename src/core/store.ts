/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Blueprint, LogicState, Message, PlayerRole, PerspectiveMode } from '../types';
import { idbStorage } from '../lib/idbStorage';
import { distillContext } from '../services/geminiService';
import { useAppStore } from '../store/useAppStore';
import { normalizeBlueprint } from '../lib/normalizeBlueprint';
import { compileRuntimeTopology } from '../lib/compileRuntimeTopology';

import { HorrorVector, ExposureTier } from './matrix';

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
  setBlueprint: (blueprint: unknown, role: PlayerRole) => void;

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
      gameState: null,
      engineMessages: [],
      engineTextBuffer: [],
      maxBufferTurns: 12,
      engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
      currentVector: 'COGNITIVE',
      currentTier: 'LATENT',
      currentTensionLevel: 'buildup',
      telemetry: null,
      turnCount: 1,
      incrementTurn: () => set((state) => ({ turnCount: state.turnCount + 1 })),
      shiftMatrixCoordinates: (vector, tier) =>
        set((state) => ({
          ...state,
          currentVector: vector,
          currentTier: tier,
        })),
      updateTension: (tension) =>
        set((state) => ({
          ...state,
          currentTensionLevel: tension,
        })),
      updateTelemetry: (metrics) => set({ telemetry: metrics }),
      setBlueprint: (blueprint, role) => {
        // Normalize blueprint before saving
        const normalizedBlueprint = normalizeBlueprint(blueprint);
        const { playerRole, characterId, perspectiveMode } = resolvePerspectiveBinding(
          normalizedBlueprint,
          role
        );

        // Compile runtime topology
        const compiled = compileRuntimeTopology({
          topology: normalizedBlueprint.topology,
          fallbackSetting: normalizedBlueprint.setting,
        });
        const startNodeId = compiled.startNodeId;
        const initialVector = (normalizedBlueprint.startingVector || 'COGNITIVE') as
          | 'SOMATIC'
          | 'COGNITIVE'
          | 'COSMIC'
          | 'SOCIO_MORAL';
        const initialTier = (normalizedBlueprint.startingTier || 'LATENT') as
          | 'GATEWAY'
          | 'LATENT'
          | 'MANIFEST'
          | 'TERMINAL';

        // Hard reset useAppStore with compiled topology and start node
        useAppStore.setState({
          sessionId: crypto.randomUUID(),
          blueprintId: normalizedBlueprint.id || 'unknown',
          history: [],
          traumaLedger: [],
          motifLedger: {},
          pacingLedger: {
            failedEscapeAttempts: 0,
            memoryAnchorsRemaining: 3,
            spatialContradictions: 0,
          },
          timelineRevision: 0,
          lastDistilledRevision: -1,
          activeMemory: { systemFlags: [], somaState: [], geomState: [] },
          phase: 'LATENT',
          turnCount: 0,
          currentNodeId: startNodeId,
          spatialGraph: compiled.spatialGraph,
        });

        set({
          activeBlueprint: normalizedBlueprint,
          engineMessages: [],
          engineTextBuffer: [],
          engineWorldStateSummary: 'The subject is contained. Initial parameters active.',
          currentVector: initialVector,
          currentTier: initialTier,
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
