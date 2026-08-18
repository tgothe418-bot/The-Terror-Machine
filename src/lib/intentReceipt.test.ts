import { describe, expect, it } from 'vitest';
import {
  createIntentReceipt,
  createFallbackIntentReceipt,
} from './intentReceipt';
import {
  IntentProposalSchema,
  IntentReceiptSchema,
  ACTION_KINDS,
  ACTION_SUBTYPES,
  PRESSURE_DIRECTIONS,
  DRAMATIC_TACTICS,
  INTENT_SYNERGIES,
} from '../types/engineContract';

describe('intentReceipt', () => {
  it('creates an intent receipt with version 1 and unchanged proposal fields', () => {
    const proposal = {
      action_kind: 'MOVE' as const,
      action_subtype: 'FLEE' as const,
      pressure_direction: 'DE_ESCALATE' as const,
      dramatic_tactic: 'FLIGHT' as const,
      intent_synergy: 'SUCCESS' as const,
    };

    const receipt = createIntentReceipt(proposal);

    expect(receipt).toEqual({
      version: 1,
      action_kind: 'MOVE',
      action_subtype: 'FLEE',
      pressure_direction: 'DE_ESCALATE',
      dramatic_tactic: 'FLIGHT',
      intent_synergy: 'SUCCESS',
    });
  });

  it('creates a valid fallback intent receipt', () => {
    const fallback = createFallbackIntentReceipt();

    expect(fallback).toEqual({
      version: 1,
      action_kind: 'OTHER',
      action_subtype: null,
      pressure_direction: 'UNCLEAR',
      dramatic_tactic: 'NONE',
      intent_synergy: 'N/A',
    });

    const parsed = IntentReceiptSchema.safeParse(fallback);
    expect(parsed.success).toBe(true);
  });

  it('validates all action_kind enum values in schema', () => {
    for (const kind of ACTION_KINDS) {
      const parsed = IntentProposalSchema.safeParse({
        action_kind: kind,
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'N/A',
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('validates action_subtype values (FLEE, HIDE, null) in schema', () => {
    for (const subtype of [...ACTION_SUBTYPES, null]) {
      const parsed = IntentProposalSchema.safeParse({
        action_kind: 'OBSERVE',
        action_subtype: subtype,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: 'N/A',
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('validates all pressure_direction enum values in schema', () => {
    for (const dir of PRESSURE_DIRECTIONS) {
      const parsed = IntentProposalSchema.safeParse({
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: dir,
        dramatic_tactic: 'NONE',
        intent_synergy: 'N/A',
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('validates all dramatic_tactic enum values in schema', () => {
    for (const tactic of DRAMATIC_TACTICS) {
      const parsed = IntentProposalSchema.safeParse({
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: tactic,
        intent_synergy: 'N/A',
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('validates all intent_synergy enum values in schema', () => {
    for (const syn of INTENT_SYNERGIES) {
      const parsed = IntentProposalSchema.safeParse({
        action_kind: 'OBSERVE',
        action_subtype: null,
        pressure_direction: 'MAINTAIN',
        dramatic_tactic: 'NONE',
        intent_synergy: syn,
      });
      expect(parsed.success).toBe(true);
    }
  });

  it('rejects invalid enum values strictly', () => {
    const invalidKind = IntentProposalSchema.safeParse({
      action_kind: 'INVALID_KIND',
      action_subtype: null,
      pressure_direction: 'MAINTAIN',
      dramatic_tactic: 'NONE',
      intent_synergy: 'N/A',
    });
    expect(invalidKind.success).toBe(false);

    const invalidSubtype = IntentProposalSchema.safeParse({
      action_kind: 'OBSERVE',
      action_subtype: 'INVALID_SUBTYPE',
      pressure_direction: 'MAINTAIN',
      dramatic_tactic: 'NONE',
      intent_synergy: 'N/A',
    });
    expect(invalidSubtype.success).toBe(false);
  });

  it('rejects an intent proposal with an unknown key due to strict object schema', () => {
    const withUnknownKey = {
      action_kind: 'OBSERVE',
      action_subtype: null,
      pressure_direction: 'MAINTAIN',
      dramatic_tactic: 'NONE',
      intent_synergy: 'N/A',
      unknown_extra_field: 'unexpected',
    };
    const parsed = IntentProposalSchema.safeParse(withUnknownKey);
    expect(parsed.success).toBe(false);
  });
});
