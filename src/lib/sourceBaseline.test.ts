import { describe, it, expect } from 'vitest';
import {
  buildSourceAnalysisFromBlueprint,
  applyCandidateToDraft,
  validateCandidateEdit,
  rejectCandidate,
  setCandidateReviewDecisionPure,
  sortCandidatesForApplication,
  validateAndNormalizeDocumentAnalysis,
} from './sourceBaseline';
import { ForgeDraft, ForgeSourceCandidate, ForgeSourceRecord } from '../types/forge';
import { compileForgeDraft } from './forgeCompiler';
import { normalizeBlueprint } from './normalizeBlueprint';

describe('sourceBaseline pure functions', () => {
  const sampleBlueprint = {
    title: 'The Drowned Bell',
    globalPremise: 'A submerged cathedral rings under oceanic pressure.',
    setting: {
      location: 'Sub-Atlantic Trench Sector 4',
      atmosphere: 'Suffocating briny darkness',
      timePeriod: '1974 Cold War Deep-Sea Survey',
    },
    environmentalRules: ['Pressure breaches seal all bulkheads', 'Oxygen reserves drain at 2x rate during tremors'],
    topology: {
      nodes: ['BATHYSPHERE_DOCK', 'SUBMERGED_NAVE', 'BELL_TOWER'],
      connections: [],
    },
    cast: [
      {
        id: 'char-diver',
        name: 'Diver Mercer',
        role: 'PROTAGONIST',
        description: 'Lead deep-sea salvage engineer.',
        isEntity: false,
        expressionProfile: {
          communicationModes: ['spoken', 'mediated'],
          expressionGuidance: 'Strained, clipped radio comms through heavy breathing apparatus.',
          silenceGuidance: 'Silence indicates acoustic distortion or sudden pressure drop.',
        },
      },
      {
        id: 'char-bellkeeper',
        name: 'The Bellkeeper',
        role: 'ANTAGONIST',
        description: 'An ancient encrusted entity guarding the bronze carillon.',
        isEntity: true,
        expressionProfile: {
          communicationModes: ['nonverbal', 'mediated'],
          expressionGuidance: 'Low-frequency resonance vibrating through steel hulls.',
        },
      },
    ],
  };

  it('builds a valid ForgeSourceAnalysis from native blueprint without mutating any draft', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-test-1',
      fileName: 'drowned_bell.json',
      mimeType: 'application/json',
      kind: 'native_blueprint',
      receivedAt: Date.now(),
      fileSizeBytes: 4096,
    };
    const analysis = buildSourceAnalysisFromBlueprint(sourceRecord, sampleBlueprint);
    expect(analysis.status).toBe('completed');
    expect(analysis.sourceRecord.fileName).toBe('drowned_bell.json');
    expect(analysis.sourceRecord.kind).toBe('native_blueprint');
    expect(analysis.evidence.length).toBeGreaterThan(0);
    expect(analysis.candidates.length).toBeGreaterThan(0);

    // Candidates should all default to accepted and staged
    analysis.candidates.forEach((cand) => {
      expect(cand.reviewDecision).toBe('accepted');
      expect(cand.applicationState).toBe('staged');
      expect(cand.classification).toBe('evidence');
      expect(cand.evidenceIds.length).toBeGreaterThan(0);
    });

    const titleCand = analysis.candidates.find((c) => c.target === 'scenario_title');
    expect(titleCand?.proposedValue).toBe('The Drowned Bell');

    const exprCands = analysis.candidates.filter((c) => c.target === 'cast_expression_guidance');
    expect(exprCands.length).toBe(2);
    expect(exprCands[0].proposedValue).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Strained, clipped radio comms through heavy breathing apparatus.',
      silenceGuidance: 'Silence indicates acoustic distortion or sudden pressure drop.',
    });
  });

  it('preserves unrelated authored fields when applying an accepted candidate', () => {
    const initialDraft: ForgeDraft = {
      id: 'draft-123',
      title: 'Original Title',
      premise: 'Original Premise',
      globalPremise: 'Original Premise',
      setting: {
        location: 'Original Location',
        atmosphere: 'Original Atmosphere',
        timePeriod: 'Original Period',
      },
      environmentalRules: ['Rule 1'],
      cast: [
        {
          id: 'char-existing',
          name: 'Existing Character',
          role: 'Subject',
          description: 'Authored description',
          isEntity: false,
        },
      ],
      perspectives: [],
      topology: { nodes: ['ROOM_A'], connections: [] },
      references: ['authored_ref.pdf'],
    };

    const candidate: ForgeSourceCandidate = {
      id: 'cand-title',
      sourceId: 'src-1',
      classification: 'evidence',
      target: 'scenario_title',
      label: 'Scenario Title',
      explanation: 'Extracted title',
      evidenceIds: ['ev-1'],
      proposedValue: 'The Drowned Bell',
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const result = applyCandidateToDraft(initialDraft, candidate, 'source.json');
    expect(result.success).toBe(true);
    if (!result.success) return;
    const updated = result.draft;

    // Title should update
    expect(updated.title).toBe('The Drowned Bell');
    expect(updated.identity?.title).toBe('The Drowned Bell');

    // Unrelated fields MUST remain untouched
    expect(updated.premise).toBe('Original Premise');
    expect(updated.setting?.location).toBe('Original Location');
    expect(updated.cast?.[0].name).toBe('Existing Character');
    expect(updated.topology?.nodes).toEqual(['ROOM_A']);

    // Source filename added once to references for provenance
    expect(updated.references).toContain('source.json');
    expect(updated.references).toContain('authored_ref.pdf');
  });

  it('deduplicates rules, topology nodes, and reference attribution', () => {
    const initialDraft: ForgeDraft = {
      id: 'draft-123',
      environmentalRules: ['Pressure rule'],
      topology: { nodes: ['BATHYSPHERE_DOCK'], connections: [] },
      references: ['drowned_bell.json'],
    };

    const ruleCand: ForgeSourceCandidate = {
      id: 'c1',
      sourceId: 's1',
      classification: 'evidence',
      target: 'environmental_rule',
      label: 'Rule',
      explanation: 'rule',
      evidenceIds: [],
      proposedValue: 'Pressure rule',
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const nodeCand: ForgeSourceCandidate = {
      id: 'c2',
      sourceId: 's1',
      classification: 'evidence',
      target: 'initial_topology_node',
      label: 'Node',
      explanation: 'node',
      evidenceIds: [],
      proposedValue: 'BATHYSPHERE_DOCK',
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const res1 = applyCandidateToDraft(initialDraft, ruleCand, 'drowned_bell.json');
    expect(res1.success).toBe(true);
    if (!res1.success) return;
    expect(res1.draft.environmentalRules).toEqual(['Pressure rule']);
    expect(res1.draft.references).toEqual(['drowned_bell.json']);

    const res2 = applyCandidateToDraft(res1.draft, nodeCand, 'drowned_bell.json');
    expect(res2.success).toBe(true);
    if (!res2.success) return;
    expect(res2.draft.topology?.nodes).toEqual(['BATHYSPHERE_DOCK']);
  });

  it('applies cast expression guidance candidate to target cast member', () => {
    const initialDraft: ForgeDraft = {
      id: 'draft-123',
      cast: [
        {
          id: 'char-diver',
          name: 'Diver Mercer',
          role: 'PROTAGONIST',
          description: 'Lead engineer.',
          isEntity: false,
        },
      ],
    };

    const exprCand: ForgeSourceCandidate = {
      id: 'c-expr',
      sourceId: 's1',
      classification: 'evidence',
      target: 'cast_expression_guidance',
      label: 'Expression',
      explanation: 'Guidance',
      evidenceIds: ['ev-expr'],
      proposedValue: {
        communicationModes: ['spoken', 'mediated'],
        expressionGuidance: 'Static-heavy radio comms.',
      },
      targetCastMemberId: 'char-diver',
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const result = applyCandidateToDraft(initialDraft, exprCand);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.draft.cast?.[0].expressionProfile).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Static-heavy radio comms.',
    });
  });

  it('normalizes document analysis with validateAndNormalizeDocumentAnalysis', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-doc-1',
      fileName: 'manifest.pdf',
      mimeType: 'application/pdf',
      kind: 'document',
      receivedAt: Date.now(),
      fileSizeBytes: 8192,
    };

    const rawAnalysis = {
      summary: 'Test summary',
      evidence: [{ id: 'ev-1', category: 'setting', claim: 'Underwater research post' }],
      candidates: [
        {
          id: 'c1',
          classification: 'evidence',
          target: 'setting_location',
          label: 'Location',
          explanation: 'Found in document',
          evidenceIds: ['ev-1'],
          proposedValue: 'Sector 7 Facility',
        },
      ],
      unknowns: [{ id: 'u1', category: 'cast', question: 'How many crew survived?' }],
    };

    const normalized = validateAndNormalizeDocumentAnalysis(rawAnalysis, sourceRecord);
    expect(normalized.id).toBe('src-doc-1-analysis');
    expect(normalized.sourceRecord.id).toBe('src-doc-1');
    expect(normalized.candidates.length).toBe(1);
    expect(normalized.candidates[0].reviewDecision).toBe('accepted');
    expect(normalized.candidates[0].applicationState).toBe('staged');
    expect(normalized.candidates[0].sourceId).toBe('src-doc-1');
  });

  it('round-trips approved expression guidance through compile, export, and normalization', () => {
    const draft: ForgeDraft = {
      id: 'draft-full',
      title: 'The Drowned Bell',
      premise: 'Submerged nightmare under pressure.',
      setting: {
        location: 'Deep Trench',
        atmosphere: 'Dark and wet',
        timePeriod: '1974',
      },
      startingVector: 'COGNITIVE',
      startingTier: 'LATENT',
      depictionContract: {
        dramaticRegister: 'Psychological Dread',
        directness: 'Implied and atmospheric',
        aftermath: 'Lingering somatic unease',
        ambiguityHandling: 'Unresolved existential threat',
        specialBoundaries: 'No torture',
      },
      cast: [
        {
          id: 'char-mercer',
          name: 'Diver Mercer',
          role: 'PROTAGONIST',
          description: 'Engineer',
          expressionProfile: {
            communicationModes: ['spoken', 'mediated'],
            expressionGuidance: 'Clipped radio transmissions.',
            silenceGuidance: 'Loss of signal.',
          },
        },
      ],
    };

    const compileRes = compileForgeDraft(draft);
    expect(compileRes.success).toBe(true);
    if (!compileRes.success) return;

    // Verify expression profile is present in compiled blueprint artifact
    const compiledCastMember = compileRes.blueprint.cast?.[0];
    expect(compiledCastMember?.expressionProfile).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Clipped radio transmissions.',
      silenceGuidance: 'Loss of signal.',
    });

    // Verify roundtrip through JSON and normalization
    const jsonExport = compileRes.artifact.json;
    const reimported = JSON.parse(jsonExport);
    const normalized = normalizeBlueprint(reimported);
    expect(normalized.cast?.[0].expressionProfile).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Clipped radio transmissions.',
      silenceGuidance: 'Loss of signal.',
    });
  });

  it('validates candidate edits, decisions, and rejection without draft mutation', () => {
    const cand: ForgeSourceCandidate = {
      id: 'c1',
      sourceId: 's1',
      classification: 'evidence',
      target: 'setting_location',
      label: 'Location',
      explanation: 'loc',
      evidenceIds: [],
      proposedValue: 'Original Place',
      reviewDecision: 'accepted',
      applicationState: 'staged',
    };

    const validEdit = validateCandidateEdit(cand, 'Edited Sub-Sea Trench');
    expect(validEdit.valid).toBe(true);
    expect(validEdit.updatedCandidate?.proposedValue).toBe('Edited Sub-Sea Trench');
    expect(validEdit.updatedCandidate?.reviewDecision).toBe('accepted');
    expect(validEdit.updatedCandidate?.applicationState).toBe('staged');

    const emptyEdit = validateCandidateEdit(cand, '   ');
    expect(emptyEdit.valid).toBe(false);

    const rejected = rejectCandidate(cand);
    expect(rejected.reviewDecision).toBe('rejected');
    expect(rejected.applicationState).toBe('staged');

    const restored = setCandidateReviewDecisionPure(rejected, 'accepted');
    expect(restored.reviewDecision).toBe('accepted');
    expect(restored.applicationState).toBe('staged');
  });

  it('sorts candidates deterministically by priority: cast_seed before expression guidance', () => {
    const candidates: ForgeSourceCandidate[] = [
      {
        id: 'c-expr',
        sourceId: 's1',
        classification: 'evidence',
        target: 'cast_expression_guidance',
        label: 'Expr',
        explanation: '',
        evidenceIds: [],
        proposedValue: { communicationModes: ['spoken'], expressionGuidance: 'test' },
        targetCastMemberId: 'char-1',
        reviewDecision: 'accepted',
        applicationState: 'staged',
      },
      {
        id: 'c-loc',
        sourceId: 's1',
        classification: 'evidence',
        target: 'setting_location',
        label: 'Loc',
        explanation: '',
        evidenceIds: [],
        proposedValue: 'Trench',
        reviewDecision: 'accepted',
        applicationState: 'staged',
      },
      {
        id: 'c-cast',
        sourceId: 's1',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast',
        explanation: '',
        evidenceIds: [],
        proposedValue: { id: 'char-1', name: 'Dr. Mercer', role: 'PROTAGONIST' },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      },
    ];

    const sorted = sortCandidatesForApplication(candidates);
    expect(sorted.map((c) => c.target)).toEqual([
      'cast_seed',
      'setting_location',
      'cast_expression_guidance',
    ]);
  });

  describe('cast_seed candidate application', () => {
    it('applies a valid cast_seed candidate to the draft and subsequent blueprint compilation succeeds', () => {
      const initialDraft: ForgeDraft = {
        id: 'draft-test-cast',
        title: 'Facility Omega',
        premise: 'Deep ocean containment breach.',
        setting: {
          location: 'Sector 4',
          atmosphere: 'Humid',
          timePeriod: 'Present',
        },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        depictionContract: {
          dramaticRegister: 'Claustrophobic Survival',
          directness: 'Visceral environmental cues',
          aftermath: 'Psychological trauma',
          ambiguityHandling: 'Unexplained signals',
          specialBoundaries: 'None',
        },
        cast: [],
      };

      const castCandidate: ForgeSourceCandidate = {
        id: 'cand-cast-1',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Chief Engineer Corvus',
        explanation: 'Extracted from crew manifest.',
        evidenceIds: ['ev-1'],
        proposedValue: {
          id: 'char-corvus',
          name: 'Chief Engineer Corvus',
          role: 'PROTAGONIST',
          description: 'Systems specialist handling bulkhead repairs.',
          personality: 'Cautious and methodical.',
          goals: 'Restore primary life support.',
          traits: ['Engine Technician', 'Cold Under Pressure'],
          isUserCharacter: false,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };

      const applyRes = applyCandidateToDraft(initialDraft, castCandidate, 'manifest.json');
      expect(applyRes.success).toBe(true);
      if (!applyRes.success) return;
      expect(applyRes.draft.cast?.length).toBe(1);
      expect(applyRes.draft.cast?.[0].id).toBe('char-corvus');
      expect(applyRes.draft.cast?.[0].name).toBe('Chief Engineer Corvus');
      expect(applyRes.draft.cast?.[0].role).toBe('PROTAGONIST');
      expect(applyRes.draft.references).toContain('manifest.json');

      const compileRes = compileForgeDraft(applyRes.draft);
      expect(compileRes.success).toBe(true);
    });

    it('updates an existing member when proposedValue shares the same stable id', () => {
      const initialDraft: ForgeDraft = {
        id: 'draft-test-update',
        title: 'Facility Omega',
        premise: 'Deep ocean containment breach.',
        cast: [
          {
            id: 'char-corvus',
            name: 'Corvus',
            role: 'Subject',
            description: 'Old description',
            behaviorVector: 'ADAPTIVE',
          },
        ],
      };

      const updateCandidate: ForgeSourceCandidate = {
        id: 'cand-cast-update',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Chief Corvus',
        explanation: 'Updated telemetry profile.',
        evidenceIds: [],
        proposedValue: {
          id: 'char-corvus',
          name: 'Chief Engineer Corvus',
          role: 'PROTAGONIST',
          description: 'Refined systems lead description.',
          personality: 'Methodical',
          goals: 'Restore life support',
          traits: ['Technician'],
          isUserCharacter: false,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };

      const applyRes = applyCandidateToDraft(initialDraft, updateCandidate);
      expect(applyRes.success).toBe(true);
      if (!applyRes.success) return;
      expect(applyRes.draft.cast?.length).toBe(1);
      expect(applyRes.draft.cast?.[0].id).toBe('char-corvus');
      expect(applyRes.draft.cast?.[0].name).toBe('Chief Engineer Corvus');
      expect(applyRes.draft.cast?.[0].role).toBe('PROTAGONIST');
      expect(applyRes.draft.cast?.[0].description).toBe('Refined systems lead description.');
    });

    it('appends a new member when id is different even if names are identical', () => {
      const initialDraft: ForgeDraft = {
        id: 'draft-test-append',
        title: 'Facility Omega',
        premise: 'Deep ocean containment breach.',
        cast: [
          {
            id: 'char-corvus-1',
            name: 'Corvus',
            role: 'PROTAGONIST',
            behaviorVector: 'ADAPTIVE',
          },
        ],
      };

      const duplicateNameCandidate: ForgeSourceCandidate = {
        id: 'cand-cast-2',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'cast_seed',
        label: 'Cast Member: Corvus',
        explanation: 'Another entity with the same name.',
        evidenceIds: [],
        proposedValue: {
          id: 'char-corvus-clone-2',
          name: 'Corvus',
          role: 'ANTAGONIST',
          description: 'Synthetic mimic',
          personality: 'Uncanny',
          goals: 'Infiltrate the crew',
          traits: ['Mimic'],
          isUserCharacter: false,
          behaviorVector: 'INSURGENT',
          isEntity: true,
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };

      const applyRes = applyCandidateToDraft(initialDraft, duplicateNameCandidate);
      expect(applyRes.success).toBe(true);
      if (!applyRes.success) return;
      expect(applyRes.draft.cast?.length).toBe(2);
      expect(applyRes.draft.cast?.[0].id).toBe('char-corvus-1');
      expect(applyRes.draft.cast?.[1].id).toBe('char-corvus-clone-2');
      expect(applyRes.draft.cast?.[1].role).toBe('ANTAGONIST');
    });

    it('rejects invalid candidate values without corrupting the draft', () => {
      const initialDraft: ForgeDraft = {
        id: 'draft-test-invalid',
        title: 'Facility Omega',
        premise: 'Deep ocean containment breach.',
        cast: [
          {
            id: 'char-corvus-1',
            name: 'Corvus',
            role: 'PROTAGONIST',
            behaviorVector: 'ADAPTIVE',
          },
        ],
      };

      const invalidCandidate = {
        id: 'cand-cast-bad',
        sourceId: 'src-1',
        classification: 'evidence' as const,
        target: 'cast_seed' as const,
        label: 'Invalid Cast',
        explanation: 'Malformed',
        evidenceIds: [],
        proposedValue: null,
        reviewDecision: 'accepted' as const,
        applicationState: 'staged' as const,
      } as unknown as ForgeSourceCandidate;

      const applyRes = applyCandidateToDraft(initialDraft, invalidCandidate);
      expect(applyRes.success).toBe(false);
      expect(applyRes.draft).toBe(initialDraft);
      expect(applyRes.draft.cast?.length).toBe(1);
    });
  });

  describe('validateAndNormalizeDocumentAnalysis partial extraction recovery', () => {
    it('retains valid entries and drops invalid candidates/evidence/unknowns without failing the analysis', () => {
      const sourceRecord: ForgeSourceRecord = {
        id: 'src-test-recovery-1',
        fileName: 'research_notes.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
        fileSizeBytes: 1024,
      };

      const payload = {
        summary: 'Preliminary research on Submerged Station Sector 9.',
        evidence: [
          {
            id: 'ev-valid-1',
            category: 'setting',
            claim: 'The station is located in the Marianas Trench.',
            excerpt: 'Marianas Trench Station Sector 9.',
          },
          {
            id: 'ev-invalid-cat',
            category: 'unsupported_category_name',
            claim: 'Some claim with bad category.',
          },
        ],
        candidates: [
          {
            id: 'cand-valid-loc',
            classification: 'evidence',
            target: 'setting_location',
            label: 'Setting Location',
            explanation: 'Extracted from research notes.',
            evidenceIds: ['ev-valid-1'],
            proposedValue: 'Marianas Trench Station Sector 9',
          },
          {
            id: 'cand-invalid-expr',
            classification: 'evidence',
            target: 'cast_expression_guidance',
            targetCastMemberId: 'char-scientist-1',
            label: 'Scientist Expression',
            explanation: 'Has invalid communication mode.',
            evidenceIds: ['ev-valid-1'],
            proposedValue: {
              communicationModes: ['telepathic_projection'], // unsupported communication mode
              expressionGuidance: 'Project thoughts into minds.',
            },
          },
          {
            id: 'cand-invalid-target',
            classification: 'evidence',
            target: 'unknown_unsupported_target',
            label: 'Invalid Target Candidate',
            explanation: 'Invalid target type.',
            evidenceIds: [],
            proposedValue: 'some value',
          },
        ],
        unknowns: [
          {
            id: 'unk-valid-1',
            category: 'setting',
            question: 'What is the primary power source?',
          },
          {
            id: 'unk-invalid-cat',
            category: 'bad_unknown_cat',
            question: 'Invalid category unknown.',
          },
        ],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(payload, sourceRecord);
      expect(analysis.status).toBe('completed');
      expect(analysis.id).toBe('src-test-recovery-1-analysis');
      expect(analysis.errorMessage).toBeUndefined();

      // Only valid evidence kept
      expect(analysis.evidence).toHaveLength(1);
      expect(analysis.evidence[0].id).toBe('ev-valid-1');
      expect(analysis.evidence[0].category).toBe('setting');

      // Only valid candidates kept
      expect(analysis.candidates).toHaveLength(1);
      expect(analysis.candidates[0].target).toBe('setting_location');
      expect(analysis.candidates[0].proposedValue).toBe('Marianas Trench Station Sector 9');
      expect(analysis.candidates[0].reviewDecision).toBe('accepted');
      expect(analysis.candidates[0].applicationState).toBe('staged');

      // Only valid unknowns kept
      expect(analysis.unknowns).toHaveLength(1);
      expect(analysis.unknowns[0].id).toBe('unk-valid-1');
    });

    it('supplies stable fallback id for cast_seed without id and sets default reviewDecision and applicationState', () => {
      const sourceRecord: ForgeSourceRecord = {
        id: 'src-test-cast-fallback',
        fileName: 'cast_log.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
      };

      const payload = {
        candidates: [
          {
            target: 'cast_seed',
            label: 'Station Engineer',
            explanation: 'Extracted character',
            proposedValue: {
              name: 'Engineer Mercer',
              role: 'PROTAGONIST',
              description: 'Chief maintenance specialist.',
              isEntity: false,
              behaviorVector: 'ADAPTIVE',
            },
          },
        ],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(payload, sourceRecord);
      expect(analysis.status).toBe('completed');
      expect(analysis.candidates).toHaveLength(1);
      expect(analysis.candidates[0].target).toBe('cast_seed');
      expect(analysis.candidates[0].reviewDecision).toBe('accepted');
      expect(analysis.candidates[0].applicationState).toBe('staged');
      const castMember = analysis.candidates[0].proposedValue as { id: string; name: string };
      expect(castMember.id).toBe('src-test-cast-fallback-cast-0');
      expect(castMember.name).toBe('Engineer Mercer');
    });
  });
});
