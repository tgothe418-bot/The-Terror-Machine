import { forgeActions } from '../store/useForgeStore';

interface StateProposal {
  proposedLocationId?: string;
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
