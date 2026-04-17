import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message } from '../types';
import { idbStorage } from '../lib/idbStorage';

interface ForgeState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearHistory: () => void;
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
        ] 
      }),
    }),
    {
      name: 'the-forge-memory',
      storage: createJSONStorage(() => idbStorage),
      partialize: (state) => ({
        ...state,
        messages: state.messages.map((msg) => {
          const { attachments, ...messageWithoutFiles } = msg;
          return messageWithoutFiles;
        }),
      }),
    }
  )
);
