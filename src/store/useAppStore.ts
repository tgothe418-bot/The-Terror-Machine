import { create } from 'zustand';
import { RatifiedEngineFrame, NarrativeBlock } from '../types';

interface AppState {
  isGenerating: boolean;
  currentPhase: string;
  tensionLevel: number;
  storyLog: NarrativeBlock[];
  processRatifiedFrame: (frame: RatifiedEngineFrame) => void;
  setGenerating: (status: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isGenerating: false,
  currentPhase: "INIT",
  tensionLevel: 0,
  storyLog: [],

  setGenerating: (status) => set({ isGenerating: status }),

  processRatifiedFrame: (frame) => set((state) => ({
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
