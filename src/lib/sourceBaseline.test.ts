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
          isUserCharacter: true,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'SUB_LEVEL_1' },
          expressionProfile: {
            communicationModes: ['spoken', 'mediated'],
            expressionGuidance: 'Clipped radio transmissions.',
            silenceGuidance: 'Loss of signal.',
          },
        },
      ],
      userCharacterId: 'char-mercer',
      userOpeningAim: {
        castMemberId: 'char-mercer',
        disposition: 'NONE_DECLARED',
        aimText: '',
        reviewedAt: Date.now(),
      },
      topology: {
        startingNodeId: 'SUB_LEVEL_1',
        nodes: ['SUB_LEVEL_1'],
        connections: [],
      },
      horrorGrammar: {
        valueBaselineReview: 'REVIEWED_NONE',
        pursuitReviews: {
          'char-mercer': 'REVIEWED_NONE',
        },
        valueAnchors: [],
        characterPursuits: [],
      },
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
        proposedValue: {
          id: 'char-1',
          name: 'Dr. Mercer',
          role: 'PROTAGONIST',
          description: '',
          personality: '',
          goals: '',
          traits: [],
          isUserCharacter: false,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
        },
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
        topology: {
          startingNodeId: 'ENGINE_ROOM',
          nodes: ['ENGINE_ROOM'],
          connections: [],
        },
        userCharacterId: 'char-corvus',
        userOpeningAim: {
          castMemberId: 'char-corvus',
          disposition: 'NONE_DECLARED',
          aimText: '',
          reviewedAt: Date.now(),
        },
        horrorGrammar: {
          valueBaselineReview: 'REVIEWED_NONE',
          pursuitReviews: {},
          valueAnchors: [],
          characterPursuits: [],
        },
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
          isUserCharacter: true,
          behaviorVector: 'ADAPTIVE',
          isEntity: false,
          presenceDisposition: { kind: 'AT_NODE', nodeId: 'ENGINE_ROOM' },
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
    it('retains valid entries and quarantines invalid candidates into validationIssues with completed_with_issues status', () => {
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
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.evidence).toHaveLength(1);
      expect(analysis.unknowns).toHaveLength(1);
      expect(analysis.candidates).toHaveLength(1);
      expect(analysis.candidates[0].target).toBe('setting_location');
      expect(analysis.candidates[0].proposedValue).toBe('Marianas Trench Station Sector 9');

      expect(analysis.validationIssues).toHaveLength(2);
      expect(analysis.validationIssues[0].candidateIndex).toBe(2);
      expect(analysis.validationIssues[0].code).toBe('INVALID_ENUM');
      expect(analysis.validationIssues[0].disposition).toBe('QUARANTINED');

      expect(analysis.validationIssues[1].candidateIndex).toBe(3);
      expect(analysis.validationIssues[1].disposition).toBe('QUARANTINED');
    });

    it('quarantines candidate when cast_seed is missing explicit isUserCharacter boolean', () => {
      const sourceRecord: ForgeSourceRecord = {
        id: 'src-test-cast-user-flag',
        fileName: 'cast_log.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
      };

      const payload = {
        evidence: [
          {
            id: 'ev-cast-1',
            category: 'cast',
            claim: 'Dr. Evans is the lead biologist.',
          },
        ],
        candidates: [
          {
            id: 'cand-cast-1',
            classification: 'evidence',
            target: 'cast_seed',
            label: 'Cast: Dr. Evans',
            explanation: 'Lead biologist.',
            evidenceIds: ['ev-cast-1'],
            proposedValue: {
              name: 'Dr. Evans',
              role: 'Biologist',
              // missing explicit isUserCharacter: boolean
            },
          },
        ],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(payload, sourceRecord);
      // Since candidates has 0 valid items, but evidence has 1 valid item, this is completed_with_issues
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.candidates).toHaveLength(0);
      expect(analysis.validationIssues).toHaveLength(1);
      expect(analysis.validationIssues[0].code).toBe('MISSING_REQUIRED_FIELD');
      expect(analysis.validationIssues[0].fieldPath).toBe('proposedValue.isUserCharacter');
    });

    it('normalizes unambiguous aliases during document analysis', () => {
      const sourceRecord: ForgeSourceRecord = {
        id: 'src-test-aliases',
        fileName: 'station_log.txt',
        mimeType: 'text/plain',
        kind: 'document',
        receivedAt: Date.now(),
      };

      const payload = {
        evidence: [
          {
            id: 'ev-1',
            category: 'cast',
            claim: 'Mercer uses radio equipment.',
          },
        ],
        candidates: [
          {
            id: 'cand-expr',
            classification: 'evidence',
            target: 'cast_expression_guidance',
            targetCastMemberId: 'char-mercer',
            label: 'Mercer Expression',
            explanation: 'Uses radio',
            evidenceIds: ['ev-1'],
            proposedValue: {
              communicationModes: ['verbal', 'radio'],
              expressionGuidance: 'Radio dialogue.',
            },
          },
          {
            id: 'cand-conn',
            classification: 'evidence',
            target: 'topology_connection',
            label: 'Station Corridor',
            explanation: 'Physical corridor',
            evidenceIds: ['ev-1'],
            proposedValue: {
              from: 'dock',
              to: 'airlock',
              kind: 'corridor',
              userInitiated: true,
            },
          },
          {
            id: 'cand-anchor',
            classification: 'evidence',
            target: 'value_anchor',
            label: 'Radio Tower',
            explanation: 'Important communication facility',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'va-tower',
              holder: { kind: 'location', nodeId: 'dock' },
              label: 'Radio Tower',
              description: 'Tower on the dock.',
              basisSummary: 'Essential comms.',
              provenance: { kind: 'REVIEWED_SOURCE', sourceId: 'src-test-aliases', evidenceIds: ['ev-1'] },
            },
          },
        ],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(payload, sourceRecord);
      expect(analysis.status).toBe('completed');
      expect(analysis.validationIssues).toHaveLength(0);
      expect(analysis.candidates).toHaveLength(3);

      const exprCand = analysis.candidates.find((c) => c.target === 'cast_expression_guidance');
      const exprVal = exprCand?.proposedValue as { communicationModes: string[] };
      expect(exprVal.communicationModes).toEqual(['spoken', 'mediated']);

      const connCand = analysis.candidates.find((c) => c.target === 'topology_connection');
      const connVal = connCand?.proposedValue as { kind: string };
      expect(connVal.kind).toBe('PHYSICAL');

      const anchorCand = analysis.candidates.find((c) => c.target === 'value_anchor');
      const anchorVal = anchorCand?.proposedValue as { holder: { kind: string; nodeId: string } };
      expect(anchorVal.holder).toEqual({ kind: 'PLACE', nodeId: 'dock' });
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
              isUserCharacter: true,
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
      const castMember = analysis.candidates[0].proposedValue as { id: string; name: string };
      expect(castMember.id).toBe('src-test-cast-fallback-cast-0');
      expect(castMember.name).toBe('Engineer Mercer');
    });

    it('extracts and applies value_anchor and character_pursuit candidates correctly', () => {
      const initialDraft: ForgeDraft = {
        id: 'draft-hg-test',
        title: 'Bunker 11',
        premise: 'Underground fallout facility.',
        setting: { location: 'Bunker', atmosphere: 'Bleak', timePeriod: '1985' },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        depictionContract: {
          dramaticRegister: 'Cold War Realism',
          directness: 'High directness',
          aftermath: 'Grim consequences',
          ambiguityHandling: 'Explicit uncertainty',
          specialBoundaries: 'None',
        },
        cast: [
          {
            id: 'char-guard',
            name: 'Officer Petrov',
            role: 'Sentinel',
            isUserCharacter: false,
            presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_GATE' },
          },
          {
            id: 'char-commander',
            name: 'Commander Yuri',
            role: 'PROTAGONIST',
            isUserCharacter: true,
            presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_GATE' },
          },
        ],
        userCharacterId: 'char-commander',
        userOpeningAim: {
          castMemberId: 'char-commander',
          disposition: 'NONE_DECLARED',
          aimText: '',
          reviewedAt: Date.now(),
        },
        topology: { startingNodeId: 'NODE_GATE', nodes: ['NODE_GATE'], connections: [] },
        horrorGrammar: {
          valueBaselineReview: 'UNREVIEWED',
          pursuitReviews: {
            'char-guard': 'UNREVIEWED',
            'char-commander': 'REVIEWED_NONE',
          },
          valueAnchors: [],
          characterPursuits: [],
        },
      };

      const anchorCandidate: ForgeSourceCandidate = {
        id: 'cand-val-1',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'value_anchor',
        label: 'Defense Perimeter',
        explanation: 'Extracted defense priority',
        evidenceIds: ['ev-1'],
        proposedValue: {
          id: 'val-perimeter',
          holder: { kind: 'PLACE', nodeId: 'NODE_GATE' },
          label: 'Defense Perimeter',
          description: 'Gate must remain locked',
          basisSummary: 'Standing orders',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };

      const applyAnchorRes = applyCandidateToDraft(initialDraft, anchorCandidate);
      expect(applyAnchorRes.success).toBe(true);
      if (!applyAnchorRes.success) return;

      expect(applyAnchorRes.draft.horrorGrammar?.valueBaselineReview).toBe('REVIEWED');
      expect(applyAnchorRes.draft.horrorGrammar?.valueAnchors).toHaveLength(1);

      const pursuitCandidate: ForgeSourceCandidate = {
        id: 'cand-pursuit-1',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'character_pursuit',
        label: 'Guard the Gate',
        explanation: 'Active duty',
        evidenceIds: ['ev-2'],
        proposedValue: {
          id: 'pursuit-guard',
          castMemberId: 'char-guard',
          objective: 'Maintain perimeter watch',
          presentApproach: 'Patrolling gate entrance with rifle ready',
          locationNodeId: 'NODE_GATE',
          status: 'ACTIVE',
          reviewWindow: 'SCENE_BEAT',
          triggerReferences: [],
          basisSummary: 'Duty schedule',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
        targetCastMemberId: 'char-guard',
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };

      const applyPursuitRes = applyCandidateToDraft(applyAnchorRes.draft, pursuitCandidate);
      expect(applyPursuitRes.success).toBe(true);
      if (!applyPursuitRes.success) return;

      expect(applyPursuitRes.draft.horrorGrammar?.pursuitReviews['char-guard']).toBe('REVIEWED');
      expect(applyPursuitRes.draft.horrorGrammar?.characterPursuits).toHaveLength(1);

      const compileRes = compileForgeDraft(applyPursuitRes.draft);
      expect(compileRes.success).toBe(true);
    });

    it('normalizes, dependency-sorts, and applies topology_node, topology_connection, starting_node_selection, expandable_space_anchor, and cast_opening_placement', () => {
      const sourceRecord: ForgeSourceRecord = {
        id: 'src-story-map',
        fileName: 'deep_trench_base.json',
        mimeType: 'application/json',
        kind: 'document',
        receivedAt: 1000,
      };

      const rawPayload = {
        summary: 'Deep trench underwater facility blueprint.',
        evidence: [
          { id: 'ev-1', category: 'topology', claim: 'Bridge and Airlock exist' },
        ],
        candidates: [
          {
            id: 'cand-node-bridge',
            classification: 'evidence',
            target: 'topology_node',
            label: 'Command Bridge',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'BRIDGE',
              label: 'Command Bridge',
              description: 'Central viewport overlooking trench.',
            },
          },
          {
            id: 'cand-node-airlock',
            classification: 'evidence',
            target: 'topology_node',
            label: 'Airlock B',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'AIRLOCK_B',
              label: 'Airlock B',
              description: 'Heavy hydraulic decompression portal.',
            },
          },
          {
            id: 'cand-edge-1',
            classification: 'evidence',
            target: 'topology_connection',
            label: 'Bridge to Airlock B',
            evidenceIds: ['ev-1'],
            proposedValue: {
              from: 'BRIDGE',
              to: 'AIRLOCK_B',
              kind: 'PHYSICAL',
              userInitiated: true,
            },
          },
          {
            id: 'cand-start',
            classification: 'evidence',
            target: 'starting_node_selection',
            label: 'Start at Bridge',
            evidenceIds: ['ev-1'],
            proposedValue: 'BRIDGE',
          },
          {
            id: 'cand-anchor-vent',
            classification: 'inference',
            target: 'expandable_space_anchor',
            label: 'Vent Shaft 3',
            evidenceIds: ['ev-1'],
            parentNodeId: 'BRIDGE',
            proposedValue: {
              id: 'vent-shaft-3',
              parentNodeId: 'BRIDGE',
              label: 'Ventilation Shaft 3',
              description: 'Narrow maintenance conduit branching from bridge.',
            },
          },
          {
            id: 'cand-cast-1',
            classification: 'evidence',
            target: 'cast_seed',
            label: 'Captain Haze',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'char-haze',
              name: 'Captain Haze',
              role: 'PROTAGONIST',
              isUserCharacter: true,
            },
          },
          {
            id: 'cand-cast-2',
            classification: 'evidence',
            target: 'cast_seed',
            label: 'Entity Echo',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'char-echo',
              name: 'The Trench Phantom',
              role: 'ANTAGONIST',
              isUserCharacter: false,
              isEntity: true,
            },
          },
          {
            id: 'cand-disp-haze',
            classification: 'evidence',
            target: 'cast_opening_placement',
            label: 'Haze at Bridge',
            targetCastMemberId: 'char-haze',
            evidenceIds: ['ev-1'],
            proposedValue: {
              kind: 'AT_NODE',
              nodeId: 'BRIDGE',
            },
          },
          {
            id: 'cand-disp-echo',
            classification: 'evidence',
            target: 'cast_opening_placement',
            label: 'Echo Nonlocal',
            targetCastMemberId: 'char-echo',
            evidenceIds: ['ev-1'],
            proposedValue: {
              kind: 'NONLOCAL',
            },
          },
        ],
        unknowns: [],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(rawPayload, sourceRecord);
      expect(analysis.status).toBe('completed');
      expect(analysis.candidates).toHaveLength(9);

      // Verify dependency sorting
      const sorted = sortCandidatesForApplication(analysis.candidates);
      const targets = sorted.map((c) => c.target);
      // Priority 1: cast_seed and topology_node must precede topology_connection and expandable_space_anchor (2),
      // which precede starting_node_selection and cast_opening_placement (3)
      const firstPri2 = targets.findIndex((t) => t === 'topology_connection' || t === 'expandable_space_anchor');
      const lastPri1 = targets.map((t, idx) => ((t === 'cast_seed' || t === 'topology_node') ? idx : -1)).reduce((a, b) => Math.max(a, b), -1);
      expect(lastPri1).toBeLessThan(firstPri2);

      const firstPri3 = targets.findIndex((t) => t === 'starting_node_selection' || t === 'cast_opening_placement');
      expect(firstPri2).toBeLessThan(firstPri3);

      // Apply in dependency sorted order onto an initial draft
      let workingDraft: ForgeDraft = {
        id: 'draft-story-test',
        title: 'Deep Trench Base',
        premise: 'Abyssal outpost under immense hydraulic pressure.',
        setting: { location: 'Trench Outpost', atmosphere: 'Cold', timePeriod: '1979' },
        startingVector: 'COGNITIVE',
        startingTier: 'LATENT',
        depictionContract: {
          dramaticRegister: 'Cosmic existential dread',
          directness: 'High directness',
          aftermath: 'Irreversible damage',
          ambiguityHandling: 'Deliberate void',
          specialBoundaries: 'None',
        },
        cast: [],
        topology: { nodes: [], nodeDefinitions: [], connections: [], anchors: [] },
      };

      for (const cand of sorted) {
        const res = applyCandidateToDraft(workingDraft, cand, sourceRecord.fileName);
        expect(res.success).toBe(true);
        if (res.success) {
          workingDraft = res.draft;
        }
      }

      // Assert draft state
      expect(workingDraft.topology?.nodes).toContain('BRIDGE');
      expect(workingDraft.topology?.nodes).toContain('AIRLOCK_B');
      expect(workingDraft.topology?.startingNodeId).toBe('BRIDGE');
      expect(workingDraft.topology?.connections).toHaveLength(1);
      expect(workingDraft.topology?.anchors).toHaveLength(1);
      expect(workingDraft.topology?.anchors?.[0].id).toBe('vent-shaft-3');

      expect(workingDraft.cast).toHaveLength(2);
      const haze = workingDraft.cast?.find((c) => c.id === 'char-haze');
      expect(haze?.presenceDisposition).toEqual({
        kind: 'AT_NODE',
        nodeId: 'BRIDGE',
      });

      const echo = workingDraft.cast?.find((c) => c.id === 'char-echo');
      expect(echo?.presenceDisposition).toEqual({
        kind: 'NONLOCAL',
      });
    });

    it('fails candidate application atomically with explicit error when referencing missing node or cast member', () => {
      const draft: ForgeDraft = {
        id: 'draft-broken-ref',
        title: 'Outpost',
        cast: [{ id: 'char-mortal', name: 'Mortal Crew', isEntity: false }],
        topology: { nodes: ['ROOM_A'], connections: [] },
      };

      // 1. Connection with unknown destination node
      const badEdgeCand: ForgeSourceCandidate = {
        id: 'cand-bad-edge',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'topology_connection',
        label: 'Broken Edge',
        explanation: 'Points to non-existent node',
        evidenceIds: [],
        proposedValue: {
          from: 'ROOM_A',
          to: 'ROOM_NONEXISTENT',
          kind: 'PHYSICAL',
          userInitiated: true,
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };
      const edgeRes = applyCandidateToDraft(draft, badEdgeCand);
      expect(edgeRes.success).toBe(false);
      if (!edgeRes.success) {
        expect((edgeRes as { error: string }).error).toContain('ROOM_NONEXISTENT');
      }

      // 2. Starting node with unknown node ID
      const badStartCand: ForgeSourceCandidate = {
        id: 'cand-bad-start',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'starting_node_selection',
        label: 'Broken Start',
        explanation: 'Sets start to non-existent node',
        evidenceIds: [],
        proposedValue: 'ROOM_VOID',
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };
      const startRes = applyCandidateToDraft(draft, badStartCand);
      expect(startRes.success).toBe(false);
      if (!startRes.success) {
        expect((startRes as { error: string }).error).toContain('ROOM_VOID');
      }

      // 3. Anchor with unknown parent node ID
      const badAnchorCand: ForgeSourceCandidate = {
        id: 'cand-bad-anchor',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'expandable_space_anchor',
        label: 'Broken Anchor',
        explanation: 'Attaches to non-existent node',
        evidenceIds: [],
        proposedValue: {
          id: 'anchor-orphan',
          parentNodeId: 'ROOM_GHOST',
          label: 'Orphan Anchor',
          description: 'No parent',
          statement: 'Orphan statement',
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };
      const anchorRes = applyCandidateToDraft(draft, badAnchorCand);
      expect(anchorRes.success).toBe(false);
      if (!anchorRes.success) {
        expect((anchorRes as { error: string }).error).toContain('ROOM_GHOST');
      }

      // 4. NONLOCAL placement on non-entity cast member
      const badPlacementCand: ForgeSourceCandidate = {
        id: 'cand-bad-placement',
        sourceId: 'src-1',
        classification: 'evidence',
        target: 'cast_opening_placement',
        label: 'Bad Nonlocal Placement',
        explanation: 'Assigns nonlocal to mortal',
        evidenceIds: [],
        targetCastMemberId: 'char-mortal',
        proposedValue: {
          kind: 'NONLOCAL',
        },
        reviewDecision: 'accepted',
        applicationState: 'staged',
      };
      const placementRes = applyCandidateToDraft(draft, badPlacementCand);
      expect(placementRes.success).toBe(false);
      if (!placementRes.success) {
        expect((placementRes as { error: string }).error).toContain('NONLOCAL');
      }
    });
  });

  describe('Packet 1D-1: Bounded Issue Ledger and Server Provenance Reconstruction', () => {
    const sourceRecord: ForgeSourceRecord = {
      id: 'src-bound-test',
      fileName: 'noisy_import.txt',
      mimeType: 'text/plain',
      kind: 'document',
      receivedAt: Date.now(),
    };

    it('collects exactly 49 issues with 0 omitted issues', () => {
      const candidates: Array<{ id: string; target: string; proposedValue: unknown }> = Array.from({ length: 49 }, (_, i) => ({
        id: `bad-${i}`,
        target: 'cast_seed',
        proposedValue: { id: `c-${i}` }, // missing isUserCharacter
      }));
      candidates.push({
        id: 'valid-cand',
        target: 'setting_location' as const,
        proposedValue: 'The Abandoned Mine',
      });

      const analysis = validateAndNormalizeDocumentAnalysis({ candidates }, sourceRecord);
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.validationIssues).toHaveLength(49);
      expect(analysis.omittedValidationIssueCount).toBe(0);
      expect(analysis.candidates).toHaveLength(1);
    });

    it('collects exactly 50 issues with 0 omitted issues at MAX_VALIDATION_ISSUES boundary', () => {
      const candidates: Array<{ id: string; target: string; proposedValue: unknown }> = Array.from({ length: 50 }, (_, i) => ({
        id: `bad-${i}`,
        target: 'cast_seed',
        proposedValue: { id: `c-${i}` }, // missing isUserCharacter
      }));
      candidates.push({
        id: 'valid-cand',
        target: 'setting_location' as const,
        proposedValue: 'The Abandoned Mine',
      });

      const analysis = validateAndNormalizeDocumentAnalysis({ candidates }, sourceRecord);
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.validationIssues).toHaveLength(50);
      expect(analysis.omittedValidationIssueCount).toBe(0);
      expect(analysis.candidates).toHaveLength(1);
    });

    it('collects 50 issues and records 1 omitted issue when 51 malformed candidates exist', () => {
      const candidates: Array<{ id: string; target: string; proposedValue: unknown }> = Array.from({ length: 51 }, (_, i) => ({
        id: `bad-${i}`,
        target: 'cast_seed',
        proposedValue: { id: `c-${i}` }, // missing isUserCharacter
      }));
      candidates.push({
        id: 'valid-cand',
        target: 'setting_location' as const,
        proposedValue: 'The Abandoned Mine',
      });

      const analysis = validateAndNormalizeDocumentAnalysis({ candidates }, sourceRecord);
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.validationIssues).toHaveLength(50);
      expect(analysis.omittedValidationIssueCount).toBe(1);
      expect(analysis.candidates).toHaveLength(1);
    });

    it('handles noisy document with 80 malformed candidates without exceeding schema limits', () => {
      const candidates: Array<{ id: string; target: string; proposedValue: unknown }> = Array.from({ length: 80 }, (_, i) => ({
        id: `bad-${i}`,
        target: 'cast_seed',
        proposedValue: { id: `c-${i}` }, // missing isUserCharacter
      }));
      candidates.push({
        id: 'valid-cand',
        target: 'setting_location' as const,
        proposedValue: 'The Abandoned Mine',
      });

      const analysis = validateAndNormalizeDocumentAnalysis({ candidates }, sourceRecord);
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.validationIssues).toHaveLength(50);
      expect(analysis.omittedValidationIssueCount).toBe(30);
      expect(analysis.candidates).toHaveLength(1);
    });

    it('reconstructs server provenance authoritatively for value_anchor and character_pursuit', () => {
      const payload = {
        evidence: [
          {
            id: 'ev-1',
            category: 'setting',
            claim: 'Sanctuary contains the relic.',
          },
        ],
        candidates: [
          {
            id: 'cand-va',
            target: 'value_anchor',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'va-relic',
              holder: { kind: 'PLACE', nodeId: 'node-sanctuary' },
              label: 'The Ancient Relic',
              description: 'Sacred artifact',
              basisSummary: 'Protected artifact',
              provenance: { kind: 'UNTRUSTED_MODEL_AUTHOR', sourceId: 'fake-id', evidenceIds: ['fake-ev'] },
            },
          },
          {
            id: 'cand-va-no-ev',
            target: 'value_anchor',
            evidenceIds: [],
            proposedValue: {
              id: 'va-unsupported',
              holder: { kind: 'PLACE', nodeId: 'node-sanctuary' },
              label: 'Unsupported Value',
              description: 'No evidence',
              basisSummary: 'None',
            },
          },
          {
            id: 'cand-pursuit',
            target: 'character_pursuit',
            evidenceIds: ['ev-1'],
            proposedValue: {
              id: 'pursuit-1',
              castMemberId: 'char-priest',
              objective: 'Protect the relic',
              presentApproach: 'Barricade the door',
              status: 'active',
              urgency: 'high',
              reviewWindow: 'every_turn',
              provenance: { kind: 'UNTRUSTED_MODEL_AUTHOR', sourceId: 'fake-id' },
            },
          },
        ],
      };

      const analysis = validateAndNormalizeDocumentAnalysis(payload, sourceRecord);
      expect(analysis.status).toBe('completed_with_issues');
      expect(analysis.candidates).toHaveLength(2); // cand-va and cand-pursuit valid; cand-va-no-ev quarantined

      const vaCand = analysis.candidates.find((c) => c.target === 'value_anchor');
      expect(vaCand).toBeDefined();
      const vaValue = vaCand!.proposedValue as Record<string, unknown>;
      expect(vaValue.provenance).toEqual({
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-bound-test',
        evidenceIds: ['ev-1'],
      });

      const pCand = analysis.candidates.find((c) => c.target === 'character_pursuit');
      expect(pCand).toBeDefined();
      const pValue = pCand!.proposedValue as Record<string, unknown>;
      expect(pValue.provenance).toEqual({
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-bound-test',
        evidenceIds: ['ev-1'],
      });

      const quarantinedVa = analysis.validationIssues?.find((i) => i.candidateIndex === 2);
      expect(quarantinedVa).toBeDefined();
      expect(quarantinedVa!.disposition).toBe('QUARANTINED');
      expect(quarantinedVa!.fieldPath).toBe('evidenceIds');
    });
  });
});
