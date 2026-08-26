import { describe, it, expect, beforeEach } from 'vitest';
import {
  coordinateCanonicalTurnPublication,
  getCanonicalSimulationState,
  isCanonicalPublicationInProgress,
  filterAllowlistedPresentationPatch,
} from './commitCoordinator';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';
import type { CommittedTurnPayload } from './events';
import type { LogicState } from '../../types';
import { captureRuntimeSnapshot } from './snapshot';

describe('Canonical Commit Coordinator', () => {
  beforeEach(() => {
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();
  });

  it('1. publishes canonical application state and situated game state atomically and coherently', () => {
    const startAppState = useAppStore.getState();
    const preSnapshot = captureRuntimeSnapshot(startAppState);

    const committedPayload: CommittedTurnPayload = {
      commandText: 'Examine the vault seal',
      formattedText: 'The heavy iron bolt is cold and tightly locked.',
      preSnapshot,
      frame: {
        narrative_blocks: [
          { type: 'prose', content: 'The heavy iron bolt is cold and tightly locked.' },
        ],
        logic_state: {
          suggested_tension: 40,
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 40,
        preSnapshot,
      },
    };

    const preparedGameState: LogicState = {
      current_location: 'ORIGIN',
      inventory: ['brass_key'],
      player_injuries: ['bruised_shoulder'],
      psychological_status: 'Heightened vigilance',
      character_stance: {
        'char-protagonist': {
          stance: 'GUARDED',
          focus: 'PLAYER',
        },
      },
      character_relationships: [],
      character_memory: {
        'char-protagonist': [
          {
            id: 'fact-1',
            fact: 'Vault door is iron',
            source: 'OBSERVED',
            certainty: 'KNOWN',
            acquired_turn: 1,
          },
        ],
      },
      world_memory: [
        {
          id: 'fact-1',
          kind: 'ESTABLISHED_FACT',
          scope: 'GLOBAL',
          statement: 'Vault door is iron',
          established_turn: 1,
        },
      ],
      character_continuity: {},
      character_presence: {},
    };

    coordinateCanonicalTurnPublication({
      appStore: useAppStore,
      engineStore: useEngineStore,
      committedPayload,
      preparedGameState,
      presentationPatch: { current_tension_level: 'buildup' },
    });

    const canonicalState = getCanonicalSimulationState();
    expect(canonicalState.turnNumber).toBe(1);
    expect(canonicalState.app.turnCount).toBe(1);
    expect(canonicalState.app.history).toHaveLength(2); // user + assistant
    expect(canonicalState.gameState?.inventory).toEqual(['brass_key']);
    expect(canonicalState.gameState?.player_injuries).toEqual(['bruised_shoulder']);
    expect(canonicalState.gameState?.world_memory?.[0].statement).toBe('Vault door is iron');
    expect(canonicalState.isPublicationInProgress).toBe(false);
  });

  it('2. fence returns complete pre-turn snapshot during in-flight publication and prevents mixed revisions', () => {
    const startAppState = useAppStore.getState();
    const preSnapshot = captureRuntimeSnapshot(startAppState);

    let observedDuringAppWrite: ReturnType<typeof getCanonicalSimulationState> | null = null;

    // Spy on AppStore subscription during publication
    const unsubscribe = useAppStore.subscribe(() => {
      if (isCanonicalPublicationInProgress()) {
        observedDuringAppWrite = getCanonicalSimulationState();
      }
    });

    const committedPayload: CommittedTurnPayload = {
      commandText: 'Search the desk',
      formattedText: 'Papers scatter across the floor.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'Papers scatter across the floor.' }],
        logic_state: { suggested_tension: 20 },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 20,
        preSnapshot,
      },
    };

    const preparedGameState: LogicState = {
      current_location: 'ORIGIN',
      inventory: ['torn_letter'],
      player_injuries: [],
      psychological_status: 'Focused',
    };

    coordinateCanonicalTurnPublication({
      appStore: useAppStore,
      engineStore: useEngineStore,
      committedPayload,
      preparedGameState,
    });

    unsubscribe();

    expect(observedDuringAppWrite).not.toBeNull();
    // During in-flight write, accessor returned complete pre-turn snapshot pair (turnCount = 0)
    expect(observedDuringAppWrite!.turnNumber).toBe(0);
    expect(observedDuringAppWrite!.isPublicationInProgress).toBe(true);

    // After publication completes, accessor returns post-turn state (turnCount = 1)
    const finalState = getCanonicalSimulationState();
    expect(finalState.turnNumber).toBe(1);
    expect(finalState.isPublicationInProgress).toBe(false);
  });

  it('3. rolls back both stores to exact pre-turn snapshots if second write fails', () => {
    // Seed initial state with distinct properties
    useAppStore.setState({
      turnCount: 5,
      sessionId: 'session-prev-100',
      blueprintId: 'bp-prev-100',
    });
    useEngineStore.setState({
      gameState: {
        current_location: 'ORIGIN',
        inventory: ['existing_flashlight'],
        player_injuries: [],
        psychological_status: 'Calm',
      },
    });

    const preAppSnapshot = captureRuntimeSnapshot(useAppStore.getState());

    const committedPayload: CommittedTurnPayload = {
      commandText: 'Touch the strange artifact',
      formattedText: 'A shock runs through your arm.',
      preSnapshot: preAppSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'A shock runs through your arm.' }],
        logic_state: { suggested_tension: 80 },
      },
      turnReceipt: {
        turnNumber: 6,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 80,
        preSnapshot: preAppSnapshot,
      },
    };

    const preparedGameState: LogicState = {
      current_location: 'ORIGIN',
      inventory: ['existing_flashlight', 'artifact'],
      player_injuries: ['burned_fingers'],
      psychological_status: 'Terrified',
    };

    // Mock engineStore.setGameState to throw an error on second write
    const originalSetGameState = useEngineStore.getState().setGameState;
    useEngineStore.setState({
      setGameState: () => {
        throw new Error('INJECTED_SECOND_WRITE_DATABASE_FAILURE');
      },
    });

    expect(() => {
      coordinateCanonicalTurnPublication({
        appStore: useAppStore,
        engineStore: useEngineStore,
        committedPayload,
        preparedGameState,
      });
    }).toThrow('INJECTED_SECOND_WRITE_DATABASE_FAILURE');

    // Restore setGameState function
    useEngineStore.setState({ setGameState: originalSetGameState });

    // Assert: Both stores equal exact pre-turn states
    const postApp = useAppStore.getState();
    const postEngine = useEngineStore.getState();

    expect(postApp.turnCount).toBe(5);
    expect(postApp.history).toHaveLength(0);
    expect(postApp.lastTurnCheckpoint).toBeNull();
    expect(postEngine.gameState?.inventory).toEqual(['existing_flashlight']);
    expect(postEngine.gameState?.player_injuries).toEqual([]);
    expect(postEngine.gameState?.psychological_status).toBe('Calm');
    expect(isCanonicalPublicationInProgress()).toBe(false);
  });

  it('4. presentation failure degrades presentation only without emitting turn failure or rolling back canonical publication', () => {
    const startAppState = useAppStore.getState();
    const preSnapshot = captureRuntimeSnapshot(startAppState);

    const committedPayload: CommittedTurnPayload = {
      commandText: 'Look at the monitors',
      formattedText: 'Static buzzes loudly across the screens.',
      preSnapshot,
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'Static buzzes loudly across the screens.' }],
        logic_state: { suggested_tension: 30 },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 30,
        preSnapshot,
      },
    };

    const preparedGameState: LogicState = {
      current_location: 'ORIGIN',
      inventory: [],
      player_injuries: [],
      psychological_status: 'Observant',
    };

    // Mock patchGameState to throw an error
    const originalPatch = useEngineStore.getState().patchGameState;
    useEngineStore.setState({
      patchGameState: () => {
        throw new Error('INJECTED_PRESENTATION_PROJECTION_RENDER_ERROR');
      },
    });

    // Should NOT throw!
    expect(() => {
      coordinateCanonicalTurnPublication({
        appStore: useAppStore,
        engineStore: useEngineStore,
        committedPayload,
        preparedGameState,
        presentationPatch: { suggested_tension: 30 },
      });
    }).not.toThrow();

    useEngineStore.setState({ patchGameState: originalPatch });

    // Canonical publication succeeded and remains committed
    const state = getCanonicalSimulationState();
    expect(state.turnNumber).toBe(1);
    expect(state.app.turnCount).toBe(1);
    expect(state.gameState?.psychological_status).toBe('Observant');
  });

  it('5. filters allowlisted presentation keys so canonical simulation fields are never overwritten by presentation patches', () => {
    const maliciousPatch: Partial<LogicState> = {
      suggested_tension: 45,
      current_tension_level: 'visceral_climax',
      // Attacked canonical simulation fields attempting to bypass coordinator
      inventory: ['hacked_item'],
      player_injuries: ['hacked_injury'],
      psychological_status: 'HACKED',
      world_memory: [],
    };

    const filtered = filterAllowlistedPresentationPatch(maliciousPatch);
    expect(filtered).toEqual({
      suggested_tension: 45,
      current_tension_level: 'visceral_climax',
    });
    const filteredObj = filtered as Record<string, unknown>;
    expect(filteredObj.inventory).toBeUndefined();
    expect(filteredObj.player_injuries).toBeUndefined();
    expect(filteredObj.psychological_status).toBeUndefined();
    expect(filteredObj.world_memory).toBeUndefined();
  });
});
