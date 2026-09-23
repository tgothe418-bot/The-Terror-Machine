import { describe, it, expect } from 'vitest';
import { isVillainCastMember } from './castVillain';

describe('isVillainCastMember', () => {
  it('returns true when disposition is VILLAIN (case-insensitive)', () => {
    expect(isVillainCastMember({ disposition: 'VILLAIN' })).toBe(true);
    expect(isVillainCastMember({ disposition: 'villain' })).toBe(true);
    expect(isVillainCastMember({ disposition: ' Villain ' })).toBe(true);
  });

  it('returns true when isEntity is true', () => {
    expect(isVillainCastMember({ isEntity: true })).toBe(true);
    expect(isVillainCastMember({ isEntity: true, disposition: 'SURVIVOR' })).toBe(true);
  });

  it('returns true when role is ANTAGONIST or VILLAIN (case-insensitive)', () => {
    expect(isVillainCastMember({ role: 'Antagonist' })).toBe(true);
    expect(isVillainCastMember({ role: 'antagonist' })).toBe(true);
    expect(isVillainCastMember({ role: 'VILLAIN' })).toBe(true);
    expect(isVillainCastMember({ role: '  Antagonist  ' })).toBe(true);
  });

  it('returns false for mortal survivors or bystanders', () => {
    expect(isVillainCastMember({ disposition: 'SURVIVOR', isEntity: false, role: 'Survivor' })).toBe(false);
    expect(isVillainCastMember({ disposition: 'BYSTANDER', isEntity: false, role: 'Bystander' })).toBe(false);
    expect(isVillainCastMember({ isEntity: false, role: 'Protagonist' })).toBe(false);
  });

  it('handles null, undefined, and non-object inputs safely', () => {
    expect(isVillainCastMember(null)).toBe(false);
    expect(isVillainCastMember(undefined)).toBe(false);
    expect(isVillainCastMember({})).toBe(false);
  });
});
