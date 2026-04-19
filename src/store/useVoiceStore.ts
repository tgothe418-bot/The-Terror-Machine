import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Message } from '../types';
import { idbStorage } from '../lib/idbStorage';

interface VoiceState {
  messages: Message[];
  addMessage: (message: Message) => void;
  setVoiceMessage: (content: string) => void;
  clearHistory: () => void;
}

/**
 * Zustand store for The Voice's persistent memory.
 * Uses IndexedDB via idb-keyval for asynchronous, non-blocking storage.
 */
export const useVoiceStore = create<VoiceState>()(
  persist(
    (set) => ({
      messages: [
        {
          role: 'voice',
          content: "Hello. I'm The Voice. I'm here to listen and chat. What's on your mind?",
          timestamp: Date.now(),
        }
      ],
      addMessage: (message) =>
        set((state) => ({
          messages: [...state.messages, message],
        })),
      setVoiceMessage: (content) =>
        set((state) => ({
          messages: [...state.messages, { role: 'voice', content, timestamp: Date.now() }],
        })),
      clearHistory: () => set({ 
        messages: [
          {
            role: 'voice',
            content: "Memory cleared. I'm ready to start our conversation fresh. What's on your mind?",
            timestamp: Date.now(),
          }
        ] 
      }),
    }),
    {
      name: 'the-voice-memory',
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
