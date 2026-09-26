import { describe, it, expect } from 'vitest';
import type { CohortMember } from '../types/cohort';
import type { CharacterSalience, FearContract } from '../types/fear';
import {
  scoreCandidateBehavior,
  tickCohortState,
  DEFAULT_AFFINITIES,
} from './cohortEngine';
import {
  executeSubmit,
  type BehaviorExecutionContext,
} from './cohortBehaviors';
import {
  ingestPanicTraceEvent,
  type PanicTraceEvent,
} from './cohortCognition';
import {
  formatSomaticStatePrompt,
  distortPovObservations,
  generatePanicTrace,
} from './fearEngine';
import { evaluateSubmitResponse } from './submitContract';

describe('HG3 Stage 2 — Fear Emergence & Behavior Integration Suite', () => {
  function createTestMember(
    id: string,
    overrides: Partial<CohortMember> = {},
    salienceOverrides: Partial<CharacterSalience> = {}
  ): CohortMember {
    return {
      characterId: id,
      isSeatHolder: false,
      tenureTurns: 1,
      affinities: {
        ...DEFAULT_AFFINITIES,
      },
      cognition: {
        characterId: id,
        skepticism: 0.8,
        cognitiveDissonance: 0,
        ingestedEvidenceIds: [],
        hypotheses: {
          'hyp-threat-exists': {
            id: 'hyp-threat-exists',
            weight: 0.1,
            provenance: { lastUpdatedTurn: 0 },
          },
        },
      },
      salience: {
        spike: 0,
        dread: 0,
        threatType: 'life',
        provenance: [],
        preyMode: false,
        ...salienceOverrides,
      },
      ...overrides,
    };
  }

  describe('1. The Bloody-Shirt Test (§8 — Mechanism over Outcome)', () => {
    it('compares identical fixtures: unwounded vs. wounded character produces expected positive FLEE delta and negative INVESTIGATE delta', () => {
      const unwoundedMember = createTestMember('char-unwounded', {}, { spike: 0, dread: 0 });
      const woundedMember = createTestMember('char-wounded', {}, { spike: 0.35, dread: 0.15 }); // total intensity 0.50 (below 0.70 prey threshold)

      const fearContract: Partial<FearContract> = {
        threatWeights: { life: 1.0, freedom: 1.0, identity: 1.0 },
      };

      // Calculate scores for unwounded
      const unwoundedFleeScore = scoreCandidateBehavior('FLEE', unwoundedMember, 1.0, {
        salience: unwoundedMember.salience,
        fearContract,
      });
      const unwoundedInvestigateScore = scoreCandidateBehavior('INVESTIGATE', unwoundedMember, 1.0, {
        salience: unwoundedMember.salience,
        fearContract,
      });

      // Calculate scores for wounded
      const woundedFleeScore = scoreCandidateBehavior('FLEE', woundedMember, 1.0, {
        salience: woundedMember.salience,
        fearContract,
      });
      const woundedInvestigateScore = scoreCandidateBehavior('INVESTIGATE', woundedMember, 1.0, {
        salience: woundedMember.salience,
        fearContract,
      });

      // Assert mechanism deltas (never assert which verb won!)
      const fleeDelta = woundedFleeScore - unwoundedFleeScore;
      const investigateDelta = woundedInvestigateScore - unwoundedInvestigateScore;

      // FLEE score increases under life threat (+1.2 affinity * 0.5 intensity = +0.60)
      expect(fleeDelta).toBeGreaterThan(0.4);

      // INVESTIGATE score decreases under life threat (-1.0 affinity * 0.5 intensity = -0.50)
      expect(investigateDelta).toBeLessThan(-0.4);

      // Verify exact mathematical delta match
      expect(fleeDelta).toBeCloseTo(0.5 * 1.2, 2);
      expect(investigateDelta).toBeCloseTo(0.5 * -1.0, 2);
    });

    it('demonstrates parameterization across threat types (freedom vs identity)', () => {
      const freedomThreatMember = createTestMember(
        'char-freedom',
        {},
        { spike: 0.5, dread: 0.1, threatType: 'freedom' }
      );
      const identityThreatMember = createTestMember(
        'char-identity',
        {},
        { spike: 0.5, dread: 0.1, threatType: 'identity' }
      );

      const freedomMisdirectScore = scoreCandidateBehavior(
        'MISDIRECT',
        freedomThreatMember,
        1.0,
        { salience: freedomThreatMember.salience }
      );
      const identityDenyScore = scoreCandidateBehavior(
        'DENY',
        identityThreatMember,
        1.0,
        { salience: identityThreatMember.salience }
      );

      // Under freedom threat: MISDIRECT gets +0.9 * 0.6 = +0.54 boost
      expect(freedomMisdirectScore).toBeGreaterThan(DEFAULT_AFFINITIES.MISDIRECT);

      // Under identity threat: DENY gets +1.2 * 0.6 = +0.72 boost
      expect(identityDenyScore).toBeGreaterThan(DEFAULT_AFFINITIES.DENY);
    });

    it('protects human player sovereignty: human intent and scores are never reweighted by threat salience', () => {
      const humanMember = createTestMember(
        'player-char',
        {},
        { spike: 0.9, dread: 0.8, threatType: 'life', preyMode: true } // Extreme Band 4 terror
      );

      const humanScoreInvestigate = scoreCandidateBehavior(
        'INVESTIGATE',
        humanMember,
        1.0,
        {
          salience: humanMember.salience,
          isUserCharacter: true,
        }
      );

      const humanScoreFlee = scoreCandidateBehavior(
        'FLEE',
        humanMember,
        1.0,
        {
          salience: humanMember.salience,
          isUserCharacter: true,
        }
      );

      // Human scores remain pure base affinities without threat penalty or panic distortion
      expect(humanScoreInvestigate).toBe(DEFAULT_AFFINITIES.INVESTIGATE);
      expect(humanScoreFlee).toBe(DEFAULT_AFFINITIES.FLEE);
    });
  });

  describe('2. Prey-Mode Hysteresis & Cohort Preservation (§5.2)', () => {
    it('enters prey mode at enter threshold (0.70), stays at 0.60, and exits only at <= 0.40', () => {
      const fearContract: Partial<FearContract> = {
        preyEnterThreshold: 0.70,
        preyExitThreshold: 0.40,
      };

      // 1. Below enter threshold: investigator mode
      const memberCalm = createTestMember('char-m', {}, { spike: 0.5, dread: 0.1, preyMode: false }); // 0.60
      scoreCandidateBehavior('INVESTIGATE', memberCalm, 1.0, {
        salience: memberCalm.salience,
        fearContract,
      });
      expect(memberCalm.salience?.preyMode).toBe(false);

      // 2. Crosses enter threshold: enters prey mode
      const memberTerrified = createTestMember('char-m', {}, { spike: 0.5, dread: 0.25, preyMode: false }); // 0.75 >= 0.70
      scoreCandidateBehavior('INVESTIGATE', memberTerrified, 1.0, {
        salience: memberTerrified.salience,
        fearContract,
      });
      expect(memberTerrified.salience?.preyMode).toBe(true);

      // 3. Drops to 0.60 while already in prey mode: stays in prey mode (hysteresis)
      const memberCooling = createTestMember('char-m', {}, { spike: 0.4, dread: 0.20, preyMode: true }); // 0.60
      scoreCandidateBehavior('INVESTIGATE', memberCooling, 1.0, {
        salience: memberCooling.salience,
        fearContract,
      });
      expect(memberCooling.salience?.preyMode).toBe(true);

      // 4. Drops to 0.35 (<= 0.40): exits prey mode
      const memberSafe = createTestMember('char-m', {}, { spike: 0.2, dread: 0.15, preyMode: true }); // 0.35 <= 0.40
      scoreCandidateBehavior('INVESTIGATE', memberSafe, 1.0, {
        salience: memberSafe.salience,
        fearContract,
      });
      expect(memberSafe.salience?.preyMode).toBe(false);
    });

    it('suppresses escalating verbs at Layer 2 during prey mode while preserving SHARE and cohort membership', () => {
      const preyMember = createTestMember('char-prey', {}, { spike: 0.5, dread: 0.3, preyMode: true });

      const investigateScore = scoreCandidateBehavior('INVESTIGATE', preyMember, 1.0, {
        salience: preyMember.salience,
      });
      const hideScore = scoreCandidateBehavior('HIDE', preyMember, 1.0, {
        salience: preyMember.salience,
      });
      const shareScore = scoreCandidateBehavior('SHARE', preyMember, 1.0, {
        salience: preyMember.salience,
      });

      // Escalating verb is heavily suppressed (< 0) but still computable as last resort
      expect(investigateScore).toBeLessThan(0);

      // Survival verbs and social sharing dominate
      expect(hideScore).toBeGreaterThan(1.5);
      expect(shareScore).toBeGreaterThan(0.5);
    });
  });

  describe('3. SUBMIT Two-Step Turn Contract (§5.4)', () => {
    it('Turn N: executes SUBMIT, sets stance SUBMITTED, and emits begging traces', () => {
      const member = createTestMember('char-victim');
      const context: BehaviorExecutionContext = {
        turnNumber: 3,
        fictionalTime: 180,
        currentNodeId: 'chapel-room',
        memberLocations: { 'char-victim': 'chapel-room' },
        topologyNodes: [{ id: 'chapel-room', name: 'Chapel' }],
        topologyConnections: [],
        allMembers: { 'char-victim': member },
        activeEvidenceAtNode: [],
      };

      const result = executeSubmit(member, context);

      expect(result.member.lastAction).toBe('SUBMIT');
      expect(result.member.stance).toEqual({ focus: 'SITUATION', stance: 'SUBMITTED' });
      expect(result.emittedTraces).toHaveLength(2);
      expect(result.emittedTraces.some((t) => t.channel === 'ACOUSTIC')).toBe(true);
      expect(result.emittedTraces.some((t) => t.channel === 'SOCIAL')).toBe(true);
    });

    it('Turn N+1: evaluates autonomous villain response contract and human villain choice', () => {
      // NPC Villain evaluating authored contract
      const npcResponse = evaluateSubmitResponse({
        villainId: 'villain-cultist',
        submittedCharId: 'char-victim',
        submitResponseContract: {
          'villain-cultist': 'ACCEPT',
        },
      });
      expect(npcResponse.outcome).toBe('ACCEPT');
      expect(npcResponse.targetStancePostState).toBe('WITHDRAWN');

      // Human Villain presented with sovereignty choice payload
      const humanResponse = evaluateSubmitResponse({
        villainId: 'player-villain',
        submittedCharId: 'char-victim',
        isVillainHuman: true,
      });
      expect(humanResponse.outcome).toBe('AWAITING_HUMAN_CHOICE');
      expect(humanResponse.humanPromptPayload?.suggestedOptions.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('4. Panic Traces & Anti-Rebroadcast (§5.5)', () => {
    it('emits panic trace on entering high terror, but suppresses re-emission across 5 consecutive panicked turns (consumed identity)', () => {
      const charId = 'char-panicked';
      const nodeId = 'hall-1';
      const fictionalTime = 100;
      const fearIntensity = 0.85; // Band 3
      const salienceSpikeTurn = 1;

      // Turn 1: Enters panic episode (salienceSpikeTurn = 1) -> emits trace
      let lastEmittedTurn: number | undefined = undefined;
      const traceTurn1 = generatePanicTrace(
        charId,
        fearIntensity,
        nodeId,
        1,
        fictionalTime,
        salienceSpikeTurn,
        lastEmittedTurn
      );
      expect(traceTurn1).not.toBeNull();
      expect(traceTurn1?.id).toBe('char-panicked-panic-1');
      lastEmittedTurn = salienceSpikeTurn;

      // Turns 2 through 5: Character remains panicked with same spike turn (1),
      // anti-rebroadcast suppresses duplicate trace emission
      for (let t = 2; t <= 5; t++) {
        const traceSubsequent = generatePanicTrace(
          charId,
          fearIntensity,
          nodeId,
          t,
          fictionalTime + (t - 1) * 60,
          salienceSpikeTurn,
          lastEmittedTurn
        );
        expect(traceSubsequent).toBeNull();
      }

      // Turn 6: A new discrete spike occurs (salienceSpikeTurn = 6) -> emits a new panic trace
      const newSpikeTurn = 6;
      const traceTurn6 = generatePanicTrace(
        charId,
        0.95, // Band 4
        nodeId,
        6,
        fictionalTime + 300,
        newSpikeTurn,
        lastEmittedTurn
      );
      expect(traceTurn6).not.toBeNull();
      expect(traceTurn6?.id).toBe('char-panicked-panic-6');
      expect(traceTurn6?.clarity).toBe('STARK');
    });
  });

  describe('5. Individual Dampening (§5.5, §11.8)', () => {
    it('steady / fearless receiver receives lower salience delta than unsteady receiver from identical panic trace', () => {
      const panicTrace: PanicTraceEvent = {
        id: 'trace-panic-bob-1',
        sourceCharacterId: 'bob',
        nodeId: 'hall-1',
        clarity: 'STARK',
        turn: 1,
      };

      const unsteadyCognition = {
        characterId: 'unsteady-charlie',
        skepticism: 0.5,
        cognitiveDissonance: 0,
        ingestedEvidenceIds: [],
        hypotheses: {},
      };

      const steadyCognition = {
        characterId: 'steady-alice',
        skepticism: 0.9,
        cognitiveDissonance: 0,
        ingestedEvidenceIds: [],
        hypotheses: {},
      };

      // Unsteady receiver (fearlessness 0, not seat holder, high prior salience)
      const unsteadyResult = ingestPanicTraceEvent(
        unsteadyCognition,
        panicTrace,
        {
          receiverFearlessness: 0,
          isSeatHolder: false,
          receiverSalience: { spike: 0.4, dread: 0.2 },
        },
        1
      );

      // Steady receiver (fearlessness 0.8, seat holder, calm prior salience)
      const steadyResult = ingestPanicTraceEvent(
        steadyCognition,
        panicTrace,
        {
          receiverFearlessness: 0.8,
          isSeatHolder: true,
          receiverSalience: { spike: 0.1, dread: 0 },
        },
        1
      );

      expect(steadyResult.spikeDelta).toBeLessThan(unsteadyResult.spikeDelta);
      expect(steadyResult.cognition.cognitiveDissonance).toBeLessThan(
        unsteadyResult.cognition.cognitiveDissonance
      );

      // Second ingestion of same trace is completely deduplicated (0 delta)
      const duplicateResult = ingestPanicTraceEvent(
        steadyResult.cognition,
        panicTrace,
        { receiverFearlessness: 0.8 },
        2
      );
      expect(duplicateResult.spikeDelta).toBe(0);
      expect(duplicateResult.dreadDelta).toBe(0);
    });
  });

  describe('6. Somatic Prompt Context & POV Perception Distortion (§5.3)', () => {
    it('formats multi-character somatic state prompt blocks for active fear bands', () => {
      const salienceLedger = {
        'dale': { spike: 0.4, dread: 0.2, threatType: 'life' as const, provenance: [], preyMode: false }, // 0.60 -> Band 2
        'elena': { spike: 0.1, dread: 0.05, threatType: 'life' as const, provenance: [], preyMode: false }, // 0.15 -> Band 0
      };
      const cast = [
        { id: 'dale', name: 'Dale Brennan' },
        { id: 'elena', name: 'Elena Ramos' },
      ];

      const formatted = formatSomaticStatePrompt(salienceLedger, cast, {});
      expect(formatted).toContain('[SOMATIC STATE: Dale Brennan (Band 2: HAND_TREMOR, VOICE_TREMOR, COLD_SWEAT, PERIPHERAL_TUNNELING)]');
      expect(formatted).not.toContain('Elena Ramos'); // Band 0 omitted
    });

    it('formats somatic blocks directly from salienceLedger when cast roster is omitted', () => {
      const salienceLedger = {
        'char-1': { spike: 0.7, dread: 0.1, threatType: 'life' as const, provenance: [], preyMode: false },
      };
      const formatted = formatSomaticStatePrompt(salienceLedger);
      expect(formatted).toContain('[SOMATIC STATE: char-1 (Band 3:');
    });

    it('distorts external observations for terrified POV while preserving 100% wound severity fidelity (Invariant 4)', () => {
      const observations = [
        'A shadowy silhouette moves past the frosted glass.',
        'Deep arterial laceration to the right forearm, bleeding heavily.',
        'Disturbed dust on the concrete floor indicates recent passage.',
      ];

      const distorted = distortPovObservations(observations, 0.85); // Band 3 terror

      // External visual cues distorted
      expect(distorted[0]).toContain('[PERIPHERAL TUNNELING');
      expect(distorted[2]).toContain('[PERIPHERAL TUNNELING');

      // Internal bodily wound fact preserved with zero degradation
      expect(distorted[1]).toBe('Deep arterial laceration to the right forearm, bleeding heavily.');
    });
  });

  describe('7. tickCohortState Full Behavior & Receipt Integration', () => {
    it('emits panic traces and updates member.lastEmittedPanicTurn during live cohort ticks', () => {
      const terrifiedMember = createTestMember(
        'char-terrified',
        { affinities: { FLEE: 10.0 } },
        {
          spike: 0.85,
          dread: 0,
          threatType: 'life',
          provenance: [
            { eventId: 'ev-attack-1', kind: 'wound', spikeDelta: 0.85, dreadDelta: 0, turn: 1 },
          ],
        }
      );

      const cohortState = {
        status: 'ACTIVE' as const,
        collectivePhase: 'ONSET' as const,
        peakPhase: 'ONSET' as const,
        ratifiedRatchetPhase: 'ONSET' as const,
        successionVulnerabilityWindowRemaining: 0,
        members: { 'char-terrified': terrifiedMember },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
      };

      const baseContext = {
        turnNumber: 1,
        fictionalTime: 60,
        topologyNodes: [{ id: 'node-room', name: 'Room' }],
        topologyConnections: [],
        exitNodeIds: [],
        salienceLedger: { 'char-terrified': terrifiedMember.salience! },
      };

      const { nextState, receipts } = tickCohortState(
        cohortState,
        60,
        baseContext,
        { 'char-terrified': 'node-room' },
        {}
      );

      // Verify panic trace is emitted alongside action traces and state updated
      expect(nextState.members['char-terrified'].lastEmittedPanicTurn).toBe(1);
      expect(receipts).toHaveLength(1);
      const emittedTraces = receipts[0].tracesEmitted;
      const panicTrace = emittedTraces.find((t) => t.id === 'char-terrified-panic-1');
      expect(panicTrace).toBeDefined();
      expect(panicTrace?.clarity).toBe('AUDIBLE');
    });

    it('records submissionAttempted: true in cycle receipt when SUBMIT is executed in cohort tick', () => {
      const submitMember = createTestMember(
        'char-submitter',
        { affinities: { SUBMIT: 10.0 } },
        { spike: 0.9, dread: 0.8, threatType: 'life' }
      );

      const cohortState = {
        status: 'ACTIVE' as const,
        collectivePhase: 'ONSET' as const,
        peakPhase: 'ONSET' as const,
        ratifiedRatchetPhase: 'ONSET' as const,
        successionVulnerabilityWindowRemaining: 0,
        members: { 'char-submitter': submitMember },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
      };

      const baseContext = {
        turnNumber: 2,
        fictionalTime: 120,
        topologyNodes: [{ id: 'node-chapel', name: 'Chapel' }],
        topologyConnections: [],
        salienceLedger: { 'char-submitter': submitMember.salience! },
      };

      const { receipts } = tickCohortState(
        cohortState,
        60,
        baseContext,
        { 'char-submitter': 'node-chapel' },
        {}
      );

      expect(receipts).toHaveLength(1);
      expect(receipts[0].selectedBehavior).toBe('SUBMIT');
      expect(receipts[0].submissionAttempted).toBe(true);
    });

    it('extracts salience and fearContract automatically when passed { context } options to scoreCandidateBehavior', () => {
      const member = createTestMember('char-opt');
      const salience = {
        spike: 0.6,
        dread: 0.2,
        threatType: 'life' as const,
        provenance: [],
        preyMode: false,
      };

      const score = scoreCandidateBehavior('FLEE', member, 1.0, {
        context: {
          turnNumber: 1,
          fictionalTime: 0,
          currentNodeId: 'n1',
          memberLocations: {},
          topologyNodes: [],
          topologyConnections: [],
          allMembers: {},
          activeEvidenceAtNode: [],
          salienceLedger: { 'char-opt': salience },
          fearContract: { threatWeights: { life: 1.0, freedom: 1.0, identity: 1.0 } },
        },
      });

      // FLEE base 0.4 + (1.0 gain * 0.8 intensity * 1.2 affinity) = 0.4 + 0.96 = 1.36
      expect(score).toBeGreaterThan(1.0);
    });

    it('preserves Player Sovereignty: human player declared action is never overridden or reweighted by fear salience at Band 4 while somatic tokens are emitted to narration', () => {
      // Setup extreme Band 4 terror state (spike: 0.95, dread: 0.95 -> intensity > 0.90)
      const playerMember = createTestMember('char-player', {
        affinities: {
          STAND_FIRM: 1.5,
          INVESTIGATE: 1.0,
          FLEE: 0.2,
        },
      });

      const band4Salience: CharacterSalience = {
        spike: 0.95,
        dread: 0.95,
        threatType: 'life',
        provenance: [
          {
            eventId: 'ev-monster',
            kind: 'threat-event',
            spikeDelta: 0.95,
            dreadDelta: 0.95,
            turn: 1,
          },
        ],
        preyMode: true,
      };

      const fearContract = {
        threatWeights: { life: 1.0, freedom: 1.0, identity: 1.0 },
        lambdaDecay: 0.35,
        residueRatio: 0.25,
        preyEnterThreshold: 0.70,
        preyExitThreshold: 0.40,
        somaticBands: { band1: 0.25, band2: 0.50, band3: 0.75, band4: 0.90 },
      };

      // 1. NPC character at Band 4 fear: FLEE is heavily amplified, non-flee actions suppressed
      const npcFleeScore = scoreCandidateBehavior('FLEE', playerMember, 1.0, {
        salience: band4Salience,
        fearContract,
        isUserCharacter: false,
      });
      const npcStandFirmScore = scoreCandidateBehavior('STAND_FIRM', playerMember, 1.0, {
        salience: band4Salience,
        fearContract,
        isUserCharacter: false,
      });
      // In prey mode, FLEE gets massive boost, while non-flee/non-hide verbs are suppressed
      expect(npcFleeScore).toBeGreaterThan(npcStandFirmScore);

      // 2. User/Player character at Band 4 fear: Invariant 6 enforces exact sovereign score preservation
      const playerStandFirmScore = scoreCandidateBehavior('STAND_FIRM', playerMember, 1.0, {
        salience: band4Salience,
        fearContract,
        isUserCharacter: true,
      });
      const playerFleeScore = scoreCandidateBehavior('FLEE', playerMember, 1.0, {
        salience: band4Salience,
        fearContract,
        isUserCharacter: true,
      });

      // Player choice ("Stand firm in the doorway") is preserved with exact base affinity (1.5 > 0.2)
      expect(playerStandFirmScore).toBe(1.5);
      expect(playerFleeScore).toBe(0.2);
      expect(playerStandFirmScore).toBeGreaterThan(playerFleeScore);

      // 3. Somatic tokens are still derived and emitted to narration for the player character
      const somaticPrompt = formatSomaticStatePrompt(
        { 'char-player': band4Salience },
        [{ id: 'char-player', name: 'Player' }],
        fearContract
      );
      expect(somaticPrompt).toContain('[SOMATIC STATE: Player (Band 4:');
      expect(somaticPrompt).toContain('FREEZE_IMMOBILITY');
    });
  });
});

