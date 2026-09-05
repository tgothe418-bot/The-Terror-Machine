import http from 'http';
import { describe, expect, it, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createApp } from '../app';

const mockGenerateStructuredResponse = vi.fn();
vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    generateStructuredResponse: (...args: unknown[]) => mockGenerateStructuredResponse(...args),
  };
});

import { buildEngineTurnContext } from '../../src/lib/buildEngineTurnContext';
import { normalizeBlueprint } from '../../src/lib/normalizeBlueprint';
import { calculatePhysicsState } from '../../src/core/matrix/physicsMatrix';
import { Blueprint } from '../../src/types';

describe('Turn Route Scenario-Governed Physics (Packet 09 Acceptance)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = await createApp({ enableSpaFallback: false });
    await new Promise<void>((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        const address = server.address();
        if (address && typeof address === 'object') {
          baseUrl = `http://127.0.0.1:${address.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const groundedBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_submarine_grounded',
    title: 'Submarine K-429',
    setting: {
      location: 'Engine Room B',
      atmosphere: 'Freezing, diesel fumes',
      timePeriod: '1978',
    },
    environmentalRules: [
      'Strict physical realism; hull integrity is finite',
      'No supernatural occurrences; strictly mortal engineering horror',
    ],
    cast: [
      {
        id: 'char_petrov',
        name: 'Chief Petrov',
        role: 'Engineer',
        description: 'Chief mechanical engineer',
        personality: 'Methodical',
        goals: 'Contain the hull breach',
        traits: ['Pragmatic'],
        isEntity: false,
      },
    ],
  });

  const supernaturalBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_manor_supernatural',
    title: 'Ashford Manor',
    setting: {
      location: 'Drawing Room',
      atmosphere: 'Choking dust, freezing drafts',
      timePeriod: '1923',
    },
    environmentalRules: [
      'The Spectral Shade can move small metal objects and extinguish candles',
    ],
    cast: [
      {
        id: 'char_mortal',
        name: 'Edgar',
        role: 'Investigator',
        description: 'Paranormal skeptic',
        personality: 'Nervous',
        goals: 'Survive the night',
        traits: ['Analytical'],
        isEntity: false,
      },
      {
        id: 'char_shade',
        name: 'The Spectral Shade',
        role: 'Entity',
        description: 'A bound poltergeist',
        personality: 'Territorial',
        goals: 'Frighten intruders',
        traits: ['Spectral'],
        isEntity: true,
      },
    ],
  });

  const uncertaintyBlueprint: Blueprint = normalizeBlueprint({
    id: 'bp_cabin_uncertainty',
    title: 'Lookout Tower 9',
    setting: {
      location: 'Observation Deck',
      atmosphere: 'Blinding snow, static radio',
      timePeriod: '1989',
    },
    depictionContract: {
      dramaticRegister: 'Psychological ambiguity',
      directness: 'Sensory and grounded',
      aftermath: 'Paranoid uncertainty',
      ambiguityHandling: 'Deliberate ambiguity: whether scratches and sounds are wild animals or delusions is never confirmed',
      specialBoundaries: '',
    },
    ambiguities: [
      {
        id: 'amb_window_shadow',
        category: 'Perception',
        question: 'Was the shape at the window a person, a branch, or a hallucination?',
        resolutionMode: 'CONTEXTUAL_DISCRETION',
        guidance: 'Preserve ambiguity; do not declare canonical proof',
      },
    ],
    cast: [
      {
        id: 'char_ranger',
        name: 'Ranger Hayes',
        role: 'Ranger',
        description: 'Solo fire ranger',
        personality: 'Exhausted',
        goals: 'Wait out the storm',
        traits: ['Vigilant'],
        isEntity: false,
      },
    ],
  });

  const defaultMockResponse = {
    narrative_blocks: [
      { type: 'prose', content: 'You secure the bulkhead latch with trembling hands.' },
    ],
    engine_thoughts: 'Player reinforces door against rising water.',
    logic_state: {
      current_phase: 'LATENT',
      suggested_tension: 50,
      requested_transition: null,
      cast_deltas: [],
    },
    intent_proposal: {
      action_kind: 'MANIPULATE',
      action_subtype: null,
      intent_synergy: 'HARMONIOUS',
    },
    reconciliation_proposal: {
      mode: 'PERCEPTUAL_CONTINUITY',
      feasibility: 'FEASIBLE',
      reason_code: 'LOGICAL_CONSENSUS',
      authority_alignment: 'ALIGNED',
      pressure_direction: 'SUSTAIN',
      fictional_time_cost: 'MOMENT',
      memory_echo_candidate: null,
    },
    consequence_proposal: { mutations: [] },
    character_stance_proposal: { changes: [] },
    character_relationship_proposal: { changes: [] },
    character_memory_proposal: { candidates: [] },
    world_memory_proposal: { candidates: [] },
    cast_activity_proposal: { kind: 'NONE', reason: 'No eligible actor.' },
    situated_pressure_proposal: { kind: 'NONE', reason: 'No active threat event.' },
    value_state_proposal: { changes: [] },
    character_pursuit_proposal: { changes: [] },
    character_development_proposal: { changes: [] },
    pressure_transition_proposal: { transitions: [] },
  };

  it('1. Grounded horror: prompt receives grounded directive at low and high tension without impossible physics overrides', async () => {
    mockGenerateStructuredResponse.mockResolvedValue(defaultMockResponse);

    // Turn at High Tension (90)
    const physicsHigh = calculatePhysicsState(90, 0.5, { blueprint: groundedBlueprint });
    const contextHigh = buildEngineTurnContext({
      blueprint: groundedBlueprint,
      selectedRole: 'protagonist',
      selectedCharacterId: 'char_petrov',
      runtimeState: { tension: 90, coherence: 0.5, phase: 'MANIFEST', turnNumber: 2 },
    });

    const responseHigh = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAction: 'Tighten the secondary valve against the spray',
        recentHistory: 'Water is pooling at your ankles.',
        systemDirective: physicsHigh.generativeDirective,
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ORIGIN',
          currentPhase: 'MANIFEST',
          tensionLevel: 90,
          reconciliationRevision: 0,
          activeVector: 'SOMATIC',
          activeTier: 'MANIFEST',
        },
        context: contextHigh,
      }),
    });

    expect(responseHigh.status).toBe(200);

    const callArgs = mockGenerateStructuredResponse.mock.calls[0];
    const generatedPrompt = callArgs[0] as string;

    // Must contain grounded directive with acute pressure
    expect(generatedPrompt).toContain('SCENARIO PHYSICS DIRECTIVE: GROUNDED (ACUTE PRESSURE)');
    expect(generatedPrompt).toContain('Strictly enforce consensus physical laws, Euclidean geometry, and material resistance');
    expect(generatedPrompt).toContain('Do NOT bypass normal physics, warp spatial geometry, or spawn impossible entities');

    // Must NOT contain old ONTOLOGICAL_SHEAR universal directives
    expect(generatedPrompt).not.toContain('PHYSICS OVERRIDE: ONTOLOGICAL SHEAR');
    expect(generatedPrompt).not.toContain('Bypass normal physical constraints');
    expect(generatedPrompt).not.toContain('Gravity, time, and spatial geometry are fluid');
    expect(generatedPrompt).not.toContain('Spawn impossible entities');
  });

  it('2. Scoped supernatural: prompt receives scoped supernatural directive restricting anomalies to authored scope', async () => {
    mockGenerateStructuredResponse.mockResolvedValue(defaultMockResponse);

    const physicsSuper = calculatePhysicsState(80, 0.4, { blueprint: supernaturalBlueprint });
    const contextSuper = buildEngineTurnContext({
      blueprint: supernaturalBlueprint,
      selectedRole: 'protagonist',
      selectedCharacterId: 'char_mortal',
      runtimeState: { tension: 80, coherence: 0.4, phase: 'MANIFEST', turnNumber: 3 },
    });

    const response = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAction: 'Listen closely to the cold draft near the mirror',
        recentHistory: 'A candlestick clattered across the desk.',
        systemDirective: physicsSuper.generativeDirective,
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ORIGIN',
          currentPhase: 'MANIFEST',
          tensionLevel: 80,
          reconciliationRevision: 0,
          activeVector: 'COGNITIVE',
          activeTier: 'MANIFEST',
        },
        context: contextSuper,
      }),
    });

    expect(response.status).toBe(200);

    const callArgs = mockGenerateStructuredResponse.mock.calls[0];
    const generatedPrompt = callArgs[0] as string;

    expect(generatedPrompt).toContain('SCENARIO PHYSICS DIRECTIVE: SCOPED SUPERNATURAL (ACUTE MANIFESTATION)');
    expect(generatedPrompt).toContain('Authored supernatural forces operate at peak intensity');
    expect(generatedPrompt).toContain('Do not grant universal omnipotence, unauthored spatial rewrites, or impossible powers');
  });

  it('3. Deliberate uncertainty: prompt preserves ambiguity and forbids declaring ungrounded physical mutations', async () => {
    mockGenerateStructuredResponse.mockResolvedValue(defaultMockResponse);

    const physicsUncertain = calculatePhysicsState(75, 0.6, { blueprint: uncertaintyBlueprint });
    const contextUncertain = buildEngineTurnContext({
      blueprint: uncertaintyBlueprint,
      selectedRole: 'protagonist',
      selectedCharacterId: 'char_ranger',
      runtimeState: { tension: 75, coherence: 0.6, phase: 'MANIFEST', turnNumber: 4 },
    });

    const response = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAction: 'Shine flashlight toward the dark treeline outside',
        recentHistory: 'A heavy thud sounded against the outer ladder.',
        systemDirective: physicsUncertain.generativeDirective,
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ORIGIN',
          currentPhase: 'MANIFEST',
          tensionLevel: 75,
          reconciliationRevision: 0,
          activeVector: 'COGNITIVE',
          activeTier: 'MANIFEST',
        },
        context: contextUncertain,
      }),
    });

    expect(response.status).toBe(200);

    const callArgs = mockGenerateStructuredResponse.mock.calls[0];
    const generatedPrompt = callArgs[0] as string;

    expect(generatedPrompt).toContain('SCENARIO PHYSICS DIRECTIVE: DELIBERATE UNCERTAINTY (ACUTE PARANOIA)');
    expect(generatedPrompt).toContain('Distinguish vivid perception from physical reality');
    expect(generatedPrompt).toContain('Authoritative physical reality remains grounded while subjective experience fractures');
  });

  it('4. Contradictory prose / unsupported transition: suppresses impossible structured changes cleanly', async () => {
    // Model proposes an impossible spatial transition through a solid wall / non-existent exit
    const impossibleTransitionResponse = {
      ...defaultMockResponse,
      narrative_blocks: [
        { type: 'prose', content: 'You try to walk through the steel bulkhead into the sea.' },
      ],
      logic_state: {
        ...defaultMockResponse.logic_state,
        requested_transition: 'IMPOSSIBLE_OCEAN_DEPTHS', // No such exit exists!
      },
      topologyDelta: { isExpansion: true, newNodeDef: { id: 'OCEAN', label: 'Sea' } }, // Unauthorized expansion
    };

    mockGenerateStructuredResponse.mockResolvedValue(impossibleTransitionResponse);

    const physics = calculatePhysicsState(50, 0.8, { blueprint: groundedBlueprint });
    const context = buildEngineTurnContext({
      blueprint: groundedBlueprint,
      selectedRole: 'protagonist',
      selectedCharacterId: 'char_petrov',
      runtimeState: { tension: 50, coherence: 0.8, phase: 'LATENT', turnNumber: 1 },
    });

    const response = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userAction: 'Step into the ocean through the bulkhead wall',
        recentHistory: '',
        systemDirective: physics.generativeDirective,
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'ORIGIN',
          currentPhase: 'LATENT',
          tensionLevel: 50,
          reconciliationRevision: 0,
          activeVector: 'SOMATIC',
          activeTier: 'LATENT',
        },
        context,
      }),
    });

    expect(response.status).toBe(200);
    const body = await response.json();

    // The unsupported transition MUST be rejected by causal reconciliation
    expect(body.logic_state.requested_transition).toBeNull();
    expect(body.topologyDelta.isExpansion).toBe(false);
    expect(body.narrativeReconciliationReceipt.mode).toBe('EXPERIENTIAL_REANCHORED');
  });
});
