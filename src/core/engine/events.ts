import { Message, RatifiedEngineFrame, TransitionReceipt, TurnReceipt } from '../../types';

export type Phase =
  | 'HUB'
  | 'FORGE'
  | 'LATENT'
  | 'MANIFEST'
  | 'TERMINAL'
  | 'TERMINATED'
  | 'VOICE'
  | 'ENGINE';
export type DecayStage = 'STABLE' | 'FRAYING' | 'UNSTABLE' | 'SHATTERED';

export interface DecayState {
  stage: DecayStage;
  coherence: number;
}

export interface CommittedTurnPayload {
  commandText: string;
  formattedText: string;
  frame: RatifiedEngineFrame;
  transitionReceipt: TransitionReceipt;
  turnReceipt: TurnReceipt;
  timestamp?: number;
}

export interface FailedTurnPayload {
  commandText: string;
  errorCategory: 'INVALID_REQUEST' | 'MODEL_CONTRACT_MISMATCH' | 'PROVIDER_FAILURE' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  errorMessage: string;
  statusCode?: number;
  timestamp?: number;
}

// The definitive list of all legal engine events
export type EngineEvent =
  | { type: 'TURN_COMMITTED'; payload: CommittedTurnPayload }
  | { type: 'TURN_FAILED'; payload: FailedTurnPayload }
  | { type: 'SIMULATION_STARTED'; initialNodeId: string }
  | { type: 'USER_ACTION'; payload: string }
  | { type: 'SYSTEM_MESSAGE'; payload: string }
  | { type: 'ADD_MESSAGE'; message: Message }
  | { type: 'TURN_SUBMITTED'; turnId: string; text: string; timestamp: number }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | { type: 'TURN_RESOLVED'; payload: any }
  | { type: 'FRAME_RATIFIED'; turnId: string; frame: Record<string, unknown> | RatifiedEngineFrame } // We will type 'frame' to the Zod schema later
  | { type: 'PHASE_CHANGED'; from: Phase; to: Phase; timestamp: number }
  | { type: 'TOPOLOGY_COMPILED'; graph: Record<string, unknown>[] }
  | { type: 'TRANSITION_ACCEPTED'; fromNodeId: string; toNodeId: string }
  | { type: 'TRANSITION_REJECTED'; fromNodeId: string; attemptedNodeId: string; reason: string }
  | {
      type: 'ACT_DISTILLED';
      trauma: string[];
      summary: string;
      dispatchedAtRevision: number;
      sessionId: string;
    }
  | { type: 'DECAY_UPDATED'; newDecayState: DecayState };
