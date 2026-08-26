import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Runtime from './Runtime';
import { useAppStore } from '../../store/useAppStore';
import { useEngineStore } from '../../core/store';
import type { RatifiedEngineFrame } from '../../types';
import { normalizeBlueprint } from '../../lib/normalizeBlueprint';
import { executeRatificationPipeline } from '../../lib/ratificationPipeline';

vi.mock('../../lib/ratificationPipeline', () => ({
  executeRatificationPipeline: vi.fn(),
}));

describe('Runtime Horror Grammar 1 Integration', () => {
  let container: HTMLDivElement | null = null;
  let root: ReturnType<typeof createRoot> | null = null;

  const mockBlueprint = {
    id: 'bp-hg1-test',
    title: 'Isolation Ward Echo',
    contentScale: 2,
    contentLevelDescription: 'Psychological Horror',
    setting: {
      location: 'Sub-level 1',
      atmosphere: 'Sterile',
      timePeriod: '1999',
    },
    cast: [
      {
        id: 'char-user',
        name: 'Dr. Evans',
        role: 'Researcher',
        description: 'Lead researcher',
        personality: 'Stoic',
        goals: 'Contain sample',
        traits: ['Methodical'],
        isUserCharacter: true,
        isEntity: false,
        behaviorVector: 'COGNITIVE',
        starting_location: 'ORIGIN',
      },
      {
        id: 'char-ally',
        name: 'Technician Mercer',
        role: 'Technician',
        description: 'Station tech',
        personality: 'Nervous',
        goals: 'Fix power',
        traits: ['Cautious'],
        isUserCharacter: false,
        isEntity: false,
        behaviorVector: 'COGNITIVE',
        starting_location: 'ORIGIN',
      },
    ],
    topology: {
      nodes: ['ORIGIN'],
      connections: [],
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED',
      pursuitReviews: {
        'char-ally': 'REVIEWED',
      },
      valueAnchors: [
        {
          id: 'val-reactor-core',
          holder: { kind: 'PLACE', nodeId: 'ORIGIN' },
          label: 'Auxiliary Core',
          description: 'Power grid stability',
          basisSummary: 'Facility engineering',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
      characterPursuits: [
        {
          id: 'pur-mercer-power',
          castMemberId: 'char-ally',
          objective: 'Restore main breakers',
          presentApproach: 'Checking junction box',
          reviewWindow: 'SCENE_BEAT',
          status: 'ACTIVE',
          basisSummary: 'Engineering protocol',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    },
  };

  beforeEach(() => {
    useAppStore.getState().resetSession();
    useEngineStore.getState().resetEngine();

    const normalized = normalizeBlueprint(mockBlueprint);

    useAppStore.setState({
      sessionId: 'sess-hg1-test',
      blueprintId: normalized.id,
      phase: 'ENGINE',
      spatialGraph: [{ id: 'ORIGIN', name: 'Origin Chamber', description: '', exits: [] }],
      currentNodeId: 'ORIGIN',
      history: [
        {
          id: 'msg-1',
          role: 'narrative',
          content: 'You stand before the auxiliary core.',
          timestamp: 1000,
        },
      ],
    });

    useEngineStore.setState({
      activeSessionId: 'sess-hg1-test',
      activeBlueprint: normalized,
      gameState: {
        current_location: 'ORIGIN',
        player_character_id: 'char-user',
        fictional_time_ledger: {
          moment_revision: 0,
          scene_beat_revision: 0,
          extended_revision: 0,
          last_cost: 'UNCLEAR',
        },
        pursuit_schedule_ledger: {},
        activity_events: [],
        pressure_threads: [],
        value_state_ledger: {
          'val-reactor-core': {
            anchorId: 'val-reactor-core',
            lifecycle: 'ACTIVE',
            condition: 'ESTABLISHED',
            currentFormNote: null,
            lastCauseReference: 'BASELINE',
            lastChangedTurn: 0,
          },
        },
        character_pursuit_ledger: {
          'pur-mercer-power': {
            pursuitId: 'pur-mercer-power',
            castMemberId: 'char-ally',
            currentObjective: 'Restore main breakers',
            currentApproach: 'Checking junction box',
            currentLocationNodeId: 'ORIGIN',
            status: 'ACTIVE',
            progressSummary: 'Baseline pursuit initiated',
            lastCauseReference: 'BASELINE',
            lastActivityTurn: null,
            lastChangedTurn: 0,
            reviewWindow: 'SCENE_BEAT',
          },
        },
        character_development_ledger: {},
        character_stance: {},
        character_relationships: [],
        character_memory: {},
        world_memory: [],
      },
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root && container) {
      act(() => {
        root!.unmount();
      });
      container.remove();
    }
    vi.clearAllMocks();
  });

  it('commits turn with validated cast activity, situated pressure, and value overlays', async () => {
    const mockFrame: RatifiedEngineFrame = {
      narrative_blocks: [
        { type: 'prose', content: 'You check the readouts.' },
        { type: 'dialogue', speaker: 'Technician Mercer', content: 'I found the blown fuse!' },
      ],
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 10,
        activity_events: [
          {
            id: 'act-1-mercer-fuse',
            castMemberId: 'char-ally',
            pursuitId: 'pur-mercer-power',
            activitySummary: 'Located the blown fuse in the junction box',
            locationNodeId: 'ORIGIN',
            perceptionPath: 'DIRECT',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
        pressure_threads: [
          {
            id: 'thr-1-val-reactor-core',
            valueAnchorId: 'val-reactor-core',
            holder: { kind: 'PLACE', nodeId: 'ORIGIN' },
            sourceReference: 'ACTIVITY',
            operator: 'CONSTRAIN_ACCESS',
            affectedDimension: 'ACCESS',
            adverseProspect: 'Sparks showering the control panel',
            manifestationSummary: 'Sparks showering',
            status: 'OPEN',
            createdTurn: 1,
            lastChangedTurn: 1,
            persistenceTarget: 'PRESSURE_THREAD',
          },
        ],
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
      characterStanceReceipt: {
        version: 1,
        pre_state: {},
        post_state: {},
        decisions: [],
      },
      characterRelationshipReceipt: {
        version: 1,
        pre_state: [],
        post_state: [],
        decisions: [],
      },
      characterMemoryReceipt: {
        version: 1,
        pre_state: {},
        post_state: {},
        decisions: [],
      },
      worldMemoryReceipt: {
        version: 1,
        pre_state: [],
        post_state: [],
        decisions: [],
      },
      castActivityProposalReceipt: {
        version: 1,
        outcome: 'ACCEPTED',
        reasonCode: 'ACTIVITY_RATIFIED',
        preState: [],
        postState: [
          {
            id: 'act-1-mercer-fuse',
            castMemberId: 'char-ally',
            pursuitId: 'pur-mercer-power',
            activitySummary: 'Located the blown fuse in the junction box',
            locationNodeId: 'ORIGIN',
            perceptionPath: 'DIRECT',
            committedTurn: 1,
            authorityReferences: [],
            wasManifested: true,
          },
        ],
        admittedManifestation: true,
        acceptedEventId: 'act-1-mercer-fuse',
      },
      situatedPressureReceipt: {
        version: 1,
        outcome: 'ACCEPTED',
        reasonCode: 'PRESSURE_RATIFIED',
        preState: [],
        postState: [
          {
            id: 'thr-1-val-reactor-core',
            valueAnchorId: 'val-reactor-core',
            holder: { kind: 'PLACE', nodeId: 'ORIGIN' },
            sourceReference: 'ACTIVITY',
            operator: 'CONSTRAIN_ACCESS',
            affectedDimension: 'ACCESS',
            adverseProspect: 'Sparks showering the control panel',
            manifestationSummary: 'Sparks showering',
            status: 'OPEN',
            createdTurn: 1,
            lastChangedTurn: 1,
            persistenceTarget: 'PRESSURE_THREAD',
          },
        ],
        admittedManifestation: true,
        acceptedThreadId: 'thr-1-val-reactor-core',
      },
      valueStateReceipt: {
        version: 1,
        preState: {
          'val-reactor-core': {
            anchorId: 'val-reactor-core',
            lifecycle: 'ACTIVE',
            condition: 'ESTABLISHED',
            currentFormNote: null,
            lastCauseReference: 'BASELINE',
            lastChangedTurn: 0,
          },
        },
        postState: {
          'val-reactor-core': {
            anchorId: 'val-reactor-core',
            lifecycle: 'ACTIVE',
            condition: 'THREATENED',
            currentFormNote: null,
            lastCauseReference: 'act-1-mercer-fuse',
            lastChangedTurn: 1,
          },
        },
        decisions: [
          {
            anchorId: 'val-reactor-core',
            operation: 'SET_CONDITION',
            outcome: 'APPLIED',
            reasonCode: 'VALUE_STATE_TRANSITION_APPLIED',
            causeReference: 'act-1-mercer-fuse',
          },
        ],
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
    };

    vi.mocked(executeRatificationPipeline).mockResolvedValue(mockFrame);

    await act(async () => {
      root!.render(<Runtime />);
    });

    const observeButton = container!.querySelector('button[title*="Observe"]') as HTMLButtonElement;
    expect(observeButton).toBeTruthy();

    await act(async () => {
      observeButton.click();
    });

    const finalEngineState = useEngineStore.getState();
    expect(finalEngineState.gameState?.activity_events).toHaveLength(1);
    expect(finalEngineState.gameState?.activity_events?.[0].id).toBe('act-1-mercer-fuse');
    expect(finalEngineState.gameState?.pressure_threads).toHaveLength(1);
    expect(finalEngineState.gameState?.value_state_ledger?.['val-reactor-core']?.condition).toBe(
      'THREATENED'
    );
  });
});
