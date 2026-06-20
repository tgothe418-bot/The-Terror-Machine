import { EngineEvent, Phase, DecayState } from './events';
import { Message } from '../../types';

export interface EngineState {
  sessionId?: string;
  blueprintId?: string;
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
  motifLedger: Record<string, number>;
  pacingLedger: {
    failedEscapeAttempts: number;
    memoryAnchorsRemaining: number;
    spatialContradictions: number;
  };
  timelineRevision: number;
  lastDistilledRevision: number;
  history: Message[];
}

export const initialEngineState: EngineState = {
  sessionId: "",
  blueprintId: "",
  phase: 'HUB',
  currentNodeId: null,
  decay: { stage: 'STABLE', coherence: 1.0 },
  turnCount: 0,
  traumaLedger: [],
  activeMemory: {
    systemFlags: [],
    somaState: [],
    geomState: []
  },
  motifLedger: {},
  pacingLedger: {
    failedEscapeAttempts: 0,
    memoryAnchorsRemaining: 3,
    spatialContradictions: 0
  },
  timelineRevision: 0,
  lastDistilledRevision: -1,
  history: []
};

export function engineReducer(state: EngineState, event: EngineEvent): EngineState {
  switch (event.type) {
    case 'USER_ACTION':
      return {
        ...state,
        history: [
          ...(state.history || []),
          { 
            id: crypto.randomUUID(), 
            role: 'user', 
            content: event.payload as string, 
            timestamp: Date.now() 
          }
        ]
      };

    case 'SYSTEM_MESSAGE':
      return {
        ...state,
        history: [
          ...(state.history || []),
          {
            id: crypto.randomUUID(),
            role: 'system',
            content: event.payload,
            timestamp: Date.now()
          }
        ]
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        history: [
          ...(state.history || []),
          {
            ...event.message,
            id: event.message.id || crypto.randomUUID(),
            timestamp: event.message.timestamp || Date.now()
          }
        ]
      };

    case 'TURN_RESOLVED': {
      const newTags = event.payload.semanticTags;
      
      const isTerminal = newTags?.SYS?.includes('SOMATIC_TERMINAL') || newTags?.SYS?.includes('COGNITIVE_COLLAPSE');

      const newMotifLedger = { ...state.motifLedger };
      const allTags = [
        ...(newTags?.SYS || []),
        ...(newTags?.SOMA || []),
        ...(newTags?.GEOM || [])
      ];
      allTags.forEach((tag: string) => {
        newMotifLedger[tag] = (newMotifLedger[tag] || 0) + 1;
      });
      const suggestedTension = event.payload?.logic_state?.suggested_tension;
      if (suggestedTension) {
        const tensionTag = `TENSION_${String(suggestedTension).toUpperCase()}`;
        newMotifLedger[tensionTag] = (newMotifLedger[tensionTag] || 0) + 1;
      }

      let memoryAnchors = state.pacingLedger?.memoryAnchorsRemaining ?? 3;
      let escapeAttempts = state.pacingLedger?.failedEscapeAttempts ?? 0;
      let contradictions = state.pacingLedger?.spatialContradictions ?? 0;

      if (newTags?.SYS?.includes('MEMORY_DECAY') || newTags?.SOMA?.includes('AMNESIA')) {
        memoryAnchors = Math.max(0, memoryAnchors - 1);
      }
      if (newTags?.SYS?.includes('ESCAPE_FAILED')) {
        escapeAttempts += 1;
      }
      if (newTags?.GEOM?.includes('CONTRADICTION')) {
        contradictions += 1;
      }

      let calculatedPhase = state.phase;
      
      // Pure mathematical deterministic phase shift
      if (state.turnCount >= 18 || state.traumaLedger.length >= 5) {
        calculatedPhase = 'TERMINAL';
      } else if (state.turnCount >= 8 || state.traumaLedger.length >= 2) {
        calculatedPhase = 'MANIFEST';
      } else if (state.phase === 'HUB' || state.phase === 'FORGE' || state.phase === 'VOICE') {
        // preserve non-runtime phases
      } else {
        calculatedPhase = 'LATENT';
      }

      if (isTerminal) calculatedPhase = 'TERMINATED';

      const narrativeBlocks = event.payload.narrative_blocks;
      const formatBlocks = (blocks?: Record<string, unknown>[]): string => {
        if (!blocks || !Array.isArray(blocks)) return '';
        return blocks.map(block => {
          if ((block.type === 'dialogue' || block.type === 'internal_monologue') && block.speaker) {
            return `${String(block.speaker).toUpperCase()}: ${String(block.content)}`;
          }
          return String(block.content || '');
        }).join('\n\n');
      };

      const hasHiddenBlocks = Array.isArray(narrativeBlocks) && narrativeBlocks.some((b: Record<string, unknown>) => b.visibleToModel === false);

      return {
        ...state,
        history: [
          ...(state.history || []),
          { 
            id: crypto.randomUUID(), 
            role: 'engine', 
            content: formatBlocks(narrativeBlocks), 
            blocks: narrativeBlocks,
            engine_thoughts: event.payload.engine_thoughts,
            timestamp: Date.now(),
            visibleToModel: hasHiddenBlocks ? false : true
          }
        ],
        activeMemory: {
          ...state.activeMemory,
          systemFlags: newTags?.SYS || [],
          somaState: newTags?.SOMA || [],
          geomState: newTags?.GEOM || []
        },
        motifLedger: newMotifLedger,
        pacingLedger: {
          failedEscapeAttempts: escapeAttempts,
          memoryAnchorsRemaining: memoryAnchors,
          spatialContradictions: contradictions
        },
        timelineRevision: state.timelineRevision + 1,
        phase: calculatedPhase
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

    case 'ACT_DISTILLED': {
      if (event.sessionId !== state.sessionId) {
        // Silently discard memory leak from previous session
        return state;
      }

      if (event.dispatchedAtRevision < state.lastDistilledRevision) {
        // Reject stale memory summary to prevent timeline corruption
        return state;
      }

      const messages = state.history || [];
      const preservedStart = messages.length > 0 ? [messages[0]] : [];
      const preservedEnd = messages.length > 2 ? messages.slice(-2) : messages;

      const actBreakMessage: Message = {
        id: crypto.randomUUID(),
        role: 'system_cinematic',
        content: event.summary,
        timestamp: Date.now()
      };

      return {
        ...state,
        lastDistilledRevision: event.dispatchedAtRevision,
        traumaLedger: [...state.traumaLedger, ...event.trauma],
        history: [...preservedStart, actBreakMessage, ...preservedEnd]
      };
    }

    // Default catch for unhandled events
    default:
      return state;
  }
}
