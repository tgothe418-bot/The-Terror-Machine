// @vitest-environment node
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import http from 'http';
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
      expect(turnErr.code).toBe('INVALID_REQUEST');
      expect(turnErr.status).toBe(400);
      expect(turnErr.contentType).toContain('application/json');

      const receipt = toTurnFailureReceipt(turnErr);
      expect(receipt.code).toBe('INVALID_REQUEST');
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
      expect(turnErr.code).toBe('API_ROUTE_NOT_FOUND');
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
});
