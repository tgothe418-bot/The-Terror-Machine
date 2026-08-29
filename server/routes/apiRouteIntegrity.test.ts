// @vitest-environment node
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';

const mockGenerateStructuredResponse = vi.fn();
vi.mock('../utils/aiClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/aiClient')>();
  return {
    ...actual,
    generateStructuredResponse: (...args: unknown[]) => mockGenerateStructuredResponse(...args),
  };
});

import { createApp, API_DIAGNOSTIC_HEADER_NAME, API_DIAGNOSTIC_HEADER_VALUE } from '../app';
import { readTurnResponse, TurnResponseError, toTurnFailureReceipt } from '../../src/lib/turnResponseReader';
import { initialEngineState } from '../../src/core/engine/reducer';
import { captureRuntimeSnapshot } from '../../src/core/engine/snapshot';

describe('Phase 2G: Runtime API Route Integrity Suite', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
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

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      if (server) {
        server.close((err) => (err ? reject(err) : resolve()));
      } else {
        resolve();
      }
    });
  });

  describe('Diagnostic Provenance & Health', () => {
    it('serves GET /api/health with status 200, JSON content-type, and X-TTM-API: express', async () => {
      const response = await fetch(`${baseUrl}/api/health`);
      expect(response.status).toBe(200);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      const provenanceHeader = response.headers.get(API_DIAGNOSTIC_HEADER_NAME.toLowerCase());
      expect(provenanceHeader).toBe(API_DIAGNOSTIC_HEADER_VALUE);

      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.service).toBe('ttm-engine');
      expect(data.runtime).toBe('express');
      expect(typeof data.timestamp).toBe('number');
    });
  });

  describe('API Route JSON Enforcement & Fallthrough Prevention', () => {
    it('returns structured JSON 404 for unknown /api path without falling through to SPA HTML', async () => {
      const response = await fetch(`${baseUrl}/api/non-existent-route`);
      expect(response.status).toBe(404);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
      expect(contentType).not.toContain('text/html');

      const provenanceHeader = response.headers.get(API_DIAGNOSTIC_HEADER_NAME.toLowerCase());
      expect(provenanceHeader).toBe(API_DIAGNOSTIC_HEADER_VALUE);

      const data = await response.json();
      expect(data.code).toBe('API_ROUTE_NOT_FOUND');
      expect(data.error).toContain('/api/non-existent-route');
    });

    it('returns structured JSON 404 for deep unmapped subpaths under /api/turn', async () => {
      const response = await fetch(`${baseUrl}/api/turn/unmapped-subpath`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test: true }),
      });
      expect(response.status).toBe(404);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data.code).toBe('API_ROUTE_NOT_FOUND');
    });

    it('returns structured JSON 404 for root /api request', async () => {
      const response = await fetch(`${baseUrl}/api`);
      expect(response.status).toBe(404);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data.code).toBe('API_ROUTE_NOT_FOUND');
    });
  });

  describe('POST /api/turn Request Boundary Validation', () => {
    it('rejects an empty request body with HTTP 400 and structured JSON INVALID_REQUEST', async () => {
      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      const provenanceHeader = response.headers.get(API_DIAGNOSTIC_HEADER_NAME.toLowerCase());
      expect(provenanceHeader).toBe(API_DIAGNOSTIC_HEADER_VALUE);

      const data = await response.json();
      expect(data.code).toBe('INVALID_REQUEST');
      expect(data.error).toBe('Invalid turn request');
      expect(data.details).toBeDefined();
    });

    it('rejects an incomplete turn payload missing context with HTTP 400', async () => {
      const incompletePayload = {
        userAction: 'Inspect the door',
        recentHistory: 'You stand in a room.',
        systemDirective: 'Direct and clinical.',
        isExpansionExpected: false,
        stateContext: {
          currentNodeId: 'NODE_1',
          currentPhase: 'LATENT',
          tensionLevel: 1,
          reconciliationRevision: 0,
        },
      };

      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(incompletePayload),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.code).toBe('INVALID_REQUEST');
      expect(data.details).toBeDefined();
    });

    it('rejects malformed raw JSON string with HTTP 400 and MALFORMED_JSON_REQUEST', async () => {
      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"userAction": "broken json payload, missing closing brace',
      });

      expect(response.status).toBe(400);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');

      const data = await response.json();
      expect(data.code).toBe('MALFORMED_JSON_REQUEST');
      expect(data.error).toContain('Malformed JSON payload');
    });
  });

  describe('Client Response Reader & Atomic State Preservation', () => {
    it('readTurnResponse correctly parses structured 400 rejection and preserves failure code', async () => {
      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invalid: true }),
      });

      let caughtError: unknown;
      try {
        await readTurnResponse(response);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(TurnResponseError);
      const turnErr = caughtError as TurnResponseError;
      expect(turnErr.code).toBe('MODEL_CONTRACT_MISMATCH');
      expect(turnErr.status).toBe(400);
      expect(turnErr.contentType).toContain('application/json');

      const receipt = toTurnFailureReceipt(turnErr);
      expect(receipt.code).toBe('MODEL_CONTRACT_MISMATCH');
      expect(receipt.status).toBe(400);
    });

    it('readTurnResponse correctly parses structured 404 rejection and preserves failure code', async () => {
      const response = await fetch(`${baseUrl}/api/unmapped-endpoint`);

      let caughtError: unknown;
      try {
        await readTurnResponse(response);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeInstanceOf(TurnResponseError);
      const turnErr = caughtError as TurnResponseError;
      expect(turnErr.code).toBe('TURN_HTTP_FAILURE');
      expect(turnErr.status).toBe(404);
    });

    it('preserves atomic state invariance when an API request fails', async () => {
      const state = { ...initialEngineState };
      const initialSnapshot = captureRuntimeSnapshot(state);

      // Attempt turn against an endpoint with invalid payload
      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bad: 'data' }),
      });

      let caughtError: unknown;
      try {
        await readTurnResponse(response);
      } catch (err) {
        caughtError = err;
      }

      expect(caughtError).toBeDefined();

      // Ensure snapshot matches before and after (no uncommitted mutations)
      const postSnapshot = captureRuntimeSnapshot(state);
      expect(postSnapshot).toEqual(initialSnapshot);
    });
  });

  describe('Integration Smoke Checks & SPA Fallback Exclusion', () => {
    const minimalValidTurnPayload = {
      userAction: 'Examine the anomaly.',
      recentHistory: 'The room is silent.',
      systemDirective: 'Direct and ominous tone.',
      isExpansionExpected: false,
      stateContext: {
        currentNodeId: 'NODE_1',
        currentPhase: 'LATENT',
        tensionLevel: 1,
        reconciliationRevision: 0,
      },
      context: {
        scenario: {
          title: 'Station Tartarus',
          premise: 'Deep sea exploration.',
          setting: { location: 'Chamber 01', atmosphere: 'Cold', timePeriod: 'Present' },
          environmentalRules: [],
          narrativeRules: [],
        },
        player: {
          role: 'protagonist',
          characterId: 'char-1',
          name: 'Dr. Mercer',
          description: 'Lead researcher',
          isEntity: false,
        },
        userCharacter: {
          role: 'protagonist',
          characterId: 'char-1',
          name: 'Dr. Mercer',
          description: 'Lead researcher',
          isEntity: false,
        },
        cast: [
          {
            id: 'char-1',
            name: 'Dr. Mercer',
            role: 'Protagonist',
            description: '',
            isUserCharacter: true,
            isPresent: true,
          },
        ],
        topology: {
          currentNodeId: 'NODE_1',
          readableNodeLabel: 'Control Room',
          allowedOutgoingExits: [],
        },
        runtime: {
          turnNumber: 1,
          phase: 'LATENT',
          tension: 1,
          coherence: 1.0,
          reconciliationRevision: 0,
          activeVector: 'COGNITIVE',
          activeTier: 'LATENT',
        },
      },
    };

    const mockValidAiResult = {
      narrative_blocks: [
        { type: 'prose', content: 'The water presses against the thick reinforced glass.' },
      ],
      intent_proposal: {
        action_kind: 'PERCEIVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'INVESTIGATE',
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
        current_phase: 'LATENT',
        suggested_tension: 10,
        requested_transition: null,
        terminal_flags: [],
        cast_deltas: [],
        cast_ledger: [],
      },
      topologyDelta: {
        isExpansion: false,
        newNodeDef: null,
      },
    };

    it('POST /api/turn smoke check: returns status 200, application/json, and parses valid turn response', async () => {
      mockGenerateStructuredResponse.mockReset();
      mockGenerateStructuredResponse.mockResolvedValueOnce(mockValidAiResult);

      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalValidTurnPayload),
      });

      expect(response.status).toBe(200);

      const contentType = response.headers.get('content-type');
      expect(contentType).toBeDefined();
      expect(contentType).toContain('application/json');
      expect(contentType).not.toContain('text/html');

      const data = await response.json();
      expect(data).toBeDefined();
      expect(data.narrative_blocks).toHaveLength(1);
      expect(data.narrative_blocks[0].content).toContain('The water presses');
      expect(data.intentReceipt).toBeDefined();
      expect(data.transitionReceipt).toBeDefined();
    });

    it('asserts /api/turn is not HTML even when the AI provider or internal service fails (500/502)', async () => {
      mockGenerateStructuredResponse.mockReset();
      mockGenerateStructuredResponse.mockRejectedValueOnce(
        new Error('AI provider connection timeout')
      );

      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(minimalValidTurnPayload),
      });

      expect([500, 502]).toContain(response.status);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
      expect(contentType).not.toContain('text/html');

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(typeof data.error).toBe('string');
      expect(['INTERNAL_ERROR', 'PROVIDER_FAILURE']).toContain(data.code);
    });

    it('asserts GET /api/turn returns structured JSON 404 and is never HTML', async () => {
      const response = await fetch(`${baseUrl}/api/turn`, {
        method: 'GET',
      });

      expect(response.status).toBe(404);

      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('application/json');
      expect(contentType).not.toContain('text/html');

      const data = await response.json();
      expect(data.code).toBe('API_ROUTE_NOT_FOUND');
    });

    it('production SPA fallback explicitly excludes /api routes', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      let prodServer: http.Server | null = null;
      let prodUrl = '';

      try {
        const prodApp = await createApp({ enableSpaFallback: true });
        await new Promise<void>((resolve) => {
          prodServer = prodApp.listen(0, '127.0.0.1', () => {
            const addr = prodServer?.address();
            if (addr && typeof addr === 'object') {
              prodUrl = `http://127.0.0.1:${addr.port}`;
            }
            resolve();
          });
        });

        // Requesting an unknown /api subpath must return JSON 404, never HTML
        const apiResponse = await fetch(`${prodUrl}/api/turn/nonexistent`);
        expect(apiResponse.status).toBe(404);

        const contentType = apiResponse.headers.get('content-type');
        expect(contentType).toContain('application/json');
        expect(contentType).not.toContain('text/html');

        const data = await apiResponse.json();
        expect(data.code).toBe('API_ROUTE_NOT_FOUND');
      } finally {
        process.env.NODE_ENV = originalEnv;
        if (prodServer) {
          await new Promise<void>((resolve) => (prodServer as http.Server).close(() => resolve()));
        }
      }
    });
  });
});
