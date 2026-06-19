// src/core/orchestrator/index.ts
import { EngineState } from '../engine/reducer';
import { EngineEvent } from '../engine/events';

// Pacing thresholds (these can be tweaked later or moved to a config file)
const THRESHOLDS = {
  LATENT_TO_MANIFEST_TURNS: 5,
  LATENT_TO_MANIFEST_TRAUMA: 3,
  MANIFEST_TO_TERMINAL_TURNS: 12,
  MANIFEST_TO_TERMINAL_TRAUMA: 8,
};

/**
 * Evaluates the current engine state to determine if a narrative phase shift is required.
 * Returns a PHASE_CHANGED event payload if a shift is needed, or null if stable.
 */
export function evaluatePhaseShift(state: EngineState): EngineEvent | null {
  const { phase, turnCount, traumaLedger } = state;
  const traumaCount = traumaLedger.length;

  if (phase === 'LATENT') {
    if (turnCount >= THRESHOLDS.LATENT_TO_MANIFEST_TURNS || traumaCount >= THRESHOLDS.LATENT_TO_MANIFEST_TRAUMA) {
      return {
        type: 'PHASE_CHANGED',
        from: 'LATENT',
        to: 'MANIFEST',
        timestamp: Date.now(),
      };
    }
  }

  if (phase === 'MANIFEST') {
    if (turnCount >= THRESHOLDS.MANIFEST_TO_TERMINAL_TURNS || traumaCount >= THRESHOLDS.MANIFEST_TO_TERMINAL_TRAUMA) {
      return {
        type: 'PHASE_CHANGED',
        from: 'MANIFEST',
        to: 'TERMINAL',
        timestamp: Date.now(),
      };
    }
  }

  // Add additional phase logic here (e.g., TERMINAL to TERMINATED) as needed.

  return null; // State is stable, no shift required
}
