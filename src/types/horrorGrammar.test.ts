import { describe, expect, it } from 'vitest';
import {
  ValueHolderRefSchema,
  ReviewedProvenanceSchema,
  ValueAnchorSchema,
  CharacterPursuitSchema,
  HorrorGrammarAuthoringSchema,
} from './horrorGrammar';

describe('Horror Grammar Contracts (Packet 1-1)', () => {
  describe('ValueHolderRefSchema', () => {
    it('accepts valid CHARACTER holder', () => {
      const parsed = ValueHolderRefSchema.parse({
        kind: 'CHARACTER',
        castMemberId: 'char-123',
      });
      expect(parsed).toEqual({ kind: 'CHARACTER', castMemberId: 'char-123' });
    });

    it('accepts valid RELATIONSHIP holder with two distinct cast members', () => {
      const parsed = ValueHolderRefSchema.parse({
        kind: 'RELATIONSHIP',
        castMemberIds: ['char-1', 'char-2'],
      });
      expect(parsed).toEqual({ kind: 'RELATIONSHIP', castMemberIds: ['char-1', 'char-2'] });
    });

    it('rejects RELATIONSHIP holder with duplicate cast members', () => {
      const res = ValueHolderRefSchema.safeParse({
        kind: 'RELATIONSHIP',
        castMemberIds: ['char-1', 'char-1'],
      });
      expect(res.success).toBe(false);
    });

    it('accepts valid PLACE holder', () => {
      const parsed = ValueHolderRefSchema.parse({
        kind: 'PLACE',
        nodeId: 'NODE_CRYPTS',
      });
      expect(parsed).toEqual({ kind: 'PLACE', nodeId: 'NODE_CRYPTS' });
    });

    it('accepts valid SCENARIO holder', () => {
      const parsed = ValueHolderRefSchema.parse({
        kind: 'SCENARIO',
      });
      expect(parsed).toEqual({ kind: 'SCENARIO' });
    });
  });

  describe('ReviewedProvenanceSchema', () => {
    it('accepts REVIEWED_SOURCE with sourceId and evidenceIds', () => {
      const parsed = ReviewedProvenanceSchema.parse({
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-1',
        evidenceIds: ['ev-1', 'ev-2'],
      });
      expect(parsed.kind).toBe('REVIEWED_SOURCE');
    });

    it('rejects REVIEWED_SOURCE with empty evidenceIds', () => {
      const res = ReviewedProvenanceSchema.safeParse({
        kind: 'REVIEWED_SOURCE',
        sourceId: 'src-1',
        evidenceIds: [],
      });
      expect(res.success).toBe(false);
    });

    it('accepts CREATOR_DEFINED provenance', () => {
      const parsed = ReviewedProvenanceSchema.parse({
        kind: 'CREATOR_DEFINED',
      });
      expect(parsed.kind).toBe('CREATOR_DEFINED');
    });
  });

  describe('ValueAnchorSchema', () => {
    it('accepts valid ValueAnchor', () => {
      const parsed = ValueAnchorSchema.parse({
        id: 'val-sanctuary',
        holder: { kind: 'PLACE', nodeId: 'NODE_CHAPEL' },
        label: 'Consecrated Ground',
        description: 'The chapel interior remains free of cognitive decay.',
        basisSummary: 'Established by monastic foundation records.',
        provenance: { kind: 'CREATOR_DEFINED' },
      });
      expect(parsed.id).toBe('val-sanctuary');
      expect(parsed.label).toBe('Consecrated Ground');
    });

    it('rejects missing label or description', () => {
      const res = ValueAnchorSchema.safeParse({
        id: 'val-1',
        holder: { kind: 'SCENARIO' },
        label: '',
        description: 'valid description',
        basisSummary: 'valid basis',
        provenance: { kind: 'CREATOR_DEFINED' },
      });
      expect(res.success).toBe(false);
    });
  });

  describe('CharacterPursuitSchema', () => {
    it('accepts valid CharacterPursuit with SCENE_BEAT window', () => {
      const parsed = CharacterPursuitSchema.parse({
        id: 'pursuit-1',
        castMemberId: 'char-tech',
        objective: 'Restore the auxiliary generator circuit',
        presentApproach: 'Systematically testing junction relays in the sub-basement',
        locationNodeId: 'NODE_BASEMENT',
        status: 'ACTIVE',
        reviewWindow: 'SCENE_BEAT',
        triggerReferences: [],
        basisSummary: 'Technician operating orders from initial briefing',
        provenance: { kind: 'CREATOR_DEFINED' },
      });
      expect(parsed.id).toBe('pursuit-1');
      expect(parsed.reviewWindow).toBe('SCENE_BEAT');
    });

    it('requires triggerReferences when reviewWindow is EVENT_DRIVEN', () => {
      const invalidRes = CharacterPursuitSchema.safeParse({
        id: 'pursuit-2',
        castMemberId: 'char-tech',
        objective: 'Barricade the heavy steel door',
        presentApproach: 'Welding reinforcing struts across the frame',
        status: 'ACTIVE',
        reviewWindow: 'EVENT_DRIVEN',
        triggerReferences: [],
        basisSummary: 'Standard defensive contingency',
        provenance: { kind: 'CREATOR_DEFINED' },
      });
      expect(invalidRes.success).toBe(false);

      const validRes = CharacterPursuitSchema.safeParse({
        id: 'pursuit-2',
        castMemberId: 'char-tech',
        objective: 'Barricade the heavy steel door',
        presentApproach: 'Welding reinforcing struts across the frame',
        status: 'ACTIVE',
        reviewWindow: 'EVENT_DRIVEN',
        triggerReferences: ['BREACH_DETECTED', 'LIGHTS_OUT'],
        basisSummary: 'Standard defensive contingency',
        provenance: { kind: 'CREATOR_DEFINED' },
      });
      expect(validRes.success).toBe(true);
    });
  });

  describe('HorrorGrammarAuthoringSchema', () => {
    it('supplies neutral defaults when empty', () => {
      const parsed = HorrorGrammarAuthoringSchema.parse({});
      expect(parsed.valueBaselineReview).toBe('UNREVIEWED');
      expect(parsed.pursuitReviews).toEqual({});
      expect(parsed.valueAnchors).toEqual([]);
      expect(parsed.characterPursuits).toEqual([]);
    });

    it('accepts reviewed foundations', () => {
      const parsed = HorrorGrammarAuthoringSchema.parse({
        valueBaselineReview: 'REVIEWED',
        pursuitReviews: { 'char-1': 'REVIEWED', 'char-2': 'REVIEWED_NONE' },
        valueAnchors: [
          {
            id: 'val-1',
            holder: { kind: 'SCENARIO' },
            label: 'Survival',
            description: 'Survive the night without opening the sealed hatch',
            basisSummary: 'Core premise',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
        characterPursuits: [
          {
            id: 'pursuit-1',
            castMemberId: 'char-1',
            objective: 'Monitor atmospheric pressure gauges',
            presentApproach: 'Sitting in control room logging dial readouts',
            status: 'ACTIVE',
            reviewWindow: 'EXTENDED',
            triggerReferences: [],
            basisSummary: 'Duty log',
            provenance: { kind: 'CREATOR_DEFINED' },
          },
        ],
      });
      expect(parsed.valueBaselineReview).toBe('REVIEWED');
      expect(parsed.valueAnchors).toHaveLength(1);
      expect(parsed.characterPursuits).toHaveLength(1);
    });
  });
});
