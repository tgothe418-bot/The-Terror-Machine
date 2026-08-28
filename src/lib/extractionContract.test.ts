import { describe, it, expect } from 'vitest';
import {
  EXTRACTION_COMMUNICATION_MODES,
  EXTRACTION_EDGE_KINDS,
  EXTRACTION_PRESENCE_KINDS,
  EXTRACTION_PURSUIT_REVIEW_WINDOWS,
  EXTRACTION_PURSUIT_STATUSES,
  EXTRACTION_EVIDENCE_CATEGORIES,
  EXTRACTION_CANDIDATE_TARGETS,
  normalizeCommunicationMode,
  normalizeCommunicationModes,
  normalizeEdgeKind,
  normalizeValueHolder,
  normalizePresenceDisposition,
  normalizeCandidateAliases,
  createQuarantinedIssue,
  getForgeExtractionPrompt,
} from './extractionContract';
import {
  CharacterCommunicationModeSchema,
  PresenceDispositionKindSchema,
  ForgeSourceCandidateTargetSchema,
  ForgeSourceEvidenceCategorySchema,
} from '../types/forge';
import { EdgeKindSchema } from '../types/engineContract';
import {
  CharacterPursuitReviewWindowSchema,
  CharacterPursuitStatusSchema,
} from '../types/horrorGrammar';

describe('extractionContract — Canonical Schema Alignment', () => {
  it('aligns communication modes exactly with CharacterCommunicationModeSchema', () => {
    expect(EXTRACTION_COMMUNICATION_MODES).toEqual(CharacterCommunicationModeSchema.options);
    expect(EXTRACTION_COMMUNICATION_MODES).toEqual(['spoken', 'nonverbal', 'mediated']);
  });

  it('aligns edge kinds exactly with EdgeKindSchema', () => {
    expect(EXTRACTION_EDGE_KINDS).toEqual(EdgeKindSchema.options);
    expect(EXTRACTION_EDGE_KINDS).toEqual([
      'PHYSICAL',
      'FORCED_EVENT',
      'MEMORY_RECONSTRUCTION',
      'HISTORICAL_REFERENCE',
      'TERMINAL_EJECTION',
      'AUTHORED_PARADOX',
    ]);
  });

  it('aligns presence kinds exactly with PresenceDispositionKindSchema', () => {
    expect(EXTRACTION_PRESENCE_KINDS).toEqual(PresenceDispositionKindSchema.options);
    expect(EXTRACTION_PRESENCE_KINDS).toEqual(['AT_NODE', 'OFFSTAGE', 'NONLOCAL']);
  });

  it('aligns pursuit review windows and statuses with horrorGrammar schemas', () => {
    expect(EXTRACTION_PURSUIT_REVIEW_WINDOWS).toEqual(CharacterPursuitReviewWindowSchema.options);
    expect(EXTRACTION_PURSUIT_STATUSES).toEqual(CharacterPursuitStatusSchema.options);
  });

  it('aligns candidate targets and evidence categories with forge schemas', () => {
    expect(EXTRACTION_CANDIDATE_TARGETS).toEqual(ForgeSourceCandidateTargetSchema.options);
    expect(EXTRACTION_EVIDENCE_CATEGORIES).toEqual(ForgeSourceEvidenceCategorySchema.options);
  });
});

