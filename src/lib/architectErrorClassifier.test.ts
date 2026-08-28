import { describe, it, expect } from 'vitest';
import { classifyArchitectError } from './architectErrorClassifier';

describe('Architect Error Classifier (Forge 1C-11)', () => {
  it('classifies client-side missing source binding as deterministic binding lost with guidance and no retry', () => {
    const res = classifyArchitectError({
      clientErrorCode: 'MISSING_SOURCE_BINDING',
      serverMessage: 'Source binding is missing or expired.',
    });

    expect(res.classification).toBe('DETERMINISTIC_BINDING_LOST');
    expect(res.isRetryable).toBe(false);
    expect(res.code).toBe('MISSING_SOURCE_BINDING');
    expect(res.recoveryGuidance).toContain('Reattach source required');
  });

  it('classifies client-side empty user message as deterministic client construction failed with no retry', () => {
    const res = classifyArchitectError({
      clientErrorCode: 'EMPTY_USER_MESSAGE',
      serverMessage: 'User message cannot be empty.',
    });

    expect(res.classification).toBe('DETERMINISTIC_CLIENT_CONSTRUCTION_FAILED');
    expect(res.isRetryable).toBe(false);
    expect(res.code).toBe('EMPTY_USER_MESSAGE');
  });

  it('classifies server SOURCE_BINDING_EXPIRED and 410 as deterministic binding lost with no retry', () => {
    const res1 = classifyArchitectError({
      code: 'SOURCE_BINDING_EXPIRED',
      status: 410,
      serverMessage: 'Session expired',
    });
    expect(res1.classification).toBe('DETERMINISTIC_BINDING_LOST');
    expect(res1.isRetryable).toBe(false);
    expect(res1.recoveryGuidance).toContain('Reattach source required');

    const res2 = classifyArchitectError({
      serverMessage: 'The document intake binding has expired for this session',
    });
    expect(res2.classification).toBe('DETERMINISTIC_BINDING_LOST');
    expect(res2.isRetryable).toBe(false);
  });

  it('classifies SOURCE_ID_MISMATCH as deterministic identity mismatch with no retry', () => {
    const res = classifyArchitectError({
      code: 'SOURCE_ID_MISMATCH',
      serverMessage: 'Active analysis ID mismatch',
    });
    expect(res.classification).toBe('DETERMINISTIC_IDENTITY_MISMATCH');
    expect(res.isRetryable).toBe(false);
  });

  it('classifies UNKNOWN_ALREADY_CLOSED as deterministic closed unknown with no retry', () => {
    const res = classifyArchitectError({
      code: 'UNKNOWN_ALREADY_CLOSED',
      serverMessage: 'Unknown unk-1 was already resolved',
    });
    expect(res.classification).toBe('DETERMINISTIC_UNKNOWN_CLOSED');
    expect(res.isRetryable).toBe(false);
  });

  it('classifies 400 and 422 schema errors as deterministic schema invalid with no retry', () => {
    const res = classifyArchitectError({
      status: 422,
      code: 'INVALID_REQUEST_SCHEMA',
      serverMessage: 'Invalid draft patch',
    });
    expect(res.classification).toBe('DETERMINISTIC_SCHEMA_INVALID');
    expect(res.isRetryable).toBe(false);
  });

  it('classifies HTTP 500, 502, 503, 504 and network errors as transient retryable', () => {
    const res500 = classifyArchitectError({
      status: 500,
      serverMessage: 'Temporary upstream outage',
    });
    expect(res500.classification).toBe('TRANSIENT_RETRYABLE');
    expect(res500.isRetryable).toBe(true);

    const res503 = classifyArchitectError({
      status: 503,
      serverMessage: 'Service Unavailable',
    });
    expect(res503.classification).toBe('TRANSIENT_RETRYABLE');
    expect(res503.isRetryable).toBe(true);

    const resFetch = classifyArchitectError({
      rawError: new TypeError('Failed to fetch'),
    });
    expect(resFetch.classification).toBe('TRANSIENT_RETRYABLE');
    expect(resFetch.isRetryable).toBe(true);
  });
});
