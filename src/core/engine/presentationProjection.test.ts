import { describe, it, expect } from 'vitest';
import { projectPresentationPatch } from './presentationProjection';
import type { LogicState } from '../../types';

describe('projectPresentationPatch', () => {
  it('returns empty object when logicState is null or undefined', () => {
    expect(projectPresentationPatch(null)).toEqual({});
    expect(projectPresentationPatch(undefined)).toEqual({});
  });

  it('projects only presentation fields (npc_fixations, cast_ledger)', () => {
    const logicState: LogicState = {
      npc_fixations: ['DOOR_LOCK'],
      cast_ledger: [{ id: 'id-1', skepticism: 0.5 }],
    };

    const patch = projectPresentationPatch(logicState);

    expect(patch.npc_fixations).toEqual(['DOOR_LOCK']);
    expect(patch.cast_ledger).toEqual([{ id: 'id-1', skepticism: 0.5 }]);
  });

  it('adversarial test: strictly strips all forbidden consequence and canonical fields', () => {
    const adversarialLogicState: LogicState & Record<string, unknown> = {
      // Forbidden canonical consequence fields
      inventory: ['RUSTED_KEY', 'IRON_CROWBAR'],
      player_injuries: ['BRUISED_RIB', 'LACERATED_HAND'],
      psychological_status: 'ELEVATED_HEART_RATE',
      lore_and_memory: {
        established_facts: ['fact-1'],
        permanent_consequences: [],
      },
      // Allowed presentation fields
      npc_fixations: ['DOOR_LOCK'],
      cast_ledger: [{ id: 'id-1', skepticism: 0.5 }],
      // Forbidden canonical state fields
      cast_deltas: [
        {
          character_id: 'char-1',
          skepticism_delta: -0.1,
        },
      ],
      current_phase: 'MANIFEST',
      suggested_tension: 75,
      terminal_flags: ['FLAG_DOOM'],
      current_location: 'THE_CRYPT',
      currentNodeId: 'NODE_CRYPT',
      turnCount: 42,
      activeVector: 'SOMATIC',
      activeTier: 'MANIFEST',
      spatialGraph: [{ id: 'NODE_CRYPT', name: 'Crypt', description: '', exits: [] }],
    };

    const patch = projectPresentationPatch(adversarialLogicState);
    const patchRecord = patch as Record<string, unknown>;

    // Allowed fields
    expect(patch.npc_fixations).toEqual(['DOOR_LOCK']);
    expect(patch.cast_ledger).toEqual([{ id: 'id-1', skepticism: 0.5 }]);

    // Forbidden consequence fields MUST NOT be present
    expect(patch.inventory).toBeUndefined();
    expect(patch.player_injuries).toBeUndefined();
    expect(patch.psychological_status).toBeUndefined();
    expect(patch.lore_and_memory).toBeUndefined();
    expect(patchRecord.inventory).toBeUndefined();
    expect(patchRecord.player_injuries).toBeUndefined();
    expect(patchRecord.psychological_status).toBeUndefined();
    expect(patchRecord.lore_and_memory).toBeUndefined();

    // Forbidden canonical/continuity fields MUST NOT be present
    expect(patchRecord.cast_deltas).toBeUndefined();
    expect(patchRecord.current_phase).toBeUndefined();
    expect(patchRecord.suggested_tension).toBeUndefined();
    expect(patchRecord.terminal_flags).toBeUndefined();
    expect(patchRecord.current_location).toBeUndefined();
    expect(patchRecord.currentNodeId).toBeUndefined();
    expect(patchRecord.turnCount).toBeUndefined();
    expect(patchRecord.activeVector).toBeUndefined();
    expect(patchRecord.activeTier).toBeUndefined();
    expect(patchRecord.spatialGraph).toBeUndefined();

    // The returned patch contains ONLY the allowed keys
    expect(Object.keys(patch)).toEqual(['npc_fixations', 'cast_ledger']);
  });
});

