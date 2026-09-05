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
      authorityReferences: ['opp-present-char-tech'],
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
      authorityReferences: ['opp-present-char-tech'],
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
      authorityReferences: ['pursuit-guard'],
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

  describe('Packet 04: Canonical Cast Presence Enforcement in Ratification', () => {
    it('rejects forged or contradictory PRESENT opportunity when actor is canonically absent (isPresent = false)', () => {
      const context = createMockContext();
      // Ensure char-guard is canonically absent
      const guardInCast = context.cast.find((c) => c.id === 'char-guard');
      expect(guardInCast?.isPresent).toBe(false);

      // Forged eligibility receipt with a PRESENT opportunity for char-guard
      const forgedEligibility: CastActivityEligibilityReceipt = {
        version: 1,
        presentOpportunities: [
          {
            castMemberId: 'char-guard',
            opportunityKind: 'PRESENT',
            locationNodeId: 'NODE_CONTROL',
            pursuitId: null,
            objective: null,
            presentApproach: null,
            reviewWindow: null,
            referencedValueIds: [],
          },
        ],
        offscreenOpportunities: [],
        boundedOutPursuitIds: [],
        dormantCount: 0,
        notDueCount: 0,
        ledgerSnapshot: {
          moment_revision: 1,
          scene_beat_revision: 0,
          extended_revision: 0,
          last_cost: null,
        },
        scheduleSnapshotRevision: 1,
      };

      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-forged-present',
        castMemberId: 'char-guard',
        locationNodeId: 'NODE_CONTROL',
        activitySummary: 'Guard steps out of shadows at control desk.',
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'dialogue',
          speaker: 'Guard Petrov',
          content: 'You should not be here.',
        },
      };

      const preEvents: CastActivityEvent[] = [
        {
          id: 'event-prior',
          committedTurn: 1,
          castMemberId: 'char-tech',
          pursuitId: null,
          locationNodeId: 'NODE_CONTROL',
          activitySummary: 'Tech calibrated dials.',
          perceptionPath: 'DIRECT',
          authorityReferences: ['opp-tech'],
          wasManifested: true,
        },
      ];

      const receipt = resolveCastActivity({
        proposal,
        eligibilityReceipt: forgedEligibility,
        currentContext: context,
        preEvents,
        currentTurn: 2,
      });

      expect(receipt.outcome).toBe('REJECTED');
      expect(receipt.reasonCode).toBe('DIRECT_PERCEPTION_REQUIRES_CO_PRESENCE');
      expect(receipt.admittedManifestation).toBe(false);
      expect(receipt.acceptedEventId).toBeNull();
      // Verifies canonical state and activity records remain completely unchanged
      expect(receipt.preState).toEqual(preEvents);
      expect(receipt.postState).toEqual(preEvents);
    });

    it('permits valid offscreen actor with mediated capabilities to manifest via MEDIATED perception', () => {
      const context = createMockContext();
      // Add an entity / offscreen actor with mediated communication mode
      context.cast.push({
        id: 'char-intercom-ai',
        name: 'Facility AI',
        role: 'Synthesizer',
        description: 'Automated intercom entity',
        personality: 'Objective',
        goals: 'Broadcast facility telemetry',
        traits: ['Synthetic'],
        isEntity: true,
        isUserCharacter: false,
        skepticism: 0.1,
        isPresent: false,
        stance: null,
        memory: [],
        expressionProfile: {
          communicationModes: ['mediated'],
          expressionGuidance: 'Transmits via facility speaker grid.',
        },
      });

      const eligibility: CastActivityEligibilityReceipt = {
        version: 1,
        presentOpportunities: [],
        offscreenOpportunities: [
          {
            castMemberId: 'char-intercom-ai',
            opportunityKind: 'OFFSCREEN_PURSUIT',
            locationNodeId: null,
            pursuitId: 'pursuit-ai-broadcast',
            objective: 'Broadcast facility status',
            presentApproach: 'Automated chime',
            reviewWindow: 'MOMENT',
            referencedValueIds: [],
          },
        ],
        boundedOutPursuitIds: [],
        dormantCount: 0,
        notDueCount: 0,
        ledgerSnapshot: {
          moment_revision: 1,
          scene_beat_revision: 0,
          extended_revision: 0,
          last_cost: null,
        },
        scheduleSnapshotRevision: 1,
      };

      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-ai-broadcast',
        castMemberId: 'char-intercom-ai',
        pursuitId: 'pursuit-ai-broadcast',
        activitySummary: 'Broadcast chime echoes over speaker system.',
        authorityReferences: ['pursuit-ai-broadcast'],
        perceptionPath: 'MEDIATED',
        manifestationBlock: {
          type: 'dialogue',
          speaker: 'Facility AI',
          content: 'Pressure drop detected in auxiliary loop.',
        },
      };

      const receipt = resolveCastActivity({
        proposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [],
        currentTurn: 2,
      });

      expect(receipt.outcome).toBe('ACCEPTED');
      expect(receipt.admittedManifestation).toBe(true);
      expect(receipt.acceptedEventId).toBe('prop-ai-broadcast');
      expect(receipt.postState).toHaveLength(1);
      expect(receipt.postState[0].perceptionPath).toBe('MEDIATED');
    });

    it('permits valid offscreen actor unobserved activity without manifestation block', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();
      // char-guard has an active offscreen pursuit at NODE_GATE
      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-guard-unobserved',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard',
        locationNodeId: 'NODE_GATE',
        activitySummary: 'Guard reinforces security barricade at gate perimeter.',
        authorityReferences: ['pursuit-guard'],
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
      expect(receipt.acceptedEventId).toBe('prop-guard-unobserved');
      expect(receipt.postState).toHaveLength(1);
      expect(receipt.postState[0].perceptionPath).toBe('UNOBSERVED');
    });
  });

  describe('Packet 06: Exact Authority References & Evidence Scope', () => {
    it('rejects schema-valid direct activity proposal citing nonexistent rule with INVALID_AUTHORITY_REFERENCE', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();

      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-tech-nonexistent-rule',
        castMemberId: 'char-tech',
        locationNodeId: 'NODE_CONTROL',
        activitySummary: 'Mercer asserts protocol authority.',
        authorityReferences: ['rule-does-not-exist-in-this-scenario'],
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'dialogue',
          speaker: 'Technician Mercer',
          content: 'Protocol forbids opening this valve.',
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
      expect(receipt.reasonCode).toBe('INVALID_AUTHORITY_REFERENCE');
      expect(receipt.admittedManifestation).toBe(false);
      expect(receipt.acceptedEventId).toBeNull();
      expect(receipt.postState).toEqual([]);
    });

    it('rejects fabricated prefix references (opp-, pur-, val-) that do not exist in canonical registry', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();

      for (const fabricatedRef of ['opp-fabricated-id', 'pur-nonexistent', 'val-invented']) {
        const proposal: CastActivityProposal = {
          kind: 'ACTIVITY',
          proposalId: `prop-${fabricatedRef}`,
          castMemberId: 'char-tech',
          locationNodeId: 'NODE_CONTROL',
          activitySummary: 'Mercer attempts action with fabricated authority.',
          authorityReferences: [fabricatedRef],
          perceptionPath: 'DIRECT',
          manifestationBlock: null,
        };

        const receipt = resolveCastActivity({
          proposal,
          eligibilityReceipt: eligibility,
          currentContext: context,
          preEvents: [],
          currentTurn: 2,
        });

        expect(receipt.outcome).toBe('REJECTED');
        expect(receipt.reasonCode).toBe('INVALID_AUTHORITY_REFERENCE');
      }
    });

    it('rejects proposal citing valid existing reference belonging to a different actor with UNAUTHORIZED_ACTIVITY_CLAIM', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();

      // char-guard tries to cite char-tech's present opportunity
      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-guard-wrong-owner',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard',
        locationNodeId: 'NODE_GATE',
        activitySummary: 'Petrov attempts to act under Mercer\'s engineering opportunity.',
        authorityReferences: ['opp-present-char-tech'],
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

      expect(receipt.outcome).toBe('REJECTED');
      expect(receipt.reasonCode).toBe('UNAUTHORIZED_ACTIVITY_CLAIM');
    });

    it('rejects proposal citing communication capability of a different actor with UNAUTHORIZED_ACTIVITY_CLAIM', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();

      // char-guard tries to cite char-tech's mediated capability
      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-guard-wrong-capability',
        castMemberId: 'char-guard',
        pursuitId: 'pursuit-guard',
        locationNodeId: 'NODE_GATE',
        activitySummary: 'Petrov tries to use Mercer\'s radio clearance.',
        authorityReferences: ['expr-char-tech-mediated'],
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

      expect(receipt.outcome).toBe('REJECTED');
      expect(receipt.reasonCode).toBe('UNAUTHORIZED_ACTIVITY_CLAIM');
    });

    it('rejects proposal with empty authorityReferences with UNAUTHORIZED_ACTIVITY_CLAIM', () => {
      const context = createMockContext();
      const eligibility = createMockEligibility();

      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-tech-no-authority',
        castMemberId: 'char-tech',
        locationNodeId: 'NODE_CONTROL',
        activitySummary: 'Mercer acts with no stated authority references.',
        authorityReferences: [],
        perceptionPath: 'DIRECT',
        manifestationBlock: null,
      };

      const receipt = resolveCastActivity({
        proposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [],
        currentTurn: 2,
      });

      expect(receipt.outcome).toBe('REJECTED');
      expect(receipt.reasonCode).toBe('UNAUTHORIZED_ACTIVITY_CLAIM');
    });

    it('accepts proposal citing exact valid scenario rule rule-1', () => {
      const context = createMockContext();
      context.scenario.worldRules = ['Air filtration cycles every hour.'];
      const eligibility = createMockEligibility();

      const proposal: CastActivityProposal = {
        kind: 'ACTIVITY',
        proposalId: 'prop-tech-valid-rule',
        castMemberId: 'char-tech',
        locationNodeId: 'NODE_CONTROL',
        activitySummary: 'Mercer waits for the hourly filtration cycle.',
        authorityReferences: ['rule-1'],
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'dialogue',
          speaker: 'Technician Mercer',
          content: 'Cycle should start any moment.',
        },
      };

      const receipt = resolveCastActivity({
        proposal,
        eligibilityReceipt: eligibility,
        currentContext: context,
        preEvents: [],
        currentTurn: 2,
      });

      expect(receipt.outcome).toBe('ACCEPTED');
      expect(receipt.reasonCode).toBe('ACTIVITY_RATIFIED');
      expect(receipt.admittedManifestation).toBe(true);
      expect(receipt.acceptedEventId).toBe('prop-tech-valid-rule');
    });
  });
});
