/**
 * The Terror Machine — Architect Error Classifier (Forge 1C-11)
 *
 * Distinguishes retryable transient communication failures from
 * deterministic context, binding, and identity errors.
 */

export type ArchitectFailureClassification =
  | 'TRANSIENT_RETRYABLE'
  | 'DETERMINISTIC_BINDING_LOST'
  | 'DETERMINISTIC_IDENTITY_MISMATCH'
  | 'DETERMINISTIC_UNKNOWN_CLOSED'
  | 'DETERMINISTIC_CLIENT_CONSTRUCTION_FAILED'
  | 'DETERMINISTIC_SCHEMA_INVALID';

export interface ClassifiedArchitectError {
  classification: ArchitectFailureClassification;
  isRetryable: boolean;
  code: string;
  userFacingMessage: string;
  recoveryGuidance: string;
}

export function classifyArchitectError(params: {
  status?: number;
  code?: string;
  serverMessage?: string;
  clientErrorCode?: string;
  rawError?: unknown;
}): ClassifiedArchitectError {
  const { status, code, serverMessage, clientErrorCode, rawError } = params;

  // 1. Client-side request construction / validation failures
  if (clientErrorCode === 'MISSING_SOURCE_BINDING') {
    return {
      classification: 'DETERMINISTIC_BINDING_LOST',
      isRetryable: false,
      code: 'MISSING_SOURCE_BINDING',
      userFacingMessage: 'Source intake session binding is missing.',
      recoveryGuidance: 'Reattach source required: The runtime document binding is missing. Re-import or select the source document to restore Architect context.',
    };
  }

  if (clientErrorCode === 'EMPTY_USER_MESSAGE') {
    return {
      classification: 'DETERMINISTIC_CLIENT_CONSTRUCTION_FAILED',
      isRetryable: false,
      code: 'EMPTY_USER_MESSAGE',
      userFacingMessage: 'User message cannot be empty.',
      recoveryGuidance: 'Please type your clarification or decision before submitting.',
    };
  }

  // 2. Server-side explicit failure codes
  const serverCode = code || '';
  if (
    serverCode === 'SOURCE_BINDING_EXPIRED' ||
    serverCode === 'MISSING_SOURCE_BINDING' ||
    status === 410 ||
    serverMessage?.includes('binding has expired')
  ) {
    return {
      classification: 'DETERMINISTIC_BINDING_LOST',
      isRetryable: false,
      code: 'SOURCE_BINDING_EXPIRED',
      userFacingMessage: 'Source intake session expired.',
      recoveryGuidance: 'Reattach source required: The server session for this document has expired. Re-import the source document to re-bind context.',
    };
  }

  if (
    serverCode === 'SOURCE_ID_MISMATCH' ||
    serverCode === 'UNKNOWN_IDENTITY_MISMATCH' ||
    serverMessage?.includes('identity mismatch')
  ) {
    return {
      classification: 'DETERMINISTIC_IDENTITY_MISMATCH',
      isRetryable: false,
      code: 'SOURCE_ID_MISMATCH',
      userFacingMessage: 'Source or ambiguity identity mismatch.',
      recoveryGuidance: 'The question context does not match the active document. Please re-select the question from the baseline.',
    };
  }

  if (
    serverCode === 'UNKNOWN_ALREADY_CLOSED' ||
    serverMessage?.includes('already closed') ||
    serverMessage?.includes('already resolved')
  ) {
    return {
      classification: 'DETERMINISTIC_UNKNOWN_CLOSED',
      isRetryable: false,
      code: 'UNKNOWN_ALREADY_CLOSED',
      userFacingMessage: 'This ambiguity is already resolved.',
      recoveryGuidance: 'This question has already been resolved or dismissed. Select an open question or continue with draft authoring.',
    };
  }

  if (status === 400 || status === 422 || serverCode === 'INVALID_REQUEST_SCHEMA') {
    return {
      classification: 'DETERMINISTIC_SCHEMA_INVALID',
      isRetryable: false,
      code: 'INVALID_REQUEST_SCHEMA',
      userFacingMessage: 'Invalid request payload or schema rejection.',
      recoveryGuidance: 'Edit your input or draft to correct formatting issues before resubmitting.',
    };
  }

  // 3. Transient / network / server errors: status 502, 503, 504, 500, network abort, fetch failure
  if (
    status === 502 ||
    status === 503 ||
    status === 504 ||
    status === 500 ||
    rawError instanceof TypeError ||
    (rawError instanceof Error &&
      (rawError.name === 'AbortError' ||
        rawError.message.includes('fetch') ||
        rawError.message.includes('network') ||
        rawError.message.includes('Failed to fetch')))
  ) {
    return {
      classification: 'TRANSIENT_RETRYABLE',
      isRetryable: true,
      code: 'TRANSIENT_NETWORK_FAILURE',
      userFacingMessage: serverMessage || 'Temporary communication failure with the Architect service.',
      recoveryGuidance: 'A transient network or server interruption occurred. You may retry the request.',
    };
  }

  // Fallback for general errors
  return {
    classification: 'TRANSIENT_RETRYABLE',
    isRetryable: true,
    code: 'TRANSIENT_SERVER_ERROR',
    userFacingMessage: serverMessage || 'Architect request encountered a temporary error.',
    recoveryGuidance: 'You may retry this request.',
  };
}
