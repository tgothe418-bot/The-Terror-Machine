import { describe, expect, it } from 'vitest';
import {
  selectCastActivityEligibility,
  advancePursuitScheduleLedger,
  MAX_OFFSCREEN_PURSUITS_PER_TURN,
} from './castActivityEligibility';
import { normalizeBlueprint } from './normalizeBlueprint';
import type { Blueprint } from '../types';
import type { FictionalTimeLedger, PursuitScheduleLedger } from '../types/horrorGrammar';

describe('Cast Activity Eligibility & Scheduling (Packet 1-2)', () => {
  const createMockBlueprint = (): Blueprint =>
    normalizeBlueprint({
      id: 'bp-facility-1',
      identity: {
        title: 'Facility Omega',
        version: '1.0',
        author: 'Test Architect',
        thematicAnchor: 'Containment Failure',
      },
    title: 'Facility Omega',
    premise: 'An underground containment facility.',
    globalPremise: 'An underground containment facility.',
    setting: {
      location: 'Sub-Level 3',
      atmosphere: 'Sterile fluorescent dread',
      timePeriod: '1999',
    },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    cast: [
      {
        id: 'char-user',
        name: 'Officer Ray',
        description: 'Security officer on duty',
        role: 'Protagonist',
        personality: 'Alert and disciplined',
        goals: 'Maintain station security',
        traits: ['Vigilant', 'Calm'],
        isUserCharacter: true,
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: 'NODE_CONTROL',
      },
      {
        id: 'char-tech',
        name: 'Technician Mercer',
        description: 'Maintenance tech',
        role: 'Engineer',
        personality: 'Nervous but skilled',
        goals: 'Keep power stable',
        traits: ['Technical', 'Anxious'],
        isUserCharacter: false,
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: 'NODE_CONTROL', // Present at current node
      },
      {
        id: 'char-doc',
        name: 'Dr. Aris',
        description: 'Lead researcher',
        role: 'Scientist',
        personality: 'Obsessive and brilliant',
        goals: 'Complete tissue synthesis',
        traits: ['Clinical', 'Fixated'],
        isUserCharacter: false,
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: 'NODE_LAB', // Offscreen
      },
      {
        id: 'char-guard',
        name: 'Guard Petrov',
        description: 'Perimeter guard',
        role: 'Security',
        personality: 'Stoic and cautious',
        goals: 'Hold the gate line',
        traits: ['Stalwart', 'Quiet'],
        isUserCharacter: false,
        behaviorVector: 'SOMATIC',
        isEntity: false,
        starting_location: 'NODE_GATE', // Offscreen
      },
      {
        id: 'char-dormant',
        name: 'Subject Zero',
        description: 'Cryogenic specimen',
        role: 'Specimen',
        personality: 'Dormant entity',
        goals: 'Unknown',
        traits: ['Alien', 'Frozen'],
        isUserCharacter: false,
        behaviorVector: 'COSMIC',
        isEntity: true,
        starting_location: 'NODE_CRYO', // Offscreen
      },
    ],
    topology: {
      nodes: ['NODE_CONTROL', 'NODE_LAB', 'NODE_GATE', 'NODE_CRYO'],
      connections: [],
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED',
      pursuitReviews: {
        'char-tech': 'REVIEWED',
        'char-doc': 'REVIEWED',
        'char-guard': 'REVIEWED',
        'char-dormant': 'REVIEWED',
      },
      valueAnchors: [
        {
          id: 'val-reactor',
          holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
          label: 'Reactor Core',
          description: 'Reactor must maintain sub-critical state',
          basisSummary: 'Facility design',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'val-sample',
          holder: { kind: 'CHARACTER', castMemberId: 'char-doc' },
          label: 'Dr. Aris Research Specimen',
          description: 'The specimen tissue sample in bio-containment',
          basisSummary: 'Personal obsession',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
      characterPursuits: [
        {
          id: 'pursuit-tech',
          castMemberId: 'char-tech',
          objective: 'Monitor console readings',
          presentApproach: 'Checking voltage spikes',
          locationNodeId: 'NODE_CONTROL',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT',
          triggerReferences: [],
          basisSummary: 'Standard duty',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-doc',
          castMemberId: 'char-doc',
          objective: 'Analyze viral strain sequencing',
          presentApproach: 'Operating centrifugal analyzer in Bio-Lab',
          locationNodeId: 'NODE_LAB',
          status: 'ACTIVE',
          reviewWindow: 'SCENE_BEAT',
          triggerReferences: [],
          basisSummary: 'Lab assignment',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-guard',
          castMemberId: 'char-guard',
          objective: 'Secure perimeter bulkhead',
          presentApproach: 'Patrolling gate entrance with rifle ready',
          locationNodeId: 'NODE_GATE',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT',
          triggerReferences: [],
          basisSummary: 'Standing orders',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        {
          id: 'pursuit-dormant',
          castMemberId: 'char-dormant',
          objective: 'Remain in stasis',
          presentApproach: 'Deep cryogenic slumber',
          locationNodeId: 'NODE_CRYO',
          status: 'DORMANT',
          reviewWindow: 'EXTENDED',
          triggerReferences: [],
          basisSummary: 'Containment protocol',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    },
  }) as Blueprint;

  it('selects all present non-User characters on every turn', () => {
    const bp = createMockBlueprint();
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 0,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: null,
    };

    const receipt = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
    });

    expect(receipt.presentOpportunities).toHaveLength(1);
    expect(receipt.presentOpportunities[0].castMemberId).toBe('char-tech');
    expect(receipt.presentOpportunities[0].opportunityKind).toBe('PRESENT');
  });

  it('never selects the User-controlled character', () => {
    const bp = createMockBlueprint();
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 5,
      scene_beat_revision: 3,
      extended_revision: 2,
      last_cost: 'EXTENDED',
    };

    const receipt = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
    });

    const userSelected = [...receipt.presentOpportunities, ...receipt.offscreenOpportunities].some(
      (o) => o.castMemberId === 'char-user'
    );
    expect(userSelected).toBe(false);
  });

  it('evaluates offscreen review windows accurately', () => {
    const bp = createMockBlueprint();
    // In this state: moment has advanced (1 > 0), scene_beat has not advanced (0 == 0)
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 1,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: 'MOMENT',
    };

    const receipt = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
    });

    // Guard (MOMENT window) is due and selected
    expect(receipt.offscreenOpportunities.some((o) => o.castMemberId === 'char-guard')).toBe(true);

    // Doc (SCENE_BEAT window) is NOT due because scene_beat_revision is 0
    expect(receipt.offscreenOpportunities.some((o) => o.castMemberId === 'char-doc')).toBe(false);
    expect(receipt.notDueCount).toBe(1); // Doc not due
    expect(receipt.dormantCount).toBe(1); // Subject Zero dormant
  });

  it('enforces MAX_OFFSCREEN_PURSUITS_PER_TURN cap and records boundedOutPursuitIds', () => {
    const bp = createMockBlueprint();
    // Add a third active offscreen character with MOMENT window
    bp.cast.push({
      id: 'char-medic',
      name: 'Medic Cole',
      description: 'Field paramedic',
      role: 'Medic',
      personality: 'Pragmatic',
      goals: 'Stabilize casualties',
      traits: ['Medical', 'Quick'],
      isUserCharacter: false,
      behaviorVector: 'SOMATIC',
      isEntity: false,
      starting_location: 'NODE_MEDBAY',
    });
    bp.horrorGrammar!.characterPursuits.push({
      id: 'pursuit-medic',
      castMemberId: 'char-medic',
      objective: 'Prep trauma supplies',
      presentApproach: 'Arranging surgical tools',
      locationNodeId: 'NODE_MEDBAY',
      status: 'ACTIVE',
      reviewWindow: 'MOMENT',
      triggerReferences: [],
      basisSummary: 'Clinic orders',
      provenance: { kind: 'CREATOR_DEFINED' },
    });

    // Both moment and scene_beat advanced
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 2,
      scene_beat_revision: 2,
      extended_revision: 0,
      last_cost: 'SCENE_BEAT',
    };

    const receipt = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
    });

    // Exactly MAX_OFFSCREEN_PURSUITS_PER_TURN (2) selected
    expect(receipt.offscreenOpportunities).toHaveLength(MAX_OFFSCREEN_PURSUITS_PER_TURN);
    expect(receipt.boundedOutPursuitIds.length).toBeGreaterThanOrEqual(1);
  });

  it('fairness: prioritizes oldest last-considered turn for offscreen candidates', () => {
    const bp = createMockBlueprint();
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 3,
      scene_beat_revision: 3,
      extended_revision: 0,
      last_cost: 'SCENE_BEAT',
    };

    // Guard was considered on turn 2, Doc was never considered (null)
    const schedule: PursuitScheduleLedger = {
      'pursuit-guard': {
        pursuitId: 'pursuit-guard',
        castMemberId: 'char-guard',
        lastConsideredMomentRevision: 1,
        lastConsideredSceneBeatRevision: 1,
        lastConsideredExtendedRevision: 0,
        lastConsideredTurn: 2,
        latestDisposition: 'OFFSCREEN_SELECTED',
      },
      'pursuit-doc': {
        pursuitId: 'pursuit-doc',
        castMemberId: 'char-doc',
        lastConsideredMomentRevision: 0,
        lastConsideredSceneBeatRevision: 0,
        lastConsideredExtendedRevision: 0,
        lastConsideredTurn: null, // Never considered
        latestDisposition: 'OFFSCREEN_NOT_DUE',
      },
    };

    const receipt = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      pursuitSchedule: schedule,
      userCharacterId: 'char-user',
      turnNumber: 3,
    });

    // Doc (null turn) is ordered before Guard (turn 2)
    expect(receipt.offscreenOpportunities[0].castMemberId).toBe('char-doc');
  });

  it('activates EVENT_DRIVEN pursuits only on exact accepted trigger references', () => {
    const bp = createMockBlueprint();
    bp.horrorGrammar!.characterPursuits.push({
      id: 'pursuit-contingency',
      castMemberId: 'char-guard',
      objective: 'Emergency Lockdown',
      presentApproach: 'Initiating magnetic seal',
      locationNodeId: 'NODE_GATE',
      status: 'ACTIVE',
      reviewWindow: 'EVENT_DRIVEN',
      triggerReferences: ['SEAL_BREACH', 'FIRE_ALARM'],
      basisSummary: 'Containment protocol',
      provenance: { kind: 'CREATOR_DEFINED' },
    });

    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 0,
      scene_beat_revision: 0,
      extended_revision: 0,
      last_cost: null,
    };

    // Without trigger
    const withoutTrig = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
      acceptedTriggerReferences: ['RANDOM_EVENT'],
    });
    expect(withoutTrig.offscreenOpportunities.some((o) => o.pursuitId === 'pursuit-contingency')).toBe(false);

    // With exact trigger
    const withTrig = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
      acceptedTriggerReferences: ['SEAL_BREACH'],
    });
    expect(withTrig.offscreenOpportunities.some((o) => o.pursuitId === 'pursuit-contingency')).toBe(true);
  });

  it('advancePursuitScheduleLedger purely advances considered stamps for selected opportunities', () => {
    const bp = createMockBlueprint();
    const fictionalTime: FictionalTimeLedger = {
      moment_revision: 3,
      scene_beat_revision: 2,
      extended_revision: 1,
      last_cost: 'EXTENDED',
    };

    const eligibility = selectCastActivityEligibility({
      blueprint: bp,
      currentTopologyNode: 'NODE_CONTROL',
      fictionalTime,
      userCharacterId: 'char-user',
      turnNumber: 1,
    });

    const nextSchedule = advancePursuitScheduleLedger({
      preSchedule: {},
      eligibilityReceipt: eligibility,
      fictionalTime,
      turnNumber: 1,
      blueprint: bp,
    });

    expect(nextSchedule['pursuit-tech'].latestDisposition).toBe('PRESENT_OPPORTUNITY');
    expect(nextSchedule['pursuit-tech'].lastConsideredTurn).toBe(1);
    expect(nextSchedule['pursuit-tech'].lastConsideredMomentRevision).toBe(3);

    expect(nextSchedule['pursuit-guard'].latestDisposition).toBe('OFFSCREEN_SELECTED');
    expect(nextSchedule['pursuit-guard'].lastConsideredTurn).toBe(1);

    expect(nextSchedule['pursuit-dormant'].latestDisposition).toBe('DORMANT');
  });

  describe('Packet 04: Canonical Cast Presence Enforcement in Opportunity Selection', () => {
    it('ensures OFFSTAGE, NONLOCAL, and invalid AT_NODE actors receive NO false PRESENT opportunity', () => {
      const bp = createMockBlueprint();
      bp.cast.push(
        {
          id: 'char-offstage',
          name: 'Offstage Lurker',
          description: 'Lurking in background',
          role: 'Infiltrator',
          personality: 'Quiet',
          goals: 'Observe',
          traits: ['Stealthy'],
          isUserCharacter: false,
          behaviorVector: 'COGNITIVE',
          isEntity: false,
          starting_location: '',
          presenceDisposition: { kind: 'OFFSTAGE' },
        },
        {
          id: 'char-nonlocal',
          name: 'Nonlocal Anomaly',
          description: 'Everywhere and nowhere',
          role: 'Entity',
          personality: 'Unknowable',
          goals: 'Permeate',
          traits: ['Diffuse'],
          isUserCharacter: false,
          behaviorVector: 'COSMIC',
          isEntity: true,
          starting_location: '',
          presenceDisposition: { kind: 'NONLOCAL' },
        },
        {
          id: 'char-invalid-node',
          name: 'Wanderer',
          description: 'Lost traveler',
          role: 'Drifter',
          personality: 'Confused',
          goals: 'Escape',
          traits: ['Lost'],
          isUserCharacter: false,
          behaviorVector: 'SOMATIC',
          isEntity: false,
          starting_location: '',
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'NON_EXISTENT_CHAMBER' },
        }
      );

      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: null,
      };

      const receipt = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 1,
      });

      const presentIds = receipt.presentOpportunities.map((o) => o.castMemberId);
      expect(presentIds).not.toContain('char-offstage');
      expect(presentIds).not.toContain('char-nonlocal');
      expect(presentIds).not.toContain('char-invalid-node');
    });

    it('preserves legacy placement fallback to currentNodeId when cast member actually lacks explicit placement data', () => {
      const bp = createMockBlueprint();
      bp.cast.push({
        id: 'char-legacy-unplaced',
        name: 'Unplaced Assistant',
        description: 'Station assistant',
        role: 'Assistant',
        personality: 'Helpful',
        goals: 'Assist crew',
        traits: ['Loyal'],
        isUserCharacter: false,
        behaviorVector: 'COGNITIVE',
        isEntity: false,
        starting_location: '',
      });

      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: null,
      };

      const receipt = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 1,
      });

      const presentIds = receipt.presentOpportunities.map((o) => o.castMemberId);
      expect(presentIds).toContain('char-legacy-unplaced');
    });

    it('respects authoritative castPresenceMap even if member was authored as present in blueprint', () => {
      const bp = createMockBlueprint();
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: null,
      };

      const receipt = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 1,
        castPresenceMap: {
          'char-tech': 'NODE_LAB', // moved away
        },
      });

      const presentIds = receipt.presentOpportunities.map((o) => o.castMemberId);
      expect(presentIds).not.toContain('char-tech');
    });

    it('projects runtime currentObjective and currentApproach for offscreen opportunities from characterPursuitLedger', () => {
      const bp = createMockBlueprint();
      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT',
      };

      const receipt = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 2,
        characterPursuitLedger: {
          'pursuit-guard': {
            pursuitId: 'pursuit-guard',
            castMemberId: 'char-guard',
            status: 'ACTIVE',
            currentObjective: 'Barricade the secondary gate',
            currentApproach: 'Stacking heavy steel supply containers',
            currentLocationNodeId: 'NODE_LAB',
            reviewWindow: 'MOMENT',
            progressSummary: 'Reinforcing gate',
            lastCauseReference: 'BASELINE',
            lastActivityTurn: null,
            lastChangedTurn: 1,
          },
        },
      });

      const guardOpp = receipt.offscreenOpportunities.find(
        (o) => o.pursuitId === 'pursuit-guard'
      );
      expect(guardOpp).toBeDefined();
      expect(guardOpp?.objective).toBe('Barricade the secondary gate');
      expect(guardOpp?.presentApproach).toBe('Stacking heavy steel supply containers');
      expect(guardOpp?.locationNodeId).toBe('NODE_LAB');
    });

    it('evaluates EVENT_DRIVEN pursuit review window against activityEvents committedTurn > lastConsideredTurn', () => {
      const bp = createMockBlueprint();
      // Add an EVENT_DRIVEN pursuit to bp
      bp.horrorGrammar!.characterPursuits.push({
        id: 'pursuit-doc-emergency',
        castMemberId: 'char-doc',
        objective: 'Respond to medical emergency',
        presentApproach: 'Rush with field defibrillator',
        locationNodeId: 'NODE_LAB',
        status: 'ACTIVE',
        reviewWindow: 'EVENT_DRIVEN',
        triggerReferences: ['evt-medical-crisis'],
        basisSummary: 'Emergency protocol',
        provenance: { kind: 'CREATOR_DEFINED' },
      });

      const fictionalTime: FictionalTimeLedger = {
        moment_revision: 0,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: null,
      };

      // 1. When event committed at turn 2 and pursuit never considered (lastConsidered: null) -> due
      const receipt1 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        userCharacterId: 'char-user',
        turnNumber: 3,
        activityEvents: [
          {
            id: 'evt-medical-crisis',
            castMemberId: 'char-doc',
            pursuitId: 'pursuit-doc-emergency',
            activitySummary: 'Medical crisis triggered.',
            locationNodeId: 'NODE_LAB',
            perceptionPath: 'UNOBSERVED',
            committedTurn: 2,
            authorityReferences: [],
            wasManifested: false,
          },
        ],
      });

      expect(
        receipt1.offscreenOpportunities.map((o) => o.pursuitId)
      ).toContain('pursuit-doc-emergency');

      // 2. When pursuit was considered on turn 3 and no new event occurred -> consumed / not due
      const receipt2 = selectCastActivityEligibility({
        blueprint: bp,
        currentTopologyNode: 'NODE_CONTROL',
        fictionalTime,
        pursuitSchedule: {
          'pursuit-doc-emergency': {
            pursuitId: 'pursuit-doc-emergency',
            castMemberId: 'char-doc',
            lastConsideredMomentRevision: 0,
            lastConsideredSceneBeatRevision: 0,
            lastConsideredExtendedRevision: 0,
            lastConsideredTurn: 3,
            latestDisposition: 'OFFSCREEN_SELECTED',
          },
        },
        userCharacterId: 'char-user',
        turnNumber: 4,
        activityEvents: [
          {
            id: 'evt-medical-crisis',
            castMemberId: 'char-doc',
            pursuitId: 'pursuit-doc-emergency',
            activitySummary: 'Medical crisis triggered.',
            locationNodeId: 'NODE_LAB',
            perceptionPath: 'UNOBSERVED',
            committedTurn: 2, // 2 <= 3 -> not due
            authorityReferences: [],
            wasManifested: false,
          },
        ],
      });

      expect(
        receipt2.offscreenOpportunities.map((o) => o.pursuitId)
      ).not.toContain('pursuit-doc-emergency');
    });
  });
});
