/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message, CharacterProfile, ForgePhase, ReferenceMaterial, ProseStyleVector, HorrorVector, ExposureTier } from '../types';
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

export interface DraftBlueprint {
  id?: string;
  title?: string;
  premise?: string;
  references?: string[];
  startingVector: HorrorVector;
  startingTier: ExposureTier;
  environmentalRules?: string;
  cast?: any[];
}

export interface ForgeState {
  castLedger: CastMember[];
  topology: Record<string, string[]>;
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
  architectMessages: { role: string, content: string }[];
  who: string;
  what: string;
  where: string;
  when: string;
  whyHow: string;
}

const initialState: ForgeState = {
  castLedger: [],
  topology: {
    'NODE_INIT': []
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
  draftBlueprint: null
};

export const useForgeStoreInternal = create<ForgeState & { actions: any }>()(
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
        addArchitectMessage: (message: any) => set((state: ForgeState) => ({ 
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
        updateDraft: (updates: any) => set((state: ForgeState) => ({
          draftBlueprint: state.draftBlueprint ? { ...state.draftBlueprint, ...updates } : { 
            startingVector: 'COGNITIVE', 
            startingTier: 'GATEWAY', 
            ...updates 
          } as DraftBlueprint
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
        }))
      }
    }),
    {
      name: 'the-forge-memory',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => {
        const { actions, ...rest } = state;
        const stateWithoutActions = rest as any;
        return {
          ...stateWithoutActions,
          messages: stateWithoutActions.messages.map((msg: any) => {
            const messageWithoutFiles = { ...msg };
            delete messageWithoutFiles.attachments;
            return messageWithoutFiles;
          }),
        };
      },
    }
  )
);

// We define a hook that replicates what zustand normally returns, but strips actions.
export function useForgeState<T>(selector: (state: ForgeState) => T): T;
export function useForgeState(): Readonly<ForgeState>;
export function useForgeState<T>(selector?: (state: ForgeState) => T) {
  return useForgeStoreInternal((state) => {
    const { actions, ...readOnlyState } = state;
    if (selector) {
      return selector(readOnlyState as ForgeState);
    }
    return readOnlyState as Readonly<ForgeState>;
  });
}

// Ensure all previous code utilizing useForgeStore maps either to useForgeState or to forgeActions.
export const forgeActions = useForgeStoreInternal.getState().actions;
export const getForgeState = () => {
    const { actions, ...readOnlyState } = useForgeStoreInternal.getState();
    return readOnlyState as Readonly<ForgeState>;
};


// Exporting useForgeStore temporarily mapping directly to useForgeState mapped to older usages, 
// wait, if I export useForgeStore exactly as useForgeState, the actions won't be there, 
// so compilation will fail wherever actions were destructured. I need to update all consumers.
