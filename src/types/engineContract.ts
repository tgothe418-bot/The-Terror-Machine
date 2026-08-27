import { z } from 'zod';
import { ParticipationContextSchema } from './adLib';
import {
  CanonicalConsequenceProposalSchema,
  CanonicalConsequenceReceiptSchema,
  CanonicalConsequenceStateSchema,
} from './consequence';
import {
  CharacterStanceRecordSchema,
  CharacterStanceProposalSchema,
  CharacterStanceReceiptSchema,
} from './characterStance';
import {
  CharacterRelationshipStateSchema,
  CharacterRelationshipProposalSchema,
  CharacterRelationshipReceiptSchema,
} from './characterRelationships';
import {
  CharacterMemoryByIdSchema,
  CharacterMemoryEntrySchema,
  CharacterMemoryProposalSchema,
  CharacterMemoryReceiptSchema,
} from './characterMemory';
import {
  WorldMemoryStateSchema,
  WorldMemoryProposalSchema,
  WorldMemoryReceiptSchema,
} from './worldMemory';
import {
  FictionalTimeCostSchema,
  HorrorGrammarTurnContextSchema,
  FictionalTimeReceiptSchema,
  CastActivityEligibilityReceiptSchema,
  CastActivityProposalSchema,
  SituatedPressureProposalSchema,
  CastActivityReceiptSchema,
  SituatedPressureReceiptSchema,
  ValueStateProposalSchema,
  ValueStateReceiptSchema,
  CharacterPursuitProposalSchema,
  CharacterPursuitReceiptSchema,
  CharacterDevelopmentProposalSchema,
  CharacterDevelopmentReceiptSchema,
  PressureThreadTransitionProposalSchema,
  PressureThreadTransitionReceiptSchema,
  HorrorGrammarForensicRecordSchema,
} from './horrorGrammar';
export * from './adLib';
export * from './consequence';
export * from './characterStance';
export * from './characterRelationships';
export * from './characterMemory';
export * from './worldMemory';

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
    openingAim: z.string().optional(),
    sovereigntyInstruction: z.string().optional(),
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
        stance: CharacterStanceRecordSchema.nullable().default(null),
        memory: z.array(CharacterMemoryEntrySchema).max(24).default([]),
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
  runtime: z
    .object({
      phase: z.string().default('LATENT'),
      tension: z.number().default(0),
      coherence: z.number().default(1.0),
      reconciliationRevision: z.number().default(0),
      activeVector: z.string().default('COGNITIVE'),
      activeTier: z.string().default('LATENT'),
      activeFlags: z.array(z.string()).default([]),
      turnNumber: z.number().int().nonnegative().default(0),
    })
    .strict(),
  participationContext: ParticipationContextSchema.optional(),
  consequenceState: CanonicalConsequenceStateSchema.default({
    inventory: [],
    player_injuries: [],
    psychological_status: 'STABLE',
  }),
  relationshipState: CharacterRelationshipStateSchema.default([]),
  memoryState: CharacterMemoryByIdSchema.default({}),
  worldMemory: WorldMemoryStateSchema.default([]),
  horrorGrammar: HorrorGrammarTurnContextSchema.optional(),
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

export const ACTION_KINDS = [
  'OBSERVE',
  'INVESTIGATE',
  'COMMUNICATE',
  'MOVE',
  'MANIPULATE',
  'WAIT',
  'SYSTEM',
  'OTHER',
] as const;

export const ACTION_SUBTYPES = ['FLEE', 'HIDE'] as const;

export const PRESSURE_DIRECTIONS = [
  'DE_ESCALATE',
  'MAINTAIN',
  'ESCALATE',
  'MIXED',
  'UNCLEAR',
] as const;

export const DRAMATIC_TACTICS = [
  'FLIGHT',
  'DENIAL',
  'FIXATION',
  'EXPOSURE',
  'CONCEALMENT',
  'MISDIRECTION',
  'SUBVERSION',
  'NONE',
] as const;

export const INTENT_SYNERGIES = ['SUCCESS', 'FAILURE', 'N/A'] as const;

export const ActionKindSchema = z.enum(ACTION_KINDS);
export type ActionKind = z.infer<typeof ActionKindSchema>;

