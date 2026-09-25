import {
  CircumstanceFacts,
  DeathContract,
  DeathRecord,
  DeathReceipt,
  SuccessionPolicy,
} from '../types/death';
import {
  determinePrimaryWound,
  evaluateSurvivability,
  transferWounds,
  WoundLedger,
} from './deathLedger';
import {
  removeCohortMember,
} from './cohortEngine';
import type { CohortState } from '../types/cohort';
import type { NodeEvidenceItem } from './cohortBehaviors';
import { createCorpseEvidenceNode } from './evidenceRegistry';

export interface DeathEngineState {
  turnCount: number;
  fictionalTime: number; // in seconds
  povCharacterId?: string | null;
  deathRecords: DeathRecord[];
  deathLedger: WoundLedger;
  cohortState?: CohortState;
  nodeEvidence?: Record<string, NodeEvidenceItem[]>;
  castPlacement?: Record<string, string>;
  deathContract?: DeathContract;
  cast?: Array<{
    id: string;
    name?: string;
    disposition?: string;
    isUndead?: boolean;
    [k: string]: unknown;
  }>;
  pendingSacrificeFor?: string;
  cancelledTicks?: string[];
  silencedDevices?: string[];
  pressureEvents?: Array<{ type: string; weight: number; targetRef: string }>;
}

export interface DeclareDeathResult {
  receipt: DeathReceipt;
  nextState: DeathEngineState;
}

/**
 * The single deterministic choke point for death declarations (§5).
 * Every death in the system passes through here.
 */
export function declareDeath(
  characterId: string,
  verdictFactIds: string[],
  state: DeathEngineState
): DeclareDeathResult {
  const wounds = state.deathLedger[characterId] || [];
  const primaryWound = determinePrimaryWound(verdictFactIds, wounds);

  const characterObj = (state.cast || []).find((c) => c.id === characterId);
  const characterName = characterObj?.name || characterId;
  const isPovDeath = characterId === state.povCharacterId;
  const isSacrifice =
    primaryWound?.valence === 'sacrifice' || Boolean(state.pendingSacrificeFor);

  const deathRecordId = `death-${characterId}-t${state.turnCount}`;
  const record: DeathRecord = {
    id: deathRecordId,
    characterId,
    characterName,
    woundFactIds: [...verdictFactIds],
    primaryWoundFactId: primaryWound?.id || (verdictFactIds[0] ?? ''),
    valence: isSacrifice ? 'sacrifice' : (primaryWound?.valence || 'accident'),
    declaredAtTurn: state.turnCount,
    declaredAtFictionalTime: state.fictionalTime,
    isPovDeath,
    isSacrifice,
    sacrificeForCharacterId: state.pendingSacrificeFor,
    causedByCharacterId: primaryWound?.inflictedByCharacterId,
  };

  let nextCohortState = state.cohortState ? { ...state.cohortState } : undefined;
  let cohortDisruptionShockApplied = false;
  let successionPolicyApplied: SuccessionPolicy | undefined = undefined;

  // Step 2: Cohort propagation
  if (nextCohortState && nextCohortState.members[characterId]) {
    // Call existing removeCohortMember (opens vulnerability window and applies max disruption shock)
    nextCohortState = removeCohortMember(
      nextCohortState,
      characterId,
      'DEATH',
      undefined,
      state.fictionalTime
    );
    cohortDisruptionShockApplied = true;
  }

  // Step 3: Succession policy
  const successionPolicy =
    state.deathContract?.seatSuccession?.[characterId] || 'dormant';
  successionPolicyApplied = successionPolicy;

  let nextCast = state.cast ? [...state.cast] : [];
  const metaphysics =
    state.deathContract?.deathMetaphysics ?? state.deathContract?.metaphysics ?? 'mundane';
  if (metaphysics === 'zombie') {
    // Zombie metaphysics: original characterId preserved, isUndead: true, disposition HOSTILE
    // DeathRecord remains immutable (mortality = DECEASED, agency = ACTIVE, metaphysical state = UNDEAD)
    nextCast = nextCast.map((c) => {
      if (c.id === characterId) {
        return {
          ...c,
          isUndead: true,
          disposition: 'HOSTILE',
        };
      }
      return c;
    });
  }

  // Step 4: Corpse as evidence — write to session.nodeEvidence[nodeId]
  const targetNodeId =
    state.castPlacement?.[characterId] || 'origin';
  const corpseNode = createCorpseEvidenceNode(record, targetNodeId);

  const nextNodeEvidence: Record<string, NodeEvidenceItem[]> = {
    ...(state.nodeEvidence || {}),
  };
  const existingNodeEvidence = nextNodeEvidence[targetNodeId] || [];
  nextNodeEvidence[targetNodeId] = [...existingNodeEvidence, corpseNode];

  // Step 5: Pressure — maximum-weight pressure event and phase signal
  const nextPressureEvents = [
    ...(state.pressureEvents || []),
    {
      type: 'DEATH_DECLARED',
      weight: 1.0,
      targetRef: deathRecordId,
    },
  ];

  // Step 6: Janitorial — dead character's scheduled ticks cancelled, devices silenced
  const nextCancelledTicks = Array.from(
    new Set([...(state.cancelledTicks || []), characterId])
  );
  const nextSilencedDevices = Array.from(
    new Set([...(state.silencedDevices || []), `device-${characterId}`])
  );

  const nextDeathRecords = [...state.deathRecords, record];

  const receipt: DeathReceipt = {
    record,
    cohortDisruptionShockApplied,
    successionPolicyApplied,
    corpseEvidenceNodeId: corpseNode.id,
    pressureEventEmitted: true,
    janitorialCompleted: true,
    povTerminationTriggered: isPovDeath,
  };

  const nextState: DeathEngineState = {
    ...state,
    deathRecords: nextDeathRecords,
    cohortState: nextCohortState,
    nodeEvidence: nextNodeEvidence,
    cast: nextCast,
    pressureEvents: nextPressureEvents,
    cancelledTicks: nextCancelledTicks,
    silencedDevices: nextSilencedDevices,
    pendingSacrificeFor: undefined,
  };

  return {
    receipt,
    nextState,
  };
}

