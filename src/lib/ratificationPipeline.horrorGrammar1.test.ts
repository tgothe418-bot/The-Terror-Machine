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
});
