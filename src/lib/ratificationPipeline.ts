/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  RatifiedEngineFrame,
  DecayThreshold,
  DecayState,
  PlayerRole,
  RuntimeStateSnapshot,
  TurnResponseSchema,
  NarrativeBlock,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { calculatePhysicsState } from '../core/matrix/physicsMatrix';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';
import { readTurnResponse, createNetworkTurnError, TurnResponseError } from './turnResponseReader';
export { TurnResponseError };
import { captureRuntimeSnapshot } from '../core/engine/snapshot';

export const DECAY_SCALE: DecayThreshold[] = [
  {
    stage: 'STABLE',
    maxSkepticism: 1.0,
    minSkepticism: 0.61,
    environmentalCoherence: 1.0,
    narrativeDivergence: 'NONE',
  },
  {
    stage: 'FRAYING',
    maxSkepticism: 0.6,
    minSkepticism: 0.31,
    environmentalCoherence: 0.7,
    narrativeDivergence: 'LATENT_AMBIGUITY',
  },
  {
    stage: 'UNSTABLE',
    maxSkepticism: 0.3,
    minSkepticism: 0.01,
    environmentalCoherence: 0.3,
    narrativeDivergence: 'STRUCTURAL_DISTORTION',
  },
  {
    stage: 'SHATTERED',
    maxSkepticism: 0.0,
    minSkepticism: 0.0,
    environmentalCoherence: 0.0,
    narrativeDivergence: 'TOPOLOGICAL_PARADOX',
  },
];

const FORBIDDEN_RESCUE_PHRASES = [
  /you are safe/gi,
  /grounded in the present/gi,
  /the simulation has ended/gi,
  /real physical room/gi,
  /just a dream/gi,
  /safe and waiting to wake/gi,
];

export function applyAntiRescueLinter(rawProse: string): string {
  let sanitizedProse = rawProse;
  let safetyTripped = false;
  FORBIDDEN_RESCUE_PHRASES.forEach((pattern) => {
    if (pattern.test(sanitizedProse)) {
      safetyTripped = true;
      sanitizedProse = sanitizedProse.replace(
        pattern,
        '[ COGNITIVE REJECTION: SAFETY PROTOCOL DENIED ]'
      );
    }
  });
  if (safetyTripped) {
    console.warn('[RATIFICATION] Anti-Rescue Linter tripped. Scrubbing safety language.');
    sanitizedProse += '\n\n[SYS: SAFETY_OVERRIDE_FAILED]';
  }
  return sanitizedProse;
}

export const calculateDecayState = (skepticism: number): DecayState => {
  // Normalize boundaries
  const normalizedSkepticism = Math.max(0.0, Math.min(1.0, skepticism));
  const threshold =
    DECAY_SCALE.find(
      (t) => normalizedSkepticism >= t.minSkepticism && normalizedSkepticism <= t.maxSkepticism
    ) || DECAY_SCALE[0];

  return {
    currentStage: threshold.stage,
    coherenceRating: threshold.environmentalCoherence,
    divergenceMode: threshold.narrativeDivergence,
  };
};

