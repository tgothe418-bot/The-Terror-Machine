import { describe, it, expect } from 'vitest';
import {
  normalizeCastActivityProposal,
  normalizeGeminiTurnProviderPayload,
} from './geminiTurnTransport';
import { CastActivityProposalSchema } from '../../src/types/horrorGrammar';

describe('geminiTurnTransport: normalizeCastActivityProposal', () => {
  it('preserves an already valid active proposal', () => {
    const raw = {
      kind: 'ACTIVITY',
      proposalId: 'prop-123',
      castMemberId: 'char-entity-41',
      pursuitId: 'pursuit-1',
      locationNodeId: 'node-morgue',
      activitySummary: 'The suture apparatus advances along overhead rails.',
      authorityReferences: ['[aim-char-entity-41]'],
      perceptionPath: 'DIRECT',
      manifestationBlock: {
        type: 'prose',
        content: 'A metallic scraping sound echoes from above.',
      },
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-entity-41');
    expect(normalized.proposalId).toBe('prop-123');
    expect(normalized.perceptionPath).toBe('DIRECT');

    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
  });

  it('recovers missing castMemberId from authorityReferences (Owner: <id>) (Magnum v4 pattern)', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'The entity aligns its surgical calipers over the operating slab.',
      authorityReferences: ['[aim-char-entity-41] Restorative Protocol. Owner: char-entity-41'],
      manifestationBlock: {
        type: 'prose',
        content: 'Pneumatics hiss as steel claws descend toward the table.',
      },
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-entity-41');
    expect(typeof normalized.proposalId).toBe('string');
    expect(normalized.perceptionPath).toBe('DIRECT');

    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
    if (validated.kind === 'ACTIVITY') {
      expect(validated.castMemberId).toBe('char-entity-41');
    }
  });

  it('recovers missing castMemberId from bracketed aim pattern [aim-char-marcus-holt]', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'Marcus Holt tests the emergency seal on the bulkhead.',
      authorityReferences: ['[aim-char-marcus-holt] Secure the perimeter'],
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-marcus-holt');
    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
  });

  it('recovers missing castMemberId from char- token in authorityReferences', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'Maren Ross inspects the cryogenic log files.',
      authorityReferences: ['Authority granted to char-maren-ross for specimen diagnostics'],
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-maren-ross');
    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
  });

  it('recovers missing castMemberId from common alias properties (characterId, cast_member_id, castId)', () => {
    const rawWithCharId = {
      kind: 'ACTIVITY',
      characterId: 'char-maren-ross',
      activitySummary: 'Ross readies her dissection scalpel.',
    };
    expect(normalizeCastActivityProposal(rawWithCharId).castMemberId).toBe('char-maren-ross');

    const rawWithSnake = {
      kind: 'ACTIVITY',
      cast_member_id: 'char-marcus-holt',
      activitySummary: 'Holt checks the chamber radio.',
    };
    expect(normalizeCastActivityProposal(rawWithSnake).castMemberId).toBe('char-marcus-holt');

    const rawWithCastId = {
      kind: 'ACTIVITY',
      castId: 'char-entity-41',
      activitySummary: 'Entity-41 glides across the ceiling track.',
    };
    expect(normalizeCastActivityProposal(rawWithCastId).castMemberId).toBe('char-entity-41');
  });

  it('recovers missing castMemberId from manifestationBlock.speaker if present', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'Holt shouts through the intercom.',
      manifestationBlock: {
        type: 'dialogue',
        speaker: 'char-marcus-holt',
        content: 'Ross! Back away from the rail!',
      },
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-marcus-holt');
    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
  });

  it('recovers missing castMemberId from char- id pattern in activitySummary', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'Target specimen char-entity-41 activates hydraulic feed lines.',
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBe('char-entity-41');
    const validated = CastActivityProposalSchema.parse(normalized);
    expect(validated.kind).toBe('ACTIVITY');
  });

  it('leaves castMemberId undefined if irrecoverable, preserving fail-closed validation', () => {
    const raw = {
      kind: 'ACTIVITY',
      activitySummary: 'Someone or something knocks on the airlock door.',
    };

    const normalized = normalizeCastActivityProposal(raw);
    expect(normalized.castMemberId).toBeUndefined();
    expect(() => CastActivityProposalSchema.parse(normalized)).toThrow();
  });

  it('integrates cleanly into normalizeGeminiTurnProviderPayload', () => {
    const fullPayload = {
      narrative_blocks: [{ type: 'prose', content: 'The darkness deepens.' }],
      cast_activity_proposal: {
        kind: 'ACTIVITY',
        activitySummary: 'The Entity tightens hydraulic grip on the slab.',
        authorityReferences: ['Owner: char-entity-41'],
      },
    };

    const normalized = normalizeGeminiTurnProviderPayload(fullPayload) as Record<string, any>;
    expect(normalized.cast_activity_proposal?.castMemberId).toBe('char-entity-41');
    expect(normalized.cast_activity_proposal?.perceptionPath).toBe('DIRECT');
  });
});
