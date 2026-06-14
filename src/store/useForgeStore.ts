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

export interface DraftBlueprint {
  id?: string;
  title?: string;
  premise?: string;
  startingVector: HorrorVector;
  startingTier: ExposureTier;
  environmentalRules?: string;
  cast?: any[];
}

interface ForgeState {
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
  who: string;
  what: string;
  where: string;
  when: string;
  whyHow: string;
  setWho: (val: string) => void;
  setWhat: (val: string) => void;
  setWhere: (val: string) => void;
  setWhen: (val: string) => void;
  setWhyHow: (val: string) => void;
  clearForgeInputs: () => void;
  updateDraft: (updates: Partial<DraftBlueprint>) => void;
  initializeDraft: () => void;
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
}

/**
 * Zustand store for The Forge's persistent memory.
 * Uses IndexedDB via idb-keyval for asynchronous, non-blocking storage.
 */
export const useForgeStore = create<ForgeState>()(
  persist(
    (set) => ({
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
      who: '',
      what: '',
      where: '',
      when: '',
      whyHow: '',
      draftBlueprint: null,
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
      updateDraft: (updates) => set((state) => ({
        draftBlueprint: state.draftBlueprint ? { ...state.draftBlueprint, ...updates } : { 
          startingVector: 'COGNITIVE', 
          startingTier: 'GATEWAY', 
          ...updates 
        } as DraftBlueprint
      })),
      setWho: (val) => set({ who: val }),
      setWhat: (val) => set({ what: val }),
      setWhere: (val) => set({ where: val }),
      setWhen: (val) => set({ when: val }),
      setWhyHow: (val) => set({ whyHow: val }),
      clearForgeInputs: () => set({ who: '', what: '', where: '', when: '', whyHow: '' }),
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearHistory: () => set({ 
        draftBlueprint: null,
        messages: [
          {
            role: 'assistant',
            content: 'Forge Reset. Architect online. Describe the foundation of your nightmare.',
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
      }),
      setAvailableReferenceCharacters: (characters) => set({ availableReferenceCharacters: characters }),
      addCharacterToCast: (character) => set((state) => {
        const npcCount = state.selectedCharacters.filter(c => !c.isUserCharacter).length;
        if (!character.isUserCharacter && npcCount >= 5) return state;
        if (state.selectedCharacters.find(c => c.id === character.id)) return state;
        return { selectedCharacters: [...state.selectedCharacters, character] };
      }),
      removeCharacterFromCast: (id) => set((state) => ({
        selectedCharacters: state.selectedCharacters.filter(c => c.id !== id)
      })),
      updateCharacterDetails: (id, updates) => set((state) => ({
        selectedCharacters: state.selectedCharacters.map(c => c.id === id ? { ...c, ...updates } : c)
      })),
      setHasReferenceMaterial: (has) => set({ hasReferenceMaterial: has }),
      setForgePhase: (phase) => set({ forgePhase: phase }),
      setSummaryContext: (context) => set({ summaryContext: context }),
      setExtractedSetting: (setting) => set({ extractedSetting: setting }),
      setExtractedThreat: (threat) => set({ extractedThreat: threat }),
      setExtractedStyle: (style) => set({ extractedStyle: style }),
      addReferenceMaterials: (materials) => set((state) => ({ 
        referenceMaterials: [...state.referenceMaterials, ...materials] 
      })),
      removeReferenceMaterial: (id) => set((state) => ({
        referenceMaterials: state.referenceMaterials.filter(m => m.id !== id)
      })),
    }),
    {
      name: 'the-forge-memory',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        ...state,
        messages: state.messages.map((msg) => {
          const messageWithoutFiles = { ...msg };
          delete (messageWithoutFiles as any).attachments;
          return messageWithoutFiles;
        }),
      }),
    }
  )
);