export const validateEngineFrame = (rawPayload: any): RatifiedEngineFrame => {
  const rejected: string[] = [];
  const notes: string[] = [];

  // 1. Structural Check
  if (!rawPayload || typeof rawPayload !== 'object') {
    return createFailedFrame('CRITICAL_ERROR', 'Payload is completely malformed or undefined.');
  }

  // 2. Extract and Normalize
  const blocks = (
    Array.isArray(rawPayload.narrative_blocks) ? rawPayload.narrative_blocks : []
  ).map((b: any) => {
    let content = b.content;
    if (b.type === 'prose' || b.type === 'dialogue' || b.type === 'internal_monologue') {
      content = applyAntiRescueLinter(content || '');
    }

    if (b.type === 'dialogue' && b.speaker) {
      const spk = String(b.speaker).toUpperCase().trim();
      if (spk === 'THE VOICE' || spk === 'VOICE') {
        return { ...b, content, speaker: 'SYSTEM ANOMALY' };
      }
    }
    return { ...b, content };
  });
  const logic = rawPayload.logic_state || {};
  const thoughts = rawPayload.engine_thoughts || rawPayload.engine_logic || '';

  // 3. Validation Logic
  if (blocks.length === 0) {
    rejected.push('narrative_blocks');
    notes.push('Warning: Engine returned zero narrative blocks.');
  }

  const accepted = rejected.length === 0;

  const matrixMutation =
    logic.matrix_mutation ||
    (logic.matrix_shift
      ? {
          next_vector: logic.matrix_shift.next_vector,
          next_tier: logic.matrix_shift.next_tier,
        }
      : null);

  return {
    narrative_blocks: blocks,
    engine_thoughts: String(thoughts),
    logic_state: {
      current_phase: logic.current_phase || 'LATENT',
      requested_transition: logic.requested_transition || null,
      suggested_tension: logic.suggested_tension,
      matrix_mutation: matrixMutation,
      terminal_flags: Array.isArray(logic.terminal_flags) ? logic.terminal_flags : [],
      cast_ledger: Array.isArray(logic.cast_ledger) ? logic.cast_ledger : [],
      cast_deltas: Array.isArray(logic.cast_deltas) ? logic.cast_deltas : [],
    },
    topologyDelta: rawPayload.topologyDelta || null,
    validation: {
      accepted,
      rejected_fields: rejected,
      repair_notes: notes,
    },
  };
};

const createFailedFrame = (errorType: string, note: string): RatifiedEngineFrame => ({
  narrative_blocks: [
    { type: 'system_voice', content: '[ SYSTEM FAILURE: UNABLE TO RENDER REALITY CONSTRUCT ]' },
  ],
  engine_thoughts: 'FATAL PARSE ERROR.',
  logic_state: {
    current_phase: 'LATENT',
    terminal_flags: [],
    cast_ledger: [],
    cast_deltas: [],
  },
  topologyDelta: { isExpansion: false },
  validation: { accepted: false, rejected_fields: [errorType], repair_notes: [note] },
});

export function formatRecentHistory(blocks: NarrativeBlock[]): string {
  return blocks
    .slice(-6)
    .map((block) => {
      const type = (block.type || 'PROSE').toUpperCase();
      const speaker =
        block.type === 'dialogue' && block.speaker
          ? ` | ${block.speaker}`
          : '';
      return `[${type}${speaker}]: ${(block.content || '').substring(0, 60)}...`;
    })
    .join('\n');
}

