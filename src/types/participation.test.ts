import { describe, it, expect } from 'vitest';
import {
  AuthorityContractSchema,
  OppositionSeatSchema,
  ParticipationSeatSchema,
  normalizeParticipationContext,
  MAX_AUTHORITY_LENGTH,
  MAX_SEAT_ABILITY_LENGTH,
} from './participation';

describe('Participation Schemas Hardening (2,500 Character Caps & Sanitization)', () => {
  it('accepts authority strings up to 2,500 characters', () => {
    const longAuthority = 'A'.repeat(2500);
    const parsed = AuthorityContractSchema.parse({
      authority: longAuthority,
      limits: 'Cannot harm innocent bystanders without provocation.',
    });
    expect(parsed.authority.length).toBe(2500);
  });

  it('safely truncates authority strings longer than 2,500 characters instead of throwing too_big', () => {
    const excessiveAuthority = 'B'.repeat(3000);
    const parsed = AuthorityContractSchema.parse({
      authority: excessiveAuthority,
      limits: 'Strictly bounded to authored node topology.',
    });
    expect(parsed.authority.length).toBe(MAX_AUTHORITY_LENGTH);
    expect(parsed.authority).toBe('B'.repeat(2500));
  });

  it('accepts seat ability up to 2,500 characters', () => {
    const longAbility = 'C'.repeat(2500);
    const parsed = ParticipationSeatSchema.parse({
      kind: 'villain',
      name: 'The Obsidian Sovereign',
      ability: longAbility,
      limitation: 'Cannot leave the ritual circle.',
    });
    expect(parsed.ability?.length).toBe(2500);
  });

  it('safely truncates seat ability longer than 2,500 characters', () => {
    const excessiveAbility = 'D'.repeat(3200);
    const parsed = ParticipationSeatSchema.parse({
      kind: 'force',
      name: 'The Looming Shadow',
      ability: excessiveAbility,
    });
    expect(parsed.ability?.length).toBe(MAX_SEAT_ABILITY_LENGTH);
    expect(parsed.ability).toBe('D'.repeat(2500));
  });

  it('accepts opposition seat ability and limitation up to 2,500 characters', () => {
    const longAbility = 'E'.repeat(2500);
    const parsed = OppositionSeatSchema.parse({
      kind: 'character',
      name: 'Nemesis',
      description: 'An ancient relentless hunter.',
      goal: 'Eliminate the intruders.',
      ability: longAbility,
      limitation: longAbility,
    });
    expect(parsed.ability?.length).toBe(2500);
    expect(parsed.limitation?.length).toBe(2500);
  });

  it('safely clamps fallback authority in normalizeParticipationContext to 2,500 characters', () => {
    const context = normalizeParticipationContext({
      mode: 'antagonist',
      initialGoal: 'Claim the sanctum',
      boundedFacts: ['The door is locked'],
      seat: {
        kind: 'force',
        name: 'The Malice',
        ability: 'F'.repeat(4000),
      },
    });

    expect(context).not.toBeNull();
    expect(context?.authorityContract?.authority.length).toBe(MAX_AUTHORITY_LENGTH);
    expect(context?.authorityContract?.authority).toBe('F'.repeat(2500));
  });
});
