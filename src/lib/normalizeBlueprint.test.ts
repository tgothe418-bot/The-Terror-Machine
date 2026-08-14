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

  describe('undefined treated as missing with positive fallbacks', () => {
    it('falls back to valid top-level title when identity is undefined', () => {
      const raw = {
        title: 'Legacy Title',
        identity: undefined,
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.identity.title).toBe('Legacy Title');
      expect(result.title).toBe('Legacy Title');
    });

    it('falls back to valid identity.title when top-level title is undefined', () => {
      const raw = {
        identity: { title: 'Identity Title' },
        title: undefined,
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.identity.title).toBe('Identity Title');
      expect(result.title).toBe('Identity Title');
    });

    it('falls back to valid globalPremise when premise is undefined', () => {
      const raw = {
        globalPremise: 'Global Premise',
        premise: undefined,
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.premise).toBe('Global Premise');
    });

    it('falls back to valid premise when globalPremise is undefined', () => {
      const raw = {
        premise: 'Legacy Premise',
        globalPremise: undefined,
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.premise).toBe('Legacy Premise');
    });

    it('extracts legacy protagonist when userCharacterId is explicitly undefined', () => {
      const raw = {
        userCharacterId: undefined,
        perspectives: [
          { role: 'WITNESS', subjectCharacterId: 'char_witness' },
          { role: 'PROTAGONIST', subjectCharacterId: 'char_hero' },
        ],
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.userCharacterId).toBe('char_hero');
    });

    it('receives canonical topology defaults when topology is undefined', () => {
      const raw = {
        title: 'Undefined Topology Enclosure',
        topology: undefined,
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.topology.nodes).toEqual([]);
      expect(result.topology.connections).toEqual([]);
    });

    it('receives empty array when topology.connections is undefined', () => {
      const raw = {
        title: 'Undefined Connections Enclosure',
        topology: {
          nodes: ['ROOM_1'],
          connections: undefined,
        },
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.topology.nodes).toEqual(['ROOM_1']);
      expect(result.topology.connections).toEqual([]);
    });

    it('retains Phase 2A canonical inference when connection kind and/or userInitiated are undefined', () => {
      const raw = {
        identity: { title: 'Intent Inference' },
        topology: {
          nodes: ['N1', 'N2', 'N3', 'N4'],
          connections: [
            { from: 'N1', to: 'N2', kind: undefined, userInitiated: undefined },
            { from: 'N2', to: 'N3', kind: 'FORCED_EVENT', userInitiated: undefined },
            { from: 'N3', to: 'N4', kind: undefined, userInitiated: false },
          ],
        },
      };
      const result: Blueprint = normalizeBlueprint(raw);
      expect(result.topology.connections[0].kind).toBe('PHYSICAL');
      expect(result.topology.connections[0].userInitiated).toBe(true);
      expect(result.topology.connections[1].kind).toBe('FORCED_EVENT');
      expect(result.topology.connections[1].userInitiated).toBe(false);
      expect(result.topology.connections[2].kind).toBe('PHYSICAL');
      expect(result.topology.connections[2].userInitiated).toBe(false);
    });
  });
});
