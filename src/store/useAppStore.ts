/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
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

  isGenerating: boolean;
  currentPhase: string;
  tensionLevel: number;
  storyLog: NarrativeBlock[];
  setGenerating: (status: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
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
    const effectiveGraph = spatialGraph && spatialGraph.length > 0 ? spatialGraph : compiled.spatialGraph;
    const startNodeId = spatialGraph && spatialGraph[0]?.id ? spatialGraph[0].id : compiled.startNodeId || 'ORIGIN';
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

  isGenerating: false,
  currentPhase: 'INIT',
  tensionLevel: 0,
  storyLog: [],

  setGenerating: (status: boolean) => set({ isGenerating: status }),
}));
