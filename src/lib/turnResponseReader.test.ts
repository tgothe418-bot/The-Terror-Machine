import { describe, it, expect } from 'vitest';
import {
  readTurnResponse,
  createNetworkTurnError,
  toTurnFailureReceipt,
  formatTurnFailureMessage,
  TurnResponseError,
  SAFE_UNEXPECTED_TURN_MESSAGE,
  SAFE_NETWORK_ERROR_MESSAGE,
} from './turnResponseReader';

describe('turnResponseReader', () => {
  it('1. parses a successful JSON turn response normally', async () => {
    const validTurnData = {
      narrative_blocks: [{ type: 'sensory', content: 'Dust swirls in the cold light.' }],
      engine_thoughts: 'Player enters quiet room.',
      logic_state: {
        current_phase: 'MANIFEST',
        suggested_tension: 30,
        requested_transition: null,
      },
      topologyDelta: { isExpansion: false, newNodeDef: null },
    };

    const response = new Response(JSON.stringify(validTurnData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const result = await readTurnResponse<typeof validTurnData>(response);
    expect(result).toEqual(validTurnData);
  });

  it('2. classifies HTTP 200 with text/html as NON_JSON_TURN_RESPONSE and never leaks HTML in message', async () => {
    const rawHtml = '<!doctype html><html><body><h1>Proxy Gateway 200</h1><p>Fallback landing</p></body></html>';
    const response = new Response(rawHtml, {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(response);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('NON_JSON_TURN_RESPONSE');
    expect(caughtError?.status).toBe(200);
    expect(caughtError?.contentType).toContain('text/html');
    expect(caughtError?.message).toBe(SAFE_UNEXPECTED_TURN_MESSAGE);
    expect(caughtError?.message).not.toContain('<!doctype');
    expect(caughtError?.message).not.toContain('<html');
  });

  it('3. classifies a non-2xx HTML response as NON_JSON_TURN_RESPONSE without leaking body', async () => {
    const rawHtml502 = '<!DOCTYPE html><html><head><title>502 Bad Gateway</title></head><body><h1>502 Bad Gateway</h1>Cloud Run proxy error</body></html>';
    const response = new Response(rawHtml502, {
      status: 502,
      headers: { 'Content-Type': 'text/html' },
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(response);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('NON_JSON_TURN_RESPONSE');
    expect(caughtError?.status).toBe(502);
    expect(caughtError?.contentType).toBe('text/html');
    expect(caughtError?.message).toBe(SAFE_UNEXPECTED_TURN_MESSAGE);
    expect(caughtError?.message).not.toContain('502 Bad Gateway');
    expect(caughtError?.message).not.toContain('Cloud Run');
  });

  it('4. classifies invalid JSON with application/json as MALFORMED_TURN_RESPONSE without leaking parser error', async () => {
    const malformedBody = '{"incomplete": true, "truncated';
    const response = new Response(malformedBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(response);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('MALFORMED_TURN_RESPONSE');
    expect(caughtError?.status).toBe(200);
    expect(caughtError?.contentType).toBe('application/json');
    expect(caughtError?.message).toBe(SAFE_UNEXPECTED_TURN_MESSAGE);
    expect(caughtError?.message).not.toContain('Unexpected end of JSON');
    expect(caughtError?.message).not.toContain('is not valid JSON');
  });

  it('5. preserves server error code and safe message from structured JSON errors', async () => {
    const errorPayload = {
      error: 'Model output violated schema contract',
      code: 'MODEL_CONTRACT_MISMATCH',
      details: { issues: [] },
    };

    const response = new Response(JSON.stringify(errorPayload), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(response);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('MODEL_CONTRACT_MISMATCH');
    expect(caughtError?.status).toBe(502);
    expect(caughtError?.message).toBe('Model output violated schema contract');
  });

  it('6. classifies non-2xx JSON response without code as TURN_HTTP_FAILURE', async () => {
    const nonStructuredJson = {
      somethingElse: 'unknown',
    };

    const response = new Response(JSON.stringify(nonStructuredJson), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(response);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.code).toBe('TURN_HTTP_FAILURE');
    expect(caughtError?.status).toBe(500);
    expect(caughtError?.message).toContain('HTTP 500');
  });

  it('7. classifies network-level errors as TURN_NETWORK_FAILURE', () => {
    const turnError = createNetworkTurnError();

    expect(turnError.code).toBe('TURN_NETWORK_FAILURE');
    expect(turnError.status).toBeNull();
    expect(turnError.contentType).toBeNull();
    expect(turnError.message).toBe(SAFE_NETWORK_ERROR_MESSAGE);

    const receipt = toTurnFailureReceipt(turnError);
    expect(receipt.code).toBe('TURN_NETWORK_FAILURE');
    expect(receipt.status).toBeNull();
    expect(receipt.message).toBe(SAFE_NETWORK_ERROR_MESSAGE);
  });

  it('8. formats atmospheric failure messages cleanly with code and status', () => {
    const receipt = {
      code: 'NON_JSON_TURN_RESPONSE',
      status: 502,
      contentType: 'text/html',
      message: SAFE_UNEXPECTED_TURN_MESSAGE,
    };

    const formatted = formatTurnFailureMessage(receipt);
    expect(formatted).toBe(
      `[ENGINE FAILURE // NON_JSON_TURN_RESPONSE // HTTP 502]\n${SAFE_UNEXPECTED_TURN_MESSAGE}`
    );

    const networkReceipt = {
      code: 'TURN_NETWORK_FAILURE',
      status: null,
      contentType: null,
      message: SAFE_NETWORK_ERROR_MESSAGE,
    };

    const formattedNetwork = formatTurnFailureMessage(networkReceipt);
    expect(formattedNetwork).toBe(
      `[ENGINE FAILURE // TURN_NETWORK_FAILURE]\n${SAFE_NETWORK_ERROR_MESSAGE}`
    );
  });
});
