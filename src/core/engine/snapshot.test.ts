import { describe, it, expect } from 'vitest';
import { captureRuntimeSnapshot, isHorrorVector, isExposureTier } from './snapshot';

describe('captureRuntimeSnapshot', () => {
  it('retains valid horror vectors and exposure tiers', () => {
    const snapshot1 = captureRuntimeSnapshot({
      activeVector: 'SOMATIC',
      activeTier: 'GATEWAY',
      currentNodeId: 'NODE_ALPHA',
      turnCount: 4,
    });
    expect(snapshot1.activeVector).toBe('SOMATIC');
    expect(snapshot1.activeTier).toBe('GATEWAY');

    const snapshot2 = captureRuntimeSnapshot({
      activeVector: 'COSMIC',
      activeTier: 'MANIFEST',
    });
    expect(snapshot2.activeVector).toBe('COSMIC');
    expect(snapshot2.activeTier).toBe('MANIFEST');

    const snapshot3 = captureRuntimeSnapshot({
      activeVector: 'SOCIO_MORAL',
      activeTier: 'TERMINAL',
    });
    expect(snapshot3.activeVector).toBe('SOCIO_MORAL');
    expect(snapshot3.activeTier).toBe('TERMINAL');
  });

  it('resolves invalid or missing compatibility inputs through typed fallbacks', () => {
    const snapshot = captureRuntimeSnapshot({
      activeVector: 'INVALID_VECTOR',
      activeTier: 'INVALID_TIER',
      currentNodeId: undefined,
      turnCount: undefined,
      tensionLevel: undefined,
      coherence: undefined,
      decayRate: undefined,
      reconciliationRevision: undefined,
    });

    expect(snapshot.activeVector).toBe('COGNITIVE');
    expect(snapshot.activeTier).toBe('LATENT');
    expect(snapshot.currentNodeId).toBe('ORIGIN');
    expect(snapshot.turnCount).toBe(0);
    expect(snapshot.tension).toBe(0);
    expect(snapshot.coherence).toBe(1.0);
    expect(snapshot.decayRate).toBe(0);
    expect(snapshot.reconciliationRevision).toBe(0);
    expect(snapshot.phase).toBe('LATENT');
  });

  it('preserves all state fields required for turn context and receipts', () => {
    const snapshot = captureRuntimeSnapshot({
      sessionId: 'sess_123',
      blueprintId: 'bp_456',
      turnCount: 7,
      currentNodeId: 'SUITE_1408',
      activeVector: 'COSMIC',
      activeTier: 'MANIFEST',
      currentPhase: 'MANIFEST',
      tensionLevel: 42,
      coherence: 0.75,
      decayRate: 0.05,
      reconciliationRevision: 3,
    });

    expect(snapshot.version).toBe(1);
    expect(snapshot.sessionId).toBe('sess_123');
    expect(snapshot.blueprintId).toBe('bp_456');
    expect(snapshot.turnCount).toBe(7);
    expect(snapshot.currentNodeId).toBe('SUITE_1408');
    expect(snapshot.activeVector).toBe('COSMIC');
    expect(snapshot.activeTier).toBe('MANIFEST');
    expect(snapshot.phase).toBe('MANIFEST');
    expect(snapshot.tension).toBe(42);
    expect(snapshot.coherence).toBe(0.75);
    expect(snapshot.decayRate).toBe(0.05);
    expect(snapshot.reconciliationRevision).toBe(3);
  });

  it('produces a detached immutable copy of activeFlags and freezes snapshot', () => {
    const mutableSourceFlags = ['FLAG_PARANOIA', 'FLAG_BLOOD'];
    const snapshot = captureRuntimeSnapshot({
      activeFlags: mutableSourceFlags,
    });

    expect(snapshot.activeFlags).toEqual(['FLAG_PARANOIA', 'FLAG_BLOOD']);

    // Mutating the source array must not alter the captured snapshot
    mutableSourceFlags.push('FLAG_MUTATION_LEAK');
    expect(snapshot.activeFlags).toEqual(['FLAG_PARANOIA', 'FLAG_BLOOD']);

    // Snapshot and activeFlags must be frozen
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.activeFlags)).toBe(true);
  });

  it('validates HorrorVector and ExposureTier predicates correctly', () => {
    expect(isHorrorVector('SOMATIC')).toBe(true);
    expect(isHorrorVector('COGNITIVE')).toBe(true);
    expect(isHorrorVector('COSMIC')).toBe(true);
    expect(isHorrorVector('SOCIO_MORAL')).toBe(true);
    expect(isHorrorVector('OTHER')).toBe(false);
    expect(isHorrorVector(123)).toBe(false);
    expect(isHorrorVector(null)).toBe(false);

    expect(isExposureTier('GATEWAY')).toBe(true);
    expect(isExposureTier('LATENT')).toBe(true);
    expect(isExposureTier('MANIFEST')).toBe(true);
    expect(isExposureTier('TERMINAL')).toBe(true);
    expect(isExposureTier('UNKNOWN')).toBe(false);
  });

  it('captures live coherenceRating when provided as top-level property on source', () => {
    const snapshot = captureRuntimeSnapshot({
      coherenceRating: 0.45,
      tensionLevel: 65,
    });

    expect(snapshot.coherence).toBe(0.45);
    expect(snapshot.tension).toBe(65);
  });
});
