import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';

describe('Session initialization canonical authority', () => {
  beforeEach(() => {
    // Reset stores
  });

  it('initializes canonical session state in AppStore with correct node, vector, and tier authority', () => {
    const customBlueprint = {
      id: 'bp_authority_01',
      title: 'The Subterranean Vault',
      startingVector: 'SOMATIC',
      startingTier: 'GATEWAY',
      topology: {
        nodes: ['VAULT_ENTRANCE', 'INNER_CHAMBER'],
        connections: ['VAULT_ENTRANCE -> INNER_CHAMBER'],
      },
    };

    // Initialize session through canonical store action
    useAppStore.getState().initializeSession({
      blueprint: customBlueprint,
      sessionId: 'session_auth_101',
    });

    const canonicalState = useAppStore.getState();

    // Canonical store holds the single source of truth for runtime position and coordinates
    expect(canonicalState.sessionId).toBe('session_auth_101');
    expect(canonicalState.blueprintId).toBe('bp_authority_01');
    expect(canonicalState.currentNodeId).toBe('VAULT_ENTRANCE');
    expect(canonicalState.activeVector).toBe('SOMATIC');
    expect(canonicalState.activeTier).toBe('GATEWAY');
    expect(canonicalState.turnCount).toBe(0);
    expect(canonicalState.phase).toBe('LATENT');
    expect(canonicalState.tensionLevel).toBe(0);

    // EngineStore must NOT store independent coordinate copies or mutable turn counters
    const engineStoreState = useEngineStore.getState() as unknown as Record<string, unknown>;
    expect(engineStoreState.activeVector).toBeUndefined();
    expect(engineStoreState.activeTier).toBeUndefined();
    expect(engineStoreState.turnCount).toBeUndefined();
    expect(engineStoreState.incrementTurn).toBeUndefined();
    expect(engineStoreState.updateTension).toBeUndefined();
  });

  it('honors a validated character-relative entry node over the Blueprint default', () => {
    useAppStore.getState().initializeSession({
      blueprint: {
        id: 'bp-entry-node',
        topology: {
          nodes: ['NODE_DEFAULT', 'NODE_SELECTED'],
          connections: [],
          startingNodeId: 'NODE_DEFAULT',
        },
      },
      entryNodeId: 'NODE_SELECTED',
    });

    expect(useAppStore.getState().currentNodeId).toBe('NODE_SELECTED');
  });

  it('rejects a character entry node missing from the compiled runtime topology', () => {
    expect(() =>
      useAppStore.getState().initializeSession({
        blueprint: { topology: { nodes: ['NODE_DEFAULT'], connections: [] } },
        entryNodeId: 'NODE_MISSING',
      })
    ).toThrow('Engine entry node "NODE_MISSING" is not present in the compiled runtime topology.');
  });
});
