import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Message,
  CharacterProfile,
  ForgePhase,
  ReferenceMaterial,
  ProseStyleVector,
  HorrorVector,
  ExposureTier,
  AutopilotVector,
  TopologyEdge,
  VulnerabilityIndex,
  Blueprint,
  ScenarioBlueprint,
} from '../types';
import { idbStorage } from '../lib/idbStorage';

export const defaultStyleVector: ProseStyleVector = {
  sentenceStructure: "clinical-flat",
  vocabularyTier: "clinical",
  sensoryFocus: ["metallic friction", "micro-expressions", "spatial geometry"],
  thematicCore: "objective observation of deteriorating systems",
  forbiddenDevices: [
    "cinematic camera angles", 
    "metaphors and similes", 
    "forced colloquialisms", 
    "suddenly or unexpectedly", 
    "internal emotional assumptions"
  ]
};

export type CastRole = 'PROTAGONIST' | 'ANTAGONIST' | 'SENTINEL' | 'ENTITY' | 'OBSERVER';

export interface CastMember {
  id: string;
  name: string;
  role: CastRole;
  psychological_status: string;
  starting_location: string;
}

export interface DraftIdentity {
  title?: string;
  version?: string;
  author?: string;
  thematicAnchor?: string;
}

export interface DraftCastMember {
  id: string;
  name: string;
  description?: string;
  role?: string;
  personality?: string;
  goals?: string;
  traits?: string[];
  isUserCharacter?: boolean;
  behaviorVector?: AutopilotVector | string;
  isEntity?: boolean;
  psychological_status?: string;
  starting_location?: string;
  vulnerabilityBase?: VulnerabilityIndex;
}

export type DraftPerspectiveRole = 'PROTAGONIST' | 'ANTAGONIST' | 'DIRECTOR' | 'WITNESS' | 'POSSESSED';

export interface DraftPerspective {
  role: DraftPerspectiveRole | string;
  framingDirective?: string;
  sensoryBias?: string[];
  startingSemanticState?: string | {
    soma?: string[];
    geom?: string[];
    imp?: string;
  };
  subjectCharacterId?: string;
}

export interface DraftTopology {
  nodes?: string[];
  connections?: Array<TopologyEdge | string>;
}

export interface DraftBlueprint {
  id?: string;
  title?: string;
  premise?: string;
  globalPremise?: string;
  references?: string[];
  startingVector: HorrorVector;
  startingTier: ExposureTier;
  environmentalRules?: string | string[];
  constraints?: string[];
  contentScale?: number;
  contentLevelDescription?: string;
  cast?: DraftCastMember[];
  perspectives?: DraftPerspective[];
  topology?: DraftTopology;
  identity?: DraftIdentity;
  setting?: {
    location?: string;
    atmosphere?: string;
    timePeriod?: string;
  };
  narrativeRules?: {
    incitingIncident?: string;
    phaseDirectives?: Record<string, string>;
    currentTensionLevel?: string;
    keyPlotElements?: string[];
    pacingDirectives?: string;
  };
  terminalConditions?: unknown;
  characters?: unknown[];
}

export type DraftBlueprintPatch = Partial<DraftBlueprint>;

export interface EntityMemoryState {
  tacticalImperative: string; // The immediate, shifting goal
  somaticState: string[];     // Physical truths (e.g., "broken arm", "bleeding")
  relationalWeb: string[];    // Environmental/Entity knowledge
  systemFlags?: string[];
}

export interface ArchitectMessage {
  role: 'architect' | 'user' | string;
  content: string;
}

export interface SimulationPerspective {
  role?: string;
  startingSemanticState?: string | {
    soma?: string[];
    geom?: string[];
    imp?: string;
  };
}

export interface SimulationBlueprintInput {
  perspectives?: SimulationPerspective[] | DraftPerspective[];
}

