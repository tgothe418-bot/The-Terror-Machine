import { forgeActions } from '../store/useForgeStore';

interface StateProposal {
  proposedLocationId?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  somaticMutations?: Array<{ entityId: string; updates: any }>;
  narrativeProse: string;
}

// Mock of our absolute compiled spatial truths
const VALID_SPATIAL_GRAPH: Record<string, string[]> = {
  'NODE_INIT': ['NODE_01', 'NODE_02'],
  'NODE_01': ['NODE_INIT', 'NODE_03'],
  'NODE_02': ['NODE_INIT'],
  'NODE_03': ['NODE_01']
};

import { RatifiedEngineFrame } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateEngineFrame = (rawPayload: any): RatifiedEngineFrame => {
  const rejected: string[] = [];
  const notes: string[] = [];

  // 1. Structural Check
  if (!rawPayload || typeof rawPayload !== 'object') {
    return createFailedFrame("CRITICAL_ERROR", "Payload is completely malformed.");
  }

  // 2. Extract and Normalize
  const blocks = rawPayload.narrative_blocks || [];
  const logic = rawPayload.logic_state || {};
  const thoughts = rawPayload.engine_thoughts || rawPayload.engine_logic || "";

  // 3. Validation Logic
  if (blocks.length === 0) {
    rejected.push("narrative_blocks");
    notes.push("Warning: Engine returned zero narrative blocks.");
  }

  const accepted = rejected.length === 0;

  return {
    narrative_blocks: blocks,
    engine_thoughts: thoughts,
    logic_state: {
      current_phase: logic.current_phase || "MAINTENANCE",
      requested_transition: logic.requested_transition,
      suggested_tension: logic.suggested_tension,
      matrix_mutation: logic.matrix_mutation,
      terminal_flags: logic.terminal_flags || [],
      cast_ledger: logic.cast_ledger || []
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
  logic_state: { current_phase: "SYSTEM_FAILURE" },
  validation: { accepted: false, rejected_fields: [errorType], repair_notes: [note] }
});
export const ratifyEngineProposal = (
  currentLocationId: string, 
  rawModelOutput: string
): string => {
  let parsedProposal: StateProposal;

  try {
    // Attempt to extract structured JSON block if the model attached one
    const jsonMatch = rawModelOutput.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return rawModelOutput; // Return prose directly if no state mutation was attempted
    
    parsedProposal = JSON.parse(jsonMatch[0]);
  } catch {
    console.error('[RATIFICATION FAILURE] Output syntax corrupted. Stripping state payload.');
    return rawModelOutput;
  }

  // ─── THE SPATIAL GRID VERIFIER ───
  if (parsedProposal.proposedLocationId) {
    const validDestinations = VALID_SPATIAL_GRAPH[currentLocationId] || [];
    const isPathLegal = validDestinations.includes(parsedProposal.proposedLocationId);

    if (!isPathLegal) {
      console.warn(
        `[CONSTITUTIONAL VIOLATION ALERT] Model attempted illegal spatial transition: ${currentLocationId} -> ${parsedProposal.proposedLocationId}. Action intercepted and terminated.`
      );
      // Force spatial lock: overwrite the illegal mutation proposal
      delete parsedProposal.proposedLocationId;
    }
  }

  // ─── THE TRAUMA LEDGER COMMIT ───
  if (parsedProposal.somaticMutations) {
    parsedProposal.somaticMutations.forEach((mutation) => {
      // Ratify the profile update through our decoupled write-only store actions
      forgeActions.updateCastMember(mutation.entityId, mutation.updates);
    });
  }

  return parsedProposal.narrativeProse;
};
