import {
  LogicState,
  LogicStateSchema,
  SpatialNode,
  HorrorVector,
  ExposureTier,
  Message,
  NarrativeBlock,
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
  // 1. Authoritative pre-flight schema validation
  const validatedGameState = LogicStateSchema.parse(preparedGameState) as LogicState;

  // 2. Capture pure pre-turn data slices
  const preAppSlice = captureAppSlice(appStore.getState());
  const preGameState = engineStore.getState().gameState
    ? cloneDataSlice(engineStore.getState().gameState)
    : null;

  // 3. Pre-compute both complete post-turn states before publication
  const postAppState = engineReducer(appStore.getState(), {
    type: 'TURN_COMMITTED',
    payload: committedPayload,
  });
  const postGameState = cloneDataSlice(validatedGameState);

  // 4. Set publication fence
  _isPublicationInProgress = true;
  _prePublicationAppSlice = preAppSlice;
  _prePublicationGameState = preGameState;

  try {
    // 5. Coordinated publication:
    // A. Commit canonical application state & checkpoint
    appStore.setState(postAppState);

    // B. Commit prepared situated game state
    engineStore.setState({ gameState: postGameState });

    // C. Both writes succeeded: advance shared publication revision
    _sharedPublicationRevision += 1;
  } catch (err) {
    // Rollback: restore both stores immediately to pre-turn snapshots before failure emission
    appStore.setState(preAppSlice);
    engineStore.setState({ gameState: preGameState });
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
