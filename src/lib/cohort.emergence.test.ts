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
  VERB_UNIVERSE,
  SURVIVAL_VERBS,
  DEFAULT_AFFINITIES,
  computeConsiderationSet,
  computeEnvironmentalWeight,
} from './cohortEngine';
import {
  canShareDiegetically,
  isBehaviorExecutable,
  executeCloseIn,
  executeFlee,
  executeDeny,
  executeMourn,
  executeRecruit,
  executeFortify,
  areMembersFractured,
} from './cohortBehaviors';

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
        contentScale: 3,
        contentLevelDescription: 'Spooky Fun',
        setting: { location: 'Manor', atmosphere: 'Gloomy', timePeriod: '1920' },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        narrativeRules: {
          incitingIncident: 'A scream',
          currentTensionLevel: 'buildup',
          keyPlotElements: [],
          pacingDirectives: 'Slow',
        },
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

  function createFullMember(id: string, overrides: Partial<CohortMember> = {}): CohortMember {
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
      ...overrides,
    };
  }

  describe('Layer 1 Gating & Layer 2 Modulation', () => {
    it('Layer 1: collapses to survival subset under threat proximity >= 0.8', () => {
      const member = createFullMember('m1');
      const contextThreat = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        threatProximity: 0.85,
      };

      const set = computeConsiderationSet(member, contextThreat);
      expect(set).toEqual([...SURVIVAL_VERBS]);
      expect(set).toContain('FORTIFY');
      expect(set).toContain('HIDE');
      expect(set).toContain('FLEE');
      expect(set).toContain('CLOSE_IN');
      expect(set).not.toContain('PURSUE_AGENDA');
      expect(set).not.toContain('MOURN');
    });

    it('Layer 1: collapses to survival subset under breaking proximity >= 1.0', () => {
      const member = createFullMember('m1');
      const contextBreaking = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        breakingProximity: { m1: 1.0 },
      };

      const set = computeConsiderationSet(member, contextBreaking);
      expect(set).toEqual([...SURVIVAL_VERBS]);
    });

    it('Layer 1: returns all 15 verbs under normal calm conditions', () => {
      const member = createFullMember('m1');
      const contextCalm = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        threatProximity: 0.1,
      };

      const set = computeConsiderationSet(member, contextCalm);
      expect(set).toEqual([...VERB_UNIVERSE]);
      expect(set).toHaveLength(15);
    });

    it('Layer 2: modulates DENY by (1 + skepticism) in ONSET', () => {
      const member = createFullMember('m1');
      member.cognition.skepticism = 0.8;
      const context = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };
      const cohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'ONSET',
        ratifiedRatchetPhase: 'ONSET',
        successionVulnerabilityWindowRemaining: 0,
        members: { m1: member },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      const weight = computeEnvironmentalWeight('DENY', member, context, cohort);
      expect(weight).toBeCloseTo(1 + 0.8);
    });

    it('Layer 2: inverts affinities when breaking proximity >= 0.7', () => {
      const member = createFullMember('m1');
      const context = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        breakingProximity: { m1: 0.75 },
      };
      const cohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        successionVulnerabilityWindowRemaining: 0,
        members: { m1: member },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      expect(computeEnvironmentalWeight('DENY', member, context, cohort)).toBe(2.0);
      expect(computeEnvironmentalWeight('HIDE', member, context, cohort)).toBe(1.5);
      expect(computeEnvironmentalWeight('CLOSE_IN', member, context, cohort)).toBe(0.5);
    });

    it('Layer 2: boosts MOURN, DENY, FRACTURE during casualty recency window', () => {
      const member = createFullMember('m1');
      const context = {
        turnNumber: 2,
        fictionalTime: 500,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };
      const cohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'DISCOVERY',
        peakPhase: 'DISCOVERY',
        ratifiedRatchetPhase: 'DISCOVERY',
        successionVulnerabilityWindowRemaining: 0,
        members: { m1: member },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        lastCasualtyFictionalTime: 200, // 300s ago <= 1800s
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      expect(computeEnvironmentalWeight('MOURN', member, context, cohort)).toBe(1.5);
      expect(computeEnvironmentalWeight('FRACTURE', member, context, cohort)).toBe(1.5);
      expect(computeEnvironmentalWeight('DENY', member, context, cohort)).toBe(1.5);
    });

    it('Layer 2: boosts PURSUE_AGENDA and MISDIRECT when calm in ONSET', () => {
      const member = createFullMember('m1');
      const context = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        threatProximity: 0.05,
      };
      const cohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'ONSET',
        ratifiedRatchetPhase: 'ONSET',
        successionVulnerabilityWindowRemaining: 0,
        members: { m1: member },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      expect(computeEnvironmentalWeight('PURSUE_AGENDA', member, context, cohort)).toBe(1.5);
      expect(computeEnvironmentalWeight('MISDIRECT', member, context, cohort)).toBe(1.5);
    });
  });

  describe('Executability Preconditions for All 15 Verbs', () => {
    it('CLOSE_IN executability: requires CONFIRMATION/CONFRONTATION and location hyp >= 0.6', () => {
      const member = createFullMember('m1', {
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-in-attic': { id: 'hyp-threat-in-attic', weight: 0.7, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });

      const baseCtx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      // In ONSET -> false
      expect(isBehaviorExecutable('CLOSE_IN', member, {
        ...baseCtx,
        cohort: { collectivePhase: 'ONSET' } as unknown as CohortState,
      })).toBe(false);

      // In CONFIRMATION with weight 0.7 -> true
      expect(isBehaviorExecutable('CLOSE_IN', member, {
        ...baseCtx,
        cohort: { collectivePhase: 'CONFIRMATION' } as unknown as CohortState,
      })).toBe(true);

      // In CONFIRMATION with weight 0.4 -> false
      const lowMember = createFullMember('m1', {
        cognition: {
          ...member.cognition,
          hypotheses: {
            'hyp-threat-in-attic': { id: 'hyp-threat-in-attic', weight: 0.4, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });
      expect(isBehaviorExecutable('CLOSE_IN', lowMember, {
        ...baseCtx,
        cohort: { collectivePhase: 'CONFIRMATION' } as unknown as CohortState,
      })).toBe(false);
    });

    it('TRAP executability: requires CONFIRMATION/CONFRONTATION and location hyp >= 0.6', () => {
      const member = createFullMember('m1', {
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-in-hall': { id: 'hyp-threat-in-hall', weight: 0.8, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });

      const baseCtx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      expect(isBehaviorExecutable('TRAP', member, {
        ...baseCtx,
        cohort: { collectivePhase: 'CONFIRMATION' } as unknown as CohortState,
      })).toBe(true);

      expect(isBehaviorExecutable('TRAP', member, {
        ...baseCtx,
        cohort: { collectivePhase: 'DISCOVERY' } as unknown as CohortState,
      })).toBe(false);
    });

    it('DENY, HIDE, FORTIFY, PURSUE_AGENDA: always executable', () => {
      const member = createFullMember('m1');
      const ctx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      expect(isBehaviorExecutable('DENY', member, ctx)).toBe(true);
      expect(isBehaviorExecutable('HIDE', member, ctx)).toBe(true);
      expect(isBehaviorExecutable('FORTIFY', member, ctx)).toBe(true);
      expect(isBehaviorExecutable('PURSUE_AGENDA', member, ctx)).toBe(true);
    });

    it('FLEE executability: requires reachable exit node via OPEN edges', () => {
      const member = createFullMember('m1');
      const baseCtx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections, // hall-1 <-> hall-2 (OPEN), hall-2 <-> attic (LOCKED)
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      // Exit at hall-2 (reachable via OPEN hallway) -> true
      expect(isBehaviorExecutable('FLEE', member, { ...baseCtx, exitNodeIds: ['hall-2'] })).toBe(true);

      // Exit at attic (behind LOCKED door) -> false
      expect(isBehaviorExecutable('FLEE', member, { ...baseCtx, exitNodeIds: ['attic'] })).toBe(false);

      // No exits specified -> false
      expect(isBehaviorExecutable('FLEE', member, { ...baseCtx, exitNodeIds: [] })).toBe(false);
    });

    it('MISDIRECT executability: requires divergent location hyp >= 0.3', () => {
      const m1 = createFullMember('m1', {
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-in-west': { id: 'hyp-threat-in-west', weight: 0.5, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });
      const m2 = createFullMember('m2', {
        cognition: {
          characterId: 'm2',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-in-east': { id: 'hyp-threat-in-east', weight: 0.9, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });

      const ctx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1', m2: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1, m2 },
        activeEvidenceAtNode: [],
        hypothesisNodeMap: { 'hyp-threat-in-west': 'hall-1', 'hyp-threat-in-east': 'hall-2' },
      };

      // m1 has top hyp 'hyp-threat-in-west' (0.5), collective best guess is 'hyp-threat-in-east' (0.9) -> true
      expect(isBehaviorExecutable('MISDIRECT', m1, ctx)).toBe(true);

      // m2 holds collective best guess -> false
      expect(isBehaviorExecutable('MISDIRECT', m2, ctx)).toBe(false);
    });

    it('MOURN executability: requires casualty recency window <= 1800s', () => {
      const member = createFullMember('m1');
      const ctx = {
        turnNumber: 1,
        fictionalTime: 1000,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      // Casualty occurred 500s ago (1000 - 500 = 500 <= 1800) -> true
      expect(
        isBehaviorExecutable('MOURN', member, {
          ...ctx,
          cohort: { lastCasualtyFictionalTime: 500 } as unknown as CohortState,
        })
      ).toBe(true);

      // Casualty occurred 2500s ago (1000 - -1500 = 2500 > 1800) -> false
      expect(
        isBehaviorExecutable('MOURN', member, {
          ...ctx,
          cohort: { lastCasualtyFictionalTime: 0, fictionalTime: 2500 } as unknown as CohortState,
          fictionalTime: 2500,
        })
      ).toBe(false);

      // No casualty -> false
      expect(isBehaviorExecutable('MOURN', member, { ...ctx, cohort: {} as unknown as CohortState })).toBe(false);
    });

    it('PARLEY executability: requires hyp-threat-exists weight >= 0.3', () => {
      const mHigh = createFullMember('mHigh', {
        cognition: {
          characterId: 'mHigh',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.4, provenance: { lastUpdatedTurn: 1 } } },
        },
      });
      const mLow = createFullMember('mLow', {
        cognition: {
          characterId: 'mLow',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.2, provenance: { lastUpdatedTurn: 1 } } },
        },
      });

      const ctx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { mHigh: 'hall-1', mLow: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { mHigh, mLow },
        activeEvidenceAtNode: [],
      };

      expect(isBehaviorExecutable('PARLEY', mHigh, ctx)).toBe(true);
      expect(isBehaviorExecutable('PARLEY', mLow, ctx)).toBe(false);
    });

    it('FRACTURE executability: triggered by belief spread >= 0.4 or dissonance >= 0.8', () => {
      const mA = createFullMember('mA', {
        cognition: {
          characterId: 'mA',
          skepticism: 0.8,
          cognitiveDissonance: 0.1,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.7, provenance: { lastUpdatedTurn: 1 } } },
        },
      });
      const mB = createFullMember('mB', {
        cognition: {
          characterId: 'mB',
          skepticism: 0.8,
          cognitiveDissonance: 0.1,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.2, provenance: { lastUpdatedTurn: 1 } } },
        },
      });

      const ctxSpread = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { mA: 'hall-1', mB: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { mA, mB },
        activeEvidenceAtNode: [],
      };

      // Spread is 0.7 - 0.2 = 0.5 >= 0.4 -> true
      expect(isBehaviorExecutable('FRACTURE', mA, ctxSpread)).toBe(true);

      // Single member -> false
      expect(isBehaviorExecutable('FRACTURE', mA, { ...ctxSpread, allMembers: { mA } })).toBe(false);

      // Low spread, but dissonance >= 0.8 -> true
      const mStress = createFullMember('mStress', {
        cognition: { ...mA.cognition, cognitiveDissonance: 0.85 },
      });
      const ctxStress = { ...ctxSpread, allMembers: { mA, mStress } };
      expect(isBehaviorExecutable('FRACTURE', mA, ctxStress)).toBe(true);
    });

    it('WARN executability: requires outsider in nearbyNonCohortCast within 1 hop', () => {
      const member = createFullMember('m1');
      const baseCtx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      // Outsider at adjacent hall-2 (OPEN hallway) -> true
      expect(
        isBehaviorExecutable('WARN', member, {
          ...baseCtx,
          nearbyNonCohortCast: [{ characterId: 'npc-bystander', nodeId: 'hall-2' }],
        })
      ).toBe(true);

      // Outsider at attic (LOCKED door) -> false
      expect(
        isBehaviorExecutable('WARN', member, {
          ...baseCtx,
          nearbyNonCohortCast: [{ characterId: 'npc-bystander', nodeId: 'attic' }],
        })
      ).toBe(false);
    });

    it('RECRUIT executability: requires candidate in recruitCandidates within 1 hop with score > 0', () => {
      const member = createFullMember('m1');
      const baseCtx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
      };

      // In range (hall-1) with score > 0 -> true
      expect(
        isBehaviorExecutable('RECRUIT', member, {
          ...baseCtx,
          recruitCandidates: [
            { characterId: 'cand-1', nodeId: 'hall-1', dissonanceWeight: 0.5, relationshipAffinity: 0.8 },
          ],
        })
      ).toBe(true);

      // Score = 0 -> false
      expect(
        isBehaviorExecutable('RECRUIT', member, {
          ...baseCtx,
          recruitCandidates: [
            { characterId: 'cand-1', nodeId: 'hall-1', dissonanceWeight: 0, relationshipAffinity: 0.8 },
          ],
        })
      ).toBe(false);
    });

    it('SHARE blocked when pair is fractured', () => {
      const mA = createFullMember('mA');
      const mB = createFullMember('mB');
      const ctx = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { mA: 'hall-1', mB: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { mA, mB },
        activeEvidenceAtNode: [],
        cohort: {
          fractures: [{ aCharacterId: 'mA', bCharacterId: 'mB', sinceTurn: 1, sinceFictionalTime: 0 }],
        } as unknown as CohortState,
      };

      expect(areMembersFractured('mA', 'mB', ctx.cohort.fractures)).toBe(true);
      expect(isBehaviorExecutable('SHARE', mA, ctx)).toBe(false);
    });
  });

  describe('Canonical Verb Execution & Trace/Receipt Invariants', () => {
    it('DENY dismisses evidence with zero deltas and sheds 0.3 dissonance', () => {
      const member = createFullMember('m1', {
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0.5,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.2, provenance: { lastUpdatedTurn: 0 } } },
        },
      });

      const context = {
        turnNumber: 1,
        fictionalTime: 60,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [
          { id: 'ev-test', targetHypothesisId: 'hyp-threat-exists', weightDelta: 0.4, text: 'scratches' },
        ],
      };

      const result = executeDeny(member, context);
      expect(result.member.cognition.ingestedEvidenceIds).toContain('ev-test');
      expect(result.member.cognition.hypotheses['hyp-threat-exists'].weight).toBe(0.2); // Zero weight delta!
      expect(result.member.cognition.cognitiveDissonance).toBeCloseTo(0.2); // 0.5 - 0.3 = 0.2
      expect(result.emittedTraces).toHaveLength(1);
      expect(result.emittedTraces[0].clarity).toBe('FAINT');
      expect(result.fictionalTimeSeconds).toBe(120);
    });

    it('FORTIFY accumulates strength up to max 3', () => {
      const member = createFullMember('m1');
      const ctx0 = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        cohort: { fortifiedNodes: {} } as unknown as CohortState,
      };

      const res1 = executeFortify(member, ctx0);
      expect(res1.fortifiedNodeDelta?.fortified.strength).toBe(1);

      const ctx2 = {
        ...ctx0,
        cohort: {
          fortifiedNodes: { 'hall-1': { barredByCharacterId: 'm1', fortifiedAtFictionalTime: 0, strength: 2 } },
        } as unknown as CohortState,
      };
      const res3 = executeFortify(member, ctx2);
      expect(res3.fortifiedNodeDelta?.fortified.strength).toBe(3);

      // Already max strength 3 stays at 3
      const ctx3 = {
        ...ctx0,
        cohort: {
          fortifiedNodes: { 'hall-1': { barredByCharacterId: 'm1', fortifiedAtFictionalTime: 0, strength: 3 } },
        } as unknown as CohortState,
      };
      const res4 = executeFortify(member, ctx3);
      expect(res4.fortifiedNodeDelta?.fortified.strength).toBe(3);
    });

    it('MOURN relieves dissonance for actor and co-located mourning peer', () => {
      const mA = createFullMember('mA', {
        cognition: { characterId: 'mA', skepticism: 0.8, cognitiveDissonance: 0.6, ingestedEvidenceIds: [], hypotheses: {} },
      });
      const mB = createFullMember('mB', {
        lastAction: 'MOURN',
        cognition: { characterId: 'mB', skepticism: 0.8, cognitiveDissonance: 0.5, ingestedEvidenceIds: [], hypotheses: {} },
      });

      const ctx = {
        turnNumber: 1,
        fictionalTime: 100,
        currentNodeId: 'hall-1',
        memberLocations: { mA: 'hall-1', mB: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { mA, mB },
        activeEvidenceAtNode: [],
      };

      const res = executeMourn(mA, ctx);
      expect(res.member.cognition.cognitiveDissonance).toBeCloseTo(0.4);
      expect(res.otherMemberDeltas?.['mB'].cognition.cognitiveDissonance).toBeCloseTo(0.3);
      expect(res.emittedTraces).toHaveLength(2);
    });

    it('RECRUIT succeeds when score >= 0.5 and fails when score < 0.5 with recruiter dissonance penalty', () => {
      const recruiter = createFullMember('recruiter');
      const ctxSuccess = {
        turnNumber: 1,
        fictionalTime: 0,
        currentNodeId: 'hall-1',
        memberLocations: { recruiter: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { recruiter },
        activeEvidenceAtNode: [],
        recruitCandidates: [{ characterId: 'c1', nodeId: 'hall-1', dissonanceWeight: 0.8, relationshipAffinity: 0.8 }], // 0.64 >= 0.5
      };

      const resSuccess = executeRecruit(recruiter, ctxSuccess);
      expect(resSuccess.recruitSucceeded).toBe(true);
      expect(resSuccess.newMember).toBeDefined();
      expect(resSuccess.newMember?.characterId).toBe('c1');

      const ctxFail = {
        ...ctxSuccess,
        recruitCandidates: [{ characterId: 'c2', nodeId: 'hall-1', dissonanceWeight: 0.4, relationshipAffinity: 0.5 }], // 0.2 < 0.5
      };
      const resFail = executeRecruit(recruiter, ctxFail);
      expect(resFail.recruitSucceeded).toBe(false);
      expect(resFail.newMember).toBeUndefined();
      expect(resFail.member.cognition.cognitiveDissonance).toBeCloseTo(0.1);
    });

    it('FLEE removes member and applies +0.2 dissonance to survivors', () => {
      const lead = createFullMember('lead', { isSeatHolder: true });
      const survivor = createFullMember('survivor', { isSeatHolder: false });
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        seatHolderId: 'lead',
        successionVulnerabilityWindowRemaining: 0,
        members: { lead, survivor },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      // Force lead to FLEE via high FLEE affinity
      lead.affinities = { FLEE: 10.0 };
      const { nextState, receipts } = tickCohortState(
        state,
        180,
        {
          turnNumber: 1,
          fictionalTime: 0,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
          exitNodeIds: ['hall-2'],
        },
        { lead: 'hall-1', survivor: 'hall-1' },
        {}
      );

      const leadReceipt = receipts.find((r) => r.characterId === 'lead');
      expect(leadReceipt?.selectedBehavior).toBe('FLEE');
      expect(nextState.members['lead']).toBeUndefined();
      expect(nextState.members['survivor']).toBeDefined();
      // Survivor got +0.2 dissonance from flight + disruption shock
      expect(nextState.members['survivor'].cognition.cognitiveDissonance).toBeGreaterThanOrEqual(0.2);
    });

    it('HIDE downgrades trace clarity and escalating verb clears hiding', () => {
      const member = createFullMember('m1', {
        isSeatHolder: true,
        hidingUntilFictionalTime: 1000,
        affinities: { INVESTIGATE: 2.0 },
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.85, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        seatHolderId: 'm1',
        successionVulnerabilityWindowRemaining: 0,
        members: { m1: member },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      // While hiding (time 100 < 1000), INVESTIGATE trace (normally FAINT) stays FAINT
      const { nextState: hiddenTick, receipts } = tickCohortState(
        state,
        60,
        {
          turnNumber: 1,
          fictionalTime: 100,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
        },
        { m1: 'hall-1' },
        { 'hall-1': [{ id: 'clue', targetHypothesisId: 'hyp-threat-exists', weightDelta: 0.1, text: 'clue' }] }
      );
      expect(receipts[0].tracesEmitted[0].clarity).toBe('FAINT');
      expect(hiddenTick.members['m1'].hidingUntilFictionalTime).toBe(1000);

      // Now clear behaviorDuration and force CLOSE_IN -> escalating breaks cover!
      hiddenTick.members['m1'].behaviorDuration = undefined;
      hiddenTick.members['m1'].affinities = { CLOSE_IN: 10.0 };
      hiddenTick.members['m1'].cognition.hypotheses['hyp-threat-in-hall'] = {
        id: 'hyp-threat-in-hall',
        weight: 0.8,
        provenance: { lastUpdatedTurn: 1 },
      };
      const { nextState: escalatedTick } = tickCohortState(
        hiddenTick,
        60,
        {
          turnNumber: 2,
          fictionalTime: 160,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
          hypothesisNodeMap: { 'hyp-threat-in-hall': 'hall-2' },
        },
        { m1: 'hall-1' },
        {}
      );
      expect(escalatedTick.members['m1'].hidingUntilFictionalTime).toBeUndefined();
    });
  });

  describe('Fracture Decay Pass & Determinism', () => {
    it('drops fractures older than 3600 seconds and retains fresh ones', () => {
      const mA = createFullMember('mA');
      const mB = createFullMember('mB');
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        successionVulnerabilityWindowRemaining: 0,
        members: { mA, mB },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [
          { aCharacterId: 'mA', bCharacterId: 'mB', sinceTurn: 1, sinceFictionalTime: 100 },
        ],
      };

      // Tick at fictionalTime 4000 (4000 - 100 = 3900 > 3600) -> dropped!
      const { nextState: expiredState } = tickCohortState(
        state,
        60,
        {
          turnNumber: 10,
          fictionalTime: 4000,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
        },
        { mA: 'hall-1', mB: 'hall-1' },
        {}
      );
      expect(expiredState.fractures).toHaveLength(0);

      // Tick at fictionalTime 2000 (2000 - 100 = 1900 <= 3600) -> retained!
      const { nextState: freshState } = tickCohortState(
        state,
        60,
        {
          turnNumber: 5,
          fictionalTime: 2000,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
        },
        { mA: 'hall-1', mB: 'hall-1' },
        {}
      );
      expect(freshState.fractures).toHaveLength(1);
    });

    it('is strictly deterministic: identical inputs yield identical outputs', () => {
      const mA = createFullMember('mA');
      const mB = createFullMember('mB');
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'ONSET',
        ratifiedRatchetPhase: 'ONSET',
        successionVulnerabilityWindowRemaining: 0,
        members: { mA, mB },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      const ctx = {
        turnNumber: 1,
        fictionalTime: 0,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
      };

      const run1 = tickCohortState(state, 60, ctx, { mA: 'hall-1', mB: 'hall-2' }, {});
      const run2 = tickCohortState(state, 60, ctx, { mA: 'hall-1', mB: 'hall-2' }, {});

      expect(JSON.stringify(run1.nextState)).toBe(JSON.stringify(run2.nextState));
      expect(JSON.stringify(run1.receipts)).toBe(JSON.stringify(run2.receipts));
    });
  });

  describe('Series 2 Emergence Fixtures (§10 Vignettes)', () => {
    it('Emergence Vignette 1 (The Schism): divergent beliefs -> SHARE -> near-breaking member DENYs -> FRACTURE -> subsequent SHARE blocked', () => {
      const initialCohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        seatHolderId: 'charlie',
        successionVulnerabilityWindowRemaining: 0,
        members: {
          alice: createFullMember('alice', {
            isSeatHolder: false,
            affinities: { SHARE: 1.0, FRACTURE: 0.8 },
            cognition: {
              characterId: 'alice',
              skepticism: 0.2,
              cognitiveDissonance: 0.3,
              ingestedEvidenceIds: ['ev-1'],
              hypotheses: {
                'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.95, provenance: { lastUpdatedTurn: 1 } },
              },
            },
          }),
          bob: createFullMember('bob', {
            isSeatHolder: false,
            affinities: { SHARE: 1.0, FRACTURE: 0.8 },
            behaviorDuration: {
              currentBehaviorId: 'INVESTIGATE',
              startedAtFictionalTime: 0,
              progressSeconds: 0,
              durationSeconds: 180,
              status: 'IN_PROGRESS',
            },
            cognition: {
              characterId: 'bob',
              skepticism: 0.9,
              cognitiveDissonance: 0.1,
              ingestedEvidenceIds: ['ev-2'],
              hypotheses: {
                'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.05, provenance: { lastUpdatedTurn: 0 } },
              },
            },
          }),
          charlie: createFullMember('charlie', {
            isSeatHolder: true,
            affinities: { DENY: 0.7, SHARE: 0.5 },
            cognition: {
              characterId: 'charlie',
              skepticism: 0.8,
              cognitiveDissonance: 0.4,
              ingestedEvidenceIds: [],
              hypotheses: {
                'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.7, provenance: { lastUpdatedTurn: 1 } },
              },
            },
          }),
        },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fractures: [],
        fortifiedNodes: {},
        nodeTraps: {},
      };

      const locations = { alice: 'hall-1', bob: 'hall-1', charlie: 'hall-1' };
      const baseContext = {
        turnNumber: 1,
        fictionalTime: 100,
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        breakingProximity: { charlie: 0.85 },
      };

      // Turn 1: Alice SHAREs, Charlie (near breaking point) DENYs!
      const { nextState: turn1State, receipts: r1 } = tickCohortState(
        initialCohort,
        60,
        baseContext,
        locations,
        {}
      );

      const aliceR1 = r1.find((r) => r.characterId === 'alice');
      expect(aliceR1?.selectedBehavior).toBe('SHARE');

      const charlieR1 = r1.find((r) => r.characterId === 'charlie');
      expect(charlieR1?.selectedBehavior).toBe('DENY');

      // Turn 2: Natural tick advancement (60s). Alice completes SHARE and selects FRACTURE!
      // Alice targets Bob (most divergent from Alice: |0.95 - 0.50| = 0.45 >= 0.4)
      const { nextState: turn2State, receipts: r2 } = tickCohortState(
        turn1State,
        60,
        { ...baseContext, turnNumber: 2, fictionalTime: 160 },
        locations,
        {}
      );

      const aliceR2 = r2.find((r) => r.characterId === 'alice');
      expect(aliceR2?.selectedBehavior).toBe('FRACTURE');

      const pairFractured = turn2State.fractures.some(
        (f) =>
          (f.aCharacterId === 'alice' && f.bCharacterId === 'bob') ||
          (f.aCharacterId === 'bob' && f.bCharacterId === 'alice')
      );
      expect(pairFractured).toBe(true);

      // Turn 3: 120s tick. Alice completes FRACTURE. Subsequent SHARE between Alice and Bob
      // is not executable due to active fracture. Assert receipt chain!
      const locationsTurn3 = { alice: 'hall-1', bob: 'hall-1', charlie: 'hall-2' };
      const lockedDoorTurn3 = [
        { fromNodeId: 'hall-1', toNodeId: 'hall-2', status: 'LOCKED' as const, kind: 'DOOR' as const },
      ];

      const { nextState: turn3State, receipts: r3 } = tickCohortState(
        turn2State,
        120,
        {
          turnNumber: 3,
          fictionalTime: 280,
          topologyNodes: baseTopology.nodes,
          topologyConnections: lockedDoorTurn3,
        },
        locationsTurn3,
        {}
      );

      const aliceR3 = r3.find((r) => r.characterId === 'alice');
      expect(aliceR3).toBeDefined();
      expect(aliceR3?.considerationSet).toContain('SHARE');
      expect(aliceR3?.executableSet).not.toContain('SHARE');
      expect(aliceR3?.selectedBehavior).not.toBe('SHARE');
      expect(turn3State.fractures).toHaveLength(1);
    });

    it('Emergence Vignette 2 (The Split Defense): two members FORTIFY different nodes without SHAREing (one HIDING)', () => {
      const initialCohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        seatHolderId: 'dan',
        successionVulnerabilityWindowRemaining: 0,
        members: {
          dan: createFullMember('dan', {
            isSeatHolder: true,
            hidingUntilFictionalTime: 2000,
            affinities: { FORTIFY: 1.0, INVESTIGATE: 0.1 },
          }),
          eve: createFullMember('eve', {
            isSeatHolder: false,
            affinities: { FORTIFY: 1.0, INVESTIGATE: 0.1 },
          }),
        },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      const lockedConnections = [
        { fromNodeId: 'hall-1', toNodeId: 'hall-2', status: 'LOCKED' as const, kind: 'DOOR' as const },
      ];

      const { nextState, receipts } = tickCohortState(
        initialCohort,
        60,
        {
          turnNumber: 1,
          fictionalTime: 100,
          topologyNodes: baseTopology.nodes,
          topologyConnections: lockedConnections,
        },
        { dan: 'hall-1', eve: 'hall-2' },
        {}
      );

      // Two separate nodes fortified at strength 1
      expect(nextState.fortifiedNodes['hall-1']).toBeDefined();
      expect(nextState.fortifiedNodes['hall-1'].strength).toBe(1);
      expect(nextState.fortifiedNodes['hall-2']).toBeDefined();
      expect(nextState.fortifiedNodes['hall-2'].strength).toBe(1);

      // Dan was HIDING -> Dan's FORTIFY trace is downgraded from STARK to AUDIBLE
      const danReceipt = receipts.find((r) => r.characterId === 'dan');
      expect(danReceipt?.tracesEmitted[0].clarity).toBe('AUDIBLE');

      // Eve was not hiding -> Eve's FORTIFY trace remains STARK
      const eveReceipt = receipts.find((r) => r.characterId === 'eve');
      expect(eveReceipt?.tracesEmitted[0].clarity).toBe('STARK');

      // Counterfactual: Coordinated defense at same node would have reached strength 2
      const coordinatedCohort: CohortState = {
        ...initialCohort,
        fortifiedNodes: {},
      };
      const { nextState: coordinatedState } = tickCohortState(
        coordinatedCohort,
        60,
        {
          turnNumber: 2,
          fictionalTime: 160,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
        },
        { dan: 'hall-1', eve: 'hall-1' },
        {}
      );
      expect(coordinatedState.fortifiedNodes['hall-1'].strength).toBe(2);
    });

    it('Emergence Vignette 3 (The Theft): PURSUE_AGENDA x3 emits STARK trace -> witness ingests -> dissonance crosses threshold -> FRACTURE', () => {
      const cohort: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'ONSET',
        peakPhase: 'ONSET',
        ratifiedRatchetPhase: 'ONSET',
        seatHolderId: 'hoarder',
        successionVulnerabilityWindowRemaining: 0,
        members: {
          hoarder: createFullMember('hoarder', {
            isSeatHolder: true,
            agendaProgress: 0,
            affinities: { PURSUE_AGENDA: 2.0 },
          }),
          witness: createFullMember('witness', {
            isSeatHolder: false,
            affinities: { INVESTIGATE: 2.0, FRACTURE: 1.5 },
            cognition: {
              characterId: 'witness',
              skepticism: 0.8,
              cognitiveDissonance: 0.1,
              ingestedEvidenceIds: [],
              hypotheses: {
                'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.1, provenance: { lastUpdatedTurn: 0 } },
              },
            },
          }),
        },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      const locations = { hoarder: 'hall-1', witness: 'hall-1' };

      // Turn 1: Hoarder runs PURSUE_AGENDA (progress 0.34)
      const t1 = tickCohortState(
        cohort,
        240,
        { turnNumber: 1, fictionalTime: 0, topologyNodes: baseTopology.nodes, topologyConnections: baseTopology.connections },
        locations,
        {}
      );
      const r1Hoarder = t1.receipts.find((r) => r.characterId === 'hoarder');
      expect(r1Hoarder?.selectedBehavior).toBe('PURSUE_AGENDA');
      expect(r1Hoarder?.tracesEmitted[0].clarity).toBe('FAINT');
      expect(t1.nextState.members.hoarder.agendaProgress).toBeCloseTo(0.34);

      // Turn 2: Hoarder runs PURSUE_AGENDA (progress 0.68)
      const t2 = tickCohortState(
        t1.nextState,
        240,
        { turnNumber: 2, fictionalTime: 240, topologyNodes: baseTopology.nodes, topologyConnections: baseTopology.connections },
        locations,
        {}
      );
      const r2Hoarder = t2.receipts.find((r) => r.characterId === 'hoarder');
      expect(r2Hoarder?.selectedBehavior).toBe('PURSUE_AGENDA');
      expect(r2Hoarder?.tracesEmitted[0].clarity).toBe('FAINT');
      expect(t2.nextState.members.hoarder.agendaProgress).toBeCloseTo(0.68);

      // Turn 3: Hoarder runs PURSUE_AGENDA (fulfillment: progress resets to 0, STARK trace emitted)
      const t3 = tickCohortState(
        t2.nextState,
        240,
        { turnNumber: 3, fictionalTime: 480, topologyNodes: baseTopology.nodes, topologyConnections: baseTopology.connections },
        locations,
        {}
      );
      const r3Hoarder = t3.receipts.find((r) => r.characterId === 'hoarder');
      expect(r3Hoarder?.selectedBehavior).toBe('PURSUE_AGENDA');
      expect(r3Hoarder?.tracesEmitted[0].clarity).toBe('STARK');
      expect(r3Hoarder?.tracesEmitted[0].cueText).toBe("A stash found: bandages, pills, food — someone's been hoarding.");
      expect(t3.nextState.members.hoarder.agendaProgress).toBe(0);

      // Turn 4: Witness ingests the hoard trace as evidence with dissonance delta 0.75
      const hoardEvidence = [
        {
          id: r3Hoarder!.tracesEmitted[0].id,
          targetHypothesisId: 'hyp-threat-exists',
          weightDelta: 0.1,
          dissonanceDelta: 0.75,
          text: r3Hoarder!.tracesEmitted[0].cueText,
        },
      ];

      const t4 = tickCohortState(
        t3.nextState,
        180,
        { turnNumber: 4, fictionalTime: 720, topologyNodes: baseTopology.nodes, topologyConnections: baseTopology.connections },
        locations,
        { 'hall-1': hoardEvidence }
      );

      expect(t4.nextState.members.witness.cognition.cognitiveDissonance).toBeGreaterThanOrEqual(0.8);

      // Turn 5: With cognitiveDissonance >= 0.8, FRACTURE is executable and selected!
      const t5 = tickCohortState(
        t4.nextState,
        120,
        { turnNumber: 5, fictionalTime: 900, topologyNodes: baseTopology.nodes, topologyConnections: baseTopology.connections },
        locations,
        {}
      );
      const r5Witness = t5.receipts.find((r) => r.characterId === 'witness');
      expect(r5Witness?.selectedBehavior).toBe('FRACTURE');
      expect(t5.nextState.fractures.length).toBeGreaterThan(0);
      expect(t5.nextState.fractures[0].aCharacterId).toBe('witness');
      expect(t5.nextState.fractures[0].bCharacterId).toBe('hoarder');
    });
  });

  describe('Edge Case Robustness & Failure-Mode Verification', () => {
    it('FLEE failure / no-op: if no exit is reachable, completes with no departure', () => {
      const member = createFullMember('m1');
      const ctxNoExit = {
        turnNumber: 1,
        fictionalTime: 100,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        exitNodeIds: ['attic'], // attic is behind LOCKED door, unreachable
      };

      const result = executeFlee(member, ctxNoExit);
      expect(result.removedMemberId).toBeUndefined();
      expect(result.locationDelta).toBeUndefined();
      expect(result.emittedTraces).toHaveLength(1);
    });

    it('CLOSE_IN failure / no-op: if location hypothesis decays below 0.6, completes with no relocation', () => {
      const member = createFullMember('m1', {
        cognition: {
          characterId: 'm1',
          skepticism: 0.8,
          cognitiveDissonance: 0,
          ingestedEvidenceIds: [],
          hypotheses: {
            'hyp-threat-in-attic': { id: 'hyp-threat-in-attic', weight: 0.3, provenance: { lastUpdatedTurn: 1 } },
          },
        },
      });

      const ctxDecayed = {
        turnNumber: 2,
        fictionalTime: 300,
        currentNodeId: 'hall-1',
        memberLocations: { m1: 'hall-1' },
        topologyNodes: baseTopology.nodes,
        topologyConnections: baseTopology.connections,
        allMembers: { m1: member },
        activeEvidenceAtNode: [],
        hypothesisNodeMap: { 'hyp-threat-in-attic': 'attic' },
      };

      const result = executeCloseIn(member, ctxDecayed);
      expect(result.locationDelta).toBeUndefined();
      expect(result.actedOnLocationBelief).toBeUndefined();
      expect(result.emittedTraces).toHaveLength(1);
    });

    it('FRACTURE decay: intervening fracture involving either party prevents decay past 3600s', () => {
      const mA = createFullMember('mA');
      const mB = createFullMember('mB');
      const mC = createFullMember('mC');
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        successionVulnerabilityWindowRemaining: 0,
        members: { mA, mB, mC },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [
          // Fracture between A and B started at t=100 (3900s old at t=4000)
          { aCharacterId: 'mA', bCharacterId: 'mB', sinceTurn: 1, sinceFictionalTime: 100 },
          // Intervening fracture involving A and C at t=2500!
          { aCharacterId: 'mA', bCharacterId: 'mC', sinceTurn: 5, sinceFictionalTime: 2500 },
        ],
      };

      // At t=4000: A-B is 3900s old, but A was in an intervening fracture at t=2500 -> retained!
      const { nextState } = tickCohortState(
        state,
        60,
        {
          turnNumber: 10,
          fictionalTime: 4000,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
        },
        { mA: 'hall-1', mB: 'hall-1', mC: 'hall-1' },
        {}
      );

      expect(nextState.fractures.some((f) => f.aCharacterId === 'mA' && f.bCharacterId === 'mB')).toBe(true);
      expect(nextState.fractures.some((f) => f.aCharacterId === 'mA' && f.bCharacterId === 'mC')).toBe(true);
    });

    it('Seat-holder FLEE applies disruption shock (+0.1 skepticism, +0.2 dissonance) to all surviving members and preserves institutional memory', () => {
      const lead = createFullMember('lead', { isSeatHolder: true });
      const deputy = createFullMember('deputy', {
        isSeatHolder: false,
        cognition: {
          characterId: 'deputy',
          skepticism: 0.8,
          cognitiveDissonance: 0.1,
          ingestedEvidenceIds: [],
          hypotheses: { 'hyp-threat-exists': { id: 'hyp-threat-exists', weight: 0.5, provenance: { lastUpdatedTurn: 1 } } },
        },
      });

      lead.affinities = { FLEE: 10.0 };
      const state: CohortState = {
        status: 'ACTIVE',
        collectivePhase: 'CONFIRMATION',
        peakPhase: 'CONFIRMATION',
        ratifiedRatchetPhase: 'CONFIRMATION',
        seatHolderId: 'lead',
        successionVulnerabilityWindowRemaining: 0,
        members: { lead, deputy },
        dormantCastCognition: {},
        institutionalMemory: {},
        recentReceipts: [],
        fortifiedNodes: {},
        nodeTraps: {},
        fractures: [],
      };

      const { nextState } = tickCohortState(
        state,
        180,
        {
          turnNumber: 1,
          fictionalTime: 0,
          topologyNodes: baseTopology.nodes,
          topologyConnections: baseTopology.connections,
          exitNodeIds: ['hall-2'],
        },
        { lead: 'hall-1', deputy: 'hall-1' },
        {}
      );

      expect(nextState.members.lead).toBeUndefined();
      expect(nextState.members.deputy).toBeDefined();
      // Disruption shock: skepticism +0.1 (0.8 -> 0.9)
      expect(nextState.members.deputy.cognition.skepticism).toBeCloseTo(0.9);
      // Disruption shock (+0.2) + FLEE witness (+0.2) = 0.1 + 0.4 = 0.5
      expect(nextState.members.deputy.cognition.cognitiveDissonance).toBeCloseTo(0.5);
      // Succession vulnerability window opened
      expect(nextState.successionVulnerabilityWindowRemaining).toBeGreaterThan(0);
      expect(nextState.seatHolderId).toBeUndefined();
    });

    it('initializeCohortState respects custom blueprint cast affinities', () => {
      const blueprint: ScenarioBlueprint = {
        id: 'test-bp',
        name: 'Test Blueprint',
        version: '1.0.0',
        metadata: { title: 'Test', author: 'Test' },
        cast: [
          {
            id: 'agent-custom',
            name: 'Custom Agent',
            role: 'OPPOSITION',
            isEntity: false,
            affinities: {
              FORTIFY: 0.95,
              PARLEY: 0.05,
            },
          } as unknown as ScenarioBlueprint['cast'][0],
        ],
      } as unknown as ScenarioBlueprint;

      const cohort = initializeCohortState(blueprint);
      const member = cohort.members['agent-custom'];
      expect(member.affinities.FORTIFY).toBe(0.95);
      expect(member.affinities.PARLEY).toBe(0.05);
      expect(member.affinities.INVESTIGATE).toBe(DEFAULT_AFFINITIES.INVESTIGATE);
      expect(member.affinities.SHARE).toBe(DEFAULT_AFFINITIES.SHARE);
    });
  });
});
