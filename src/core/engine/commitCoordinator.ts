import {
  LogicState,
  LogicStateSchema,
  SpatialNode,
  HorrorVector,
  ExposureTier,
  Message,
  NarrativeBlock,
  RuntimeStateSnapshot,
  DurableSessionRevision,
} from '../../types';
import type { CommittedTurnPayload } from './events';
import type { AppStore } from '../../store/useAppStore';
import type { EngineState } from '../store';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../store';
import { engineReducer } from './reducer';

export interface AppStoreSlice {
  sessionId: string | null;
  blueprintId: string | null;
  canonicalRevision: number;
  durableSessionRevision: DurableSessionRevision | null;
  turnCount: number;
  currentNodeId: string;
  spatialGraph: SpatialNode[];
  activeVector: HorrorVector;
  activeTier: ExposureTier;
  currentPhase: string;
  tensionLevel: number;
  reconciliationRevision: number;
  history: Message[];
  storyLog: NarrativeBlock[];
  activeMemory: AppStore['activeMemory'];
  lastTurnCheckpoint: AppStore['lastTurnCheckpoint'];
}

export interface CanonicalSimulationState {
  app: AppStoreSlice;
  gameState: LogicState | null;
  turnNumber: number;
  sharedRevision: number;
  isPublicationInProgress: boolean;
}

// In-flight publication lock & snapshot cache
let _isPublicationInProgress = false;
let _sharedPublicationRevision = 0;
let _prePublicationAppSlice: AppStoreSlice | null = null;
let _prePublicationGameState: LogicState | null = null;

export function isCanonicalPublicationInProgress(): boolean {
  return _isPublicationInProgress;
}

export function getSharedPublicationRevision(): number {
  return _sharedPublicationRevision;
}

/**
 * Deep-clones data objects (arrays/records/objects) to prevent nested in-place mutation.
 * Does not clone store functions or action closures.
 */
export function cloneDataSlice<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map((item) => cloneDataSlice(item)) as unknown as T;
  }
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
    if (typeof val === 'function') continue;
    result[key] = cloneDataSlice(val);
  }
  return result as T;
}

/**
 * Captures a pure data-only slice of the AppStore without action closures.
 */
export function captureAppSlice(state: AppStore): AppStoreSlice {
  return {
    sessionId: state.sessionId,
    blueprintId: state.blueprintId,
    canonicalRevision: state.canonicalRevision ?? 0,
    durableSessionRevision: state.durableSessionRevision ? cloneDataSlice(state.durableSessionRevision) : null,
    turnCount: state.turnCount,
    currentNodeId: state.currentNodeId,
    spatialGraph: cloneDataSlice(state.spatialGraph || []),
    activeVector: state.activeVector,
    activeTier: state.activeTier,
    currentPhase: state.currentPhase,
    tensionLevel: state.tensionLevel,
    reconciliationRevision: state.reconciliationRevision,
    history: cloneDataSlice(state.history || []),
    storyLog: cloneDataSlice(state.storyLog || []),
    activeMemory: cloneDataSlice(state.activeMemory || { systemFlags: [], somaState: [], geomState: [] }),
    lastTurnCheckpoint: cloneDataSlice(state.lastTurnCheckpoint),
  };
}

/**
 * Coherent cross-store simulation state accessor.
 * If publication is currently in progress, returns the complete pre-turn snapshot pair.
 * Otherwise returns the current coherent pair from stores.
 */
export function getCanonicalSimulationState(): CanonicalSimulationState {
  if (_isPublicationInProgress && _prePublicationAppSlice) {
    return {
      app: _prePublicationAppSlice,
      gameState: _prePublicationGameState,
      turnNumber: _prePublicationAppSlice.turnCount,
      sharedRevision: _sharedPublicationRevision,
      isPublicationInProgress: true,
    };
  }

  const appState = useAppStore.getState();
  const engineState = useEngineStore.getState();
  const appSlice = captureAppSlice(appState);
  const gameState = engineState.gameState ? cloneDataSlice(engineState.gameState) : null;

  return {
    app: appSlice,
    gameState,
    turnNumber: appSlice.turnCount,
    sharedRevision: _sharedPublicationRevision,
    isPublicationInProgress: false,
  };
}

