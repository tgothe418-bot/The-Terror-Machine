import { get, set, del } from 'idb-keyval';
import { StateStorage } from 'zustand/middleware';

const hasIndexedDB = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
const memoryStore = new Map<string, string>();

/**
 * Custom IndexedDB storage engine for Zustand persist middleware.
 * Provides asynchronous, non-blocking storage with virtually unlimited capacity,
 * with in-memory fallback for headless or test environments.
 */
export const idbStorage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!hasIndexedDB) {
      return memoryStore.get(name) || null;
    }
    try {
      const value = await get(name);
      return value ? JSON.stringify(value) : null;
    } catch {
      return memoryStore.get(name) || null;
    }
  },
  setItem: async (name: string, value: string): Promise<void> => {
    if (!hasIndexedDB) {
      memoryStore.set(name, value);
      return;
    }
    try {
      await set(name, JSON.parse(value));
    } catch {
      memoryStore.set(name, value);
    }
  },
  removeItem: async (name: string): Promise<void> => {
    if (!hasIndexedDB) {
      memoryStore.delete(name);
      return;
    }
    try {
      await del(name);
    } catch {
      memoryStore.delete(name);
    }
  },
};
