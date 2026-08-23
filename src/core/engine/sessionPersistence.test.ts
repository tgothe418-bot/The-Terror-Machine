import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import 'fake-indexeddb/auto';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { evaluateSessionCoherence, reconcileSessionStores } from '../../lib/sessionReconciliation';
import type { ScenarioBlueprint, LogicState } from '../../types';
import type { CommittedTurnPayload } from './events';
import type { RetakeRestorableEngineState } from './reducer';
import { captureRuntimeSnapshot } from './snapshot';

describe('Phase 3H.5D: Dual-Store Session Persistence and Restoration', () => {
  const mockBlueprint: ScenarioBlueprint = {
    id: 'bp_session_persisted_99',
    title: 'The Obsidian Crypt',
    contentScale: 5,
    contentLevelDescription: 'Esoteric Dread',
    setting: {
      location: 'Subterranean Chamber Alpha',
      atmosphere: 'Suffocating ash and ozone',
      timePeriod: '1979',
    },
    cast: [
      {
        id: 'char-1',
        name: 'First Cast Mortal',
        role: 'Technician',
        description: 'First mortal in cast array.',
        personality: 'Anxious',
        goals: 'Flee',
        traits: ['Jumpy'],
        isEntity: false,
      },
      {
        id: 'char-2',
        name: 'Second Cast Specialist',
        role: 'Occultist',
        description: 'Second mortal in cast array.',
        personality: 'Methodical',
        goals: 'Decipher glyphs',
        traits: ['Analytical'],
        isEntity: false,
      },
    ],
    narrativeRules: {
      incitingIncident: 'The vault seals permanently.',
      currentTensionLevel: 'buildup',
      keyPlotElements: [],
    },
    topology: {
      nodes: ['CHAMBER_ALPHA', 'CHAMBER_BETA'],
      connections: [
        {
          from: 'CHAMBER_ALPHA',
          to: 'CHAMBER_BETA',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
      ],
    },
  };

  beforeEach(() => {
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Resumes session after completed turn with exact non-first character binding preserved', async () => {
    const rawBlueprintCopy = JSON.parse(JSON.stringify(mockBlueprint));

    // Initialize session with explicit NON-FIRST character ('char-2')
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-2');

    const appState0 = useAppStore.getState();
    const engineState0 = useEngineStore.getState();

    expect(appState0.blueprintId).toBe('bp_session_persisted_99');
    expect(appState0.currentNodeId).toBe('CHAMBER_ALPHA');
    expect(engineState0.gameState?.player_character_id).toBe('char-2');
    expect(engineState0.gameState?.player_role).toBe('protagonist');
    expect(engineState0.gameState?.perspective_mode).toBe('embodied');

    // Simulate committing Turn 1
    const preSnapshot = captureRuntimeSnapshot(appState0);
    const prevGameState = engineState0.gameState as LogicState;

    const turn1Payload: CommittedTurnPayload = {
      commandText: 'Examine the ancient glyphs on the chamber wall',
      formattedText: 'The obsidian wall vibrates with cold luminescence.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(prevGameState)),
      frame: {
        narrative_blocks: [
          { type: 'prose', content: 'The obsidian wall vibrates with cold luminescence.' },
        ],
        logic_state: {
          current_location: 'CHAMBER_BETA',
          player_injuries: ['Superficial frostbite'],
          inventory: ['Glyph Charcoal Rubbing'],
          psychological_status: 'Hypervigilant',
          player_role: 'protagonist',
          player_character_id: 'char-2',
          perspective_mode: 'embodied',
          current_tension_level: 'escalation',
          suggested_tension: 40,
          lore_and_memory: {
            established_facts: ['Glyphs react to human body heat'],
            permanent_consequences: [],
          },
          npc_fixations: [],
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'CHAMBER_ALPHA',
        requestedTarget: 'CHAMBER_BETA',
        accepted: true,
        nodeAfter: 'CHAMBER_BETA',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 40,
        preSnapshot,
      },
      transitionReceipt: {
        requestedNodeId: 'CHAMBER_BETA',
        fromNodeId: 'CHAMBER_ALPHA',
        toNodeId: 'CHAMBER_BETA',
        accepted: true,
      },
    };

    useAppStore.getState().commitTurnResult(turn1Payload);
    useEngineStore.getState().patchGameState({
      current_location: 'CHAMBER_BETA',
      player_injuries: ['Superficial frostbite'],
      inventory: ['Glyph Charcoal Rubbing'],
      psychological_status: 'Hypervigilant',
      player_role: 'protagonist',
      player_character_id: 'char-2',
      perspective_mode: 'embodied',
      current_tension_level: 'escalation',
    });

    // Verify turn 1 state before storage hydration simulation
    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().currentNodeId).toBe('CHAMBER_BETA');
    expect(useAppStore.getState().history.length).toBeGreaterThan(0);
    expect(useEngineStore.getState().gameState?.player_character_id).toBe('char-2');
    expect(useEngineStore.getState().gameState?.inventory).toContain('Glyph Charcoal Rubbing');

    // Simulate store persistence & hydration re-instantiation
    const persistedAppSnapshot = JSON.parse(JSON.stringify(useAppStore.getState()));
    const persistedEngineSnapshot = JSON.parse(JSON.stringify(useEngineStore.getState()));

    // Reset runtime in-memory state
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    // Rehydrate stores from persisted state
    useAppStore.setState(persistedAppSnapshot);
    useEngineStore.setState(persistedEngineSnapshot);

    // Verify stores are evaluated as coherent
    const coherence = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(coherence.isCoherent).toBe(true);
    expect(coherence.status).toBe('COHERENT');

    // Assert exact state after restoration
    const restoredApp = useAppStore.getState();
    const restoredEngine = useEngineStore.getState();

    expect(restoredApp.blueprintId).toBe('bp_session_persisted_99');
    expect(restoredApp.turnCount).toBe(1);
    expect(restoredApp.currentNodeId).toBe('CHAMBER_BETA');
    expect(restoredApp.tensionLevel).toBe(40);
    expect(restoredApp.history.length).toBeGreaterThan(0);
    expect(restoredEngine.gameState?.player_character_id).toBe('char-2');
    expect(restoredEngine.gameState?.player_role).toBe('protagonist');
    expect(restoredEngine.gameState?.perspective_mode).toBe('embodied');
    expect(restoredEngine.gameState?.inventory).toEqual(['Glyph Charcoal Rubbing']);
    expect(restoredEngine.gameState?.player_injuries).toEqual(['Superficial frostbite']);

    // Assert Source Integrity: Blueprint was NOT mutated and character did NOT default to char-1
    expect(rawBlueprintCopy).toEqual(mockBlueprint);
    expect(restoredEngine.gameState?.player_character_id).not.toBe('char-1');
  });

  it('2. Retake after hydration restores exact pre-turn state and bound character without resetting to origin', async () => {
    // Initialize session with 'char-2'
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-2');

    const appState0 = useAppStore.getState();
    const engineState0 = useEngineStore.getState();
    const preSnapshot = captureRuntimeSnapshot(appState0);
    const prevGameState = engineState0.gameState as LogicState;

    // Commit Turn 1
    const payload: CommittedTurnPayload = {
      commandText: 'Touch the resonant obsidian crystal',
      formattedText: 'A high-pitched resonance pierces your ears.',
      preSnapshot,
      engineGameStateBefore: JSON.parse(JSON.stringify(prevGameState)),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'A high-pitched resonance pierces your ears.' }],
        logic_state: {
          current_location: 'CHAMBER_BETA',
          player_injuries: ['Tinnitus'],
          inventory: ['Obsidian Shard'],
          psychological_status: 'Unnerved',
          player_role: 'protagonist',
          player_character_id: 'char-2',
          perspective_mode: 'embodied',
          current_tension_level: 'escalation',
          lore_and_memory: {
            established_facts: [],
            permanent_consequences: [],
          },
          npc_fixations: [],
        },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'CHAMBER_ALPHA',
        requestedTarget: 'CHAMBER_BETA',
        accepted: true,
        nodeAfter: 'CHAMBER_BETA',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 50,
        preSnapshot,
      },
    };

    useAppStore.getState().commitTurnResult(payload);
    useEngineStore.getState().patchGameState({
      current_location: 'CHAMBER_BETA',
      player_injuries: ['Tinnitus'],
      inventory: ['Obsidian Shard'],
      psychological_status: 'Unnerved',
    });

    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().lastTurnCheckpoint).not.toBeNull();

    // Persist and hydrate across restart
    const persistedAppSnapshot = JSON.parse(JSON.stringify(useAppStore.getState()));
    const persistedEngineSnapshot = JSON.parse(JSON.stringify(useEngineStore.getState()));

    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    useAppStore.setState(persistedAppSnapshot);
    useEngineStore.setState(persistedEngineSnapshot);

    // Perform retake from restored checkpoint
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);

    // Verify pre-turn state is restored
    const stateAfterRetake = useAppStore.getState();
    const engineAfterRetake = useEngineStore.getState();

    expect(stateAfterRetake.turnCount).toBe(0);
    expect(stateAfterRetake.currentNodeId).toBe('CHAMBER_ALPHA');
    expect(engineAfterRetake.gameState?.player_character_id).toBe('char-2');
    expect(engineAfterRetake.gameState?.player_injuries).toEqual([]);
    expect(engineAfterRetake.gameState?.inventory).toEqual([]);
    expect(stateAfterRetake.lastTurnCheckpoint).toBeNull();
  });

  it('3. Fails closed and prevents state blending when Engine and App session identities mismatch', () => {
    // Engine has Blueprint 'bp_A'
    useEngineStore.setState({
      activeBlueprint: normalizeBlueprint({
        ...mockBlueprint,
        id: 'bp_A',
      }),
      gameState: {
        current_location: 'Alpha',
        player_injuries: [],
        inventory: [],
        psychological_status: 'Stable',
        player_role: 'first_person',
        player_character_id: null,
        perspective_mode: 'first_person',
        current_tension_level: 'buildup',
        lore_and_memory: { established_facts: [], permanent_consequences: [] },
        npc_fixations: [],
      },
    });

    // AppStore has mismatched Blueprint 'bp_B' with active turns
    useAppStore.setState({
      sessionId: 'session_mismatched_001',
      blueprintId: 'bp_B',
      turnCount: 3,
      history: [
        {
          id: 'msg-old',
          role: 'narrative',
          content: 'Old session narrative from different scenario',
          timestamp: 500,
        },
      ],
    });

    // Evaluate coherence
    const evalResult = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(evalResult.isCoherent).toBe(false);
    expect(evalResult.status).toBe('MISMATCH');

    // Run reconciliation - must fail closed and reset both stores cleanly
    const reconResult = reconcileSessionStores(useEngineStore, useAppStore);
    expect(reconResult.isCoherent).toBe(false);

    // Stores must be wiped clean to prevent dangerous multi-world cross-contamination
    expect(useAppStore.getState().sessionId).toBe('');
    expect(useAppStore.getState().blueprintId).toBe('');
    expect(useAppStore.getState().turnCount).toBe(0);
    expect(useAppStore.getState().history).toEqual([]);
    expect(useEngineStore.getState().activeBlueprint).toBeNull();
  });

  it('4. Handles malformed or orphan persisted session state gracefully with fail-closed safety', () => {
    // App store has turn count but no active Blueprint in Engine store
    useEngineStore.setState({
      activeBlueprint: null,
      gameState: null,
    });

    useAppStore.setState({
      sessionId: 'session_orphan_002',
      blueprintId: 'bp_orphan',
      turnCount: 4,
      history: [
        {
          id: 'msg-orphan',
          role: 'narrative',
          content: 'Orphan turn data',
          timestamp: 600,
        },
      ],
    });

    const evalResult = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(evalResult.isCoherent).toBe(false);
    expect(evalResult.status).toBe('MISMATCH');

    const reconResult = reconcileSessionStores(useEngineStore, useAppStore);
    expect(reconResult.isCoherent).toBe(false);
    expect(useAppStore.getState().blueprintId).toBe('');
    expect(useAppStore.getState().turnCount).toBe(0);
  });

  it('5. Detects and clears invalid or cross-session retake checkpoints deterministically', () => {
    // Set up active session
    useEngineStore.getState().setBlueprint(mockBlueprint, 'witness', null);
    const activeSessionId = useAppStore.getState().sessionId;

    // Simulate an invalid checkpoint referencing a stale/different session
    useAppStore.setState({
      lastTurnCheckpoint: {
        version: 1,
        commandText: 'Old command from another session',
        engineStateBefore: {
          sessionId: 'different_session_999',
          blueprintId: 'different_blueprint_888',
          phase: 'LATENT',
          escalation_state: 'LATENT',
          currentNodeId: 'ORIGIN',
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
          decay: { progress: 0, cycle: 0 },
          turnCount: 1,
          roomsGenerated: 1,
          traumaLedger: [],
          activeMemory: { systemFlags: [], playerInjuries: [] },
          coherence: 1.0,
          reconciliationRevision: 0,
        } satisfies RetakeRestorableEngineState,
        engineGameStateBefore: null,
      },
    });

    // Reconcile / evaluate: invalid checkpoint is rejected by safe retake
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(false); // Refuses to restore foreign session and clears invalid checkpoint

    // Clean session is maintained
    expect(useAppStore.getState().sessionId).toBe(activeSessionId);
    expect(useAppStore.getState().lastTurnCheckpoint).toBeNull();
  });

  it('6. Generates synchronized activeSessionId across both stores upon setBlueprint', () => {
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-1');

    const engineSessionId = useEngineStore.getState().activeSessionId;
    const appSessionId = useAppStore.getState().sessionId;

    expect(typeof engineSessionId).toBe('string');
    expect(engineSessionId).toBeTruthy();
    expect(appSessionId).toBe(engineSessionId);

    const coherence = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(coherence.isCoherent).toBe(true);
    expect(coherence.status).toBe('COHERENT');
  });

  it('7. Fails closed when Engine store has active Blueprint but missing or mismatched activeSessionId', () => {
    // Engine has activeBlueprint but activeSessionId is null
    useEngineStore.setState({
      activeBlueprint: normalizeBlueprint(mockBlueprint),
      activeSessionId: null,
      gameState: {
        current_location: 'Alpha',
        player_injuries: [],
        inventory: [],
        psychological_status: 'Stable',
        player_role: 'protagonist',
        player_character_id: 'char-1',
        perspective_mode: 'embodied',
        current_tension_level: 'buildup',
        lore_and_memory: { established_facts: [], permanent_consequences: [] },
        npc_fixations: [],
      },
    });

    useAppStore.setState({
      sessionId: 'session_app_123',
      blueprintId: mockBlueprint.id,
      turnCount: 0,
      history: [],
    });

    const evalResult = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(evalResult.isCoherent).toBe(false);
    expect(evalResult.status).toBe('MISMATCH');
    expect(evalResult.reason).toContain('Engine store has active Blueprint but lacks a valid activeSessionId');

    const recon = reconcileSessionStores(useEngineStore, useAppStore);
    expect(recon.isCoherent).toBe(false);
    expect(useEngineStore.getState().activeBlueprint).toBeNull();
    expect(useAppStore.getState().sessionId).toBe('');
  });

  it('8. Fails closed with CORRUPT status when bound player_character_id does not exist in blueprint cast', () => {
    useEngineStore.setState({
      activeBlueprint: normalizeBlueprint(mockBlueprint),
      activeSessionId: 'shared_session_xyz',
      gameState: {
        current_location: 'Alpha',
        player_injuries: [],
        inventory: [],
        psychological_status: 'Stable',
        player_role: 'protagonist',
        player_character_id: 'ghost-nonexistent-character',
        perspective_mode: 'embodied',
        current_tension_level: 'buildup',
        lore_and_memory: { established_facts: [], permanent_consequences: [] },
        npc_fixations: [],
      },
    });

    useAppStore.setState({
      sessionId: 'shared_session_xyz',
      blueprintId: mockBlueprint.id,
      turnCount: 0,
      history: [],
    });

    const evalResult = evaluateSessionCoherence(useEngineStore.getState(), useAppStore.getState());
    expect(evalResult.isCoherent).toBe(false);
    expect(evalResult.status).toBe('CORRUPT');
    expect(evalResult.reason).toContain('ghost-nonexistent-character');

    const recon = reconcileSessionStores(useEngineStore, useAppStore);
    expect(recon.isCoherent).toBe(false);
    expect(useEngineStore.getState().activeBlueprint).toBeNull();
  });
});
