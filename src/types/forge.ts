import { z } from 'zod';
import { EdgeKindSchema } from './engineContract';
import { HauntedHouseProvenanceSchema } from './participation';
import {
  BlueprintAmbiguityDecisionsSchema,
  DepictionContractSchema,
} from './blueprintAuthoring';
import {
  HorrorGrammarAuthoringSchema,
  ValueAnchorSchema,
  CharacterPursuitSchema,
  ValueBaselineReviewStateSchema,
  PursuitReviewStateSchema,
  UserOpeningAimSchema,
} from './horrorGrammar';
export * from './blueprintAuthoring';
export * from './horrorGrammar';

// ============================================================================
// Phase 3E Character Expression Profile (Passive Data Seam)
// ============================================================================
export const CharacterCommunicationModeSchema = z.enum(['spoken', 'nonverbal', 'mediated']);
export type CharacterCommunicationMode = z.infer<typeof CharacterCommunicationModeSchema>;

export const CharacterExpressionProfileSchema = z.object({
  communicationModes: z.array(CharacterCommunicationModeSchema).min(1).default(['spoken']),
  expressionGuidance: z.string().min(1, 'Expression guidance is required'),
  silenceGuidance: z.string().optional(),
});
export type CharacterExpressionProfile = z.infer<typeof CharacterExpressionProfileSchema>;

export const ForgeVulnerabilityIndexSchema = z.object({
  resilience: z.number().min(0).max(1).default(0.5),
  skepticism: z.number().min(0).max(1).default(0.5),
  baggage: z.number().min(0).max(1).default(0.5),
});

export const ForgeDraftIdentitySchema = z.object({
  title: z.string().optional().default(''),
  version: z.string().optional().default('1.0'),
  author: z.string().optional().default(''),
  thematicAnchor: z.string().optional().default(''),
});

export const ForgeDraftSettingSchema = z.object({
  location: z.string().optional().default(''),
  atmosphere: z.string().optional().default(''),
  timePeriod: z.string().optional().default(''),
});

export const PresenceDispositionKindSchema = z.enum(['AT_NODE', 'OFFSTAGE', 'NONLOCAL']);
export type PresenceDispositionKind = z.infer<typeof PresenceDispositionKindSchema>;

export const CharacterPresenceDispositionSchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('AT_NODE'),
      nodeId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('OFFSTAGE'),
    })
    .strict(),
  z
    .object({
      kind: z.literal('NONLOCAL'),
    })
    .strict(),
]);
export type CharacterPresenceDisposition = z.infer<typeof CharacterPresenceDispositionSchema>;

export const ForgeTopologyNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  classification: z.enum(['evidence', 'inference', 'creator']).optional(),
  evidenceIds: z.array(z.string()).optional(),
  sensoryGuidance: z.string().optional(),
});
export type ForgeTopologyNode = z.infer<typeof ForgeTopologyNodeSchema>;

export const ForgeExpandableAnchorSchema = z.object({
  id: z.string().min(1),
  parentNodeId: z.string().min(1),
  label: z.string().min(1),
  description: z.string().optional(),
  classification: z.enum(['evidence', 'inference', 'creator']).optional(),
  evidenceIds: z.array(z.string()).optional(),
  statement: z.string().optional(),
});
export type ForgeExpandableAnchor = z.infer<typeof ForgeExpandableAnchorSchema>;

