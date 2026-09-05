import { get, set, del } from 'idb-keyval';
import { StateStorage } from 'zustand/middleware';

const hasIndexedDB = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
const memoryStore = new Map<string, string>();

const issuedSequences = new Map<string, number>();
const completedSequences = new Map<string, number>();

type FailurePredicate = string | RegExp | ((key: string) => boolean);
let injectedFailure: { predicate?: FailurePredicate; error: Error } | null = null;
const injectedDelays = new Map<string, number>();
let lastStorageError: Error | null = null;

function shouldInjectFailure(name: string): boolean {
  if (!injectedFailure) return false;
  if (!injectedFailure.predicate) return true;
  if (typeof injectedFailure.predicate === 'string') {
    return injectedFailure.predicate === name;
  }
  if (injectedFailure.predicate instanceof RegExp) {
    return injectedFailure.predicate.test(name);
  }
  if (typeof injectedFailure.predicate === 'function') {
    return injectedFailure.predicate(name);
  }
  return false;
}

export interface EnhancedIdbStorage extends StateStorage {
  __injectWriteFailure: (predicate?: FailurePredicate, error?: Error) => void;
  __injectWriteDelay: (key: string, delayMs: number) => void;
  __clearInjectedFailures: () => void;
  __clearInjectedDelays: () => void;
  __clearMemoryStore: () => void;
  __getLastStorageError: () => Error | null;
  __resetSequences: (key?: string) => void;
  __getCompletedSequence: (key: string) => number;
}

/**
 * Custom IndexedDB storage engine for Zustand persist middleware.
 * Provides asynchronous, non-blocking storage with monotonic write sequence tracking
 * to suppress out-of-order/delayed writes, honest error propagation (no silent fallback),
 * and test harness hooks for failure injection.
 */
export const idbStorage: EnhancedIdbStorage = {
  getItem: async (name: string): Promise<string | null> => {
    if (!hasIndexedDB) {
      return memoryStore.get(name) || null;
    }
    try {
      const value = await get(name);
      return value !== undefined && value !== null ? JSON.stringify(value) : null;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastStorageError = error;
      throw error;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const seq = (issuedSequences.get(name) ?? 0) + 1;
    issuedSequences.set(name, seq);

    // Apply any configured latency/delay for concurrency & out-of-order testing
    const delayMs = injectedDelays.get(name);
    if (typeof delayMs === 'number' && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Check injected write failure
    if (shouldInjectFailure(name)) {
      const error = injectedFailure?.error || new Error(`Injected storage write rejection for '${name}'`);
      lastStorageError = error;
      throw error;
    }

    if (!hasIndexedDB) {
      const latestCompleted = completedSequences.get(name) ?? 0;
      if (seq >= latestCompleted) {
        memoryStore.set(name, value);
        completedSequences.set(name, seq);
      }
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const latestCompleted = completedSequences.get(name) ?? 0;
      // Stale or delayed write: a newer write has already completed for this key!
      if (seq < latestCompleted) {
        return;
      }
      await set(name, parsed);
      // Double check sequence in case a concurrent write completed during the await
      const currentCompleted = completedSequences.get(name) ?? 0;
      if (seq >= currentCompleted) {
        completedSequences.set(name, seq);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastStorageError = error;
      // DO NOT silently fallback to memoryStore! Fail honestly so caller/system knows
      // the write was not committed durably to disk.
      throw error;
    }
  },

  removeItem: async (name: string): Promise<void> => {
    const seq = (issuedSequences.get(name) ?? 0) + 1;
    issuedSequences.set(name, seq);

    if (!hasIndexedDB) {
      memoryStore.delete(name);
      completedSequences.set(name, seq);
      return;
    }

    try {
      await del(name);
      completedSequences.set(name, seq);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastStorageError = error;
      throw error;
    }
  },

  __injectWriteFailure: (predicate?: FailurePredicate, error?: Error) => {
    injectedFailure = {
      predicate,
      error: error || new Error('Injected storage failure'),
    };
  },

  __injectWriteDelay: (key: string, delayMs: number) => {
    injectedDelays.set(key, delayMs);
  },

  __clearInjectedFailures: () => {
    injectedFailure = null;
    lastStorageError = null;
  },

  __clearInjectedDelays: () => {
    injectedDelays.clear();
  },

  __clearMemoryStore: () => {
    memoryStore.clear();
  },

  __getLastStorageError: () => lastStorageError,

  __resetSequences: (key?: string) => {
    if (key) {
      issuedSequences.delete(key);
      completedSequences.delete(key);
    } else {
      issuedSequences.clear();
      completedSequences.clear();
    }
  },

  __getCompletedSequence: (key: string) => completedSequences.get(key) ?? 0,
};
