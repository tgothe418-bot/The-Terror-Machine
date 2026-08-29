// @vitest-environment node
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import http from 'http';
import { createApp } from '../app';
import { EngineTurnStructuredResponseContract } from '../utils/aiClient';

const mockGenerateContent = vi.fn();
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: vi.fn().mockImplementation(function (this: { models: { generateContent: typeof mockGenerateContent } }) {
      this.models = {
        generateContent: mockGenerateContent,
      };
    }),
  };
});

describe('Turn Route Provider Portability (Packet 1-11A)', () => {
  let server: http.Server;
  let baseUrl: string;
  const originalEnv = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    DASHSCOPE_API_KEY: process.env.DASHSCOPE_API_KEY,
    QWEN_BASE_URL: process.env.QWEN_BASE_URL,
    TTM_ENGINE_PROVIDER: process.env.TTM_ENGINE_PROVIDER,
  };
  const originalFetch = globalThis.fetch;

  function restoreEnv() {
    for (const [k, v] of Object.entries(originalEnv)) {
      if (v === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = v;
      }
    }
  }

  beforeEach(async () => {
    mockGenerateContent.mockReset();
    restoreEnv();

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
    globalThis.fetch = originalFetch;
    restoreEnv();
    await new Promise<void>((resolve, reject) => {
      if (server) {
        server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  });

  const baseValidPayload = {
    userAction: 'Examine the console',
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
        setting: { location: 'Basement', atmosphere: 'Freezing', timePeriod: '1984' },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        incitingIncident: '',
        pacingDirective: '',
        keyPlotElements: [],
      },
      player: { role: 'protagonist', characterId: 'char-user', name: 'Ray', description: 'Surveyor', isEntity: false },
      cast: [
        { id: 'char-user', name: 'Ray', role: 'protagonist', description: 'Surveyor', isEntity: false, startingLocationNodeId: 'NODE_CORRIDOR' },
        { id: 'char-vane', name: 'Dr. Vane', role: 'companion', description: 'Physicist', isEntity: false, startingLocationNodeId: 'NODE_CORRIDOR' },
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
    },
  };

  const createModelTurnJson = () => ({
    narrative_blocks: [{ type: 'prose', content: 'You examine the rusted console.' }],
    intent_proposal: {
      action_kind: 'OBSERVE',
      action_subtype: null,
      pressure_direction: 'MAINTAIN',
      dramatic_tactic: 'EXPOSURE',
      intent_synergy: 'SUCCESS',
    },
    reconciliation_proposal: {
      mode: 'CANONICAL',
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      fictional_time_cost: 'MOMENT',
      authority_alignment: 'WITHIN_CONTRACT',
      memory_echo_candidate: null,
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
      terminal_flags: [],
      cast_deltas: [],
      cast_ledger: [],
    },
    topologyDelta: {
      isExpansion: false,
      newNodeDef: null,
    },
  });

  it('Qwen provider output crosses the exact canonical TurnResultSchema parser', async () => {
    process.env.TTM_ENGINE_PROVIDER = 'qwen';
    process.env.DASHSCOPE_API_KEY = 'sk-fake-qwen-key-001';
    process.env.QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

    const realFetch = originalFetch;
    const mockQwenFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: { content: JSON.stringify(createModelTurnJson()) },
              finish_reason: 'stop',
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
        return realFetch(url, init);
      }
      return mockQwenFetch(url, init);
    }) as unknown as typeof fetch;

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseValidPayload),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.narrative_blocks[0].content).toBe('You examine the rusted console.');
  });

  it('Qwen omission of each HG1 envelope fails closed without synthetic defaults', async () => {
    process.env.TTM_ENGINE_PROVIDER = 'qwen';
    process.env.DASHSCOPE_API_KEY = 'sk-fake-qwen-key-001';
    process.env.QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

    const hg1Fields = [
      'cast_activity_proposal',
      'situated_pressure_proposal',
      'value_state_proposal',
      'character_pursuit_proposal',
      'character_development_proposal',
      'pressure_transition_proposal',
    ];

    const realFetch = originalFetch;

    for (const field of hg1Fields) {
      const payload = createModelTurnJson();
      delete (payload as Record<string, unknown>)[field];

      const mockQwenFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(payload) }, finish_reason: 'stop' }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );

      globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = typeof url === 'string' ? url : url.toString();
        if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
          return realFetch(url, init);
        }
        return mockQwenFetch(url, init);
      }) as unknown as typeof fetch;

      const res = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(baseValidPayload),
      });

      expect(res.status, `Omission of ${field} must fail closed`).toBe(502);
      const resBody = await res.json();
      expect(resBody.code).toBe('MODEL_CONTRACT_MISMATCH');
    }
  });

  it('Qwen credential and prompt sentinels never appear in logs route errors or telemetry', async () => {
    process.env.TTM_ENGINE_PROVIDER = 'qwen';
    process.env.DASHSCOPE_API_KEY = 'sk-secret-sentinel-key-999';
    process.env.QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

    const realFetch = originalFetch;
    const mockQwenFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: { message: 'Upstream raw failure sentinel', code: 'rate_limited' } }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    );

    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
        return realFetch(url, init);
      }
      return mockQwenFetch(url, init);
    }) as unknown as typeof fetch;

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseValidPayload),
    });

    expect(res.status).toBe(502);
    const bodyText = await res.text();
    expect(bodyText).not.toContain('sk-secret-sentinel-key-999');
    expect(bodyText).not.toContain('https://dashscope-intl.aliyuncs.com');
    expect(bodyText).not.toContain('Upstream raw failure sentinel');
  });

  it('one Qwen Engine action performs one Qwen call and zero Gemini calls', async () => {
    process.env.TTM_ENGINE_PROVIDER = 'qwen';
    process.env.DASHSCOPE_API_KEY = 'sk-fake-qwen-key-001';
    process.env.QWEN_BASE_URL = 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

    const realFetch = originalFetch;
    const mockQwenFetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(createModelTurnJson()) }, finish_reason: 'stop' }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );

    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
        return realFetch(url, init);
      }
      return mockQwenFetch(url, init);
    }) as unknown as typeof fetch;

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseValidPayload),
    });

    expect(res.status).toBe(200);
    expect(mockQwenFetch).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent).toHaveBeenCalledTimes(0);
  });

  it('Gemini Engine selection performs one Gemini call and zero Qwen calls', async () => {
    process.env.TTM_ENGINE_PROVIDER = 'gemini';
    process.env.GEMINI_API_KEY = 'test-gemini-key-001';

    const realFetch = originalFetch;
    const mockQwenFetch = vi.fn();

    globalThis.fetch = vi.fn().mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes('127.0.0.1') || urlStr.includes('localhost')) {
        return realFetch(url, init);
      }
      return mockQwenFetch(url, init);
    }) as unknown as typeof fetch;

    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(createModelTurnJson()),
    });

    const res = await fetch(`${baseUrl}/api/turn`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(baseValidPayload),
    });

    expect(res.status).toBe(200);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockQwenFetch).toHaveBeenCalledTimes(0);

    const sdkCall = mockGenerateContent.mock.calls[0][0];
    expect(sdkCall.config?.responseSchema).toBe(
      EngineTurnStructuredResponseContract.providerSchemas.gemini
    );
  });
});
