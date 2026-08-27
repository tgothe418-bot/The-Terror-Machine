import { describe, expect, it } from 'vitest';
import { compileRuntimeTopology } from './compileRuntimeTopology';

describe('compileRuntimeTopology', () => {
  it('compiles authored nodes and directional connections into SpatialNode[] graph', () => {
    const topology = {
      nodes: ['FOYER', 'LIBRARY', 'CELLAR'],
      connections: [
        {
          from: 'FOYER',
          to: 'LIBRARY',
          kind: 'PHYSICAL' as const,
          requires: ['BRASS_KEY'],
          userInitiated: true,
        },
        {
          from: 'LIBRARY',
          to: 'FOYER',
          kind: 'PHYSICAL' as const,
          userInitiated: true,
        },
        {
          from: 'LIBRARY',
          to: 'CELLAR',
          kind: 'FORCED_EVENT' as const,
          userInitiated: false,
        },
      ],
    };

    const result = compileRuntimeTopology({ topology });
    expect(result.startNodeId).toBe('FOYER');
    expect(result.spatialGraph).toHaveLength(3);

    const foyer = result.spatialGraph.find((n) => n.id === 'FOYER');
    expect(foyer).toBeDefined();
    expect(foyer?.connectedNodes).toEqual(['LIBRARY']);
    expect(foyer?.exits).toHaveLength(1);
    expect(foyer?.exits[0]).toEqual({
      targetNodeId: 'LIBRARY',
      description: 'LIBRARY',
      isOpen: true,
      kind: 'PHYSICAL',
      requires: ['BRASS_KEY'],
      userInitiated: true,
    });

    const library = result.spatialGraph.find((n) => n.id === 'LIBRARY');
    expect(library?.connectedNodes).toEqual(['FOYER', 'CELLAR']);
    expect(library?.exits).toHaveLength(2);
    expect(library?.exits[1].userInitiated).toBe(false);

    const cellar = result.spatialGraph.find((n) => n.id === 'CELLAR');
    expect(cellar?.connectedNodes).toEqual([]);
    expect(cellar?.exits).toEqual([]);
  });

  it('preserves authored labels and descriptions from nodeDefinitions and respects explicit startingNodeId', () => {
    const topology = {
      startingNodeId: 'CRYPTO_VAULT',
      nodes: ['ATRIUM', 'CRYPTO_VAULT'],
      nodeDefinitions: [
        {
          id: 'ATRIUM',
          label: 'Central Atrium',
          description: 'Soaring glass arches covered in frost.',
        },
        {
          id: 'CRYPTO_VAULT',
          label: 'Subterranean Vault',
          description: 'Heavy reinforced pressure doors and humming servers.',
        },
      ],
      connections: [
        {
          from: 'CRYPTO_VAULT',
          to: 'ATRIUM',
          kind: 'PHYSICAL' as const,
          userInitiated: true,
        },
      ],
      anchors: [
        {
          id: 'vault-vent',
          parentNodeId: 'CRYPTO_VAULT',
          label: 'Vault Vent Line',
          description: 'Secondary air duct.',
          statement: 'Not a runtime node yet',
        },
      ],
    };

    const result = compileRuntimeTopology({ topology });
    expect(result.startNodeId).toBe('CRYPTO_VAULT');
    expect(result.spatialGraph).toHaveLength(2);

    const vault = result.spatialGraph.find((n) => n.id === 'CRYPTO_VAULT');
    expect(vault?.name).toBe('Subterranean Vault');
    expect(vault?.description).toBe('Heavy reinforced pressure doors and humming servers.');
    expect(vault?.connectedNodes).toEqual(['ATRIUM']);
    expect(vault?.exits).toHaveLength(1);

    const atrium = result.spatialGraph.find((n) => n.id === 'ATRIUM');
    expect(atrium?.name).toBe('Central Atrium');
    expect(atrium?.description).toBe('Soaring glass arches covered in frost.');
    // Atrium has no outgoing connection, so zero exits (no implicit reverse edge)
    expect(atrium?.connectedNodes).toEqual([]);
    expect(atrium?.exits).toEqual([]);

    // Anchors must NOT appear in the spatial graph
    const anchorNode = result.spatialGraph.find((n) => n.id === 'vault-vent');
    expect(anchorNode).toBeUndefined();
  });

  it('generates a fallback origin node when topology is empty', () => {
    const result = compileRuntimeTopology({
      topology: { nodes: [], connections: [] },
      fallbackSetting: { location: 'The Attic Observatory', atmosphere: 'Dusty and quiet' },
    });

    expect(result.startNodeId).toBe('THE_ATTIC_OBSERVATORY');
    expect(result.spatialGraph).toHaveLength(1);
    expect(result.spatialGraph[0].id).toBe('THE_ATTIC_OBSERVATORY');
    expect(result.spatialGraph[0].name).toBe('The Attic Observatory');
    expect(result.spatialGraph[0].description).toBe('Dusty and quiet');
    expect(result.spatialGraph[0].exits).toEqual([]);
  });
});
