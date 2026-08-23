import { z } from 'zod';

const AmbiguityIdentitySchema = {
  id: z.string().min(1),
  category: z.string().min(1).max(80),
  question: z.string().min(1).max(1000),
};

export const BlueprintAmbiguityDecisionSchema = z.discriminatedUnion('resolutionMode', [
  z
    .object({
      ...AmbiguityIdentitySchema,
      resolutionMode: z.literal('USER_DEFINED'),
      resolution: z.string().max(1000).refine((value) => value.trim().length > 0, {
        message: 'Resolution must be a non-empty string',
      }),
    })
    .strict(),
  z
    .object({
      ...AmbiguityIdentitySchema,
      resolutionMode: z.literal('CONTEXTUAL_DISCRETION'),
      guidance: z.string().max(1000).optional(),
    })
    .strict(),
]);

export const BlueprintAmbiguityDecisionsSchema = z
  .array(BlueprintAmbiguityDecisionSchema)
  .default([]);

export type BlueprintAmbiguityDecision = z.infer<typeof BlueprintAmbiguityDecisionSchema>;
export type BlueprintAmbiguityDecisions = z.infer<typeof BlueprintAmbiguityDecisionsSchema>;

// ============================================================================
// Shared Depiction Contract Schema
// ============================================================================

const ContractTextSchema = z.string().max(1000);

export const DepictionContractSchema = z
  .object({
    dramaticRegister: ContractTextSchema,
    directness: ContractTextSchema,
    aftermath: ContractTextSchema,
    ambiguityHandling: ContractTextSchema,
    specialBoundaries: ContractTextSchema.optional().default(''),
  })
  .strict();

export type DepictionContract = z.infer<typeof DepictionContractSchema>;

export const DepictionContractPatchSchema = z
  .object({
    dramaticRegister: ContractTextSchema.optional(),
    directness: ContractTextSchema.optional(),
    aftermath: ContractTextSchema.optional(),
    ambiguityHandling: ContractTextSchema.optional(),
    specialBoundaries: ContractTextSchema.optional(),
  })
  .strict()
  .refine((patch) => Object.keys(patch).length > 0, {
    message: 'At least one depiction-contract field is required',
  });

export type DepictionContractPatch = z.infer<typeof DepictionContractPatchSchema>;

