/**
 * Storage Utilities
 *
 * Consolidates all storage-related functionality:
 * - localStorage management and quota handling
 * - IndexedDB for large data (events, search items)
 * - Username/avatar caching utilities
 */

import React from 'react';
import { GitHubEvent } from '../types';

// ============================================================================
// LOCALSTORAGE UTILITIES
// ============================================================================

export interface StorageInfo {
  key: string;
  size: number;
  lastModified?: number;
}

/**
 * Get the size of a localStorage item in bytes
 */
export const getStorageItemSize = (key: string): number => {
  try {
    const item = localStorage.getItem(key);
    return item ? new Blob([item]).size : 0;
  } catch {
    return 0;
  }
};

/**
 * Get total size of all localStorage data
 */
export const getTotalStorageSize = (): number => {
  try {
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        total += getStorageItemSize(key);
      }
    }
    return total;
  } catch {
    return 0;
  }
};

/**
 * Get information about all localStorage items
 */
export const getStorageInfo = (): StorageInfo[] => {
  try {
    const info: StorageInfo[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        info.push({
          key,
          size: getStorageItemSize(key),
        });
      }
    }
    return info.sort((a, b) => b.size - a.size);
  } catch {
    return [];
  }
};

/**
 * Clear old data to make space for new data
 */
export const clearOldData = (targetKey: string, requiredSize: number): boolean => {
  try {
    const maxSize = 4.5 * 1024 * 1024; // 4.5MB limit to be safe
    const currentSize = getTotalStorageSize();

    if (currentSize + requiredSize > maxSize) {
      const cleanupOrder = [
        'github-search-results',
        'github-events-results',
        'github-raw-events-results',
        'github-raw-data-storage',
        'github-item-ui-state',
        'github-ui-settings',
      ];

      for (const key of cleanupOrder) {
        if (key !== targetKey && localStorage.getItem(key)) {
          localStorage.removeItem(key);
          console.warn(`Removed old data from localStorage: ${key}`);

          if (getTotalStorageSize() + requiredSize <= maxSize) {
            return true;
          }
        }
      }
    }

    return getTotalStorageSize() + requiredSize <= maxSize;
  } catch {
    return false;
  }
};

/**
 * Check if there's enough space for new data
 */
export const hasEnoughSpace = (requiredSize: number): boolean => {
  const maxSize = 4.5 * 1024 * 1024;
  return getTotalStorageSize() + requiredSize <= maxSize;
};

/**
 * Get storage usage statistics
 */
export const getStorageStats = () => {
  const totalSize = getTotalStorageSize();
  const maxSize = 5 * 1024 * 1024;
  const usagePercent = (totalSize / maxSize) * 100;

  return {
    totalSize,
    maxSize,
    usagePercent,
    availableSpace: maxSize - totalSize,
    isNearLimit: usagePercent > 80,
  };
};

/**
 * Clear all GitHub-related data from localStorage
 */
export const clearAllGitHubData = (): void => {
  const githubKeys = [
    'github-search-results',
    'github-events-results',
    'github-raw-events-results',
    'github-raw-data-storage',
    'github-last-search-params',
    'github-item-ui-state',
    'github-ui-settings',
    'github-form-settings',
    'github-username-cache',
  ];

  githubKeys.forEach((key) => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log(`Cleared localStorage key: ${key}`);
    }
  });
};

/**
 * Clear GitHub caches and data while preserving the GitHub token
 * Returns the preserved GitHub token that should be used in the updated form settings
 */
export const clearCachesKeepToken = async (): Promise<string> => {
  try {
    // Preserve the GitHub token from form settings
    let preservedToken = '';
    const formSettings = localStorage.getItem('github-form-settings');
    if (formSettings) {
      try {
        const parsed = JSON.parse(formSettings);
        preservedToken = parsed.githubToken || '';
      } catch {
        // If parsing fails, token will remain empty string
      }
    }

    // Clear localStorage keys
    const keysToRemove = [
      'github-search-results',
      'github-events-results',
      'github-raw-events-results',
      'github-raw-data-storage',
      'github-last-search-params',
      'github-item-ui-state',
      'github-ui-settings',
      'github-username-cache',
      'github-form-settings',
    ];

    keysToRemove.forEach((key) => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
        console.log(`Cleared cache localStorage key: ${key}`);
      }
    });

    // Clear IndexedDB data
    await eventsStorage.clear();
    console.log('Cleared IndexedDB cache data');

    console.log('✅ Cache cleanup completed, preserved GitHub token for reuse');
    return preservedToken;
  } catch (error) {
    console.error('Failed to clear caches:', error);
    return '';
  }
};

