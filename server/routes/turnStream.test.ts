import http from 'http';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createApp } from '../app';
import { ProviderRefusalError } from '../utils/aiClient';

const mockGenerateStructuredResponse = vi.fn();
vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    generateStructuredResponse: (...args: unknown[]) => mockGenerateStructuredResponse(...args),
  };
});

describe('SSE Turn Streaming Route (POST /api/turn-stream)', () => {
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

  const validModelResponse = {
    engine_thoughts: 'Player inspects the metal console.',
    narrative_blocks: [
      { id: 'b1', type: 'prose', content: 'You examine the cold iron console.' },
      { id: 'b2', type: 'dialogue', speaker: 'Elena', content: 'Do you see any power dials?' },
    ],
    intent_proposal: {
      action_kind: 'INVESTIGATE',
      intended_effect: 'Inspect console',
      target_entity: null,
      fictional_cost: 'MOMENT',
    },
    reconciliation_proposal: {
      mode: 'CANONICAL',
      reason_code: 'VALID_INVESTIGATION',
      authority_alignment: 'ALIGNED',
      explanation: 'Action matches physical reality.',
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
      reason: 'No offscreen activity',
    },
    situated_pressure_proposal: {
      kind: 'NONE',
      reason: 'No situated pressure',
    },
    value_state_proposal: {
      changes: [],
    },
    character_pursuit_proposal: {
      changes: [],
    },
    character_development_proposal: {
      changes: [],
    },
    pressure_transition_proposal: {
      transitions: [],
    },
    logic_state: {
      current_phase: 'MANIFEST',
      requested_transition: null,
      suggested_tension: 25,
      terminal_flags: [],
      cast_deltas: [],
    },
    topologyDelta: {
      isExpansion: false,
      newNodeDef: null,
    },
  };

  const validTurnPayload = {
    userAction: 'Inspect the iron console',
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
          id: 'char-elena',
          name: 'Elena',
          role: 'Companion',
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
        activityEligibility: {
          version: 1,
          presentOpportunities: [
            {
              castMemberId: 'char-elena',
              opportunityKind: 'PRESENT',
              locationNodeId: 'NODE_CORRIDOR',
              pursuitId: 'pursuit-elena',
              objective: 'Fix wiring',
              presentApproach: 'Testing cables with voltmeter',
              reviewWindow: 'MOMENT',
              referencedValueIds: ['val-1'],
            },
          ],
          offscreenOpportunities: [],
          boundedOutPursuitIds: [],
          dormantCount: 0,
          notDueCount: 0,
          ledgerSnapshot: {
            moment_revision: 2,
            scene_beat_revision: 1,
            extended_revision: 0,
            last_cost: 'MOMENT',
          },
          scheduleSnapshotRevision: 1,
        },
        presentActorOpportunities: [
          {
            castMemberId: 'char-elena',
            opportunityKind: 'PRESENT',
            locationNodeId: 'NODE_CORRIDOR',
            pursuitId: 'pursuit-elena',
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
            holder: { kind: 'CHARACTER', castMemberId: 'char-elena' },
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
            'char-elena': 'REVIEWED',
          },
          valueAnchors: [
            {
              id: 'val-1',
              holder: { kind: 'CHARACTER', castMemberId: 'char-elena' },
              label: 'Power Grid',
              description: 'Maintain power to life support',
              basisSummary: 'Technician duty',
              provenance: { kind: 'CREATOR_DEFINED' },
            },
          ],
          characterPursuits: [
            {
              id: 'pursuit-elena',
              castMemberId: 'char-elena',
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

  it('streams SSE tokens and finishes with a complete event containing valid TurnResponse', async () => {
    mockGenerateStructuredResponse.mockResolvedValueOnce(validModelResponse);

    const response = await fetch(`${baseUrl}/api/turn-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validTurnPayload),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    expect(response.headers.get('cache-control')).toContain('no-cache');

    const text = await response.text();
    expect(text).toContain('event: token');
    expect(text).toContain('event: complete');

    // Parse SSE frames
    const lines = text.split('\n');
    const tokens: string[] = [];
    let completePayload: Record<string, unknown> | null = null;

    let currentEvent = '';
    for (const line of lines) {
      if (line.startsWith('event:')) {
        currentEvent = line.replace('event:', '').trim();
      } else if (line.startsWith('data:')) {
        const dataStr = line.replace('data:', '').trim();
        const data = JSON.parse(dataStr);
        if (currentEvent === 'token') {
          tokens.push(data.token);
        } else if (currentEvent === 'complete') {
          completePayload = data;
        }
      }
    }

    expect(tokens.length).toBeGreaterThan(0);
    expect(tokens.join('')).toContain('examine the cold iron console');
    expect(completePayload).not.toBeNull();
    expect(completePayload.narrative_blocks).toHaveLength(2);
    expect(completePayload.transitionReceipt).toBeDefined();
    expect(completePayload.intentReceipt).toBeDefined();
  });

  it('returns 400 Bad Request on malformed payload', async () => {
    const response = await fetch(`${baseUrl}/api/turn-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalid: 'payload' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('INVALID_REQUEST');
  });

  it('emits error event via SSE when provider refuses generation', async () => {
    mockGenerateStructuredResponse.mockRejectedValueOnce(
      new ProviderRefusalError('Content policy violation')
    );

    const response = await fetch(`${baseUrl}/api/turn-stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validTurnPayload),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    const text = await response.text();
    expect(text).toContain('event: error');
    expect(text).toContain('PROVIDER_REFUSAL');
  });
});
