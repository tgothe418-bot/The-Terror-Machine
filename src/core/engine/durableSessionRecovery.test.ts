import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { idbStorage } from '../../lib/idbStorage';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';
import {
  coordinateCanonicalTurnPublication,
  isTurnAttemptCurrent,
  ObsoleteTurnPublicationError,
} from './commitCoordinator';
import {
  evaluateSessionCoherence,
  reconcileSessionStores,
} from '../../lib/sessionReconciliation';
import { captureRuntimeSnapshot } from './snapshot';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import type { ScenarioBlueprint, LogicState, DurableSessionRevision } from '../../types';
import type { CommittedTurnPayload } from './events';

describe('Packet 08: Durable Session Recovery & Persistence Adapter', () => {
  const mockBlueprint: ScenarioBlueprint = {
    id: 'bp_durable_recovery_test',
    title: 'The Cold Vault',
    contentScale: 4,
    contentLevelDescription: 'Survival Horror',
    setting: {
      location: 'Sub-Level Vault B',
      atmosphere: 'Freezing vapor and silence',
      timePeriod: '1982',
    },
    cast: [
      {
        id: 'char-tech',
        name: 'Warden',
        role: 'Technician',
        description: 'Lead engineer.',
        personality: 'Cautious',
        goals: 'Survive',
        traits: ['Methodical'],
        isEntity: false,
      },
    ],
    narrativeRules: {
      incitingIncident: 'The bulkhead slams shut.',
      currentTensionLevel: 'buildup',
      keyPlotElements: [],
    },
    topology: {
      nodes: ['ORIGIN', 'VAULT_CHAMBER'],
      connections: [],
    },
  };

  beforeEach(async () => {
    idbStorage.__clearInjectedFailures();
    idbStorage.__clearInjectedDelays();
    idbStorage.__clearMemoryStore();
    idbStorage.__resetSequences();
    await idbStorage.removeItem('the-runtime-session-memory');
    await idbStorage.removeItem('the-engine-memory');
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();
    await flushAsyncStorage();
  });

  afterEach(async () => {
    idbStorage.__clearInjectedFailures();
    idbStorage.__clearInjectedDelays();
    idbStorage.__clearMemoryStore();
    idbStorage.__resetSequences();
    await idbStorage.removeItem('the-runtime-session-memory');
    await idbStorage.removeItem('the-engine-memory');
    await flushAsyncStorage();
  });

  async function flushAsyncStorage(): Promise<void> {
    // Allow Zustand persist asynchronous calls to complete
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  async function simulateFreshReload(): Promise<ReturnType<typeof reconcileSessionStores>> {
    // 1. Read directly from persistent disk storage (idbStorage)
    const appRaw = await idbStorage.getItem('the-runtime-session-memory');
    const engineRaw = await idbStorage.getItem('the-engine-memory');

    // 2. Wipe active in-memory store states completely (simulating fresh process/page start)
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    // 3. Hydrate stores if records exist on disk
    if (appRaw) {
      const parsed = JSON.parse(appRaw);
      useAppStore.setState(parsed.state);
    }
    if (engineRaw) {
      const parsed = JSON.parse(engineRaw);
      useEngineStore.setState(parsed.state);
    }

    // 4. Run authoritative cross-store reconciliation
    return reconcileSessionStores(useEngineStore, useAppStore);
  }

  it('1. Interrupted write (App succeeds, Engine fails) recovers complete previous revision from checkpoint', async () => {
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-tech');
    await flushAsyncStorage();

    const app0 = useAppStore.getState();
    const sessionId = app0.sessionId;

    // Turn 1: Commit and persist successfully
    const turn1Payload: CommittedTurnPayload = {
      commandText: 'Search the emergency cabinet',
      formattedText: 'You find an iron prybar in the locker.',
      preSnapshot: captureRuntimeSnapshot(app0),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'You find an iron prybar in the locker.' }],
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
        preSnapshot: captureRuntimeSnapshot(app0),
      },
    };

    const turn1GameState: LogicState = {
      current_location: 'ORIGIN',
      inventory: ['iron_prybar'],
      player_injuries: [],
      psychological_status: 'Focused',
      fictional_time_ledger: {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      },
      world_memory: [
        {
          id: 'fact-1',
          kind: 'ESTABLISHED_FACT',
          scope: 'NODE',
          node_id: 'ORIGIN',
          statement: 'Emergency locker was searched.',
          established_turn: 1,
        },
      ],
    };

    coordinateCanonicalTurnPublication({
      appStore: useAppStore,
      engineStore: useEngineStore,
      committedPayload: turn1Payload,
      preparedGameState: turn1GameState,
    });
    await flushAsyncStorage();

    // Verify Turn 1 is durably saved
    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useEngineStore.getState().gameState?.inventory).toEqual(['iron_prybar']);

    // Turn 2: Simulate interrupted persistence: App store successfully writes turn 2 to disk,
    // but Engine store disk write fails and retains turn 1 on disk.
    const turn2DurableRev: DurableSessionRevision = {
      sessionId,
      blueprintId: mockBlueprint.id,
      turnCount: 2,
      revision: 3,
      committedAt: Date.now(),
    };

    // Manually write turn 2 into AppStore disk storage
    await idbStorage.setItem(
      'the-runtime-session-memory',
      JSON.stringify({
        state: {
          sessionId,
          blueprintId: mockBlueprint.id,
          turnCount: 2,
          canonicalRevision: 3,
          durableSessionRevision: turn2DurableRev,
          history: [
            { id: '1', role: 'user', content: 'Search cabinet' },
            { id: '2', role: 'assistant', content: 'Found prybar' },
            { id: '3', role: 'user', content: 'Force vent' },
            { id: '4', role: 'assistant', content: 'Prybar broke' },
          ],
          lastTurnCheckpoint: {
            version: 1,
            commandText: 'Force vent',
            engineStateBefore: {
              sessionId,
              blueprintId: mockBlueprint.id,
              turnCount: 1,
              canonicalRevision: 2,
              history: [
                { id: '1', role: 'user', content: 'Search cabinet' },
                { id: '2', role: 'assistant', content: 'Found prybar' },
              ],
            },
            engineGameStateBefore: turn1GameState,
            durableSessionRevisionBefore: {
              sessionId,
              blueprintId: mockBlueprint.id,
              turnCount: 1,
              revision: 2,
              committedAt: 1000,
            },
          },
        },
        version: 1,
      })
    );

    // Fresh reload from disk
    const recon = await simulateFreshReload();

    // Recovery selects complete previous revision (Turn 1), NEVER a mixture!
    expect(recon.isCoherent).toBe(true);
    expect(recon.status).toBe('COHERENT');
    expect(recon.recoveredRevision).toBe(2);

    const postApp = useAppStore.getState();
    const postEngine = useEngineStore.getState();

    // Sentinels prove exact Turn 1 state:
    expect(postApp.turnCount).toBe(1);
    expect(postApp.history).toHaveLength(2);
    expect(postEngine.gameState?.inventory).toEqual(['iron_prybar']);
    expect(postEngine.gameState?.fictional_time_ledger?.moment_revision).toBe(1);
    expect(postEngine.gameState?.world_memory).toHaveLength(1);
    expect(postEngine.gameState?.world_memory?.[0].statement).toBe('Emergency locker was searched.');
    expect(postApp.durableSessionRevision?.revision).toBe(2);
    expect(postEngine.durableSessionRevision?.revision).toBe(2);
  });

  it('2. Delayed write after session reset does NOT overwrite reset session upon reload', async () => {
    // 1. Initialize Session A
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-tech');
    await flushAsyncStorage();

    const sessionAId = useAppStore.getState().sessionId;
    expect(sessionAId).toBeTruthy();

    // 2. Commit a turn in Session A, but inject a 50ms write latency for Session A
    idbStorage.__injectWriteDelay('the-runtime-session-memory', 50);

    // Trigger an asynchronous write for Session A
    const stalePayload = JSON.stringify({
      state: {
        sessionId: sessionAId,
        blueprintId: mockBlueprint.id,
        turnCount: 1,
        history: [{ id: 'stale-1', content: 'Stale narrative from Session A' }],
      },
      version: 1,
    });
    const delayedPromise = idbStorage.setItem('the-runtime-session-memory', stalePayload);

    // Remove delay for subsequent writes so reset writes immediately!
    idbStorage.__clearInjectedDelays();

    // 3. In the meantime, user calls resetSession()
    // Reset issues immediately with a higher write sequence
    useAppStore.getState().resetSession();
    await flushAsyncStorage();

    // 4. Await the delayed write to resolve
    await delayedPromise;

    // 5. Reload from storage
    await simulateFreshReload();

    // Stale Session A must NOT reappear!
    expect(useAppStore.getState().sessionId).toBe('');
    expect(useAppStore.getState().turnCount).toBe(0);
    expect(useAppStore.getState().history).toEqual([]);
  });

  it('3. Storage unavailability or quota rejection propagates honestly without false memory-only success', async () => {
    // Ensure key is deleted first
    await idbStorage.removeItem('the-runtime-session-memory');

    idbStorage.__injectWriteFailure('the-runtime-session-memory', new Error('QuotaExceededError: storage full'));

    await expect(
      idbStorage.setItem('the-runtime-session-memory', JSON.stringify({ state: { turnCount: 1 } }))
    ).rejects.toThrow('QuotaExceededError: storage full');

    expect(idbStorage.__getLastStorageError()?.message).toContain('QuotaExceededError');

    // Fresh read from disk must be null (did not silently write to memoryStore)
    idbStorage.__clearInjectedFailures();
    const stored = await idbStorage.getItem('the-runtime-session-memory');
    expect(stored).toBeNull();
  });

  it('4. Distinct sentinel facts detect partial recovery and reject incoherent mixed revisions', () => {
    // Construct split revision where App has turn 2 and Engine has turn 1
    const evalResult = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_sentinel_proof',
        activeBlueprint: normalizeBlueprint(mockBlueprint),
        durableSessionRevision: {
          sessionId: 'sess_sentinel_proof',
          blueprintId: mockBlueprint.id,
          turnCount: 1,
          revision: 2,
          committedAt: 1000,
        },
        gameState: {
          current_location: 'ORIGIN',
          inventory: ['sentinel_iron_key'],
          world_memory: [
            {
              id: 'wm-1',
              kind: 'ESTABLISHED_FACT',
              scope: 'GLOBAL',
              statement: 'Sentinel fact from turn 1',
              established_turn: 1,
            },
          ],
          fictional_time_ledger: {
            moment_revision: 1,
            scene_beat_revision: 0,
            extended_revision: 0,
            last_cost: 'MOMENT',
          },
        },
      },
      {
        sessionId: 'sess_sentinel_proof',
        blueprintId: mockBlueprint.id,
        turnCount: 2,
        durableSessionRevision: {
          sessionId: 'sess_sentinel_proof',
          blueprintId: mockBlueprint.id,
          turnCount: 2,
          revision: 3,
          committedAt: 2000,
        },
        history: [
          { id: '1', role: 'user', content: 'Drop sentinel_iron_key', timestamp: 1000 },
          { id: '2', role: 'assistant', content: 'You dropped the sentinel_iron_key.', timestamp: 1001 },
        ],
        lastTurnCheckpoint: null, // No checkpoint to recover from
      }
    );

    // Mismatched revisions MUST NOT return COHERENT even though IDs match
    expect(evalResult.isCoherent).toBe(false);
    expect(evalResult.status).toBe('MISMATCH');
    expect(evalResult.reason).toContain('Durable revision mismatch');
  });

  it('5. Retake across reload invalidates old in-flight turns and restores pre-turn state', async () => {
    useEngineStore.getState().setBlueprint(mockBlueprint, 'protagonist', null, 'char-tech');
    await flushAsyncStorage();

    const app0 = useAppStore.getState();

    // Commit Turn 1
    const turn1Payload: CommittedTurnPayload = {
      commandText: 'Examine console',
      formattedText: 'The dials glow green.',
      preSnapshot: captureRuntimeSnapshot(app0),
      frame: {
        narrative_blocks: [{ type: 'prose', content: 'The dials glow green.' }],
        logic_state: { suggested_tension: 10 },
      },
      turnReceipt: {
        turnNumber: 1,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
        preSnapshot: captureRuntimeSnapshot(app0),
      },
    };

    coordinateCanonicalTurnPublication({
      appStore: useAppStore,
      engineStore: useEngineStore,
      committedPayload: turn1Payload,
      preparedGameState: {
        current_location: 'ORIGIN',
        inventory: ['flashlight'],
        player_injuries: [],
        psychological_status: 'Calm',
      },
    });
    await flushAsyncStorage();

    expect(useAppStore.getState().turnCount).toBe(1);
    expect(useAppStore.getState().lastTurnCheckpoint).not.toBeNull();

    // Snapshot attempt token before retake
    const stalePreSnapshot = captureRuntimeSnapshot(useAppStore.getState());

    // Retake turn
    const retakeSuccess = useAppStore.getState().retakeLastTurn();
    expect(retakeSuccess).toBe(true);
    await flushAsyncStorage();

    // Reload from disk into fresh state
    const recon = await simulateFreshReload();
    if (!recon.isCoherent) {
      console.log('RECON RESULT IN TEST 5:', recon);
    }
    expect(recon.isCoherent).toBe(true);

    const reloadedApp = useAppStore.getState();
    expect(reloadedApp.turnCount).toBe(0);
    expect(reloadedApp.lastTurnCheckpoint).toBeNull();

    // An in-flight turn attempting to publish with the stale pre-retake snapshot must be rejected!
    expect(isTurnAttemptCurrent(reloadedApp, stalePreSnapshot)).toBe(false);

    const staleAttemptPayload: CommittedTurnPayload = {
      commandText: 'Stale command from before retake',
      formattedText: 'Stale text',
      preSnapshot: stalePreSnapshot,
      frame: { narrative_blocks: [], logic_state: {} },
      turnReceipt: {
        turnNumber: 2,
        nodeBefore: 'ORIGIN',
        requestedTarget: 'ORIGIN',
        accepted: true,
        nodeAfter: 'ORIGIN',
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        tension: 10,
        preSnapshot: stalePreSnapshot,
      },
    };

    expect(() => {
      coordinateCanonicalTurnPublication({
        appStore: useAppStore,
        engineStore: useEngineStore,
        committedPayload: staleAttemptPayload,
        preparedGameState: { current_location: 'ORIGIN' },
      });
    }).toThrow(ObsoleteTurnPublicationError);
  });
});
