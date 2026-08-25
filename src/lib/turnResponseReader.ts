import type {
  TurnFailureReceipt,
  TurnFailureDiagnostics,
  TurnFailureDiagnosticIssue,
} from '../types';

export type { TurnFailureReceipt, TurnFailureDiagnostics, TurnFailureDiagnosticIssue };

/**
 * Defensively validates and sanitizes a raw diagnostics object from the server.
 * Bounded to 12 deduplicated issues, strict kinds, and safe string lengths.
 */
export function sanitizeTurnFailureDiagnostics(
  raw: unknown
): TurnFailureDiagnostics | undefined {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return undefined;
  }
  const obj = raw as Record<string, unknown>;
  const validKinds: TurnFailureDiagnostics['kind'][] = [
    'SCHEMA_VALIDATION',
    'JSON_PARSE',
    'DIALOGUE_CONTRACT',
  ];
  if (!validKinds.includes(obj.kind as TurnFailureDiagnostics['kind'])) {
    return undefined;
  }
  const kind = obj.kind as TurnFailureDiagnostics['kind'];

  if (!Array.isArray(obj.issues)) {
    return undefined;
  }

  const issues: TurnFailureDiagnosticIssue[] = [];
  const seen = new Set<string>();

  for (const item of obj.issues) {
    if (issues.length >= 12) break;
    if (typeof item !== 'object' || item === null || Array.isArray(item)) continue;
    const issueObj = item as Record<string, unknown>;

    if (
      typeof issueObj.path !== 'string' ||
      issueObj.path.trim().length === 0 ||
      issueObj.path.length > 240
    ) {
      continue;
    }
    if (
      typeof issueObj.code !== 'string' ||
      issueObj.code.trim().length === 0 ||
      issueObj.code.length > 60
    ) {
      continue;
    }

    if (issueObj.path.includes('<') || issueObj.path.includes('>')) continue;
    if (issueObj.code.includes('<') || issueObj.code.includes('>')) continue;

    const path = issueObj.path.trim();
    const code = issueObj.code.trim();
    const key = `${path}::${code}`;

    if (!seen.has(key)) {
      seen.add(key);
      issues.push({ path, code });
    }
  }

  if (issues.length === 0) {
    return undefined;
  }

  return {
    kind,
    issues,
  };
}

export class TurnResponseError extends Error {
  readonly code: string;
  readonly status: number | null;
  readonly contentType: string | null;
  readonly diagnostics?: TurnFailureDiagnostics;

  constructor(receipt: TurnFailureReceipt) {
    super(receipt.message);
    this.name = 'TurnResponseError';
    this.code = receipt.code;
    this.status = receipt.status;
    this.contentType = receipt.contentType;
    this.diagnostics = receipt.diagnostics;
  }

  toReceipt(): TurnFailureReceipt {
    return {
      code: this.code,
      status: this.status,
      contentType: this.contentType,
      message: this.message,
      ...(this.diagnostics ? { diagnostics: this.diagnostics } : {}),
    };
  }
}

export const SAFE_ERROR_MESSAGES: Record<string, string> = {
  MODEL_CONTRACT_MISMATCH:
    'The turn service returned an invalid response structure. The session state was not changed.',
  PROVIDER_FAILURE:
    'The AI provider turn generation failed. The session state was not changed.',
  INVALID_REQUEST:
    'The turn request was invalid. The session state was not changed.',
  NON_JSON_TURN_RESPONSE:
    'The turn service returned an unexpected non-JSON response. The session state was not changed.',
  MALFORMED_TURN_RESPONSE:
    'The turn service returned a malformed response. The session state was not changed.',
  TURN_NETWORK_FAILURE:
    'A network failure occurred while contacting the turn service. The session state was not changed.',
  UNKNOWN_ERROR:
    'The turn service returned an unexpected response. The session state was not changed.',
};

export const SAFE_UNEXPECTED_TURN_MESSAGE = SAFE_ERROR_MESSAGES.UNKNOWN_ERROR;

export const SAFE_NETWORK_ERROR_MESSAGE = SAFE_ERROR_MESSAGES.TURN_NETWORK_FAILURE;

