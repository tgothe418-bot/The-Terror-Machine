import type {
  CastMember,
  CharacterContinuityById,
} from '../types';

export const DEFAULT_SKEPTICISM = 0.5;
export const MIN_SKEPTICISM = 0;
export const MAX_SKEPTICISM = 1;
export const MAX_SKEPTICISM_DELTA = 0.15;

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
  cast: readonly CastMember[],
  persisted?: CharacterContinuityById | null,
): CharacterContinuityById {
  const result: CharacterContinuityById = {};

  for (const member of cast) {
    const id = member.id?.trim();
    if (!id) continue;

    let rawValue: number = DEFAULT_SKEPTICISM;
    if (persisted && persisted[id] && Number.isFinite(persisted[id].skepticism)) {
      rawValue = persisted[id].skepticism;
    } else if (
      member.vulnerabilityBase &&
      Number.isFinite(member.vulnerabilityBase.skepticism)
    ) {
      rawValue = member.vulnerabilityBase.skepticism;
    }

    result[id] = {
      skepticism: clampSkepticism(rawValue),
    };
  }

  return result;
}

export function applyCastSkepticismDeltas(
  cast: readonly CastMember[],
  persisted: CharacterContinuityById | null | undefined,
  deltas: readonly CastSkepticismDelta[] | null | undefined,
): CharacterContinuityById {
  const currentContinuity = buildCharacterContinuity(cast, persisted);
  if (!deltas || deltas.length === 0) {
    return currentContinuity;
  }

  const result: CharacterContinuityById = { ...currentContinuity };
  const seenIds = new Set<string>();

  for (const delta of deltas) {
    const id = delta.character_id?.trim();
    if (!id || !result[id] || seenIds.has(id)) {
      continue;
    }

    seenIds.add(id);
    const clampedDelta = clampSkepticismDelta(delta.skepticism_delta);
    if (clampedDelta === 0) {
      continue;
    }

    const nextSkepticism = clampSkepticism(result[id].skepticism + clampedDelta);
    result[id] = {
      skepticism: nextSkepticism,
    };
  }

  return result;
}
