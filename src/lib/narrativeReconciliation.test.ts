import { describe, expect, it } from 'vitest';
import {
  createNarrativeReconciliationReceipt,
  createFallbackNarrativeReconciliationReceipt,
} from './narrativeReconciliation';
import {
  NarrativeReconciliationProposalSchema,
  NarrativeReconciliationReceiptSchema,
  RECONCILIATION_MODES,
  RECONCILIATION_FEASIBILITIES,
  RECONCILIATION_REASON_CODES,
  FICTIONAL_TIME_COSTS,
  AUTHORITY_ALIGNMENTS,
} from '../types/engineContract';

describe('narrativeReconciliation', () => {
  const baseProposal = {
    mode: 'CANONICAL' as const,
    feasibility: 'SUPPORTED' as const,
    reason_code: 'NONE' as const,
    fictional_time_cost: 'MOMENT' as const,
    authority_alignment: 'WITHIN_CONTRACT' as const,
    memory_echo_candidate: 'Observed anomaly in sector 7.',
  };

  it('creates receipt with version 1 and normalized fields for non-antagonist', () => {
    const receipt = createNarrativeReconciliationReceipt(baseProposal, 'protagonist');

    expect(receipt).toEqual({
      version: 1,
      mode: 'CANONICAL',
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      fictional_time_cost: 'MOMENT',
      authority_alignment: 'NOT_APPLICABLE',
      memory_echo_candidate: 'Observed anomaly in sector 7.',
      revision_increment: 0,
    });
  });

  it('preserves authority_alignment for antagonist role', () => {
    const receipt = createNarrativeReconciliationReceipt(baseProposal, 'antagonist');

    expect(receipt.authority_alignment).toBe('WITHIN_CONTRACT');

    const receiptUpper = createNarrativeReconciliationReceipt(baseProposal, 'ANTAGONIST');
    expect(receiptUpper.authority_alignment).toBe('WITHIN_CONTRACT');
  });

  it('forces authority_alignment to NOT_APPLICABLE when role is undefined or non-antagonist', () => {
    const receiptUndefined = createNarrativeReconciliationReceipt(baseProposal);
    expect(receiptUndefined.authority_alignment).toBe('NOT_APPLICABLE');

    const receiptObserver = createNarrativeReconciliationReceipt(baseProposal, 'observer');
    expect(receiptObserver.authority_alignment).toBe('NOT_APPLICABLE');
  });

  it('sets revision_increment to 1 only for EXPERIENTIAL_REANCHORED mode', () => {
    const reanchored = createNarrativeReconciliationReceipt({
      ...baseProposal,
      mode: 'EXPERIENTIAL_REANCHORED',
    });
    expect(reanchored.revision_increment).toBe(1);

    for (const mode of ['NOT_REQUIRED', 'CANONICAL', 'MIXED'] as const) {
      const receipt = createNarrativeReconciliationReceipt({
        ...baseProposal,
        mode,
      });
      expect(receipt.revision_increment).toBe(0);
    }
  });

  it('normalizes blank or whitespace-only memory_echo_candidate to null', () => {
    const receiptBlank = createNarrativeReconciliationReceipt({
      ...baseProposal,
      memory_echo_candidate: '   ',
    });
    expect(receiptBlank.memory_echo_candidate).toBeNull();

    const receiptNull = createNarrativeReconciliationReceipt({
      ...baseProposal,
      memory_echo_candidate: null,
    });
    expect(receiptNull.memory_echo_candidate).toBeNull();
  });

  it('creates a valid fallback reconciliation receipt', () => {
    const fallback = createFallbackNarrativeReconciliationReceipt();

    expect(fallback).toEqual({
      version: 1,
      mode: 'NOT_REQUIRED',
      feasibility: 'UNCLEAR',
      reason_code: 'NONE',
      fictional_time_cost: 'UNCLEAR',
      authority_alignment: 'NOT_APPLICABLE',
      memory_echo_candidate: null,
      revision_increment: 0,
    });

    const parsed = NarrativeReconciliationReceiptSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it('validates all enum vocabularies in schema', () => {
    for (const mode of RECONCILIATION_MODES) {
      for (const feasibility of RECONCILIATION_FEASIBILITIES) {
        const parsed = NarrativeReconciliationProposalSchema.safeParse({
          mode,
          feasibility,
          reason_code: 'NONE',
          fictional_time_cost: 'MOMENT',
          authority_alignment: 'NOT_APPLICABLE',
          memory_echo_candidate: null,
        });
        expect(parsed.success).toBe(true);
      }
    }

    for (const reason of RECONCILIATION_REASON_CODES) {
      const parsed = NarrativeReconciliationProposalSchema.safeParse({
        mode: 'CANONICAL',
        feasibility: 'SUPPORTED',
        reason_code: reason,
        fictional_time_cost: 'MOMENT',
        authority_alignment: 'NOT_APPLICABLE',
        memory_echo_candidate: null,
      });
      expect(parsed.success).toBe(true);
    }

    for (const timeCost of FICTIONAL_TIME_COSTS) {
      const parsed = NarrativeReconciliationProposalSchema.safeParse({
        mode: 'CANONICAL',
        feasibility: 'SUPPORTED',
        reason_code: 'NONE',
        fictional_time_cost: timeCost,
        authority_alignment: 'NOT_APPLICABLE',
        memory_echo_candidate: null,
      });
      expect(parsed.success).toBe(true);
    }

    for (const alignment of AUTHORITY_ALIGNMENTS) {
      const parsed = NarrativeReconciliationProposalSchema.safeParse({
        mode: 'CANONICAL',
        feasibility: 'SUPPORTED',
        reason_code: 'NONE',
        fictional_time_cost: 'MOMENT',
        authority_alignment: alignment,
        memory_echo_candidate: null,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects memory_echo_candidate longer than 240 characters in schema', () => {
    const longCandidate = 'a'.repeat(241);
    const parsed = NarrativeReconciliationProposalSchema.safeParse({
      mode: 'CANONICAL',
      feasibility: 'SUPPORTED',
      reason_code: 'NONE',
      fictional_time_cost: 'MOMENT',
      authority_alignment: 'NOT_APPLICABLE',
      memory_echo_candidate: longCandidate,
    });
    expect(parsed.success).toBe(false);
  });
});
