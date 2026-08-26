// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { createApp } from '../app';

const mockGenerateStructuredResponse = vi.fn();
vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    generateStructuredResponse: (...args: unknown[]) => mockGenerateStructuredResponse(...args),
  };
});

describe('Horror Grammar Turn Route (Packet 1-3 Initiative & Pressure)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeEach(async () => {
    mockGenerateStructuredResponse.mockReset();
    const app = await createApp({ enableSpaFallback: false });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const addr = server.address();
        if (addr && typeof addr === 'object') {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => {
      if (server) {
        server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  });

  const baseTurnPayload = {
    userAction: 'Look around the corridor',
    recentHistory: '',
    systemDirective: 'Maintain tension',
    isExpansionExpected: false,
    stateContext: {
      currentNodeId: 'NODE_CORRIDOR',
      currentPhase: 'LATENT',
      tensionLevel: 20,
      reconciliationRevision: 0,
      activeVector: 'COGNITIVE',
      activeTier: 'LATENT',
    },
    context: {
      version: 1,
      scenario: {
        id: 'bp-test',
        title: 'Sub-Basement 9',
        premise: 'Cold steel corridors.',
        worldRules: ['No lights work.'],
        setting: {
          location: 'Basement',
          atmosphere: 'Freezing',
          timePeriod: '1984',
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
        name: 'Ray',
        description: 'Surveyor',
        isEntity: false,
      },
      cast: [
        {
          id: 'char-user',
          name: 'Ray',
          role: 'Protagonist',
          isUserCharacter: true,
          isPresent: true,
        },
        {
          id: 'char-npc1',
          name: 'Mercer',
          role: 'Technician',
          isUserCharacter: false,
          isPresent: true,
        },
      ],
      topology: {
        currentNodeId: 'NODE_CORRIDOR',
        readableNodeLabel: 'Cold Corridor',
        allowedOutgoingExits: [],
      },
      runtime: {
        phase: 'LATENT',
        tension: 20,
        coherence: 1.0,
        reconciliationRevision: 0,
        activeVector: 'COGNITIVE',
        activeTier: 'LATENT',
        activeFlags: [],
        turnNumber: 1,
      },
      consequenceState: {
        inventory: [],
        player_injuries: [],
        psychological_status: 'STABLE',
      },
      relationshipState: [],
      memoryState: {},
      worldMemory: [],
      horrorGrammar: {
        fictionalTime: {
          moment_revision: 2,
          scene_beat_revision: 1,
          extended_revision: 0,
          last_cost: 'MOMENT',
        },
        presentActorOpportunities: [
          {
            castMemberId: 'char-npc1',
            opportunityKind: 'PRESENT',
            locationNodeId: 'NODE_CORRIDOR',
            pursuitId: 'pursuit-npc1',
            objective: 'Fix wiring',
            presentApproach: 'Testing cables with voltmeter',
            reviewWindow: 'MOMENT',
            referencedValueIds: ['val-1'],
          },
        ],
        offscreenPursuitOpportunities: [],
        relevantValueAnchors: [
          {
            id: 'val-1',
            holder: { kind: 'CHARACTER', castMemberId: 'char-npc1' },
            label: 'Power Grid',
            description: 'Maintain power to life support',
            basisSummary: 'Technician duty',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
        authorityInstruction:
          'Only non-User characters listed under presentActorOpportunities and offscreenPursuitOpportunities are eligible for activity consideration on this turn. Do not generate independent actions for other cast members or the User character.',
      },
    },
  };

  it('embeds observational opportunity pool, fictional time, and authority directive into prompt', async () => {
    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        {
          type: 'prose',
          content: 'The low hum of the generator vibrates through the damp floor.',
        },
      ],
      engine_thoughts: 'Observing surroundings.',
      intent_proposal: {
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      reconciliation_proposal: {
        mode: 'DIRECT_EXECUTION',
        declared_effect: 'Checking surroundings',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'ALIGNED',
        reconciliation_notes: 'Standard observation',
      },
      consequence_proposal: {
        mutations: [],
      },
      character_stance_proposal: {
        changes: [],
      },
      character_relationship_proposal: {
        changes: [],
      },
      character_memory_proposal: {
        candidates: [],
      },
      world_memory_proposal: {
        candidates: [],
      },
      cast_activity_proposal: {
        kind: 'NONE',
        reason: 'NO_OPPORTUNITY_CHOSEN',
      },
      situated_pressure_proposal: {
        kind: 'NONE',
        reason: 'NO_PRESSURE_CHOSEN',
      },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseTurnPayload),
    });

    expect(res.status).toBe(200);

    expect(mockGenerateStructuredResponse).toHaveBeenCalledTimes(1);
    const promptArg = mockGenerateStructuredResponse.mock.calls[0][0];

    expect(promptArg).toContain('[CAST ACTIVITY OPPORTUNITY POOL (OBSERVATIONAL)]');
    expect(promptArg).toContain('Fictional Time Revisions: Moment 2 | Scene Beat 1 | Extended 0');
    expect(promptArg).toContain('[PRESENT] Cast ID: char-npc1 | Objective: "Fix wiring" | Approach: "Testing cables with voltmeter"');
    expect(promptArg).toContain('[val-1] Power Grid: "Maintain power to life support" (Holder: CHARACTER)');
  });

  it('composes accepted activity and pressure manifestation blocks in deterministic order', async () => {
    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        {
          type: 'prose',
          content: 'You scan the darkness for movement.',
        },
      ],
      engine_thoughts: 'Player looking around; NPC tinkering.',
      intent_proposal: {
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      reconciliation_proposal: {
        mode: 'DIRECT_EXECUTION',
        declared_effect: 'Observing',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'ALIGNED',
        reconciliation_notes: 'Valid observation',
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: {
        kind: 'ACTIVITY',
        proposalId: 'act-1',
        castMemberId: 'char-npc1',
        locationNodeId: 'NODE_CORRIDOR',
        activitySummary: 'Mercer replaces a blown fuse with a spark',
        authorityReferences: ['CONSOLE_RULE'],
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'prose',
          content: 'Mercer jams a copper wire across the terminal with a violent shower of blue sparks.',
        },
      },
      situated_pressure_proposal: {
        kind: 'PRESSURE',
        proposalId: 'press-1',
        valueAnchorId: 'val-1',
        sourceReference: 'ACTIVITY',
        operator: 'ACCELERATE',
        affectedDimension: 'TIME',
        adverseProspect: 'Oxygen scrubber power drain accelerates',
        authorityReferences: ['CONSOLE_RULE'],
        persistenceTarget: 'PRESSURE_THREAD',
        responseWindowOpen: true,
        manifestationBlock: {
          type: 'prose',
          content: 'The overhead ventilation motor slows with a dying groan, its LED timer dropping by half.',
        },
      },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseTurnPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Narrative composition contains base + activity + pressure (3 blocks in order)
    expect(data.narrative_blocks).toHaveLength(3);
    expect(data.narrative_blocks[0].content).toContain('You scan the darkness');
    expect(data.narrative_blocks[1].content).toContain('Mercer jams a copper wire');
    expect(data.narrative_blocks[2].content).toContain('The overhead ventilation motor');

    expect(data.castActivityProposalReceipt.outcome).toBe('ACCEPTED');
    expect(data.situatedPressureReceipt.outcome).toBe('ACCEPTED');
  });

  it('rejects invalid activity and pressure proposals and ensures rejected text sentinels do not enter narrative', async () => {
    const ACTIVITY_SENTINEL = 'REJECTED_ACTIVITY_SENTINEL_FORBIDDEN_TEXT';
    const PRESSURE_SENTINEL = 'REJECTED_PRESSURE_SENTINEL_FORBIDDEN_TEXT';

    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        {
          type: 'prose',
          content: 'Base prose continues safely.',
        },
      ],
      engine_thoughts: 'Invalid proposals provided by LLM.',
      intent_proposal: {
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      reconciliation_proposal: {
        mode: 'DIRECT_EXECUTION',
        declared_effect: 'Observing',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'ALIGNED',
        reconciliation_notes: 'Valid observation',
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: {
        kind: 'ACTIVITY',
        proposalId: 'act-invalid-user',
        castMemberId: 'char-user', // User character is strictly forbidden
        activitySummary: 'User acts independently',
        perceptionPath: 'DIRECT',
        manifestationBlock: {
          type: 'prose',
          content: ACTIVITY_SENTINEL,
        },
      },
      situated_pressure_proposal: {
        kind: 'PRESSURE',
        proposalId: 'press-invalid-anchor',
        valueAnchorId: 'val-nonexistent-anchor', // Nonexistent anchor
        sourceReference: 'ACTIVITY',
        operator: 'EXPOSE',
        affectedDimension: 'SAFETY',
        adverseProspect: 'Bad things happen',
        authorityReferences: [],
        persistenceTarget: 'PRESSURE_THREAD',
        responseWindowOpen: true,
        manifestationBlock: {
          type: 'prose',
          content: PRESSURE_SENTINEL,
        },
      },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseTurnPayload),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Narrative contains ONLY the base block
    expect(data.narrative_blocks).toHaveLength(1);
    expect(data.narrative_blocks[0].content).toBe('Base prose continues safely.');

    const serialized = JSON.stringify(data);
    expect(serialized).not.toContain(ACTIVITY_SENTINEL);
    expect(serialized).not.toContain(PRESSURE_SENTINEL);

    expect(data.castActivityProposalReceipt.outcome).toBe('REJECTED');
    expect(data.situatedPressureReceipt.outcome).toBe('REJECTED');
  });
});
