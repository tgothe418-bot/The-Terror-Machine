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

/**
 * Event-driven evidence dismissal (the DENY mechanic, §2, §4).
 * Marks evidence ingested with zero weight delta and zero dissonance delta.
 * Deduplicates by stable evidence ID.
 */
export function dismissEvidenceEvent(
  cognition: CastCognition,
  evidenceId: string
): CastCognition {
  if (cognition.ingestedEvidenceIds.includes(evidenceId)) {
    return cognition;
  }

  const updatedIngested = [...cognition.ingestedEvidenceIds, evidenceId];
  if (updatedIngested.length > 100) {
    updatedIngested.shift();
  }

  return {
    ...cognition,
    ingestedEvidenceIds: updatedIngested,
  };
}

export interface PanicTraceEvent {
  id: string; // e.g. `${characterId}-panic-${salienceSpikeTurn}`
  sourceCharacterId: string;
  nodeId: string;
  clarity: 'FAINT' | 'OBSCURED' | 'AUDIBLE' | 'STARK';
  cueText?: string;
  fictionalTime?: number;
  turn?: number;
}

export interface ReceiverDampeningFactors {
  receiverFearlessness?: number; // 0..1
  isSeatHolder?: boolean;
  receiverSalience?: { spike: number; dread: number };
}

export interface TraceIngestionResult {
  cognition: CastCognition;
  spikeDelta: number;
  dreadDelta: number;
  weightDelta: number;
}

/**
 * Computes individual receiver dampening multiplier (§5.5, §11.8).
 * Damped if receiver has high steadiness (fearlessness), high status (seatHolder), or low personal salience.
 * Dampening stays individual — never a cohort-level morale scalar.
 */
export function calculateReceiverDampeningMultiplier(
  factors: ReceiverDampeningFactors = {}
): number {
  let multiplier = 1.0;

  // 1. High steadiness / fearlessness dampening
  const fearlessness =
    typeof factors.receiverFearlessness === 'number' && !Number.isNaN(factors.receiverFearlessness)
      ? Math.max(0, Math.min(1, factors.receiverFearlessness))
      : 0;
  if (fearlessness > 0) {
    multiplier *= Math.max(0.1, 1 - fearlessness * 0.5);
  }

  // 2. High status (seat holder) dampening
  if (factors.isSeatHolder) {
    multiplier *= 0.7;
  }

  // 3. Low personal salience dampening
  const personalSalience = factors.receiverSalience
    ? (factors.receiverSalience.spike || 0) + (factors.receiverSalience.dread || 0)
    : 0;
  if (personalSalience < 0.3) {
    multiplier *= 0.8;
  }

  return Math.max(0.05, Math.min(1.0, multiplier));
}

/**
 * Ingests a panic trace event into receiver cognition with individual dampening and anti-rebroadcast (§5.5).
 * - Anti-rebroadcast: deduplicates by stable event id (consumed identity).
 * - Content-carrying: clarity determines base stimulus intensity.
 * - Individual dampening: receiver psychology modulates delta.
 */
export function ingestPanicTraceEvent(
  cognition: CastCognition,
  trace: PanicTraceEvent,
  factors: ReceiverDampeningFactors = {},
  currentTurn: number = 0,
  targetHypothesisId: string = 'hyp-threat-exists'
): TraceIngestionResult {
  // Anti-rebroadcast: consumed identity guard
  if (cognition.ingestedEvidenceIds.includes(trace.id)) {
    return {
      cognition,
      spikeDelta: 0,
      dreadDelta: 0,
      weightDelta: 0,
    };
  }

  const clarityWeights: Record<'FAINT' | 'OBSCURED' | 'AUDIBLE' | 'STARK', { spike: number; dissonance: number; hyp: number }> = {
    STARK: { spike: 0.40, dissonance: 0.30, hyp: 0.30 },
    AUDIBLE: { spike: 0.25, dissonance: 0.20, hyp: 0.20 },
    OBSCURED: { spike: 0.15, dissonance: 0.10, hyp: 0.10 },
    FAINT: { spike: 0.05, dissonance: 0.05, hyp: 0.05 },
  };

  const base = clarityWeights[trace.clarity] || clarityWeights.AUDIBLE;
  const dampening = calculateReceiverDampeningMultiplier(factors);

  const spikeDelta = base.spike * dampening;
  const dreadDelta = spikeDelta * 0.25;
  const dissonanceDelta = base.dissonance * dampening;
  const weightDelta = base.hyp * dampening;

  const effectiveTurn = typeof trace.turn === 'number' ? trace.turn : currentTurn;

  const updatedCognition = ingestEvidenceEvent(
    cognition,
    {
      id: trace.id,
      targetHypothesisId,
      weightDelta,
      dissonanceDelta,
    },
    effectiveTurn
  );

  return {
    cognition: updatedCognition,
    spikeDelta,
    dreadDelta,
    weightDelta,
  };
}

export const ingestTraceEvent = ingestPanicTraceEvent;

