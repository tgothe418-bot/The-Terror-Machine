import { describe, it, expect } from 'vitest';
import {
  buildSourceAnalysisFromBlueprint,
  applyCandidateToDraft,
  validateCandidateEdit,
  rejectCandidate,
} from './sourceBaseline';
import { ForgeDraft, ForgeSourceCandidate } from '../types/forge';
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
    const analysis = buildSourceAnalysisFromBlueprint(sampleBlueprint, 'drowned_bell.json', 4096);
    expect(analysis.status).toBe('completed');
    expect(analysis.sourceRecord.fileName).toBe('drowned_bell.json');
    expect(analysis.sourceRecord.kind).toBe('native_blueprint');
    expect(analysis.evidence.length).toBeGreaterThan(0);
    expect(analysis.candidates.length).toBeGreaterThan(0);

    // Candidates should all be pending
    analysis.candidates.forEach((cand) => {
      expect(cand.reviewState).toBe('pending');
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
      reviewState: 'pending',
    };

    const updated = applyCandidateToDraft(initialDraft, candidate, 'source.json');

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
      reviewState: 'pending',
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
      reviewState: 'pending',
    };

    const res1 = applyCandidateToDraft(initialDraft, ruleCand, 'drowned_bell.json');
    expect(res1.environmentalRules).toEqual(['Pressure rule']);
    expect(res1.references).toEqual(['drowned_bell.json']);

    const res2 = applyCandidateToDraft(res1, nodeCand, 'drowned_bell.json');
    expect(res2.topology?.nodes).toEqual(['BATHYSPHERE_DOCK']);
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
      reviewState: 'pending',
    };

    const updated = applyCandidateToDraft(initialDraft, exprCand);
    expect(updated.cast?.[0].expressionProfile).toEqual({
      communicationModes: ['spoken', 'mediated'],
      expressionGuidance: 'Static-heavy radio comms.',
    });
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

  it('validates candidate edits and rejection without draft mutation', () => {
    const cand: ForgeSourceCandidate = {
      id: 'c1',
      sourceId: 's1',
      classification: 'evidence',
      target: 'setting_location',
      label: 'Location',
      explanation: 'loc',
      evidenceIds: [],
      proposedValue: 'Original Place',
      reviewState: 'pending',
    };

    const validEdit = validateCandidateEdit(cand, 'Edited Sub-Sea Trench');
    expect(validEdit.valid).toBe(true);
    expect(validEdit.updatedCandidate?.proposedValue).toBe('Edited Sub-Sea Trench');
    expect(validEdit.updatedCandidate?.reviewState).toBe('pending');

    const emptyEdit = validateCandidateEdit(cand, '   ');
    expect(emptyEdit.valid).toBe(false);

    const rejected = rejectCandidate(cand);
    expect(rejected.reviewState).toBe('rejected');
  });
});
