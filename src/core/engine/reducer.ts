import { EngineEvent, Phase, DecayState } from './events';
import {
  Message,
  NarrativeBlock,
  TurnFailureReceipt,
  HorrorVector,
  ExposureTier,
  TurnReceipt,
  SpatialNode,
} from '../../types';
import { EntityArchetype } from '../../types/reference';
import { formatTurnFailureMessage } from '../../lib/turnResponseReader';
import {
  captureRuntimeSnapshot,
  isHorrorVector,
  isExposureTier,
} from './snapshot';
import { applyTopologyDeltaToGraph } from './topologyCommit';

export interface EngineState {
  sessionId?: string;
  blueprintId?: string;
  phase: Phase;
  escalation_state: 'LATENT' | 'REACTIVE' | 'TRANSGRESSIVE' | 'BLACKOUT';
  currentNodeId: string | null;
  spatialGraph?: SpatialNode[];
  activeVector: HorrorVector;
  activeTier: ExposureTier;
  decay: DecayState;
  turnCount: number;
  roomsGenerated: number;
  maxRooms?: number;
  aesthetic?: string;
  activeEntities?: EntityArchetype[];
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
  reconciliationRevision: number;
  history: Message[];
  storyLog?: NarrativeBlock[];
  currentPhase?: string;
  tensionLevel?: number;
  nodeState?: {
    dynamic_conditions?: Record<string, unknown>;
  };
}

export function applyReconciliationPatch(
  currentState: EngineState & Record<string, unknown>,
  patch: Record<string, unknown>
): EngineState & Record<string, unknown> {
  if (!patch) return currentState;

  const newState = { ...currentState };
  const validKeys = [
    'activeMemory',
    'pacingLedger',
    'traumaLedger',
    'motifLedger',
    'phase',
    'escalation_state',
    'turnCount',
    'currentNodeId',
    'activeVector',
    'activeTier',
    'reconciliationRevision',
    'decay',
    'castLedger',
    'systemFlags',
    'narrativeVelocity',
    'nodeState',
    'roomsGenerated',
    'maxRooms',
    'aesthetic',
    'activeEntities',
  ];

  const dynamicConditions: Record<string, unknown> = {
    ...currentState.nodeState?.dynamic_conditions,
  };

  for (const key in patch) {
    if (key === 'castLedger' && currentState.gameState) {
      if (!newState.gameState)
        newState.gameState = { ...(currentState.gameState as Record<string, unknown>) };
      (newState.gameState as Record<string, unknown>).cast_ledger = patch.castLedger;
    } else if (validKeys.includes(key)) {
      if (typeof patch[key] === 'object' && patch[key] !== null && !Array.isArray(patch[key])) {
        newState[key] = {
          ...(currentState[key] as Record<string, unknown>),
          ...(patch[key] as Record<string, unknown>),
        };
      } else {
        newState[key] = patch[key];
      }
    } else {
      // Unrecognized hallucinated flags go here
      dynamicConditions[key] = patch[key];
    }
  }

  if (Object.keys(dynamicConditions).length > 0) {
    newState.nodeState = {
      ...newState.nodeState,
      dynamic_conditions: dynamicConditions,
    };
  }

  return newState;
}

export const initialEngineState: EngineState = {
  sessionId: '',
  blueprintId: '',
  phase: 'HUB',
  escalation_state: 'LATENT',
  currentNodeId: null,
  spatialGraph: [],
  activeVector: 'COGNITIVE',
  activeTier: 'LATENT',
  decay: { stage: 'STABLE', coherence: 1.0 },
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
};