describe('extractionContract — Deterministic Alias Normalization', () => {
  describe('normalizeCommunicationModes', () => {
    it('preserves canonical values', () => {
      expect(normalizeCommunicationModes(['spoken'])).toEqual(['spoken']);
      expect(normalizeCommunicationModes(['nonverbal', 'mediated'])).toEqual(['nonverbal', 'mediated']);
      expect(normalizeCommunicationModes('spoken')).toEqual(['spoken']);
    });

    it('normalizes unambiguous communication aliases with case and whitespace folding', () => {
      expect(normalizeCommunicationModes([' Verbal ', 'SPEECH', 'Voice'])).toEqual(['spoken']);
      expect(normalizeCommunicationModes(['Gestural', 'body language', 'physical'])).toEqual(['nonverbal']);
      expect(normalizeCommunicationModes(['telephone', 'Radio', 'WRITTEN'])).toEqual(['mediated']);
    });

    it('returns undefined for unmapped/unknown values and does NOT guess a default', () => {
      expect(normalizeCommunicationModes(['telepathic'])).toBeUndefined();
      expect(normalizeCommunicationModes(['unknown_mode', 'spoken'])).toBeUndefined();
      expect(normalizeCommunicationMode('alien_frequency')).toBeUndefined();
    });
  });

  describe('normalizeEdgeKind', () => {
    it('preserves canonical EdgeKind values', () => {
      expect(normalizeEdgeKind('PHYSICAL')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('FORCED_EVENT')).toBe('FORCED_EVENT');
      expect(normalizeEdgeKind('MEMORY_RECONSTRUCTION')).toBe('MEMORY_RECONSTRUCTION');
      expect(normalizeEdgeKind('HISTORICAL_REFERENCE')).toBe('HISTORICAL_REFERENCE');
      expect(normalizeEdgeKind('TERMINAL_EJECTION')).toBe('TERMINAL_EJECTION');
      expect(normalizeEdgeKind('AUTHORED_PARADOX')).toBe('AUTHORED_PARADOX');
    });

    it('normalizes unambiguous connection aliases with trimming and hyphens', () => {
      expect(normalizeEdgeKind('door')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('corridor')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('hallway')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('passage')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('physical-path')).toBe('PHYSICAL');
      expect(normalizeEdgeKind('forced-event')).toBe('FORCED_EVENT');
      expect(normalizeEdgeKind('forced-transition')).toBe('FORCED_EVENT');
      expect(normalizeEdgeKind('memory-reconstruction')).toBe('MEMORY_RECONSTRUCTION');
      expect(normalizeEdgeKind('memory-transition')).toBe('MEMORY_RECONSTRUCTION');
      expect(normalizeEdgeKind('historical-reference')).toBe('HISTORICAL_REFERENCE');
      expect(normalizeEdgeKind('terminal-ejection')).toBe('TERMINAL_EJECTION');
      expect(normalizeEdgeKind('paradox')).toBe('AUTHORED_PARADOX');
      expect(normalizeEdgeKind('non-euclidean')).toBe('AUTHORED_PARADOX');
    });

    it('returns undefined for ambiguous connection tokens and NEVER defaults to PHYSICAL', () => {
      expect(normalizeEdgeKind('exit')).toBeUndefined();
      expect(normalizeEdgeKind('event')).toBeUndefined();
      expect(normalizeEdgeKind('trap')).toBeUndefined();
      expect(normalizeEdgeKind('collapse')).toBeUndefined();
      expect(normalizeEdgeKind('flashback')).toBeUndefined();
      expect(normalizeEdgeKind('portal')).toBeUndefined();
      expect(normalizeEdgeKind('MAGIC_PORTAL')).toBeUndefined();
      expect(normalizeEdgeKind('WARP_ZONE')).toBeUndefined();
      expect(normalizeEdgeKind('')).toBeUndefined();
      expect(normalizeEdgeKind(null)).toBeUndefined();
    });
  });

  describe('normalizeValueHolder', () => {
    it('normalizes CHARACTER holder aliases only when castMemberId is present', () => {
      expect(normalizeValueHolder({ kind: 'person', castMemberId: 'char-1' })).toEqual({
        kind: 'CHARACTER',
        castMemberId: 'char-1',
      });
      expect(normalizeValueHolder({ kind: 'actor', id: 'char-2' })).toEqual({
        kind: 'CHARACTER',
        castMemberId: 'char-2',
      });
      // Without resolving cast ID, does NOT invent ID
      const missingId = normalizeValueHolder({ kind: 'person' });
      expect(missingId?.kind).toBe('CHARACTER');
      expect(missingId?.castMemberId).toBeUndefined();
    });

    it('does not map ambiguous ENTITY to CHARACTER value holder', () => {
      const entityHolder = normalizeValueHolder({ kind: 'entity', id: 'ent-1' });
      // ENTITY is ambiguous and must not map to CHARACTER
      expect(entityHolder?.kind).toBe('entity');
    });

    it('normalizes RELATIONSHIP holder aliases when 2 distinct member IDs exist', () => {
      expect(normalizeValueHolder({ kind: 'relationship', castMemberIds: ['c1', 'c2'] })).toEqual({
        kind: 'RELATIONSHIP',
        castMemberIds: ['c1', 'c2'],
      });
      expect(normalizeValueHolder({ kind: 'pair', members: ['c1', 'c2'] })).toEqual({
        kind: 'RELATIONSHIP',
        castMemberIds: ['c1', 'c2'],
      });
    });

    it('normalizes PLACE holder aliases when nodeId is present', () => {
      expect(normalizeValueHolder({ kind: 'location', nodeId: 'node-kitchen' })).toEqual({
        kind: 'PLACE',
        nodeId: 'node-kitchen',
      });
      expect(normalizeValueHolder({ kind: 'room', id: 'node-attic' })).toEqual({
        kind: 'PLACE',
        nodeId: 'node-attic',
      });
    });

    it('normalizes SCENARIO holder aliases', () => {
      expect(normalizeValueHolder({ kind: 'world' })).toEqual({ kind: 'SCENARIO' });
      expect(normalizeValueHolder({ kind: 'global' })).toEqual({ kind: 'SCENARIO' });
      expect(normalizeValueHolder({ kind: 'scenario' })).toEqual({ kind: 'SCENARIO' });
    });
  });

  describe('normalizePresenceDisposition', () => {
    it('normalizes AT_NODE aliases', () => {
      expect(normalizePresenceDisposition({ kind: 'node', nodeId: 'hall' })).toEqual({
        kind: 'AT_NODE',
        nodeId: 'hall',
      });
      expect(normalizePresenceDisposition({ kind: 'location', nodeId: 'hall' })).toEqual({
        kind: 'AT_NODE',
        nodeId: 'hall',
      });
      expect(normalizePresenceDisposition({ kind: 'in_room', id: 'cellar' })).toEqual({
        kind: 'AT_NODE',
        nodeId: 'cellar',
      });
    });

    it('normalizes OFFSTAGE aliases and rejects ambiguous tokens like HIDDEN and WAITING', () => {
      expect(normalizePresenceDisposition({ kind: 'off_stage' })).toEqual({ kind: 'OFFSTAGE' });
      expect(normalizePresenceDisposition({ kind: 'absent' })).toEqual({ kind: 'OFFSTAGE' });
      expect(normalizePresenceDisposition({ kind: 'hidden' })).toEqual({ kind: 'hidden' });
      expect(normalizePresenceDisposition({ kind: 'waiting' })).toEqual({ kind: 'waiting' });
    });

    it('normalizes NONLOCAL aliases', () => {
      expect(normalizePresenceDisposition({ kind: 'non-local' })).toEqual({ kind: 'NONLOCAL' });
      expect(normalizePresenceDisposition({ kind: 'omnipresent' })).toEqual({ kind: 'NONLOCAL' });
    });
  });

  describe('normalizeCandidateAliases', () => {
    it('normalizes candidate proposedValue for cast expression guidance', () => {
      const input = {
        target: 'cast_expression_guidance',
        proposedValue: {
          communicationModes: ['verbal', 'body language'],
          expressionGuidance: 'Speaks clearly.',
        },
      };
      const result = normalizeCandidateAliases(input);
      const val = result.proposedValue as { communicationModes: string[] };
      expect(val.communicationModes).toEqual(['spoken', 'nonverbal']);
    });

    it('normalizes candidate proposedValue for topology connection', () => {
      const input = {
        target: 'topology_connection',
        proposedValue: {
          from: 'node-1',
          to: 'node-2',
          kind: 'corridor',
          userInitiated: true,
        },
      };
      const result = normalizeCandidateAliases(input);
      const val = result.proposedValue as { kind: string };
      expect(val.kind).toBe('PHYSICAL');
    });

    it('normalizes candidate proposedValue for value anchor', () => {
      const input = {
        target: 'value_anchor',
        proposedValue: {
          id: 'va-1',
          holder: { kind: 'location', nodeId: 'node-cellar' },
          label: 'Cellar Key',
          description: 'A rusty key.',
          basisSummary: 'Found in cellar.',
          provenance: { kind: 'REVIEWED_SOURCE', sourceId: 'src-1', evidenceIds: ['ev-1'] },
        },
      };
      const result = normalizeCandidateAliases(input);
      const val = result.proposedValue as { holder: { kind: string; nodeId: string } };
      expect(val.holder).toEqual({ kind: 'PLACE', nodeId: 'node-cellar' });
    });
  });
});

