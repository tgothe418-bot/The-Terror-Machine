import { get, set, del } from 'idb-keyval';
import { StateStorage } from 'zustand/middleware';

/**
 * Custom IndexedDB storage engine for Zustand persist middleware.
 * Provides asynchronous, non-blocking storage with virtually unlimited capacity.
 */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await get(name);
    return value ? JSON.stringify(value) : null;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await set(name, JSON.parse(value));
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};
