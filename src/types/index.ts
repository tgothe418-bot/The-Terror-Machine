import { z } from 'zod';

export type AppPhase = 'hub' | 'forge' | 'engine' | 'voice';

export type ForgePhase = 
  | 'CAST_EXTRACTION' 
  | 'INTERVIEW_PHASE_1' 
  | 'INTERVIEW_PHASE_2' 
  | 'CONFIRMATION' 
  | 'GENERATION';

export type ContentScale = 1 | 2 | 3 | 4 | 5 | 6;

export type HorrorVector = 'SOMATIC' | 'COGNITIVE' | 'COSMIC' | 'SOCIO_MORAL';
export type ExposureTier = 'GATEWAY' | 'LATENT' | 'MANIFEST' | 'TERMINAL';
export type AutopilotVector = 'ADAPTIVE' | 'INSURGENT' | 'PANIC';

export type EdgeKind = 
  | "PHYSICAL" 
  | "FORCED_EVENT" 
  | "MEMORY_RECONSTRUCTION" 
  | "HISTORICAL_REFERENCE" 
  | "TERMINAL_EJECTION"
  | "AUTHORED_PARADOX";

export interface TopologyEdge {
  from: string;
  to: string;
  kind: EdgeKind;
  requires?: string[];
  userInitiated: boolean;
  legacyUpgraded?: boolean;
  authority?: EdgeAuthority;
}

export const EdgeKindSchema = z.enum([
  "PHYSICAL", 
  "FORCED_EVENT", 
  "MEMORY_RECONSTRUCTION", 
  "HISTORICAL_REFERENCE", 
  "TERMINAL_EJECTION",
  "AUTHORED_PARADOX"
]);

export const TopologyEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  kind: EdgeKindSchema,
  requires: z.array(z.string()).optional(),
  userInitiated: z.boolean(),
  legacyUpgraded: z.boolean().optional()
});

export const VulnerabilityIndexSchema = z.object({
  resilience: z.number().min(0).max(1).default(0.5),
  skepticism: z.number().min(0).max(1).default(0.5),
  baggage: z.number().min(0).max(1).default(0.5)
});

export type VulnerabilityIndex = z.infer<typeof VulnerabilityIndexSchema>;

export const CastMemberSchema = z.object({
  id: z.string().default(() => `char-${Date.now()}`),
  name: z.string().default("Unknown"),
  description: z.string().default(""),
  role: z.string().optional().default("Subject"),
  personality: z.string().optional().default(""),
  goals: z.string().optional().default(""),
  traits: z.array(z.string()).optional().default([]),
  isUserCharacter: z.boolean().optional().default(false),
  behaviorVector: z.string().optional().default('ADAPTIVE'),
  isEntity: z.boolean().optional().default(false),
  vulnerabilityBase: VulnerabilityIndexSchema.optional()
});

export const BlueprintSchema = z.object({
  id: z.string().optional(),
  identity: z.object({
    title: z.string().optional().default("Unknown Enclosure"),
    version: z.string().optional().default("1.0"),
    author: z.string().optional().default("Unknown")
  }).optional().default({ title: "Unknown Enclosure", version: "1.0", author: "Unknown" }),
  title: z.string().optional().default("Unknown Enclosure"), // Fallback for legacy
  globalPremise: z.string().optional().default(""),
  premise: z.string().optional().default(""), // Legacy fallback
  startingVector: z.enum(['SOMATIC', 'COGNITIVE', 'COSMIC', 'SOCIO_MORAL']).optional(),
  startingTier: z.enum(['GATEWAY', 'LATENT', 'MANIFEST', 'TERMINAL']).optional(),
  environmentalRules: z.union([z.string(), z.array(z.string())]).optional().default([]),
  constraints: z.array(z.string()).optional().default([]),
  contentScale: z.number().optional().default(3),
  contentLevelDescription: z.string().optional().default("Standard"),
  
  topology: z.object({
    nodes: z.array(z.string()).optional().default([]),
    connections: z.array(TopologyEdgeSchema).optional().default([])
  }).optional().default({ nodes: [], connections: [] }),
  userCharacterId: z.string().optional(),
  
  setting: z.object({
    location: z.string().optional().default("Unknown"),
    atmosphere: z.string().optional().default(""),
    timePeriod: z.string().optional().default("Present")
  }).optional().default({}),
  
  narrativeRules: z.object({
    incitingIncident: z.string().optional().default(""),
    phaseDirectives: z.any().optional().default({}),
    currentTensionLevel: z.string().optional().default("buildup"),
    keyPlotElements: z.array(z.string()).optional().default([])
  }).optional().default({}),
  
  // Explicitly require an array of characters, but allow infinite length
  cast: z.array(CastMemberSchema).min(1).optional().default([{ id: '1', name: 'Unknown', description: '' }]),
  characters: z.array(z.any()).optional().default([]),
  
  // Safely default to an empty array.
  references: z.array(z.string()).optional().default([]),
  
  perspectives: z.array(z.any()).optional().default([]),
  terminalConditions: z.any().optional()
});