/**
 * Safe localStorage setter that handles quota exceeded errors
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    const dataSize = new Blob([value]).size;

    if (!hasEnoughSpace(dataSize)) {
      if (!clearOldData(key, dataSize)) {
        console.warn('Not enough localStorage space. Data will not be saved.');
        return false;
      }
    }

    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error(`localStorage quota exceeded for key "${key}". Attempting cleanup...`);

      const dataSize = new Blob([value]).size;
      if (clearOldData(key, dataSize)) {
        try {
          localStorage.setItem(key, value);
          console.log('Successfully saved data after cleanup');
          return true;
        } catch (retryError) {
          console.error('Failed to save data even after cleanup:', retryError);
          return false;
        }
      } else {
        console.error('Not enough space even after cleanup. Data will not be saved.');
        return false;
      }
    } else {
      console.error(`Error saving to localStorage key "${key}":`, error);
      return false;
    }
  }
};

// ============================================================================
// INDEXED DB
// ============================================================================

const DB_NAME = 'GitVegasDB';
const DB_VERSION = 1;
const EVENTS_STORE = 'events';
const METADATA_STORE = 'metadata';

export interface EventsData {
  id: string;
  events: GitHubEvent[];
  metadata: {
    lastFetch: number;
    usernames: string[];
    apiMode: 'search' | 'events' | 'summary';
    startDate?: string;
    endDate?: string;
  };
  timestamp: number;
}

export interface MetadataRecord {
  id: string;
  value: unknown;
  timestamp: number;
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  async init(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Failed to open IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeEvents(key: string, events: GitHubEvent[], metadata: EventsData['metadata']): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([EVENTS_STORE], 'readwrite');
      const store = transaction.objectStore(EVENTS_STORE);

      const data: EventsData = {
        id: key,
        events,
        metadata,
        timestamp: Date.now(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to store events:', request.error);
        reject(request.error);
      };
    });
  }

  async getEvents(key: string): Promise<EventsData | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([EVENTS_STORE], 'readonly');
      const store = transaction.objectStore(EVENTS_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to retrieve events:', request.error);
        reject(request.error);
      };
    });
  }

  async storeMetadata(key: string, value: unknown): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([METADATA_STORE], 'readwrite');
      const store = transaction.objectStore(METADATA_STORE);

      const data: MetadataRecord = {
        id: key,
        value,
        timestamp: Date.now(),
      };

      const request = store.put(data);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to store metadata:', request.error);
        reject(request.error);
      };
    });
  }

  async getMetadata(key: string): Promise<unknown | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([METADATA_STORE], 'readonly');
      const store = transaction.objectStore(METADATA_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result?.value || null);
      };

      request.onerror = () => {
        console.error('Failed to retrieve metadata:', request.error);
        reject(request.error);
      };
    });
  }

  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([EVENTS_STORE, METADATA_STORE], 'readwrite');
      const eventsStore = transaction.objectStore(EVENTS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const eventsRequest = eventsStore.clear();
      const metadataRequest = metadataStore.clear();

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) resolve();
      };

      eventsRequest.onsuccess = checkComplete;
      metadataRequest.onsuccess = checkComplete;

      eventsRequest.onerror = () => reject(eventsRequest.error);
      metadataRequest.onerror = () => reject(metadataRequest.error);
    });
  }

  async getStorageInfo(): Promise<{ eventsCount: number; metadataCount: number; totalSize: number }> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([EVENTS_STORE, METADATA_STORE], 'readonly');
      const eventsStore = transaction.objectStore(EVENTS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const eventsRequest = eventsStore.getAll();
      const metadataRequest = metadataStore.getAll();

      let eventsData: EventsData[] = [];
      let metadataData: MetadataRecord[] = [];

      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === 2) {
          const totalSize = JSON.stringify(eventsData).length + JSON.stringify(metadataData).length;
          resolve({
            eventsCount: eventsData.length,
            metadataCount: metadataData.length,
            totalSize,
          });
        }
      };

      eventsRequest.onsuccess = () => {
        eventsData = eventsRequest.result;
        checkComplete();
      };

      metadataRequest.onsuccess = () => {
        metadataData = metadataRequest.result;
        checkComplete();
      };

      eventsRequest.onerror = () => reject(eventsRequest.error);
      metadataRequest.onerror = () => reject(metadataRequest.error);
    });
  }

  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

export const indexedDBManager = new IndexedDBManager();

/**
 * Convenience functions for events storage
 */
