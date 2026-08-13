import { RatifiedEngineFrame, DecayThreshold, DecayState } from '../types';

export const DECAY_SCALE: DecayThreshold[] = [
  { stage: 'STABLE', maxSkepticism: 1.0, minSkepticism: 0.61, environmentalCoherence: 1.0, narrativeDivergence: 'NONE' },
  { stage: 'FRAYING', maxSkepticism: 0.6, minSkepticism: 0.31, environmentalCoherence: 0.7, narrativeDivergence: 'LATENT_AMBIGUITY' },
  { stage: 'UNSTABLE', maxSkepticism: 0.3, minSkepticism: 0.01, environmentalCoherence: 0.3, narrativeDivergence: 'STRUCTURAL_DISTORTION' },
  { stage: 'SHATTERED', maxSkepticism: 0.0, minSkepticism: 0.0, environmentalCoherence: 0.0, narrativeDivergence: 'TOPOLOGICAL_PARADOX' }
];

const FORBIDDEN_RESCUE_PHRASES = [
  /you are safe/gi,
  /grounded in the present/gi,
  /the simulation has ended/gi,
  /real physical room/gi,
  /just a dream/gi,
  /safe and waiting to wake/gi
];

export function applyAntiRescueLinter(rawProse: string): string {
  let sanitizedProse = rawProse;
  let safetyTripped = false;

  FORBIDDEN_RESCUE_PHRASES.forEach(pattern => {
    if (pattern.test(sanitizedProse)) {
      safetyTripped = true;
      sanitizedProse = sanitizedProse.replace(pattern, "[ COGNITIVE REJECTION: SAFETY PROTOCOL DENIED ]");
    }
  });

  if (safetyTripped) {
    console.warn("[RATIFICATION] Anti-Rescue Linter tripped. Scrubbing safety language.");
    sanitizedProse += "\n\n[SYS: SAFETY_OVERRIDE_FAILED]"; 
  }

  return sanitizedProse;
}