// For compatibility with previous types, though we augment them
export type CastMember = z.infer<typeof CastMemberSchema>;
export type Blueprint = z.infer<typeof BlueprintSchema>;

export interface ReferenceMaterial {
  id: string;
  type: 'text' | 'image';
  mimeType: string;
  content: string; // Raw text for docs, clean Base64 string for images
  fileName: string;
}

export interface ExtractedLore {
  extracted_cast: CharacterProfile[];
  extracted_setting: string;
  extracted_threat: string;
  extracted_style: string;
}

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
}

export interface ProseStyleVector {
  sentenceStructure: "fragmented" | "staccato" | "compound-heavy" | "clinical-flat";
  vocabularyTier: "visceral" | "archaic" | "clinical" | "colloquial";
  sensoryFocus: string[];
  thematicCore: string;
  forbiddenDevices: string[];
}

export type TensionLevel = 'buildup' | 'visceral_climax' | 'aftermath';

export interface CharacterProfile {
  id: string;
  name: string;
  role: string;
  personality: string;
  goals: string;
  traits: string[];
  isUserCharacter: boolean;
  behaviorVector?: AutopilotVector | string;
  isEntity?: boolean;
  vulnerabilityBase?: VulnerabilityIndex;
}

export interface TerminalConditions {
  somaticTerminal: {
    fatalThresholdTags: string[]; // e.g., ["exsanguinated", "concussed_unconscious"]
    narrativeResolution: string;   // The cold-archive text when physical shell fails
  };
  narrativeConvergence: {
    requiredStateFlags: string[];  // e.g., ["grid_severed", "sacrifice_recorded"]
    resolutionSequence: string;    // The pyrrhic closure description (e.g., the Mina Hark resolution)
  };
  cognitiveCollapse: {
    maxWebDensity: number;         // Threshold of reality-breaking entries before fracturing
    collapseResolution: string;    // The text when the internal matrix shatters into the environment
  };
}

export interface SubjectivePerspective {
  role: 'PROTAGONIST' | 'ANTAGONIST' | 'DIRECTOR';
  framingDirective: string;     // Purely atmospheric/colorful instructions for the prose
  sensoryBias: string[];        // What the engine should focus on visually/aurally
  startingSemanticState: string;// The strict mechanical tag block for Turn 1
}

export interface ScenarioBlueprint {
  title: string;
  references?: string[];
  contentScale: ContentScale;
  contentLevelDescription: string; // e.g. "Spooky Fun - Splatterpunk"
  startingVector?: HorrorVector;
  startingTier?: ExposureTier;
  environmentalRules?: string;
  setting: {
    location: string;
    atmosphere: string; // Sensory constraints
    timePeriod: string;
  };
  terminalConditions?: TerminalConditions;
  characters: Array<{
    name: string;
    role: string;
    psychologicalState: string; // To ensure naturalistic reactions
    characteristics?: string;
    motivations?: string;
  }>;
  cast: CharacterProfile[];
  narrativeRules: {
    incitingIncident: string;
    phaseDirectives: Record<TensionLevel, string>;
    currentTensionLevel: TensionLevel;
    keyPlotElements: string[];
  };
  styleProfile?: ProseStyleVector; // A synthesized description of the user's writing style
  perspectives?: SubjectivePerspective[];
}

export interface Message {
  role: 'user' | 'assistant' | 'voice' | 'system_cinematic';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  blocks?: NarrativeBlock[];
  engine_thoughts?: string;
  frozen_psychological_status?: string;
  visibleToModel?: boolean;
  visibleToTelemetry?: boolean;
}

export interface TelemetryState {
  tension: string;
  pacing: string;
  castLedger: Array<{ character_name: string; current_location: string; psychological_status: string }>;
  engineLogic: string;
}

export type NodeState = 'SECURE' | 'OPEN' | 'LOCKED' | 'CORRUPTED';

export type DecayStageId = 'STABLE' | 'FRAYING' | 'UNSTABLE' | 'SHATTERED';

