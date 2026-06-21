import { create } from 'zustand';
import { AppPhase, SpatialNode, TelemetryState, TopologyEdge, CampaignManifest, CarryoverPacket, TemporalShiftReceipt, NarrativeVelocity, UITranscriptMessage, TurnSnapshot } from '../types';
import { calculateDecayState } from '../lib/ratificationPipeline';
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
  uiTranscript: UITranscriptMessage[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  enginePayload: any[];
  turnSnapshot: TurnSnapshot | null;
  setTurnSnapshot: (snapshot: TurnSnapshot | null) => void;

  requestActTransition: (targetActId: string) => void;
  commitActTransition: (newBlueprintId: string, packet: CarryoverPacket) => void;
  executeTemporalShift: (receipt: TemporalShiftReceipt) => void;
  loadCampaignManifest: (manifest: CampaignManifest) => void;

  setPhase: (phase: AppPhase) => void;
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
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeBlueprint(raw: any): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const protagonistId = raw.userCharacterId || raw.perspectives?.find((p: any) => p.role === "PROTAGONIST")?.subjectCharacterId || "char-ricky";
  
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
    return conn;
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

export const useAppStore = create<AppStore>((set) => ({
  ...initialEngineState,
  
  isTransitioning: false,
  activeCampaign: null,
  currentActId: null,
  suspendedActs: {},
  narrativeVelocity: "slow_burn",

  // --- PHASE V: MEMORY SCHISM ---
  uiTranscript: [],
  enginePayload: [],
  turnSnapshot: null,
  setTurnSnapshot: (snapshot: TurnSnapshot | null) => set({ turnSnapshot: snapshot }),

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  requestActTransition: (targetActId: string) => set({ isTransitioning: true }),

  commitActTransition: (newBlueprintId: string, packet: CarryoverPacket) => set((state) => ({
    history: [{ 
      id: crypto.randomUUID(), 
      timestamp: Date.now(),
      role: 'system_cinematic', 
      content: `ACT TRANSITION COMPLETE. Establish new environment. Scars permitted: ${packet.allowedScars.length}`,
      visibleToModel: true,
      visibleToTelemetry: true
    }],
    activeMemory: { ...state.activeMemory, systemFlags: [] },
    turnCount: 0,
    currentNodeId: "", // Reset to empty or entry node
    isTransitioning: false,
    currentActId: newBlueprintId
  })),

  executeTemporalShift: (receipt: TemporalShiftReceipt) => set((state) => ({
    history: [{ 
      id: crypto.randomUUID(), 
      timestamp: Date.now(),
      role: 'system_cinematic', 
      content: `TEMPORAL SHIFT: ${receipt.elapsedTime} has passed. Preserved facts: ${receipt.preservedFacts.join(', ')}. Changed: ${receipt.changedFacts.join(', ')}.`,
      visibleToModel: true,
      visibleToTelemetry: true
    }],
    turnCount: state.turnCount + 1
  })),

  loadCampaignManifest: (manifest: CampaignManifest) => set({
    activeCampaign: manifest,
    currentActId: manifest.initialActId
  }),

  // Legacy phase setter (still needed if UI expects AppPhase, but our reducer uses Phase)
  setPhase: (phase: AppPhase) => set({ phase: phase as 'HUB' | 'FORGE' | 'LATENT' | 'MANIFEST' | 'TERMINAL' | 'TERMINATED' | 'VOICE' | 'ENGINE' }),
  
  telemetry: null,
  setTelemetry: (telemetry) => set({ telemetry }),
  
  spatialGraph: [],
  setCurrentNodeId: (nodeId) => set(() => ({
    currentNodeId: nodeId
  })),
  
  isShattered: false,
  triggerShatter: () => set({ isShattered: true }),
  
  decayMetrics: {
    currentStage: 'STABLE',
    coherenceRating: 1.0,
    divergenceMode: 'NONE'
  },
  
  updateDecayMetrics: (skepticism) => {
    const nextMetrics = calculateDecayState(skepticism);
    
    set(() => {
      const isShatteredNow = nextMetrics.currentStage === 'SHATTERED';
      return {
        decayMetrics: nextMetrics,
        isShattered: isShatteredNow
      };
    });
  },
  
  compileTopology: (forgeTopology, startNodeId) => {
    // Compile the raw Forge topology into the clean runtime graph
    const nodesList = Array.isArray(forgeTopology?.nodes) ? forgeTopology.nodes : [];
    const connectionsList = Array.isArray(forgeTopology?.connections) ? forgeTopology.connections : [];
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const compiledGraph = nodesList.map((nodeName: any) => {
      // Find connections where this node is the source
      const connectedNodes = connectionsList
        .filter((e: TopologyEdge) => e && typeof e === 'object' && e.from === nodeName)
        .map((e: TopologyEdge) => e.to);

      return {
        id: nodeName,
        name: nodeName,
        description: "No description",
        connectedNodes
      };
    });

    set({ spatialGraph: compiledGraph, isShattered: false, currentNodeId: startNodeId || compiledGraph[0]?.id || "NODE_INIT" });
  },

  dispatch: (event: EngineEvent) => {
    set((state) => {
      // Isolate the EngineState properties
      const currentEngineState: EngineState = {
        phase: state.phase,
        currentNodeId: state.currentNodeId,
        decay: state.decay,
        turnCount: state.turnCount,
        traumaLedger: state.traumaLedger,
        activeMemory: state.activeMemory,
        motifLedger: state.motifLedger || {},
        pacingLedger: state.pacingLedger || {
          failedEscapeAttempts: 0,
          memoryAnchorsRemaining: 3,
          spatialContradictions: 0
        },
        timelineRevision: state.timelineRevision || 0,
        lastDistilledRevision: state.lastDistilledRevision === undefined ? -1 : state.lastDistilledRevision,
        history: state.history || [],
      };
      
      // Calculate the new state
      const nextEngineState = engineReducer(currentEngineState, event);
      
      // Merge the new state back into the Zustand store
      return { ...state, ...nextEngineState };
    });
  }
}));
