import { describe, expect, it, afterAll, beforeAll } from 'vitest';
import express, { Request, Response } from 'express';
import http from 'http';
import { ExtractBlueprintRequestSchema } from '../schemas/index';
import { payloadErrorHandler } from '../middleware/payloadErrorHandler';
import { 
  REFERENCE_IMPORT_JSON_LIMIT, 
  REFERENCE_IMPORT_MAX_FILE_BYTES, 
  REFERENCE_IMPORT_ERROR_CODE,
  getDecodedBase64ByteLength,
  createPayloadTooLargeError
} from '../../src/lib/referenceImportPolicy';

describe('Extract Blueprint Schema and Route Boundaries', () => {
  describe('ExtractBlueprintRequestSchema', () => {
    it('requires non-empty fileName, mimeType, and base64Data', () => {
      const valid = {
        fileName: 'document.pdf',
        mimeType: 'application/pdf',
        base64Data: 'QUJD',
      };
      const result = ExtractBlueprintRequestSchema.safeParse(valid);
      expect(result.success).toBe(true);

      const missingFile = {
        mimeType: 'application/pdf',
        base64Data: 'QUJD',
      };
      expect(ExtractBlueprintRequestSchema.safeParse(missingFile).success).toBe(false);

      const emptyBase64 = {
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        base64Data: '',
      };
      expect(ExtractBlueprintRequestSchema.safeParse(emptyBase64).success).toBe(false);
    });

    it('rejects base64Data exceeding maximum Base64 character limit', () => {
      // 27,962,028 is the maximum allowed Base64 chars for 20 MiB
      // Test with an oversized string length
      const oversizedBase64 = 'A'.repeat(27962029);
      const result = ExtractBlueprintRequestSchema.safeParse({
        fileName: 'too_large.pdf',
        mimeType: 'application/pdf',
        base64Data: oversizedBase64,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Express Middleware Ordering & Payload Size HTTP Suite', () => {
    let server: http.Server;
    let baseUrl: string;

    beforeAll(async () => {
      const app = express();

      // Route-specific parser for extraction endpoint (28mb)
      app.use('/api/extract-blueprint', express.json({ limit: REFERENCE_IMPORT_JSON_LIMIT }));

      // Standard parser for ordinary endpoints (5mb)
      app.use(express.json({ limit: '5mb' }));

      // Mock extraction handler (without invoking live Gemini)
      app.post('/api/extract-blueprint', (req: Request, res: Response) => {
        const parsedBody = ExtractBlueprintRequestSchema.safeParse(req.body);
        if (!parsedBody.success) {
          res.status(400).json({ error: 'Invalid request payload' });
          return;
        }

        const decodedByteLength = getDecodedBase64ByteLength(parsedBody.data.base64Data);
        if (decodedByteLength > REFERENCE_IMPORT_MAX_FILE_BYTES) {
          res.status(413).json(createPayloadTooLargeError());
          return;
        }

        res.json({
          status: 'ok',
          receivedFileName: parsedBody.data.fileName,
          decodedBytes: decodedByteLength,
        });
      });

      // Mock ordinary route with standard 5 MB boundary
      app.post('/api/ordinary-route', (req: Request, res: Response) => {
        res.json({ status: 'ok', bodyKeys: Object.keys(req.body || {}) });
      });

      // Structured error handler middleware
      app.use(payloadErrorHandler);

      await new Promise<void>((resolve) => {
        server = app.listen(0, '127.0.0.1', () => {
          const addr = server.address();
          if (addr && typeof addr === 'object') {
            baseUrl = `http://127.0.0.1:${addr.port}`;
          }
          resolve();
        });
      });
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        if (server) {
          server.close((err) => (err ? reject(err) : resolve()));
        } else {
          resolve();
        }
      });
    });

    it('accepts a ~6.5 MB JSON request on /api/extract-blueprint that exceeds the legacy 5 MB limit', async () => {
      // 6.5 MB Base64 string simulates ~4.87 MB raw file (similar to 1408.pdf)
      const base64Data = 'A'.repeat(6_800_000); // 6.8 million chars
      const payload = JSON.stringify({
        fileName: '1408.pdf',
        mimeType: 'application/pdf',
        base64Data,
      });

      const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.receivedFileName).toBe('1408.pdf');
    });

    it('rejects the same ~6.5 MB request on /api/ordinary-route with HTTP 413 and structured JSON', async () => {
      const payload = JSON.stringify({
        data: 'A'.repeat(6_800_000),
      });

      const response = await fetch(`${baseUrl}/api/ordinary-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(response.status).toBe(413);
      expect(response.headers.get('content-type')).toContain('application/json');
      const data = await response.json();
      expect(data.code).toBe('PAYLOAD_TOO_LARGE');
      expect(data.error).toContain('5MB');
    });

    it('rejects an over-limit request (> 28 MB) on /api/extract-blueprint with HTTP 413 and REFERENCE_PAYLOAD_TOO_LARGE', async () => {
      // Create request slightly above 28 MB limit (e.g. 29.5 MB)
      const hugePayload = JSON.stringify({
        fileName: 'massive.pdf',
        mimeType: 'application/pdf',
        base64Data: 'A'.repeat(29_500_000),
      });

      const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: hugePayload,
      });

      expect(response.status).toBe(413);
      expect(response.headers.get('content-type')).toContain('application/json');
      const data = await response.json();
      expect(data.code).toBe(REFERENCE_IMPORT_ERROR_CODE);
      expect(data.error).toContain('20 MiB');
      expect(data.maxFileBytes).toBe(REFERENCE_IMPORT_MAX_FILE_BYTES);
    });

    it('rejects payload when decoded Base64 byte length exceeds 20 MiB even if parsed by body-parser and schema', async () => {
      // Base64 string of length 27,962,028 (within schema max) without padding '=' decodes to 20,971,521 bytes (> 20,971,520)
      const exactlyAtSchemaMaxNoPadding = 'A'.repeat(27_962_028);
      const payload = JSON.stringify({
        fileName: 'over_decoded_boundary.pdf',
        mimeType: 'application/pdf',
        base64Data: exactlyAtSchemaMaxNoPadding,
      });

      const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(response.status).toBe(413);
      const data = await response.json();
      expect(data.code).toBe(REFERENCE_IMPORT_ERROR_CODE);
      expect(data.error).toContain('20 MiB');
      expect(data.maxFileBytes).toBe(REFERENCE_IMPORT_MAX_FILE_BYTES);
    });

    it('successfully processes standard small requests on /api/extract-blueprint', async () => {
      const payload = JSON.stringify({
        fileName: 'small_lore.txt',
        mimeType: 'text/plain',
        base64Data: 'QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVo=',
      });

      const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('ok');
      expect(data.receivedFileName).toBe('small_lore.txt');
    });
  });
});