export const ActionSubtypeSchema = z.enum(ACTION_SUBTYPES).nullable();
export type ActionSubtype = z.infer<typeof ActionSubtypeSchema>;

export const PressureDirectionSchema = z.enum(PRESSURE_DIRECTIONS);
export type PressureDirection = z.infer<typeof PressureDirectionSchema>;

export const DramaticTacticSchema = z.enum(DRAMATIC_TACTICS);
export type DramaticTactic = z.infer<typeof DramaticTacticSchema>;

export const IntentSynergySchema = z.enum(INTENT_SYNERGIES);
export type IntentSynergy = z.infer<typeof IntentSynergySchema>;

export const IntentProposalSchema = z.object({
  action_kind: ActionKindSchema,
  action_subtype: ActionSubtypeSchema,
  pressure_direction: PressureDirectionSchema,
  dramatic_tactic: DramaticTacticSchema,
  intent_synergy: IntentSynergySchema,
}).strict();
export type IntentProposal = z.infer<typeof IntentProposalSchema>;

export const IntentReceiptSchema = IntentProposalSchema.extend({
  version: z.literal(1),
});
export type IntentReceipt = z.infer<typeof IntentReceiptSchema>;

export const RECONCILIATION_MODES = [
  'NOT_REQUIRED',
  'CANONICAL',
  'EXPERIENTIAL_REANCHORED',
  'MIXED',
] as const;

export const RECONCILIATION_FEASIBILITIES = [
  'SUPPORTED',
  'CONSTRAINED',
  'IMPOSSIBLE',
  'UNCLEAR',
] as const;

export const RECONCILIATION_REASON_CODES = [
  'NONE',
  'BLUEPRINT_RULE',
  'AUTHORITY_LIMIT',
  'TOPOLOGY_LIMIT',
  'CAST_PRESENCE_LIMIT',
  'PHYSICAL_LIMIT',
  'UNSUPPORTED_PREMISE',
  'OTHER_CONSTRAINT',
] as const;

export const FICTIONAL_TIME_COSTS = [
  'MOMENT',
  'SCENE_BEAT',
  'EXTENDED',
  'UNCLEAR',
] as const;

export const AUTHORITY_ALIGNMENTS = [
  'WITHIN_CONTRACT',
  'EXCEEDS_CONTRACT',
  'NOT_APPLICABLE',
  'UNCLEAR',
] as const;

export const ReconciliationModeSchema = z.enum(RECONCILIATION_MODES);
export type ReconciliationMode = z.infer<typeof ReconciliationModeSchema>;

export const ReconciliationFeasibilitySchema = z.enum(RECONCILIATION_FEASIBILITIES);
export type ReconciliationFeasibility = z.infer<typeof ReconciliationFeasibilitySchema>;

export const ReconciliationReasonCodeSchema = z.enum(RECONCILIATION_REASON_CODES);
export type ReconciliationReasonCode = z.infer<typeof ReconciliationReasonCodeSchema>;

export const AuthorityAlignmentSchema = z.enum(AUTHORITY_ALIGNMENTS);
export type AuthorityAlignment = z.infer<typeof AuthorityAlignmentSchema>;

export const NarrativeReconciliationProposalSchema = z.object({
  mode: ReconciliationModeSchema,
  feasibility: ReconciliationFeasibilitySchema,
  reason_code: ReconciliationReasonCodeSchema,
  fictional_time_cost: FictionalTimeCostSchema,
  authority_alignment: AuthorityAlignmentSchema,
  memory_echo_candidate: z.string().trim().min(1).max(240).nullable(),
}).strict();
export type NarrativeReconciliationProposal = z.infer<typeof NarrativeReconciliationProposalSchema>;

export const NarrativeReconciliationReceiptSchema = NarrativeReconciliationProposalSchema.extend({
  version: z.literal(1),
  revision_increment: z.union([z.literal(0), z.literal(1)]),
});
export type NarrativeReconciliationReceipt = z.infer<typeof NarrativeReconciliationReceiptSchema>;

