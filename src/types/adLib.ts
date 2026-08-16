import { z } from 'zod';

export const ParticipationModeSchema = z.enum(['protagonist', 'antagonist', 'director']);
export type ParticipationMode = z.infer<typeof ParticipationModeSchema>;

export const OppositionSeatKindSchema = z.enum(['character', 'force']);
export type OppositionSeatKind = z.infer<typeof OppositionSeatKindSchema>;

export const OppositionSeatSchema = z.object({
  kind: OppositionSeatKindSchema,
  name: z.string().trim().min(1, 'Name or designation is required').max(100),
  description: z.string().trim().min(1, 'Description is required').max(300),
  goal: z.string().trim().min(1, 'Opposition threat goal is required').max(200),
  ability: z.string().trim().max(200).optional(),
  limitation: z.string().trim().max(200).optional(),
});
export type OppositionSeat = z.infer<typeof OppositionSeatSchema>;

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

export const AdLibAntagonistInductionSchema = z.object({
  participationMode: z.literal('antagonist'),
  placeSeed: z.string().trim().min(1, 'Location or haunted place seed is required').max(200),
  goal: z.string().trim().min(1, 'Core goal is required').max(200),
  unsettlingDetail: z.string().trim().max(200).optional(),
  oppositionSeat: OppositionSeatSchema,
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

export const ParticipationSeatSchema = z.object({
  kind: z.enum(['protagonist', 'character', 'force', 'director']),
  name: z.string(),
  description: z.string().optional(),
  ability: z.string().optional(),
  limitation: z.string().optional(),
});
export type ParticipationSeat = z.infer<typeof ParticipationSeatSchema>;

export const ParticipationContextSchema = z.object({
  mode: ParticipationModeSchema,
  seat: ParticipationSeatSchema.optional(),
  initialGoal: z.string(),
  boundedFacts: z.array(z.string()).default([]),
});
export type ParticipationContext = z.infer<typeof ParticipationContextSchema>;
