import { HorrorVector, ExposureTier, RuntimeStateSnapshot } from '../../types';

export const VALID_HORROR_VECTORS: readonly HorrorVector[] = [
  'SOMATIC',
  'COGNITIVE',
  'COSMIC',
  'SOCIO_MORAL',
] as const;

export const VALID_EXPOSURE_TIERS: readonly ExposureTier[] = [
  'GATEWAY',
  'LATENT',
  'MANIFEST',
  'TERMINAL',
] as const;

export function isHorrorVector(value: unknown): value is HorrorVector {
  return typeof value === 'string' && VALID_HORROR_VECTORS.includes(value as HorrorVector);
}

export function isExposureTier(value: unknown): value is ExposureTier {
  return typeof value === 'string' && VALID_EXPOSURE_TIERS.includes(value as ExposureTier);
}

export interface CaptureSnapshotSource {
  sessionId?: string;
  blueprintId?: string;
  turnCount?: number;
  currentNodeId?: string | null;
  activeVector?: HorrorVector | string;
  activeTier?: ExposureTier | string;
  phase?: string;
  currentPhase?: string;
  tensionLevel?: number;
  tension?: number;
  decay?: { coherence?: number; stage?: string };
  decayMetrics?: { coherenceRating?: number; currentStage?: string };
  coherence?: number;
  decayRate?: number;
  reconciliationRevision?: number;
  activeMemory?: { systemFlags?: string[] };
  activeFlags?: string[];
}

/**
 * Pure, deterministic helper that captures an immutable RuntimeStateSnapshot from canonical engine/app state.
 * Does not read stores, mutate state, or make external calls.
 */
export function captureRuntimeSnapshot(source: CaptureSnapshotSource): RuntimeStateSnapshot {
  const rawVector = source.activeVector;
  const activeVector: HorrorVector = isHorrorVector(rawVector) ? rawVector : 'COGNITIVE';

  const rawTier = source.activeTier;
  const activeTier: ExposureTier = isExposureTier(rawTier) ? rawTier : 'LATENT';

  const coherence =
    typeof source.coherence === 'number'
      ? source.coherence
      : typeof source.decayMetrics?.coherenceRating === 'number'
        ? source.decayMetrics.coherenceRating
        : typeof source.decay?.coherence === 'number'
          ? source.decay.coherence
          : 1.0;

  const tension =
    typeof source.tensionLevel === 'number'
      ? source.tensionLevel
      : typeof source.tension === 'number'
        ? source.tension
        : 0;

  const phase = source.currentPhase || source.phase || 'LATENT';
  const currentNodeId = source.currentNodeId || 'ORIGIN';
  const turnCount = typeof source.turnCount === 'number' ? source.turnCount : 0;
  const reconciliationRevision =
    typeof source.reconciliationRevision === 'number' ? source.reconciliationRevision : 0;

  const rawFlags = source.activeFlags || source.activeMemory?.systemFlags || [];
  const activeFlags = Array.from(new Set(rawFlags));

  return Object.freeze({
    version: 1,
    sessionId: source.sessionId || undefined,
    blueprintId: source.blueprintId || undefined,
    turnCount,
    currentNodeId,
    activeVector,
    activeTier,
    phase,
    tension,
    coherence,
    decayRate: typeof source.decayRate === 'number' ? source.decayRate : 0,
    reconciliationRevision,
    activeFlags,
  });
}
