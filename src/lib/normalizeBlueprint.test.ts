import { describe, expect, it } from 'vitest';
import { normalizeBlueprint } from '../store/useAppStore';
import { BlueprintSchema } from '../types';

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

    const normalized = normalizeBlueprint(raw);
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

    const normalized = normalizeBlueprint(raw);
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

    const normalized = normalizeBlueprint(raw);
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

    const normalized = normalizeBlueprint(raw);
    const parsed = BlueprintSchema.parse(normalized);
    expect(parsed.userCharacterId).toBe('char_protagonist');
  });
});
