import { describe, expect, it } from 'vitest';
import {
  createInitialFictionalTimeLedger,
  advanceFictionalTimeLedger,
} from './fictionalTime';
import type { FictionalTimeLedger } from '../types/horrorGrammar';

describe('Fictional Time Ledger & Receipts (Packet 1-2)', () => {
  it('creates neutral initial ledger with all revisions at zero and last_cost null', () => {
    const initial = createInitialFictionalTimeLedger();
    expect(initial).toEqual({
      moment_revision: 0,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: null,
    });
  });

  it('advances MOMENT: increments moment_revision only', () => {
    const pre: FictionalTimeLedger = {
      moment_revision: 3,
      scene_beat_revision: 1,
      extended_revision: 0,
      last_cost: 'MOMENT',
    };

    const receipt = advanceFictionalTimeLedger(pre, 'MOMENT');
    expect(receipt.version).toBe(1);
    expect(receipt.acceptedCost).toBe('MOMENT');
    expect(receipt.preState).toEqual(pre);
    expect(receipt.postState).toEqual({
      moment_revision: 4,
      scene_beat_revision: 1,
      extended_revision: 0,
      last_cost: 'MOMENT',
    });
  });

  it('advances SCENE_BEAT: increments moment_revision and scene_beat_revision', () => {
    const pre: FictionalTimeLedger = {
      moment_revision: 4,
      scene_beat_revision: 1,
      extended_revision: 0,
      last_cost: 'MOMENT',
    };

    const receipt = advanceFictionalTimeLedger(pre, 'SCENE_BEAT');
    expect(receipt.acceptedCost).toBe('SCENE_BEAT');
    expect(receipt.postState).toEqual({
      moment_revision: 5,
      scene_beat_revision: 2,
      extended_revision: 0,
      last_cost: 'SCENE_BEAT',
    });
  });

  it('advances EXTENDED: increments moment_revision, scene_beat_revision, and extended_revision', () => {
    const pre: FictionalTimeLedger = {
      moment_revision: 5,
      scene_beat_revision: 2,
      extended_revision: 0,
      last_cost: 'SCENE_BEAT',
    };

    const receipt = advanceFictionalTimeLedger(pre, 'EXTENDED');
    expect(receipt.acceptedCost).toBe('EXTENDED');
    expect(receipt.postState).toEqual({
      moment_revision: 6,
      scene_beat_revision: 3,
      extended_revision: 1,
      last_cost: 'EXTENDED',
    });
  });

  it('handles UNCLEAR: leaves all revisions unchanged but updates last_cost', () => {
    const pre: FictionalTimeLedger = {
      moment_revision: 6,
      scene_beat_revision: 3,
      extended_revision: 1,
      last_cost: 'EXTENDED',
    };

    const receipt = advanceFictionalTimeLedger(pre, 'UNCLEAR');
    expect(receipt.acceptedCost).toBe('UNCLEAR');
    expect(receipt.postState).toEqual({
      moment_revision: 6,
      scene_beat_revision: 3,
      extended_revision: 1,
      last_cost: 'UNCLEAR',
    });
  });

  it('falls back safely when preState is null/undefined', () => {
    const receipt = advanceFictionalTimeLedger(null, 'MOMENT');
    expect(receipt.preState).toEqual({
      moment_revision: 0,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: null,
    });
    expect(receipt.postState).toEqual({
      moment_revision: 1,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: 'MOMENT',
    });
  });

  it('respects MAX_SAFE_INTEGER bounds without overflow error', () => {
    const maxPre: FictionalTimeLedger = {
      moment_revision: Number.MAX_SAFE_INTEGER,
      scene_beat_revision: Number.MAX_SAFE_INTEGER,
      extended_revision: Number.MAX_SAFE_INTEGER,
      last_cost: 'EXTENDED',
    };

    const receipt = advanceFictionalTimeLedger(maxPre, 'EXTENDED');
    expect(receipt.postState.moment_revision).toBe(Number.MAX_SAFE_INTEGER);
    expect(receipt.postState.scene_beat_revision).toBe(Number.MAX_SAFE_INTEGER);
    expect(receipt.postState.extended_revision).toBe(Number.MAX_SAFE_INTEGER);
  });
});
