import { z } from 'zod';
import { EdgeKindSchema } from './engineContract';
import { HauntedHouseProvenanceSchema } from './participation';

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
});

export const ForgeDraftTopologyEdgeSchema = z.union([
  z.string(),
  ForgeDraftTopologyEdgeObjectSchema,
]);

export const ForgeDraftTopologySchema = z.object({
  nodes: z.array(z.string()).optional().default([]),
  connections: z.array(ForgeDraftTopologyEdgeSchema).optional().default([]),
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
  topology: ForgeDraftTopologySchema.optional().default({ nodes: [], connections: [] }),
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
});

export type ForgeDraft = z.input<typeof ForgeDraftSchema>;
export type ForgeDraftPatch = Partial<ForgeDraft>;
export type ForgeDraftIdentity = z.input<typeof ForgeDraftIdentitySchema>;
export type ForgeDraftSetting = z.input<typeof ForgeDraftSettingSchema>;
export type ForgeDraftCastMember = z.input<typeof ForgeDraftCastMemberSchema>;
export type ForgeDraftPerspective = z.input<typeof ForgeDraftPerspectiveSchema>;
export type ForgeDraftTopology = z.input<typeof ForgeDraftTopologySchema>;
export type ForgeDraftNarrativeRules = z.input<typeof ForgeDraftNarrativeRulesSchema>;

export interface ForgeValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

export interface ForgeReviewArtifact {
  blueprint: import('./index').Blueprint;
  json: string;
  fileName: string;
  compiledAt: number;
  sourceDraftId: string;
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

export const ForgeSourceRecordSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  kind: z.enum(['native_blueprint', 'document']),
  receivedAt: z.number(),
  fileSizeBytes: z.number().optional(),
});
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

export const ForgeSourceEvidenceSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  category: ForgeSourceEvidenceCategorySchema,
  claim: z.string(),
  excerpt: z.string().optional(),
});
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
]);
export type ForgeSourceCandidateTarget = z.infer<typeof ForgeSourceCandidateTargetSchema>;

export const ForgeSourceCandidateReviewStateSchema = z.enum(['pending', 'accepted', 'rejected']);
export type ForgeSourceCandidateReviewState = z.infer<typeof ForgeSourceCandidateReviewStateSchema>;

export const ForgeSourceCandidateSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  classification: z.enum(['evidence', 'inference']),
  target: ForgeSourceCandidateTargetSchema,
  label: z.string(),
  explanation: z.string(),
  evidenceIds: z.array(z.string()).default([]),
  proposedValue: z.unknown(),
  targetCastMemberId: z.string().optional(),
  reviewState: ForgeSourceCandidateReviewStateSchema.default('pending'),
});
export type ForgeSourceCandidate = z.infer<typeof ForgeSourceCandidateSchema>;

export const ForgeSourceUnknownSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  category: ForgeSourceEvidenceCategorySchema,
  question: z.string(),
});
export type ForgeSourceUnknown = z.infer<typeof ForgeSourceUnknownSchema>;

export const ForgeSourceAnalysisSchema = z.object({
  id: z.string(),
  sourceRecord: ForgeSourceRecordSchema,
  summary: z.string().optional(),
  evidence: z.array(ForgeSourceEvidenceSchema).default([]),
  candidates: z.array(ForgeSourceCandidateSchema).default([]),
  unknowns: z.array(ForgeSourceUnknownSchema).default([]),
  status: z.enum(['completed', 'error']).default('completed'),
  errorMessage: z.string().optional(),
});
export type ForgeSourceAnalysis = z.infer<typeof ForgeSourceAnalysisSchema>;

