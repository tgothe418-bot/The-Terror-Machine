import { z } from 'zod';

export const VOCALIZATION_KINDS = [
  'prose',
  'dialogue',
  'internal_monologue',
  'soliloquy',
  'transmission',
  'system_voice',
  'environmental_description',
] as const;

export const VocalizationKindSchema = z.enum(VOCALIZATION_KINDS);
export type VocalizationKind = z.infer<typeof VocalizationKindSchema>;

export const ACOUSTIC_MEDIUMS = [
  'direct',
  'internal',
  'intercom',
  'radio',
  'acoustic_bleed',
  'port_observation',
] as const;

export const AcousticMediumSchema = z.enum(ACOUSTIC_MEDIUMS);
export type AcousticMedium = z.infer<typeof AcousticMediumSchema>;

export const VOCAL_DELIVERY_MODES = [
  'spoken',
  'whisper',
  'mutter',
  'shout',
  'strained',
  'synthetic',
] as const;

export const VocalDeliverySchema = z.enum(VOCAL_DELIVERY_MODES);
export type VocalDelivery = z.infer<typeof VocalDeliverySchema>;

export const VOCALIZATION_TARGETS = [
  'addressed',
  'cohort',
  'self',
  'broadcast',
  'unseen',
] as const;

export const VocalizationTargetSchema = z.enum(VOCALIZATION_TARGETS);
export type VocalizationTarget = z.infer<typeof VocalizationTargetSchema>;

export const VocalizationBlockSchema = z.object({
  type: VocalizationKindSchema,
  speaker: z.string().nullable().optional(),
  medium: AcousticMediumSchema.optional().default('direct'),
  delivery: VocalDeliverySchema.optional().default('spoken'),
  target: VocalizationTargetSchema.optional().default('addressed'),
  content: z.string(),
});

export type VocalizationBlock = z.infer<typeof VocalizationBlockSchema>;
