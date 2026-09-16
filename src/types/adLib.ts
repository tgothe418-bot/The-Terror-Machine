import { z } from 'zod';
import {
  OppositionSeatSchema,
  AuthorityContractSchema,
  VictimFieldSchema,
} from './participation';

export * from './participation';

export const MAX_HAUNTED_HOUSE_PREMISE_LENGTH = 1000;

export const AdLibProtagonistInductionSchema = z.object({
  participationMode: z.literal('protagonist'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z
    .string()
    .trim()
    .min(1, 'Scenario premise is required')
    .max(
      MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
      `Scenario premise must be ${MAX_HAUNTED_HOUSE_PREMISE_LENGTH.toLocaleString()} characters or fewer`
    ),
  unsettlingDetail: z.string().trim().max(200).optional(),
  participantName: z.string().trim().min(1, 'Character name is required').max(100),
  identity: z.string().trim().max(200).optional(),
  ability: z.string().trim().max(200).optional(),
  limitation: z.string().trim().max(200).optional(),
});
export type AdLibProtagonistInduction = z.infer<typeof AdLibProtagonistInductionSchema>;

export const AdLibAuthorityContractSchema = z.object({
  authority: z
    .string()
    .trim()
    .min(1, 'Authority scope is required')
    .max(500, 'Authority scope cannot exceed 500 characters'),
  limits: z
    .string()
    .trim()
    .min(1, 'Limits, anchors, or counterplay boundaries are required')
    .max(500, 'Limits cannot exceed 500 characters'),
});
export type AdLibAuthorityContract = z.infer<typeof AdLibAuthorityContractSchema>;

/**
 * Phase 3B Antagonist Induction Schema.
 * Requires scenario seeds, opposition seat, canonical Authority Contract, and Victim Field.
 */
export const AdLibAntagonistInductionSchema = z.object({
  participationMode: z.literal('antagonist'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z
    .string()
    .trim()
    .min(1, 'Scenario premise is required')
    .max(
      MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
      `Scenario premise must be ${MAX_HAUNTED_HOUSE_PREMISE_LENGTH.toLocaleString()} characters or fewer`
    ),
  unsettlingDetail: z.string().trim().max(200).optional(),
  oppositionSeat: OppositionSeatSchema,
  authorityContract: AdLibAuthorityContractSchema,
  victimField: VictimFieldSchema,
});
export type AdLibAntagonistInduction = z.infer<typeof AdLibAntagonistInductionSchema>;

export const AdLibDirectorInductionSchema = z.object({
  participationMode: z.literal('director'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z
    .string()
    .trim()
    .min(1, 'Scenario premise is required')
    .max(
      MAX_HAUNTED_HOUSE_PREMISE_LENGTH,
      `Scenario premise must be ${MAX_HAUNTED_HOUSE_PREMISE_LENGTH.toLocaleString()} characters or fewer`
    ),
  unsettlingDetail: z.string().trim().max(200).optional(),
  directorFocus: z.string().trim().max(200).optional(),
});
export type AdLibDirectorInduction = z.infer<typeof AdLibDirectorInductionSchema>;

export const AdLibInductionSchema = z.discriminatedUnion('participationMode', [
  AdLibProtagonistInductionSchema,
  AdLibAntagonistInductionSchema,
  AdLibDirectorInductionSchema,
]);
export type AdLibInduction = z.infer<typeof AdLibInductionSchema>;
