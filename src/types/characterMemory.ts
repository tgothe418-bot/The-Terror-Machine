import { z } from 'zod';

export const CHARACTER_MEMORY_SOURCES = ['OBSERVED', 'TOLD'] as const;
export const CHARACTER_MEMORY_CERTAINTIES = ['KNOWN', 'BELIEVED'] as const;
export const MAX_CHARACTER_MEMORY_PROPOSALS = 2;
export const MAX_MEMORIES_PER_CHARACTER = 24;
export const MAX_CHARACTER_MEMORY_FACT_LENGTH = 200;
export const MAX_CHARACTER_MEMORY_RATIONALE_LENGTH = 240;

export const CharacterMemorySourceSchema = z.enum(CHARACTER_MEMORY_SOURCES);
export type CharacterMemorySource = z.infer<typeof CharacterMemorySourceSchema>;

export const CharacterMemoryCertaintySchema = z.enum(CHARACTER_MEMORY_CERTAINTIES);
export type CharacterMemoryCertainty = z.infer<typeof CharacterMemoryCertaintySchema>;

export const CharacterMemoryEntrySchema = z.strictObject({
  id: z.string().trim().min(1),
  fact: z.string().trim().min(1).max(MAX_CHARACTER_MEMORY_FACT_LENGTH),
  source: CharacterMemorySourceSchema,
  certainty: CharacterMemoryCertaintySchema,
  acquired_turn: z.number().int().nonnegative(),
});
export type CharacterMemoryEntry = z.infer<typeof CharacterMemoryEntrySchema>;

export const CharacterMemoryByIdSchema = z.record(
  z.string().trim().min(1),
  z.array(CharacterMemoryEntrySchema)
);
export type CharacterMemoryById = Record<string, CharacterMemoryEntry[]>;

export const CharacterMemoryCandidateSchema = z.strictObject({
  character_id: z.string().trim().min(1).max(120),
  fact: z.string().trim().min(1).max(MAX_CHARACTER_MEMORY_FACT_LENGTH),
  source: CharacterMemorySourceSchema,
  certainty: CharacterMemoryCertaintySchema,
  rationale: z.string().trim().min(1).max(MAX_CHARACTER_MEMORY_RATIONALE_LENGTH),
});
export type CharacterMemoryCandidate = z.infer<typeof CharacterMemoryCandidateSchema>;

export const CharacterMemoryProposalSchema = z.strictObject({
  candidates: z.array(CharacterMemoryCandidateSchema).max(MAX_CHARACTER_MEMORY_PROPOSALS),
});
export type CharacterMemoryProposal = z.infer<typeof CharacterMemoryProposalSchema>;

export const CHARACTER_MEMORY_DECISION_OUTCOMES = ['APPLIED', 'REJECTED', 'NO_CHANGE'] as const;
export const CharacterMemoryDecisionOutcomeSchema = z.enum(CHARACTER_MEMORY_DECISION_OUTCOMES);
export type CharacterMemoryDecisionOutcome = z.infer<typeof CharacterMemoryDecisionOutcomeSchema>;

export const CHARACTER_MEMORY_DECISION_REASONS = [
  'APPLIED',
  'RECONCILIATION_SUPPRESSED',
  'ROLE_NOT_AUTHORIZED',
  'ACTION_NOT_AUTHORIZED',
  'UNKNOWN_CHARACTER',
  'PLAYER_CHARACTER',
  'CHARACTER_ABSENT',
  'COMMUNICATION_TARGET_MISMATCH',
  'SOURCE_ACTION_MISMATCH',
  'DUPLICATE_FACT',
  'STATE_LIMIT',
] as const;
export const CharacterMemoryDecisionReasonSchema = z.enum(CHARACTER_MEMORY_DECISION_REASONS);
export type CharacterMemoryDecisionReason = z.infer<typeof CharacterMemoryDecisionReasonSchema>;

export const CharacterMemoryDecisionSchema = z.strictObject({
  candidate: CharacterMemoryCandidateSchema,
  outcome: CharacterMemoryDecisionOutcomeSchema,
  reason: CharacterMemoryDecisionReasonSchema,
  entry: CharacterMemoryEntrySchema.nullable(),
});
export type CharacterMemoryDecision = z.infer<typeof CharacterMemoryDecisionSchema>;

export const CharacterMemoryReceiptSchema = z.strictObject({
  version: z.literal(1),
  pre_state: CharacterMemoryByIdSchema,
  post_state: CharacterMemoryByIdSchema,
  decisions: z.array(CharacterMemoryDecisionSchema),
});
export type CharacterMemoryReceipt = z.infer<typeof CharacterMemoryReceiptSchema>;