// Allowlisted strictly non-canonical presentation fields
const ALLOWED_PRESENTATION_KEYS = new Set([
  'npc_fixations',
  'cast_ledger',
  'current_tension_level',
  'intent_classification',
  'intent_synergy',
  'suggested_tension',
]);

/**
 * Filters a presentation patch so it can NEVER mutate canonical simulation fields.
 */
export function filterAllowlistedPresentationPatch(
  patch: Partial<LogicState>
): Partial<LogicState> {
  const safePatch: Partial<LogicState> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (ALLOWED_PRESENTATION_KEYS.has(key)) {
      (safePatch as Record<string, unknown>)[key] = value;
    }
  }
  return safePatch;
}

export class ObsoleteTurnPublicationError extends Error {
  readonly code = 'OBSOLETE_TURN_ATTEMPT';
  constructor(message: string) {
    super(message);
    this.name = 'ObsoleteTurnPublicationError';
  }
}

/**
 * Validates that a turn attempt is current with respect to the active canonical application state.
 * Returns false if sessionId, blueprintId, turnCount, or canonicalRevision do not match.
 */
export function isTurnAttemptCurrent(
  currentApp: AppStoreSlice | AppStore | null | undefined,
  preSnapshot?: RuntimeStateSnapshot | null
): boolean {
  if (!currentApp || !preSnapshot) return false;

  // Session ID comparison: normalized to empty string fallback
  const currentSessionId = currentApp.sessionId || '';
  const attemptSessionId = preSnapshot.sessionId || '';
  if (currentSessionId !== attemptSessionId) {
    return false;
  }

  // Blueprint ID comparison: normalized to empty string fallback
  const currentBlueprintId = currentApp.blueprintId || '';
  const attemptBlueprintId = preSnapshot.blueprintId || '';
  if (currentBlueprintId !== attemptBlueprintId) {
    return false;
  }

  // Turn count comparison: must match exact turn count
  if (
    typeof preSnapshot.turnCount === 'number' &&
    typeof currentApp.turnCount === 'number' &&
    preSnapshot.turnCount !== currentApp.turnCount
  ) {
    return false;
  }

  // Canonical revision comparison: attempt generation token must match if tracked
  if (
    typeof preSnapshot.canonicalRevision === 'number' &&
    typeof currentApp.canonicalRevision === 'number' &&
    preSnapshot.canonicalRevision !== currentApp.canonicalRevision
  ) {
    return false;
  }

  return true;
}

export interface CoordinateTurnPublicationParams {
  appStore?: {
    getState: () => AppStore;
    setState: (partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>)) => void;
  };
  engineStore?: {
    getState: () => EngineState;
    setState: (partial: Partial<EngineState> | ((state: EngineState) => Partial<EngineState>)) => void;
  };
  committedPayload: CommittedTurnPayload;
  preparedGameState: LogicState;
  presentationPatch?: Partial<LogicState>;
}

/**
 * Coordinates publication of a ratified turn across AppStore and EngineStore.
 * Enforces authoritative schema validation, pre-computation of both post-turn states,
 * revision lock, atomic publication, rollback on write error, and isolated post-commit presentation projection.
 */
