import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { normalizeBlueprint } from './normalizeBlueprint';
import { Blueprint, BlueprintSchema } from '../types';

describe('normalizeBlueprint', () => {
  it('normalizes string-formatted topology connections', () => {
    const raw = {
      title: 'Haunted Mansion',
      globalPremise: 'Escape the manor.',
      topology: {
        nodes: ['FOYER', 'LIBRARY', 'CELLAR'],
        connections: ['FOYER -> LIBRARY', 'LIBRARY -> CELLAR'],
      },
    };

    const normalized: Blueprint = normalizeBlueprint(raw);
    const parsed = BlueprintSchema.parse(normalized);

    expect(parsed.title).toBe('Haunted Mansion');
    expect(parsed.premise).toBe('Escape the manor.');
    expect(parsed.topology.connections).toHaveLength(2);
    expect(parsed.topology.connections[0]).toEqual({
      from: 'FOYER',
      to: 'LIBRARY',
      kind: 'PHYSICAL',
      userInitiated: true,
      legacyUpgraded: true,
    });
    expect(parsed.topology.connections[0].from).toBe('FOYER');
    expect(parsed.topology.connections[0].to).toBe('LIBRARY');
    expect(parsed.topology.connections[0].kind).toBe('PHYSICAL');
    expect(parsed.topology.connections[0].userInitiated).toBe(true);
    expect(parsed.topology.connections[0].legacyUpgraded).toBe(true);
  });

  it('canonicalizes connection kind variations and infers default userInitiated based on canonical kind', () => {
    const raw = {
      identity: { title: 'Labyrinth' },
      topology: {
        nodes: ['A', 'B', 'C'],
        connections: [
          { from: 'A', to: 'B', kind: 'spatial' },
          { from: 'B', to: 'C', kind: 'narrative' },
          { from: 'C', to: 'A', kind: 'UNKNOWN_KIND' },
        ],
      },
    };

    const normalized: Blueprint = normalizeBlueprint(raw);
    const parsed = BlueprintSchema.parse(normalized);
    expect(parsed.topology.connections[0].kind).toBe('PHYSICAL');
    expect(parsed.topology.connections[0].userInitiated).toBe(true);
    expect(parsed.topology.connections[1].kind).toBe('FORCED_EVENT');
    expect(parsed.topology.connections[1].userInitiated).toBe(false);
    expect(parsed.topology.connections[2].kind).toBe('PHYSICAL');
    expect(parsed.topology.connections[2].userInitiated).toBe(true);
    expect(parsed.identity.title).toBe('Labyrinth');
  });

  it('preserves explicitly authored userInitiated boolean values regardless of kind', () => {
    const raw = {
      identity: { title: 'Explicit Intent' },
      topology: {
        nodes: ['N1', 'N2', 'N3'],
        connections: [
          { from: 'N1', to: 'N2', kind: 'PHYSICAL', userInitiated: false },
          { from: 'N2', to: 'N3', kind: 'FORCED_EVENT', userInitiated: true },
          { from: 'N3', to: 'N1', kind: 'MEMORY_RECONSTRUCTION', userInitiated: true },
        ],
      },
    };

    const normalized: Blueprint = normalizeBlueprint(raw);
    const parsed = BlueprintSchema.parse(normalized);
    expect(parsed.topology.connections[0].kind).toBe('PHYSICAL');
    expect(parsed.topology.connections[0].userInitiated).toBe(false);
    expect(parsed.topology.connections[1].kind).toBe('FORCED_EVENT');
    expect(parsed.topology.connections[1].userInitiated).toBe(true);
    expect(parsed.topology.connections[2].kind).toBe('MEMORY_RECONSTRUCTION');
    expect(parsed.topology.connections[2].userInitiated).toBe(true);
  });

  it('extracts protagonist ID from legacy perspectives structure', () => {
    const raw = {
      identity: { title: 'Test Scenario' },
      perspectives: [
        { role: 'WITNESS', subjectCharacterId: 'char_witness' },
        { role: 'PROTAGONIST', subjectCharacterId: 'char_protagonist' },
      ],
    };

    const normalized: Blueprint = normalizeBlueprint(raw);
    const parsed = BlueprintSchema.parse(normalized);
    expect(parsed.userCharacterId).toBe('char_protagonist');
  });

  it('fails safely through validation for non-object roots like null and arrays', () => {
    expect(() => normalizeBlueprint(null)).toThrow(ZodError);
    expect(() => normalizeBlueprint([])).toThrow(ZodError);
    expect(() => normalizeBlueprint('string-input')).toThrow(ZodError);
    expect(() => normalizeBlueprint(12345)).toThrow(ZodError);
  });

  it('rejects explicitly malformed non-boolean userInitiated values', () => {
    const raw = {
      identity: { title: 'Malformed Intent' },
      topology: {
        nodes: ['N1', 'N2'],
        connections: [
          { from: 'N1', to: 'N2', kind: 'PHYSICAL', userInitiated: 'not-a-boolean' },
        ],
      },
    };

    expect(() => normalizeBlueprint(raw)).toThrow(ZodError);
  });

  it('applies canonical schema defaults on legacy input with missing sections', () => {
    const raw = {
      title: 'Minimal Enclosure',
    };

    const result: Blueprint = normalizeBlueprint(raw);
    expect(result.identity.title).toBe('Minimal Enclosure');
    expect(result.identity.version).toBe('1.0');
    expect(result.setting.location).toBe('Unknown');
    expect(result.setting.timePeriod).toBe('Present');
    expect(result.contentScale).toBe(3);
    expect(result.cast).toHaveLength(1);
    expect(result.topology.nodes).toEqual([]);
    expect(result.topology.connections).toEqual([]);
  });

  describe('explicit malformed field rejection (ZodError)', () => {
    it.each([
      ['identity: 42', { identity: 42 }],
      ['identity: []', { identity: [] }],
      ['identity: { title: 42 } with valid top-level title', { title: 'Valid Title', identity: { title: 42 } }],
      ['topology: "bad"', { topology: 'bad' }],
      ['topology: null', { topology: null }],
      ['topology: { connections: "bad" }', { topology: { connections: 'bad' } }],
      ['userCharacterId: 99', { userCharacterId: 99 }],
      ['title: 99', { title: 99 }],
      ['premise: { bad: true }', { premise: { bad: true } }],
      ['globalPremise: 99', { globalPremise: 99 }],
      ['connection kind: 42', { topology: { connections: [{ from: 'A', to: 'B', kind: 42, userInitiated: true }] } }],
      ['connection kind: null', { topology: { connections: [{ from: 'A', to: 'B', kind: null, userInitiated: true }] } }],
    ])('rejects explicitly malformed %s', (_, raw) => {
      expect(() => normalizeBlueprint(raw)).toThrow(ZodError);
    });
  });
});