export function resolveSafeFailureMessage(code: string): string {
  return SAFE_ERROR_MESSAGES[code] || SAFE_UNEXPECTED_TURN_MESSAGE;
}

function extractContentType(response: Response): string | null {
  const header = response.headers?.get?.('content-type');
  return header ? header.trim() : null;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const lower = contentType.toLowerCase();
  return lower.includes('application/json') || lower.includes('+json');
}

/**
 * Safely inspects and reads a Response from `/api/turn`.
 * Ensures non-JSON and malformed JSON responses are classified with safe codes
 * and never leak raw HTML, stack traces, or parser errors.
 */
export async function readTurnResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = extractContentType(response);

  // 1. Non-JSON check (including text/html or fallback pages)
  if (!isJsonContentType(contentType)) {
    throw new TurnResponseError({
      code: 'NON_JSON_TURN_RESPONSE',
      status: response.status,
      contentType,
      message: resolveSafeFailureMessage('NON_JSON_TURN_RESPONSE'),
    });
  }

  // 2. Read raw body and attempt JSON parse
  let rawText = '';
  try {
    rawText = await response.text();
  } catch {
    throw new TurnResponseError({
      code: 'MALFORMED_TURN_RESPONSE',
      status: response.status,
      contentType,
      message: resolveSafeFailureMessage('MALFORMED_TURN_RESPONSE'),
    });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawText);
  } catch {
    throw new TurnResponseError({
      code: 'MALFORMED_TURN_RESPONSE',
      status: response.status,
      contentType,
      message: resolveSafeFailureMessage('MALFORMED_TURN_RESPONSE'),
    });
  }

  // 3. Handle non-2xx responses with parsed JSON
  if (!response.ok) {
    const errorObj =
      typeof parsedJson === 'object' && parsedJson !== null
        ? (parsedJson as Record<string, unknown>)
        : null;

    const serverCode =
      errorObj && typeof errorObj.code === 'string' && errorObj.code.trim().length > 0
        ? errorObj.code
        : null;

    const code = serverCode || 'TURN_HTTP_FAILURE';
    const safeMessage = resolveSafeFailureMessage(code);
    const diagnostics = sanitizeTurnFailureDiagnostics(errorObj?.diagnostics);

    throw new TurnResponseError({
      code,
      status: response.status,
      contentType,
      message: safeMessage,
      ...(diagnostics ? { diagnostics } : {}),
    });
  }

  return parsedJson as T;
}

/**
 * Creates a stable network failure error when fetch rejects.
 */
export function createNetworkTurnError(): TurnResponseError {
  return new TurnResponseError({
    code: 'TURN_NETWORK_FAILURE',
    status: null,
    contentType: null,
    message: resolveSafeFailureMessage('TURN_NETWORK_FAILURE'),
  });
}

/**
 * Resolves any caught error into a safe TurnFailureReceipt.
 */
export function toTurnFailureReceipt(err: unknown): TurnFailureReceipt {
  if (err instanceof TurnResponseError) {
    return err.toReceipt();
  }

  if (typeof err === 'object' && err !== null) {
    const errorObj = err as Record<string, unknown>;
    const code =
      typeof errorObj.code === 'string' && errorObj.code.trim() ? errorObj.code : 'UNKNOWN_ERROR';
    const status =
      typeof errorObj.status === 'number'
        ? errorObj.status
        : typeof errorObj.statusCode === 'number'
          ? errorObj.statusCode
          : null;
    const contentType = typeof errorObj.contentType === 'string' ? errorObj.contentType : null;
    const diagnostics = sanitizeTurnFailureDiagnostics(errorObj.diagnostics);
    const message = resolveSafeFailureMessage(code);

    return {
      code,
      status,
      contentType,
      message,
      ...(diagnostics ? { diagnostics } : {}),
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    status: null,
    contentType: null,
    message: resolveSafeFailureMessage('UNKNOWN_ERROR'),
  };
}

/**
 * Formats a safe user-facing failure message with atmosphere styling.
 */
export function formatTurnFailureMessage(receipt: TurnFailureReceipt): string {
  const statusPart = receipt.status != null ? ` // HTTP ${receipt.status}` : '';
  return `[ENGINE FAILURE // ${receipt.code}${statusPart}]\n${receipt.message}`;
}
