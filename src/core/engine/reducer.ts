import { EngineEvent, Phase, DecayState } from './events';

export interface EngineState {
  phase: Phase;
  currentNodeId: string | null;
  decay: DecayState;
  turnCount: number;
  traumaLedger: string[];
}

export const initialEngineState: EngineState = {
  phase: 'HUB',
  currentNodeId: null,
  decay: { stage: 'STABLE', coherence: 1.0 },
  turnCount: 0,
  traumaLedger: [],
};

export function engineReducer(state: EngineState, event: EngineEvent): EngineState {
  switch (event.type) {
    case 'SIMULATION_STARTED':
      return {
        ...state,
        phase: 'LATENT',
        currentNodeId: event.initialNodeId,
        turnCount: 0,
      };

    case 'TURN_SUBMITTED':
      return {
        ...state,
        turnCount: state.turnCount + 1,
      };

    case 'PHASE_CHANGED':
      return {
        ...state,
        phase: event.to,
      };

    case 'TRANSITION_ACCEPTED':
      return {
        ...state,
        currentNodeId: event.toNodeId,
      };

    case 'DECAY_UPDATED':
      return {
        ...state,
        decay: event.newDecayState,
      };

    case 'ACT_DISTILLED':
      return {
        ...state,
        traumaLedger: [...state.traumaLedger, ...event.trauma],
      };

    // Default catch for unhandled events
    default:
      return state;
  }
}
