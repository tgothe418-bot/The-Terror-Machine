import { describe, expect, it } from 'vitest';
import { readSafeResponseError } from './responseErrorReader';

describe('readSafeResponseError', () => {
  it('preserves concise server message when response declares JSON with error field', async () => {
    const mockResponse = new Response(
      JSON.stringify({
        error: 'Reference file is too large. The maximum supported size is 20 MiB.',
      }),
      {
        status: 413,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      }
    );

    const message = await readSafeResponseError(mockResponse);
    expect(message).toBe('Reference file is too large. The maximum supported size is 20 MiB.');
  });

  it('preserves concise server message when response declares JSON with message field', async () => {
    const mockResponse = new Response(JSON.stringify({ message: 'Invalid reference material.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const message = await readSafeResponseError(mockResponse);
    expect(message).toBe('Invalid reference material.');
  });

  it('converts a non-JSON HTTP 413 response to safe local size message without exposing raw HTML', async () => {
    const rawHtml =
      '<!DOCTYPE html><html><head><title>413 Request Entity Too Large</title></head><body><h1>413 Request Entity Too Large</h1><p>nginx/1.18.0</p></body></html>';
    const mockResponse = new Response(rawHtml, {
      status: 413,
      headers: { 'Content-Type': 'text/html' },
    });

    const message = await readSafeResponseError(mockResponse);
    expect(message).toBe('Reference file is too large. The maximum supported size is 20 MiB.');
    expect(message).not.toContain('<!DOCTYPE');
    expect(message).not.toContain('<html>');
    expect(message).not.toContain('nginx');
  });

  it('converts a non-JSON 500 error response to safe generic status message without exposing raw HTML or stack trace', async () => {
    const rawHtml =
      '<!DOCTYPE html><html><body>Error: Internal Server Error at /app/server.ts:45:12</body></html>';
    const mockResponse = new Response(rawHtml, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });

    const message = await readSafeResponseError(mockResponse);
    expect(message).toBe('Extraction service encountered an internal error. Please try again.');
    expect(message).not.toContain('/app/server.ts');
    expect(message).not.toContain('<!DOCTYPE');
  });

  it('handles other HTTP non-JSON status codes cleanly', async () => {
    const res400 = new Response('Bad Request', {
      status: 400,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(await readSafeResponseError(res400)).toBe('Invalid file format or request structure.');

    const res429 = new Response('Too Many Requests', {
      status: 429,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(await readSafeResponseError(res429)).toBe(
      'Bandwidth rate limit reached. Please wait a moment before uploading.'
    );

    const res503 = new Response('Service Unavailable', {
      status: 503,
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(await readSafeResponseError(res503)).toBe(
      'Extraction service encountered an internal error. Please try again.'
    );
  });
});
