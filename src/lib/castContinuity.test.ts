import { describe, it, expect } from 'vitest';
import {
  clampSkepticism,
  clampSkepticismDelta,
  buildCharacterContinuity,
  applyCastSkepticismDeltas,
  DEFAULT_SKEPTICISM,
  MIN_SKEPTICISM,
  MAX_SKEPTICISM,
  MAX_SKEPTICISM_DELTA,
} from './castContinuity';
import type { CastMember, CharacterContinuityById } from '../types';

describe('castContinuity', () => {
  describe('clampSkepticism', () => {
    it('clamps values below minimum to 0', () => {
      expect(clampSkepticism(-0.5)).toBe(MIN_SKEPTICISM);
    });

    it('clamps values above maximum to 1', () => {
      expect(clampSkepticism(1.5)).toBe(MAX_SKEPTICISM);
    });

    it('returns default skepticism for non-finite values', () => {
      expect(clampSkepticism(NaN)).toBe(DEFAULT_SKEPTICISM);
      expect(clampSkepticism(Infinity)).toBe(DEFAULT_SKEPTICISM);
    });

    it('returns valid values unchanged', () => {
      expect(clampSkepticism(0.72)).toBe(0.72);
      expect(clampSkepticism(0)).toBe(0);
      expect(clampSkepticism(1)).toBe(1);
    });
  });

  describe('clampSkepticismDelta', () => {
    it('clamps deltas to [-0.15, 0.15]', () => {
      expect(clampSkepticismDelta(-0.5)).toBe(-MAX_SKEPTICISM_DELTA);
      expect(clampSkepticismDelta(0.5)).toBe(MAX_SKEPTICISM_DELTA);
      expect(clampSkepticismDelta(0.1)).toBe(0.1);
      expect(clampSkepticismDelta(-0.08)).toBe(-0.08);
    });

    it('returns 0 for non-finite values', () => {
      expect(clampSkepticismDelta(NaN)).toBe(0);
      expect(clampSkepticismDelta(-Infinity)).toBe(0);
    });
  });

  describe('buildCharacterContinuity', () => {
    it('returns records only for supplied, non-empty cast IDs', () => {
      const cast: CastMember[] = [
        { id: 'char-1', name: 'Alice' },
        { id: '', name: 'Empty' },
        { id: '   ', name: 'Whitespace' },
      ];
      const result = buildCharacterContinuity(cast);
      expect(Object.keys(result)).toEqual(['char-1']);
    });

    it('prefers finite persisted value over vulnerabilityBase and default', () => {
      const cast: CastMember[] = [
        {
          id: 'char-1',
          name: 'Alice',
          vulnerabilityBase: { resilience: 0.5, skepticism: 0.3, baggage: 0.5 },
        },
      ];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.8 },
      };

      const result = buildCharacterContinuity(cast, persisted);
      expect(result['char-1'].skepticism).toBe(0.8);
    });

    it('uses vulnerabilityBase when persisted is missing or non-finite', () => {
      const cast: CastMember[] = [
        {
          id: 'char-1',
          name: 'Alice',
          vulnerabilityBase: { resilience: 0.5, skepticism: 0.35, baggage: 0.5 },
        },
      ];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: NaN },
      };

      const result = buildCharacterContinuity(cast, persisted);
      expect(result['char-1'].skepticism).toBe(0.35);
    });

    it('falls back to DEFAULT_SKEPTICISM when neither persisted nor vulnerabilityBase is present', () => {
      const cast: CastMember[] = [{ id: 'char-1', name: 'Alice' }];
      const result = buildCharacterContinuity(cast);
      expect(result['char-1'].skepticism).toBe(DEFAULT_SKEPTICISM);
    });

    it('clamps resolved values to [0, 1]', () => {
      const cast: CastMember[] = [
        {
          id: 'char-1',
          name: 'Alice',
          vulnerabilityBase: { resilience: 0.5, skepticism: 2.5, baggage: 0.5 },
        },
        {
          id: 'char-2',
          name: 'Bob',
          vulnerabilityBase: { resilience: 0.5, skepticism: -1.0, baggage: 0.5 },
        },
      ];

      const result = buildCharacterContinuity(cast);
      expect(result['char-1'].skepticism).toBe(1);
      expect(result['char-2'].skepticism).toBe(0);
    });

    it('creates new objects and does not mutate inputs', () => {
      const cast: CastMember[] = [{ id: 'char-1', name: 'Alice' }];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.6 },
      };
      const castCopy = JSON.parse(JSON.stringify(cast));
      const persistedCopy = JSON.parse(JSON.stringify(persisted));

      const result = buildCharacterContinuity(cast, persisted);
      expect(cast).toEqual(castCopy);
      expect(persisted).toEqual(persistedCopy);
      expect(result['char-1']).not.toBe(persisted['char-1']);
    });
  });

  describe('applyCastSkepticismDeltas', () => {
    it('returns base continuity when deltas are empty or null', () => {
      const cast: CastMember[] = [{ id: 'char-1', name: 'Alice' }];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.6 },
      };

      const resNull = applyCastSkepticismDeltas(cast, persisted, null);
      expect(resNull['char-1'].skepticism).toBe(0.6);

      const resEmpty = applyCastSkepticismDeltas(cast, persisted, []);
      expect(resEmpty['char-1'].skepticism).toBe(0.6);
    });

    it('applies valid deltas clamped between -0.15 and 0.15 and bounds final skepticism to [0, 1]', () => {
      const cast: CastMember[] = [
        { id: 'char-1', name: 'Alice' },
        { id: 'char-2', name: 'Bob' },
        { id: 'char-3', name: 'Charlie' },
      ];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.5 },
        'char-2': { skepticism: 0.95 },
        'char-3': { skepticism: 0.05 },
      };

      const result = applyCastSkepticismDeltas(cast, persisted, [
        { character_id: 'char-1', skepticism_delta: 0.1 },
        { character_id: 'char-2', skepticism_delta: 0.5 }, // will clamp to +0.15, final clamped to 1.0
        { character_id: 'char-3', skepticism_delta: -0.5 }, // will clamp to -0.15, final clamped to 0.0
      ]);

      expect(result['char-1'].skepticism).toBeCloseTo(0.6);
      expect(result['char-2'].skepticism).toBe(1.0);
      expect(result['char-3'].skepticism).toBe(0.0);
    });

    it('ignores unknown IDs and applies only the first valid delta for duplicate IDs', () => {
      const cast: CastMember[] = [{ id: 'char-1', name: 'Alice' }];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.5 },
      };

      const result = applyCastSkepticismDeltas(cast, persisted, [
        { character_id: 'unknown-char', skepticism_delta: -0.1 },
        { character_id: 'char-1', skepticism_delta: 0.1 },
        { character_id: 'char-1', skepticism_delta: -0.15 }, // duplicate: should be ignored
      ]);

      expect(result['char-1'].skepticism).toBeCloseTo(0.6);
      expect(result['unknown-char']).toBeUndefined();
    });

    it('does not mutate input objects', () => {
      const cast: CastMember[] = [{ id: 'char-1', name: 'Alice' }];
      const persisted: CharacterContinuityById = {
        'char-1': { skepticism: 0.5 },
      };
      const deltas = [{ character_id: 'char-1', skepticism_delta: 0.1 }];

      const castCopy = JSON.parse(JSON.stringify(cast));
      const persistedCopy = JSON.parse(JSON.stringify(persisted));
      const deltasCopy = JSON.parse(JSON.stringify(deltas));

      applyCastSkepticismDeltas(cast, persisted, deltas);

      expect(cast).toEqual(castCopy);
      expect(persisted).toEqual(persistedCopy);
      expect(deltas).toEqual(deltasCopy);
    });
  });
});
