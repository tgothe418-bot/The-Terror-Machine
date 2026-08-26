import { REFERENCE_IMPORT_ERROR_MESSAGE } from './referenceImportPolicy';

/**
 * Safely extracts human-readable error messages from HTTP responses
 * without ever exposing raw HTML or raw upstream bodies in the UI.
 */
export async function readSafeResponseError(response: Response): Promise<string> {
  const contentType = response.headers?.get ? (response.headers.get('content-type') || '') : '';

  // 1. If response is JSON, read structured error
  if (contentType.includes('application/json')) {
    try {
      const data = await response.json();
      if (typeof data === 'object' && data !== null) {
        if (typeof data.error === 'string' && data.error.trim().length > 0) {
          return data.error.trim();
        }
        if (typeof data.message === 'string' && data.message.trim().length > 0) {
          return data.message.trim();
        }
      }
    } catch {
      // JSON parse error fallback
    }
  }

  // 2. HTTP 413 handling (even if server or hosting layer returned non-JSON / HTML)
  if (response.status === 413) {
    return REFERENCE_IMPORT_ERROR_MESSAGE;
  }

  // 3. Status-specific safe messages
  if (response.status === 400) {
    return 'Invalid file format or request structure.';
  }
  if (response.status === 429) {
    return 'Bandwidth rate limit reached. Please wait a moment before uploading.';
  }
  if (response.status >= 500) {
    return 'Extraction service encountered an internal error. Please try again.';
  }

  // 4. Generic safe status fallback
  return `Extraction request failed (HTTP ${response.status}).`;
}
