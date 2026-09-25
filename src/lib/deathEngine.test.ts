import { describe, it, expect } from 'vitest';
import {
  declareDeath,
  parseSacrificeCommand,
  executeSacrifice,
  DeathEngineState,
} from './deathEngine';
import type { CohortState } from '../types/cohort';

describe('§5–§8 Death Engine Orchestration', () => {
  const createBaseState = (): DeathEngineState => ({
    turnCount: 3,
    fictionalTime: 1800,
    povCharacterId: 'char-pov',
    deathRecords: [],
    deathLedger: {
      'char-victim': [
        {
          id: 'char-victim:w1',
          characterId: 'char-victim',
          mechanism: 'strangulation',
          location: 'throat',
          severity: 'grave',
          timelineMinutes: 5,
          treatability: 'airway',
          inflictedAtTurn: 2,
          inflictedAtFictionalTime: 1200,
          treated: false,
          valence: 'murder',
          inflictedByCharacterId: 'char-killer',
        },
      ],
    },
    cast: [
      { id: 'char-pov', name: 'Investigator Dale', disposition: 'SURVIVOR' },
      { id: 'char-victim', name: 'Dr. Ross', disposition: 'SURVIVOR' },
      { id: 'char-cohort-1', name: 'Officer Holt', disposition: 'SURVIVOR' },
      { id: 'char-killer', name: 'The Lurker', disposition: 'VILLAIN' },
    ],
    castPlacement: {
      'char-victim': 'node-morgue',
    },
    deathContract: {
      powerBudget: 'Lethal brute physical force',
      deathMetaphysics: 'mundane',
      seatSuccession: {
        'char-victim': 'dormant',
      },
    },
  });

  describe('declareDeath', () => {
    it('creates immutable DeathRecord derived from primary wound', () => {
      const state = createBaseState();
      const res = declareDeath('char-victim', ['char-victim:w1'], state);

      expect(res.receipt.record).toBeDefined();
      expect(res.receipt.record.characterId).toBe('char-victim');
      expect(res.receipt.record.characterName).toBe('Dr. Ross');
      expect(res.receipt.record.valence).toBe('murder');
      expect(res.receipt.record.causedByCharacterId).toBe('char-killer');
      expect(res.receipt.record.primaryWoundFactId).toBe('char-victim:w1');
      expect(res.receipt.record.declaredAtTurn).toBe(3);
      expect(res.receipt.record.declaredAtFictionalTime).toBe(1800);
      expect(res.receipt.record.isPovDeath).toBe(false);
    });

    it('triggers povTerminationTriggered when POV character dies', () => {
      const state = createBaseState();
      state.deathLedger['char-pov'] = [
        {
          id: 'char-pov:w1',
          characterId: 'char-pov',
          mechanism: 'crush',
          location: 'head',
          severity: 'unsurvivable',
          timelineMinutes: 0,
          treatability: 'none',
          inflictedAtTurn: 3,
          inflictedAtFictionalTime: 1800,
          treated: false,
          valence: 'accident',
        },
      ];

      const res = declareDeath('char-pov', ['char-pov:w1'], state);
      expect(res.receipt.record.isPovDeath).toBe(true);
      expect(res.receipt.povTerminationTriggered).toBe(true);
    });

    it('applies maximum cohort disruption shock (skepticism +0.3, dissonance +0.5) when a cohort member dies', () => {
      const state = createBaseState();
      const mockCohortState: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'ONSET',
        ratifiedRatchetPhase: 'ONSET',
        seatHolderId: 'char-victim',
        successionVulnerabilityWindowRemaining: 0,
        dormantCastCognition: {},
        institutionalMemory: {},
        members: {
          'char-victim': {
            characterId: 'char-victim',
            isSeatHolder: true,
            tenureTurns: 1,
            agendaProgress: 0,
            agendaText: 'survive',
            affinities: { investigation: 0.5, cohesion: 0.5, preservation: 0.5 },
            cognition: {
              characterId: 'char-victim',
              skepticism: 0.2,
              cognitiveDissonance: 0.1,
              hypotheses: {},
              ingestedEvidenceIds: [],
            },
          },
          'char-cohort-1': {
            characterId: 'char-cohort-1',
            isSeatHolder: false,
            tenureTurns: 1,
            agendaProgress: 0,
            agendaText: 'defend',
            affinities: { investigation: 0.5, cohesion: 0.5, preservation: 0.5 },
            cognition: {
              characterId: 'char-cohort-1',
              skepticism: 0.4,
              cognitiveDissonance: 0.3,
              hypotheses: {},
              ingestedEvidenceIds: [],
            },
          },
        },
        recentReceipts: [],
      };

      state.cohortState = mockCohortState;

      const res = declareDeath('char-victim', ['char-victim:w1'], state);

      expect(res.receipt.cohortDisruptionShockApplied).toBe(true);
      expect(res.nextState.cohortState?.members['char-victim']).toBeUndefined();

      const survivingMember = res.nextState.cohortState?.members['char-cohort-1'];
      expect(survivingMember).toBeDefined();
      // Skepticism 0.4 + 0.3 = 0.7
      expect(survivingMember?.cognition.skepticism).toBeCloseTo(0.7);
      // Dissonance 0.3 + 0.5 = 0.8
      expect(survivingMember?.cognition.cognitiveDissonance).toBeCloseTo(0.8);
    });

    it('writes corpse evidence node to session.nodeEvidence[targetNodeId]', () => {
      const state = createBaseState();
      const res = declareDeath('char-victim', ['char-victim:w1'], state);

      expect(res.nextState.nodeEvidence?.['node-morgue']).toBeDefined();
      const evidence = res.nextState.nodeEvidence?.['node-morgue'];
      expect(evidence).toHaveLength(1);
      expect(evidence?.[0].id).toBe('corpse-death-char-victim-t3');
      expect(evidence?.[0].weightDelta).toBe(1.0);
    });

    it('applies zombie metaphysics: preserves characterId, sets isUndead: true and disposition HOSTILE', () => {
      const state = createBaseState();
      state.deathContract = {
        powerBudget: 'Necrotic reanimation',
        deathMetaphysics: 'zombie',
        seatSuccession: { 'char-victim': 'recruit' },
      };

      const res = declareDeath('char-victim', ['char-victim:w1'], state);

      // DeathRecord remains immutable (mortality = DECEASED)
      expect(res.receipt.record.characterId).toBe('char-victim');

      // Agency / state = active zombie
      const undeadMember = res.nextState.cast?.find((c) => c.id === 'char-victim');
      expect(undeadMember).toBeDefined();
      expect(undeadMember?.isUndead).toBe(true);
      expect(undeadMember?.disposition).toBe('HOSTILE');
    });

    it('executes janitorial silencing on devices and cancels scheduled ticks', () => {
      const state = createBaseState();
      const res = declareDeath('char-victim', ['char-victim:w1'], state);

      expect(res.nextState.cancelledTicks).toContain('char-victim');
      expect(res.nextState.silencedDevices).toContain('device-char-victim');
      expect(res.nextState.pressureEvents?.some((e) => e.type === 'DEATH_DECLARED')).toBe(true);
    });
  });

  describe('parseSacrificeCommand', () => {
    it('recognizes [SACRIFICE victim:X] deterministic command pattern', () => {
      const parsed = parseSacrificeCommand('[SACRIFICE victim:dr-ross]');
      expect(parsed.isSacrifice).toBe(true);
      expect(parsed.victimCharacterId).toBe('dr-ross');
    });

    it('recognizes [SACRIFICE] prefix even with whitespace or casing', () => {
      const parsed = parseSacrificeCommand('  [sacrifice victim:  officer_holt ] ');
      expect(parsed.isSacrifice).toBe(true);
      expect(parsed.victimCharacterId).toBe('officer_holt');
    });

    it('returns isSacrifice: false for regular prose or normal commands', () => {
      const parsed = parseSacrificeCommand('I try to push Ross out of the way');
      expect(parsed.isSacrifice).toBe(false);
      expect(parsed.victimCharacterId).toBeUndefined();
    });
  });

  describe('executeSacrifice (Unguaranteed Gamble)', () => {
    it('evaluates death for both if transferred facts and existing facts are lethal', () => {
      const state = createBaseState();
      // Victim has grave wound whose deadline is expired
      state.deathLedger['char-victim'] = [
        {
          id: 'victim:w1',
          characterId: 'char-victim',
          mechanism: 'mauling',
          location: 'torso',
          severity: 'grave',
          timelineMinutes: 10,
          treatability: 'surgery',
          inflictedAtTurn: 1,
          inflictedAtFictionalTime: 100,
          treated: false,
          valence: 'murder',
        },
      ];
      // Intervener already has an open grave wound whose deadline is also expired
      state.deathLedger['char-pov'] = [
        {
          id: 'pov:w1',
          characterId: 'char-pov',
          mechanism: 'pierced abdomen',
          location: 'abdomen',
          severity: 'grave',
          timelineMinutes: 10,
          treatability: 'surgery',
          inflictedAtTurn: 1,
          inflictedAtFictionalTime: 100,
          treated: false,
          valence: 'murder',
        },
      ];

      const intervenerCirc = {
        characterId: 'char-pov',
        witnessesPresent: [],
        signalAvailable: false,
        extraordinaryInterventionAvailable: false,
        evaluatedAtFictionalTime: 1000, // 1000 > 100 + 600
      };
      const victimCirc = {
        characterId: 'char-victim',
        witnessesPresent: [],
        signalAvailable: false,
        extraordinaryInterventionAvailable: false,
        evaluatedAtFictionalTime: 1000,
      };

      // Even after transfer, intervener now has both wounds and dies.
      // What if victim also had another unsurvivable wound?
      state.deathLedger['char-victim'].push({
        id: 'victim:w2',
        characterId: 'char-victim',
        mechanism: 'skull crush',
        location: 'head',
        severity: 'unsurvivable',
        timelineMinutes: 0,
        treatability: 'none',
        inflictedAtTurn: 2,
        inflictedAtFictionalTime: 1000,
        treated: true, // Treated won't transfer!
        valence: 'murder',
      });

      const res = executeSacrifice(
        'char-pov',
        'char-victim',
        state,
        intervenerCirc,
        victimCirc
      );

      // Open wound transferred to intervener
      expect(res.transferredCount).toBe(1);
      // Both evaluated to DEATH
      expect(res.deaths).toHaveLength(2);
      expect(res.deaths.map((d) => d.record.characterId)).toContain('char-pov');
      expect(res.deaths.map((d) => d.record.characterId)).toContain('char-victim');
      // Intervener death record has valence 'sacrifice'
      const intervenerDeath = res.deaths.find((d) => d.record.characterId === 'char-pov');
      expect(intervenerDeath?.record.valence).toBe('sacrifice');
    });
  });
});
