import { PlayerRole, NarrativeBlock } from '../../types';

export interface ReconciliationResult {
  isHallucinationCollision: boolean;
  correctedProse?: string;
  revisionIncrement: number;
}

export function reconcilePerception(
  userAction: string,
  uiTranscript: NarrativeBlock[],
  currentRole: PlayerRole,
  realityState: string
): ReconciliationResult {
  // If reality is STABLE, perception matches canonical state
  if (realityState === 'STABLE') {
    return { isHallucinationCollision: false, revisionIncrement: 0 };
  }

  // Detect if action targets a known hallucinatory token injected during DEGRADING or ONTOLOGICAL_SHEAR
  const hallucinationKeywords = ['phantom', 'ghost', 'bleeding wall', 'impossible door', 'floating', 'shadow-self'];
  const targetsHallucination = hallucinationKeywords.some(keyword => 
    userAction.toLowerCase().includes(keyword)
  );

  if (targetsHallucination && realityState === 'ONTOLOGICAL_SHEAR') {
    return {
      isHallucinationCollision: true,
      correctedProse: `[RECONCILIATION FAIL] You reach out to interact with the anomaly, but your fingers collapse through void. The perception snaps. It was never there.`,
      revisionIncrement: 1
    };
  }

  return { isHallucinationCollision: false, revisionIncrement: 0 };
}
