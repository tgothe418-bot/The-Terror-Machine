import { z } from 'zod';
import { ParticipationContextSchema } from './adLib';
export * from './adLib';

export const EdgeKindSchema = z.enum([
  'PHYSICAL',
  'FORCED_EVENT',
  'MEMORY_RECONSTRUCTION',
  'HISTORICAL_REFERENCE',
  'TERMINAL_EJECTION',
  'AUTHORED_PARADOX',
]);

export type EdgeKind = z.infer<typeof EdgeKindSchema>;

export const EngineCharacterExpressionProfileSchema = z.object({
  communicationModes: z.array(z.enum(['spoken', 'nonverbal', 'mediated'])).min(1),
  expressionGuidance: z.string().min(1),
  silenceGuidance: z.string().optional(),
});

export type EngineCharacterExpressionProfile = z.infer<typeof EngineCharacterExpressionProfileSchema>;

export const EngineTurnContextSchema = z.object({
  version: z.literal(1).default(1),
  scenario: z.object({
    id: z.string().optional(),
    title: z.string().default('Unknown Enclosure'),
    premise: z.string().default(''),
    worldRules: z.array(z.string()).default([]),
    setting: z.object({
      location: z.string().default('Unknown'),
      atmosphere: z.string().default(''),
      timePeriod: z.string().default(''),
    }),
    startingVector: z.string().default('COGNITIVE'),
    startingTier: z.string().default('LATENT'),
    incitingIncident: z.string().default(''),
    pacingDirective: z.string().default(''),
    keyPlotElements: z.array(z.string()).default([]),
  }),
  player: z.object({
    role: z.enum(['protagonist', 'antagonist', 'director', 'witness', 'possessed']),
    characterId: z.string().nullable().optional(),
    name: z.string().default('Protagonist'),
    description: z.string().default(''),
    isEntity: z.boolean().default(false),
  }),
  cast: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        role: z.string().default('Subject'),
        description: z.string().default(''),
        personality: z.string().default(''),
        goals: z.string().default(''),
        traits: z.array(z.string()).default([]),
        isEntity: z.boolean().default(false),
        isUserCharacter: z.boolean().default(false),
        expressionProfile: EngineCharacterExpressionProfileSchema.optional(),
        skepticism: z.number().finite().min(0).max(1).default(0.5),
        isPresent: z.boolean().default(true),
      })
    )
    .default([]),
  topology: z.object({
    currentNodeId: z.string(),
    readableNodeLabel: z.string(),
    allowedOutgoingExits: z
      .array(
        z.object({
          from: z.string(),
          to: z.string(),
          kind: EdgeKindSchema,
          requires: z.array(z.string()).optional(),
          userInitiated: z.boolean().default(true),
        })
      )
      .default([]),
  }),
  runtime: z.object({
    phase: z.string().default('LATENT'),
    tension: z.number().default(0),
    coherence: z.number().default(1.0),
    reconciliationRevision: z.number().default(0),
    activeVector: z.string().default('COGNITIVE'),
    activeTier: z.string().default('LATENT'),
    activeFlags: z.array(z.string()).default([]),
  }),
  participationContext: ParticipationContextSchema.optional(),
});

export type EngineTurnContext = z.infer<typeof EngineTurnContextSchema>;

export const TurnRequestSchema = z.object({
  userAction: z.string().min(1, 'User action is required'),
  recentHistory: z.string(),
  systemDirective: z.string(),
  isExpansionExpected: z.boolean(),
  stateContext: z.object({
    currentNodeId: z.string().nullable(),
    currentPhase: z.string(),
    tensionLevel: z.number(),
    reconciliationRevision: z.number(),
    activeVector: z.string().optional(),
    activeTier: z.string().optional(),
  }),
  context: EngineTurnContextSchema,
});

export type TurnRequest = z.infer<typeof TurnRequestSchema>;

export const TransitionReceiptSchema = z.object({
  requestedNodeId: z.string().nullable(),
  accepted: z.boolean(),
  fromNodeId: z.string().nullable(),
  toNodeId: z.string().nullable(),
  reason: z.string().optional(),
});

export type TransitionReceipt = z.infer<typeof TransitionReceiptSchema>;

export const NarrativeBlockSchema = z.object({
  type: z.enum(['prose', 'dialogue', 'system_voice', 'environmental_description']),
  speaker: z.string().nullable().optional(),
  content: z.string(),
});

export type NarrativeBlock = z.infer<typeof NarrativeBlockSchema>;

export const TopologyDeltaSchema = z.object({
  isExpansion: z.boolean(),
  exitDirection: z.string().nullable().optional(),
  newNodeDef: z
    .object({
      id: z.string(),
      geometry: z.string(),
      hazards: z.array(z.string()),
      exitVectors: z.array(
        z.object({
          direction: z.string(),
          targetNodeId: z.string(),
          kind: EdgeKindSchema.optional(),
          requires: z.array(z.string()).optional(),
          userInitiated: z.boolean().optional(),
        })
      ),
    })
    .nullable()
    .optional(),
});

export type TopologyDelta = z.infer<typeof TopologyDeltaSchema>;

export const TurnResultSchema = z.object({
  narrative_blocks: z.array(NarrativeBlockSchema).max(2),
  engine_thoughts: z.string().optional(),
  logic_state: z
    .object({
      current_phase: z.string().optional(),
      requested_transition: z.string().nullable().optional().default(null),
      suggested_tension: z.number().int().min(0).max(100).optional(),
      intent_classification: z.string().default('PROSE_ADVANCE'),
      terminal_flags: z.array(z.string()).default([]),
      cast_deltas: z
        .array(
          z.object({
            character_id: z.string(),
            skepticism_delta: z.number(),
          })
        )
        .default([]),
      cast_ledger: z.array(z.any()).default([]),
      inventory: z.array(z.string()).optional(),
      player_injuries: z.array(z.string()).optional(),
      lore_and_memory: z.any().optional(),
      npc_fixations: z.array(z.string()).optional(),
      psychological_status: z.string().optional(),
      matrix_mutation: z
        .object({
          next_vector: z.string().optional(),
          next_tier: z.string().optional(),
          increment_rooms: z.boolean().optional(),
          note: z.string().optional(),
        })
        .nullable()
        .optional(),
      matrix_shift: z
        .object({
          next_vector: z.string().optional(),
          next_tier: z.string().optional(),
        })
        .nullable()
        .optional(),
    })
    .transform((val) => {
      if (!val.matrix_mutation && val.matrix_shift) {
        return {
          ...val,
          matrix_mutation: {
            next_vector: val.matrix_shift.next_vector,
            next_tier: val.matrix_shift.next_tier,
          },
        };
      }
      return val;
    }),
  topologyDelta: TopologyDeltaSchema.nullable().optional(),
});

export type TurnResult = z.infer<typeof TurnResultSchema>;

export const TurnResponseSchema = TurnResultSchema.extend({
  transitionReceipt: TransitionReceiptSchema.optional(),
});

export type TurnResponse = z.infer<typeof TurnResponseSchema>;
