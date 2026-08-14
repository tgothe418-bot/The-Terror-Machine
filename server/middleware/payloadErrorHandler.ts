import { Request, Response, NextFunction } from 'express';
import { 
  REFERENCE_IMPORT_ERROR_CODE, 
  REFERENCE_IMPORT_ERROR_MESSAGE, 
  REFERENCE_IMPORT_MAX_FILE_BYTES 
} from '../../src/lib/referenceImportPolicy';

interface HttpError {
  type?: string;
  status?: number;
  statusCode?: number;
  message?: string;
}

/**
 * Express error middleware that intercepts parser-level 413 Payload Too Large errors
 * and returns structured, safe JSON instead of Express's default HTML error page.
 */
export function payloadErrorHandler(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const httpErr = typeof err === 'object' && err !== null ? (err as HttpError) : null;
  const isPayloadTooLarge = 
    httpErr?.type === 'entity.too.large' || 
    httpErr?.status === 413 || 
    httpErr?.statusCode === 413;

  if (isPayloadTooLarge) {
    const isExtractEndpoint = 
      req.path === '/api/extract-blueprint' || 
      req.path === '/extract-blueprint' ||
      (typeof req.originalUrl === 'string' && req.originalUrl.includes('/extract-blueprint'));

    if (isExtractEndpoint) {
      res.status(413).json({
        error: REFERENCE_IMPORT_ERROR_MESSAGE,
        code: REFERENCE_IMPORT_ERROR_CODE,
        maxFileBytes: REFERENCE_IMPORT_MAX_FILE_BYTES,
      });
      return;
    }

    res.status(413).json({
      error: 'Payload too large. The maximum supported request size for this endpoint is 5MB.',
      code: 'PAYLOAD_TOO_LARGE',
    });
    return;
  }

  next(err);
}
