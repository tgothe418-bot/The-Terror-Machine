import { describe, it, expect } from 'vitest';
import {
  buildCharacterContinuity,
  applyCastSkepticismDeltas,
  clampSkepticism,
  clampSkepticismDelta,
  DEFAULT_SKEPTICISM,
  MIN_SKEPTICISM,
  MAX_SKEPTICISM,
  MAX_SKEPTICISM_DELTA,
} from './castContinuity';
import type { CastMember, CharacterContinuityById } from '../types';

describe('castContinuity', () => {
  describe('clamp helpers', () => {
    it('clampSkepticism clamps values into [0, 1] and handles non-finite values', () => {
      expect(clampSkepticism(0.5)).toBe(0.5);
      expect(clampSkepticism(-0.2)).toBe(MIN_SKEPTICISM);
      expect(clampSkepticism(1.4)).toBe(MAX_SKEPTICISM);
      expect(clampSkepticism(NaN)).toBe(DEFAULT_SKEPTICISM);
      expect(clampSkepticism(Infinity)).toBe(DEFAULT_SKEPTICISM);
    });

    it('clampSkepticismDelta clamps values into [-0.15, 0.15] and handles non-finite values', () => {
      expect(clampSkepticismDelta(0.1)).toBe(0.1);
      expect(clampSkepticismDelta(0.25)).toBe(MAX_SKEPTICISM_DELTA);
      expect(clampSkepticismDelta(-0.3)).toBe(-MAX_SKEPTICISM_DELTA);
      expect(clampSkepticismDelta(NaN)).toBe(0);
      expect(clampSkepticismDelta(Infinity)).toBe(0);
    });
  });

  describe('buildCharacterContinuity', () => {
    it('falls back to DEFAULT_SKEPTICISM (0.50) when no persisted value or vulnerability is present', () => {
      const cast: CastMember[] = [
        { id: 'c1', name: 'Alice', role: 'Engineer' } as CastMember,
      ];
      const result = buildCharacterContinuity(cast);
      expect(result).toEqual({
        c1: { skepticism: 0.5 },
      });
    });

    it('uses vulnerabilityBase.skepticism when available and clamps it', () => {
      const cast: CastMember[] = [
        {
          id: 'c1',
          name: 'Alice',
          vulnerabilityBase: { skepticism: 0.75, fear: 0.2, isolation: 0.1 },
        } as unknown as CastMember,
        {
          id: 'c2',
          name: 'Bob',
          vulnerabilityBase: { skepticism: 1.5, fear: 0.2, isolation: 0.1 },
        } as unknown as CastMember,
      ];
      const result = buildCharacterContinuity(cast);
      expect(result).toEqual({
        c1: { skepticism: 0.75 },
        c2: { skepticism: 1.0 },
      });
    });

    it('prioritizes persisted value over vulnerabilityBase.skepticism', () => {
      const cast: CastMember[] = [
        {
          id: 'c1',
          name: 'Alice',
          vulnerabilityBase: { skepticism: 0.8, fear: 0.2, isolation: 0.1 },
        } as unknown as CastMember,
      ];
      const persisted: CharacterContinuityById = {
        c1: { skepticism: 0.35 },
      };
      const result = buildCharacterContinuity(cast, persisted);
      expect(result).toEqual({
        c1: { skepticism: 0.35 },
      });
    });

    it('ignores empty cast IDs and does not mutate inputs', () => {
      const cast: CastMember[] = [
        { id: '', name: 'Blank' } as CastMember,
        { id: 'c1', name: 'Valid' } as CastMember,
      ];
      const persisted: CharacterContinuityById = {
        c1: { skepticism: 0.6 },
      };
      const result = buildCharacterContinuity(cast, persisted);
      expect(result).toEqual({
        c1: { skepticism: 0.6 },
      });
      expect(persisted.c1.skepticism).toBe(0.6);
    });
  });

  describe('applyCastSkepticismDeltas', () => {
    const cast: CastMember[] = [
      { id: 'c1', name: 'Alice' } as CastMember,
      { id: 'c2', name: 'Bob', vulnerabilityBase: { skepticism: 0.9, fear: 0, isolation: 0 } } as unknown as CastMember,
    ];

    it('returns baseline continuity when deltas are empty or null', () => {
      const result = applyCastSkepticismDeltas(cast, undefined, null);
      expect(result).toEqual({
        c1: { skepticism: 0.5 },
        c2: { skepticism: 0.9 },
      });
    });

    it('applies valid deltas, clamping delta to [-0.15, 0.15] and final result to [0, 1]', () => {
      const deltas = [
        { character_id: 'c1', skepticism_delta: -0.1 },
        { character_id: 'c2', skepticism_delta: 0.3 }, // should clamp delta to +0.15 -> 0.9 + 0.15 = 1.0 (clamped)
      ];
      const result = applyCastSkepticismDeltas(cast, null, deltas);
      expect(result.c1.skepticism).toBeCloseTo(0.4, 5);
      expect(result.c2.skepticism).toBe(1.0);
    });

    it('ignores deltas for unknown cast IDs', () => {
      const deltas = [
        { character_id: 'unknown-id', skepticism_delta: -0.15 },
        { character_id: 'c1', skepticism_delta: -0.05 },
      ];
      const result = applyCastSkepticismDeltas(cast, null, deltas);
      expect(result['unknown-id']).toBeUndefined();
      expect(result.c1.skepticism).toBeCloseTo(0.45, 5);
      expect(result.c2.skepticism).toBe(0.9);
    });

    it('applies only the first delta if duplicate cast IDs appear in the delta array', () => {
      const deltas = [
        { character_id: 'c1', skepticism_delta: 0.1 },
        { character_id: 'c1', skepticism_delta: 0.1 },
      ];
      const result = applyCastSkepticismDeltas(cast, null, deltas);
      expect(result.c1.skepticism).toBeCloseTo(0.6, 5);
    });

    it('clamps lower bound to 0.0 when negative delta exceeds available skepticism', () => {
      const persisted: CharacterContinuityById = {
        c1: { skepticism: 0.05 },
      };
      const deltas = [{ character_id: 'c1', skepticism_delta: -0.15 }];
      const result = applyCastSkepticismDeltas(cast, persisted, deltas);
      expect(result.c1.skepticism).toBe(0.0);
    });
  });
});
