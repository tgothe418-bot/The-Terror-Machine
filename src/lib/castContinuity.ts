import type {
  CharacterContinuityById,
} from '../types';

export const DEFAULT_SKEPTICISM = 0.5;
export const MIN_SKEPTICISM = 0;
export const MAX_SKEPTICISM = 1;
export const MAX_SKEPTICISM_DELTA = 0.15;

export interface CastContinuitySeed {
  id?: string | null;
  vulnerabilityBase?: {
    skepticism?: number | null;
  } | null;
}

export interface CastSkepticismDelta {
  character_id: string;
  skepticism_delta: number;
}

export function clampSkepticism(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SKEPTICISM;
  return Math.min(MAX_SKEPTICISM, Math.max(MIN_SKEPTICISM, value));
}

export function clampSkepticismDelta(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(
    MAX_SKEPTICISM_DELTA,
    Math.max(-MAX_SKEPTICISM_DELTA, value),
  );
}

export function buildCharacterContinuity(
  cast: readonly CastContinuitySeed[],
  persisted?: CharacterContinuityById | null,
): CharacterContinuityById {
  const result: CharacterContinuityById = {};

  for (const member of cast) {
    if (!member || typeof member.id !== 'string' || member.id.trim().length === 0) {
      continue;
    }

    const id = member.id.trim();
    const persistedRecord = persisted?.[id];
    let resolvedValue: number;

    if (persistedRecord && Number.isFinite(persistedRecord.skepticism)) {
      resolvedValue = persistedRecord.skepticism;
    } else if (
      member.vulnerabilityBase &&
      typeof member.vulnerabilityBase.skepticism === 'number' &&
      Number.isFinite(member.vulnerabilityBase.skepticism)
    ) {
      resolvedValue = member.vulnerabilityBase.skepticism;
    } else {
      resolvedValue = DEFAULT_SKEPTICISM;
    }

    result[id] = {
      skepticism: clampSkepticism(resolvedValue),
    };
  }

  return result;
}

export function applyCastSkepticismDeltas(
  cast: readonly CastContinuitySeed[],
  persisted: CharacterContinuityById | null | undefined,
  deltas: readonly CastSkepticismDelta[] | null | undefined,
): CharacterContinuityById {
  const continuity = buildCharacterContinuity(cast, persisted);
  if (!deltas || !Array.isArray(deltas) || deltas.length === 0) {
    return continuity;
  }

  const seenIds = new Set<string>();

  for (const delta of deltas) {
    if (!delta || typeof delta.character_id !== 'string') {
      continue;
    }

    const charId = delta.character_id.trim();
    if (!continuity[charId] || seenIds.has(charId)) {
      continue;
    }

    seenIds.add(charId);

    const clampedDelta = clampSkepticismDelta(delta.skepticism_delta);
    if (clampedDelta === 0) {
      continue;
    }

    const currentSkepticism = continuity[charId].skepticism;
    continuity[charId] = {
      skepticism: clampSkepticism(currentSkepticism + clampedDelta),
    };
  }

  return continuity;
}
