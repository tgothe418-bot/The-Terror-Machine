// @vitest-environment node
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import http from 'http';

const mockGenerateContent = vi.fn();
vi.mock('../utils/aiClient', () => ({
  getAiClient: () => ({
    models: {
      generateContent: mockGenerateContent,
    },
  }),
}));

import { createApp } from '../app';

describe('Forge Routes: /api/extract-blueprint', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    const app = await createApp({ enableSpaFallback: false });
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

  it('handles mixed-quality extraction by retaining valid entries and discarding malformed ones with HTTP 200', async () => {
    const mixedExtractionPayload = {
      summary: 'Expedition log for Submerged Station Alpha.',
      evidence: [
        {
          id: 'ev-1',
          category: 'setting',
          claim: 'Station Alpha is located in deep benthic trench.',
          excerpt: 'Submerged Station Alpha in the deep benthic trench.',
        },
        {
          id: 'ev-2',
          category: 'invalid_evidence_category_xyz',
          claim: 'Invalid evidence category entry.',
        },
      ],
      candidates: [
        {
          id: 'cand-1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Setting Location',
          explanation: 'Extracted from expedition log.',
          evidenceIds: ['ev-1'],
          proposedValue: 'Deep Benthic Trench',
        },
        {
          id: 'cand-2',
          classification: 'evidence',
          target: 'cast_expression_guidance',
          targetCastMemberId: 'char-alpha-1',
          label: 'Invalid Expression Candidate',
          explanation: 'Has unsupported communication mode.',
          evidenceIds: ['ev-1'],
          proposedValue: {
            communicationModes: ['telepathic_transmission'],
            expressionGuidance: 'Transmits telepathic frequencies.',
          },
        },
        {
          id: 'cand-3',
          classification: 'evidence',
          target: 'unsupported_candidate_target_type',
          label: 'Invalid Target',
          explanation: 'Target type is not recognized.',
          evidenceIds: [],
          proposedValue: 'Bad Target Value',
        },
      ],
      unknowns: [
        {
          id: 'unk-1',
          category: 'setting',
          question: 'What caused the main reactor scram?',
        },
        {
          id: 'unk-2',
          category: 'unsupported_unknown_cat',
          question: 'Invalid category unknown.',
        },
      ],
    };

    mockGenerateContent.mockResolvedValueOnce({
      text: `\`\`\`json\n${JSON.stringify(mixedExtractionPayload)}\n\`\`\``,
    });

    const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'expedition_log.txt',
        mimeType: 'text/plain',
        base64Data: Buffer.from('Log Entry: Deep Benthic Trench station reached.').toString('base64'),
      }),
    });

    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.analysis).toBeDefined();
    expect(body.analysis.status).toBe('completed');

    // Only valid evidence was retained
    expect(body.analysis.evidence).toHaveLength(1);
    expect(body.analysis.evidence[0].id).toBe('ev-1');
    expect(body.analysis.evidence[0].category).toBe('setting');

    // Only valid candidates were retained
    expect(body.analysis.candidates).toHaveLength(1);
    expect(body.analysis.candidates[0].target).toBe('setting_location');
    expect(body.analysis.candidates[0].proposedValue).toBe('Deep Benthic Trench');
    expect(body.analysis.candidates[0].reviewDecision).toBe('accepted');
    expect(body.analysis.candidates[0].applicationState).toBe('staged');

    // Only valid unknowns were retained
    expect(body.analysis.unknowns).toHaveLength(1);
    expect(body.analysis.unknowns[0].id).toBe('unk-1');
  });

  it('returns HTTP 500 if model returns no parseable JSON output', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: 'Sorry, I am unable to analyze this document.',
    });

    const response = await fetch(`${baseUrl}/api/extract-blueprint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'notes.txt',
        mimeType: 'text/plain',
        base64Data: Buffer.from('Some text content').toString('base64'),
      }),
    });

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Model did not return valid JSON.');
  });
});
