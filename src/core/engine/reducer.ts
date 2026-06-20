import { EngineEvent, Phase, DecayState } from './events';

export interface EngineState {
  phase: Phase;
  currentNodeId: string | null;
  decay: DecayState;
  turnCount: number;
  traumaLedger: string[];
  activeMemory: {
    systemFlags: string[];
    somaState: string[];
    geomState: string[];
  };
}

export const initialEngineState: EngineState = {
  phase: 'HUB',
  currentNodeId: null,
  decay: { stage: 'STABLE', coherence: 1.0 },
  turnCount: 0,
  traumaLedger: [],
  activeMemory: {
    systemFlags: [],
    somaState: [],
    geomState: []
  }
};

export function engineReducer(state: EngineState, event: EngineEvent): EngineState {
  switch (event.type) {
    case 'TURN_RESOLVED': {
      const newTags = event.payload.semanticTags;
      
      const isTerminal = newTags?.SYS?.includes('SOMATIC_TERMINAL') || newTags?.SYS?.includes('COGNITIVE_COLLAPSE');

      return {
        ...state,
        activeMemory: {
          ...state.activeMemory,
          systemFlags: newTags?.SYS || [],
          somaState: newTags?.SOMA || [],
          geomState: newTags?.GEOM || []
        },
        phase: isTerminal ? 'TERMINAL' : state.phase
      };
    }

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