export interface ForgeActions {
  addCastMember: (member: Omit<CastMember, 'id'>) => void;
  updateCastMember: (id: string, updates: Partial<CastMember>) => void;
  removeCastMember: (id: string) => void;
  resetStore: () => void;
  addSpatialNode: (nodeId: string) => void;
  removeSpatialNode: (nodeId: string) => void;
  toggleSpatialEdge: (nodeA: string, nodeB: string) => void;
  updateActiveMemory: (updates: Partial<EntityMemoryState>) => void;
  commitSemanticTags: (parsedTags: Record<string, string[]>) => void;
  addArchitectMessage: (message: ArchitectMessage) => void;
  clearArchitectChat: () => void;
  initializeDraft: () => void;
  updateDraft: (updates: DraftBlueprintPatch) => void;
  removeReference: (fileName: string) => void;
  setWho: (val: string) => void;
  setWhat: (val: string) => void;
  setWhere: (val: string) => void;
  setWhen: (val: string) => void;
  setWhyHow: (val: string) => void;
  clearForgeInputs: () => void;
  addMessage: (message: Message) => void;
  clearHistory: () => void;
  setAvailableReferenceCharacters: (characters: CharacterProfile[]) => void;
  addCharacterToCast: (character: CharacterProfile) => void;
  removeCharacterFromCast: (id: string) => void;
  updateCharacterDetails: (id: string, updates: Partial<CharacterProfile>) => void;
  setHasReferenceMaterial: (has: boolean) => void;
  setForgePhase: (phase: ForgePhase) => void;
  setSummaryContext: (context: string) => void;
  setExtractedSetting: (setting: string) => void;
  setExtractedThreat: (threat: string) => void;
  setExtractedStyle: (style: string) => void;
  addReferenceMaterials: (materials: ReferenceMaterial[]) => void;
  removeReferenceMaterial: (id: string) => void;
  setActiveNeuralLink: (role: 'PROTAGONIST' | 'ANTAGONIST') => void;
  setActiveCharacterId: (id: string | null) => void;
  startSimulation: (blueprint?: SimulationBlueprintInput | DraftBlueprint | Blueprint | ScenarioBlueprint | null) => void;
}

export interface ForgeState {
  castLedger: CastMember[];
  topology: Record<string, string[]>;
  activeMemory: EntityMemoryState;
  messages: Message[];
  availableReferenceCharacters: CharacterProfile[];
  selectedCharacters: CharacterProfile[];
  hasReferenceMaterial: boolean;
  forgePhase: ForgePhase;
  summaryContext: string;
  referenceMaterials: ReferenceMaterial[];
  extractedSetting: string;
  extractedThreat: string;
  extractedStyle: string;
  draftBlueprint: DraftBlueprint | null;
  architectMessages: ArchitectMessage[];
  who: string;
  what: string;
  where: string;
  when: string;
  whyHow: string;
  activeNeuralLink: 'PROTAGONIST' | 'ANTAGONIST';
  activeCharacterId: string | null;
}

const initialState: ForgeState = {
  castLedger: [],
  topology: {
    'NODE_INIT': []
  },
  activeMemory: {
    tacticalImperative: "Survive and assess the immediate surroundings.",
    somaticState: ["Baseline health"],
    relationalWeb: ["Subject is isolated."]
  },
  messages: [
    {
      role: 'assistant',
      content: 'Forge Initialized. Architect online. Describe the foundation of your nightmare.',
      timestamp: Date.now(),
    },
  ],
  availableReferenceCharacters: [],
  selectedCharacters: [],
  hasReferenceMaterial: false,
  forgePhase: 'CAST_EXTRACTION',
  summaryContext: '',
  referenceMaterials: [],
  extractedSetting: '',
  extractedThreat: '',
  extractedStyle: '',
  architectMessages: [
    { role: 'architect', content: "I am the Architect. Tell me what kind of nightmare we are building today." }
  ],
  who: '',
  what: '',
  where: '',
  when: '',
  whyHow: '',
  draftBlueprint: null,
  activeNeuralLink: 'PROTAGONIST',
  activeCharacterId: null
};

export type ForgeStore = ForgeState & { actions: ForgeActions };

