import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message } from '../types';
import { idbStorage } from '../lib/idbStorage';

interface VoiceState {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearHistory: () => void;
}

/**
 * Zustand store for The Voice's persistent memory.
 * Uses IndexedDB via idb-keyval for asynchronous, non-blocking storage.
 */
export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      messages: [],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      clearHistory: () => set({ messages: [] }),
    }),
    {
      name: 'the-voice-memory',
      storage: createJSONStorage(() => idbStorage),
    }
  )
);