export const ForgeDraftCastMemberSchema = z.object({
  id: z.string().default(() => `char-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
  name: z.string().default(''),
  description: z.string().optional().default(''),
  role: z.string().optional().default('Subject'),
  personality: z.string().optional().default(''),
  goals: z.string().optional().default(''),
  traits: z.array(z.string()).optional().default([]),
  isUserCharacter: z.boolean().optional().default(false),
  behaviorVector: z.string().optional().default('ADAPTIVE'),
  isEntity: z.boolean().optional().default(false),
  psychological_status: z.string().optional(),
  starting_location: z.string().optional(),
  presenceDisposition: CharacterPresenceDispositionSchema.optional(),
  vulnerabilityBase: ForgeVulnerabilityIndexSchema.optional(),
  expressionProfile: CharacterExpressionProfileSchema.optional(),
});

export const ForgeDraftPerspectiveRoleSchema = z.enum([
  'PROTAGONIST',
  'ANTAGONIST',
  'DIRECTOR',
  'WITNESS',
  'POSSESSED',
]);

export const ForgeDraftPerspectiveSchema = z.object({
  role: z.string().default('PROTAGONIST'),
  framingDirective: z.string().optional(),
  sensoryBias: z.array(z.string()).optional(),
  startingSemanticState: z
    .union([
      z.string(),
      z.object({
        soma: z.array(z.string()).optional(),
        geom: z.array(z.string()).optional(),
        imp: z.string().optional(),
      }),
    ])
    .optional(),
  subjectCharacterId: z.string().optional(),
});

export const ForgeDraftTopologyEdgeObjectSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: EdgeKindSchema.default('PHYSICAL'),
  requires: z.array(z.string()).optional(),
  userInitiated: z.boolean().default(true),
  legacyUpgraded: z.boolean().optional(),
  authority: z.enum(['user', 'engine', 'system']).optional(),
  evidenceIds: z.array(z.string()).optional(),
});

export const ForgeDraftTopologyEdgeSchema = z.union([
  z.string(),
  ForgeDraftTopologyEdgeObjectSchema,
]);

export const ForgeDraftTopologySchema = z.object({
  startingNodeId: z.string().optional(),
  nodes: z.array(z.string()).optional().default([]),
  nodeDefinitions: z.array(ForgeTopologyNodeSchema).optional().default([]),
  connections: z.array(ForgeDraftTopologyEdgeSchema).optional().default([]),
  anchors: z.array(ForgeExpandableAnchorSchema).optional().default([]),
});

export const ForgeDraftNarrativeRulesSchema = z.object({
  incitingIncident: z.string().optional().default(''),
  phaseDirectives: z.record(z.string(), z.string()).optional().default({}),
  currentTensionLevel: z.string().optional().default('buildup'),
  keyPlotElements: z.array(z.string()).optional().default([]),
  pacingDirectives: z.string().optional(),
});

export const ForgeDraftSchema = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  identity: ForgeDraftIdentitySchema.optional().default({
    title: '',
    version: '1.0',
    author: '',
    thematicAnchor: '',
  }),
  title: z.string().optional().default(''),
  premise: z.string().optional().default(''),
  globalPremise: z.string().optional().default(''),
  setting: ForgeDraftSettingSchema.optional().default({
    location: '',
    atmosphere: '',
    timePeriod: '',
  }),
  startingVector: z
    .enum(['SOMATIC', 'COGNITIVE', 'COSMIC', 'SOCIO_MORAL'])
    .default('COGNITIVE'),
  startingTier: z
    .enum(['GATEWAY', 'LATENT', 'MANIFEST', 'TERMINAL'])
    .default('LATENT'),
  environmentalRules: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .default(''),
  constraints: z.array(z.string()).optional().default([]),
  contentScale: z.number().optional().default(3),
  contentLevelDescription: z.string().optional().default('Standard'),
  cast: z.array(ForgeDraftCastMemberSchema).optional().default([]),
  perspectives: z.array(ForgeDraftPerspectiveSchema).optional().default([]),
  topology: ForgeDraftTopologySchema.optional().default({
    nodes: [],
    nodeDefinitions: [],
    connections: [],
    anchors: [],
  }),
  narrativeRules: ForgeDraftNarrativeRulesSchema.optional().default({
    incitingIncident: '',
    phaseDirectives: {},
    currentTensionLevel: 'buildup',
    keyPlotElements: [],
  }),
  references: z.array(z.string()).optional().default([]),
  terminalConditions: z.unknown().optional(),
  characters: z.array(z.unknown()).optional().default([]),
  hauntedHouse: HauntedHouseProvenanceSchema.optional(),
  ambiguities: BlueprintAmbiguityDecisionsSchema.optional().default([]),
  depictionContract: DepictionContractSchema.optional(),
  userOpeningAim: UserOpeningAimSchema.optional(),
  horrorGrammar: HorrorGrammarAuthoringSchema.optional().default(() => ({
    valueBaselineReview: 'UNREVIEWED' as const,
    pursuitReviews: {},
    valueAnchors: [],
    characterPursuits: [],
  })),
});

export type ForgeDraft = z.input<typeof ForgeDraftSchema>;
export type ForgeDraftPatch = Partial<ForgeDraft>;
export type ForgeDraftIdentity = z.input<typeof ForgeDraftIdentitySchema>;
export type ForgeDraftSetting = z.input<typeof ForgeDraftSettingSchema>;
export type ForgeDraftCastMember = z.input<typeof ForgeDraftCastMemberSchema>;
export type ForgeDraftCastMemberOutput = z.output<typeof ForgeDraftCastMemberSchema>;
export type ForgeDraftPerspective = z.input<typeof ForgeDraftPerspectiveSchema>;
export type ForgeDraftTopology = z.input<typeof ForgeDraftTopologySchema>;
export type ForgeDraftNarrativeRules = z.input<typeof ForgeDraftNarrativeRulesSchema>;

export interface ForgeValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

export interface ForgeCompilationContext {
  draftRevision: number;
  sourceBaselineRevision: number;
}

export interface ForgeReviewArtifact {
  blueprint: import('./index').Blueprint;
  json: string;
  fileName: string;
  compiledAt: number;
  sourceDraftId: string;
  sourceDraftRevision: number;
  sourceBaselineRevision: number;
}

export type ForgeCompileResult =
  | {
      success: true;
      artifact: ForgeReviewArtifact;
      blueprint: import('./index').Blueprint;
      errors?: never;
    }
  | {
      success: false;
      errors: Record<string, string[]>;
      artifact?: never;
      blueprint?: never;
    };

// ============================================================================
// Phase 3D-2 Source Intake & Scenario Baseline Review Contracts
// ============================================================================

export const ForgeSourceRecordSchema = z
  .object({
    id: z.string().min(1),
    fileName: z.string().min(1),
    mimeType: z.string().min(1),
    kind: z.enum(['native_blueprint', 'document']),
    receivedAt: z.number(),
    fileSizeBytes: z.number().optional(),
  })
  .strict();
export type ForgeSourceRecord = z.infer<typeof ForgeSourceRecordSchema>;

export const ForgeSourceEvidenceCategorySchema = z.enum([
  'identity',
  'premise',
  'setting',
  'cast',
  'chronology',
  'motif',
  'rule',
  'topology',
  'expression',
  'other',
]);
export type ForgeSourceEvidenceCategory = z.infer<typeof ForgeSourceEvidenceCategorySchema>;

export const ForgeSourceEvidenceSchema = z
  .object({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    category: ForgeSourceEvidenceCategorySchema,
    claim: z.string().min(1),
    excerpt: z.string().optional(),
  })
  .strict();
export type ForgeSourceEvidence = z.infer<typeof ForgeSourceEvidenceSchema>;

export const ForgeSourceCandidateTargetSchema = z.enum([
  'scenario_title',
  'premise',
  'setting_location',
  'setting_atmosphere',
  'setting_time_period',
  'environmental_rule',
  'narrative_rule',
  'cast_seed',
  'cast_expression_guidance',
  'initial_topology_node',
  'reference_attribution',
  'value_anchor',
  'character_pursuit',
]);
export type ForgeSourceCandidateTarget = z.infer<typeof ForgeSourceCandidateTargetSchema>;

export const ForgeCandidateReviewDecisionSchema = z.enum(['accepted', 'rejected']);
export type ForgeCandidateReviewDecision = z.infer<typeof ForgeCandidateReviewDecisionSchema>;

export const ForgeCandidateApplicationStateSchema = z.enum(['staged', 'applied']);
export type ForgeCandidateApplicationState = z.infer<typeof ForgeCandidateApplicationStateSchema>;

/**
 * @deprecated Legacy review state schema for migration compatibility.
 */
export const ForgeSourceCandidateReviewStateSchema = z.enum(['pending', 'accepted', 'rejected']);
export type ForgeSourceCandidateReviewState = z.infer<typeof ForgeSourceCandidateReviewStateSchema>;

const BaseCandidateProps = {
  id: z.string().min(1),
  sourceId: z.string().min(1),
  classification: z.enum(['evidence', 'inference']),
  label: z.string().min(1),
  explanation: z.string().min(1),
  evidenceIds: z.array(z.string()).default([]),
  targetCastMemberId: z.string().optional(),
  reviewDecision: ForgeCandidateReviewDecisionSchema.default('accepted'),
  applicationState: ForgeCandidateApplicationStateSchema.default('staged'),
};

export const ScenarioTitleCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('scenario_title'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const PremiseCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('premise'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const SettingLocationCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('setting_location'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const SettingAtmosphereCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('setting_atmosphere'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const SettingTimePeriodCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('setting_time_period'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const EnvironmentalRuleCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('environmental_rule'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const NarrativeRuleCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('narrative_rule'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const InitialTopologyNodeCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('initial_topology_node'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const ReferenceAttributionCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('reference_attribution'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const CastSeedCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('cast_seed'),
    proposedValue: ForgeDraftCastMemberSchema,
  })
  .strict();

export const CastExpressionCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('cast_expression_guidance'),
    proposedValue: CharacterExpressionProfileSchema,
    targetCastMemberId: z.string().min(1, 'targetCastMemberId is required for expression guidance'),
  })
  .strict();

export const ValueAnchorCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('value_anchor'),
    proposedValue: ValueAnchorSchema,
  })
  .strict();

export const TopologyNodeCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('topology_node'),
    proposedValue: ForgeTopologyNodeSchema,
  })
  .strict();

export const TopologyConnectionCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('topology_connection'),
    proposedValue: ForgeDraftTopologyEdgeObjectSchema,
  })
  .strict();

export const StartingNodeSelectionCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('starting_node_selection'),
    proposedValue: z.string().trim().min(1),
  })
  .strict();

export const ExpandableSpaceAnchorCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('expandable_space_anchor'),
    proposedValue: ForgeExpandableAnchorSchema,
    parentNodeId: z.string().min(1).optional(),
  })
  .strict();

export const CastOpeningPlacementCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('cast_opening_placement'),
    targetCastMemberId: z.string().min(1, 'targetCastMemberId is required for cast opening placement'),
    proposedValue: CharacterPresenceDispositionSchema,
  })
  .strict();

export const CharacterPursuitCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('character_pursuit'),
    proposedValue: CharacterPursuitSchema,
  })
  .strict();

export const UserOpeningAimCandidateSchema = z
  .object({
    ...BaseCandidateProps,
    target: z.literal('user_opening_aim_default'),
    targetCastMemberId: z.string().min(1, 'targetCastMemberId is required for user opening aim default'),
    proposedValue: z.union([
      z.string(),
      UserOpeningAimSchema,
      z.object({
        aimText: z.string(),
      }),
    ]),
  })
  .strict();

export const ForgeSourceCandidateSchema = z.discriminatedUnion('target', [
  ScenarioTitleCandidateSchema,
  PremiseCandidateSchema,
  SettingLocationCandidateSchema,
  SettingAtmosphereCandidateSchema,
  SettingTimePeriodCandidateSchema,
  EnvironmentalRuleCandidateSchema,
  NarrativeRuleCandidateSchema,
  CastSeedCandidateSchema,
  CastExpressionCandidateSchema,
  InitialTopologyNodeCandidateSchema,
  TopologyNodeCandidateSchema,
  TopologyConnectionCandidateSchema,
  StartingNodeSelectionCandidateSchema,
  ExpandableSpaceAnchorCandidateSchema,
  CastOpeningPlacementCandidateSchema,
  ReferenceAttributionCandidateSchema,
  ValueAnchorCandidateSchema,
  CharacterPursuitCandidateSchema,
  UserOpeningAimCandidateSchema,
]);
export type ForgeSourceCandidate = z.infer<typeof ForgeSourceCandidateSchema>;

export const ForgeSourceUnknownStatusSchema = z.enum([
  'queued',
  'submitting',
  'awaiting_response',
  'follow_up_required',
  'awaiting_confirmation',
  'recoverable_failure',
  'resolved',
  'contextual_discretion',
  'terminal_binding_loss',
]);
export type ForgeSourceUnknownStatus = z.infer<typeof ForgeSourceUnknownStatusSchema>;

export const ForgeUnknownFollowUpSchema = z
  .object({
    id: z.string().min(1),
    question: z.string().trim().min(1).max(1000),
    answer: z.string().trim().max(1000).optional(),
  })
  .strict();
export type ForgeUnknownFollowUp = z.infer<typeof ForgeUnknownFollowUpSchema>;

export const ForgeResolutionPatchOperationSchema = z.discriminatedUnion('target', [
  z
    .object({
      target: z.literal('cast_description'),
      castMemberId: z.string().min(1),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('cast_personality'),
      castMemberId: z.string().min(1),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('premise_detail'),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('setting_atmosphere'),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('environmental_rule'),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('narrative_rule'),
      text: z.string().trim().min(1).max(1000),
    })
    .strict(),
  z
    .object({
      target: z.literal('add_value_anchor'),
      anchor: ValueAnchorSchema,
    })
    .strict(),
  z
    .object({
      target: z.literal('set_value_review_state'),
      state: ValueBaselineReviewStateSchema,
    })
    .strict(),
  z
    .object({
      target: z.literal('add_character_pursuit'),
      pursuit: CharacterPursuitSchema,
    })
    .strict(),
  z
    .object({
      target: z.literal('set_character_pursuit_review_state'),
      castMemberId: z.string().min(1),
      state: PursuitReviewStateSchema,
    })
    .strict(),
  z
    .object({
      target: z.literal('remove_value_anchor'),
      anchorId: z.string().min(1),
    })
    .strict(),
  z
    .object({
      target: z.literal('remove_character_pursuit'),
      pursuitId: z.string().min(1),
    })
    .strict(),
]);
export type ForgeResolutionPatchOperation = z.infer<typeof ForgeResolutionPatchOperationSchema>;

export const ForgeResolutionDraftPatchSchema = z
  .object({
    operations: z.array(ForgeResolutionPatchOperationSchema).max(10).default([]),
  })
  .strict();
export type ForgeResolutionDraftPatch = z.infer<typeof ForgeResolutionDraftPatchSchema>;

export const ForgeUnknownResolutionProposalSchema = z
  .object({
    resolution: z.string().trim().min(1).max(1000),
    targetEffect: z.string().trim().min(1).max(1000),
    draftPatch: ForgeResolutionDraftPatchSchema.optional(),
  })
  .strict();
export type ForgeUnknownResolutionProposal = z.infer<typeof ForgeUnknownResolutionProposalSchema>;

export const CompleteDepictionContractSchema = z
  .object({
    dramaticRegister: z.string().trim().min(1).max(1000),
    directness: z.string().trim().min(1).max(1000),
    aftermath: z.string().trim().min(1).max(1000),
    ambiguityHandling: z.string().trim().min(1).max(1000),
    specialBoundaries: z.string().trim().max(1000),
  })
  .strict();

export const DepictionContractProposalSchema = z
  .object({
    contract: CompleteDepictionContractSchema,
    rationale: z.string().trim().min(1).max(1000),
    sourceDraftRevision: z.number().int().positive(),
    sourceBaselineRevision: z.number().int().positive(),
    createdAt: z.number().int().positive(),
  })
  .strict();
export type DepictionContractProposal = z.infer<typeof DepictionContractProposalSchema>;

export const ForgeSourceUnknownSchema = z
  .object({
    id: z.string().min(1),
    sourceId: z.string().min(1),
    category: ForgeSourceEvidenceCategorySchema,
    question: z.string().min(1),
    status: ForgeSourceUnknownStatusSchema.default('queued'),
    targetEffect: z.string().trim().min(1).max(1000),
    submittedAnswer: z.string().trim().max(1000).optional(),
    resolutionProposal: ForgeUnknownResolutionProposalSchema.optional(),
    followUps: z.array(ForgeUnknownFollowUpSchema).max(2).default([]),
    lastError: z.string().optional(),
  })
  .strict();
export type ForgeSourceUnknown = z.infer<typeof ForgeSourceUnknownSchema>;

export const ForgeSourceAnalysisSchema = z
  .object({
    id: z.string().min(1),
    sourceRecord: ForgeSourceRecordSchema,
    summary: z.string().optional(),
    evidence: z.array(ForgeSourceEvidenceSchema).default([]),
    candidates: z.array(ForgeSourceCandidateSchema).default([]),
    unknowns: z.array(ForgeSourceUnknownSchema).default([]),
    status: z.enum(['completed', 'error']).default('completed'),
    errorMessage: z.string().optional(),
  })
  .strict();
export type ForgeSourceAnalysis = z.infer<typeof ForgeSourceAnalysisSchema>;