export const executeRatificationPipeline = async (
  userAction: string,
  suppliedSnapshot?: RuntimeStateSnapshot
): Promise<RatifiedEngineFrame> => {
  const state = useAppStore.getState();
  const engineState = useEngineStore.getState();

  // Exactly one pre-turn snapshot: use suppliedSnapshot if provided, otherwise fallback-capture for internal/SYSTEM_INIT
  const preSnapshot = suppliedSnapshot || captureRuntimeSnapshot(state);

  const currentTension = preSnapshot.tension;
  const currentCoherence = preSnapshot.coherence;
  const physicsMatrix = calculatePhysicsState(currentTension, currentCoherence);

  const selectedRole = (engineState.gameState?.player_role as PlayerRole) || 'protagonist';

  const turnContext = buildEngineTurnContext({
    blueprint: engineState.activeBlueprint,
    selectedRole,
    spatialGraph: state.spatialGraph,
    participationContext: state.participationContext || engineState.participationContext || null,
    characterContinuity: engineState.gameState?.character_continuity,
    characterPresence: engineState.gameState?.character_presence,
    consequenceState: {
      inventory: engineState.gameState?.inventory,
      player_injuries: engineState.gameState?.player_injuries,
      psychological_status: engineState.gameState?.psychological_status,
    },
    characterStance: engineState.gameState?.character_stance,
    runtimeState: preSnapshot,
  });

  // Distill the history to a compressed array instead of full prose
  const recentHistory = formatRecentHistory(state.storyLog || []);

  const currentNode = state.spatialGraph?.find((n: any) => n.id === preSnapshot.currentNodeId);
  let matchingExitDirection: string | null = null;

  if (currentNode && (currentNode as any).exits) {
    const exits = (currentNode as any).exits;
    const attemptedExit = exits.find(
      (exit: any) =>
        exit.description && userAction.toLowerCase().includes(exit.description.toLowerCase())
    );

    if (
      attemptedExit &&
      (attemptedExit.targetNodeId === 'NODE_UNMAPPED' ||
        attemptedExit.targetNodeId.startsWith('unmaterialized_'))
    ) {
      matchingExitDirection = attemptedExit.description;
    }
  }

  // SYSTEM_INIT is strictly non-expanding
  const isExpansionExpected = userAction !== 'SYSTEM_INIT' && !!matchingExitDirection;

  const payload = {
    userAction,
    recentHistory,
    systemDirective: physicsMatrix.generativeDirective,
    isExpansionExpected,
    stateContext: {
      currentNodeId: preSnapshot.currentNodeId,
      currentPhase: preSnapshot.phase,
      tensionLevel: currentTension,
      reconciliationRevision: preSnapshot.reconciliationRevision,
      activeVector: preSnapshot.activeVector,
      activeTier: preSnapshot.activeTier,
    },
    context: turnContext,
  };

  let response: Response;
  try {
    response = await fetch('/api/turn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw createNetworkTurnError();
  }

  const rawJson = await readTurnResponse<unknown>(response);

  // Parse with canonical TurnResponseSchema
  const parsedResult = TurnResponseSchema.safeParse(rawJson);
  if (!parsedResult.success) {
    throw new TurnResponseError({
      code: 'STRUCTURAL_RESPONSE_MISMATCH',
      status: response.status,
      contentType: response.headers?.get?.('content-type') || null,
      message: 'The turn service returned a response that did not match the canonical contract.',
    });
  }

  const validatedEvent = validateEngineFrame(parsedResult.data);
  if (validatedEvent.validation && !validatedEvent.validation.accepted) {
    throw new TurnResponseError({
      code: 'FRAME_VALIDATION_REJECTED',
      status: response.status,
      contentType: response.headers?.get?.('content-type') || null,
      message: 'The turn response failed ratification validation.',
    });
  }

  validatedEvent.preSnapshot = preSnapshot;

  if (parsedResult.data.transitionReceipt) {
    validatedEvent.transitionReceipt = parsedResult.data.transitionReceipt;
  }

  if (parsedResult.data.castInteractionReceipt) {
    validatedEvent.castInteractionReceipt = parsedResult.data.castInteractionReceipt;
  }

  validatedEvent.intentReceipt = parsedResult.data.intentReceipt;
  validatedEvent.narrativeReconciliationReceipt =
    parsedResult.data.narrativeReconciliationReceipt;
  validatedEvent.canonicalConsequenceReceipt =
    parsedResult.data.canonicalConsequenceReceipt;
  validatedEvent.characterStanceReceipt =
    parsedResult.data.characterStanceReceipt;

  // Attach context receipt for SYSTEM_INIT
  if (userAction === 'SYSTEM_INIT') {
    validatedEvent.contextReceipt = buildContextReceipt(turnContext, engineState.activeBlueprint);
  }

  // Expansion Guard:
  // If SYSTEM_INIT or no expansion was expected, suppress any rogue expansion
  if (userAction === 'SYSTEM_INIT' || !isExpansionExpected) {
    if (parsedResult.data.topologyDelta?.isExpansion) {
      validatedEvent.topologyDelta = { isExpansion: false, newNodeDef: null };
      if (!validatedEvent.validation) {
        validatedEvent.validation = { accepted: true, rejected_fields: [], repair_notes: [] };
      }
      validatedEvent.validation.repair_notes.push(
        '[GUARD] LLM emitted unexpected topology expansion; suppressed to maintain canonical graph.'
      );
    } else {
      validatedEvent.topologyDelta = parsedResult.data.topologyDelta || { isExpansion: false };
    }
  } else {
    validatedEvent.topologyDelta = parsedResult.data.topologyDelta
      ? {
          ...parsedResult.data.topologyDelta,
          exitDirection: matchingExitDirection,
        }
      : null;
  }

  return validatedEvent;
};
