import { describe, expect, it } from 'vitest';
import { resolveCastActivity } from './castActivity';
import type { EngineTurnContext } from '../types';
import type {
  CastActivityProposal,
  CastActivityEligibilityReceipt,
  CastActivityEvent,
} from '../types/horrorGrammar';

describe('Cast Activity Ratifier (Packet 1-3)', () => {
  const createMockContext = (): EngineTurnContext => ({
    version: 1,
    scenario: {
      id: 'bp-1',
      title: 'Facility Omega',
      premise: 'Underground labs',
      worldRules: ['Air is thin.'],
      setting: {
        location: 'Level 2',
        atmosphere: 'Cold',
        timePeriod: '1999',
      },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      incitingIncident: '',
      pacingDirective: '',
      keyPlotElements: [],
    },
    player: {
      role: 'protagonist',
      characterId: 'char-user',
      name: 'Officer Ray',
      description: 'Security officer',
      isEntity: false,
    },
    cast: [
      {
        id: 'char-user',
        name: 'Officer Ray',
        role: 'Protagonist',
        description: 'Security officer',
        personality: 'Determined',
        goals: 'Survive',
        traits: ['Alert'],
        isEntity: false,
        isUserCharacter: true,
        skepticism: 0.5,
        isPresent: true,
        stance: null,
        memory: [],
      },
      {
        id: 'char-tech',
        name: 'Technician Mercer',
        role: 'Engineer',
        description: 'Facility tech',
        personality: 'Calm',
        goals: 'Maintain systems',
        traits: ['Methodical'],
        isEntity: false,
        isUserCharacter: false,
        skepticism: 0.5,
        isPresent: true,
        stance: null,
        memory: [],
        expressionProfile: {
          communicationModes: ['spoken', 'mediated'],
          expressionGuidance: 'Speaks calmly',
        },
      },
      {
        id: 'char-guard',
        name: 'Guard Petrov',
        role: 'Security',
        description: 'Facility guard',
        personality: 'Gruff',
        goals: 'Guard perimeter',
        traits: ['Vigilant'],
        isEntity: false,
        isUserCharacter: false,
        skepticism: 0.5,
        isPresent: false,
        stance: null,
        memory: [],
        expressionProfile: {
          communicationModes: ['spoken'],
          expressionGuidance: 'Gruff',
        },
      },
    ],
    topology: {
      currentNodeId: 'NODE_CONTROL',
      readableNodeLabel: 'Control Room',
      allowedOutgoingExits: [],
    },
    runtime: {
      phase: 'LATENT',
      tension: 10,
      coherence: 1.0,
      reconciliationRevision: 0,
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
      activeFlags: [],
      turnNumber: 2,
    },
    consequenceState: {
      inventory: [],
      player_injuries: [],
      psychological_status: 'STABLE',
    },
    relationshipState: [],
    memoryState: {},
    worldMemory: [],
  });

  const createMockEligibility = (): CastActivityEligibilityReceipt => ({
    version: 1,
    presentOpportunities: [
      {
        castMemberId: 'char-tech',
        opportunityKind: 'PRESENT',
        locationNodeId: 'NODE_CONTROL',
        pursuitId: 'pursuit-tech',
        objective: 'Monitor console readings',
        presentApproach: 'Checking voltage spikes',
        reviewWindow: 'MOMENT',
        referencedValueIds: ['val-1'],
      },
    ],
    offscreenOpportunities: [
      {
        castMemberId: 'char-guard',
        opportunityKind: 'OFFSCREEN_PURSUIT',
        locationNodeId: 'NODE_GATE',
        pursuitId: 'pursuit-guard',
        objective: 'Secure gate bulkhead',
        presentApproach: 'Patrolling gate perimeter',
        reviewWindow: 'MOMENT',
        referencedValueIds: [],
      },
    ],
    boundedOutPursuitIds: [],
    dormantCount: 0,
    notDueCount: 0,
    ledgerSnapshot: {
      moment_revision: 2,
      scene_beat_revision: 1,
      extended_revision: 0,
      last_cost: 'MOMENT',
    },
    scheduleSnapshotRevision: 2,
  });

  it('accepts NONE proposal cleanly with stable reason code', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'NONE',
      reason: 'QUIET_TURN',
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('NO_PROPOSAL');
    expect(receipt.reasonCode).toBe('QUIET_TURN');
    expect(receipt.admittedManifestation).toBe(false);
    expect(receipt.postState).toEqual([]);
  });

  it('rejects proposal when actor is the User character', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-user-act',
      castMemberId: 'char-user',
      activitySummary: 'User looks around frantically',
      perceptionPath: 'DIRECT',
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('USER_CHARACTER_CANNOT_BE_ACTIVITY_ACTOR');
    expect(receipt.admittedManifestation).toBe(false);
  });

  it('rejects proposal when actor was not in pre-turn eligibility set', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-random',
      castMemberId: 'char-unknown',
      activitySummary: 'Unknown actor moves',
      perceptionPath: 'DIRECT',
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('ACTOR_NOT_IN_AUTHORIZED_CAST');
  });

  it('rejects offscreen actor when proposal pursuitId does not match eligibility receipt', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-guard-mismatch',
      castMemberId: 'char-guard',
      pursuitId: 'wrong-pursuit-id',
      activitySummary: 'Guard stands watch',
      perceptionPath: 'UNOBSERVED',
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('MISMATCHED_PURSUIT_ID');
  });

  it('rejects DIRECT perception path for an offscreen actor', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-guard-direct',
      castMemberId: 'char-guard',
      pursuitId: 'pursuit-guard',
      locationNodeId: 'NODE_GATE',
      activitySummary: 'Guard reaches out directly',
      perceptionPath: 'DIRECT', // Guard is at NODE_GATE, player at NODE_CONTROL
      manifestationBlock: {
        type: 'prose',
        content: 'Guard stands beside you.',
      },
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('DIRECT_PERCEPTION_REQUIRES_CO_PRESENCE');
    expect(receipt.admittedManifestation).toBe(false);
  });

  it('ratifies valid present actor activity with manifestation block and commits activity event', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-tech-ok',
      castMemberId: 'char-tech',
      locationNodeId: 'NODE_CONTROL',
      activitySummary: 'Mercer taps the auxiliary voltage dial with a metallic click.',
      authorityReferences: ['CONSOLE_MANUAL'],
      perceptionPath: 'DIRECT',
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'Technician Mercer',
        content: 'Voltage is dropping on sub-relay four.',
      },
    };

    const preEvents: CastActivityEvent[] = [];

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents,
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('ACCEPTED');
    expect(receipt.reasonCode).toBe('ACTIVITY_RATIFIED');
    expect(receipt.admittedManifestation).toBe(true);
    expect(receipt.acceptedEventId).toBe('prop-tech-ok');
    expect(receipt.postState).toHaveLength(1);
    expect(receipt.postState[0]).toEqual({
      id: 'prop-tech-ok',
      castMemberId: 'char-tech',
      pursuitId: null,
      activitySummary: 'Mercer taps the auxiliary voltage dial with a metallic click.',
      locationNodeId: 'NODE_CONTROL',
      perceptionPath: 'DIRECT',
      committedTurn: 2,
      authorityReferences: ['CONSOLE_MANUAL'],
      wasManifested: true,
    });
  });

  it('unobserved offscreen activity commits to event ledger but does not admit manifestation to narrative', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-guard-unobserved',
      castMemberId: 'char-guard',
      pursuitId: 'pursuit-guard',
      locationNodeId: 'NODE_GATE',
      activitySummary: 'Petrov locks the blast doors at the outer gate perimeter.',
      authorityReferences: ['GATE_ORDERS'],
      perceptionPath: 'UNOBSERVED',
      manifestationBlock: null,
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('ACCEPTED');
    expect(receipt.admittedManifestation).toBe(false);
    expect(receipt.postState).toHaveLength(1);
    expect(receipt.postState[0].wasManifested).toBe(false);
  });

  it('rejects LOCAL_TRACE proposal with dialogue manifestation', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-trace-dialogue',
      castMemberId: 'char-tech',
      locationNodeId: 'NODE_CONTROL',
      activitySummary: 'Mercer left boot prints in the dust.',
      authorityReferences: ['opp-present-char-tech'],
      perceptionPath: 'LOCAL_TRACE',
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'Technician Mercer',
        content: 'I left footprints here.',
      },
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('LOCAL_TRACE_CANNOT_USE_DIALOGUE');
  });

  it('rejects MEDIATED proposal when cast member lacks mediated capability', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    // char-guard only has 'spoken', not 'mediated'
    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-guard-radio',
      castMemberId: 'char-guard',
      pursuitId: 'pursuit-guard',
      locationNodeId: 'NODE_GATE',
      activitySummary: 'Petrov radios from gate.',
      authorityReferences: ['pursuit-guard'],
      perceptionPath: 'MEDIATED',
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'Guard Petrov',
        content: 'Gate is secure over radio.',
      },
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('MEDIATED_PERCEPTION_UNSUPPORTED_BY_ACTOR_PROFILE');
  });

  it('rejects dialogue manifestation when speaker does not match the activity actor', () => {
    const context = createMockContext();
    const eligibility = createMockEligibility();

    const proposal: CastActivityProposal = {
      kind: 'ACTIVITY',
      proposalId: 'prop-speaker-mismatch',
      castMemberId: 'char-tech',
      locationNodeId: 'NODE_CONTROL',
      activitySummary: 'Mercer works on console.',
      authorityReferences: ['opp-present-char-tech'],
      perceptionPath: 'DIRECT',
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'Guard Petrov', // Petrov speaking for Mercer's action
        content: 'I will help with that.',
      },
    };

    const receipt = resolveCastActivity({
      proposal,
      eligibilityReceipt: eligibility,
      currentContext: context,
      preEvents: [],
      currentTurn: 2,
    });

    expect(receipt.outcome).toBe('REJECTED');
    expect(receipt.reasonCode).toBe('INVALID_MANIFESTATION_DIALOGUE_SPEAKER');
  });
});
