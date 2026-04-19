export type AppPhase = 'hub' | 'forge' | 'engine' | 'voice';

export type ContentScale = 1 | 2 | 3 | 4 | 5 | 6;

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
}

export interface StyleVectors {
  sensoryDominance: string[];
  syntacticCadence: string;
  thematicCore: string;
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
}

export interface ScenarioBlueprint {
  title: string;
  contentScale: ContentScale;
  contentLevelDescription: string; // e.g. "Spooky Fun - Splatterpunk"
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
  styleProfile?: StyleVectors; // A synthesized description of the user's writing style
}

export interface Message {
  role: 'user' | 'assistant' | 'voice';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  blocks?: NarrativeBlock[];
  engine_thoughts?: string;
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
}
