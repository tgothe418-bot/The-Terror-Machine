/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  AppPhase,
  SpatialNode,
  TelemetryState,
  CampaignManifest,
  CarryoverPacket,
  TemporalShiftReceipt,
  NarrativeVelocity,
  UITranscriptMessage,
  TurnSnapshot,
  PerspectiveShiftReceipt,
  Message,
  PlayerRole,
  NarrativeBlock,
  TopologyEdge,
  HorrorVector,
  ExposureTier,
  ParticipationContext,
} from '../types';
import { EngineEvent, CommittedTurnPayload, FailedTurnPayload } from '../core/engine/events';
import { engineReducer, initialEngineState, EngineState } from '../core/engine/reducer';
import { compileRuntimeTopology } from '../lib/compileRuntimeTopology';
import { normalizeBlueprint } from '../lib/normalizeBlueprint';
import { isHorrorVector, isExposureTier } from '../core/engine/snapshot';
import { idbStorage } from '../lib/idbStorage';
import { useEngineStore } from '../core/store';

export interface InitializeSessionParams {
  blueprint: unknown;
  sessionId?: string;
  participationContext?: ParticipationContext | null;
  spatialGraph?: SpatialNode[];
}

export interface AppStore extends EngineState {
  isTransitioning: boolean;
  activeCampaign: CampaignManifest | null;
  currentActId: string | null;
  suspendedActs: Record<string, any>;
  narrativeVelocity: NarrativeVelocity;

  // --- PHASE V: MEMORY SCHISM ---
  reconciliationRevision: number;
  uiTranscript: UITranscriptMessage[];
  enginePayload: (Message | PerspectiveShiftReceipt)[];
  turnSnapshot: TurnSnapshot | null;
  shiftPerspective: (newRole: PlayerRole) => void;
  setTurnSnapshot: (snapshot: TurnSnapshot | null) => void;

  editTranscriptMessage: (id: string, newContent: string) => void;
  forceAcceptCosmetic: (id: string) => void;
  requestActTransition: (targetActId: string) => void;
  commitActTransition: (newBlueprintId: string, packet: CarryoverPacket) => void;
  executeTemporalShift: (receipt: TemporalShiftReceipt) => void;
  loadCampaignManifest: (manifest: CampaignManifest) => void;

  initializeSession: (params: InitializeSessionParams) => void;

  setPhase: (phase: AppPhase | string) => void;
  telemetry: TelemetryState | null;
  setTelemetry: (telemetry: TelemetryState) => void;
  spatialGraph: SpatialNode[];
  isShattered: boolean;
  decayMetrics: {
    currentStage: string;
    coherenceRating: number;
    divergenceMode: string;
  };
  updateDecayMetrics: (skepticism: number) => void;
  compileTopology: (forgeTopology: any, startNodeId: string) => void;
  triggerShatter: () => void;
  setCurrentNodeId: (nodeId: string) => void;
  dispatch: (event: EngineEvent) => void;
  commitTurnResult: (payload: CommittedTurnPayload) => void;
  failTurnResult: (payload: FailedTurnPayload) => void;
  retakeLastTurn: () => boolean;
  resetSession: () => void;