export function coordinateCanonicalTurnPublication({
  appStore = useAppStore,
  engineStore = useEngineStore,
  committedPayload,
  preparedGameState,
  presentationPatch,
}: CoordinateTurnPublicationParams): void {
  // 0. Boundary admission check: verify turn attempt matches active session and canonical revision
  const currentApp = appStore.getState();
  if (!isTurnAttemptCurrent(currentApp, committedPayload.preSnapshot)) {
    throw new ObsoleteTurnPublicationError(
      `Turn attempt is obsolete and cannot be published into active session. ` +
      `Attempt: session=${committedPayload.preSnapshot?.sessionId ?? 'none'}, ` +
      `blueprint=${committedPayload.preSnapshot?.blueprintId ?? 'none'}, ` +
      `rev=${committedPayload.preSnapshot?.canonicalRevision ?? 'none'}, ` +
      `turn=${committedPayload.preSnapshot?.turnCount ?? 'none'}. ` +
      `Active: session=${currentApp.sessionId ?? 'none'}, ` +
      `blueprint=${currentApp.blueprintId ?? 'none'}, ` +
      `rev=${currentApp.canonicalRevision ?? 'none'}, ` +
      `turn=${currentApp.turnCount}.`
    );
  }

  // 1. Authoritative pre-flight schema validation
  const validatedGameState = LogicStateSchema.parse(preparedGameState) as LogicState;

  // Calculate next durable revision token
  const nextTurnCount = (currentApp.turnCount ?? 0) + 1;
  const currentRev = currentApp.durableSessionRevision?.revision ?? currentApp.canonicalRevision ?? 0;
  const nextCommitRev = currentRev + 1;
  const committedAt = Date.now();

  const nextDurableRevision: DurableSessionRevision = {
    sessionId: currentApp.sessionId || '',
    blueprintId: currentApp.blueprintId || '',
    turnCount: nextTurnCount,
    revision: nextCommitRev,
    committedAt,
  };

  // 2. Capture pure pre-turn data slices
  const preAppSlice = captureAppSlice(appStore.getState());
  const preEngineState = {
    gameState: engineStore.getState().gameState
      ? cloneDataSlice(engineStore.getState().gameState)
      : null,
    durableSessionRevision: engineStore.getState().durableSessionRevision
      ? cloneDataSlice(engineStore.getState().durableSessionRevision)
      : null,
    lastTurnCheckpoint: engineStore.getState().lastTurnCheckpoint
      ? cloneDataSlice(engineStore.getState().lastTurnCheckpoint)
      : null,
  };
  const preGameState = preEngineState.gameState;

  // 3. Pre-compute both complete post-turn states before publication
  const computedPostAppState = engineReducer(appStore.getState(), {
    type: 'TURN_COMMITTED',
    payload: committedPayload,
  });
  const postAppState = {
    ...computedPostAppState,
    canonicalRevision: nextCommitRev,
    durableSessionRevision: nextDurableRevision,
    lastTurnCheckpoint: computedPostAppState.lastTurnCheckpoint
      ? {
          ...computedPostAppState.lastTurnCheckpoint,
          durableSessionRevisionBefore: currentApp.durableSessionRevision,
        }
      : null,
  };
  const postGameState = cloneDataSlice(validatedGameState);
  const postEngineCheckpoint = {
    revision: currentRev,
    turnCount: currentApp.turnCount ?? 0,
    gameStateBefore: preGameState,
  };

  // 4. Set publication fence
  _isPublicationInProgress = true;
  _prePublicationAppSlice = preAppSlice;
  _prePublicationGameState = preGameState;

  try {
    // 5. Coordinated publication:
    // A. Commit canonical application state & checkpoint
    appStore.setState(postAppState);

    // B. Commit prepared situated game state, durable revision & engine checkpoint
    engineStore.setState({
      gameState: postGameState,
      durableSessionRevision: nextDurableRevision,
      lastTurnCheckpoint: postEngineCheckpoint,
    });

    // C. Both writes succeeded: advance shared publication revision
    _sharedPublicationRevision += 1;
  } catch (err) {
    // Rollback: restore both stores immediately to pre-turn snapshots before failure emission
    appStore.setState(preAppSlice);
    engineStore.setState(preEngineState);
    throw err;
  } finally {
    _isPublicationInProgress = false;
    _prePublicationAppSlice = null;
    _prePublicationGameState = null;
  }

  // 6. Post-commit presentation projection (strictly presentation-only, fails gracefully)
  if (presentationPatch && Object.keys(presentationPatch).length > 0) {
    try {
      const filtered = filterAllowlistedPresentationPatch(presentationPatch);
      if (Object.keys(filtered).length > 0) {
        engineStore.setState((state) => ({
          gameState: state.gameState ? { ...state.gameState, ...filtered } : filtered,
        }));
      }
    } catch (projErr) {
      console.warn(
        '[CommitCoordinator] Presentation projection failed post-commit; presentation degraded gracefully:',
        projErr
      );
      // Never throw, never emit TURN_FAILED, never rollback valid canonical turn
    }
  }
}
