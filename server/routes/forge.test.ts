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

  describe('Forge Routes: /api/architect ambiguity resolution', () => {
    const testCases = [
      {
        scenario: 'malformed non-JSON output',
        modelOutput: 'Not valid JSON at all: { broken',
        followUps: [],
        expectedError: 'Architect returned malformed non-JSON output.',
      },
      {
        scenario: 'invalid shape missing proposal in RESOLUTION_PROPOSAL',
        modelOutput: JSON.stringify({
          type: 'RESOLUTION_PROPOSAL',
          sourceId: 'src-1',
          unknownId: 'unk-1',
          message: 'Here is a proposal',
        }),
        followUps: [],
        expectedError: 'Architect response schema validation failed.',
      },
      {
        scenario: 'invalid shape with unsupported response type',
        modelOutput: JSON.stringify({
          type: 'MESSAGE',
          message: 'Standard general message',
        }),
        followUps: [],
        expectedError: 'Architect returned invalid response type: "MESSAGE"',
      },
      {
        scenario: 'missing identifiers in FOLLOW_UP',
        modelOutput: JSON.stringify({
          type: 'FOLLOW_UP',
          message: 'Need more detail',
          followUpQuestion: 'Can you clarify the motive?',
        }),
        followUps: [],
        expectedError: 'Architect returned identity mismatch',
      },
      {
        scenario: 'identity mismatch on sourceId',
        modelOutput: JSON.stringify({
          type: 'FOLLOW_UP',
          sourceId: 'src-WRONG',
          unknownId: 'unk-1',
          message: 'Need more detail',
          followUpQuestion: 'Can you clarify the motive?',
        }),
        followUps: [],
        expectedError: 'Architect returned identity mismatch: expected sourceId="src-1", unknownId="unk-1"',
      },
      {
        scenario: 'identity mismatch on unknownId',
        modelOutput: JSON.stringify({
          type: 'RESOLUTION_PROPOSAL',
          sourceId: 'src-1',
          unknownId: 'unk-WRONG',
          message: 'Resolution proposal text',
          proposal: {
            resolution: 'Valid resolution text',
            targetEffect: 'Valid target effect',
          },
        }),
        followUps: [],
        expectedError: 'Architect returned identity mismatch: expected sourceId="src-1", unknownId="unk-1"',
      },
      {
        scenario: 'impermissible third follow-up question',
        modelOutput: JSON.stringify({
          type: 'FOLLOW_UP',
          sourceId: 'src-1',
          unknownId: 'unk-1',
          message: 'Attempted third follow-up question',
          followUpQuestion: 'Third question?',
        }),
        followUps: [
          { id: 'fu-1', question: 'Q1', answer: 'A1' },
          { id: 'fu-2', question: 'Q2', answer: 'A2' },
        ],
        expectedError: 'Architect attempted impermissible third follow-up question.',
      },
    ];

    it('rejects invalid or unbound ambiguity responses without fallback', async () => {
      for (const tc of testCases) {
        mockGenerateContent.mockResolvedValueOnce({
          text: tc.modelOutput,
        });

        const response = await fetch(`${baseUrl}/api/architect`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            kind: 'AMBIGUITY_RESOLUTION',
            userMessage: 'The entity was created during the war.',
            activeUnknown: {
              sourceId: 'src-1',
              unknownId: 'unk-1',
              category: 'premise',
              question: 'When was the entity created?',
              targetEffect: 'Determines timeline constraints.',
              submittedAnswer: 'During the war.',
              followUps: tc.followUps,
            },
            draftContext: {
              title: 'Test Scenario',
              premise: 'A dark testing ground.',
              draftRevision: 1,
            },
            sourceContext: {
              sourceFileName: 'war_log.txt',
              sourceSummary: 'Log detailing wartime experiment.',
              evidence: [
                {
                  id: 'ev-1',
                  category: 'premise',
                  claim: 'Entity discovered in bunker.',
                  excerpt: '1944 bunker report.',
                },
              ],
              canonicalAmbiguities: [],
            },
            history: [],
          }),
        });

        expect(
          response.status,
          `Expected 502 for scenario "${tc.scenario}" but got ${response.status}`
        ).toBe(502);

        const body = (await response.json()) as Record<string, unknown>;
        expect(body.error).toBeDefined();
        if (tc.expectedError) {
          expect(body.error).toContain(tc.expectedError);
        }

        // Strict assertion: absence of any synthesized proposal or fallback
        expect(body.proposal).toBeUndefined();
        expect(body.type).toBeUndefined();
        expect(body.resolution).toBeUndefined();
      }
    });
  });

  describe('Forge Routes: /api/architect depiction contract proposal', () => {
    const validModelProposal = {
      contract: {
        dramaticRegister: 'Cosmic existential dread with cold detachment',
        directness: 'Oblique psychological degradation before manifest reality fracture',
        aftermath: 'Irreversible cognitive dissolution and sensory phantom loops',
        ambiguityHandling: 'Deliberate ontological void; reality shifts remain unexplained',
        specialBoundaries: 'Strictly avoid jump scares or supernatural saviors',
      },
      rationale:
        'Reflects benthic isolation and untranslatable signals from deep trench source evidence.',
      message: 'Synthesized depiction contract tailored to station isolation.',
    };

    const validRequest = {
      kind: 'DEPICTION_CONTRACT_PROPOSAL',
      draftContext: {
        title: 'Station Benthos',
        premise: 'Deep benthic research facility loses contact.',
        setting: {
          location: 'Benthic Trench',
          atmosphere: 'Oppressive, claustrophobic',
          timePeriod: 'Near Future',
        },
        cast: [
          {
            id: 'char-1',
            name: 'Dr. Aris',
            description: 'Chief Oceanographer',
            role: 'Lead',
            personality: 'Obsessive, paranoid',
          },
        ],
        environmentalRules: [
          'Pressure hulls fail below 8000m',
          'Acoustic echoes carry anomalous frequencies',
        ],
        references: ['deep_sea_expedition.json'],
        draftRevision: 4,
      },
      baselineContext: {
        sourceCount: 2,
        sourceSummary: 'Hydrophone telemetry and crew psych evals.',
        appliedCandidateFacts: [
          {
            target: 'setting_location',
            classification: 'evidence' as const,
            value: 'Mariana Abyssal Plain',
            sourceFileName: 'hydrophone_log.txt',
          },
        ],
        evidenceClaims: [
          {
            claim: 'Sub-harmonic pulse recorded at 0400 hours.',
            excerpt: 'Pulse amplitude exceeded acoustic sensors.',
            category: 'setting',
          },
        ],
        canonicalAmbiguities: [
          {
            id: 'unk-pulse-origin',
            category: 'rule',
            question: 'What produces the sub-harmonic pulse?',
            resolutionMode: 'CONTEXTUAL_DISCRETION' as const,
            guidance: 'Leave pulse source unexplained and alien.',
          },
        ],
        sourceBaselineRevision: 9,
      },
      history: [],
    };

    it('returns only validated source-grounded depiction proposals', async () => {
      // 1. Valid case: returns HTTP 200, strictly preserves request revisions and sets createdAt
      mockGenerateContent.mockResolvedValueOnce({
        text: JSON.stringify(validModelProposal),
      });

      const validResponse = await fetch(`${baseUrl}/api/architect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validRequest),
      });

      expect(validResponse.status).toBe(200);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const validBody = (await validResponse.json()) as any;
      expect(validBody.type).toBe('DEPICTION_CONTRACT_PROPOSAL');
      expect(validBody.proposal).toBeDefined();
      expect(validBody.proposal.contract.dramaticRegister).toBe(
        'Cosmic existential dread with cold detachment'
      );
      expect(validBody.proposal.contract.directness).toBe(
        'Oblique psychological degradation before manifest reality fracture'
      );
      expect(validBody.proposal.contract.aftermath).toBe(
        'Irreversible cognitive dissolution and sensory phantom loops'
      );
      expect(validBody.proposal.contract.ambiguityHandling).toBe(
        'Deliberate ontological void; reality shifts remain unexplained'
      );
      expect(validBody.proposal.contract.specialBoundaries).toBe(
        'Strictly avoid jump scares or supernatural saviors'
      );
      expect(validBody.proposal.rationale).toBe(
        'Reflects benthic isolation and untranslatable signals from deep trench source evidence.'
      );
      // Assert revisions come strictly from the request and timestamp is set
      expect(validBody.proposal.sourceDraftRevision).toBe(4);
      expect(validBody.proposal.sourceBaselineRevision).toBe(9);
      expect(typeof validBody.proposal.createdAt).toBe('number');
      expect(validBody.proposal.createdAt).toBeGreaterThan(0);

      // 2. Table of invalid cases: must return HTTP 502 with error and no fallback text
      const invalidCases = [
        {
          scenario: 'malformed non-JSON output',
          modelOutput: 'Not JSON at all { syntax error',
          expectedError: 'Architect returned malformed non-JSON output.',
        },
        {
          scenario: 'non-object JSON output (array)',
          modelOutput: JSON.stringify(['invalid', 'array']),
          expectedError: 'Architect returned non-object JSON payload.',
        },
        {
          scenario: 'missing contract object',
          modelOutput: JSON.stringify({
            message: 'Missing contract',
            rationale: 'Some rationale',
          }),
          expectedError: 'Architect returned missing or invalid contract object.',
        },
        {
          scenario: 'incomplete contract missing dramaticRegister',
          modelOutput: JSON.stringify({
            contract: {
              directness: 'Oblique',
              aftermath: 'Lingering',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
            rationale: 'Some rationale',
          }),
          expectedError: 'Architect contract contains placeholder or empty required fields.',
        },
        {
          scenario: 'incomplete contract missing specialBoundaries (5th field)',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic',
              directness: 'Oblique',
              aftermath: 'Lingering',
              ambiguityHandling: 'Void',
            },
            rationale: 'Some rationale',
          }),
          expectedError: 'Architect contract is missing required specialBoundaries field.',
        },
        {
          scenario: 'missing rationale',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic',
              directness: 'Oblique',
              aftermath: 'Lingering',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
          }),
          expectedError: 'Architect proposal contains placeholder or missing rationale.',
        },
        {
          scenario: 'placeholder value in dramaticRegister ("TBD")',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'TBD',
              directness: 'Oblique horror',
              aftermath: 'Lingering dread',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
            rationale: 'Rationale text',
          }),
          expectedError: 'Architect contract contains placeholder or empty required fields.',
        },
        {
          scenario: 'placeholder value in directness ("N/A")',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic atmosphere',
              directness: 'N/A',
              aftermath: 'Lingering dread',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
            rationale: 'Rationale text',
          }),
          expectedError: 'Architect contract contains placeholder or empty required fields.',
        },
        {
          scenario: 'placeholder value in aftermath ("Unknown")',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic atmosphere',
              directness: 'Oblique horror',
              aftermath: 'Unknown',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
            rationale: 'Rationale text',
          }),
          expectedError: 'Architect contract contains placeholder or empty required fields.',
        },
        {
          scenario: 'placeholder value in ambiguityHandling ("[Placeholder]")',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic atmosphere',
              directness: 'Oblique horror',
              aftermath: 'Lingering dread',
              ambiguityHandling: '[Placeholder]',
              specialBoundaries: '',
            },
            rationale: 'Rationale text',
          }),
          expectedError: 'Architect contract contains placeholder or empty required fields.',
        },
        {
          scenario: 'placeholder in rationale ("None")',
          modelOutput: JSON.stringify({
            contract: {
              dramaticRegister: 'Gothic atmosphere',
              directness: 'Oblique horror',
              aftermath: 'Lingering dread',
              ambiguityHandling: 'Void',
              specialBoundaries: '',
            },
            rationale: 'None',
          }),
          expectedError: 'Architect proposal contains placeholder or missing rationale.',
        },
      ];

      for (const tc of invalidCases) {
        mockGenerateContent.mockResolvedValueOnce({
          text: tc.modelOutput,
        });

        const response = await fetch(`${baseUrl}/api/architect`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validRequest),
        });

        expect(
          response.status,
          `Expected 502 for scenario "${tc.scenario}" but got ${response.status}`
        ).toBe(502);

        const body = (await response.json()) as Record<string, unknown>;
        expect(body.error).toBeDefined();
        if (tc.expectedError) {
          expect(body.error).toContain(tc.expectedError);
        }

        // Strict assertion: absence of any synthesized proposal or fallback
        expect(body.proposal).toBeUndefined();
        expect(body.type).toBeUndefined();
      }
    });
  });
});
