import { describe, it, expect } from 'vitest';
import { BlueprintSchema } from '../../types';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { resolveSeatAvailabilities } from '../../lib/seatAvailability';
import blackIronMortuary from './black_iron_mortuary.json';

describe('Bespoke Test Blueprint: The Black Iron Mortuary', () => {
  it('validates cleanly against BlueprintSchema and normalizeBlueprint', () => {
    const normalized = normalizeBlueprint(blackIronMortuary as any);
    expect(normalized.title).toBe('The Black Iron Mortuary');
    const parsed = BlueprintSchema.parse(normalized);
    expect(parsed.id).toBe('blueprint-black-iron-mortuary');
    expect(parsed.topology.nodeDefinitions).toHaveLength(5);
    expect(parsed.cast).toHaveLength(3);
    expect(parsed.depictionContract?.directness).toContain('High-fidelity anatomical and medical accuracy');
  });

  it('resolves valid seats for Protagonist and Antagonist participation', () => {
    const normalized = normalizeBlueprint(blackIronMortuary as any);
    const seats = resolveSeatAvailabilities(normalized);
    expect(seats.protagonist.available).toBe(true);
    expect(seats.antagonist.available).toBe(true);
    expect(seats.director.available).toBe(true);
  });
});