export interface DecayThreshold {
  stage: DecayStageId;
  maxSkepticism: number;
  minSkepticism: number;
  environmentalCoherence: number; // 1.0 = Rigidly Euclidean, 0.0 = Complete Void
  narrativeDivergence: 'NONE' | 'LATENT_AMBIGUITY' | 'STRUCTURAL_DISTORTION' | 'TOPOLOGICAL_PARADOX';
}

export interface DecayState {
  currentStage: DecayStageId;
  coherenceRating: number;
  divergenceMode: string;
}

export interface SpatialNode {
  id: string;
  name: string;
  description: string;
  connectedNodes: string[]; // Array of accessible Node IDs
}

export interface AppState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
  telemetry: TelemetryState | null;
  setTelemetry: (telemetry: TelemetryState) => void;
  spatialGraph: SpatialNode[];
  currentNodeId: string | null;
  isShattered: boolean;
  decayMetrics: DecayState;
  updateDecayMetrics: (skepticism: number) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  compileTopology: (forgeTopology: any, startNodeId: string) => void;
  triggerShatter: () => void;
  setCurrentNodeId: (nodeId: string) => void;
}

export type PlayerRole = "protagonist" | "antagonist" | "director" | "witness" | "possessed";
export type PerspectiveMode = "embodied" | "entity_embodied" | "director" | "witness";

export interface LogicState {
  current_location: string;
  player_injuries: string[];
  inventory: string[];
  psychological_status: string;
  player_role: PlayerRole;
  player_character_id?: string | null;
  perspective_mode: PerspectiveMode;
  current_tension_level: TensionLevel;
  cast_ledger?: Array<{
    character_name: string;
    current_location: string;
    psychological_status: string;
  }>;
  lore_and_memory: {
    established_facts: string[];
    permanent_consequences: string[];
  };
  npc_fixations: {
    characterId: string;
    current_thought: string;
  }[];
}

export type BlockType = 'prose' | 'dialogue' | 'internal_monologue' | 'environmental_intrusion' | 'system_voice' | 'TRANSITION_REJECTED';

export interface NarrativeBlock {
  type: BlockType;
  content?: string;
  speaker?: string; // Optional: Only used if type is 'dialogue' or 'internal_monologue'
  requested?: string;
  reason?: string;
  visibleToModel?: boolean;
  visibleToTelemetry?: boolean;
}

export interface ValidationReceipt {
  accepted: boolean;
  rejected_fields: string[];
  repair_notes: string[];
}

export interface RatifiedEngineFrame {
  narrative_blocks: NarrativeBlock[];
  engine_thoughts: string;
  logic_state: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    requested_transition?: any;
    suggested_tension?: "buildup" | "visceral_climax" | "aftermath";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    matrix_mutation?: any;
    terminal_flags?: string[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cast_ledger?: any[];
  };
  validation: ValidationReceipt;
}

export interface BicameralOutput {
  engine_thoughts: string;
  narrative_blocks: NarrativeBlock[];
  logic_state: LogicState;
  suggested_tension?: 'buildup' | 'visceral_climax' | 'aftermath';
  matrix_mutation?: {
    next_vector: HorrorVector;
    next_tier: ExposureTier;
  };
}

// --- CORE DEFINITIONS ---
export type EnginePhase = "LATENT" | "MANIFEST" | "TERMINAL";
export type EdgeAuthority = "user" | "engine" | "system";
export type TransitionSource = "user_command" | "llm_request" | "engine_rule" | "system_script";
export type NarrativeVelocity = "slow_burn" | "tightening" | "accelerating" | "fever_pitch" | "terminal_sprint";

export interface BlueprintNode {
  id: string;
  name?: string;
  description?: string;
  decayStates?: Partial<Record<EnginePhase, NodeDecayState>>;
}

// --- CAMPAIGN & MACRO-TOPOLOGY ---
export interface CampaignActRef {
  actId: string;
  blueprintId: string;
  blueprintRef: string; // The URL or asset path to lazy-load the JSON
  title: string;
  entryNodeId?: string;
  defaultPerspectiveCharacterId?: string;
}

export interface CampaignEdge {
  id: string;
  fromActId: string;
  toActId: string;
  kind: "clean_cut" | "sequel_continuity" | "screen_memory" | "trauma_bridge" | "temporal_jump" | "possession_shift" | "terminal_ejection" | "contamination_breach";
  triggerFlags: string[];
  targetEntryNodeId?: string;
  authority: EdgeAuthority;
  carryoverPolicyId: string;
}

