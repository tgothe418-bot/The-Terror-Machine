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
  role: 'user' | 'assistant' | 'voice';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  blocks?: NarrativeBlock[];
  engine_thoughts?: string;
  frozen_psychological_status?: string;
}

export interface AppState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
}

export interface LogicState {
  current_location: string;
  player_injuries: string[];
  inventory: string[];
  psychological_status: string;
  player_role: 'protagonist' | 'antagonist';
  current_tension_level: TensionLevel;
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