/**
 * Parses sacrifice commands adhering strictly to the deterministic command pattern (§8):
 * e.g. "[SACRIFICE victim:char-1]" or "[SACRIFICE] victim:char-1"
 */
export function parseSacrificeCommand(commandText: string): {
  isSacrifice: boolean;
  victimCharacterId?: string;
} {
  const trimmed = commandText.trim();
  if (!trimmed.toUpperCase().startsWith('[SACRIFICE')) {
    return { isSacrifice: false };
  }

  // Match victim binding: victim:<characterId>
  const match = trimmed.match(/victim:\s*([a-zA-Z0-9_-]+)/i);
  if (match && match[1]) {
    return {
      isSacrifice: true,
      victimCharacterId: match[1].trim(),
    };
  }

  return {
    isSacrifice: true,
  };
}

export interface ExecuteSacrificeResult {
  transferredCount: number;
  deaths: DeathReceipt[];
  nextState: DeathEngineState;
}

/**
 * Executes a sacrifice interposition gamble (§8).
 * 1. Transfers all open wounds from victim to intervener.
 * 2. Re-evaluates survivability on BOTH characters.
 * 3. Declares death for either or both if verdicts evaluate to DEATH.
 */
export function executeSacrifice(
  intervenerId: string,
  victimId: string,
  state: DeathEngineState,
  intervenerCircumstances: CircumstanceFacts,
  victimCircumstances: CircumstanceFacts
): ExecuteSacrificeResult {
  // Step 1: Transfer open wounds
  const { transferred, updatedLedger } = transferWounds(
    victimId,
    intervenerId,
    state.deathLedger
  );

  let currentState: DeathEngineState = {
    ...state,
    deathLedger: updatedLedger,
    pendingSacrificeFor: victimId,
  };

  const deaths: DeathReceipt[] = [];

  // Step 2: Re-evaluate intervener
  const intervenerResult = evaluateSurvivability(
    intervenerId,
    currentState.deathLedger,
    intervenerCircumstances
  );
  if (intervenerResult.verdict === 'DEATH') {
    const res = declareDeath(
      intervenerId,
      intervenerResult.restingOnFactIds,
      currentState
    );
    deaths.push(res.receipt);
    currentState = res.nextState;
  }

  // Step 3: Re-evaluate victim
  const victimResult = evaluateSurvivability(
    victimId,
    currentState.deathLedger,
    victimCircumstances
  );
  if (victimResult.verdict === 'DEATH') {
    const res = declareDeath(
      victimId,
      victimResult.restingOnFactIds,
      currentState
    );
    deaths.push(res.receipt);
    currentState = res.nextState;
  }

  return {
    transferredCount: transferred.length,
    deaths,
    nextState: currentState,
  };
}
