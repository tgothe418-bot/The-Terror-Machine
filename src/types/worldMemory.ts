import { z } from 'zod';

export const WORLD_MEMORY_KINDS = [
  'ESTABLISHED_FACT',
  'DISCOVERED_EVIDENCE',
  'ENVIRONMENTAL_CONDITION',
  'PERSISTENT_CONSEQUENCE',
] as const;

export const WORLD_MEMORY_SCOPES = ['GLOBAL', 'NODE'] as const;
export const MAX_WORLD_MEMORY_CANDIDATES = 2;
export const MAX_WORLD_MEMORY_ENTRIES = 64;
export const MAX_WORLD_MEMORY_STATEMENT_LENGTH = 240;
export const MAX_WORLD_MEMORY_RATIONALE_LENGTH = 240;

export const WorldMemoryKindSchema = z.enum(WORLD_MEMORY_KINDS);
export type WorldMemoryKind = z.infer<typeof WorldMemoryKindSchema>;

export const WorldMemoryScopeSchema = z.enum(WORLD_MEMORY_SCOPES);
export type WorldMemoryScope = z.infer<typeof WorldMemoryScopeSchema>;

export const WorldMemoryEntrySchema = z
  .strictObject({
    id: z.string().trim().min(1),
    kind: WorldMemoryKindSchema,
    scope: WorldMemoryScopeSchema,
    node_id: z.string().trim().min(1).max(120).nullable(),
    statement: z.string().trim().min(1).max(MAX_WORLD_MEMORY_STATEMENT_LENGTH),
    established_turn: z.number().int().nonnegative(),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'GLOBAL') {
      if (data.node_id !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GLOBAL scope requires node_id to be null',
          path: ['node_id'],
        });
      }
    } else if (data.scope === 'NODE') {
      if (data.node_id === null || data.node_id.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'NODE scope requires a non-empty node_id',
          path: ['node_id'],
        });
      }
    }
  });
export type WorldMemoryEntry = z.infer<typeof WorldMemoryEntrySchema>;

export const WorldMemoryStateSchema = z
  .array(WorldMemoryEntrySchema)
  .max(MAX_WORLD_MEMORY_ENTRIES);
export type WorldMemoryState = z.infer<typeof WorldMemoryStateSchema>;

export const WorldMemoryCandidateSchema = z
  .strictObject({
    kind: WorldMemoryKindSchema,
    scope: WorldMemoryScopeSchema,
    node_id: z.string().trim().min(1).max(120).nullable(),
    statement: z.string().trim().min(1).max(MAX_WORLD_MEMORY_STATEMENT_LENGTH),
    rationale: z.string().trim().min(1).max(MAX_WORLD_MEMORY_RATIONALE_LENGTH),
  })
  .superRefine((data, ctx) => {
    if (data.scope === 'GLOBAL') {
      if (data.node_id !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'GLOBAL scope requires node_id to be null',
          path: ['node_id'],
        });
      }
    } else if (data.scope === 'NODE') {
      if (data.node_id === null || data.node_id.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'NODE scope requires a non-empty node_id',
          path: ['node_id'],
        });
      }
    }
  });
export type WorldMemoryCandidate = z.infer<typeof WorldMemoryCandidateSchema>;

export const WorldMemoryProposalSchema = z.strictObject({
  candidates: z.array(WorldMemoryCandidateSchema).max(MAX_WORLD_MEMORY_CANDIDATES),
});
export type WorldMemoryProposal = z.infer<typeof WorldMemoryProposalSchema>;

export const WORLD_MEMORY_DECISION_OUTCOMES = ['APPLIED', 'REJECTED', 'NO_CHANGE'] as const;
export const WorldMemoryDecisionOutcomeSchema = z.enum(WORLD_MEMORY_DECISION_OUTCOMES);
export type WorldMemoryDecisionOutcome = z.infer<typeof WorldMemoryDecisionOutcomeSchema>;

export const WORLD_MEMORY_DECISION_REASONS = [
  'APPLIED',
  'RECONCILIATION_SUPPRESSED',
  'ROLE_NOT_AUTHORIZED',
  'ACTION_NOT_AUTHORIZED',
  'GLOBAL_SCOPE_NOT_AUTHORIZED',
  'CURRENT_NODE_MISMATCH',
  'COMMUNICATION_SOURCE_MISSING',
  'DUPLICATE_ENTRY',
  'STATE_LIMIT',
] as const;
export const WorldMemoryDecisionReasonSchema = z.enum(WORLD_MEMORY_DECISION_REASONS);
export type WorldMemoryDecisionReason = z.infer<typeof WorldMemoryDecisionReasonSchema>;

export const WorldMemoryDecisionSchema = z.strictObject({
  candidate: WorldMemoryCandidateSchema,
  outcome: WorldMemoryDecisionOutcomeSchema,
  reason: WorldMemoryDecisionReasonSchema,
  entry: WorldMemoryEntrySchema.nullable(),
});
export type WorldMemoryDecision = z.infer<typeof WorldMemoryDecisionSchema>;

export const WorldMemoryReceiptSchema = z.strictObject({
  version: z.literal(1),
  pre_state: WorldMemoryStateSchema,
  post_state: WorldMemoryStateSchema,
  decisions: z.array(WorldMemoryDecisionSchema),
});
export type WorldMemoryReceipt = z.infer<typeof WorldMemoryReceiptSchema>;
