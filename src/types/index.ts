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

export const CastMemberSchema = z.object({
  id: z.string().default(() => `char-${Date.now()}`),
  name: z.string().default("Unknown"),
  description: z.string().default(""),
  role: z.string().optional().default("Subject"),
  personality: z.string().optional().default(""),
  goals: z.string().optional().default(""),
  traits: z.array(z.string()).optional().default([]),
  isUserCharacter: z.boolean().optional().default(false),
  behaviorVector: z.enum(['ADAPTIVE', 'INSURGENT', 'PANIC']).optional().default('ADAPTIVE')
});

export const BlueprintSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional().default("Unknown Enclosure"),
  premise: z.string().optional().default(""),
  startingVector: z.enum(['SOMATIC', 'COGNITIVE', 'COSMIC', 'SOCIO_MORAL']).optional(),
  startingTier: z.enum(['GATEWAY', 'LATENT', 'MANIFEST', 'TERMINAL']).optional(),
  environmentalRules: z.string().optional().default(""),
  contentScale: z.number().optional().default(3),
  contentLevelDescription: z.string().optional().default("Standard"),
  
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
  references: z.array(z.string()).optional().default([])
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
  behaviorVector?: AutopilotVector;
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
}

export interface Message {
  role: 'user' | 'assistant' | 'voice' | 'system_cinematic';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  blocks?: NarrativeBlock[];
  engine_thoughts?: string;
  frozen_psychological_status?: string;
}

export interface TelemetryState {
  tension: string;
  pacing: string;
  castLedger: Array<{ character_name: string; current_location: string; psychological_status: string }>;
  engineLogic: string;
}

export type NodeState = 'SECURE' | 'OPEN' | 'LOCKED' | 'CORRUPTED';

export interface SpatialNode {
  id: string;
  name: string;
  baseDescription: string;
  connectedNodes: string[]; // Array of accessible Node IDs
  state: NodeState;
}

export interface SpatialGraph {
  regionId: string;
  nodes: Record<string, SpatialNode>;
  currentNodeId: string;
}

export interface AppState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
  telemetry: TelemetryState | null;
  setTelemetry: (telemetry: TelemetryState) => void;
  spatialGraph: SpatialGraph | null;
  setCurrentNode: (nodeId: string) => void;
}

export interface LogicState {
  current_location: string;
  player_injuries: string[];
  inventory: string[];
  psychological_status: string;
  player_role: 'protagonist' | 'antagonist';
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

export type BlockType = 'prose' | 'dialogue' | 'internal_monologue' | 'environmental_intrusion' | 'system_voice';

export interface NarrativeBlock {
  type: BlockType;
  content: string;
  speaker?: string; // Optional: Only used if type is 'dialogue' or 'internal_monologue'
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
