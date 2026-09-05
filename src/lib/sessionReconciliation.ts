import { useState, useEffect } from 'react';
import type { Blueprint, LogicState, DurableSessionRevision } from '../types';
import type { AppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { useAppStore } from '../store/useAppStore';

export interface StoreReconciliationResult {
  isCoherent: boolean;
  status: 'COHERENT' | 'MISMATCH' | 'CORRUPT' | 'CLEAN_SETUP' | 'RECOVERABLE_CHECKPOINT';
  reason?: string;
  recoveryTarget?: 'PREVIOUS_REVISION' | 'MIGRATE_LEGACY';
  recoveredRevision?: number;
  isRevisionMismatch?: boolean;
}

export interface EvaluateSessionCoherenceEngineState {
  activeSessionId?: string | null;
  activeBlueprint: Blueprint | null;
  durableSessionRevision?: DurableSessionRevision | null;
  lastTurnCheckpoint?: {
    revision: number;
    turnCount: number;
    gameStateBefore: LogicState | null;
  } | null;
  gameState: LogicState | null;
  engineMessages?: unknown[];
}

/**
 * Validates cross-store identity and coherence between the Engine store and the App runtime-session store.
 * Verifies shared durable commit boundary and detects split or interrupted revisions.
 */
export function evaluateSessionCoherence(
  engineState: EvaluateSessionCoherenceEngineState,
  appState: Partial<AppStore>
): StoreReconciliationResult {
  const {
    activeSessionId,
    activeBlueprint,
    gameState,
    durableSessionRevision: engineDurableRev,
    engineMessages,
  } = engineState;
  const {
    blueprintId,
    sessionId,
    turnCount,
    history,
    durableSessionRevision: appDurableRev,
    lastTurnCheckpoint: appCheckpoint,
  } = appState;

  // Case 1: No active Blueprint loaded in Engine store
  if (!activeBlueprint) {
    const hasOrphanAppTurns =
      (typeof turnCount === 'number' && turnCount > 0) ||
      (Array.isArray(history) && history.length > 0) ||
      (typeof blueprintId === 'string' && blueprintId.trim().length > 0 && blueprintId !== 'unknown') ||
      (typeof sessionId === 'string' && sessionId.trim().length > 0);

    if (hasOrphanAppTurns) {
      return {
        isCoherent: false,
        status: 'MISMATCH',
        reason: 'App store has active session data but Engine store has no active blueprint.',
      };
    }

    if (activeSessionId && typeof activeSessionId === 'string' && activeSessionId.trim().length > 0) {
      return {
        isCoherent: false,
        status: 'MISMATCH',
        reason: 'Engine store has activeSessionId but no active blueprint.',
      };
    }

    return { isCoherent: true, status: 'CLEAN_SETUP' };
  }

  // Case 2: Active Blueprint is loaded in Engine store
  const activeBlueprintId = activeBlueprint.id || 'unknown';

  // Invariant: Engine activeSessionId must be present and non-empty
  if (!activeSessionId || typeof activeSessionId !== 'string' || activeSessionId.trim().length === 0) {
    return {
      isCoherent: false,
      status: 'MISMATCH',
      reason: 'Engine store has active Blueprint but lacks a valid activeSessionId.',
    };
  }

  // Invariant: App store sessionId must be present and non-empty
  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return {
      isCoherent: false,
      status: 'MISMATCH',
      reason: 'App store is missing a valid sessionId for the active Blueprint session.',
    };
  }

  // Invariant: sessionId across both stores must match identically
  if (sessionId !== activeSessionId) {
    return {
      isCoherent: false,
      status: 'MISMATCH',
      reason: `Session ID mismatch: Engine has '${activeSessionId}' but App session has '${sessionId}'.`,
    };
  }

  // If App store has a blueprintId, it must match the active blueprint id
  if (blueprintId && blueprintId !== 'unknown' && blueprintId !== activeBlueprintId) {
    return {
      isCoherent: false,
      status: 'MISMATCH',
      reason: `Blueprint ID mismatch: Engine has '${activeBlueprintId}' but App session has '${blueprintId}'.`,
    };
  }

  // If App store has completed turn progress (turnCount > 0), sessionId must exist
  const hasCompletedTurnProgress = typeof turnCount === 'number' && turnCount > 0;

  if (hasCompletedTurnProgress && (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0)) {
    return {
      isCoherent: false,
      status: 'CORRUPT',
      reason: 'App store contains completed turns but is missing a valid sessionId.',
    };
  }

  // Check character binding integrity if a player_character_id is bound
  if (gameState?.player_character_id) {
    const cast = activeBlueprint.cast || [];
    const characterExists = cast.some((c) => c.id === gameState.player_character_id);
    if (!characterExists) {
      return {
        isCoherent: false,
        status: 'CORRUPT',
        reason: `Bound player_character_id '${gameState.player_character_id}' does not exist in active Blueprint cast.`,
      };
    }
  }

  // --- Step 3: Shared Durable Commit Boundary & Revision Verification ---
  const effectiveAppTurnCount = typeof turnCount === 'number' ? turnCount : 0;

  // Branch A: Both stores carry durableSessionRevision
  if (appDurableRev && engineDurableRev) {
    const revMatch = appDurableRev.revision === engineDurableRev.revision;
    const turnMatch = appDurableRev.turnCount === engineDurableRev.turnCount;
    const sessionMatch = appDurableRev.sessionId === engineDurableRev.sessionId;
    const bpMatch = appDurableRev.blueprintId === engineDurableRev.blueprintId;

    if (revMatch && turnMatch && sessionMatch && bpMatch) {
      return { isCoherent: true, status: 'COHERENT' };
    }

    // Split / interrupted write: check if previous complete revision is recoverable via checkpoint
    // Case 1: App is ahead (e.g. App committed turn N, Engine write failed/interrupted at turn N-1)
    if (
      appDurableRev.revision > engineDurableRev.revision &&
      appCheckpoint &&
      appCheckpoint.engineStateBefore?.turnCount === engineDurableRev.turnCount
    ) {
      return {
        isCoherent: false,
        status: 'RECOVERABLE_CHECKPOINT',
        reason: `Interrupted persistence detected: App is at revision ${appDurableRev.revision} (turn ${appDurableRev.turnCount}) but Engine is at revision ${engineDurableRev.revision} (turn ${engineDurableRev.turnCount}). Complete checkpoint for revision ${engineDurableRev.revision} is available.`,
        recoveryTarget: 'PREVIOUS_REVISION',
        isRevisionMismatch: true,
      };
    }

    // Case 2: Engine is ahead (e.g. Engine committed turn N, App write failed/interrupted at turn N-1)
    if (
      engineDurableRev.revision > appDurableRev.revision &&
      engineState.lastTurnCheckpoint &&
      engineState.lastTurnCheckpoint.turnCount === appDurableRev.turnCount
    ) {
      return {
        isCoherent: false,
        status: 'RECOVERABLE_CHECKPOINT',
        reason: `Interrupted persistence detected: Engine is at revision ${engineDurableRev.revision} (turn ${engineDurableRev.turnCount}) but App is at revision ${appDurableRev.revision} (turn ${appDurableRev.turnCount}). Complete checkpoint for revision ${appDurableRev.revision} is available.`,
        recoveryTarget: 'PREVIOUS_REVISION',
        isRevisionMismatch: true,
      };
    }

    // Unrecoverable revision mismatch
    return {
      isCoherent: false,
      status: 'MISMATCH',
      reason: `Durable revision mismatch: App has revision ${appDurableRev.revision} (turn ${appDurableRev.turnCount}) but Engine has revision ${engineDurableRev.revision} (turn ${engineDurableRev.turnCount}). No complete checkpoint can recover this disparity.`,
      isRevisionMismatch: true,
    };
  }

  // Branch B: Legacy save migration (one or both stores lack durableSessionRevision)
  // Subcase 1: Clean setup at turn 0
  const isCleanAppTurn0 = effectiveAppTurnCount === 0 && (!history || history.length === 0);
  if (isCleanAppTurn0) {
    return {
      isCoherent: true,
      status: 'COHERENT',
      recoveryTarget: 'MIGRATE_LEGACY',
      recoveredRevision: 1,
    };
  }

  // Subcase 2: Legacy save with turn progress:
  // Check if App has a valid checkpoint that can restore a known complete previous turn
  if (
    appCheckpoint &&
    typeof appCheckpoint.engineStateBefore?.turnCount === 'number' &&
    appCheckpoint.engineStateBefore.turnCount < effectiveAppTurnCount
  ) {
    const cpTurn = appCheckpoint.engineStateBefore.turnCount;
    return {
      isCoherent: false,
      status: 'RECOVERABLE_CHECKPOINT',
      reason: `Legacy save interrupted: App turn ${effectiveAppTurnCount} has valid checkpoint for turn ${cpTurn}.`,
      recoveryTarget: 'PREVIOUS_REVISION',
      isRevisionMismatch: true,
    };
  }

  // Subcase 3: Legacy save where turn counts are corroborated between stores
  const engineTurnCount = Array.isArray(engineMessages) ? engineMessages.length : undefined;
  const isCorroborated =
    typeof engineTurnCount === 'number' &&
    (engineTurnCount === effectiveAppTurnCount || engineTurnCount === (history?.length || 0));

  if (isCorroborated) {
    return {
      isCoherent: true,
      status: 'COHERENT',
      recoveryTarget: 'MIGRATE_LEGACY',
      recoveredRevision: effectiveAppTurnCount + 1,
    };
  }

  // An unrecoverable legacy pair (e.g. diagnostic: App dropped key on turn 2, Engine inventory retains key from turn 1)
  return {
    isCoherent: false,
    status: 'MISMATCH',
    reason: `Unrecoverable legacy save: cannot prove durable cross-store coherence from IDs alone for App turn ${effectiveAppTurnCount}.`,
    isRevisionMismatch: true,
  };
}