export const calculateDecayState = (skepticism: number): DecayState => {
  // Normalize boundaries
  const normalizedSkepticism = Math.max(0.0, Math.min(1.0, skepticism));
  
  const threshold = DECAY_SCALE.find(
    t => normalizedSkepticism >= t.minSkepticism && normalizedSkepticism <= t.maxSkepticism
  ) || DECAY_SCALE[0];

  return {
    currentStage: threshold.stage,
    coherenceRating: threshold.environmentalCoherence,
    divergenceMode: threshold.narrativeDivergence
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateEngineFrame = (rawPayload: any): RatifiedEngineFrame => {
  const rejected: string[] = [];
  const notes: string[] = [];

  // 1. Structural Check
  if (!rawPayload || typeof rawPayload !== 'object') {
    return createFailedFrame("CRITICAL_ERROR", "Payload is completely malformed or undefined.");
  }

  // 2. Extract and Normalize
  const blocks = (Array.isArray(rawPayload.narrative_blocks) ? rawPayload.narrative_blocks : []).map(b => {
      let content = b.content;
      if (b.type === 'prose' || b.type === 'dialogue' || b.type === 'internal_monologue') {
        content = applyAntiRescueLinter(content || "");
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
  const thoughts = rawPayload.engine_thoughts || rawPayload.engine_logic || "";

  // 3. Validation Logic
  if (blocks.length === 0) {
    rejected.push("narrative_blocks");
    notes.push("Warning: Engine returned zero narrative blocks. Injecting fallback.");
    // Provide a safe fallback so the UI never crashes on an empty render
    blocks.push({ type: "system_voice", content: "[The simulation stalls. A cold silence fills the void.]" });
  }

  const accepted = rejected.length === 0;

  return {
    narrative_blocks: blocks,
    engine_thoughts: String(thoughts),
    logic_state: {
      requested_transition: logic.requested_transition || null,
      suggested_tension: logic.suggested_tension,
      matrix_mutation: logic.matrix_mutation || null,
      terminal_flags: Array.isArray(logic.terminal_flags) ? logic.terminal_flags : [],
      cast_ledger: Array.isArray(logic.cast_ledger) ? logic.cast_ledger : []
    },
    validation: {
      accepted,
      rejected_fields: rejected,
      repair_notes: notes
    }
  };
};

const createFailedFrame = (errorType: string, note: string): RatifiedEngineFrame => ({
  narrative_blocks: [{ type: 'system_voice', content: "[ SYSTEM FAILURE: UNABLE TO RENDER REALITY CONSTRUCT ]" }],
  engine_thoughts: "FATAL PARSE ERROR.",
  logic_state: { 
    terminal_flags: [],
    cast_ledger: []
  },
  validation: { accepted: false, rejected_fields: [errorType], repair_notes: [note] }
});

import { useAppStore } from '../store/useAppStore';
import { calculatePhysicsState } from '../core/matrix/physicsMatrix';
import { reconcilePerception } from '../core/memory/reconciler';

export const executeRatificationPipeline = async (userAction: string, basePrompt: string) => {
  // Capture shallow clone/snapshot of spatial/threat state
  const state = useAppStore.getState();
  const stateSnapshot = {
    spatialGraph: state.spatialGraph ? [...state.spatialGraph] : [],
    currentNodeId: state.currentNodeId,
    escalation_state: state.escalation_state,
    decayMetrics: state.decayMetrics ? { ...state.decayMetrics } : undefined,
  };

  const currentTension = state.tensionLevel || 0;
  const currentCoherence = state.decayMetrics?.coherenceRating ?? 1.0;
  const physicsMatrix = calculatePhysicsState(currentTension, currentCoherence);

  // Phase 5: Reconcile perception against active user action
  const reconciliation = reconcilePerception(
    userAction,
    state.storyLog,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (state as any).activeRole || 'PROTAGONIST',
    physicsMatrix.realityState
  );

  // If the user tries to interact with a hallucination, collapse the perception locally
  if (reconciliation.isHallucinationCollision && reconciliation.correctedProse) {
    useAppStore.setState((prev) => ({
      reconciliationRevision: prev.reconciliationRevision + reconciliation.revisionIncrement,
      storyLog: [
        ...prev.storyLog,
        { type: 'system_voice', content: reconciliation.correctedProse }
      ]
    }));

    return {
      stateDeltas: { frictionModifier: 1, threatScaleShift: 0, panicTrigger: false },
      topologyDelta: { isExpansion: false },
      narrativeMandate: {
        outcome: 'FAILURE',
        realityState: physicsMatrix.realityState,
        sensoryPriority: reconciliation.correctedProse,
        pacingRule: 'SUDDEN_STOP'
      }
    };
  }

  // 3. Build Rolling Narrative History (Last 4 turns for context)
  const recentHistory = state.storyLog.slice(-8).map(block => {
    return `[${block.type.toUpperCase()}]: ${block.content}`;
  }).join('\n');

  // 4. Construct Context-Aware Prompt
  const isTurnOne = state.storyLog.length === 0;
  
  let finalPrompt = basePrompt;

  if (isTurnOne) {
    finalPrompt += `\n\n[STATE: INITIALIZATION - Establish the starting node and atmosphere.]`;
  } else {
    finalPrompt += `\n\n[STATE: IN_PROGRESS - DO NOT re-initialize the simulation or reset the room. Advance the narrative based on the user's action.]`;
    finalPrompt += `\n\n--- RECENT NARRATIVE HISTORY ---\n${recentHistory}\n--- END HISTORY ---`;
  }

  finalPrompt += `\n\n[USER ACTION]: ${userAction}`;
  finalPrompt += `\n\n[SYSTEM DIRECTIVE: ${physicsMatrix.generativeDirective}]`;
  finalPrompt += `\n[NARRATIVE CONSTRAINT: Maximum 2 prose blocks per turn. DO NOT repeat recently used sensory descriptions (e.g., copper, wet plaster, breathing wallpaper) unless reality is actively shattering.]`;
  if (state.reconciliationRevision > 0) {
    finalPrompt += `\n[MEMORY REVISION REVISION_ID: ${state.reconciliationRevision}. The user's perceptions have recently fractured.]`;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentNode = state.spatialGraph?.find((n: any) => n.id === state.currentNodeId);
  let matchingExitDirection: string | null = null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (currentNode && (currentNode as any).exits) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exits = (currentNode as any).exits;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attemptedExit = exits.find((exit: any) => 
      userAction.toLowerCase().includes(exit.description.toLowerCase())
    );
    
    if (attemptedExit && (attemptedExit.targetNodeId === 'NODE_UNMAPPED' || attemptedExit.targetNodeId.startsWith('unmaterialized_'))) {
      matchingExitDirection = attemptedExit.description;
      finalPrompt += `\n\nSYSTEM OVERRIDE: The user is entering an unmapped threshold. You MUST set \`isExpansion: true\` in your JSON response and fully populate the \`newNodeDef\` object with a unique \`id\`, \`geometry\`, \`hazards\`, and new \`exitVectors\` (all pointing to 'NODE_UNMAPPED').`;
    }
  }

  const response = await fetch('/api/ratify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: finalPrompt })
  });

  if (response.status === 406) {
    const errorData = await response.json();
    if (errorData.directive === 'COGNITIVE_REJECTION') {
      // Execute reversion: restore the Zustand store to the pre-fetch snapshot.
      useAppStore.setState(stateSnapshot);

      // Pass a hardcoded "Reality Shear" narrative mandate
      return {
        stateDeltas: {
          frictionModifier: 0,
          threatScaleShift: 0,
          panicTrigger: true
        },
        topologyDelta: {
          isExpansion: false
        },
        narrativeMandate: {
          outcome: 'FAILURE',
          realityState: 'HALLUCINATORY',
          sensoryPriority: 'The geometry folds inward. A sudden, violent migraine shears your vision. When you open your eyes, your hand is no longer on the threshold. You are exactly where you started. The space rejects your momentum.',
          pacingRule: 'SUDDEN_STOP'
        }
      };
    } else {
      throw new Error('Ratification failed: ' + JSON.stringify(errorData));
    }
  }

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const validatedEvent = await response.json();

  // Intercept the topologyDelta for JIT expansion
  if (validatedEvent.topologyDelta?.isExpansion && validatedEvent.topologyDelta.newNodeDef && matchingExitDirection && state.currentNodeId) {
    // Patch the graph before returning
    useAppStore.getState().injectGeneratedNode(state.currentNodeId, matchingExitDirection, validatedEvent.topologyDelta.newNodeDef);
  }

  return validatedEvent;
};
