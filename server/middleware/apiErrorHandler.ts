import { Request, Response, NextFunction } from 'express';

interface HttpError {
  type?: string;
  status?: number;
  statusCode?: number;
  message?: string;
}

/**
 * Express error middleware for /api routes.
 * Ensures any parser errors, malformed JSON, or unhandled route exceptions
 * return structured, safe JSON instead of Express HTML error pages.
 */
export function apiErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (res.headersSent) {
    return next(err);
  }

  const httpErr = typeof err === 'object' && err !== null ? (err as HttpError) : null;
  const isSyntaxError = err instanceof SyntaxError || httpErr?.type === 'entity.parse.failed';

  if (isSyntaxError) {
    res.status(400).json({
      error: 'Malformed JSON payload in request body.',
      code: 'MALFORMED_JSON_REQUEST',
    });
    return;
  }

  const status =
    typeof httpErr?.status === 'number'
      ? httpErr.status
      : typeof httpErr?.statusCode === 'number'
        ? httpErr.statusCode
        : 500;

  const message = err instanceof Error ? err.message : 'Internal server error';

  res.status(status).json({
    error: message,
    code: status === 400 ? 'INVALID_REQUEST' : 'INTERNAL_API_ERROR',
  });
}