/**
 * Reconciles the Engine store and App session store, recovering from checkpoints when available
 * and failing closed without destroying evidence if unrecoverable incoherence is detected.
 */
export function reconcileSessionStores(
  engineStore: typeof useEngineStore,
  appStore: typeof useAppStore
): StoreReconciliationResult {
  const engineState = engineStore.getState();
  const appState = appStore.getState();

  const evalResult = evaluateSessionCoherence(engineState, appState);

  // If recoverable from checkpoint, safely restore the stores to the complete known revision
  if (evalResult.status === 'RECOVERABLE_CHECKPOINT' && evalResult.recoveryTarget === 'PREVIOUS_REVISION') {
    const appRev = appState.durableSessionRevision?.revision ?? (appState.canonicalRevision || 0);
    const engineRev = engineState.durableSessionRevision?.revision ?? 0;

    if (appRev > engineRev && appState.lastTurnCheckpoint) {
      // App was ahead: rollback App to lastTurnCheckpoint
      const cp = appState.lastTurnCheckpoint;
      const targetTurn = (cp.engineStateBefore?.turnCount as number) ?? 0;
      const targetRev = engineState.durableSessionRevision?.revision ?? 1;

      const recoveredDurableRevision: DurableSessionRevision = {
        sessionId: appState.sessionId || engineState.activeSessionId || '',
        blueprintId: appState.blueprintId || engineState.activeBlueprint?.id || '',
        revision: targetRev,
        turnCount: targetTurn,
        committedAt: Date.now(),
      };

      appStore.setState({
        ...cp.engineStateBefore,
        durableSessionRevision: recoveredDurableRevision,
        lastTurnCheckpoint: null,
      });

      return {
        isCoherent: true,
        status: 'COHERENT',
        reason: `Successfully recovered complete previous revision ${targetRev} (turn ${targetTurn}) from checkpoint.`,
        recoveredRevision: targetRev,
      };
    } else if (engineRev > appRev && engineState.lastTurnCheckpoint) {
      // Engine was ahead: rollback Engine to lastTurnCheckpoint
      const cp = engineState.lastTurnCheckpoint;
      const targetTurn = cp.turnCount;
      const targetRev = appState.durableSessionRevision?.revision ?? 1;

      const recoveredDurableRevision: DurableSessionRevision = {
        sessionId: appState.sessionId || engineState.activeSessionId || '',
        blueprintId: appState.blueprintId || engineState.activeBlueprint?.id || '',
        revision: targetRev,
        turnCount: targetTurn,
        committedAt: Date.now(),
      };

      engineStore.setState({
        gameState: cp.gameStateBefore,
        durableSessionRevision: recoveredDurableRevision,
        lastTurnCheckpoint: null,
      });

      return {
        isCoherent: true,
        status: 'COHERENT',
        reason: `Successfully recovered complete previous revision ${targetRev} (turn ${targetTurn}) from checkpoint.`,
        recoveredRevision: targetRev,
      };
    }
  }

  // If coherent and legacy migration is requested, write the durable revision token to both stores
  if (evalResult.isCoherent && evalResult.recoveryTarget === 'MIGRATE_LEGACY') {
    const rev = evalResult.recoveredRevision || 1;
    const turn = appState.turnCount || 0;
    const migratedRevision: DurableSessionRevision = {
      sessionId: appState.sessionId || engineState.activeSessionId || '',
      blueprintId: appState.blueprintId || engineState.activeBlueprint?.id || '',
      revision: rev,
      turnCount: turn,
      committedAt: Date.now(),
    };
    appStore.setState({ durableSessionRevision: migratedRevision });
    engineStore.setState({ durableSessionRevision: migratedRevision });
  }

  if (!evalResult.isCoherent) {
    // Fail closed: if cross-session or cross-blueprint identity collision, clear contaminated session.
    // For revision mismatches or unrecoverable legacy saves, preserve evidence without erasing it.
    if (!evalResult.isRevisionMismatch) {
      appStore.getState().resetSession();
    }
    return evalResult;
  }

  // If coherent and App store is missing blueprintId for active blueprint, link it
  if (
    engineState.activeBlueprint?.id &&
    (!appState.blueprintId || appState.blueprintId === 'unknown')
  ) {
    appStore.setState({ blueprintId: engineState.activeBlueprint.id });
  }

  return evalResult;
}