export const CastInteractionReceiptSchema = z.object({
  version: z.literal(1),
  addressedCharacterId: z.string().nullable(),
  respondingCharacterId: z.string().nullable(),
  outcome: z.enum([
    'RESPONDED',
    'ADDRESS_UNANSWERED',
    'UNSOLICITED_DIALOGUE',
    'MISMATCH',
    'NONE',
  ]),
});

export type CastInteractionReceipt = z.infer<typeof CastInteractionReceiptSchema>;

export const TurnResultSchema = z.object({
  narrative_blocks: z.array(NarrativeBlockSchema).max(2),
  engine_thoughts: z.string().optional(),
  intent_proposal: IntentProposalSchema,
  reconciliation_proposal: NarrativeReconciliationProposalSchema,
  consequence_proposal: CanonicalConsequenceProposalSchema,
  character_stance_proposal: CharacterStanceProposalSchema,
  character_relationship_proposal: CharacterRelationshipProposalSchema,
  character_memory_proposal: CharacterMemoryProposalSchema,
  world_memory_proposal: WorldMemoryProposalSchema,
  cast_activity_proposal: CastActivityProposalSchema.optional().default({
    kind: 'NONE',
    reason: 'NO_OPPORTUNITY_CHOSEN',
  }),
  situated_pressure_proposal: SituatedPressureProposalSchema.optional().default({
    kind: 'NONE',
    reason: 'NO_PRESSURE_CHOSEN',
  }),
  value_state_proposal: ValueStateProposalSchema.optional().default({
    changes: [],
  }),
  character_pursuit_proposal: CharacterPursuitProposalSchema.optional().default({
    changes: [],
  }),
  character_development_proposal: CharacterDevelopmentProposalSchema.optional().default({
    changes: [],
  }),
  pressure_transition_proposal: PressureThreadTransitionProposalSchema.optional().default({
    transitions: [],
  }),
  logic_state: z
    .object({
      current_phase: z.string().optional(),
      requested_transition: z.string().nullable().optional().default(null),
      suggested_tension: z.number().int().min(0).max(100).optional(),
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
      npc_fixations: z.array(z.string()).optional(),
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
    .strict()
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

export const TurnResponseSchema = TurnResultSchema.omit({
  narrative_blocks: true,
  logic_state: true,
  intent_proposal: true,
  reconciliation_proposal: true,
  consequence_proposal: true,
  character_stance_proposal: true,
  character_relationship_proposal: true,
  character_memory_proposal: true,
  world_memory_proposal: true,
  cast_activity_proposal: true,
  situated_pressure_proposal: true,
  value_state_proposal: true,
  character_pursuit_proposal: true,
  character_development_proposal: true,
  pressure_transition_proposal: true,
}).extend({
  narrative_blocks: z.array(NarrativeBlockSchema).max(4),
  logic_state: z.record(z.string(), z.any()),
  transitionReceipt: TransitionReceiptSchema.optional(),
  castInteractionReceipt: CastInteractionReceiptSchema.optional(),
  intentReceipt: IntentReceiptSchema.optional(),
  narrativeReconciliationReceipt: NarrativeReconciliationReceiptSchema.optional(),
  canonicalConsequenceReceipt: CanonicalConsequenceReceiptSchema,
  characterStanceReceipt: CharacterStanceReceiptSchema,
  characterRelationshipReceipt: CharacterRelationshipReceiptSchema,
  characterMemoryReceipt: CharacterMemoryReceiptSchema,
  worldMemoryReceipt: WorldMemoryReceiptSchema,
  fictionalTimeReceipt: FictionalTimeReceiptSchema.optional(),
  castActivityReceipt: CastActivityEligibilityReceiptSchema.optional(),
  castActivityProposalReceipt: CastActivityReceiptSchema.optional(),
  situatedPressureReceipt: SituatedPressureReceiptSchema.optional(),
  valueStateReceipt: ValueStateReceiptSchema.optional(),
  characterPursuitReceipt: CharacterPursuitReceiptSchema.optional(),
  characterDevelopmentReceipt: CharacterDevelopmentReceiptSchema.optional(),
  pressureThreadTransitionReceipt: PressureThreadTransitionReceiptSchema.optional(),
  horrorGrammarForensics: HorrorGrammarForensicRecordSchema.optional(),
});

export type TurnResponse = z.infer<typeof TurnResponseSchema>;