export function engineReducer(state: EngineState, event: EngineEvent): EngineState {
  switch (event.type) {
    case 'TURN_COMMITTED': {
      // 1. Consume required pre-turn snapshot directly from the payload
      const preSnapshot = event.payload.preSnapshot;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: event.payload.commandText,
        timestamp: event.payload.timestamp || Date.now(),
      };

      // 2. Pure topology delta application
      const topologyResult = applyTopologyDeltaToGraph({
        spatialGraph: state.spatialGraph,
        currentNodeId: state.currentNodeId,
        topologyDelta: event.payload.frame.topologyDelta,
        transitionReceipt: event.payload.transitionReceipt,
      });

      const nextNodeId = topologyResult.nextNodeId;
      const nextGraph = topologyResult.nextGraph;

      const newFlags = event.payload.frame.logic_state?.terminal_flags || [];
      const currentFlags = state.activeMemory?.systemFlags || [];
      const combinedFlags = Array.from(new Set([...currentFlags, ...newFlags]));

      // 3. Matrix coordinate mutation
      // A successful turn with a valid, complete matrix mutation may change both coordinates atomically.
      // A missing, partial, malformed, or unsupported mutation must preserve existing coordinates.
      let nextVector: HorrorVector = state.activeVector || 'COGNITIVE';
      let nextTier: ExposureTier = state.activeTier || 'LATENT';
      const mutation = event.payload.frame.logic_state?.matrix_mutation;
      if (mutation && typeof mutation === 'object') {
        const candidateVector = mutation.next_vector as HorrorVector;
        const candidateTier = mutation.next_tier as ExposureTier;
        if (
          candidateVector &&
          candidateTier &&
          isHorrorVector(candidateVector) &&
          isExposureTier(candidateTier)
        ) {
          nextVector = candidateVector;
          nextTier = candidateTier;
        }
      }

      // 4. Hallucination collision reconciliation revision
      const revisionIncrement =
        event.payload.frame.reconciliation?.revisionIncrement ??
        (event.payload.frame.logic_state?.intent_classification === 'HALLUCINATION_COLLISION'
          ? 1
          : 0);
      const nextReconciliationRevision = (state.reconciliationRevision || 0) + revisionIncrement;

      const nextPhase =
        event.payload.frame.logic_state?.current_phase || state.currentPhase || 'LATENT';
      const nextTension =
        typeof event.payload.frame.logic_state?.suggested_tension === 'number'
          ? event.payload.frame.logic_state.suggested_tension
          : state.tensionLevel ?? 0;

      const updatedTurnCount = state.turnCount + 1;
      const updatedStoryLog = [
        ...(state.storyLog || []),
        ...(event.payload.frame.narrative_blocks || []),
      ];

      // 5. Capture post-turn snapshot from the resulting committed state
      const postSnapshot = captureRuntimeSnapshot({
        ...state,
        turnCount: updatedTurnCount,
        currentNodeId: nextNodeId,
        activeVector: nextVector,
        activeTier: nextTier,
        phase: nextPhase,
        currentPhase: nextPhase,
        tensionLevel: nextTension,
        reconciliationRevision: nextReconciliationRevision,
        activeFlags: combinedFlags,
      });

      const committedTurnReceipt: TurnReceipt = {
        ...event.payload.turnReceipt,
        nodeAfter: nextNodeId,
        activeVector: nextVector,
        activeTier: nextTier,
        tension: nextTension,
        preSnapshot,
        postSnapshot,
      };

      const engineMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: event.payload.formattedText,
        timestamp: (event.payload.timestamp || Date.now()) + 1,
        blocks: event.payload.frame.narrative_blocks,
        engine_thoughts: event.payload.frame.engine_thoughts,
        logic_state: event.payload.frame.logic_state,
        topologyDelta: event.payload.frame.topologyDelta,
        validation: event.payload.frame.validation,
        contextReceipt: event.payload.frame.contextReceipt,
        transitionReceipt: event.payload.transitionReceipt,
        turnReceipt: committedTurnReceipt,
      };

      return {
        ...state,
        history: [...(state.history || []), userMsg, engineMsg],
        turnCount: updatedTurnCount,
        currentNodeId: nextNodeId,
        spatialGraph: nextGraph,
        activeVector: nextVector,
        activeTier: nextTier,
        reconciliationRevision: nextReconciliationRevision,
        storyLog: updatedStoryLog,
        currentPhase: nextPhase,
        tensionLevel: nextTension,
        activeMemory: {
          ...state.activeMemory,
          systemFlags: combinedFlags,
        },
      };
    }

    case 'TURN_FAILED': {
      const receipt: TurnFailureReceipt = event.payload.failureReceipt || {
        code: event.payload.errorCategory || 'UNKNOWN_ERROR',
        status: event.payload.statusCode ?? null,
        contentType: event.payload.contentType ?? null,
        message:
          event.payload.errorMessage ||
          'The turn service returned an unexpected response. The session state was not changed.',
      };

      const effectiveVector: HorrorVector = state.activeVector || 'COGNITIVE';
      const effectiveTier: ExposureTier = state.activeTier || 'LATENT';

      // Canonical pre- and post-turn snapshots are identical for failed turn
      const preSnapshot = event.payload.preSnapshot;
      const postSnapshot = preSnapshot;

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: event.payload.commandText,
        timestamp: event.payload.timestamp || Date.now(),
      };

      const statusSuffix = receipt.status != null ? ` (HTTP ${receipt.status})` : '';

      const failMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: formatTurnFailureMessage(receipt),
        timestamp: (event.payload.timestamp || Date.now()) + 1,
        failureReceipt: receipt,
        turnReceipt: {
          turnNumber: state.turnCount + 1,
          nodeBefore: state.currentNodeId,
          requestedTarget: null,
          accepted: false,
          reason: `FAILED: ${receipt.code}${statusSuffix} - ${receipt.message}`,
          nodeAfter: state.currentNodeId,
          activeVector: effectiveVector,
          activeTier: effectiveTier,
          tension: state.tensionLevel ?? 0,
          preSnapshot,
          postSnapshot,
        },
      };

      return {
        ...state,
        history: [...(state.history || []), userMsg, failMsg],
      };
    }

    case 'USER_ACTION':
      return {
        ...state,
        history: [
          ...(state.history || []),
          {
            id: crypto.randomUUID(),
            role: 'user',
            content: event.payload as string,
            timestamp: Date.now(),
          },
        ],
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
            timestamp: Date.now(),
          },
        ],
      };

    case 'ADD_MESSAGE':
      return {
        ...state,
        history: [
          ...(state.history || []),
          {
            ...event.message,
            id: event.message.id || crypto.randomUUID(),
            timestamp: event.message.timestamp || Date.now(),
          },
        ],
      };

    case 'TURN_RESOLVED': {
      const newTags = event.payload.semanticTags;

      const isTerminal =
        newTags?.SYS?.includes('SOMATIC_TERMINAL') || newTags?.SYS?.includes('COGNITIVE_COLLAPSE');

      const newMotifLedger = { ...state.motifLedger };
      const allTags = [...(newTags?.SYS || []), ...(newTags?.SOMA || []), ...(newTags?.GEOM || [])];
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

      const newEscalationState =
        event.payload.logic_state?.escalation_state || state.escalation_state || 'LATENT';

      const narrativeBlocks = event.payload.narrative_blocks;
      const formatBlocks = (blocks?: Record<string, unknown>[]): string => {
        if (!blocks || !Array.isArray(blocks)) return '';
        return blocks
          .map((block) => {
            if (
              (block.type === 'dialogue' || block.type === 'internal_monologue') &&
              block.speaker
            ) {
              return `${String(block.speaker).toUpperCase()}: ${String(block.content)}`;
            }
            return String(block.content || '');
          })
          .join('\n\n');
      };

      const hasHiddenBlocks =
        Array.isArray(narrativeBlocks) &&
        narrativeBlocks.some((b: Record<string, unknown>) => b.visibleToModel === false);

      let newRoomsGenerated = state.roomsGenerated;
      if (event.payload.logic_state?.matrix_mutation?.increment_rooms) {
        newRoomsGenerated = (newRoomsGenerated || 0) + 1;
      }

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
            visibleToModel: hasHiddenBlocks ? false : true,
          },
        ],
        activeMemory: {
          ...state.activeMemory,
          systemFlags: newTags?.SYS || [],
          somaState: newTags?.SOMA || [],
          geomState: newTags?.GEOM || [],
        },
        motifLedger: newMotifLedger,
        pacingLedger: {
          failedEscapeAttempts: escapeAttempts,
          memoryAnchorsRemaining: memoryAnchors,
          spatialContradictions: contradictions,
        },
        timelineRevision: state.timelineRevision + 1,
        phase: calculatedPhase,
        escalation_state: newEscalationState,
        roomsGenerated: newRoomsGenerated,
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
      // Compatibility-only: no-op, does not mutate turn state
      return state;

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
        timestamp: Date.now(),
      };

      return {
        ...state,
        lastDistilledRevision: event.dispatchedAtRevision,
        traumaLedger: [...state.traumaLedger, ...event.trauma],
        history: [...preservedStart, actBreakMessage, ...preservedEnd],
      };
    }

    // Default catch for unhandled events
    default:
      return state;
  }
}
