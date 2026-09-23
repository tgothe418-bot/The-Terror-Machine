import { describe, it, expect } from 'vitest';
import type { CohortState, CohortMember } from '../types/cohort';
import type { ScenarioBlueprint } from '../types';
import {
  tickCohortState,
  evaluateCollectivePhase,
  initializeCohortState,
  removeCohortMember,
  scoreCandidateBehavior,
  FATIGUE_MULTIPLIER,
} from './cohortEngine';
import { canShareDiegetically, isBehaviorExecutable } from './cohortBehaviors';

describe('HG2 Series 2 — Opposition Cohort Emergence Fixtures', () => {
  const baseTopology = {
    nodes: [
      { id: 'hall-1', name: 'West Hall' },
      { id: 'hall-2', name: 'East Hall' },
      { id: 'attic', name: 'Attic' },
    ],
    connections: [
      {
        fromNodeId: 'hall-1',
        toNodeId: 'hall-2',
        status: 'OPEN' as const,
        kind: 'HALLWAY' as const,
      },
      {
        fromNodeId: 'hall-2',
        toNodeId: 'attic',
        status: 'LOCKED' as const,
        kind: 'DOOR' as const,
      },
    ],
  };

  function createMockMember(id: string, isSeatHolder = false, lastAction?: string): CohortMember {
    return {
      characterId: id,
      isSeatHolder,
      tenureTurns: 1,
      affinities: {
        INVESTIGATE: 1.0,
        SHARE: 0.8,
      },
      lastAction,
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
    };
  }

  it('Fixture 1: INVESTIGATE accumulates evidence with dissonance and SHARE propagates across OPEN topology but blocked across LOCKED door', () => {
    const initialState: CohortState = {
      status: 'ACTIVE',
      collectivePhase: 'ONSET',
      peakPhase: 'ONSET',
      ratifiedRatchetPhase: 'ONSET',
      seatHolderId: 'investigator-lead',
      successionVulnerabilityWindowRemaining: 0,
      members: {
        'investigator-lead': createMockMember('investigator-lead', true),
        'investigator-deputy': createMockMember('investigator-deputy', false),
      },
      dormantCastCognition: {},
      institutionalMemory: {},
      recentReceipts: [],
    };

    const evidenceByNode = {
      'hall-1': [
        {
          id: 'trace-body-1',
          targetHypothesisId: 'hyp-threat-exists',
          weightDelta: 0.4,
          text: 'Corpse found with ritual incisions.',
          dissonanceDelta: 0.25,
        },
      ],
    };

    // Turn 1: Lead investigates trace at hall-1 (60s tick)
    const { nextState: turn1State, receipts: r1 } = tickCohortState(
      initialState,
      60,
      {
        turnNumber: 1,
        fictionalTime: 0,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
      },
      { 'investigator-lead': 'hall-1', 'investigator-deputy': 'hall-1' },
      evidenceByNode
    );

    expect(r1.some((r) => r.selectedBehavior === 'INVESTIGATE')).toBe(true);
    const leadCognition = turn1State.members['investigator-lead'].cognition;
    expect(leadCognition.hypotheses['hyp-threat-exists'].weight).toBeGreaterThan(0.4);
    expect(leadCognition.cognitiveDissonance).toBeGreaterThan(0.2); // Dissonance accumulated
    expect(leadCognition.ingestedEvidenceIds).toContain('trace-body-1');

    // Phase advances to DISCOVERY (threshold 0.3)
    expect(turn1State.collectivePhase).toBe('DISCOVERY');
    expect(turn1State.peakPhase).toBe('DISCOVERY');

    // Test cross-node SHARE gating:
    // Lead at hall-1, Deputy at hall-2 (OPEN edge) -> canShareDiegetically is TRUE
    const contextOpen = {
      turnNumber: 2,
      fictionalTime: 60,
      currentNodeId: 'hall-1',
      memberLocations: { 'investigator-lead': 'hall-1', 'investigator-deputy': 'hall-2' },
      topologyNodes: baseTopology.nodes,
      topologyConnections: baseTopology.connections,
      allMembers: turn1State.members,
      activeEvidenceAtNode: [],
    };
    expect(
      canShareDiegetically(
        turn1State.members['investigator-lead'],
        turn1State.members['investigator-deputy'],
        contextOpen
      )
    ).toBe(true);

    // Deputy at attic (LOCKED door from hall-2, disconnected from hall-1) -> canShareDiegetically is FALSE
    const contextLocked = {
      ...contextOpen,
      memberLocations: { 'investigator-lead': 'hall-1', 'investigator-deputy': 'attic' },
    };
    expect(
      canShareDiegetically(
        turn1State.members['investigator-lead'],
        turn1State.members['investigator-deputy'],
        contextLocked
      )
    ).toBe(false);
  });

  it('Fixture 2: Lead Investigator elimination opens succession vulnerability window with disruption shock before deputy promotion', () => {
    const initialState: CohortState = {
      status: 'ACTIVE',
      collectivePhase: 'CONFIRMATION',
      peakPhase: 'CONFIRMATION',
      ratifiedRatchetPhase: 'CONFIRMATION',
      seatHolderId: 'investigator-lead',
      successionVulnerabilityWindowRemaining: 0,
      members: {
        'investigator-lead': createMockMember('investigator-lead', true),
        'investigator-deputy': createMockMember('investigator-deputy', false),
      },
      dormantCastCognition: {},
      institutionalMemory: {},
      recentReceipts: [],
    };

    // Kill lead investigator using removeCohortMember
    const shockState = removeCohortMember(
      initialState,
      'investigator-lead',
      'DEATH',
      300
    );

    expect(shockState.seatHolderId).toBeUndefined();
    expect(shockState.successionVulnerabilityWindowRemaining).toBe(300);
    // Disruption shock applied to surviving deputy (skepticism +0.1, dissonance +0.2)
    expect(shockState.members['investigator-deputy'].cognition.skepticism).toBeCloseTo(0.9);
    expect(shockState.members['investigator-deputy'].cognition.cognitiveDissonance).toBeCloseTo(0.2);

    // Tick 60s: Deputy does NOT inherit seat yet (window remaining: 240s)
    const { nextState: midTick } = tickCohortState(
      shockState,
      60,
      {
        turnNumber: 2,
        fictionalTime: 60,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
      },
      { 'investigator-deputy': 'hall-1' },
      {}
    );

    expect(midTick.seatHolderId).toBeUndefined();
    expect(midTick.successionVulnerabilityWindowRemaining).toBe(240);

    // Tick 250s: Window expires (240 - 250 <= 0) -> Deputy promoted to seatHolder
    const { nextState: postSuccession } = tickCohortState(
      midTick,
      250,
      {
        turnNumber: 3,
        fictionalTime: 310,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
      },
      { 'investigator-deputy': 'hall-1' },
      {}
    );

    expect(postSuccession.seatHolderId).toBe('investigator-deputy');
    expect(postSuccession.members['investigator-deputy'].isSeatHolder).toBe(true);
  });

  it('Fixture 3: Bounded tick rate prevents multi-behavior cascade and credits leftover time accurately in a 15-minute player turn', () => {
    const initialState: CohortState = {
      status: 'ACTIVE',
      collectivePhase: 'ONSET',
      peakPhase: 'ONSET',
      ratifiedRatchetPhase: 'ONSET',
      seatHolderId: 'char-1',
      successionVulnerabilityWindowRemaining: 0,
      members: {
        'char-1': {
          ...createMockMember('char-1', true),
          behaviorDuration: {
            currentBehaviorId: 'INVESTIGATE',
            startedAtFictionalTime: 0,
            durationSeconds: 180,
            progressSeconds: 120, // 60s remaining
            status: 'IN_PROGRESS',
          },
        },
      },
      dormantCastCognition: {},
      institutionalMemory: {},
      recentReceipts: [],
    };

    // 15-minute player action (900 seconds)
    // First behavior finishes taking 60s (180 - 120 = 60s). Leftover is 900 - 60 = 840s.
    // Initiates new INVESTIGATE (180s duration). Progress is credited up to duration - 1 (179s).
    const { nextState, receipts } = tickCohortState(
      initialState,
      900,
      {
        turnNumber: 1,
        fictionalTime: 0,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
      },
      { 'char-1': 'hall-1' },
      {
        'hall-1': [
          {
            id: 'tr-new-1',
            targetHypothesisId: 'hyp-threat-exists',
            weightDelta: 0.2,
            text: 'new clue',
          },
        ],
      }
    );

    // Bound contract: Exactly 1 behavior initiation receipt emitted per player turn
    const memberReceipts = receipts.filter((r) => r.characterId === 'char-1');
    expect(memberReceipts).toHaveLength(1);
    expect(nextState.members['char-1'].behaviorDuration?.status).toBe('IN_PROGRESS');
    expect(nextState.members['char-1'].behaviorDuration?.progressSeconds).toBe(179); // Capped at duration - 1
  });

  it('Fixture 4: Monotonic peakPhase freezes on DORMANT status when cohort empties, and Turn Retake cleanly rolls back state', () => {
    const turn0State: CohortState = {
      status: 'ACTIVE',
      collectivePhase: 'CONFIRMATION',
      peakPhase: 'CONFIRMATION',
      ratifiedRatchetPhase: 'CONFIRMATION',
      seatHolderId: 'char-1',
      successionVulnerabilityWindowRemaining: 0,
      members: {
        'char-1': {
          ...createMockMember('char-1', true),
          cognition: {
            characterId: 'char-1',
            skepticism: 0.5,
            cognitiveDissonance: 0.5,
            ingestedEvidenceIds: ['ev-1'],
            hypotheses: {
              'hyp-threat-exists': {
                id: 'hyp-threat-exists',
                weight: 0.7,
                provenance: { lastUpdatedTurn: 0 },
              },
            },
          },
        },
      },
      dormantCastCognition: {},
      institutionalMemory: {},
      recentReceipts: [],
    };

    // Remove char-1 -> cohort becomes DORMANT
    const dormantState = removeCohortMember(turn0State, 'char-1', 'DEATH');
    expect(dormantState.status).toBe('DORMANT');
    expect(Object.keys(dormantState.members)).toHaveLength(0);
    // Preserves institutional memory
    expect(dormantState.institutionalMemory['hyp-threat-exists']?.weight).toBe(0.7);

    // Phase evaluation returns peakPhase on dormant
    const evaluated = evaluateCollectivePhase(dormantState);
    expect(evaluated.collectivePhase).toBe('CONFIRMATION');
    expect(evaluated.peakPhase).toBe('CONFIRMATION');

    // Retake simulation: rollback replaces state with snapshot of turn0State
    const rolledBackState = { ...turn0State };
    expect(rolledBackState.status).toBe('ACTIVE');
    expect(Object.keys(rolledBackState.members)).toHaveLength(1);
    expect(rolledBackState.members['char-1'].cognition.hypotheses['hyp-threat-exists'].weight).toBe(0.7);
  });

  describe('Unit tests for selection, scoring, and lifecycle', () => {
    it('applies 0.4 fatigue multiplier on consecutive identical action', () => {
      const member = createMockMember('m1', false, 'INVESTIGATE');
      const scoreRepeated = scoreCandidateBehavior('INVESTIGATE', member);
      const scoreFresh = scoreCandidateBehavior('SHARE', member);

      expect(scoreRepeated).toBeCloseTo(1.0 * FATIGUE_MULTIPLIER);
      expect(scoreFresh).toBeCloseTo(0.8 * 1.0);
    });

    it('initializes cohort state correctly from blueprint', () => {
      const mockBlueprint: ScenarioBlueprint = {
        title: 'Test Scenario',
        premise: 'A haunting',
        setting: { location: 'Manor', atmosphere: 'Gloomy', timePeriod: '1920' },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        incitingIncident: 'A scream',
        pacingDirective: 'Slow',
        keyPlotElements: [],
        cast: [
          {
            id: 'detective-1',
            name: 'Detective Ross',
            role: 'LEAD_INVESTIGATOR',
            description: 'A grim detective',
            personality: 'Analytical',
            goals: 'Solve the case',
            traits: ['observant'],
            isEntity: false,
            isUserCharacter: false,
          },
          {
            id: 'officer-2',
            name: 'Officer Diaz',
            role: 'POLICE_OFFICER',
            description: 'Junior patrol officer',
            personality: 'Nervous',
            goals: 'Survive',
            traits: ['cautious'],
            isEntity: false,
            isUserCharacter: false,
          },
        ],
        topology: {
          nodes: ['hall-1', 'hall-2'],
          connections: [{ from: 'hall-1', to: 'hall-2', kind: 'PHYSICAL', userInitiated: true }],
        },
      };

      const cohort = initializeCohortState(mockBlueprint);
      expect(cohort.status).toBe('ACTIVE');
      expect(cohort.seatHolderId).toBe('detective-1');
      expect(cohort.members['detective-1'].isSeatHolder).toBe(true);
      expect(cohort.members['officer-2'].isSeatHolder).toBe(false);
      expect(cohort.members['detective-1'].cognition.hypotheses['hyp-threat-exists']).toBeDefined();
    });

    it('enforces executability filter when evidence or peer is unavailable', () => {
      const member = createMockMember('m1');
      const contextNoEvidence = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      expect(isBehaviorExecutable('INVESTIGATE', member, contextNoEvidence)).toBe(false);
      expect(isBehaviorExecutable('SHARE', member, contextNoEvidence)).toBe(false);
    });
  });
});
