import { LogicState, RatifiedEngineFrame } from '../types';
import { TurnResponse } from '../types/engineContract';
import { validateWorldMemoryReceipt } from './worldMemory';
import {
  FictionalTimeLedger,
  PursuitScheduleLedger,
  CastActivityEvent,
  SituatedPressureThread,
  ValueStateLedger,
  CharacterPursuitLedger,
  CharacterDevelopmentLedger,
} from '../types/horrorGrammar';

export interface HorrorGrammarPostStateProjection {
  fictional_time_ledger: FictionalTimeLedger;
  pursuit_schedule_ledger: PursuitScheduleLedger;
  activity_events: CastActivityEvent[];
  pressure_threads: SituatedPressureThread[];
  value_state_ledger: ValueStateLedger;
  character_pursuit_ledger: CharacterPursuitLedger;
  character_development_ledger: CharacterDevelopmentLedger;
}

export type HorrorGrammarTurnValidationResult =
  | {
      isValid: true;
      postState: HorrorGrammarPostStateProjection;
      errorCode?: never;
      reason?: never;
    }
  | {
      isValid: false;
      errorCode: string;
      reason: string;
      postState?: never;
    };

function isDeepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Pure validation of the complete HG1 receipt chain against pre-turn LogicState.
 * Guarantees that pre-states link to existing canonical state and transitions
 * follow strict sequential causal continuity.
 */
export function validateHorrorGrammarTurnReceipts(
  preState: LogicState | null | undefined,
  response: TurnResponse | RatifiedEngineFrame
): HorrorGrammarTurnValidationResult {
  const currentFictionalTime = preState?.fictional_time_ledger ?? {
    moment_revision: 0,
    scene_beat_revision: 0,
    extended_revision: 0,
    last_cost: null,
  };
  const currentPursuitSchedule = preState?.pursuit_schedule_ledger ?? {};
  const currentActivityEvents = preState?.activity_events ?? [];
  const currentPressureThreads = preState?.pressure_threads ?? [];
  const currentValueState = preState?.value_state_ledger ?? {};
  const currentCharacterPursuits = preState?.character_pursuit_ledger ?? {};
  const currentCharacterDevelopment = preState?.character_development_ledger ?? {};

  // 1. Receipt presence checks
  if (!response.fictionalTimeReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_FICTIONAL_TIME_RECEIPT',
      reason: 'Turn response is missing required fictionalTimeReceipt',
    };
  }
  if (!response.pursuitScheduleReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_PURSUIT_SCHEDULE_RECEIPT',
      reason: 'Turn response is missing required pursuitScheduleReceipt',
    };
  }
  if (!response.castActivityProposalReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_CAST_ACTIVITY_RECEIPT',
      reason: 'Turn response is missing required castActivityProposalReceipt',
    };
  }
  if (!response.situatedPressureReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_SITUATED_PRESSURE_RECEIPT',
      reason: 'Turn response is missing required situatedPressureReceipt',
    };
  }
  if (!response.valueStateReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_VALUE_STATE_RECEIPT',
      reason: 'Turn response is missing required valueStateReceipt',
    };
  }
  if (!response.characterPursuitReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_CHARACTER_PURSUIT_RECEIPT',
      reason: 'Turn response is missing required characterPursuitReceipt',
    };
  }
  if (!response.characterDevelopmentReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_CHARACTER_DEVELOPMENT_RECEIPT',
      reason: 'Turn response is missing required characterDevelopmentReceipt',
    };
  }
  if (!response.pressureThreadTransitionReceipt) {
    return {
      isValid: false,
      errorCode: 'MISSING_PRESSURE_THREAD_TRANSITION_RECEIPT',
      reason: 'Turn response is missing required pressureThreadTransitionReceipt',
    };
  }

  // 1b. World memory receipt pre-state check
  const wmValidation = validateWorldMemoryReceipt(preState?.world_memory, response.worldMemoryReceipt);
  if (!wmValidation.isValid) {
    return {
      isValid: false,
      errorCode: wmValidation.errorCode || 'WORLD_MEMORY_PRESTATE_MISMATCH',
      reason: wmValidation.reason || 'worldMemoryReceipt pre_state does not match canonical world_memory',
    };
  }

  // 2. Structural pre-state equality checks
  if (!isDeepEqual(response.fictionalTimeReceipt.preState, currentFictionalTime)) {
    return {
      isValid: false,
      errorCode: 'FICTIONAL_TIME_PRESTATE_MISMATCH',
      reason: 'fictionalTimeReceipt preState does not match canonical fictional_time_ledger',
    };
  }

  if (!isDeepEqual(response.pursuitScheduleReceipt.preState, currentPursuitSchedule)) {
    return {
      isValid: false,
      errorCode: 'PURSUIT_SCHEDULE_PRESTATE_MISMATCH',
      reason: 'pursuitScheduleReceipt preState does not match canonical pursuit_schedule_ledger',
    };
  }

  if (!isDeepEqual(response.castActivityProposalReceipt.preState, currentActivityEvents)) {
    return {
      isValid: false,
      errorCode: 'CAST_ACTIVITY_PRESTATE_MISMATCH',
      reason: 'castActivityProposalReceipt preState does not match canonical activity_events',
    };
  }

  if (!isDeepEqual(response.situatedPressureReceipt.preState, currentPressureThreads)) {
    return {
      isValid: false,
      errorCode: 'SITUATED_PRESSURE_PRESTATE_MISMATCH',
      reason: 'situatedPressureReceipt preState does not match canonical pressure_threads',
    };
  }

  if (!isDeepEqual(response.valueStateReceipt.preState, currentValueState)) {
    return {
      isValid: false,
      errorCode: 'VALUE_STATE_PRESTATE_MISMATCH',
      reason: 'valueStateReceipt preState does not match canonical value_state_ledger',
    };
  }

  if (!isDeepEqual(response.characterPursuitReceipt.preState, currentCharacterPursuits)) {
    return {
      isValid: false,
      errorCode: 'CHARACTER_PURSUIT_PRESTATE_MISMATCH',
      reason: 'characterPursuitReceipt preState does not match canonical character_pursuit_ledger',
    };
  }

  if (!isDeepEqual(response.characterDevelopmentReceipt.preState, currentCharacterDevelopment)) {
    return {
      isValid: false,
      errorCode: 'CHARACTER_DEVELOPMENT_PRESTATE_MISMATCH',
      reason: 'characterDevelopmentReceipt preState does not match canonical character_development_ledger',
    };
  }

  // 3. Pressure thread transition linkage: transition preState must match situated pressure postState
  if (!isDeepEqual(response.pressureThreadTransitionReceipt.preState, response.situatedPressureReceipt.postState)) {
    return {
      isValid: false,
      errorCode: 'PRESSURE_TRANSITION_LINKAGE_MISMATCH',
      reason: 'pressureThreadTransitionReceipt preState does not match situatedPressureReceipt postState',
    };
  }

  return {
    isValid: true,
    postState: {
      fictional_time_ledger: response.fictionalTimeReceipt.postState,
      pursuit_schedule_ledger: response.pursuitScheduleReceipt.postState,
      activity_events: response.castActivityProposalReceipt.postState,
      pressure_threads: response.pressureThreadTransitionReceipt.postState,
      value_state_ledger: response.valueStateReceipt.postState,
      character_pursuit_ledger: response.characterPursuitReceipt.postState,
      character_development_ledger: response.characterDevelopmentReceipt.postState,
    },
  };
}
