import { describe, it, expect } from 'vitest';
import { resolveCharacterEntryPlacement } from './resolveCharacterEntryPlacement';
import { Blueprint } from '../types';
import { normalizeBlueprint } from './normalizeBlueprint';

describe('resolveCharacterEntryPlacement', () => {
  const baseBlueprint: Blueprint = normalizeBlueprint({
    title: 'Entry Placement Test',
    premise: 'Testing character-relative entry resolution.',
    cast: [
      {
        id: 'char-elena',
        name: 'Elena',
        role: 'PROTAGONIST',
        isEntity: false,
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'MED_BAY' },
      },
      {
        id: 'char-kane',
        name: 'Kane',
        role: 'SENTINEL',
        isEntity: false,
        starting_location: 'CARGO_HOLD',
      },
      {
        id: 'char-ghost',
        name: 'Phantom',
        role: 'ANTAGONIST',
        isEntity: true,
        presenceDisposition: { kind: 'NONLOCAL' },
      },
      {
        id: 'char-offstage',
        name: 'Novak',
        role: 'OBSERVER',
        isEntity: false,
        presenceDisposition: { kind: 'OFFSTAGE' },
      },
    ],
    topology: {
      startingNodeId: 'AIRLOCK_ALPHA',
      nodes: ['AIRLOCK_ALPHA', 'MED_BAY', 'CARGO_HOLD', 'REACTOR_CORE'],
      nodeDefinitions: [
        { id: 'AIRLOCK_ALPHA', label: 'Airlock Alpha', description: 'Vestibule' },
        { id: 'MED_BAY', label: 'Medical Bay', description: 'Sterile bay' },
        { id: 'CARGO_HOLD', label: 'Cargo Hold', description: 'Storage' },
        { id: 'REACTOR_CORE', label: 'Reactor Core', description: 'Core' },
      ],
      connections: [],
    },
  });

  it('resolves entry node from selected character presenceDisposition AT_NODE', () => {
    const entry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: 'char-elena',
    });
    expect(entry).toBe('MED_BAY');
  });

  it('resolves entry node from selected character starting_location', () => {
    const entry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: 'char-kane',
    });
    expect(entry).toBe('CARGO_HOLD');
  });

  it('falls back to startingNodeId when character is offstage or nonlocal', () => {
    const ghostEntry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: 'char-ghost',
    });
    expect(ghostEntry).toBe('AIRLOCK_ALPHA');

    const offstageEntry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: 'char-offstage',
    });
    expect(offstageEntry).toBe('AIRLOCK_ALPHA');
  });

  it('falls back to startingNodeId when characterId is null or unknown', () => {
    const nullEntry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: null,
    });
    expect(nullEntry).toBe('AIRLOCK_ALPHA');

    const unknownEntry = resolveCharacterEntryPlacement({
      blueprint: baseBlueprint,
      characterId: 'char-unknown',
    });
    expect(unknownEntry).toBe('AIRLOCK_ALPHA');
  });

  it('falls back to first nodeDefinition when startingNodeId is absent', () => {
    const bpNoStart = {
      ...baseBlueprint,
      topology: {
        ...baseBlueprint.topology,
        startingNodeId: undefined,
      },
    };

    const entry = resolveCharacterEntryPlacement({
      blueprint: bpNoStart,
      characterId: null,
    });
    expect(entry).toBe('AIRLOCK_ALPHA');
  });

  it('falls back to default fallback when topology is completely empty', () => {
    const bpEmpty = {
      ...baseBlueprint,
      topology: {
        nodes: [],
        nodeDefinitions: [],
        connections: [],
        anchors: [],
      },
    };

    const entry = resolveCharacterEntryPlacement({
      blueprint: bpEmpty,
      characterId: null,
      defaultFallbackNodeId: 'STATION_ORIGIN',
    });
    expect(entry).toBe('STATION_ORIGIN');
  });
});
