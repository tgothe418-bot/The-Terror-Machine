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
        runtimeState: {
          fictionalTime: {
            moment_revision: 2,
            scene_beat_revision: 1,
            extended_revision: 0,
            last_cost: 'MOMENT',
          },
          pursuitSchedule: {},
          recentActivityEvents: [],
          activePressureThreads: [],
          valueState: {},
          characterPursuits: {},
          characterDevelopment: {},
        },
        authoringBaseline: {
          valueBaselineReview: 'REVIEWED',
          pursuitReviews: {
            'char-npc1': 'REVIEWED',
          },
          valueAnchors: [
            {
              id: 'val-1',
              holder: { kind: 'CHARACTER', castMemberId: 'char-npc1' },
              label: 'Power Grid',
              description: 'Maintain power to life support',
              basisSummary: 'Technician duty',
              provenance: { kind: 'CREATOR_DEFINED' },
            },
          ],
          characterPursuits: [
            {
              id: 'pursuit-npc1',
              castMemberId: 'char-npc1',
              objective: 'Fix wiring',
              presentApproach: 'Testing cables with voltmeter',
              locationNodeId: 'NODE_CORRIDOR',
              status: 'ACTIVE',
              reviewWindow: 'MOMENT',
              triggerReferences: [],
              basisSummary: 'Technician duty',
              provenance: { kind: 'CREATOR_DEFINED' },
            },
          ],
        },
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

    // Forensics record contains the exact rejected sentinels (Packet 1-8)
    expect(data.horrorGrammarForensics).toBeDefined();
    expect(data.horrorGrammarForensics.activityEvidence.disposition).toBe('REJECTED');
    expect(data.horrorGrammarForensics.activityEvidence.manifestationBlock?.content).toBe(ACTIVITY_SENTINEL);
    expect(data.horrorGrammarForensics.pressureEvidence.disposition).toBe('REJECTED');
    expect(data.horrorGrammarForensics.pressureEvidence.manifestationBlock?.content).toBe(PRESSURE_SENTINEL);

    // Canonical isolation: sentinels are absent from every non-forensic surface
    const nonForensicResponse = { ...data, horrorGrammarForensics: undefined };
    const serializedNonForensic = JSON.stringify(nonForensicResponse);
    expect(serializedNonForensic).not.toContain(ACTIVITY_SENTINEL);
    expect(serializedNonForensic).not.toContain(PRESSURE_SENTINEL);

    expect(data.castActivityProposalReceipt.outcome).toBe('REJECTED');
    expect(data.situatedPressureReceipt.outcome).toBe('REJECTED');
  });

  it('preserves nonempty HG1 preState exactly when proposals are NONE (Proof 2)', async () => {
    const sentinelValueLedger = {
      'val-1': {
        anchorId: 'val-1',
        lifecycle: 'ACTIVE' as const,
        condition: 'THREATENED' as const,
        currentFormNote: 'Generator sputtering',
        lastCauseReference: 'EVT-01',
        lastChangedTurn: 1,
      },
    };
    const sentinelPursuitLedger = {
      'pursuit-npc1': {
        pursuitId: 'pursuit-npc1',
        castMemberId: 'char-npc1',
        currentObjective: 'Fix wiring',
        currentApproach: 'Testing cables with voltmeter',
        currentLocationNodeId: 'NODE_CORRIDOR',
        status: 'ACTIVE' as const,
        progressSummary: 'Testing primary conduit',
        lastCauseReference: 'BASELINE',
        lastActivityTurn: 1,
        lastChangedTurn: 0,
        reviewWindow: 'MOMENT' as const,
      },
    };
    const sentinelActivityEvents = [
      {
        id: 'act-evt-sentinel-01',
        castMemberId: 'char-npc1',
        pursuitId: 'pursuit-npc1',
        activitySummary: 'Mercer stripped the cable wire.',
        locationNodeId: 'NODE_CORRIDOR',
        perceptionPath: 'DIRECT' as const,
        committedTurn: 1,
        authorityReferences: [],
        wasManifested: true,
      },
    ];
    const sentinelPressureThreads = [
      {
        id: 'prs-thread-sentinel-01',
        valueAnchorId: 'val-1',
        holder: { kind: 'CHARACTER' as const, castMemberId: 'char-npc1' },
        sourceReference: 'act-evt-sentinel-01',
        operator: 'CONSTRAIN_ACCESS' as const,
        affectedDimension: 'SAFETY' as const,
        adverseProspect: 'Grid overload imminent',
        manifestationSummary: null,
        persistenceTarget: 'PRESSURE_THREAD' as const,
        status: 'OPEN' as const,
        createdTurn: 1,
        lastChangedTurn: 1,
        authorityReferences: [],
      },
    ];
    const sentinelDevelopmentLedger = {
      'char-npc1': [
        {
          id: 'dev-fact-01',
          castMemberId: 'char-npc1',
          dimension: 'ATTACHMENT' as const,
          statement: 'Committed to keeping the sub-basement alive.',
          lifecycle: 'ACTIVE' as const,
          establishedTurn: 1,
          lastChangedTurn: 1,
          causeReference: 'EVT-01',
        },
      ],
    };

    const payloadWithState = {
      ...baseTurnPayload,
      context: {
        ...baseTurnPayload.context,
        horrorGrammar: {
          ...baseTurnPayload.context.horrorGrammar,
          runtimeState: {
            fictionalTime: baseTurnPayload.context.horrorGrammar.fictionalTime,
            pursuitSchedule: {},
            recentActivityEvents: sentinelActivityEvents,
            activePressureThreads: sentinelPressureThreads,
            valueState: sentinelValueLedger,
            characterPursuits: sentinelPursuitLedger,
            characterDevelopment: sentinelDevelopmentLedger,
          },
        },
      },
    };

    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        {
          type: 'prose',
          content: 'You watch Mercer work in silence.',
        },
      ],
      engine_thoughts: 'Observing; no new HG1 actions.',
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
      cast_activity_proposal: { kind: 'NONE', reason: 'NO_OPPORTUNITY_CHOSEN' },
      situated_pressure_proposal: { kind: 'NONE', reason: 'NO_PRESSURE_CHOSEN' },
      value_state_proposal: { changes: [] },
      character_pursuit_proposal: { changes: [] },
      character_development_proposal: { changes: [] },
      pressure_transition_proposal: { transitions: [] },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadWithState),
    });

    expect(res.status).toBe(200);
    const data = await res.json();

    // Receipts must retain the sentinel pre-state and produce identical post-state (no empty fallback)
    expect(data.valueStateReceipt.preState).toEqual(sentinelValueLedger);
    expect(data.valueStateReceipt.postState).toEqual(sentinelValueLedger);

    expect(data.characterPursuitReceipt.preState).toEqual(sentinelPursuitLedger);
    expect(data.characterPursuitReceipt.postState).toEqual(sentinelPursuitLedger);

    expect(data.characterDevelopmentReceipt.preState).toEqual(sentinelDevelopmentLedger);
    expect(data.characterDevelopmentReceipt.postState).toEqual(sentinelDevelopmentLedger);

    expect(data.situatedPressureReceipt.preState).toEqual(sentinelPressureThreads);
    expect(data.situatedPressureReceipt.postState).toEqual(sentinelPressureThreads);
  });

  it('resolves valid value and pursuit proposals against authoringBaseline in typed context (Proof 3)', async () => {
    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        {
          type: 'prose',
          content: 'Mercer manages to reroute the primary conduit.',
        },
      ],
      engine_thoughts: 'Conduit repaired.',
      intent_proposal: {
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      reconciliation_proposal: {
        mode: 'DIRECT_EXECUTION',
        declared_effect: 'Observing repair',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'ALIGNED',
        reconciliation_notes: 'Observation',
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: { kind: 'NONE', reason: 'NO_OPPORTUNITY_CHOSEN' },
      situated_pressure_proposal: { kind: 'NONE', reason: 'NO_PRESSURE_CHOSEN' },
      value_state_proposal: {
        changes: [
          {
            anchorId: 'val-1',
            operation: 'RESTORE',
            proposedCondition: 'SECURED',
            causeReference: 'USER_ACTION',
            rationale: 'Conduit successfully rerouted',
          },
        ],
      },
      character_pursuit_proposal: {
        changes: [
          {
            pursuitId: 'pursuit-npc1',
            operation: 'ADVANCE',
            progressSummary: 'Conduit wiring secured and functional',
            causeReference: 'USER_ACTION',
            rationale: 'Work completed',
          },
        ],
      },
      character_development_proposal: { changes: [] },
      pressure_transition_proposal: { transitions: [] },
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

    // Value anchor resolution succeeds because authoringBaseline.valueAnchors contains 'val-1'
    expect(data.valueStateReceipt.decisions[0].outcome).toBe('APPLIED');
    expect(data.valueStateReceipt.postState['val-1'].condition).toBe('SECURED');

    // Pursuit resolution succeeds because authoringBaseline.characterPursuits contains 'pursuit-npc1'
    expect(data.characterPursuitReceipt.decisions[0].outcome).toBe('APPLIED');
    expect(data.characterPursuitReceipt.postState['pursuit-npc1'].progressSummary).toBe(
      'Conduit wiring secured and functional'
    );
  });

  it('executes consecutive turns threading state from Turn 1 to Turn 2 and retaining causal continuity (Proof 6 / Packet 1-9)', async () => {
    // -------------------------------------------------------------
    // TURN 1: Accepted activity and pressure creation
    // -------------------------------------------------------------
    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        { type: 'prose', content: 'You check the readouts near the generator.' },
      ],
      engine_thoughts: 'Mercer acts on power restoration.',
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
        reconciliation_notes: 'Observation aligned',
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: {
        kind: 'ACTIVITY',
        proposalId: 'prop-act-turn1',
        castMemberId: 'char-npc1',
        pursuitId: 'pursuit-npc1',
        locationNodeId: 'NODE_CORRIDOR',
        perceptionPath: 'DIRECT',
        activitySummary: 'Mercer connects jumper cables across the generator terminals.',
        authorityReferences: ['opp-present-char-npc1'],
        manifestationBlock: {
          type: 'dialogue',
          speaker: 'Mercer',
          content: 'Keep back, the terminals are live!',
        },
      },
      situated_pressure_proposal: {
        kind: 'PRESSURE',
        proposalId: 'prop-press-turn1',
        valueAnchorId: 'val-1',
        sourceReference: 'ACTIVITY',
        operator: 'EXPOSE',
        affectedDimension: 'SAFETY',
        adverseProspect: 'Sparks ignite fuel vapors near the generator',
        authorityReferences: ['val-1'],
        persistenceTarget: 'PRESSURE_THREAD',
        responseWindowOpen: true,
        manifestationBlock: {
          type: 'prose',
          content: 'A shower of sparks arcs across the damp concrete floor.',
        },
      },
      value_state_proposal: {
        changes: [
          {
            anchorId: 'val-1',
            operation: 'SET_CONDITION',
            proposedCondition: 'THREATENED',
            causeReference: 'ACTIVITY',
            rationale: 'Live sparking terminals',
          },
        ],
      },
      character_pursuit_proposal: {
        changes: [
          {
            pursuitId: 'pursuit-npc1',
            operation: 'ADVANCE',
            progressSummary: 'Jumper cables attached',
            causeReference: 'ACTIVITY',
            rationale: 'Connecting terminals',
          },
        ],
      },
      character_development_proposal: {
        changes: [
          {
            castMemberId: 'char-npc1',
            operation: 'ESTABLISH',
            dimension: 'ATTACHMENT',
            statement: 'Willing to risk shock to save the generator.',
            causeReference: 'ACTIVITY',
            rationale: 'Direct action taken',
          },
        ],
      },
      pressure_transition_proposal: { transitions: [] },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const resTurn1 = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseTurnPayload),
    });

    expect(resTurn1.status).toBe(200);
    const dataTurn1 = await resTurn1.json();

    // Verify Turn 1 receipts & state
    expect(dataTurn1.castActivityProposalReceipt.outcome).toBe('ACCEPTED');
    expect(dataTurn1.castActivityProposalReceipt.admittedManifestation).toBe(true);
    const acceptedEventId = dataTurn1.castActivityProposalReceipt.acceptedEventId;
    expect(acceptedEventId).toBeTruthy();

    expect(dataTurn1.situatedPressureReceipt.outcome).toBe('ACCEPTED');
    expect(dataTurn1.situatedPressureReceipt.admittedManifestation).toBe(true);
    const acceptedThreadId = dataTurn1.situatedPressureReceipt.acceptedThreadId;
    expect(acceptedThreadId).toBeTruthy();

    expect(dataTurn1.valueStateReceipt.postState['val-1'].condition).toBe('THREATENED');
    expect(dataTurn1.characterPursuitReceipt.postState['pursuit-npc1'].progressSummary).toBe('Jumper cables attached');
    expect(dataTurn1.characterDevelopmentReceipt.postState['char-npc1']).toHaveLength(1);

    // Verify Turn 1 composed narrative has all 3 blocks (base + activity + pressure)
    expect(dataTurn1.narrative_blocks).toHaveLength(3);

    // Verify Turn 1 forensics
    expect(dataTurn1.horrorGrammarForensics).toBeDefined();
    expect(dataTurn1.horrorGrammarForensics.activityEvidence.disposition).toBe('ACCEPTED');
    expect(dataTurn1.horrorGrammarForensics.pressureEvidence.disposition).toBe('ACCEPTED');

    // -------------------------------------------------------------
    // TURN 2: Thread Turn 1 post-state into Turn 2 pre-state & resolve thread
    // -------------------------------------------------------------
    const turn2RuntimeState = {
      fictionalTime: {
        moment_revision: 1,
        scene_beat_revision: 0,
        extended_revision: 0,
        last_cost: 'MOMENT' as const,
      },
      pursuitSchedule: {},
      recentActivityEvents: dataTurn1.castActivityProposalReceipt.postState,
      activePressureThreads: dataTurn1.situatedPressureReceipt.postState,
      valueState: dataTurn1.valueStateReceipt.postState,
      characterPursuits: dataTurn1.characterPursuitReceipt.postState,
      characterDevelopment: dataTurn1.characterDevelopmentReceipt.postState,
    };

    const turn2Payload = {
      ...baseTurnPayload,
      context: {
        ...baseTurnPayload.context,
        runtime: {
          ...baseTurnPayload.context.runtime,
          turnNumber: 2,
        },
        horrorGrammar: {
          ...baseTurnPayload.context.horrorGrammar,
          runtimeState: turn2RuntimeState,
          fictionalTime: turn2RuntimeState.fictionalTime,
        },
      },
    };

    mockGenerateStructuredResponse.mockResolvedValueOnce({
      narrative_blocks: [
        { type: 'prose', content: 'You use the fire extinguisher to suppress the sparks.' },
      ],
      engine_thoughts: 'Extinguishing sparks resolves the hazard.',
      intent_proposal: {
        action_kind: 'SUPPRESS',
        action_subtype: null,
        pressure_direction: 'DEFUSE',
        dramatic_tactic: 'NONE',
        intent_synergy: 'SUCCESS',
      },
      reconciliation_proposal: {
        mode: 'DIRECT_EXECUTION',
        declared_effect: 'Suppressed hazard',
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'ALIGNED',
        reconciliation_notes: 'Hazard successfully defused',
      },
      consequence_proposal: { mutations: [] },
      character_stance_proposal: { changes: [] },
      character_relationship_proposal: { changes: [] },
      character_memory_proposal: { candidates: [] },
      world_memory_proposal: { candidates: [] },
      cast_activity_proposal: { kind: 'NONE', reason: 'NO_OPPORTUNITY_CHOSEN' },
      situated_pressure_proposal: { kind: 'NONE', reason: 'NO_PRESSURE_CHOSEN' },
      value_state_proposal: {
        changes: [
          {
            anchorId: 'val-1',
            operation: 'RESTORE',
            proposedCondition: 'SECURED',
            causeReference: 'USER_ACTION',
            rationale: 'Hazard defused by extinguisher',
          },
        ],
      },
      character_pursuit_proposal: { changes: [] },
      character_development_proposal: { changes: [] },
      pressure_transition_proposal: {
        transitions: [
          {
            threadId: acceptedThreadId!,
            proposedStatus: 'RESOLVED',
            causeReference: 'USER_ACTION',
            rationale: 'Suppressed sparks with fire extinguisher',
          },
        ],
      },
      logic_state: {
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
    });

    const resTurn2 = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(turn2Payload),
    });

    expect(resTurn2.status).toBe(200);
    const dataTurn2 = await resTurn2.json();

    // Verify Turn 2 receipts & resolved thread
    expect(dataTurn2.pressureThreadTransitionReceipt.decisions).toHaveLength(1);
    expect(dataTurn2.pressureThreadTransitionReceipt.decisions[0].outcome).toBe('APPLIED');
    expect(dataTurn2.pressureThreadTransitionReceipt.postState[0].status).toBe('RESOLVED');

    // Value anchor restored to SECURED
    expect(dataTurn2.valueStateReceipt.decisions[0].outcome).toBe('APPLIED');
    expect(dataTurn2.valueStateReceipt.postState['val-1'].condition).toBe('SECURED');

    // Continuity preserved from Turn 1: pursuit and development ledgers remain populated
    expect(dataTurn2.characterPursuitReceipt.postState['pursuit-npc1'].progressSummary).toBe('Jumper cables attached');
    expect(dataTurn2.characterDevelopmentReceipt.postState['char-npc1']).toHaveLength(1);

    // Forensics on Turn 2 shows Turn 2 identity and resolution
    expect(dataTurn2.horrorGrammarForensics.turnNumber).toBe(2);
    expect(dataTurn2.horrorGrammarForensics.activityEvidence.disposition).toBe('NONE');
    expect(dataTurn2.horrorGrammarForensics.pressureEvidence.disposition).toBe('NONE');
    expect(dataTurn2.horrorGrammarForensics.causalDecisions.pressureTransitions).toHaveLength(1);
    expect(dataTurn2.horrorGrammarForensics.causalDecisions.valueDecisions).toHaveLength(1);
  });
});
