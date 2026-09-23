import type { CastCognition } from '../types/cohort';

export interface EvidenceEvent {
  id: string;
  targetHypothesisId: string;
  weightDelta: number;
  dissonanceDelta?: number;
}

/**
 * Event-driven evidence ingestion (§7).
 * Deduplicates by stable evidence ID. Only uningested events tick dissonance and mutate hypotheses.
 */
export function ingestEvidenceEvent(
  cognition: CastCognition,
  event: EvidenceEvent,
  currentTurn: number
): CastCognition {
  if (cognition.ingestedEvidenceIds.includes(event.id)) {
    return cognition; // Already ingested: zero dissonance accumulation
  }

  const updatedIngested = [...cognition.ingestedEvidenceIds, event.id];
  // Bound history to 100 recent evidence IDs
  if (updatedIngested.length > 100) {
    updatedIngested.shift();
  }

  const dissonanceDelta = event.dissonanceDelta ?? 0.1;
  const newDissonance = cognition.cognitiveDissonance + dissonanceDelta;

  const currentHyp = cognition.hypotheses[event.targetHypothesisId] || {
    id: event.targetHypothesisId,
    weight: 0,
    provenance: { lastUpdatedTurn: currentTurn },
  };

  const updatedWeight = Math.max(0, Math.min(1, currentHyp.weight + event.weightDelta));

  return {
    ...cognition,
    cognitiveDissonance: newDissonance,
    ingestedEvidenceIds: updatedIngested,
    hypotheses: {
      ...cognition.hypotheses,
      [event.targetHypothesisId]: {
        id: event.targetHypothesisId,
        weight: updatedWeight,
        provenance: {
          lastSupportRef:
            event.weightDelta >= 0 ? event.id : currentHyp.provenance.lastSupportRef,
          lastContradictionRef:
            event.weightDelta < 0 ? event.id : currentHyp.provenance.lastContradictionRef,
          lastUpdatedTurn: currentTurn,
        },
      },
    },
  };
}
