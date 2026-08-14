/**
 * Shared Reference Import Policy
 * Enforces file size boundaries and Base64 constraints across client and server.
 */

// 20 MiB raw binary file limit
export const REFERENCE_IMPORT_MAX_FILE_BYTES = 20 * 1024 * 1024; // 20,971,520 bytes

// 28 MB Express JSON parser limit (20 MiB file ~26.7 MB in Base64 + JSON wrapper)
export const REFERENCE_IMPORT_JSON_LIMIT = '28mb';

// Human-readable size string
export const REFERENCE_IMPORT_HUMAN_MAX_SIZE = '20 MiB';

// Derived maximum Base64 character count for a 20 MiB file:
// Base64 expands 3 bytes into 4 chars: Math.ceil(20971520 / 3) * 4 = 27,962,028
export const REFERENCE_IMPORT_MAX_BASE64_CHARS = Math.ceil(REFERENCE_IMPORT_MAX_FILE_BYTES / 3) * 4;

export const REFERENCE_IMPORT_ERROR_CODE = 'REFERENCE_PAYLOAD_TOO_LARGE';
export const REFERENCE_IMPORT_ERROR_MESSAGE = `Reference file is too large. The maximum supported size is ${REFERENCE_IMPORT_HUMAN_MAX_SIZE}.`;

/**
 * Calculates decoded byte length of a Base64 string without creating buffer/allocating memory.
 */
export function getDecodedBase64ByteLength(base64: string): number {
  if (!base64 || typeof base64 !== 'string') return 0;

  // Remove potential whitespace
  const sanitized = base64.replace(/\s+/g, '');
  const len = sanitized.length;
  if (len === 0) return 0;

  let padding = 0;
  if (sanitized.endsWith('==')) {
    padding = 2;
  } else if (sanitized.endsWith('=')) {
    padding = 1;
  }

  return Math.max(0, Math.floor((len * 3) / 4) - padding);
}

/**
 * Checks if raw file size is within the allowed reference limit.
 */
export function isFileWithinReferenceLimit(fileSizeBytes: number): boolean {
  return (
    typeof fileSizeBytes === 'number' &&
    fileSizeBytes > 0 &&
    fileSizeBytes <= REFERENCE_IMPORT_MAX_FILE_BYTES
  );
}

export interface StructuredPayloadTooLargeError {
  error: string;
  code: string;
  maxFileBytes: number;
}

export function createPayloadTooLargeError(): StructuredPayloadTooLargeError {
  return {
    error: REFERENCE_IMPORT_ERROR_MESSAGE,
    code: REFERENCE_IMPORT_ERROR_CODE,
    maxFileBytes: REFERENCE_IMPORT_MAX_FILE_BYTES,
  };
}