export const eventsStorage = {
  async store(key: string, events: GitHubEvent[], metadata: EventsData['metadata']): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      try {
        localStorage.setItem(key, JSON.stringify({ events, metadata }));
      } catch (error) {
        console.error('Failed to store in localStorage:', error);
      }
      return;
    }

    try {
      await indexedDBManager.storeEvents(key, events, metadata);
    } catch (error) {
      console.error('Failed to store in IndexedDB, falling back to localStorage:', error);
      try {
        localStorage.setItem(key, JSON.stringify({ events, metadata }));
      } catch (localError) {
        console.error('Failed to store in localStorage:', localError);
      }
    }
  },

  async retrieve(
    key: string
  ): Promise<{ events: GitHubEvent[]; metadata: EventsData['metadata'] } | null> {
    if (!IndexedDBManager.isSupported()) {
      console.warn('IndexedDB not supported, trying localStorage');
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to retrieve from localStorage:', error);
        return null;
      }
    }

    try {
      const data = await indexedDBManager.getEvents(key);
      return data ? { events: data.events, metadata: data.metadata } : null;
    } catch (error) {
      console.error('Failed to retrieve from IndexedDB, trying localStorage:', error);
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (localError) {
        console.error('Failed to retrieve from localStorage:', localError);
        return null;
      }
    }
  },

  async clear(): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      const keysToRemove = [
        'github-raw-data-storage',
        'github-events-results',
        'github-raw-events-results',
      ];
      keysToRemove.forEach((key) => localStorage.removeItem(key));
      return;
    }

    try {
      await indexedDBManager.clearAll();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  },

  async getInfo(): Promise<{ eventsCount: number; metadataCount: number; totalSize: number } | null> {
    if (!IndexedDBManager.isSupported()) {
      return null;
    }

    try {
      return await indexedDBManager.getStorageInfo();
    } catch (error) {
      console.error('Failed to get storage info:', error);
      return null;
    }
  },
};

// ============================================================================
// USERNAME CACHE UTILITIES
// ============================================================================

/**
 * Creates a function to add usernames to a Set-based cache
 */
export const createAddToCache = (
  setter: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  return (usernames: string[]) => {
    setter((prevSet) => {
      const newSet = new Set(prevSet);
      usernames.forEach((u) => newSet.add(u));
      return newSet;
    });
  };
};

/**
 * Creates a function to remove a username from a Set-based cache
 */
export const createRemoveFromCache = (
  setter: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  return (username: string) => {
    setter((prevSet) => {
      const newSet = new Set(prevSet);
      newSet.delete(username);
      return newSet;
    });
  };
};

/**
 * Creates a function to add avatar URLs to a Map-based cache
 */
export const createAddAvatarsToCache = (
  setter: React.Dispatch<React.SetStateAction<Map<string, string>>>
) => {
  return (avatarUrls: Record<string, string>) => {
    setter((prevMap) => {
      let safeMap: Map<string, string>;

      if (prevMap instanceof Map) {
        safeMap = new Map(prevMap);
      } else {
        safeMap = new Map();
        if (prevMap && typeof prevMap === 'object') {
          try {
            Object.entries(prevMap).forEach(([key, value]) => {
              if (typeof value === 'string') {
                safeMap.set(key, value);
              }
            });
          } catch (error) {
            console.warn('Failed to reconstruct avatar cache from previous state:', error);
          }
        }
      }

      Object.entries(avatarUrls).forEach(([username, avatarUrl]) => {
        safeMap.set(username, avatarUrl);
      });

      return safeMap;
    });
  };
};

