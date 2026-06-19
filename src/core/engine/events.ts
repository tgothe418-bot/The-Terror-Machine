export type Phase = 'HUB' | 'FORGE' | 'LATENT' | 'MANIFEST' | 'TERMINAL' | 'TERMINATED';
export type DecayStage = 'STABLE' | 'FRAYING' | 'UNSTABLE' | 'SHATTERED';

export interface DecayState {
  stage: DecayStage;
  coherence: number;
}

// The definitive list of all legal engine events
export type EngineEvent =
  | { type: 'SIMULATION_STARTED'; initialNodeId: string }
  | { type: 'TURN_SUBMITTED'; turnId: string; text: string; timestamp: number }
  | { type: 'FRAME_RATIFIED'; turnId: string; frame: Record<string, unknown> } // We will type 'frame' to the Zod schema later
  | { type: 'PHASE_CHANGED'; from: Phase; to: Phase; timestamp: number }
  | { type: 'TOPOLOGY_COMPILED'; graph: Record<string, unknown>[] } 
  | { type: 'TRANSITION_ACCEPTED'; fromNodeId: string; toNodeId: string }
  | { type: 'TRANSITION_REJECTED'; fromNodeId: string; attemptedNodeId: string; reason: string }
  | { type: 'ACT_DISTILLED'; trauma: string[]; summary: string }
  | { type: 'DECAY_UPDATED'; newDecayState: DecayState };
