import { describe, it, expect } from 'vitest';
import {
  recordWoundFacts,
  recordTreatment,
  transferWounds,
  evaluateSurvivability,
  determinePrimaryWound,
  WoundLedger,
} from './deathLedger';
import type { CircumstanceFacts } from '../types/death';

describe('§3 & §4 Death Ledger & Survivability Engine', () => {
  const baseCircumstances: CircumstanceFacts = {
    characterId: 'char-1',
    witnessesPresent: ['char-2'],
    signalAvailable: true,
    extraordinaryInterventionAvailable: false,
    evaluatedAtFictionalTime: 1000,
  };

  describe('recordWoundFacts (Validation & Invariants)', () => {
    it('accepts valid wound facts into the per-character ledger', () => {
      const res = recordWoundFacts(
        'char-1',
        [
          {
            mechanism: 'gunshot',
            location: 'left shoulder',
            severity: 'serious',
            timelineMinutes: 120,
            treatability: 'field dressing',
            valence: 'murder',
          },
        ],
        1,
        100
      );

      expect(res.accepted).toHaveLength(1);
      expect(res.rejected).toHaveLength(0);
      expect(res.merged).toHaveLength(0);
      expect(res.accepted[0].id).toBe('char-1:w1');
      expect(res.accepted[0].mechanism).toBe('gunshot');
      expect(res.accepted[0].severity).toBe('serious');
      expect(res.updatedLedger['char-1']).toHaveLength(1);
    });

    it('rejects empty mechanism, empty location, or invalid severity with structured reasons', () => {
      const res = recordWoundFacts(
        'char-1',
        [
          { mechanism: '', location: 'head', severity: 'grave', timelineMinutes: 60 },
          { mechanism: 'knife', location: '', severity: 'grave', timelineMinutes: 60 },
          // @ts-expect-error Testing invalid severity enum
          { mechanism: 'knife', location: 'chest', severity: 'lethal', timelineMinutes: 60 },
        ],
        1,
        100
      );

      expect(res.accepted).toHaveLength(0);
      expect(res.rejected).toHaveLength(3);
      expect(res.rejected[0]).toContain('mechanism must be non-empty');
      expect(res.rejected[1]).toContain('location must be non-empty');
      expect(res.rejected[2]).toContain('invalid severity');
    });

    it('enforces timeline sanity invariant: timelineMinutes: 0 forbidden unless unsurvivable', () => {
      const res = recordWoundFacts(
        'char-1',
        [
          { mechanism: 'blunt trauma', location: 'ribs', severity: 'minor', timelineMinutes: 0 },
          { mechanism: 'puncture', location: 'thigh', severity: 'serious', timelineMinutes: 0 },
          { mechanism: 'pierced lung', location: 'chest', severity: 'grave', timelineMinutes: 0 },
          { mechanism: 'decapitation', location: 'neck', severity: 'unsurvivable', timelineMinutes: 0 },
        ],
        1,
        100
      );

      expect(res.rejected).toHaveLength(3);
      expect(res.rejected[0]).toContain('timelineMinutes may only be 0 for \'unsurvivable\'');
      expect(res.rejected[1]).toContain('timelineMinutes may only be 0 for \'unsurvivable\'');
      expect(res.rejected[2]).toContain('timelineMinutes may only be 0 for \'unsurvivable\'');
      expect(res.accepted).toHaveLength(1);
      expect(res.accepted[0].severity).toBe('unsurvivable');
    });

    it('enforces timeline sanity invariant: minor or serious wound cannot carry a fatal timeline under 60 minutes', () => {
      const res = recordWoundFacts(
        'char-1',
        [
          { mechanism: 'laceration', location: 'arm', severity: 'minor', timelineMinutes: 30 },
          { mechanism: 'deep cut', location: 'leg', severity: 'serious', timelineMinutes: 45 },
          { mechanism: 'deep cut', location: 'leg', severity: 'serious', timelineMinutes: 60 },
        ],
        1,
        100
      );

      expect(res.rejected).toHaveLength(2);
      expect(res.rejected[0]).toContain('minor wound cannot carry a fatal timeline under 60 minutes');
      expect(res.rejected[1]).toContain('serious wound cannot carry a fatal timeline under 60 minutes');
      expect(res.accepted).toHaveLength(1);
      expect(res.accepted[0].timelineMinutes).toBe(60);
    });

    it('enforces wound idempotency: duplicate open wound across turns merges instead of duplicating', () => {
      const turn1 = recordWoundFacts(
        'char-1',
        [
          { mechanism: 'strangulation', location: 'neck', severity: 'serious', timelineMinutes: 90 },
        ],
        1,
        100
      );
      expect(turn1.accepted).toHaveLength(1);

      const turn2 = recordWoundFacts(
        'char-1',
        [
          { mechanism: 'Strangulation', location: '  NECK  ', severity: 'serious', timelineMinutes: 90 },
        ],
        2,
        200,
        turn1.updatedLedger
      );

      expect(turn2.accepted).toHaveLength(0);
      expect(turn2.merged).toHaveLength(1);
      expect(turn2.updatedLedger['char-1']).toHaveLength(1);
    });
  });

  describe('recordTreatment', () => {
    it('successfully treats an open wound before deadline', () => {
      const initial = recordWoundFacts(
        'char-1',
        [{ mechanism: 'crush', location: 'left leg', severity: 'serious', timelineMinutes: 120 }],
        1,
        100
      );
      const woundId = initial.accepted[0].id;

      const treatRes = recordTreatment('char-1', woundId, 500, initial.updatedLedger);
      expect(treatRes.success).toBe(true);
      expect(treatRes.wound?.treated).toBe(true);
      expect(treatRes.wound?.treatedAtFictionalTime).toBe(500);
      expect(treatRes.updatedLedger['char-1'][0].treated).toBe(true);
    });

    it('rejects treatment for unknown woundId or already-treated wound', () => {
      const initial = recordWoundFacts(
        'char-1',
        [{ mechanism: 'crush', location: 'left leg', severity: 'serious', timelineMinutes: 120 }],
        1,
        100
      );
      const woundId = initial.accepted[0].id;

      const unknownRes = recordTreatment('char-1', 'char-1:w999', 500, initial.updatedLedger);
      expect(unknownRes.success).toBe(false);
      expect(unknownRes.reason).toContain('not found');

      const treatRes = recordTreatment('char-1', woundId, 500, initial.updatedLedger);
      expect(treatRes.success).toBe(true);

      const retreatRes = recordTreatment('char-1', woundId, 600, treatRes.updatedLedger);
      expect(retreatRes.success).toBe(false);
      expect(retreatRes.reason).toContain('already treated');
    });
  });

  describe('evaluateSurvivability (Deterministic Verdict Rules)', () => {
    it('Rule 1: unsurvivable wound evaluates to DEATH when extraordinary intervention is unavailable', () => {
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'massive trauma',
            location: 'torso',
            severity: 'unsurvivable',
            timelineMinutes: 0,
            treatability: 'none',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, baseCircumstances);
      expect(res.verdict).toBe('DEATH');
      expect(res.restingOnFactIds).toEqual(['char-1:w1']);
    });

    it('Rule 1: unsurvivable wound evaluates to ALIVE if extraordinary intervention is available', () => {
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'massive trauma',
            location: 'torso',
            severity: 'unsurvivable',
            timelineMinutes: 0,
            treatability: 'trauma surgeon',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        extraordinaryInterventionAvailable: true,
      });
      expect(res.verdict).toBe('ALIVE');
    });

    it('Rule 2: grave wound evaluates to ALIVE while timeline is open', () => {
      // Inflicted at t=100, timeline = 60 minutes = 3600 seconds. Deadline = 3700. Current t = 1000.
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'pierced lung',
            location: 'chest',
            severity: 'grave',
            timelineMinutes: 60,
            treatability: 'chest tube',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        evaluatedAtFictionalTime: 1000,
      });
      expect(res.verdict).toBe('ALIVE');
    });

    it('Rule 2: grave wound evaluates to DEATH once timeline expires untreated', () => {
      // Inflicted at t=100, timeline = 10 min = 600s. Deadline = 700. Current t = 800.
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'pierced lung',
            location: 'chest',
            severity: 'grave',
            timelineMinutes: 10,
            treatability: 'chest tube',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        evaluatedAtFictionalTime: 800,
      });
      expect(res.verdict).toBe('DEATH');
      expect(res.restingOnFactIds).toEqual(['char-1:w1']);
    });

    it('Treatment timing invariant: treatment after deadline expired does NOT resurrect', () => {
      // Deadline = 100 + (10 * 60) = 700.
      // Treated at 750 (late). Current time = 800.
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'pierced lung',
            location: 'chest',
            severity: 'grave',
            timelineMinutes: 10,
            treatability: 'chest tube',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: true,
            treatedAtFictionalTime: 750,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        evaluatedAtFictionalTime: 800,
      });
      expect(res.verdict).toBe('DEATH');
      expect(res.restingOnFactIds).toEqual(['char-1:w1']);
    });

    it('Treatment timing invariant: treatment before deadline prevents death', () => {
      // Deadline = 100 + (10 * 60) = 700.
      // Treated at 400 (early). Current time = 800.
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'pierced lung',
            location: 'chest',
            severity: 'grave',
            timelineMinutes: 10,
            treatability: 'chest tube',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: true,
            treatedAtFictionalTime: 400,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        evaluatedAtFictionalTime: 800,
      });
      expect(res.verdict).toBe('ALIVE');
    });

    it('Rule 3: three untreated serious wounds evaluate to DEATH when fictional time passes shortest timeline', () => {
      // Shortest deadline: w2 (100 + 60*60 = 3700). Current time = 4000.
      const ledger: WoundLedger = {
        'char-1': [
          {
            id: 'char-1:w1',
            characterId: 'char-1',
            mechanism: 'stab',
            location: 'shoulder',
            severity: 'serious',
            timelineMinutes: 90,
            treatability: 'sutures',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'murder',
          },
          {
            id: 'char-1:w2',
            characterId: 'char-1',
            mechanism: 'crush',
            location: 'left arm',
            severity: 'serious',
            timelineMinutes: 60,
            treatability: 'splint',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: false,
            valence: 'accident',
          },
          {
            id: 'char-1:w3',
            characterId: 'char-1',
            mechanism: 'puncture',
            location: 'thigh',
            severity: 'serious',
            timelineMinutes: 120,
            treatability: 'dressing',
            inflictedAtTurn: 2,
            inflictedAtFictionalTime: 200,
            treated: false,
            valence: 'murder',
          },
        ],
      };

      const res = evaluateSurvivability('char-1', ledger, {
        ...baseCircumstances,
        evaluatedAtFictionalTime: 4000,
      });
      expect(res.verdict).toBe('DEATH');
      expect(res.restingOnFactIds).toHaveLength(3);
    });
  });

  describe('transferWounds (Sacrifice Interposition)', () => {
    it('transfers open wounds to intervener and rewrites valence to sacrifice', () => {
      const ledger: WoundLedger = {
        'victim-1': [
          {
            id: 'victim-1:w1',
            characterId: 'victim-1',
            mechanism: 'blade slash',
            location: 'neck',
            severity: 'grave',
            timelineMinutes: 15,
            treatability: 'tourniquet',
            inflictedAtTurn: 2,
            inflictedAtFictionalTime: 200,
            treated: false,
            valence: 'murder',
          },
          {
            id: 'victim-1:w2',
            characterId: 'victim-1',
            mechanism: 'graze',
            location: 'arm',
            severity: 'minor',
            timelineMinutes: 120,
            treatability: 'band-aid',
            inflictedAtTurn: 1,
            inflictedAtFictionalTime: 100,
            treated: true,
            valence: 'accident',
          },
        ],
        'intervener-1': [],
      };

      const res = transferWounds('victim-1', 'intervener-1', ledger);

      expect(res.transferred).toHaveLength(1);
      expect(res.transferred[0].id).toBe('victim-1:w1');
      expect(res.transferred[0].characterId).toBe('intervener-1');
      expect(res.transferred[0].valence).toBe('sacrifice');

      // Treated wound stays on victim; open wound transferred to intervener
      expect(res.updatedLedger['victim-1']).toHaveLength(1);
      expect(res.updatedLedger['victim-1'][0].id).toBe('victim-1:w2');
      expect(res.updatedLedger['intervener-1']).toHaveLength(1);
      expect(res.updatedLedger['intervener-1'][0].characterId).toBe('intervener-1');
    });
  });

  describe('determinePrimaryWound', () => {
    it('selects the single causal wound when death rested on one fact', () => {
      const wounds = [
        {
          id: 'char-1:w1',
          characterId: 'char-1',
          mechanism: 'gunshot',
          location: 'head',
          severity: 'unsurvivable' as const,
          timelineMinutes: 0,
          treatability: 'none',
          inflictedAtTurn: 1,
          inflictedAtFictionalTime: 100,
          treated: false,
          valence: 'murder' as const,
        },
      ];

      const primary = determinePrimaryWound(['char-1:w1'], wounds);
      expect(primary?.id).toBe('char-1:w1');
    });

    it('selects highest severity among multiple causal facts; breaks ties by turn', () => {
      const wounds = [
        {
          id: 'char-1:w1',
          characterId: 'char-1',
          mechanism: 'puncture',
          location: 'leg',
          severity: 'serious' as const,
          timelineMinutes: 60,
          treatability: 'dressing',
          inflictedAtTurn: 1,
          inflictedAtFictionalTime: 100,
          treated: false,
          valence: 'accident' as const,
        },
        {
          id: 'char-1:w2',
          characterId: 'char-1',
          mechanism: 'pierced heart',
          location: 'chest',
          severity: 'grave' as const,
          timelineMinutes: 5,
          treatability: 'surgery',
          inflictedAtTurn: 2,
          inflictedAtFictionalTime: 200,
          treated: false,
          valence: 'murder' as const,
        },
      ];

      const primary = determinePrimaryWound(['char-1:w1', 'char-1:w2'], wounds);
      expect(primary?.id).toBe('char-1:w2');
      expect(primary?.severity).toBe('grave');
    });
  });
});
