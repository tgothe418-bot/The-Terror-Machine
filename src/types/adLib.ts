import { z } from 'zod';
import {
  OppositionSeatSchema,
  AuthorityContractSchema,
  VictimFieldSchema,
} from './participation';

export * from './participation';

export const AdLibProtagonistInductionSchema = z.object({
  participationMode: z.literal('protagonist'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z.string().trim().min(1, 'Core goal is required').max(200),
  unsettlingDetail: z.string().trim().max(200).optional(),
  participantName: z.string().trim().min(1, 'Character name is required').max(100),
  identity: z.string().trim().max(200).optional(),
  ability: z.string().trim().max(200).optional(),
  limitation: z.string().trim().max(200).optional(),
});
export type AdLibProtagonistInduction = z.infer<typeof AdLibProtagonistInductionSchema>;

/**
 * Phase 3B Antagonist Induction Schema.
 * Requires scenario seeds, opposition seat, canonical Authority Contract, and Victim Field.
 */
export const AdLibAntagonistInductionSchema = z.object({
  participationMode: z.literal('antagonist'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z.string().trim().min(1, 'Core goal is required').max(200),
  unsettlingDetail: z.string().trim().max(200).optional(),
  oppositionSeat: OppositionSeatSchema,
  authorityContract: AuthorityContractSchema,
  victimField: VictimFieldSchema,
});
export type AdLibAntagonistInduction = z.infer<typeof AdLibAntagonistInductionSchema>;

export const AdLibDirectorInductionSchema = z.object({
  participationMode: z.literal('director'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z.string().trim().min(1, 'Core goal is required').max(200),
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
