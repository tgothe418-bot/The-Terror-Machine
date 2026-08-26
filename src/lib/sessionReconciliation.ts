import { useState, useEffect } from 'react';
import type { Blueprint, LogicState } from '../types';
import type { AppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { useAppStore } from '../store/useAppStore';

export interface StoreReconciliationResult {
  isCoherent: boolean;
  status: 'COHERENT' | 'MISMATCH' | 'CORRUPT' | 'CLEAN_SETUP';
  reason?: string;
}

/**
 * Validates cross-store identity and coherence between the Engine store and the App runtime-session store.
 */
export function evaluateSessionCoherence(
  engineState: {
    activeSessionId?: string | null;
    activeBlueprint: Blueprint | null;
    gameState: LogicState | null;
  },
  appState: Partial<AppStore>
): StoreReconciliationResult {
  const { activeSessionId, activeBlueprint, gameState } = engineState;
  const { blueprintId, sessionId, turnCount, history } = appState;

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

  return { isCoherent: true, status: 'COHERENT' };
}

/**
 * Reconciles the Engine store and App session store, failing closed if incoherence is detected.
 */
export function reconcileSessionStores(
  engineStore: typeof useEngineStore,
  appStore: typeof useAppStore
): StoreReconciliationResult {
  const engineState = engineStore.getState();
  const appState = appStore.getState();

  const evalResult = evaluateSessionCoherence(engineState, appState);

  if (!evalResult.isCoherent) {
    // Fail closed: clear contaminated session state to prevent state blending
    appStore.getState().resetSession();
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
