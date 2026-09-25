import { describe, it, expect } from 'vitest';
import {
  recordWoundFacts,
  recordTreatment,
  evaluateSurvivability,
  WoundLedger,
} from './deathLedger';
import {
  declareDeath,
  executeSacrifice,
  DeathEngineState,
} from './deathEngine';
import { buildChronicle } from './deathChronicle';
import {
  EngineState,
  engineReducer,
  initialEngineState,
  captureRetakeRestorableState,
} from '../core/engine/reducer';
import type { CohortState } from '../types/cohort';

describe('§14 Death Mechanics Emergence Fixtures', () => {
  /**
   * Fixture 1: The Pinned Leg
   * Serious wound, Porter present, phone works -> intervention -> treated -> ALIVE.
   * Telegraphing diegetic throughout.
   */
  it('Fixture 1: The Pinned Leg (Intervention rescues serious wound)', () => {
    let ledger: WoundLedger = {};

    // Turn 1: Pinned leg proposed as serious wound with 120-minute timeline
    const turn1Wounds = recordWoundFacts(
      'char-nate',
      [
        {
          mechanism: 'crush under collapsed steel beam',
          location: 'right tibia',
          severity: 'serious',
          timelineMinutes: 120,
          treatability: 'crowbar extraction and pressure bandage',
          valence: 'accident',
        },
      ],
      1,
      60,
      ledger
    );
    expect(turn1Wounds.accepted).toHaveLength(1);
    ledger = turn1Wounds.updatedLedger;

    // Fictional time: 5 minutes in (300 seconds). Porter present, phone works.
    const circ1 = {
      characterId: 'char-nate',
      witnessesPresent: ['char-porter'],
      signalAvailable: true,
      extraordinaryInterventionAvailable: false,
      evaluatedAtFictionalTime: 300,
    };

    // Pre-intervention survivability: ALIVE because timeline (120m) is still open
    const preVerdict = evaluateSurvivability('char-nate', ledger, circ1);
    expect(preVerdict.verdict).toBe('ALIVE');

    // Turn 2: Porter intervenes and applies pressure bandage before timeline expires
    const woundId = turn1Wounds.accepted[0].id;
    const treatResult = recordTreatment('char-nate', woundId, 900, ledger); // 15m in
    expect(treatResult.success).toBe(true);
    ledger = treatResult.updatedLedger;

    // Turn 3: 130 minutes have elapsed (7800s > 120m). Because wound was treated before deadline, Nate stays ALIVE!
    const circ3 = {
      ...circ1,
      evaluatedAtFictionalTime: 7800,
    };
    const postVerdict = evaluateSurvivability('char-nate', ledger, circ3);
    expect(postVerdict.verdict).toBe('ALIVE');
  });

  /**
   * Fixture 2: The Pierced Lung
   * Grave wound, no signal, no help -> timeline expires -> DEATH declared -> corpse evidence -> cohort shock.
   */
  it('Fixture 2: The Pierced Lung (Unrescued grave wound expires into death and corpse evidence)', () => {
    let ledger: WoundLedger = {};

    // Turn 1: Pierced lung, grave severity, 10 minute timeline
    const t1 = recordWoundFacts(
      'char-nate',
      [
        {
          mechanism: 'metal rod puncture',
          location: 'left thorax',
          severity: 'grave',
          timelineMinutes: 10,
          treatability: 'chest seal and needle decompression',
          valence: 'murder',
          inflictedByCharacterId: 'char-killer',
        },
      ],
      1,
      100,
      ledger
    );
    expect(t1.accepted).toHaveLength(1);
    ledger = t1.updatedLedger;

    // Turn 2: 15 minutes elapsed (900s > 100 + 600s). No signal, no doctor.
    const circ2 = {
      characterId: 'char-nate',
      witnessesPresent: [],
      signalAvailable: false,
      extraordinaryInterventionAvailable: false,
      evaluatedAtFictionalTime: 900,
    };

    const verdict = evaluateSurvivability('char-nate', ledger, circ2);
    expect(verdict.verdict).toBe('DEATH');
    expect(verdict.restingOnFactIds).toEqual([t1.accepted[0].id]);

    // Orchestrate declaration
    const cohortState: CohortState = {
      status: 'ACTIVE',
      collectivePhase: 'ONSET',
      peakPhase: 'ONSET',
      ratifiedRatchetPhase: 'ONSET',
      seatHolderId: 'char-nate',
      successionVulnerabilityWindowRemaining: 0,
      dormantCastCognition: {},
      institutionalMemory: {},
      members: {
        'char-nate': {
          characterId: 'char-nate',
          isSeatHolder: true,
          tenureTurns: 1,
          agendaProgress: 0,
          agendaText: 'investigate',
          affinities: {},
          cognition: {
            characterId: 'char-nate',
            skepticism: 0.1,
            cognitiveDissonance: 0.1,
            hypotheses: {},
            ingestedEvidenceIds: [],
          },
        },
        'char-porter': {
          characterId: 'char-porter',
          isSeatHolder: false,
          tenureTurns: 1,
          agendaProgress: 0,
          agendaText: 'survive',
          affinities: {},
          cognition: {
            characterId: 'char-porter',
            skepticism: 0.2,
            cognitiveDissonance: 0.2,
            hypotheses: {},
            ingestedEvidenceIds: [],
          },
        },
      },
      recentReceipts: [],
    };

    const engineState: DeathEngineState = {
      turnCount: 2,
      fictionalTime: 900,
      deathRecords: [],
      deathLedger: ledger,
      cohortState,
      castPlacement: { 'char-nate': 'drainage-crypt' },
      deathContract: {
        powerBudget: 'Subterranean stalking',
        deathMetaphysics: 'mundane',
        seatSuccession: { 'char-nate': 'dormant' },
      },
      cast: [
        { id: 'char-nate', name: 'Nate' },
        { id: 'char-porter', name: 'Porter' },
      ],
    };

    const deathResult = declareDeath('char-nate', verdict.restingOnFactIds, engineState);
    expect(deathResult.receipt.record.valence).toBe('murder');
    expect(deathResult.receipt.record.causedByCharacterId).toBe('char-killer');

    // Corpse registered at drainage-crypt
    expect(deathResult.nextState.nodeEvidence?.['drainage-crypt']).toHaveLength(1);
    expect(deathResult.nextState.nodeEvidence?.['drainage-crypt'][0].text).toContain('Nate');

    // Porter suffered max shock: skepticism 0.2 + 0.3 = 0.5, dissonance 0.2 + 0.5 = 0.7
    const porter = deathResult.nextState.cohortState?.members['char-porter'];
    expect(porter?.cognition.skepticism).toBeCloseTo(0.5);
    expect(porter?.cognition.cognitiveDissonance).toBeCloseTo(0.7);
  });

  /**
   * Fixture 3: The Interposition
   * Sacrifice transfer -> facts say both die -> double death, phase detonation, Chronicle honors it.
   */
  it('Fixture 3: The Interposition (Unguaranteed gamble leads to double death)', () => {
    let ledger: WoundLedger = {};

    // Victim has lethal open wound
    const vWounds = recordWoundFacts(
      'char-victim',
      [
        {
          mechanism: 'rebar impalement',
          location: 'abdomen',
          severity: 'grave',
          timelineMinutes: 5,
          treatability: 'field trauma surgery',
          valence: 'murder',
        },
      ],
      2,
      200,
      ledger
    );
    ledger = vWounds.updatedLedger;

    // Victim also sustained a non-transferable unsurvivable internal injury
    ledger['char-victim'].push({
      id: 'victim:w2',
      characterId: 'char-victim',
      mechanism: 'crushed sternum',
      location: 'chest',
      severity: 'unsurvivable',
      timelineMinutes: 0,
      treatability: 'none',
      inflictedAtTurn: 2,
      inflictedAtFictionalTime: 200,
      treated: true, // Non-transferable; stays with victim
      valence: 'murder',
    });

    // Intervener also has existing serious wound with short timeline
    const iWounds = recordWoundFacts(
      'char-intervener',
      [
        {
          mechanism: 'arterial laceration',
          location: 'forearm',
          severity: 'grave',
          timelineMinutes: 5,
          treatability: 'tourniquet',
          valence: 'accident',
        },
      ],
      2,
      200,
      ledger
    );
    ledger = iWounds.updatedLedger;

    const engineState: DeathEngineState = {
      turnCount: 3,
      fictionalTime: 800, // 800 > 200 + 300 (timeline expired for both!)
      deathRecords: [],
      deathLedger: ledger,
      castPlacement: {
        'char-victim': 'boiler-room',
        'char-intervener': 'boiler-room',
      },
      cast: [
        { id: 'char-victim', name: 'Elena' },
        { id: 'char-intervener', name: 'Marcus' },
      ],
      deathContract: {
        powerBudget: 'Environmental hazards',
        deathMetaphysics: 'mundane',
        seatSuccession: {},
      },
    };

    const circ = {
      witnessesPresent: [],
      signalAvailable: false,
      extraordinaryInterventionAvailable: false,
      evaluatedAtFictionalTime: 800,
    };

    // Marcus declares interposition for Elena
    const gambleResult = executeSacrifice(
      'char-intervener',
      'char-victim',
      engineState,
      { ...circ, characterId: 'char-intervener' },
      { ...circ, characterId: 'char-victim' }
    );

    // Both die in the gamble!
    expect(gambleResult.deaths).toHaveLength(2);
    expect(gambleResult.deaths[0].record.characterId).toBe('char-intervener');
    expect(gambleResult.deaths[0].record.valence).toBe('sacrifice');
    expect(gambleResult.deaths[0].record.isSacrifice).toBe(true);
    expect(gambleResult.deaths[0].record.sacrificeForCharacterId).toBe('char-victim');

    // Chronicle honors both casualties
    const chronicle = buildChronicle({
      scenarioTitle: 'Collapse at Boiler Room',
      turnCount: 3,
      deathRecords: gambleResult.nextState.deathRecords,
      closingLine: 'Two bodies were found in the steam.',
    });

    expect(chronicle.deaths).toHaveLength(2);
    expect(chronicle.deaths.some((d) => d.isSacrifice)).toBe(true);
  });

  /**
   * Fixture 4: POV death -> Chronicle -> Retake restores pre-death checkpoint (no-seal proof)
   */
  it('Fixture 4: POV death -> Chronicle and Retake restoration (no-seal proof)', () => {
    // 1. Initial stable engine state before turn 4
    const initialState: EngineState = {
      ...initialEngineState,
      sessionId: 'sess-1',
      blueprintId: 'bp-1',
      phase: 'MANIFEST',
      escalation_state: 'TRANSGRESSIVE',
      currentNodeId: 'crypt',
      turnCount: 3,
      history: [],
      traumaLedger: [],
      motifLedger: {},
      deathLedger: {},
      deathRecords: [],
      nodeEvidence: {},
      lastTurnCheckpoint: null,
    };

    // 2. Pre-turn checkpoint captured before turn 4 action
    const preSnapshot = captureRetakeRestorableState(initialState);
    const stateWithCheckpoint: EngineState = {
      ...initialState,
      lastTurnCheckpoint: {
        version: 1,
        commandText: 'I confront the shadow',
        engineStateBefore: preSnapshot,
        engineGameStateBefore: null,
      },
    };

    // 3. Turn 4: POV character suffers fatal blow
    const povWound = recordWoundFacts(
      'char-pov',
      [
        {
          mechanism: 'crushing blow to skull',
          location: 'cranium',
          severity: 'unsurvivable',
          timelineMinutes: 0,
          treatability: 'none',
          valence: 'murder',
        },
      ],
      4,
      1200,
      stateWithCheckpoint.deathLedger || {}
    );

    const deathEngineState: DeathEngineState = {
      turnCount: 4,
      fictionalTime: 1200,
      povCharacterId: 'char-pov',
      deathRecords: [],
      deathLedger: povWound.updatedLedger,
      castPlacement: { 'char-pov': 'crypt' },
      cast: [{ id: 'char-pov', name: 'Patrick Bateman' }],
    };

    const deathResult = declareDeath('char-pov', ['char-pov:w1'], deathEngineState);
    expect(deathResult.receipt.povTerminationTriggered).toBe(true);

    // 4. Reduce POV_DEATH_DECLARED event
    const postDeathState = engineReducer(stateWithCheckpoint, {
      type: 'POV_DEATH_DECLARED',
      deathRecord: deathResult.receipt.record,
    });

    expect(postDeathState.phase).toBe('TERMINATED');
    expect(postDeathState.deathRecords).toHaveLength(1);

    // 5. Build run Chronicle
    const chronicle = buildChronicle({
      scenarioTitle: 'American Psycho',
      turnCount: 4,
      deathRecords: postDeathState.deathRecords || [],
      cast: [{ id: 'char-pov', name: 'Patrick Bateman' }],
      closingLine: 'This confession has meant nothing.',
    });
    expect(chronicle.turnCount).toBe(4);
    expect(chronicle.deaths[0].characterName).toBe('Patrick Bateman');

    // 6. Retake turn 4: Retake is never sealed! TURN_RETAKEN restores exact pre-turn state
    const retakenState = engineReducer(postDeathState, {
      type: 'TURN_RETAKEN',
    });

    // Checkpoint restored: phase returns to MANIFEST, deathRecords wiped to empty, deathLedger empty!
    expect(retakenState.phase).toBe('MANIFEST');
    expect(retakenState.deathRecords).toEqual([]);
    expect(retakenState.deathLedger).toEqual({});
    expect(retakenState.lastTurnCheckpoint).toBeNull();
  });
});