/**
 * Creates a function to update the lastFetched timestamp for usernames
 */
export const createUpdateLastFetched = (
  setter: React.Dispatch<React.SetStateAction<Map<string, number>>>
) => {
  return (usernames: string[]) => {
    const now = Date.now();
    setter((prevMap) => {
      let safeMap: Map<string, number>;

      if (prevMap instanceof Map) {
        safeMap = new Map(prevMap);
      } else {
        safeMap = new Map();
        if (prevMap && typeof prevMap === 'object') {
          try {
            Object.entries(prevMap).forEach(([key, value]) => {
              if (typeof value === 'number') {
                safeMap.set(key, value);
              }
            });
          } catch (error) {
            console.warn('Failed to reconstruct lastFetched cache from previous state:', error);
          }
        }
      }

      usernames.forEach((username) => {
        safeMap.set(username, now);
      });

      return safeMap;
    });
  };
};

/**
 * Checks if cached data for usernames is stale and needs revalidation
 */
export const getStaleUsernames = (
  usernames: string[],
  lastFetchedCache: Map<string, number>,
  maxAgeMs: number = 60 * 60 * 1000
): string[] => {
  const now = Date.now();

  let safeMap: Map<string, number>;
  if (lastFetchedCache instanceof Map) {
    safeMap = lastFetchedCache;
  } else {
    safeMap = new Map();
    if (lastFetchedCache && typeof lastFetchedCache === 'object') {
      try {
        Object.entries(lastFetchedCache).forEach(([key, value]) => {
          if (typeof value === 'number') {
            safeMap.set(key, value);
          }
        });
      } catch (error) {
        console.warn('Failed to reconstruct lastFetched cache:', error);
      }
    }
  }

  return usernames.filter((username) => {
    const lastFetched = safeMap.get(username);
    return !lastFetched || now - lastFetched > maxAgeMs;
  });
};

/**
 * Gets cached avatar URLs for given usernames
 */
export const getCachedAvatarUrls = (
  usernames: string[],
  avatarCache: Map<string, string>
): string[] => {
  let safeAvatarCache: Map<string, string>;

  if (avatarCache instanceof Map) {
    safeAvatarCache = avatarCache;
  } else {
    safeAvatarCache = new Map();
    if (avatarCache && typeof avatarCache === 'object') {
      try {
        Object.entries(avatarCache).forEach(([key, value]) => {
          if (typeof value === 'string') {
            safeAvatarCache.set(key, value);
          }
        });
      } catch (error) {
        console.warn('Failed to reconstruct avatar cache from object:', error);
      }
    }
  }

  return usernames.map((username) => safeAvatarCache.get(username)).filter((url): url is string => !!url);
};

/**
 * Categorizes usernames based on their validation cache status
 */
export const categorizeUsernames = (
  usernames: string[],
  validatedCache: Set<string>,
  invalidCache: Set<string>
) => {
  const safeValidatedCache = validatedCache instanceof Set ? validatedCache : new Set<string>();
  const safeInvalidCache = invalidCache instanceof Set ? invalidCache : new Set<string>();

  const needValidation = usernames.filter(
    (u) => !safeValidatedCache.has(u) && !safeInvalidCache.has(u)
  );
  const alreadyValid = usernames.filter((u) => safeValidatedCache.has(u));
  const alreadyInvalid = usernames.filter(
    (u) => safeInvalidCache.has(u) && !safeValidatedCache.has(u)
  );

  return {
    needValidation,
    alreadyValid,
    alreadyInvalid,
  };
};

/**
 * Checks if username validation is needed for any usernames
 */
export const needsValidation = (
  usernames: string[],
  validatedCache: Set<string>,
  invalidCache: Set<string>
): boolean => {
  const { needValidation: needsVal } = categorizeUsernames(usernames, validatedCache, invalidCache);
  return needsVal.length > 0;
};

/**
 * Gets usernames that are known to be invalid from cache
 */
export const getInvalidUsernames = (usernames: string[], invalidCache: Set<string>): string[] => {
  const safeInvalidCache = invalidCache instanceof Set ? invalidCache : new Set<string>();
  return usernames.filter((u) => safeInvalidCache.has(u));
};
