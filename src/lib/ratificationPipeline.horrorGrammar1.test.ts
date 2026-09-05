import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { executeRatificationPipeline } from './ratificationPipeline';
import { useAppStore } from '../store/useAppStore';
import { useEngineStore } from '../core/store';
import { normalizeBlueprint } from './normalizeBlueprint';
import type { Blueprint } from '../types';

describe('Ratification Pipeline: Horror Grammar 1 Initiative & Pressure (Packet 1-3)', () => {
  const originalFetch = globalThis.fetch;

  const mockBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp-facility-1',
    identity: {
      title: 'Facility Omega',
      version: '1.0',
      author: 'Test Architect',
      thematicAnchor: 'Containment Failure',
    },
    title: 'Facility Omega',
    premise: 'Underground labs',
    globalPremise: 'Underground labs',
    setting: {
      location: 'Sub-Level 3',
      atmosphere: 'Cold',
      timePeriod: '1999',
    },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    cast: [
      {
        id: 'char-user',
        name: 'Officer Ray',
        role: 'Protagonist',
        isUserCharacter: true,
        starting_location: 'NODE_CONTROL',
      },
      {
        id: 'char-tech',
        name: 'Technician Mercer',
        role: 'Engineer',
        isUserCharacter: false,
        starting_location: 'NODE_CONTROL',
      },
    ],
    topology: {
      nodes: ['NODE_CONTROL', 'NODE_CORRIDOR'],
      connections: [],
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED',
      pursuitReviews: {
        'char-tech': 'REVIEWED',
      },
      valueAnchors: [
        {
          id: 'val-reactor',
          holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
          label: 'Cooling Grid',
          description: 'Prevents reactor meltdown',
          basisSummary: 'Facility design',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
      characterPursuits: [
        {
          id: 'pursuit-tech',
          castMemberId: 'char-tech',
          objective: 'Maintain sub-relay voltage',
          presentApproach: 'Checking breakers',
          locationNodeId: 'NODE_CONTROL',
          status: 'ACTIVE',
          reviewWindow: 'MOMENT',
          triggerReferences: [],
          basisSummary: 'Routine maintenance',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    },
  }) as Blueprint;

  beforeEach(() => {
    useAppStore.setState({
      spatialGraph: [
        {
          id: 'NODE_CONTROL',
          name: 'Control Room',
          type: 'hub',
          exits: [],
          description: 'Control Room',
        },
      ],
      storyLog: [],
    });

    useEngineStore.setState({
      activeBlueprint: mockBlueprint,
      gameState: {
        player_character_id: 'char-user',
        player_role: 'protagonist',
        fictional_time_ledger: {
          moment_revision: 0,
          scene_beat_revision: 0,
          extended_revision: 0,
          last_cost: null,
        },
        pursuit_schedule_ledger: {},
        activity_events: [],
        pressure_threads: [],
      },
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('preserves narrative isolation by admitting accepted manifestation blocks and attaching receipts', async () => {
    const mockTurnResponse = {
      narrative_blocks: [
        {
          type: 'prose',
          content: 'You inspect the master console switches.',
        },
        {
          type: 'dialogue',
          speaker: 'Technician Mercer',
          content: 'Primary breakers are tripping across Sector B.',
        },
        {
          type: 'prose',
          content: 'Acrid electrical smoke billows from the cooling conduit, obscuring the shutoff valve.',
        },
      ],
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
      canonicalConsequenceReceipt: {
        version: 1,
        pre_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
        post_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
        patch: {
          inventory_added: [],
          inventory_removed: [],
          injuries_added: [],
          injuries_removed: [],
          psychological_status_change: null,
        },
        decisions: [],
      },
      characterStanceReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
      characterRelationshipReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
      characterMemoryReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
      worldMemoryReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
      intentReceipt: {
        version: 1,
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      narrativeReconciliationReceipt: {
        version: 1,
        mode: 'CANONICAL',
        feasibility: 'SUPPORTED',
        reason_code: 'NONE',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'WITHIN_CONTRACT',
        memory_echo_candidate: null,
        revision_increment: 0,
      },
      castActivityProposalReceipt: {
        version: 1,
        outcome: 'ACCEPTED',
        reasonCode: 'ACTIVITY_RATIFIED',
        preState: [],
        postState: [
          {
            id: 'evt-1',
            castMemberId: 'char-tech',
            pursuitId: null,
            activitySummary: 'Mercer checks breakers',
            locationNodeId: 'NODE_CONTROL',
            perceptionPath: 'DIRECT',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
        admittedManifestation: true,
        acceptedEventId: 'evt-1',
      },
      situatedPressureReceipt: {
        version: 1,
        outcome: 'ACCEPTED',
        reasonCode: 'PRESSURE_RATIFIED',
        preState: [],
        postState: [
          {
            id: 'thr-1',
            valueAnchorId: 'val-reactor',
            holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
            sourceReference: 'ACTIVITY',
            operator: 'CONSTRAIN_ACCESS',
            affectedDimension: 'ACCESS',
            adverseProspect: 'Smoke blocks emergency shutoff',
            manifestationSummary: 'Acrid smoke billows',
            status: 'OPEN',
            createdTurn: 1,
            lastChangedTurn: 1,
            persistenceTarget: 'PRESSURE_THREAD',
          },
        ],
        admittedManifestation: true,
        acceptedThreadId: 'thr-1',
      },
      fictionalTimeReceipt: {
        version: 1,
        preState: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
        acceptedCost: 'MOMENT',
        postState: { moment_revision: 1, scene_beat_revision: 0, extended_revision: 0, last_cost: 'MOMENT' },
      },
      castActivityReceipt: {
        version: 1,
        presentOpportunities: [],
        offscreenOpportunities: [],
        boundedOutPursuitIds: [],
        dormantCount: 0,
        notDueCount: 0,
        ledgerSnapshot: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
        scheduleSnapshotRevision: 0,
      },
      pursuitScheduleReceipt: {
        version: 1,
        preState: {},
        postState: {},
      },
      valueStateReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      characterPursuitReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      characterDevelopmentReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      pressureThreadTransitionReceipt: {
        version: 1,
        preState: [
          {
            id: 'thr-1',
            valueAnchorId: 'val-reactor',
            holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
            sourceReference: 'ACTIVITY',
            operator: 'CONSTRAIN_ACCESS',
            affectedDimension: 'ACCESS',
            adverseProspect: 'Smoke blocks emergency shutoff',
            manifestationSummary: 'Acrid smoke billows',
            status: 'OPEN',
            createdTurn: 1,
            lastChangedTurn: 1,
            persistenceTarget: 'PRESSURE_THREAD',
          },
        ],
        postState: [
          {
            id: 'thr-1',
            valueAnchorId: 'val-reactor',
            holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
            sourceReference: 'ACTIVITY',
            operator: 'CONSTRAIN_ACCESS',
            affectedDimension: 'ACCESS',
            adverseProspect: 'Smoke blocks emergency shutoff',
            manifestationSummary: 'Acrid smoke billows',
            status: 'OPEN',
            createdTurn: 1,
            lastChangedTurn: 1,
            persistenceTarget: 'PRESSURE_THREAD',
          },
        ],
        decisions: [],
      },
    };

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify(mockTurnResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const ratifiedFrame = await executeRatificationPipeline('Check the console');

    expect(ratifiedFrame.narrative_blocks).toHaveLength(3);
    expect(ratifiedFrame.fictionalTimeReceipt).toBeDefined();
    expect(ratifiedFrame.fictionalTimeReceipt?.postState.moment_revision).toBe(1);
    expect(ratifiedFrame.castActivityProposalReceipt?.outcome).toBe('ACCEPTED');
    expect(ratifiedFrame.situatedPressureReceipt?.outcome).toBe('ACCEPTED');
    expect(ratifiedFrame.logic_state.activity_events).toHaveLength(1);
    expect(ratifiedFrame.logic_state.pressure_threads).toHaveLength(1);
  });

  it('threads all 7 HG1 ledgers from gameState to /api/turn request payload', async () => {
    const sentinelTime = {
      moment_revision: 5,
      scene_beat_revision: 2,
      extended_revision: 1,
      last_cost: 'MOMENT' as const,
    };
    const sentinelSchedule = {
      'pursuit-tech': {
        pursuitId: 'pursuit-tech',
        castMemberId: 'char-tech',
        lastConsideredMomentRevision: 5,
        lastConsideredSceneBeatRevision: 2,
        lastConsideredExtendedRevision: 1,
        lastConsideredTurn: 2,
        latestDisposition: 'PRESENT_OPPORTUNITY' as const,
      },
    };
    const sentinelActivityEvents: import('../types/horrorGrammar').CastActivityEvent[] = [
      {
        id: 'act-evt-01',
        castMemberId: 'char-tech',
        pursuitId: 'pursuit-tech',
        activitySummary: 'Mercer tested the relay.',
        locationNodeId: 'NODE_CONTROL',
        perceptionPath: 'DIRECT',
        committedTurn: 2,
        authorityReferences: [],
        wasManifested: true,
      },
    ];
    const sentinelPressureThreads: import('../types/horrorGrammar').SituatedPressureThread[] = [
      {
        id: 'prs-thread-01',
        valueAnchorId: 'val-reactor',
        holder: { kind: 'PLACE', nodeId: 'NODE_CONTROL' },
        operator: 'CONSTRAIN_ACCESS',
        affectedDimension: 'SAFETY',
        adverseProspect: 'Coolant pressure dropping',
        manifestationSummary: null,
        persistenceTarget: 'PRESSURE_THREAD',
        status: 'OPEN',
        createdTurn: 2,
        lastChangedTurn: 2,
        sourceReference: 'act-evt-01',
        authorityReferences: [],
      },
    ];
    const sentinelValueLedger = {
      'val-reactor': {
        anchorId: 'val-reactor',
        lifecycle: 'ACTIVE' as const,
        condition: 'THREATENED' as const,
        currentFormNote: 'Coolant dripping',
        lastCauseReference: 'act-evt-01',
        lastChangedTurn: 2,
      },
    };
    const sentinelPursuitLedger = {
      'pursuit-tech': {
        pursuitId: 'pursuit-tech',
        castMemberId: 'char-tech',
        currentObjective: 'Maintain sub-relay voltage',
        currentApproach: 'Checking breakers',
        currentLocationNodeId: 'NODE_CONTROL',
        status: 'ACTIVE' as const,
        progressSummary: 'Breakers checked',
        lastCauseReference: 'BASELINE',
        lastActivityTurn: 2,
        lastChangedTurn: 0,
        reviewWindow: 'MOMENT' as const,
      },
    };
    const sentinelDevelopmentLedger = {
      'char-tech': [
        {
          id: 'dev-01',
          castMemberId: 'char-tech',
          dimension: 'BELIEF' as const,
          statement: 'Suspects containment was sabotaged.',
          lifecycle: 'ACTIVE' as const,
          establishedTurn: 2,
          lastChangedTurn: 2,
          causeReference: 'act-evt-01',
        },
      ],
    };

    useEngineStore.setState({
      activeBlueprint: mockBlueprint,
      gameState: {
        player_character_id: 'char-user',
        player_role: 'protagonist',
        fictional_time_ledger: sentinelTime,
        pursuit_schedule_ledger: sentinelSchedule,
        activity_events: sentinelActivityEvents,
        pressure_threads: sentinelPressureThreads,
        value_state_ledger: sentinelValueLedger,
        character_pursuit_ledger: sentinelPursuitLedger,
        character_development_ledger: sentinelDevelopmentLedger,
      },
    });

    let sentPayload: {
      context: {
        horrorGrammar: {
          runtimeState: {
            fictionalTime: unknown;
            pursuitSchedule: unknown;
            recentActivityEvents: unknown;
            activePressureThreads: unknown;
            valueState: unknown;
            characterPursuits: unknown;
            characterDevelopment: unknown;
          };
        };
      };
    } | null = null;
    globalThis.fetch = vi.fn().mockImplementation(async (_url, options) => {
      sentPayload = JSON.parse(options.body);
      return new Response(
        JSON.stringify({
          engine_thoughts: 'Observing.',
          narrative_blocks: [{ type: 'prose', content: 'You wait.' }],
          logic_state: { terminal_flags: [], cast_deltas: [], cast_ledger: [] },
          canonicalConsequenceReceipt: {
            version: 1,
            pre_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
            post_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
            patch: {
              inventory_added: [],
              inventory_removed: [],
              injuries_added: [],
              injuries_removed: [],
              psychological_status_change: null,
            },
            decisions: [],
          },
          characterStanceReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
          characterRelationshipReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
          characterMemoryReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
          worldMemoryReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
          intentReceipt: {
            version: 1,
            action_kind: 'WAIT',
            action_subtype: null,
            pressure_direction: 'MAINTAIN',
            dramatic_tactic: 'NONE',
            intent_synergy: 'SUCCESS',
          },
          narrativeReconciliationReceipt: {
            version: 1,
            mode: 'CANONICAL',
            feasibility: 'SUPPORTED',
            reason_code: 'NONE',
            fictional_time_cost: 'MOMENT',
            authority_alignment: 'WITHIN_CONTRACT',
            memory_echo_candidate: null,
            revision_increment: 0,
          },
          fictionalTimeReceipt: {
            version: 1,
            preState: sentinelTime,
            acceptedCost: 'MOMENT',
            postState: { ...sentinelTime, moment_revision: sentinelTime.moment_revision + 1, last_cost: 'MOMENT' },
          },
          castActivityReceipt: {
            version: 1,
            presentOpportunities: [],
            offscreenOpportunities: [],
            boundedOutPursuitIds: [],
            dormantCount: 0,
            notDueCount: 0,
            ledgerSnapshot: sentinelTime,
            scheduleSnapshotRevision: 5,
          },
          pursuitScheduleReceipt: {
            version: 1,
            preState: sentinelSchedule,
            postState: sentinelSchedule,
          },
          castActivityProposalReceipt: {
            version: 1,
            outcome: 'NO_PROPOSAL',
            reasonCode: 'NO_OPPORTUNITY_CHOSEN',
            preState: sentinelActivityEvents,
            postState: sentinelActivityEvents,
            admittedManifestation: false,
            acceptedEventId: null,
          },
          situatedPressureReceipt: {
            version: 1,
            outcome: 'NO_PROPOSAL',
            reasonCode: 'NO_PRESSURE_CHOSEN',
            preState: sentinelPressureThreads,
            postState: sentinelPressureThreads,
            admittedManifestation: false,
            acceptedThreadId: null,
          },
          valueStateReceipt: {
            version: 1,
            preState: sentinelValueLedger,
            postState: sentinelValueLedger,
            decisions: [],
          },
          characterPursuitReceipt: {
            version: 1,
            preState: sentinelPursuitLedger,
            postState: sentinelPursuitLedger,
            decisions: [],
          },
          characterDevelopmentReceipt: {
            version: 1,
            preState: sentinelDevelopmentLedger,
            postState: sentinelDevelopmentLedger,
            decisions: [],
          },
          pressureThreadTransitionReceipt: {
            version: 1,
            preState: sentinelPressureThreads,
            postState: sentinelPressureThreads,
            decisions: [],
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    });

    await executeRatificationPipeline('Wait for Mercer');

    expect(sentPayload).toBeDefined();
    const hg = sentPayload.context.horrorGrammar;
    expect(hg.runtimeState.fictionalTime).toEqual(sentinelTime);
    expect(hg.runtimeState.pursuitSchedule).toEqual(sentinelSchedule);
    expect(hg.runtimeState.recentActivityEvents).toEqual(sentinelActivityEvents);
    expect(hg.runtimeState.activePressureThreads).toEqual(sentinelPressureThreads);
    expect(hg.runtimeState.valueState).toEqual(sentinelValueLedger);
    expect(hg.runtimeState.characterPursuits).toEqual(sentinelPursuitLedger);
    expect(hg.runtimeState.characterDevelopment).toEqual(sentinelDevelopmentLedger);
  });

  it('Packet 06: pipeline ratifies rejected receipts for ungrounded authorities and derives no unratified store updates', async () => {
    const preExistingEvents: import('../types/horrorGrammar').CastActivityEvent[] = [];
    const preExistingThreads: import('../types/horrorGrammar').SituatedPressureThread[] = [];

    const rejectedTurnResponse = {
      narrative_blocks: [{ type: 'prose', content: 'Base prose continues safely.' }],
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
        activity_events: preExistingEvents,
        pressure_threads: preExistingThreads,
      },
      canonicalConsequenceReceipt: {
        version: 1,
        pre_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
        post_state: { inventory: [], player_injuries: [], psychological_status: 'STABLE' },
        patch: {
          inventory_added: [],
          inventory_removed: [],
          injuries_added: [],
          injuries_removed: [],
          psychological_status_change: null,
        },
        decisions: [],
      },
      characterStanceReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
      characterRelationshipReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
      characterMemoryReceipt: { version: 1, pre_state: {}, post_state: {}, decisions: [] },
      worldMemoryReceipt: { version: 1, pre_state: [], post_state: [], decisions: [] },
      intentReceipt: {
        version: 1,
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      narrativeReconciliationReceipt: {
        version: 1,
        mode: 'CANONICAL',
        feasibility: 'SUPPORTED',
        reason_code: 'NONE',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'WITHIN_CONTRACT',
        memory_echo_candidate: null,
        revision_increment: 0,
      },
      castActivityProposalReceipt: {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'INVALID_AUTHORITY_REFERENCE',
        preState: preExistingEvents,
        postState: preExistingEvents,
        admittedManifestation: false,
        acceptedEventId: null,
      },
      situatedPressureReceipt: {
        version: 1,
        outcome: 'REJECTED',
        reasonCode: 'ACTIVITY_SOURCE_NOT_ACCEPTED',
        preState: preExistingThreads,
        postState: preExistingThreads,
        admittedManifestation: false,
        acceptedThreadId: null,
      },
      fictionalTimeReceipt: {
        version: 1,
        preState: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
        acceptedCost: 'MOMENT',
        postState: { moment_revision: 1, scene_beat_revision: 0, extended_revision: 0, last_cost: 'MOMENT' },
      },
      castActivityReceipt: {
        version: 1,
        presentOpportunities: [],
        offscreenOpportunities: [],
        boundedOutPursuitIds: [],
        dormantCount: 0,
        notDueCount: 0,
        ledgerSnapshot: { moment_revision: 0, scene_beat_revision: 0, extended_revision: 0, last_cost: null },
        scheduleSnapshotRevision: 0,
      },
      pursuitScheduleReceipt: {
        version: 1,
        preState: {},
        postState: {},
      },
      valueStateReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      characterPursuitReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      characterDevelopmentReceipt: {
        version: 1,
        preState: {},
        postState: {},
        decisions: [],
      },
      pressureThreadTransitionReceipt: {
        version: 1,
        preState: [],
        postState: [],
        decisions: [],
      },
    };

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      return new Response(JSON.stringify(rejectedTurnResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    const ratifiedFrame = await executeRatificationPipeline('Observe quietly');

    expect(ratifiedFrame.castActivityProposalReceipt?.outcome).toBe('REJECTED');
    expect(ratifiedFrame.castActivityProposalReceipt?.reasonCode).toBe('INVALID_AUTHORITY_REFERENCE');
    expect(ratifiedFrame.situatedPressureReceipt?.outcome).toBe('REJECTED');
    expect(ratifiedFrame.situatedPressureReceipt?.reasonCode).toBe('ACTIVITY_SOURCE_NOT_ACCEPTED');

    // Published frame ledgers remain uncontaminated
    expect(ratifiedFrame.logic_state.activity_events).toEqual([]);
    expect(ratifiedFrame.logic_state.pressure_threads).toEqual([]);
  });
});
