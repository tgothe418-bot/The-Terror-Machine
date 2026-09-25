import type { SpatialNode } from '../types';
import {
  CircumstanceFacts,
  DeathContract,
  DeathRecord,
  DeathReceipt,
  SuccessionPolicy,
  TreatmentProposal,
  WoundFactProposal,
} from '../types/death';
import {
  determinePrimaryWound,
  evaluateSurvivability,
  recordTreatment,
  recordWoundFacts,
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

export interface ProcessTurnDeathPassParams {
  commandText: string;
  turnCount: number;
  fictionalTime: number; // in seconds
  povCharacterId?: string | null;
  woundFactsProposals?: Array<Partial<WoundFactProposal>>;
  treatmentProposals?: Array<TreatmentProposal>;
  deathLedger?: WoundLedger;
  deathRecords?: DeathRecord[];
  cohortState?: CohortState;
  nodeEvidence?: Record<string, NodeEvidenceItem[]>;
  castPlacement?: Record<string, string>;
  spatialGraph?: SpatialNode[];
  deathContract?: DeathContract;
  cast?: Array<{
    id: string;
    name?: string;
    disposition?: string;
    isUndead?: boolean;
    [k: string]: unknown;
  }>;
}

export interface ProcessTurnDeathPassResult {
  deathLedger: WoundLedger;
  deathRecords: DeathRecord[];
  cohortState?: CohortState;
  nodeEvidence: Record<string, NodeEvidenceItem[]>;
  cast: Array<{
    id: string;
    name?: string;
    disposition?: string;
    isUndead?: boolean;
    [k: string]: unknown;
  }>;
  deathsDeclared: DeathReceipt[];
  povDeathDeclared: boolean;
}

/**
 * Deterministic Death Subsystem turn pass (§5, §15).
 * Ingests sacrifice commands, treatment proposals, and wound fact proposals,
 * and performs survivability evaluation for characters across the ledger.
 */
export function processTurnDeathPass(
  params: ProcessTurnDeathPassParams
): ProcessTurnDeathPassResult {
  const deathsDeclared: DeathReceipt[] = [];
  let povDeathDeclared = false;

  let currentEngineState: DeathEngineState = {
    turnCount: params.turnCount,
    fictionalTime: params.fictionalTime,
    povCharacterId: params.povCharacterId,
    deathRecords: [...(params.deathRecords || [])],
    deathLedger: { ...(params.deathLedger || {}) },
    cohortState: params.cohortState ? { ...params.cohortState } : undefined,
    nodeEvidence: { ...(params.nodeEvidence || {}) },
    castPlacement: params.castPlacement ? { ...params.castPlacement } : {},
    deathContract: params.deathContract,
    cast: params.cast ? [...params.cast] : [],
  };

  function buildCircumstances(charId: string): CircumstanceFacts {
    const charNode = currentEngineState.castPlacement?.[charId];
    const witnesses = Object.entries(currentEngineState.castPlacement || {})
      .filter(([cId, nId]) => cId !== charId && Boolean(charNode) && nId === charNode)
      .map(([cId]) => cId);

    return {
      characterId: charId,
      witnessesPresent: witnesses,
      signalAvailable: true,
      extraordinaryInterventionAvailable: false,
      evaluatedAtFictionalTime: params.fictionalTime,
    };
  }

  // 1. Sacrifice Command Processing
  const sacrificeParsed = parseSacrificeCommand(params.commandText || '');
  if (
    sacrificeParsed.isSacrifice &&
    sacrificeParsed.victimCharacterId &&
    params.povCharacterId
  ) {
    const intervenerCircumstances = buildCircumstances(params.povCharacterId);
    const victimCircumstances = buildCircumstances(sacrificeParsed.victimCharacterId);

    const sacrificeRes = executeSacrifice(
      params.povCharacterId,
      sacrificeParsed.victimCharacterId,
      currentEngineState,
      intervenerCircumstances,
      victimCircumstances
    );

    currentEngineState = sacrificeRes.nextState;
    deathsDeclared.push(...sacrificeRes.deaths);
    for (const receipt of sacrificeRes.deaths) {
      if (receipt.record.isPovDeath || receipt.povTerminationTriggered) {
        povDeathDeclared = true;
      }
    }
  }

  // 2. Treatment Proposals Ingestion
  if (params.treatmentProposals && params.treatmentProposals.length > 0) {
    for (const proposal of params.treatmentProposals) {
      const patientId = proposal.characterId;
      const woundId = proposal.woundId;
      const patientWounds = currentEngineState.deathLedger[patientId] || [];
      const targetWound = patientWounds.find((w) => w.id === woundId);

      // Check that woundId exists on characterId in ledger and is untreated (!w.treated)
      if (!targetWound || targetWound.treated) {
        continue;
      }

      // Validate co-location: treater (povCharacterId or acting character) and patient (characterId) are at the same node in castPlacement
      const treaterId = params.povCharacterId;
      let isCoLocated = true;
      if (treaterId && currentEngineState.castPlacement) {
        const treaterLoc = currentEngineState.castPlacement[treaterId];
        const patientLoc = currentEngineState.castPlacement[patientId];
        if (treaterLoc && patientLoc && treaterLoc !== patientLoc) {
          isCoLocated = false;
        }
      }

      if (isCoLocated) {
        const treatRes = recordTreatment(
          patientId,
          woundId,
          params.fictionalTime,
          currentEngineState.deathLedger
        );
        if (treatRes.success) {
          currentEngineState.deathLedger = treatRes.updatedLedger;
        }
      }
    }
  }

  // 3. Wound Facts Proposals Ingestion
  if (params.woundFactsProposals && params.woundFactsProposals.length > 0) {
    const grouped: Record<string, Array<Partial<WoundFactProposal>>> = {};
    for (const proposal of params.woundFactsProposals) {
      if (proposal.characterId) {
        if (!grouped[proposal.characterId]) {
          grouped[proposal.characterId] = [];
        }
        grouped[proposal.characterId].push(proposal);
      }
    }

    for (const [charId, proposalsForChar] of Object.entries(grouped)) {
      const recRes = recordWoundFacts(
        charId,
        proposalsForChar,
        params.turnCount,
        params.fictionalTime,
        currentEngineState.deathLedger
      );
      currentEngineState.deathLedger = recRes.updatedLedger;
    }
  }

  // 4. Survivability Evaluation
  // For every character with open wounds in the ledger who does NOT already have a death record in deathRecords
  const deadCharIds = new Set(currentEngineState.deathRecords.map((d) => d.characterId));
  const charactersWithWounds = Object.keys(currentEngineState.deathLedger);

  for (const characterId of charactersWithWounds) {
    if (deadCharIds.has(characterId)) {
      continue;
    }

    const wounds = currentEngineState.deathLedger[characterId] || [];
    if (wounds.length === 0) {
      continue;
    }

    const circumstances = buildCircumstances(characterId);
    const survRes = evaluateSurvivability(
      characterId,
      currentEngineState.deathLedger,
      circumstances
    );

    if (survRes.verdict === 'DEATH') {
      const declRes = declareDeath(
        characterId,
        survRes.restingOnFactIds,
        currentEngineState
      );
      currentEngineState = declRes.nextState;
      deathsDeclared.push(declRes.receipt);
      deadCharIds.add(characterId);

      if (declRes.receipt.record.isPovDeath || declRes.receipt.povTerminationTriggered) {
        povDeathDeclared = true;
      }
    }
  }

  return {
    deathLedger: currentEngineState.deathLedger,
    deathRecords: currentEngineState.deathRecords,
    cohortState: currentEngineState.cohortState,
    nodeEvidence: currentEngineState.nodeEvidence || {},
    cast: currentEngineState.cast || [],
    deathsDeclared,
    povDeathDeclared,
  };
}
