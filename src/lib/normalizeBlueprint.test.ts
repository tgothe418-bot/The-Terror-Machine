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

  it('canonicalizes connection kind variations', () => {
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
    expect(parsed.topology.connections[1].kind).toBe('FORCED_EVENT');
    expect(parsed.topology.connections[2].kind).toBe('PHYSICAL');
    expect(parsed.identity.title).toBe('Labyrinth');
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
