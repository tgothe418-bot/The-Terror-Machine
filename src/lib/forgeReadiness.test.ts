import { describe, expect, it } from 'vitest';
import { validateForgeDraft, compileForgeDraft } from './forgeCompiler';
import { validateForgeExportReadiness } from './forgeReadiness';
import type { ForgeDraft } from '../types/forge';

describe('Forge Readiness & Compilation (Packet 1-1)', () => {
  const createValidBaseDraft = (): ForgeDraft => ({
    id: 'draft-test-1',
    identity: {
      title: 'The Sub-Level Facility',
      version: '1.0',
      author: 'Author',
      thematicAnchor: 'Isolation',
    },
    title: 'The Sub-Level Facility',
    premise: 'A quarantined laboratory beneath the permafrost.',
    globalPremise: 'A quarantined laboratory beneath the permafrost.',
    setting: {
      location: 'Sub-Level 4',
      atmosphere: 'Freezing, fluorescent hum',
      timePeriod: '1998',
    },
    startingVector: 'COGNITIVE',
    startingTier: 'LATENT',
    cast: [
      {
        id: 'char-user',
        name: 'Technician Ray',
        isUserCharacter: true,
        role: 'Protagonist',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_AIRLOCK' },
      },
      {
        id: 'char-npc-1',
        name: 'Dr. Aris',
        isUserCharacter: false,
        role: 'Chief Researcher',
        presenceDisposition: { kind: 'AT_NODE', nodeId: 'NODE_LAB' },
      },
    ],
    topology: {
      startingNodeId: 'NODE_AIRLOCK',
      nodes: ['NODE_AIRLOCK', 'NODE_LAB'],
      connections: [],
    },
    userOpeningAim: {
      castMemberId: 'char-user',
      disposition: 'NONE_DECLARED',
      aimText: '',
      reviewedAt: Date.now(),
    },
    depictionContract: {
      dramaticRegister: 'Clinical realism',
      directness: 'High directness',
      aftermath: 'Grim consequences',
      ambiguityHandling: 'Explicit uncertainty',
      specialBoundaries: '',
    },
    horrorGrammar: {
      valueBaselineReview: 'REVIEWED',
      pursuitReviews: {
        'char-npc-1': 'REVIEWED',
      },
      valueAnchors: [
        {
          id: 'val-sample',
          holder: { kind: 'PLACE', nodeId: 'NODE_LAB' },
          label: 'Cryo-Sample Integrity',
          description: 'Preserving the biological samples in cold storage.',
          basisSummary: 'Primary mission directive',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
      characterPursuits: [
        {
          id: 'pursuit-sample',
          castMemberId: 'char-npc-1',
          objective: 'Maintain coolant levels',
          presentApproach: 'Checking pressure release valves every 15 minutes',
          locationNodeId: 'NODE_LAB',
          status: 'ACTIVE',
          reviewWindow: 'SCENE_BEAT',
          triggerReferences: [],
          basisSummary: 'Standard operating manual',
          provenance: { kind: 'CREATOR_DEFINED' },
        },
      ],
    },
  });

  it('validates a complete, reviewed draft successfully', () => {
    const draft = createValidBaseDraft();
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('rejects unreviewed value baseline', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.valueBaselineReview = 'UNREVIEWED';
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['horrorGrammar.valueBaselineReview']).toBeDefined();
  });

  it('allows explicit REVIEWED_NONE for value baseline without anchors', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.valueBaselineReview = 'REVIEWED_NONE';
    draft.horrorGrammar!.valueAnchors = [];
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(true);
  });

  it('rejects REVIEWED_NONE if value anchors are still present', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.valueBaselineReview = 'REVIEWED_NONE';
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['horrorGrammar.valueAnchors']).toBeDefined();
  });

  it('rejects non-User cast member without pursuit review', () => {
    const draft = createValidBaseDraft();
    delete draft.horrorGrammar!.pursuitReviews['char-npc-1'];
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['horrorGrammar.pursuitReviews.char-npc-1']).toBeDefined();
  });

  it('allows REVIEWED_NONE for non-User cast pursuit review without active pursuits', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.pursuitReviews['char-npc-1'] = 'REVIEWED_NONE';
    draft.horrorGrammar!.characterPursuits = [];
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(true);
  });

  it('rejects assigning pursuit to a User-controlled character', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.characterPursuits.push({
      id: 'pursuit-user',
      castMemberId: 'char-user',
      objective: 'Escape the facility',
      presentApproach: 'Running down the corridor',
      status: 'ACTIVE',
      reviewWindow: 'MOMENT',
      triggerReferences: [],
      basisSummary: 'Player goal',
      provenance: { kind: 'CREATOR_DEFINED' },
    });
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['horrorGrammar.characterPursuits[1].castMemberId']).toBeDefined();
  });

  it('rejects value anchor with unknown cast member ID', () => {
    const draft = createValidBaseDraft();
    draft.horrorGrammar!.valueAnchors.push({
      id: 'val-unknown',
      holder: { kind: 'CHARACTER', castMemberId: 'char-ghost' },
      label: 'Secret',
      description: 'Hidden intention',
      basisSummary: 'Unknown',
      provenance: { kind: 'CREATOR_DEFINED' },
    });
    const result = validateForgeDraft(draft);
    expect(result.valid).toBe(false);
    expect(result.errors['horrorGrammar.valueAnchors[1].holder.castMemberId']).toBeDefined();
  });

  it('compiles valid draft into immutable Blueprint preserving horror grammar foundations', () => {
    const draft = createValidBaseDraft();
    const compiled = compileForgeDraft(draft, { draftRevision: 1, sourceBaselineRevision: 1 });
    expect(compiled.success).toBe(true);
    if (compiled.success) {
      expect(compiled.blueprint.horrorGrammar?.valueBaselineReview).toBe('REVIEWED');
      expect(compiled.blueprint.horrorGrammar?.valueAnchors).toHaveLength(1);
      expect(compiled.blueprint.horrorGrammar?.characterPursuits).toHaveLength(1);
    }
  });

  it('validateForgeExportReadiness blocks compilation if staged candidates or open unknowns exist', () => {
    const draft = createValidBaseDraft();
    const sourceAnalyses = {
      'src-1': {
        id: 'src-1',
        sourceRecord: {
          id: 'src-1',
          fileName: 'intel.txt',
          mimeType: 'text/plain',
          kind: 'document' as const,
          receivedAt: Date.now(),
        },
        evidence: [],
        candidates: [
          {
            id: 'cand-1',
            sourceId: 'src-1',
            classification: 'evidence' as const,
            target: 'value_anchor' as const,
            label: 'Staged Anchor',
            explanation: 'Staged',
            evidenceIds: [],
            proposedValue: draft.horrorGrammar!.valueAnchors[0],
            reviewDecision: 'accepted' as const,
            applicationState: 'staged' as const,
          },
        ],
        unknowns: [],
        status: 'completed' as const,
      },
    };

    const readiness = validateForgeExportReadiness({ draft, sourceAnalyses });
    expect(readiness.valid).toBe(false);
    expect(readiness.errors['source.src-1.stagedCandidates']).toBeDefined();
  });
});
