import { z } from 'zod';

export const CohortPhaseSchema = z.enum([
  'ONSET',
  'DISCOVERY',
  'CONFIRMATION',
  'CONFRONTATION',
]);
export type CohortPhase = z.infer<typeof CohortPhaseSchema>;

export const CohortStatusSchema = z.enum(['ACTIVE', 'DORMANT']);
export type CohortStatus = z.infer<typeof CohortStatusSchema>;

export const HypothesisProvenanceSchema = z
  .object({
    lastSupportRef: z.string().optional(),
    lastContradictionRef: z.string().optional(),
    lastUpdatedTurn: z.number().int().nonnegative(),
  })
  .strict();
export type HypothesisProvenance = z.infer<typeof HypothesisProvenanceSchema>;

export const HypothesisWeightSchema = z
  .object({
    id: z.string().min(1), // Authored Blueprint Hypothesis ID
    weight: z.number().min(0).max(1),
    provenance: HypothesisProvenanceSchema,
  })
  .strict();
export type HypothesisWeight = z.infer<typeof HypothesisWeightSchema>;

export const CastCognitionSchema = z
  .object({
    characterId: z.string().min(1),
    hypotheses: z.record(z.string(), HypothesisWeightSchema),
    skepticism: z.number().min(0).max(1).default(0.8),
    cognitiveDissonance: z.number().min(0).default(0),
    ingestedEvidenceIds: z.array(z.string()).default([]),
  })
  .strict();
export type CastCognition = z.infer<typeof CastCognitionSchema>;

export const BehaviorDurationSchema = z
  .object({
    currentBehaviorId: z.string().min(1),
    target: z.string().optional(),
    startedAtFictionalTime: z.number().int().nonnegative(),
    durationSeconds: z.number().int().positive(),
    progressSeconds: z.number().int().nonnegative().default(0),
    status: z.enum(['IN_PROGRESS', 'COMPLETED']),
  })
  .strict();
export type BehaviorDuration = z.infer<typeof BehaviorDurationSchema>;

export const CohortMemberSchema = z
  .object({
    characterId: z.string().min(1),
    isSeatHolder: z.boolean().default(false),
    tenureTurns: z.number().int().nonnegative().default(0),
    affinities: z.record(z.string(), z.number()).default({}),
    lastAction: z.string().optional(),
    behaviorDuration: BehaviorDurationSchema.optional(),
    cognition: CastCognitionSchema,
    hidingUntilFictionalTime: z.number().int().nonnegative().optional(),
    agendaProgress: z.number().min(0).max(1).default(0),
    agendaText: z.string().optional(),
  })
  .strict();
type InferredCohortMember = z.infer<typeof CohortMemberSchema>;
export type CohortMember = Omit<InferredCohortMember, 'agendaProgress'> & {
  agendaProgress?: number;
};

export const TraceChannelSchema = z.enum(['ACOUSTIC', 'VISUAL', 'EVIDENTIAL', 'SOCIAL']);
export type TraceChannel = z.infer<typeof TraceChannelSchema>;

export const CohortTraceEmissionSchema = z
  .object({
    id: z.string().min(1),
    channel: TraceChannelSchema,
    nodeId: z.string().min(1),
    clarity: z.enum(['FAINT', 'OBSCURED', 'AUDIBLE', 'STARK']),
    cueText: z.string().min(1),
    fictionalTime: z.number().int().nonnegative(),
  })
  .strict();
export type CohortTraceEmission = z.infer<typeof CohortTraceEmissionSchema>;

export const CohortCycleReceiptSchema = z
  .object({
    turnNumber: z.number().int().nonnegative(),
    characterId: z.string().min(1),
    selectedBehavior: z.string().min(1),
    considerationSet: z.array(z.string()),
    executableSet: z.array(z.string()),
    scores: z.record(z.string(), z.number()),
    fatigueApplied: z.boolean(),
    fictionalTimeCost: z.number().int().nonnegative(),
    tracesEmitted: z.array(CohortTraceEmissionSchema),
    actedOnLocationBelief: z.boolean().optional(),
    parleyAttempted: z.boolean().optional(),
    warnedCharacterIds: z.array(z.string()).optional(),
    recruitTargetId: z.string().optional(),
    recruitSucceeded: z.boolean().optional(),
    locationDelta: z.string().optional(),
  })
  .strict();
export type CohortCycleReceipt = z.infer<typeof CohortCycleReceiptSchema>;

export const CohortStateSchema = z
  .object({
    status: CohortStatusSchema.default('ACTIVE'),
    collectivePhase: CohortPhaseSchema.default('ONSET'),
    peakPhase: CohortPhaseSchema.default('ONSET'),
    ratifiedRatchetPhase: CohortPhaseSchema.default('ONSET'),
    seatHolderId: z.string().optional(),
    successionVulnerabilityWindowRemaining: z.number().int().nonnegative().default(0),
    members: z.record(z.string(), CohortMemberSchema),
    dormantCastCognition: z.record(z.string(), CastCognitionSchema).default({}),
    institutionalMemory: z.record(z.string(), HypothesisWeightSchema).default({}),
    recentReceipts: z.array(CohortCycleReceiptSchema).default([]),
    lastCasualtyFictionalTime: z.number().int().nonnegative().optional(),
    nodeTraps: z
      .record(
        z.string(),
        z
          .object({
            setByCharacterId: z.string().min(1),
            setAtFictionalTime: z.number().int().nonnegative(),
          })
          .strict()
      )
      .default({}),
    fortifiedNodes: z
      .record(
        z.string(),
        z
          .object({
            barredByCharacterId: z.string().min(1),
            fortifiedAtFictionalTime: z.number().int().nonnegative(),
            strength: z.number().int().min(1).max(3),
          })
          .strict()
      )
      .default({}),
    fractures: z
      .array(
        z
          .object({
            aCharacterId: z.string().min(1),
            bCharacterId: z.string().min(1),
            sinceTurn: z.number().int().nonnegative(),
            sinceFictionalTime: z.number().int().nonnegative(),
          })
          .strict()
      )
      .default([]),
  })
  .strict();
type InferredCohortState = z.infer<typeof CohortStateSchema>;
export type CohortState = Omit<
  InferredCohortState,
  'nodeTraps' | 'fortifiedNodes' | 'fractures' | 'members'
> & {
  members: Record<string, CohortMember>;
  nodeTraps?: InferredCohortState['nodeTraps'];
  fortifiedNodes?: InferredCohortState['fortifiedNodes'];
  fractures?: InferredCohortState['fractures'];
};
