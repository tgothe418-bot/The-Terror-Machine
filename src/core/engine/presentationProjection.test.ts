import { describe, it, expect } from 'vitest';
import { projectPresentationPatch } from './presentationProjection';
import { LogicState } from '../../types';

describe('presentationProjection', () => {
  it('produces no presentation patch for raw cast_deltas alone', () => {
    const logicState: LogicState = {
      cast_deltas: [
        { character_id: 'char-1', skepticism_delta: 0.1 },
        { character_id: 'char-2', skepticism_delta: -0.05 },
      ],
    };

    const patch = projectPresentationPatch(logicState);
    expect(patch).toEqual({});
    expect('cast_deltas' in patch).toBe(false);
  });

  it('preserves existing supported presentation fields', () => {
    const logicState: LogicState = {
      inventory: ['brass_key'],
      player_injuries: ['bruised_wrist'],
      lore_and_memory: ['The relay was built in 2088.'],
      npc_fixations: ['terminal_door'],
      psychological_status: 'PARANOID',
      cast_ledger: [{ id: 'char-1', name: 'Dr. Evans' }],
      cast_deltas: [{ character_id: 'char-1', skepticism_delta: 0.1 }],
    };

    const patch = projectPresentationPatch(logicState);
    expect(patch).toEqual({
      inventory: ['brass_key'],
      player_injuries: ['bruised_wrist'],
      lore_and_memory: ['The relay was built in 2088.'],
      npc_fixations: ['terminal_door'],
      psychological_status: 'PARANOID',
      cast_ledger: [{ id: 'char-1', name: 'Dr. Evans' }],
    });
    expect('cast_deltas' in patch).toBe(false);
  });
});
