import { describe, expect, it } from 'vitest';
import { validateForgeExportReadiness } from './forgeReadiness';
import { ForgeDraft, ForgeSourceAnalysis } from '../types/forge';

describe('validateForgeExportReadiness', () => {
  const completeDraft: ForgeDraft = {
    id: 'draft-1',
    title: 'Echoes of the Deep',
    premise: 'Explore an abandoned trench lab.',
    identity: {
      title: 'Echoes of the Deep',
      thematicAnchor: 'Isolation in the abyss',
    },
    setting: {
      location: 'Sub-aquatic Trench Lab',
      atmosphere: 'Cold, dark, high pressure',
      timePeriod: '1992',
    },
    depictionContract: {
      dramaticRegister: 'Psychological claustrophobia',
      directness: 'Measured dread',
      aftermath: 'Enduring paranoia',
      ambiguityHandling: 'Deliberate withholding',
    },
    cast: [
      {
        id: 'char-1',
        name: 'Dr. Aris Calder',
        role: 'PROTAGONIST',
        description: 'Deep-sea researcher',
        behaviorVector: 'ADAPTIVE',
        isEntity: false,
      },
    ],
    startingVector: 'SOMATIC',
    startingTier: 'GATEWAY',
  };

  it('validates a complete, compliant draft with no source analyses', () => {
    const result = validateForgeExportReadiness({ draft: completeDraft });
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
    expect(result.sourceSummary.sourceCount).toBe(0);
  });

  it('flags missing and incomplete depictionContract mandatory fields', () => {
    const invalidContractDraft: ForgeDraft = {
      ...completeDraft,
      depictionContract: {
        dramaticRegister: '',
        directness: 'Unknown',
        aftermath: '   ',
        ambiguityHandling: 'Preserve epistemic gaps',
      },
    };

    const result = validateForgeExportReadiness({ draft: invalidContractDraft });
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('depictionContract.dramaticRegister');
    expect(result.errors).toHaveProperty('depictionContract.directness');
    expect(result.errors).toHaveProperty('depictionContract.aftermath');
    expect(result.errors).not.toHaveProperty('depictionContract.ambiguityHandling');
  });

  it('flags staged accepted candidates and open unknowns across sources', () => {
    const sourceAnalyses: Record<string, ForgeSourceAnalysis> = {
      'src-analysis-1': {
        id: 'src-analysis-1',
        status: 'completed',
        sourceRecord: {
          id: 'src-1',
          fileName: 'trench_log.pdf',
          mimeType: 'application/pdf',
          kind: 'document',
          receivedAt: Date.now(),
        },
        candidates: [
          {
            id: 'cand-1',
            sourceId: 'src-1',
            classification: 'evidence',
            target: 'setting_location',
            label: 'Location',
            explanation: 'Extracted location',
            evidenceIds: [],
            proposedValue: 'Sector 4',
            reviewDecision: 'accepted',
            applicationState: 'staged',
          },
          {
            id: 'cand-2',
            sourceId: 'src-1',
            classification: 'evidence',
            target: 'environmental_rule',
            label: 'Rule',
            explanation: 'Rule',
            evidenceIds: [],
            proposedValue: 'Pressure limits',
            reviewDecision: 'rejected',
            applicationState: 'staged',
          },
        ],
        unknowns: [
          {
            id: 'unk-1',
            category: 'cast',
            question: 'Who locked the bulkhead?',
            status: 'open',
          },
          {
            id: 'unk-2',
            category: 'setting',
            question: 'What is the ambient temperature?',
            status: 'resolved',
            resolution: 'Near freezing',
          },
        ],
        evidence: [],
      },
    };

    const result = validateForgeExportReadiness({
      draft: completeDraft,
      sourceAnalyses,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toHaveProperty('source.src-analysis-1.stagedCandidates');
    expect(result.errors).toHaveProperty('source.src-analysis-1.openUnknowns');
    expect(result.sourceSummary.candidateTotal).toBe(2);
    expect(result.sourceSummary.candidateStagedAccepted).toBe(1);
    expect(result.sourceSummary.candidateRejected).toBe(1);
    expect(result.sourceSummary.unknownOpen).toBe(1);
    expect(result.sourceSummary.unknownResolved).toBe(1);
  });

  it('passes when all candidates are applied/rejected and all unknowns resolved/delegated', () => {
    const sourceAnalyses: Record<string, ForgeSourceAnalysis> = {
      'src-analysis-1': {
        id: 'src-analysis-1',
        status: 'completed',
        sourceRecord: {
          id: 'src-1',
          fileName: 'trench_log.pdf',
          mimeType: 'application/pdf',
          kind: 'document',
          receivedAt: Date.now(),
        },
        candidates: [
          {
            id: 'cand-1',
            sourceId: 'src-1',
            classification: 'evidence',
            target: 'setting_location',
            label: 'Location',
            explanation: 'Extracted location',
            evidenceIds: [],
            proposedValue: 'Sector 4',
            reviewDecision: 'accepted',
            applicationState: 'applied',
          },
          {
            id: 'cand-2',
            sourceId: 'src-1',
            classification: 'evidence',
            target: 'environmental_rule',
            label: 'Rule',
            explanation: 'Rule',
            evidenceIds: [],
            proposedValue: 'Pressure limits',
            reviewDecision: 'rejected',
            applicationState: 'staged',
          },
        ],
        unknowns: [
          {
            id: 'unk-1',
            category: 'cast',
            question: 'Who locked the bulkhead?',
            status: 'contextual_discretion',
          },
          {
            id: 'unk-2',
            category: 'setting',
            question: 'What is the ambient temperature?',
            status: 'resolved',
            resolution: 'Near freezing',
          },
        ],
        evidence: [],
      },
    };

    const result = validateForgeExportReadiness({
      draft: completeDraft,
      sourceAnalyses,
    });

    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
    expect(result.sourceSummary.candidateApplied).toBe(1);
    expect(result.sourceSummary.candidateRejected).toBe(1);
    expect(result.sourceSummary.unknownContextual).toBe(1);
    expect(result.sourceSummary.unknownResolved).toBe(1);
  });
});
