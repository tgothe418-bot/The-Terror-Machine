import { describe, it, expect } from 'vitest';
import { projectPresentationPatch } from './presentationProjection';
import type { LogicState } from '../../types';

describe('projectPresentationPatch', () => {
  it('returns empty object when logicState is null or undefined', () => {
    expect(projectPresentationPatch(null)).toEqual({});
    expect(projectPresentationPatch(undefined)).toEqual({});
  });

  it('projects presentation fields without including cast_deltas', () => {
    const logicState: LogicState = {
      inventory: ['RUSTED_KEY'],
      player_injuries: ['BRUISED_RIB'],
      lore_and_memory: {
        established_facts: ['fact-1'],
        permanent_consequences: [],
      },
      npc_fixations: ['DOOR_LOCK'],
      psychological_status: 'ELEVATED_HEART_RATE',
      cast_ledger: [{ id: 'id-1', skepticism: 0.5 }],
      cast_deltas: [
        {
          character_id: 'char-1',
          skepticism_delta: -0.1,
        },
      ],
    };

    const patch = projectPresentationPatch(logicState);

    expect(patch.inventory).toEqual(['RUSTED_KEY']);
    expect(patch.player_injuries).toEqual(['BRUISED_RIB']);
    expect(patch.lore_and_memory).toEqual({
      established_facts: ['fact-1'],
      permanent_consequences: [],
    });
    expect(patch.npc_fixations).toEqual(['DOOR_LOCK']);
    expect(patch.psychological_status).toBe('ELEVATED_HEART_RATE');
    expect(patch.cast_ledger).toBeDefined();

    // cast_deltas MUST NOT be projected into presentation patch
    expect((patch as Record<string, unknown>).cast_deltas).toBeUndefined();
  });
});
