import { z } from 'zod';

export const CHARACTER_STANCES = [
  'OPEN',
  'GUARDED',
  'RESISTANT',
  'HOSTILE',
  'AFRAID',
  'WITHDRAWN',
] as const;

export const STANCE_FOCI = ['PLAYER', 'SITUATION'] as const;
export const MAX_STANCE_CHANGES_PER_TURN = 2;
export const MAX_STANCE_RATIONALE_LENGTH = 240;

export const CharacterStanceSchema = z.enum(CHARACTER_STANCES);
export type CharacterStance = z.infer<typeof CharacterStanceSchema>;

export const StanceFocusSchema = z.enum(STANCE_FOCI);
export type StanceFocus = z.infer<typeof StanceFocusSchema>;

export const CharacterStanceRecordSchema = z.strictObject({
  focus: StanceFocusSchema,
  stance: CharacterStanceSchema,
});
export type CharacterStanceRecord = z.infer<typeof CharacterStanceRecordSchema>;

export const CharacterStanceByIdSchema = z.record(
  z.string().trim().min(1),
  CharacterStanceRecordSchema
);
export type CharacterStanceById = Record<string, CharacterStanceRecord>;

export const CharacterStanceChangeProposalSchema = z.strictObject({
  character_id: z.string().trim().min(1).max(120),
  focus: StanceFocusSchema,
  stance: CharacterStanceSchema,
  rationale: z.string().trim().min(1).max(MAX_STANCE_RATIONALE_LENGTH),
});
export type CharacterStanceChangeProposal = z.infer<typeof CharacterStanceChangeProposalSchema>;

export const CharacterStanceProposalSchema = z.strictObject({
  changes: z.array(CharacterStanceChangeProposalSchema).max(MAX_STANCE_CHANGES_PER_TURN),
});
export type CharacterStanceProposal = z.infer<typeof CharacterStanceProposalSchema>;

export const STANCE_DECISION_OUTCOMES = ['APPLIED', 'REJECTED', 'NO_CHANGE'] as const;
export const StanceDecisionOutcomeSchema = z.enum(STANCE_DECISION_OUTCOMES);
export type StanceDecisionOutcome = z.infer<typeof StanceDecisionOutcomeSchema>;

export const STANCE_DECISION_REASONS = [
  'APPLIED',
  'RECONCILIATION_SUPPRESSED',
  'ROLE_NOT_AUTHORIZED',
  'ACTION_NOT_AUTHORIZED',
  'UNKNOWN_CHARACTER',
  'PLAYER_CHARACTER',
  'CHARACTER_ABSENT',
  'COMMUNICATION_TARGET_MISMATCH',
  'NO_CHANGE',
] as const;
export const StanceDecisionReasonSchema = z.enum(STANCE_DECISION_REASONS);
export type StanceDecisionReason = z.infer<typeof StanceDecisionReasonSchema>;

export const CharacterStanceDecisionSchema = z.strictObject({
  proposal: CharacterStanceChangeProposalSchema,
  outcome: StanceDecisionOutcomeSchema,
  reason: StanceDecisionReasonSchema,
  before: CharacterStanceRecordSchema.nullable(),
  after: CharacterStanceRecordSchema.nullable(),
});
export type CharacterStanceDecision = z.infer<typeof CharacterStanceDecisionSchema>;

export const CharacterStanceReceiptSchema = z.strictObject({
  version: z.literal(1),
  pre_state: CharacterStanceByIdSchema,
  post_state: CharacterStanceByIdSchema,
  decisions: z.array(CharacterStanceDecisionSchema),
});
export type CharacterStanceReceipt = z.infer<typeof CharacterStanceReceiptSchema>;
