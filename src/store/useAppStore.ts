import { create } from 'zustand';
import { AppPhase, SpatialNode, TelemetryState, CampaignManifest, CarryoverPacket, TemporalShiftReceipt, NarrativeVelocity, UITranscriptMessage, TurnSnapshot, PerspectiveShiftReceipt, Message, PlayerRole, RatifiedEngineFrame, NarrativeBlock } from '../types';
import { EngineEvent } from '../core/engine/events';
import { engineReducer, initialEngineState, EngineState } from '../core/engine/reducer';

export interface AppStore extends EngineState {
  isTransitioning: boolean;
  activeCampaign: CampaignManifest | null;
  currentActId: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compileTopology: (forgeTopology: any, startNodeId: string) => void;
  triggerShatter: () => void;
  setCurrentNodeId: (nodeId: string) => void;
  dispatch: (event: EngineEvent) => void;

  isGenerating: boolean;
  currentPhase: string;
  tensionLevel: number;
  storyLog: NarrativeBlock[];
  processRatifiedFrame: (frame: RatifiedEngineFrame) => void;
  setGenerating: (status: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  ...initialEngineState,
  isTransitioning: false,
  activeCampaign: null,
  currentActId: null,
  suspendedActs: {},
  narrativeVelocity: "slow_burn" as NarrativeVelocity,
  
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setPhase: (phase: AppPhase | string) => set({ phase: phase as any }),
  telemetry: null,
  setTelemetry: (telemetry: TelemetryState) => set({ telemetry }),
  spatialGraph: [],
  isShattered: false,
  decayMetrics: {
    currentStage: 'STABLE',
    coherenceRating: 1.0,
    divergenceMode: 'NONE'
  },
  updateDecayMetrics: () => {},
  compileTopology: () => {},
  triggerShatter: () => set({ isShattered: true }),
  setCurrentNodeId: (nodeId: string) => set({ currentNodeId: nodeId }),
  dispatch: (event: EngineEvent) => set((state) => engineReducer(state, event)),

  isGenerating: false,
  currentPhase: "INIT",
  tensionLevel: 0,
  storyLog: [],

  setGenerating: (status: boolean) => set({ isGenerating: status }),

  processRatifiedFrame: (frame: RatifiedEngineFrame) => set((state) => ({
    // Append new narrative blocks to the continuous history
    storyLog: [...state.storyLog, ...frame.narrative_blocks],
    // Atomically sync the logic state
    currentPhase: frame.logic_state.current_phase,
    tensionLevel: frame.logic_state.suggested_tension,
    // Note: requested_transition and terminal_flags handling can be routed to telemetry
  }))
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeBlueprint(raw: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protagonistId = raw.userCharacterId || raw.perspectives?.find((p: any) => p.role === "PROTAGONIST")?.subjectCharacterId || undefined;
  
  const rawConnections = raw.topology?.connections || [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizedConnections = rawConnections.map((conn: any) => {
    if (typeof conn === 'string') {
      const parts = conn.split('->').map((s: string) => s.trim());
      return {
        from: parts[0] || "",
        to: parts[1] || "",
        kind: "physical",
        userInitiated: true,
        legacyUpgraded: true
      };
    }
    const safeConn = { ...conn };
    if (safeConn.kind === 'spatial' || !safeConn.kind || safeConn.kind === 'physical') {
      safeConn.kind = 'PHYSICAL';
    } else if (safeConn.kind === 'narrative' || safeConn.kind === 'forced_event') {
      safeConn.kind = 'FORCED_EVENT';
    } else {
      safeConn.kind = String(safeConn.kind).toUpperCase();
    }
    return safeConn;
  });

  return {
    ...raw,
    topology: {
      ...raw.topology,
      connections: normalizedConnections
    },
    identity: {
      ...raw.identity,
      title: raw.identity?.title || "Unknown"
    },
    title: raw.identity?.title || "Unknown",
    premise: raw.globalPremise || "",
    userCharacterId: protagonistId
  };
}
