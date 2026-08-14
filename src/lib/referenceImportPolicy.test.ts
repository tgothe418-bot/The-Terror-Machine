import { describe, expect, it } from 'vitest';
import {
  REFERENCE_IMPORT_MAX_FILE_BYTES,
  REFERENCE_IMPORT_JSON_LIMIT,
  REFERENCE_IMPORT_HUMAN_MAX_SIZE,
  REFERENCE_IMPORT_MAX_BASE64_CHARS,
  REFERENCE_IMPORT_ERROR_CODE,
  REFERENCE_IMPORT_ERROR_MESSAGE,
  getDecodedBase64ByteLength,
  isFileWithinReferenceLimit,
  createPayloadTooLargeError,
} from './referenceImportPolicy';

describe('referenceImportPolicy', () => {
  it('defines the correct 20 MiB binary and 28 MB JSON boundaries', () => {
    expect(REFERENCE_IMPORT_MAX_FILE_BYTES).toBe(20 * 1024 * 1024); // 20,971,520 bytes
    expect(REFERENCE_IMPORT_JSON_LIMIT).toBe('28mb');
    expect(REFERENCE_IMPORT_HUMAN_MAX_SIZE).toBe('20 MiB');
    expect(REFERENCE_IMPORT_ERROR_CODE).toBe('REFERENCE_PAYLOAD_TOO_LARGE');
    expect(REFERENCE_IMPORT_ERROR_MESSAGE).toContain('20 MiB');
  });

  it('calculates derived maximum Base64 character count for 20 MiB', () => {
    // 20 MiB = 20,971,520 bytes. Base64 expands 3 bytes to 4 chars.
    const expectedMaxChars = Math.ceil((20 * 1024 * 1024) / 3) * 4;
    expect(REFERENCE_IMPORT_MAX_BASE64_CHARS).toBe(expectedMaxChars);
    expect(REFERENCE_IMPORT_MAX_BASE64_CHARS).toBe(27962028);
  });

  it('accepts a file exactly at the 20 MiB boundary', () => {
    const exactBoundary = 20 * 1024 * 1024;
    expect(isFileWithinReferenceLimit(exactBoundary)).toBe(true);
  });

  it('rejects a file one byte above the 20 MiB boundary', () => {
    const oneByteAbove = 20 * 1024 * 1024 + 1;
    expect(isFileWithinReferenceLimit(oneByteAbove)).toBe(false);
  });

  it('rejects invalid or zero-byte file sizes', () => {
    expect(isFileWithinReferenceLimit(0)).toBe(false);
    expect(isFileWithinReferenceLimit(-1)).toBe(false);
  });

  it('accurately computes decoded Base64 byte length for various padding forms', () => {
    // 0 padding (len multiple of 4 representing multiple of 3 bytes)
    // 'QUJD' -> 'ABC' (3 bytes)
    expect(getDecodedBase64ByteLength('QUJD')).toBe(3);

    // 1 padding ('=' represents 2 decoded bytes)
    // 'QUI=' -> 'AB' (2 bytes)
    expect(getDecodedBase64ByteLength('QUI=')).toBe(2);

    // 2 padding ('==' represents 1 decoded byte)
    // 'QQ==' -> 'A' (1 byte)
    expect(getDecodedBase64ByteLength('QQ==')).toBe(1);

    // Empty / whitespace
    expect(getDecodedBase64ByteLength('')).toBe(0);
    expect(getDecodedBase64ByteLength('   ')).toBe(0);
  });

  it('creates structured payload too large error object', () => {
    const errorObj = createPayloadTooLargeError();
    expect(errorObj).toEqual({
      error: 'Reference file is too large. The maximum supported size is 20 MiB.',
      code: 'REFERENCE_PAYLOAD_TOO_LARGE',
      maxFileBytes: 20971520,
    });
  });
});
