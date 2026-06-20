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
