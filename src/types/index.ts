export type AppPhase = 'hub' | 'forge' | 'engine' | 'voice';

export type ContentScale = 1 | 2 | 3 | 4 | 5 | 6;

export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // base64
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
  narrativeRules: {
    incitingIncident: string;
    pacingDirectives: string; // Instructions for the Orchestrator
    keyPlotElements: string[];
  };
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  attachments?: Attachment[];
}

export interface AppState {
  phase: AppPhase;
  setPhase: (phase: AppPhase) => void;
}