/**
 * Hook to coordinate dual-store hydration and cross-store reconciliation before entering Runtime.
 */
export function useHydratedStores() {
  const [engineHydrated, setEngineHydrated] = useState(() => useEngineStore.persist.hasHydrated());
  const [appHydrated, setAppHydrated] = useState(() => useAppStore.persist.hasHydrated());
  const [reconciliation, setReconciliation] = useState<StoreReconciliationResult>(() => {
    if (useEngineStore.persist.hasHydrated() && useAppStore.persist.hasHydrated()) {
      return reconcileSessionStores(useEngineStore, useAppStore);
    }
    return { isCoherent: false, status: 'CLEAN_SETUP' };
  });

  useEffect(() => {
    const handleHydrationState = () => {
      const isEngineDone = useEngineStore.persist.hasHydrated();
      const isAppDone = useAppStore.persist.hasHydrated();
      if (isEngineDone) setEngineHydrated(true);
      if (isAppDone) setAppHydrated(true);
      if (isEngineDone && isAppDone) {
        const result = reconcileSessionStores(useEngineStore, useAppStore);
        setReconciliation(result);
      }
    };

    const unsubEngineHydrate = useEngineStore.persist.onHydrate(() => setEngineHydrated(false));
    const unsubEngineFinish = useEngineStore.persist.onFinishHydration(() => {
      setEngineHydrated(true);
      handleHydrationState();
    });
    const unsubAppHydrate = useAppStore.persist.onHydrate(() => setAppHydrated(false));
    const unsubAppFinish = useAppStore.persist.onFinishHydration(() => {
      setAppHydrated(true);
      handleHydrationState();
    });

    return () => {
      unsubEngineHydrate();
      unsubEngineFinish();
      unsubAppHydrate();
      unsubAppFinish();
    };
  }, []);

  const isHydrated = engineHydrated && appHydrated;
  return {
    isHydrated,
    isCoherent: isHydrated && reconciliation.isCoherent,
    status: isHydrated ? reconciliation.status : ('HYDRATING' as const),
    reason: reconciliation.reason,
  };
}
