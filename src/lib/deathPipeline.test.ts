import { describe, it, expect } from 'vitest';
import { processTurnDeathPass } from './deathEngine';
import { engineReducer, initialEngineState } from '../core/engine/reducer';
import { validateForgeDraft } from './forgeCompiler';
import { ForgeDraft, ForgeDraftSchema } from '../types/forge';
import type { CommittedTurnPayload } from '../core/engine/events';
import type { RatifiedEngineFrame, RuntimeStateSnapshot } from '../types';
import type { CohortState } from '../types/cohort';
import type { WoundFact } from '../types/death';

describe('Death Subsystem Live Pipeline & Engine Integration', () => {
  const dummyPreSnapshot: RuntimeStateSnapshot = {
    version: 1,
    turnCount: 0,
    currentNodeId: 'ROOM_A',
    activeVector: 'SOMATIC',
    activeTier: 'LATENT',
    phase: 'LATENT',
    tension: 10,
    coherence: 100,
    reconciliationRevision: 0,
    activeFlags: [],
  };

  const createTestFrame = (overrides?: Partial<RatifiedEngineFrame>): RatifiedEngineFrame => ({
    narrative_blocks: [
      { type: 'PROSE', content: 'A shadow looms in the corridor.' },
    ],
    logic_state: {
      current_node_id: 'ROOM_A',
      suggested_tension: 20,
    },
    ...overrides,
  });

  describe('1. Turn with wound facts proposals -> recorded to ledger', () => {
    it('records accepted wound facts onto deathLedger through processTurnDeathPass', () => {
      const result = processTurnDeathPass({
        commandText: 'Try to dodge the blade',
        turnCount: 1,
        fictionalTime: 60,
        povCharacterId: 'char-user',
        woundFactsProposals: [
          {
            characterId: 'char-user',
            mechanism: 'laceration from broken glass',
            location: 'left forearm',
            severity: 'minor',
            timelineMinutes: 60,
            treatability: 'tourniquet and gauze',
            valence: 'accident',
          },
        ],
        deathLedger: {},
        deathRecords: [],
      });

      expect(result.deathLedger['char-user']).toBeDefined();
      expect(result.deathLedger['char-user']).toHaveLength(1);
      expect(result.deathLedger['char-user'][0].mechanism).toBe('laceration from broken glass');
      expect(result.deathLedger['char-user'][0].treated).toBe(false);
      expect(result.deathsDeclared).toHaveLength(0);
      expect(result.povDeathDeclared).toBe(false);
    });

    it('records wound facts onto deathLedger through engineReducer TURN_COMMITTED', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 0,
        currentNodeId: 'ROOM_A',
        cast: [
          { id: 'char-user', name: 'Subject A', isUserCharacter: true },
          { id: 'char-ally', name: 'Ally B', isUserCharacter: false },
        ],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Brace for impact',
        formattedText: 'The blast hits the corridor.',
        frame: createTestFrame({
          wound_facts: [
            {
              characterId: 'char-ally',
              mechanism: 'shrapnel penetration',
              location: 'right shoulder',
              severity: 'serious',
              timelineMinutes: 60,
              treatability: 'extraction and pressure dressing',
              valence: 'accident',
            },
          ],
        }),
        turnReceipt: {
          turnNumber: 1,
          nodeBefore: 'ROOM_A',
          requestedTarget: 'ROOM_A',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'ROOM_A',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 25,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.deathLedger?.['char-ally']).toBeDefined();
      expect(nextState.deathLedger?.['char-ally']).toHaveLength(1);
      expect(nextState.deathLedger?.['char-ally'][0].location).toBe('right shoulder');
      expect(nextState.deathLedger?.['char-ally'][0].severity).toBe('serious');
      expect(nextState.phase).not.toBe('TERMINATED');
    });
  });

  describe('2. Co-located treater -> treatment recorded and updates wound to treated', () => {
    it('applies treatment when treater and patient are at the same node', () => {
      const patientWound: WoundFact = {
        id: 'char-patient:w0',
        characterId: 'char-patient',
        mechanism: 'arterial bleed',
        location: 'upper thigh',
        severity: 'grave',
        timelineMinutes: 10,
        treatability: 'tourniquet',
        inflictedAtTurn: 1,
        inflictedAtFictionalTime: 60,
        treated: false,
        valence: 'accident',
      };

      const startState = {
        ...initialEngineState,
        turnCount: 1,
        currentNodeId: 'MED_BAY',
        castPlacement: {
          'char-user': 'MED_BAY',
          'char-patient': 'MED_BAY',
        },
        cast: [
          { id: 'char-user', name: 'Dr. Player', isUserCharacter: true },
          { id: 'char-patient', name: 'Patient X', isUserCharacter: false },
        ],
        deathLedger: {
          'char-patient': [patientWound],
        },
        deathRecords: [],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Apply tourniquet to Patient X thigh',
        formattedText: 'You quickly wrap and twist the tourniquet.',
        frame: createTestFrame({
          treatment_proposals: [
            {
              characterId: 'char-patient',
              woundId: 'char-patient:w0',
              mechanism: 'tourniquet applied',
            },
          ],
        }),
        turnReceipt: {
          turnNumber: 2,
          nodeBefore: 'MED_BAY',
          requestedTarget: 'MED_BAY',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'MED_BAY',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 30,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      const updatedWounds = nextState.deathLedger?.['char-patient'];
      expect(updatedWounds).toBeDefined();
      expect(updatedWounds![0].treated).toBe(true);
      expect(updatedWounds![0].treatedAtFictionalTime).toBe(60); // turnCount 1 * 60s
      expect(nextState.deathRecords).toHaveLength(0);
    });
  });

  describe('3. Non-co-located treater -> treatment rejected', () => {
    it('rejects treatment proposal when treater and patient are at different nodes', () => {
      const patientWound: WoundFact = {
        id: 'char-patient:w0',
        characterId: 'char-patient',
        mechanism: 'arterial bleed',
        location: 'upper thigh',
        severity: 'grave',
        timelineMinutes: 10,
        treatability: 'tourniquet',
        inflictedAtTurn: 1,
        inflictedAtFictionalTime: 60,
        treated: false,
        valence: 'accident',
      };

      const startState = {
        ...initialEngineState,
        turnCount: 1,
        currentNodeId: 'COMMAND_CENTER',
        castPlacement: {
          'char-user': 'COMMAND_CENTER',
          'char-patient': 'STORAGE_BAY_B',
        },
        cast: [
          { id: 'char-user', name: 'Dr. Player', isUserCharacter: true },
          { id: 'char-patient', name: 'Patient X', isUserCharacter: false },
        ],
        deathLedger: {
          'char-patient': [patientWound],
        },
        deathRecords: [],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Radio medical instructions to Patient X',
        formattedText: 'Your voice echoes over the comms.',
        frame: createTestFrame({
          treatment_proposals: [
            {
              characterId: 'char-patient',
              woundId: 'char-patient:w0',
              mechanism: 'remote verbal guidance',
            },
          ],
        }),
        turnReceipt: {
          turnNumber: 2,
          nodeBefore: 'COMMAND_CENTER',
          requestedTarget: 'COMMAND_CENTER',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'COMMAND_CENTER',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 30,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      const updatedWounds = nextState.deathLedger?.['char-patient'];
      expect(updatedWounds).toBeDefined();
      expect(updatedWounds![0].treated).toBe(false);
    });
  });

  describe('4. Expired grave wound on turn commit -> DEATH declared, corpse evidence placed, disruption shock applied', () => {
    it('declares death, adds corpse evidence, and applies disruption shock to cohort on deadline expiry', () => {
      const victimWound: WoundFact = {
        id: 'char-victim:w0',
        characterId: 'char-victim',
        mechanism: 'catastrophic blood loss',
        location: 'torso',
        severity: 'grave',
        timelineMinutes: 2, // 2 minutes deadline = 120 seconds
        treatability: 'field surgery',
        inflictedAtTurn: 1,
        inflictedAtFictionalTime: 0,
        treated: false,
        valence: 'murder',
        inflictedByCharacterId: 'char-entity',
      };

      const cohortState: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'ONSET',
        successionVulnerabilityWindowRemaining: 0,
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        nodeTraps: {},
        fortifiedNodes: {},
        fractures: [],
        members: {
          'char-victim': {
            characterId: 'char-victim',
            isSeatHolder: false,
            tenureTurns: 1,
            affinities: {},
            cognition: {
              characterId: 'char-victim',
              hypotheses: {},
              skepticism: 0.8,
              cognitiveDissonance: 0.1,
              ingestedEvidenceIds: [],
            },
          },
          'char-cohort-mate': {
            characterId: 'char-cohort-mate',
            isSeatHolder: false,
            tenureTurns: 1,
            affinities: {},
            cognition: {
              characterId: 'char-cohort-mate',
              hypotheses: {},
              skepticism: 0.5,
              cognitiveDissonance: 0.1,
              ingestedEvidenceIds: [],
            },
          },
        },
      };

      const startState = {
        ...initialEngineState,
        turnCount: 5,
        currentNodeId: 'STORAGE_BAY_B',
        castPlacement: {
          'char-user': 'STORAGE_BAY_B',
          'char-victim': 'STORAGE_BAY_B',
          'char-cohort-mate': 'STORAGE_BAY_B',
        },
        cast: [
          { id: 'char-user', name: 'Officer Cole', isUserCharacter: true },
          { id: 'char-victim', name: 'Private Ryan', isUserCharacter: false },
          { id: 'char-cohort-mate', name: 'Corporal Hicks', isUserCharacter: false },
        ],
        cohortState,
        nodeEvidence: {},
        deathLedger: {
          'char-victim': [victimWound],
        },
        deathRecords: [],
      };

      // Turn 5 = 300 fictional seconds, which is well past the 120s deadline
      const payload: CommittedTurnPayload = {
        commandText: 'Check Ryan vitals',
        formattedText: 'There is no pulse.',
        frame: createTestFrame(),
        turnReceipt: {
          turnNumber: 6,
          nodeBefore: 'STORAGE_BAY_B',
          requestedTarget: 'STORAGE_BAY_B',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'STORAGE_BAY_B',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 50,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      // 1. Death record created
      expect(nextState.deathRecords).toHaveLength(1);
      expect(nextState.deathRecords![0].characterId).toBe('char-victim');
      expect(nextState.deathRecords![0].valence).toBe('murder');
      expect(nextState.deathRecords![0].causedByCharacterId).toBe('char-entity');
      expect(nextState.deathRecords![0].isPovDeath).toBe(false);

      // 2. Corpse evidence placed
      const roomEvidence = nextState.nodeEvidence?.['STORAGE_BAY_B'];
      expect(roomEvidence).toBeDefined();
      const corpseItem = roomEvidence?.find((e) => e.text.includes('Corpse of Private Ryan'));
      expect(corpseItem).toBeDefined();
      expect(corpseItem?.text).toContain('Corpse of Private Ryan');

      // 3. Cohort member removed from active members, added to dormantCastCognition, shock applied to remaining members
      expect(nextState.cohortState?.members['char-victim']).toBeUndefined();
      expect(nextState.cohortState?.dormantCastCognition['char-victim']).toBeDefined();

      const mateCohortMember = nextState.cohortState?.members['char-cohort-mate'];
      expect(mateCohortMember).toBeDefined();
      expect(mateCohortMember?.cognition.cognitiveDissonance).toBeGreaterThan(0.1);
      expect(mateCohortMember?.cognition.skepticism).toBeGreaterThan(0.5);
    });
  });

  describe('5. [SACRIFICE victim:X] command handling', () => {
    it('transfers open wounds from victim to intervener and evaluates both characters', () => {
      const unsurvivableWound: WoundFact = {
        id: 'char-victim:w0',
        characterId: 'char-victim',
        mechanism: 'crushing blast wave',
        location: 'entire body',
        severity: 'unsurvivable',
        timelineMinutes: 0,
        treatability: 'none',
        inflictedAtTurn: 2,
        inflictedAtFictionalTime: 120,
        treated: false,
        valence: 'accident',
      };

      const startState = {
        ...initialEngineState,
        turnCount: 2,
        currentNodeId: 'AIRLOCK',
        castPlacement: {
          'char-user': 'AIRLOCK',
          'char-victim': 'AIRLOCK',
        },
        cast: [
          { id: 'char-user', name: 'Heroic Player', isUserCharacter: true },
          { id: 'char-victim', name: 'Innocent Survivor', isUserCharacter: false },
        ],
        deathLedger: {
          'char-victim': [unsurvivableWound],
        },
        deathRecords: [],
      };

      const payload: CommittedTurnPayload = {
        commandText: '[SACRIFICE victim:char-victim] Throw myself over the survivor to shield them',
        formattedText: 'You dive between the survivor and the blast.',
        frame: createTestFrame(),
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'AIRLOCK',
          requestedTarget: 'AIRLOCK',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'AIRLOCK',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 70,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      // Intervener (POV) absorbed the unsurvivable wound and died
      expect(nextState.deathRecords).toHaveLength(1);
      const death = nextState.deathRecords![0];
      expect(death.characterId).toBe('char-user');
      expect(death.isPovDeath).toBe(true);
      expect(death.isSacrifice).toBe(true);
      expect(death.sacrificeForCharacterId).toBe('char-victim');

      // Victim has no open wounds and survives
      expect(nextState.deathLedger?.['char-victim']).toHaveLength(0);
      expect(nextState.deathLedger?.['char-user']).toHaveLength(1);

      // Phase transitions to TERMINATED because POV died
      expect(nextState.phase).toBe('TERMINATED');
    });
  });

  describe('6. Turn with no wound facts -> no-op', () => {
    it('preserves existing deathLedger and deathRecords without unnecessary modifications', () => {
      const minorWound: WoundFact = {
        id: 'char-other:w0',
        characterId: 'char-other',
        mechanism: 'scratch',
        location: 'arm',
        severity: 'minor',
        timelineMinutes: 120,
        treatability: 'bandage',
        inflictedAtTurn: 1,
        inflictedAtFictionalTime: 60,
        treated: true,
        valence: 'accident',
      };

      const startState = {
        ...initialEngineState,
        turnCount: 2,
        currentNodeId: 'HALLWAY',
        cast: [{ id: 'char-user', name: 'Player', isUserCharacter: true }],
        deathLedger: {
          'char-other': [minorWound],
        },
        deathRecords: [
          {
            id: 'death-1',
            characterId: 'char-dead',
            characterName: 'Deceased Person',
            woundFactIds: ['char-dead:w0'],
            primaryWoundFactId: 'char-dead:w0',
            valence: 'murder' as const,
            declaredAtTurn: 1,
            declaredAtFictionalTime: 60,
            isPovDeath: false,
            isSacrifice: false,
          },
        ],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Look around quietly',
        formattedText: 'The dust settles.',
        frame: createTestFrame(),
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'HALLWAY',
          requestedTarget: 'HALLWAY',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'HALLWAY',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 20,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.deathLedger).toEqual(startState.deathLedger);
      expect(nextState.deathRecords).toEqual(startState.deathRecords);
      expect(nextState.phase).not.toBe('TERMINATED');
    });
  });

  describe('7. POV death -> sets phase to TERMINATED and records POV death', () => {
    it('sets phase to TERMINATED when POV character suffers fatal wound', () => {
      const startState = {
        ...initialEngineState,
        turnCount: 3,
        currentNodeId: 'FURNACE_ROOM',
        cast: [
          { id: 'char-user', name: 'Protagonist', isUserCharacter: true },
        ],
        deathLedger: {},
        deathRecords: [],
      };

      const payload: CommittedTurnPayload = {
        commandText: 'Step into the incinerator flames',
        formattedText: 'The heat consumes everything instantly.',
        frame: createTestFrame({
          wound_facts: [
            {
              characterId: 'char-user',
              mechanism: 'total thermal incineration',
              location: 'entire body',
              severity: 'unsurvivable',
              timelineMinutes: 0,
              treatability: 'none',
              valence: 'accident',
            },
          ],
        }),
        turnReceipt: {
          turnNumber: 4,
          nodeBefore: 'FURNACE_ROOM',
          requestedTarget: 'FURNACE_ROOM',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'FURNACE_ROOM',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 100,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const nextState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(nextState.deathRecords).toHaveLength(1);
      expect(nextState.deathRecords![0].characterId).toBe('char-user');
      expect(nextState.deathRecords![0].isPovDeath).toBe(true);
      expect(nextState.phase).toBe('TERMINATED');
    });
  });

  describe('8. Retake restoration preserves death state and cast', () => {
    it('restores deathLedger, deathRecords, and cast when TURN_RETAKEN is dispatched', () => {
      const survivorWound: WoundFact = {
        id: 'char-survivor:w0',
        characterId: 'char-survivor',
        mechanism: 'scratch',
        location: 'arm',
        severity: 'minor',
        timelineMinutes: 120,
        treatability: 'bandage',
        inflictedAtTurn: 1,
        inflictedAtFictionalTime: 60,
        treated: true,
        valence: 'accident',
      };

      const startState = {
        ...initialEngineState,
        turnCount: 2,
        currentNodeId: 'LAB',
        cast: [
          { id: 'char-user', name: 'Player', isUserCharacter: true },
          { id: 'char-survivor', name: 'Survivor', isUserCharacter: false },
        ],
        deathLedger: {
          'char-survivor': [survivorWound],
        },
        deathRecords: [],
      };

      // Turn 3 adds fatal wound to survivor
      const payload: CommittedTurnPayload = {
        commandText: 'Watch survivor approach the specimen',
        formattedText: 'The specimen lashes out lethally.',
        frame: createTestFrame({
          wound_facts: [
            {
              characterId: 'char-survivor',
              mechanism: 'decapitation',
              location: 'neck',
              severity: 'unsurvivable',
              timelineMinutes: 0,
              treatability: 'none',
              valence: 'murder',
            },
          ],
        }),
        turnReceipt: {
          turnNumber: 3,
          nodeBefore: 'LAB',
          requestedTarget: 'LAB',
          accepted: true,
          reason: 'TURN_ACCEPTED',
          nodeAfter: 'LAB',
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
          tension: 80,
          preSnapshot: dummyPreSnapshot,
        },
        preSnapshot: dummyPreSnapshot,
      };

      const committedState = engineReducer(startState, {
        type: 'TURN_COMMITTED',
        payload,
      });

      expect(committedState.deathRecords).toHaveLength(1);
      expect(committedState.lastTurnCheckpoint).toBeDefined();

      // Now retake the turn
      const retakenState = engineReducer(committedState, {
        type: 'TURN_RETAKEN',
      });

      expect(retakenState.turnCount).toBe(2);
      expect(retakenState.deathRecords).toEqual([]);
      expect(retakenState.deathLedger).toEqual(startState.deathLedger);
      expect(retakenState.cast).toEqual(startState.cast);
    });
  });

  describe('9. Forge DeathContract validation', () => {
    const validCohortDraft: ForgeDraft = {
      id: 'draft-death-contract-test',
      title: 'Valid Scenario',
      premise: 'Testing death contract compiler rules.',
      globalPremise: 'Testing death contract compiler rules.',
      startingVector: 'SOMATIC',
      startingTier: 'GATEWAY',
      setting: { location: 'Bunker' },
      depictionContract: {
        dramaticRegister: 'Clinical dread',
        directness: 'Visceral mechanics',
        aftermath: 'Irreversible consequences',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
      cast: [
        {
          id: 'c1',
          name: 'Subject Alpha',
          role: 'Subject',
          disposition: 'SURVIVOR',
          isEntity: false,
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_A' },
        },
        {
          id: 'c-villain',
          name: 'The Creature',
          role: 'Antagonist',
          disposition: 'VILLAIN',
          behaviorVector: 'RELENTLESS',
          isEntity: true,
          isUserCharacter: false,
          presenceDisposition: { kind: 'NONLOCAL' },
        },
      ],
      userCharacterId: 'c1',
      topology: {
        startingNodeId: 'NODE_A',
        nodes: ['NODE_A', 'NODE_B'],
        connections: ['NODE_A -> NODE_B'],
      },
      deathContract: {
        metaphysics: 'mundane',
        deathMetaphysics: 'mundane',
        powerBudget: 'Strict anatomical limits. No paranormal resurrection.',
        seatSuccession: {
          c1: 'recruit',
        },
      },
      antagonistProfile: {
        kind: 'ENTITY',
        name: 'The Creature',
        preyCohort: [
          {
            id: 'c1',
            name: 'Subject Alpha',
            vulnerabilities: ['fire'],
            psychologicalTriggers: ['darkness'],
            breakingPoint: 'isolation',
          },
        ],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          c1: 'REVIEWED_NONE',
          'c-villain': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
    };

    it('passes validation for valid deathContract on cohort scenario', () => {
      const result = validateForgeDraft(validCohortDraft);
      expect(result.valid).toBe(true);
    });

    it('fails validation when powerBudget is empty', () => {
      const invalidDraft: ForgeDraft = {
        ...validCohortDraft,
        deathContract: {
          ...validCohortDraft.deathContract,
          powerBudget: '   ',
        },
      };
      const result = validateForgeDraft(invalidDraft);
      expect(result.valid).toBe(false);
      expect(result.errors['deathContract.powerBudget']?.length).toBeGreaterThan(0);
    });

    it('fails validation for cohort scenario when seatSuccession is empty', () => {
      const invalidDraft: ForgeDraft = {
        ...validCohortDraft,
        deathContract: {
          ...validCohortDraft.deathContract,
          seatSuccession: {},
        },
      };
      const result = validateForgeDraft(invalidDraft);
      expect(result.valid).toBe(false);
      expect(result.errors['deathContract.seatSuccession']?.length).toBeGreaterThan(0);
    });

    it('fails ForgeDraftSchema.safeParse directly when deathContract is omitted', () => {
      const draftWithoutDeathContract = {
        ...validCohortDraft,
        deathContract: undefined,
      };
      const parseRes = ForgeDraftSchema.safeParse(draftWithoutDeathContract);
      expect(parseRes.success).toBe(false);
    });

    it('fails validateForgeDraft with exact required error message when deathContract is omitted', () => {
      const draftWithoutDeathContract = {
        ...validCohortDraft,
        deathContract: undefined,
      };
      const result = validateForgeDraft(draftWithoutDeathContract);
      expect(result.valid).toBe(false);
      expect(result.errors['deathContract']).toBeDefined();
      expect(result.errors['deathContract']).toContain(
        'Death contract is required for scenario compilation'
      );
    });
  });

  describe('10. Multi-wound and multi-character live emergence', () => {
    it('handles multiple characters receiving wounds in single turn and declares deaths accurately', () => {
      const res = processTurnDeathPass({
        commandText: 'Try to save everyone',
        turnCount: 1,
        fictionalTime: 60,
        povCharacterId: 'char-user',
        woundFactsProposals: [
          {
            characterId: 'char-user',
            mechanism: 'laceration',
            location: 'left hand',
            severity: 'minor',
            timelineMinutes: 120,
            treatability: 'bandage',
          },
          {
            characterId: 'char-npc1',
            mechanism: 'heart puncture',
            location: 'chest',
            severity: 'unsurvivable',
            timelineMinutes: 0,
            treatability: 'none',
          },
          {
            characterId: 'char-npc2',
            mechanism: 'arterial slash',
            location: 'neck',
            severity: 'unsurvivable',
            timelineMinutes: 0,
            treatability: 'direct pressure',
          },
        ],
        deathLedger: {},
        deathRecords: [],
        castPlacement: {
          'char-user': 'ROOM_1',
          'char-npc1': 'ROOM_1',
          'char-npc2': 'ROOM_2',
        },
        cast: [
          { id: 'char-user', name: 'User Player', isUserCharacter: true },
          { id: 'char-npc1', name: 'NPC One', isUserCharacter: false },
          { id: 'char-npc2', name: 'NPC Two', isUserCharacter: false },
        ],
      });

      expect(res.deathsDeclared).toHaveLength(2);
      expect(res.povDeathDeclared).toBe(false);
      expect(res.deathRecords.map((d) => d.characterId).sort()).toEqual(['char-npc1', 'char-npc2']);
      expect(res.deathLedger['char-user']).toHaveLength(1);
      expect(res.nodeEvidence['ROOM_1']).toBeDefined();
      expect(res.nodeEvidence['ROOM_2']).toBeDefined();
    });
  });
});