  isGenerating: boolean;
  currentPhase: string;
  tensionLevel: number;
  storyLog: NarrativeBlock[];
  setGenerating: (status: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialEngineState,
      isTransitioning: false,
      activeCampaign: null,
      currentActId: null,
      suspendedActs: {},
      narrativeVelocity: 'slow_burn' as NarrativeVelocity,

      reconciliationRevision: 0,
      uiTranscript: [],
      enginePayload: [],
      turnSnapshot: null,
      shiftPerspective: () => {},
      setTurnSnapshot: (snapshot: TurnSnapshot | null) => set({ turnSnapshot: snapshot }),

      editTranscriptMessage: () => {},
      forceAcceptCosmetic: () => {},
      requestActTransition: () => {},
      commitActTransition: () => {},
      executeTemporalShift: () => {},
      loadCampaignManifest: (manifest: CampaignManifest) => set({ activeCampaign: manifest }),

      initializeSession: ({ blueprint, sessionId, participationContext, spatialGraph }) => {
        const normalized = normalizeBlueprint(blueprint);
        const compiled = compileRuntimeTopology({
          topology: normalized.topology,
          fallbackSetting: normalized.setting,
        });

        const initialVector: HorrorVector = isHorrorVector(normalized.startingVector)
          ? normalized.startingVector
          : 'COGNITIVE';
        const initialTier: ExposureTier = isExposureTier(normalized.startingTier)
          ? normalized.startingTier
          : 'LATENT';
        const effectiveGraph =
          spatialGraph && spatialGraph.length > 0 ? spatialGraph : compiled.spatialGraph;
        const startNodeId =
          spatialGraph && spatialGraph[0]?.id ? spatialGraph[0].id : compiled.startNodeId || 'ORIGIN';
        const newSessionId = sessionId || crypto.randomUUID();

        set({
          sessionId: newSessionId,
          blueprintId: normalized.id || 'unknown',
          participationContext: participationContext || null,
          phase: 'LATENT',
          currentPhase: 'LATENT',
          escalation_state: 'LATENT',
          currentNodeId: startNodeId,
          activeVector: initialVector,
          activeTier: initialTier,
          decay: { stage: 'STABLE', coherence: 1.0 },
          decayMetrics: {
            currentStage: 'STABLE',
            coherenceRating: 1.0,
            divergenceMode: 'NONE',
          },
          tensionLevel: 0,
          turnCount: 0,
          roomsGenerated: 0,
          traumaLedger: [],
          activeMemory: {
            systemFlags: [],
            somaState: [],
            geomState: [],
          },
          motifLedger: {},
          pacingLedger: {
            failedEscapeAttempts: 0,
            memoryAnchorsRemaining: 3,
            spatialContradictions: 0,
          },
          timelineRevision: 0,
          lastDistilledRevision: -1,
          reconciliationRevision: 0,
          history: [],
          storyLog: [],
          spatialGraph: effectiveGraph,
          isTransitioning: false,
          isShattered: false,
          uiTranscript: [],
          enginePayload: [],
          turnSnapshot: null,
          isGenerating: false,
          lastTurnCheckpoint: null,
        });
      },

      setPhase: (phase: AppPhase | string) => set({ phase: phase as any }),
      telemetry: null,
      setTelemetry: (telemetry: TelemetryState) => set({ telemetry }),
      spatialGraph: [],
      isShattered: false,
      decayMetrics: {
        currentStage: 'STABLE',
        coherenceRating: 1.0,
        divergenceMode: 'NONE',
      },
      updateDecayMetrics: () => {},
      compileTopology: (
        forgeTopology?: { nodes?: string[]; connections?: TopologyEdge[] },
        startNodeId?: string
      ) =>
        set((state) => {
          const compiled = compileRuntimeTopology({ topology: forgeTopology });
          return {
            spatialGraph: compiled.spatialGraph,
            currentNodeId: startNodeId || compiled.startNodeId || state.currentNodeId,
          };
        }),
      triggerShatter: () => set({ isShattered: true }),
      setCurrentNodeId: (nodeId: string) => set({ currentNodeId: nodeId }),
      dispatch: (event: EngineEvent) => set((state) => engineReducer(state, event)),
      commitTurnResult: (payload: CommittedTurnPayload) =>
        set((state) => engineReducer(state, { type: 'TURN_COMMITTED', payload })),
      failTurnResult: (payload: FailedTurnPayload) =>
        set((state) => engineReducer(state, { type: 'TURN_FAILED', payload })),
      retakeLastTurn: () => {
        const currentEngineState = get();
        const checkpoint = currentEngineState.lastTurnCheckpoint;
        if (!checkpoint) return false;

        // Validate checkpoint matches current session and blueprint before restoring
        const isCompatible =
          checkpoint.version === 1 &&
          checkpoint.engineStateBefore &&
          typeof checkpoint.engineStateBefore === 'object' &&
          (!checkpoint.engineStateBefore.sessionId ||
            checkpoint.engineStateBefore.sessionId === currentEngineState.sessionId) &&
          (!checkpoint.engineStateBefore.blueprintId ||
            checkpoint.engineStateBefore.blueprintId === currentEngineState.blueprintId);

        if (!isCompatible) {
          // Clear invalid cross-session checkpoint deterministically
          set({ lastTurnCheckpoint: null });
          return false;
        }

        const previousGameState = checkpoint.engineGameStateBefore;
        if (previousGameState !== undefined) {
          useEngineStore.getState().setGameState(previousGameState);
        }

        get().dispatch({ type: 'TURN_RETAKEN' });
        return true;
      },
      resetSession: () =>
        set({
          ...initialEngineState,
          isTransitioning: false,
          activeCampaign: null,
          currentActId: null,
          suspendedActs: {},
          narrativeVelocity: 'slow_burn' as NarrativeVelocity,
          reconciliationRevision: 0,
          uiTranscript: [],
          enginePayload: [],
          turnSnapshot: null,
          telemetry: null,
          spatialGraph: [],
          isShattered: false,
          decayMetrics: {
            currentStage: 'STABLE',
            coherenceRating: 1.0,
            divergenceMode: 'NONE',
          },
          isGenerating: false,
          currentPhase: 'INIT',
          tensionLevel: 0,
          storyLog: [],
          lastTurnCheckpoint: null,
        }),

      isGenerating: false,
      currentPhase: 'INIT',
      tensionLevel: 0,
      storyLog: [],

      setGenerating: (status: boolean) => set({ isGenerating: status }),
    }),
    {
      name: 'the-runtime-session-memory',
      storage: createJSONStorage(() => idbStorage),
      version: 1,
      migrate: (persistedState: any) => {
        if (!persistedState || typeof persistedState !== 'object') {
          return {} as AppStore;
        }
        return persistedState as AppStore;
      },
      partialize: (state) => ({
        sessionId: state.sessionId,
        blueprintId: state.blueprintId,
        participationContext: state.participationContext,
        phase: state.phase,
        currentPhase: state.currentPhase,
        escalation_state: state.escalation_state,
        currentNodeId: state.currentNodeId,
        spatialGraph: state.spatialGraph,
        activeVector: state.activeVector,
        activeTier: state.activeTier,
        decay: state.decay,
        decayMetrics: state.decayMetrics,
        isShattered: state.isShattered,
        tensionLevel: state.tensionLevel,
        turnCount: state.turnCount,
        roomsGenerated: state.roomsGenerated,
        maxRooms: state.maxRooms,
        aesthetic: state.aesthetic,
        activeEntities: state.activeEntities,
        traumaLedger: state.traumaLedger,
        activeMemory: state.activeMemory,
        motifLedger: state.motifLedger,
        pacingLedger: state.pacingLedger,
        timelineRevision: state.timelineRevision,
        lastDistilledRevision: state.lastDistilledRevision,
        reconciliationRevision: state.reconciliationRevision,
        history: state.history,
        storyLog: state.storyLog,
        uiTranscript: state.uiTranscript,
        enginePayload: state.enginePayload,
        turnSnapshot: state.turnSnapshot,
        lastTurnCheckpoint: state.lastTurnCheckpoint,
        telemetry: state.telemetry,
        activeCampaign: state.activeCampaign,
        currentActId: state.currentActId,
        suspendedActs: state.suspendedActs,
        narrativeVelocity: state.narrativeVelocity,
        nodeState: state.nodeState,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state) {
          return;
        }
        // Validate checkpoint on rehydration: clear unsafe or mismatched checkpoint
        if (state.lastTurnCheckpoint) {
          const cp = state.lastTurnCheckpoint;
          const isValidCheckpoint =
            cp.version === 1 &&
            typeof cp.commandText === 'string' &&
            cp.engineStateBefore &&
            typeof cp.engineStateBefore === 'object' &&
            (!cp.engineStateBefore.sessionId || cp.engineStateBefore.sessionId === state.sessionId) &&
            (!cp.engineStateBefore.blueprintId || cp.engineStateBefore.blueprintId === state.blueprintId);

          if (!isValidCheckpoint) {
            state.lastTurnCheckpoint = null;
          }
        }
      },
    }
  )
);
