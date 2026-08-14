/* eslint-disable @typescript-eslint/no-explicit-any */
import { RatifiedEngineFrame, DecayThreshold, DecayState, PlayerRole } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { calculatePhysicsState } from '../core/matrix/physicsMatrix';
import { reconcilePerception } from '../core/memory/reconciler';
import { buildEngineTurnContext, buildContextReceipt } from './buildEngineTurnContext';

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
  ).map((b) => {
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
    notes.push('Warning: Engine returned zero narrative blocks. Injecting fallback.');
    // Provide a safe fallback so the UI never crashes on an empty render
    blocks.push({
      type: 'system_voice',
      content: '[The simulation stalls. A cold silence fills the void.]',
    });
  }

  const accepted = rejected.length === 0;

  return {
    narrative_blocks: blocks,
    engine_thoughts: String(thoughts),
    logic_state: {
      current_phase: logic.current_phase || 'LATENT',
      requested_transition: logic.requested_transition || null,
      suggested_tension: logic.suggested_tension,
      matrix_mutation: logic.matrix_mutation || null,
      terminal_flags: Array.isArray(logic.terminal_flags) ? logic.terminal_flags : [],
      cast_ledger: Array.isArray(logic.cast_ledger) ? logic.cast_ledger : [],
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
  },
  topologyDelta: { isExpansion: false },
  validation: { accepted: false, rejected_fields: [errorType], repair_notes: [note] },
});

export const executeRatificationPipeline = async (
  userAction: string
): Promise<RatifiedEngineFrame> => {
  const state = useAppStore.getState();
  const engineState = useEngineStore.getState();

  const stateSnapshot = {
    spatialGraph: state.spatialGraph ? [...state.spatialGraph] : [],
    currentNodeId: state.currentNodeId,
    escalation_state: state.escalation_state,
    decayMetrics: state.decayMetrics ? { ...state.decayMetrics } : undefined,
  };

  const currentTension = state.tensionLevel || 0;
  const currentCoherence = state.decayMetrics?.coherenceRating ?? 1.0;
  const physicsMatrix = calculatePhysicsState(currentTension, currentCoherence);

  const selectedRole = (engineState.gameState?.player_role as PlayerRole) || 'protagonist';

  const turnContext = buildEngineTurnContext({
    blueprint: engineState.activeBlueprint,
    selectedRole,
    runtimeState: {
      currentNodeId: state.currentNodeId,
      phase: state.currentPhase || state.phase,
      tension: currentTension,
      coherence: currentCoherence,
      reconciliationRevision: state.reconciliationRevision || 0,
      activeVector: engineState.currentVector,
      activeTier: engineState.currentTier,
    },
  });

  const reconciliation = reconcilePerception(
    userAction,
    state.storyLog,
     
    (selectedRole as any) || 'PROTAGONIST',
    physicsMatrix.realityState
  );

  if (reconciliation.isHallucinationCollision && reconciliation.correctedProse) {
    useAppStore.setState((prev) => ({
      reconciliationRevision: prev.reconciliationRevision + reconciliation.revisionIncrement,
      storyLog: [
        ...prev.storyLog,
        { type: 'system_voice', content: reconciliation.correctedProse },
      ],
    }));

    return {
      narrative_blocks: [{ type: 'system_voice', content: reconciliation.correctedProse }],
      engine_thoughts: 'HALLUCINATION_COLLISION RECONCILIATION',
      logic_state: {
        current_phase: state.currentPhase || 'LATENT',
        suggested_tension: currentTension,
        intent_classification: 'HALLUCINATION_COLLISION',
        terminal_flags: [],
      },
      topologyDelta: { isExpansion: false },
      validation: {
        accepted: true,
        rejected_fields: [],
        repair_notes: ['Hallucination collision reconciled'],
      },
    };
  }

  // Distill the history to a compressed array instead of full prose
  const recentHistory = state.storyLog
    .slice(-6)
    .map(
      (block) =>
        `[${(block.type || 'PROSE').toUpperCase()}]: ${(block.content || '').substring(0, 60)}...`
    )
    .join('\n');

  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);
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
      currentNodeId: state.currentNodeId,
      currentPhase: state.currentPhase,
      tensionLevel: currentTension,
      reconciliationRevision: state.reconciliationRevision,
    },
    context: turnContext,
  };

  const response = await fetch('/api/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 406) {
      useAppStore.setState(stateSnapshot);
      throw new Error('COGNITIVE_REJECTION');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const rawJson = await response.json();
  const validatedEvent = validateEngineFrame(rawJson);

  // Attach context receipt for SYSTEM_INIT
  if (userAction === 'SYSTEM_INIT') {
    validatedEvent.contextReceipt = buildContextReceipt(turnContext, engineState.activeBlueprint);
  }

  // Expansion Guard:
  // If SYSTEM_INIT or no expansion was expected, suppress any rogue expansion
  if (userAction === 'SYSTEM_INIT' || !isExpansionExpected) {
    if (rawJson?.topologyDelta?.isExpansion) {
      validatedEvent.topologyDelta = { isExpansion: false, newNodeDef: null };
      if (!validatedEvent.validation) {
        validatedEvent.validation = { accepted: true, rejected_fields: [], repair_notes: [] };
      }
      validatedEvent.validation.repair_notes.push(
        '[GUARD] LLM emitted unexpected topology expansion; suppressed to maintain canonical graph.'
      );
    } else {
      validatedEvent.topologyDelta = rawJson?.topologyDelta || { isExpansion: false };
    }
  } else {
    validatedEvent.topologyDelta = rawJson?.topologyDelta || null;
  }

  if (
    validatedEvent.topologyDelta?.isExpansion &&
    validatedEvent.topologyDelta.newNodeDef &&
    matchingExitDirection &&
    state.currentNodeId
  ) {
    useAppStore
      .getState()
      .injectGeneratedNode(
        state.currentNodeId,
        matchingExitDirection,
        validatedEvent.topologyDelta.newNodeDef
      );
  }

  return validatedEvent;
};
