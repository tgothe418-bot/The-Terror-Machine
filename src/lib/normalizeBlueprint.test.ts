import { describe, expect, it } from 'vitest';
import { normalizeBlueprint } from '../store/useAppStore';

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
    expect(normalized.title).toBe('Haunted Mansion');
    expect(normalized.premise).toBe('Escape the manor.');
    expect(normalized.topology.connections).toHaveLength(2);
    expect(normalized.topology.connections[0]).toEqual({
      from: 'FOYER',
      to: 'LIBRARY',
      kind: 'physical',
      userInitiated: true,
      legacyUpgraded: true,
    });
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
    expect(normalized.topology.connections[0].kind).toBe('PHYSICAL');
    expect(normalized.topology.connections[1].kind).toBe('FORCED_EVENT');
    expect(normalized.topology.connections[2].kind).toBe('PHYSICAL');
    expect(normalized.title).toBe('Labyrinth');
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
    expect(normalized.userCharacterId).toBe('char_protagonist');
  });
});
