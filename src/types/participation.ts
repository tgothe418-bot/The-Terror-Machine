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

/**
 * Phase 3B: Canonical, reusable Authority Contract.
 * Defines the Antagonist's explicit in-world reach and non-negotiable boundaries.
 */
export const AuthorityContractSchema = z.object({
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
export type AuthorityContract = z.infer<typeof AuthorityContractSchema>;

/**
 * Named victim profile within an individual target or group member.
 */
export const VictimProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, 'Victim name or designation is required').max(100),
  description: z.string().trim().max(300).optional(),
  goal: z.string().trim().max(200).optional(),
  knownFact: z.string().trim().max(200).optional(),
});
export type VictimProfile = z.infer<typeof VictimProfileSchema>;

/**
 * Individual Victim target specification.
 */
export const IndividualVictimSchema = z.object({
  kind: z.literal('individual'),
  name: z.string().trim().min(1, 'Victim name or designation is required').max(100),
  description: z.string().trim().max(300).optional(),
  goal: z.string().trim().max(200).optional(),
  knownFact: z.string().trim().max(200).optional(),
});
export type IndividualVictim = z.infer<typeof IndividualVictimSchema>;

/**
 * Group Victim target specification (collective designation with up to 8 optional named member profiles).
 */
export const GroupVictimSchema = z.object({
  kind: z.literal('group'),
  collectiveDesignation: z.string().trim().min(1, 'Collective designation is required').max(100),
  description: z.string().trim().max(300).optional(),
  members: z.array(VictimProfileSchema).max(8, 'Maximum 8 named victim members allowed').default([]),
});
export type GroupVictim = z.infer<typeof GroupVictimSchema>;

/**
 * Phase 3B: Canonical, reusable Victim Field.
 * Supports either an individual subject or a group with optional named member profiles.
 */
export const VictimFieldSchema = z.discriminatedUnion('kind', [
  IndividualVictimSchema,
  GroupVictimSchema,
]);
export type VictimField = z.infer<typeof VictimFieldSchema>;

export const ParticipationSeatSchema = z.object({
  kind: z.enum(['protagonist', 'character', 'force', 'director']),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(300).optional(),
  ability: z.string().trim().max(500).optional(),
  limitation: z.string().trim().max(500).optional(),
});
export type ParticipationSeat = z.infer<typeof ParticipationSeatSchema>;

export const ParticipationContextSchema = z.object({
  mode: ParticipationModeSchema,
  seat: ParticipationSeatSchema.optional(),
  initialGoal: z.string().trim().min(1).max(200),
  boundedFacts: z.array(z.string().trim().max(250)).max(8).default([]),
  authorityContract: AuthorityContractSchema.optional(),
  victimField: VictimFieldSchema.optional(),
});
export type ParticipationContext = z.infer<typeof ParticipationContextSchema>;

export const HauntedHouseProvenanceSchema = z.object({
  source: z.literal('haunted-house'),
  version: z.literal(1),
  recommendedParticipationMode: ParticipationModeSchema,
  participationContext: ParticipationContextSchema,
});
export type HauntedHouseProvenance = z.infer<typeof HauntedHouseProvenanceSchema>;

/**
 * Safely normalizes participation context, ensuring legacy Phase 3A antagonist
 * contexts receive an explicit Authority Contract fallback rather than unconstrained power
 * or fabricated local physical presence/mortal counterplay.
 */
export function normalizeParticipationContext(
  context?: ParticipationContext | null
): ParticipationContext | null {
  if (!context) return null;
  if (context.mode !== 'antagonist') return context;

  if (context.authorityContract) {
    return context;
  }

  const fallbackAuthority =
    context.seat?.ability?.trim() ||
    'Only already authored and ratified scenario facts apply. Grants no new reach, perception, mutation, omniscience, or control until re-inducted with an explicit Authority Contract.';
  const fallbackLimits =
    context.seat?.limitation?.trim() ||
    'Strictly bounded to authored scenario facts and ratified state. Grants no new reach, perception, mutation, omniscience, or control without an explicit Authority Contract.';

  return {
    ...context,
    authorityContract: {
      authority: fallbackAuthority,
      limits: fallbackLimits,
    },
  };
}
