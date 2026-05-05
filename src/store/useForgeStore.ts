import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message, CharacterProfile, ForgePhase, ReferenceMaterial } from '../types';
import { idbStorage } from '../lib/idbStorage';

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
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearHistory: () => set({ 
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