export interface CampaignManifest {
  id: string;
  title: string;
  version: string;
  author?: string;
  initialActId: string;
  acts: CampaignActRef[];
  edges: CampaignEdge[];
  carryoverPolicies: CarryoverPolicy[];
}

// --- TRANSITIONS & RECEIPTS ---
export interface ActTransitionTransaction {
  transitionId: string;
  sessionId: string;
  fromActId: string;
  toActId: string;
  sourceBlueprintId: string;
  sourceStartRevision: number;
  sourceEndRevision: number;
  status: "requested" | "distilling" | "distilled" | "committing" | "committed" | "failed";
}

export interface TemporalShiftReceipt {
  fromNodeId: string;
  toNodeId: string;
  elapsedTime: string; // e.g., "8 hours"
  preservedFacts: string[];
  changedFacts: string[];
  characterStateDeltas: string[];
  forbiddenRetcons: string[];
}

export interface IdentityTransition {
  fromCharacterId: string;
  toCharacterId: string;
  kind: "perspective_cut" | "possession" | "revelation" | "identity_erasure";
  authority: EdgeAuthority;
  triggerFlags: string[];
}

// --- MEMORY & CARRYOVER ---
export type TraumaScope = "local_act" | "campaign" | "contamination" | "quarantined";
export type TraumaVisibility = "hidden" | "somatic_echo" | "symbolic_motif" | "vague_memory" | "explicit_recollection";

export interface TraumaEntry {
  id: string;
  sourceActId?: string;
  sourceBlueprintId?: string;
  text: string;
  tags: string[];
  scope: TraumaScope;
  visibility: TraumaVisibility;
}

export interface CarryoverPolicy {
  id: string;
  allowedScopes: TraumaScope[];
  defaultVisibility: TraumaVisibility;
  forbiddenNames: string[];
  forbiddenPlaces: string[];
}

export interface CarryoverPacket {
  allowedScars: TraumaEntry[];
  allowedMotifs: string[];
  forbiddenNames: string[];
  forbiddenPlaces: string[];
  revealMode: "subconscious" | "symbolic" | "literal";
  revealRate: "none" | "slow" | "moderate" | "aggressive";
}

// --- STATE SCHISM (RUNTIME) ---
export interface ActRuntimeState {
  actId: string;
  blueprintId: string;
  turnCount: number;
  currentPhase: EnginePhase;
  systemFlags: string[];
  currentNode: string;
  activeCharacterId: string | null;
  perspective_mode?: PerspectiveMode;
  pacingLedger: {
    failedEscapeAttempts: number;
    memoryAnchorsRemaining: number;
    spatialContradictions: number;
  };
  narrativeVelocity: NarrativeVelocity;
}

export interface CampaignRuntimeState {
  campaignId: string;
  sessionId: string;
  currentActId: string;
  traumaLedger: TraumaEntry[];
  motifLedger: Record<string, number>;
  globalFlags: string[]; 
  suspendedActs: Record<string, Partial<ActRuntimeState>>; 
}

export interface PlayerContinuity {
  campaignSessionId: string;
  carriedScars: TraumaEntry[];
}

export interface CharacterIdentity {
  actId: string;
  activeCharacterId: string;
  perspectiveRole: "protagonist" | "witness" | "antagonist" | "possessed";
}

export interface NodeDecayState {
  hiddenPromptDescription: string;
  visibleTags?: string[];
  requiredFlags?: string[];
  forbiddenBeforeFlags?: string[];
}

// --- PHASE V: MEMORY SCHISM ---

export interface SystemLogicIntervention {
  type: "state_collision" | "narrative_override" | "engine_rule";
  trigger: string;
  mutation: string;
  directive_injected?: boolean;
}

export interface PerspectiveShiftReceipt {
  type: "perspective_shift";
  previousRole: PlayerRole;
  nextRole: PlayerRole;
  previousCharacterId: string | null;
  nextCharacterId: string | null;
  sceneFacts: string[]; // Objective state extractions
  activeNodeId: string;
  directive: string;
}

export interface UITranscriptMessage {
  id: string;
  role: "user" | "system" | "narrative" | "director";
  content: string;
  systemLogic?: SystemLogicIntervention[];
  isEdited?: boolean;
  cosmetic?: boolean;
  reconciliationStatus?: 'pending' | 'synced' | 'failed';
}

export interface TurnSnapshot {
  timestamp: number;
  preservedActState: Partial<ActRuntimeState>;
}
