import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateSessionCoherence,
  reconcileSessionStores,
} from './sessionReconciliation';
import { normalizeBlueprint } from './normalizeBlueprint';
import { Blueprint, DurableSessionRevision, Message } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import type { RetakeRestorableEngineState } from '../core/engine/reducer';

describe('Session Reconciliation & Durable Recovery (Packet 08)', () => {
  const mockBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_session_test',
    title: 'Echoes in the Dark',
    setting: {
      location: 'Sub-level 4',
      atmosphere: 'Oppressive cold',
      timePeriod: '1984',
    },
    cast: [
      {
        id: 'char-protagonist',
        name: 'Technician',
        role: 'Technician',
        description: 'Lead engineer.',
        personality: 'Alert',
        goals: 'Survive',
        traits: ['Cautious'],
        isEntity: false,
      },
    ],
    topology: { nodes: ['ORIGIN'], connections: [] },
  }) as Blueprint;

  beforeEach(() => {
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();
  });

  it('1. returns CLEAN_SETUP when no blueprint and no session data exists', () => {
    const result = evaluateSessionCoherence(
      { activeSessionId: null, activeBlueprint: null, gameState: null },
      { blueprintId: null, sessionId: null, turnCount: 0, history: [] }
    );
    expect(result.isCoherent).toBe(true);
    expect(result.status).toBe('CLEAN_SETUP');
  });

  it('2. returns COHERENT for clean turn 0 session across both stores', () => {
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_123',
        activeBlueprint: mockBlueprint,
        gameState: { current_location: 'ORIGIN' },
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_123',
        turnCount: 0,
        history: [],
      }
    );
    expect(result.isCoherent).toBe(true);
    expect(result.status).toBe('COHERENT');
  });

  it('3. returns COHERENT when engine and app stores match durableSessionRevision and turnCount', () => {
    const durableRev: DurableSessionRevision = {
      sessionId: 'sess_123',
      blueprintId: 'bp_session_test',
      revision: 2,
      turnCount: 1,
      committedAt: 1000,
    };

    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_123',
        activeBlueprint: mockBlueprint,
        durableSessionRevision: durableRev,
        gameState: { current_location: 'ORIGIN' },
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_123',
        turnCount: 1,
        durableSessionRevision: durableRev,
        history: [{ id: '1', role: 'user', content: 'Inspect room', timestamp: 1000 }],
      }
    );
    expect(result.isCoherent).toBe(true);
    expect(result.status).toBe('COHERENT');
  });

  it('4. returns MISMATCH when session IDs differ across stores', () => {
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_engine_123',
        activeBlueprint: mockBlueprint,
        gameState: null,
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_app_999',
        turnCount: 1,
        history: [],
      }
    );
    expect(result.isCoherent).toBe(false);
    expect(result.status).toBe('MISMATCH');
  });

  it('5. establishes diagnostic failure reproduction: rejects mixed revision where App dropped key on turn 2 while Engine retains it from turn 1', () => {
    // Diagnostic proof from Packet 08:
    // App history describes dropping a key on turn 2 (turnCount: 2).
    // Engine inventory retains 'brass_key' at turn 1.
    // Matching session and blueprint IDs MUST NEVER return COHERENT!
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_diagnostic_shared',
        activeBlueprint: mockBlueprint,
        durableSessionRevision: {
          sessionId: 'sess_diagnostic_shared',
          blueprintId: 'bp_session_test',
          revision: 2,
          turnCount: 1,
          committedAt: 1000,
        },
        gameState: {
          current_location: 'ORIGIN',
          inventory: ['brass_key'], // Retained from turn 1!
        },
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_diagnostic_shared',
        turnCount: 2, // Dropped key on turn 2!
        durableSessionRevision: {
          sessionId: 'sess_diagnostic_shared',
          blueprintId: 'bp_session_test',
          revision: 3,
          turnCount: 2,
          committedAt: 2000,
        },
        history: [
          { id: '1', role: 'user', content: 'Take key', timestamp: 1000 },
          { id: '2', role: 'assistant', content: 'You took the key.', timestamp: 1001 },
          { id: '3', role: 'user', content: 'Drop brass_key into the dark abyss', timestamp: 1002 },
          { id: '4', role: 'assistant', content: 'You dropped the brass_key into the abyss.', timestamp: 1003 },
        ],
        lastTurnCheckpoint: null, // No checkpoint available
      }
    );

    // CRITICAL: Must NOT be labeled COHERENT!
    expect(result.isCoherent).toBe(false);
    expect(result.status).toBe('MISMATCH');
    expect(result.reason).toContain('Durable revision mismatch');
  });

  it('6. detects RECOVERABLE_CHECKPOINT when App is at turn 2 and Engine interrupted at turn 1 with valid checkpoint', () => {
    const prevGameState = {
      current_location: 'ORIGIN',
      inventory: ['brass_key'],
    };

    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_interrupted_write',
        activeBlueprint: mockBlueprint,
        durableSessionRevision: {
          sessionId: 'sess_interrupted_write',
          blueprintId: 'bp_session_test',
          revision: 2,
          turnCount: 1,
          committedAt: 1000,
        },
        gameState: prevGameState,
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_interrupted_write',
        turnCount: 2,
        durableSessionRevision: {
          sessionId: 'sess_interrupted_write',
          blueprintId: 'bp_session_test',
          revision: 3,
          turnCount: 2,
          committedAt: 2000,
        },
        lastTurnCheckpoint: {
          version: 1,
          commandText: 'Drop brass_key',
          engineStateBefore: {
            turnCount: 1,
            canonicalRevision: 2,
            sessionId: 'sess_interrupted_write',
            blueprintId: 'bp_session_test',
            history: [{ id: '1', role: 'user', content: 'Take key', timestamp: 1000 }],
          } as unknown as RetakeRestorableEngineState,
          engineGameStateBefore: prevGameState,
          durableSessionRevisionBefore: {
            sessionId: 'sess_interrupted_write',
            blueprintId: 'bp_session_test',
            revision: 2,
            turnCount: 1,
            committedAt: 1000,
          },
        },
      }
    );

    expect(result.isCoherent).toBe(false);
    expect(result.status).toBe('RECOVERABLE_CHECKPOINT');
    expect(result.recoveryTarget).toBe('PREVIOUS_REVISION');
  });

  it('7. reconcileSessionStores recovers complete previous revision from checkpoint without erasing evidence', () => {
    const turn1GameState = {
      current_location: 'ORIGIN',
      inventory: ['brass_key'],
    };

    useEngineStore.setState({
      activeSessionId: 'sess_recovery_test',
      activeBlueprint: mockBlueprint,
      durableSessionRevision: {
        sessionId: 'sess_recovery_test',
        blueprintId: 'bp_session_test',
        revision: 2,
        turnCount: 1,
        committedAt: 1000,
      },
      gameState: turn1GameState,
    });

    useAppStore.setState({
      sessionId: 'sess_recovery_test',
      blueprintId: 'bp_session_test',
      turnCount: 2,
      canonicalRevision: 3,
      durableSessionRevision: {
        sessionId: 'sess_recovery_test',
        blueprintId: 'bp_session_test',
        revision: 3,
        turnCount: 2,
        committedAt: 2000,
      },
      history: [
        { id: '1', role: 'user', content: 'Take key', timestamp: 1000 },
        { id: '2', role: 'assistant', content: 'You took the key.', timestamp: 1001 },
        { id: '3', role: 'user', content: 'Drop key', timestamp: 1002 },
      ],
      lastTurnCheckpoint: {
        version: 1,
        commandText: 'Drop key',
        engineStateBefore: {
          turnCount: 1,
          canonicalRevision: 2,
          sessionId: 'sess_recovery_test',
          blueprintId: 'bp_session_test',
          history: [
            { id: '1', role: 'user', content: 'Take key', timestamp: 1000 },
            { id: '2', role: 'assistant', content: 'You took the key.', timestamp: 1001 },
          ],
        } as unknown as RetakeRestorableEngineState,
        engineGameStateBefore: turn1GameState,
        durableSessionRevisionBefore: {
          sessionId: 'sess_recovery_test',
          blueprintId: 'bp_session_test',
          revision: 2,
          turnCount: 1,
          committedAt: 1000,
        },
      },
    });

    const reconResult = reconcileSessionStores(useEngineStore, useAppStore);

    expect(reconResult.isCoherent).toBe(true);
    expect(reconResult.status).toBe('COHERENT');
    expect(reconResult.recoveredRevision).toBe(2);

    // Both stores are now stably recovered at revision 2, turn 1!
    const postApp = useAppStore.getState();
    const postEngine = useEngineStore.getState();

    expect(postApp.turnCount).toBe(1);
    expect(postApp.history).toHaveLength(2);
    expect(postApp.durableSessionRevision?.revision).toBe(2);
    expect(postApp.durableSessionRevision?.turnCount).toBe(1);

    expect(postEngine.durableSessionRevision?.revision).toBe(2);
    expect(postEngine.durableSessionRevision?.turnCount).toBe(1);
    expect(postEngine.gameState?.inventory).toEqual(['brass_key']);
  });

  it('8. rejects unrecoverable legacy pair when turnCount > 0 and cannot prove coherence', () => {
    // Legacy save without durableSessionRevision and without checkpoint
    const result = evaluateSessionCoherence(
      {
        activeSessionId: 'sess_legacy_unknown',
        activeBlueprint: mockBlueprint,
        gameState: { current_location: 'ORIGIN', inventory: ['ancient_amulet'] },
      },
      {
        blueprintId: 'bp_session_test',
        sessionId: 'sess_legacy_unknown',
        turnCount: 2,
        history: [{ id: '1', role: 'user', content: 'Explore', timestamp: 1000 }],
        lastTurnCheckpoint: null,
      }
    );

    expect(result.isCoherent).toBe(false);
    expect(result.status).toBe('MISMATCH');
    expect(result.reason).toContain('Unrecoverable legacy save');
  });

  it('9. migrates supported old-format save when turn state is corroborated between stores and repeat hydration is stable', () => {
    // Supported legacy save: corroborated turn counts across stores
    const legacyEngineMessages: Message[] = [
      { id: 'msg-1', role: 'narrative', content: 'Turn 1 narrative', timestamp: 1000 },
    ];

    useEngineStore.setState({
      activeSessionId: 'sess_legacy_supported',
      activeBlueprint: mockBlueprint,
      engineMessages: legacyEngineMessages,
      gameState: { current_location: 'ORIGIN' },
      durableSessionRevision: null,
    });

    useAppStore.setState({
      sessionId: 'sess_legacy_supported',
      blueprintId: 'bp_session_test',
      turnCount: 1,
      history: [{ id: '1', role: 'user', content: 'Do something', timestamp: 1000 }],
      durableSessionRevision: null,
    });

    // First reconciliation: migrates legacy save to durableSessionRevision
    const recon1 = reconcileSessionStores(useEngineStore, useAppStore);
    expect(recon1.isCoherent).toBe(true);
    expect(recon1.status).toBe('COHERENT');

    const appAfterMigration = useAppStore.getState();
    const engineAfterMigration = useEngineStore.getState();
    expect(appAfterMigration.durableSessionRevision).not.toBeNull();
    expect(engineAfterMigration.durableSessionRevision).not.toBeNull();
    expect(appAfterMigration.durableSessionRevision?.revision).toBe(
      engineAfterMigration.durableSessionRevision?.revision
    );

    // Repeat hydration: already has durable revision and remains 100% coherent and stable!
    const recon2 = reconcileSessionStores(useEngineStore, useAppStore);
    expect(recon2.isCoherent).toBe(true);
    expect(recon2.status).toBe('COHERENT');
  });
});
