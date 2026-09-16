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

  it('binds Entity-41 apparatus controls and prey cohort into Antagonist participation context', async () => {
    const { buildActiveParticipationContext } = await import('../../lib/seatAvailability');
    const normalized = normalizeBlueprint(blackIronMortuary as any);
    expect(normalized.antagonistProfile).toBeDefined();
    expect(normalized.antagonistProfile?.name).toBe('Entity-41 (The Suture Apparatus)');
    expect(normalized.antagonistProfile?.apparatusControls).toHaveLength(4);
    expect(normalized.antagonistProfile?.preyCohort).toHaveLength(2);

    const context = buildActiveParticipationContext(normalized, 'antagonist');
    expect(context).not.toBeNull();
    expect(context?.mode).toBe('antagonist');
    expect(context?.authorityContract?.authority).toContain('Authorized to actuate facility apparatus');
    expect(context?.authorityContract?.limits).toContain('Preserve physiological viability');
    expect(context?.victimField?.kind).toBe('group');
    if (context?.victimField?.kind === 'group') {
      expect(context.victimField.members).toHaveLength(2);
      expect(context.victimField.members[0].name).toBe('Dr. Maren Ross');
      expect(context.victimField.members[1].name).toBe('Officer Marcus Holt');
    }
  });
});
