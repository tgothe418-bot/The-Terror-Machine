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

  it('preserves only safe bounded model-contract diagnostics', async () => {
    // 1. Valid diagnostics survive readTurnResponse, TurnResponseError, and toTurnFailureReceipt
    const validDiagnostics = {
      kind: 'SCHEMA_VALIDATION' as const,
      issues: [
        { path: 'character_relationship_proposal.changes.0.delta', code: 'invalid_type' },
        { path: 'consequence_proposal.mutations.0.operation', code: 'invalid_enum_value' },
      ],
    };

    const responseWithDiagnostics = new Response(
      JSON.stringify({
        error: 'Model output violated schema contract',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics: validDiagnostics,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    let caughtError: TurnResponseError | null = null;
    try {
      await readTurnResponse(responseWithDiagnostics);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        caughtError = err;
      }
    }

    expect(caughtError).not.toBeNull();
    expect(caughtError?.diagnostics).toEqual(validDiagnostics);

    const receiptFromError = caughtError!.toReceipt();
    expect(receiptFromError.diagnostics).toEqual(validDiagnostics);

    const receiptFromHelper = toTurnFailureReceipt({
      code: 'MODEL_CONTRACT_MISMATCH',
      status: 502,
      message: 'Model output violated schema contract',
      diagnostics: validDiagnostics,
    });
    expect(receiptFromHelper.diagnostics).toEqual(validDiagnostics);

    // 2. Failures without diagnostics retain existing behavior
    const simpleResponse = new Response(
      JSON.stringify({
        error: 'Generic server failure',
        code: 'SERVER_ERROR',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    let simpleError: TurnResponseError | null = null;
    try {
      await readTurnResponse(simpleResponse);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        simpleError = err;
      }
    }
    expect(simpleError).not.toBeNull();
    expect(simpleError?.diagnostics).toBeUndefined();
    expect(simpleError?.toReceipt().diagnostics).toBeUndefined();

    // 3. Malformed kinds, blank paths, oversized arrays, arbitrary nested objects, and non-string codes are discarded
    const malformedDiagnostics = {
      kind: 'INVALID_UNKNOWN_KIND',
      issues: [{ path: 'valid.path', code: 'valid_code' }],
    };
    const responseWithMalformedKind = new Response(
      JSON.stringify({
        error: 'Contract error',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics: malformedDiagnostics,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    let malformedKindError: TurnResponseError | null = null;
    try {
      await readTurnResponse(responseWithMalformedKind);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        malformedKindError = err;
      }
    }
    expect(malformedKindError?.diagnostics).toBeUndefined();

    const junkIssuesDiagnostics = {
      kind: 'SCHEMA_VALIDATION',
      issues: [
        { path: '', code: 'code1' }, // blank path -> discarded
        { path: 'path2', code: '' }, // blank code -> discarded
        { path: 123, code: 'code3' }, // non-string path -> discarded
        { path: 'path4', code: null }, // non-string code -> discarded
        { nested: { raw: 'body' } }, // invalid shape -> discarded
      ],
    };
    const responseWithJunk = new Response(
      JSON.stringify({
        error: 'Contract error',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics: junkIssuesDiagnostics,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    let junkError: TurnResponseError | null = null;
    try {
      await readTurnResponse(responseWithJunk);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        junkError = err;
      }
    }
    expect(junkError?.diagnostics).toBeUndefined();

    // Oversized issues array is capped to 12
    const manyIssues = Array.from({ length: 20 }, (_, i) => ({
      path: `field.path.${i}`,
      code: `code_${i}`,
    }));
    const responseWithMany = new Response(
      JSON.stringify({
        error: 'Contract error',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics: { kind: 'SCHEMA_VALIDATION', issues: manyIssues },
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    let manyError: TurnResponseError | null = null;
    try {
      await readTurnResponse(responseWithMany);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        manyError = err;
      }
    }
    expect(manyError?.diagnostics?.issues).toHaveLength(12);

    // 4. The generic user-facing message is unchanged
    expect(caughtError?.message).toBe('Model output violated schema contract');

    // 5. HTML and raw model bodies cannot enter diagnostics
    const htmlInDiagnostics = {
      kind: 'SCHEMA_VALIDATION',
      issues: [
        { path: '<script>alert(1)</script>', code: 'safe_code' },
        { path: 'safe.path', code: '<div>raw html</div>' },
      ],
    };
    const responseWithHtml = new Response(
      JSON.stringify({
        error: 'Contract error',
        code: 'MODEL_CONTRACT_MISMATCH',
        diagnostics: htmlInDiagnostics,
      }),
      {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    let htmlError: TurnResponseError | null = null;
    try {
      await readTurnResponse(responseWithHtml);
    } catch (err) {
      if (err instanceof TurnResponseError) {
        htmlError = err;
      }
    }
    expect(htmlError?.diagnostics).toBeUndefined();
  });
});