export const useForgeStoreInternal = create<ForgeStore>()(
  persist(
    (set) => ({
      ...initialState,
      actions: {
        addCastMember: (member: Omit<CastMember, 'id'>) => set((state: ForgeState) => ({
          castLedger: [...state.castLedger, { ...member, id: crypto.randomUUID() }]
        })),
        updateCastMember: (id: string, updates: Partial<CastMember>) => set((state: ForgeState) => ({
          castLedger: state.castLedger.map(m => m.id === id ? { ...m, ...updates } : m)
        })),
        removeCastMember: (id: string) => set((state: ForgeState) => ({
          castLedger: state.castLedger.filter(m => m.id !== id)
        })),
        resetStore: () => set(initialState),
        addSpatialNode: (nodeId: string) => set((state: ForgeState) => {
          if (state.topology[nodeId]) return state; // Prevent duplicates
          return { topology: { ...state.topology, [nodeId]: [] } };
        }),
        removeSpatialNode: (nodeId: string) => set((state: ForgeState) => {
          const newTopology = { ...state.topology };
          delete newTopology[nodeId];
          // Clean up orphaned edges
          Object.keys(newTopology).forEach(key => {
            newTopology[key] = newTopology[key].filter(id => id !== nodeId);
          });
          return { topology: newTopology };
        }),
        toggleSpatialEdge: (nodeA: string, nodeB: string) => set((state: ForgeState) => {
          const edgesA = state.topology[nodeA] || [];
          const isConnected = edgesA.includes(nodeB);
          
          return {
            topology: {
              ...state.topology,
              [nodeA]: isConnected ? edgesA.filter(id => id !== nodeB) : [...edgesA, nodeB],
              // Bi-directional constraint enforcement
              [nodeB]: isConnected 
                ? (state.topology[nodeB] || []).filter(id => id !== nodeA)
                : [...(state.topology[nodeB] || []), nodeA]
            }
          };
        }),
        updateActiveMemory: (updates: Partial<EntityMemoryState>) => set((state: ForgeState) => ({
          activeMemory: { ...state.activeMemory, ...updates }
        })),
        commitSemanticTags: (parsedTags: Record<string, string[]>) => set((state: ForgeState) => {
          const nextMemory = { ...state.activeMemory };
          
          if (parsedTags['SOMA']) nextMemory.somaticState = parsedTags['SOMA'];
          if (parsedTags['GEOM']) nextMemory.relationalWeb = parsedTags['GEOM'];
          if (parsedTags['IMP']) nextMemory.tacticalImperative = parsedTags['IMP'].join(' ');
          if (parsedTags['SYS']) nextMemory.systemFlags = parsedTags['SYS'];
          
          return { activeMemory: nextMemory };
        }),
        addArchitectMessage: (message: ArchitectMessage) => set((state: ForgeState) => ({ 
          architectMessages: [...state.architectMessages, message] 
        })),
        clearArchitectChat: () => set({ 
          architectMessages: [
            { role: 'architect', content: "I am the Architect. Tell me what kind of nightmare we are building today." }
          ] 
        }),
        initializeDraft: () => set({
          draftBlueprint: {
            id: crypto.randomUUID(),
            title: '',
            premise: '',
            startingVector: 'COGNITIVE',
            startingTier: 'LATENT',
            environmentalRules: ''
          }
        }),
        updateDraft: (updates: DraftBlueprintPatch) => set((state: ForgeState) => ({
          draftBlueprint: state.draftBlueprint ? { ...state.draftBlueprint, ...updates } : { 
            startingVector: 'COGNITIVE', 
            startingTier: 'GATEWAY', 
            ...updates 
          }
        })),
        removeReference: (fileName: string) => set((state: ForgeState) => {
          if (!state.draftBlueprint) return state;
          return {
            draftBlueprint: {
              ...state.draftBlueprint,
              references: state.draftBlueprint.references?.filter(ref => ref !== fileName) || []
            }
          };
        }),
        setWho: (val: string) => set({ who: val }),
        setWhat: (val: string) => set({ what: val }),
        setWhere: (val: string) => set({ where: val }),
        setWhen: (val: string) => set({ when: val }),
        setWhyHow: (val: string) => set({ whyHow: val }),
        clearForgeInputs: () => set({ who: '', what: '', where: '', when: '', whyHow: '' }),
        addMessage: (message: Message) =>
          set((state: ForgeState) => ({
            messages: [...state.messages, message],
          })),
        clearHistory: () => set({ 
          ...initialState
        }),
        setAvailableReferenceCharacters: (characters: CharacterProfile[]) => set({ availableReferenceCharacters: characters }),
        addCharacterToCast: (character: CharacterProfile) => set((state: ForgeState) => {
          const npcCount = state.selectedCharacters.filter(c => !c.isUserCharacter).length;
          if (!character.isUserCharacter && npcCount >= 5) return state;
          if (state.selectedCharacters.find(c => c.id === character.id)) return state;
          return { selectedCharacters: [...state.selectedCharacters, character] };
        }),
        removeCharacterFromCast: (id: string) => set((state: ForgeState) => ({
          selectedCharacters: state.selectedCharacters.filter(c => c.id !== id)
        })),
        updateCharacterDetails: (id: string, updates: Partial<CharacterProfile>) => set((state: ForgeState) => ({
          selectedCharacters: state.selectedCharacters.map(c => c.id === id ? { ...c, ...updates } : c)
        })),
        setHasReferenceMaterial: (has: boolean) => set({ hasReferenceMaterial: has }),
        setForgePhase: (phase: ForgePhase) => set({ forgePhase: phase }),
        setSummaryContext: (context: string) => set({ summaryContext: context }),
        setExtractedSetting: (setting: string) => set({ extractedSetting: setting }),
        setExtractedThreat: (threat: string) => set({ extractedThreat: threat }),
        setExtractedStyle: (style: string) => set({ extractedStyle: style }),
        addReferenceMaterials: (materials: ReferenceMaterial[]) => set((state: ForgeState) => ({ 
          referenceMaterials: [...state.referenceMaterials, ...materials] 
        })),
        removeReferenceMaterial: (id: string) => set((state: ForgeState) => ({
          referenceMaterials: state.referenceMaterials.filter(m => m.id !== id)
        })),
        setActiveNeuralLink: (role: 'PROTAGONIST' | 'ANTAGONIST') => set({ activeNeuralLink: role }),
        setActiveCharacterId: (id: string | null) => set({ activeCharacterId: id }),
        startSimulation: (blueprint?: SimulationBlueprintInput | DraftBlueprint | Blueprint | ScenarioBlueprint | null) => set((state: ForgeState) => {
          const activePerspective = blueprint?.perspectives?.find(
            (p) => p && typeof p === 'object' && 'role' in p && p.role === state.activeNeuralLink
          );
          
          let initialSomatic: string[] = [];
          let initialGeOM: string[] = [];
          let initialImp = "";

          if (activePerspective && typeof activePerspective === 'object' && 'startingSemanticState' in activePerspective) {
            const semanticState = activePerspective.startingSemanticState;
            if (semanticState && typeof semanticState === 'object') {
              initialSomatic = ('soma' in semanticState && Array.isArray(semanticState.soma)) ? semanticState.soma : [];
              initialGeOM = ('geom' in semanticState && Array.isArray(semanticState.geom)) ? semanticState.geom : [];
              initialImp = ('imp' in semanticState && typeof semanticState.imp === 'string') ? semanticState.imp : "";
            } else if (typeof semanticState === 'string') {
              initialImp = semanticState;
            }
          }

          return {
            activeMemory: {
              somaticState: initialSomatic,
              relationalWeb: initialGeOM,
              tacticalImperative: initialImp,
              systemFlags: []
            }
          };
        })
      }
    }),
    {
      name: 'the-forge-memory',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        const stateCopy = { ...state } as Partial<ForgeStore>;
        delete stateCopy.actions;
        return {
          ...(stateCopy as ForgeState),
          messages: (stateCopy.messages || []).map((msg) => {
            const msgCopy = { ...msg };
            delete msgCopy.attachments;
            return msgCopy;
          }),
        };
      },
    }
  )
);

export interface UseForgeStateHook {
  <T>(selector: (state: ForgeState) => T): T;
  (): Readonly<ForgeState>;
  persist: typeof useForgeStoreInternal.persist;
}

export const useForgeState = ((selector?: (state: ForgeState) => unknown) => {
  return useForgeStoreInternal((state) => {
    if (selector) {
      return selector(state as ForgeState);
    }
    return state as Readonly<ForgeState>;
  });
}) as UseForgeStateHook;

useForgeState.persist = useForgeStoreInternal.persist;

export const forgeActions: ForgeActions = useForgeStoreInternal.getState().actions;
export const getForgeState = (): Readonly<ForgeState> => {
  return useForgeStoreInternal.getState() as Readonly<ForgeState>;
};