describe('extractionContract — Sanitized Issues, Parity & Prompt', () => {
  it('enforces parity between ForgeSourceCandidateTargetSchema and EXTRACTION_CANDIDATE_TARGETS', () => {
    const schemaTargets = ForgeSourceCandidateTargetSchema.options;
    expect(EXTRACTION_CANDIDATE_TARGETS).toEqual(schemaTargets);
  });

  it('creates quarantined issue without sensitive payloads or credentials', () => {
    const issue = createQuarantinedIssue('src-123', 3, { target: 'topology_connection', label: 'Secret Path' }, {
      fieldPath: 'proposedValue.kind',
      code: 'INVALID_ENUM',
      message: 'Invalid edge kind value.',
      allowedValues: EXTRACTION_EDGE_KINDS,
    });

    expect(issue).toEqual({
      id: 'src-123-issue-3',
      sourceId: 'src-123',
      candidateIndex: 3,
      candidateTarget: 'topology_connection',
      label: 'Secret Path',
      fieldPath: 'proposedValue.kind',
      code: 'INVALID_ENUM',
      message: 'Invalid edge kind value.',
      allowedValues: [...EXTRACTION_EDGE_KINDS],
      disposition: 'QUARANTINED',
    });
  });

  it('generates structured extraction prompt with exact canonical enums', () => {
    const prompt = getForgeExtractionPrompt('test_doc.md');
    expect(prompt).toContain('"test_doc.md"');
    expect(prompt).toContain('spoken');
    expect(prompt).toContain('nonverbal');
    expect(prompt).toContain('mediated');
    expect(prompt).toContain('PHYSICAL');
    expect(prompt).toContain('FORCED_EVENT');
    expect(prompt).toContain('CHARACTER');
    expect(prompt).toContain('RELATIONSHIP');
    expect(prompt).toContain('PLACE');
    expect(prompt).toContain('SCENARIO');
    expect(prompt).toContain('AT_NODE');
    expect(prompt).toContain('OFFSTAGE');
    expect(prompt).toContain('NONLOCAL');
  });
});
