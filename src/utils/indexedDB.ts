import { GitHubEvent } from '../types';

/**
 * IndexedDB utilities for storing and retrieving GitHub events data
 * Provides much more storage capacity than localStorage
 */

const DB_NAME = 'GitVegasDB';
const DB_VERSION = 2; // Incremented for PR cache store
const EVENTS_STORE = 'events';
const METADATA_STORE = 'metadata';
const PR_CACHE_STORE = 'prCache';

/**
 * Cache time-to-live in milliseconds (30 minutes)
 */
export const CACHE_TTL_MS = 30 * 60 * 1000;

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

export interface PRCacheRecord {
  id: string; // PR API URL (e.g., https://api.github.com/repos/owner/repo/pulls/123)
  prNumber: number;
  repoFullName: string;
  title: string;
  state: string;
  body: string;
  html_url: string;
  labels: Array<{ name: string; color?: string; description?: string }>;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merged?: boolean;
  cachedAt: number; // Timestamp when this was cached
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;
  private isInitialized = false;

  /**
   * Initialize the IndexedDB database
   */
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

        // Create events store
        if (!db.objectStoreNames.contains(EVENTS_STORE)) {
          const eventsStore = db.createObjectStore(EVENTS_STORE, { keyPath: 'id' });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create metadata store
        if (!db.objectStoreNames.contains(METADATA_STORE)) {
          const metadataStore = db.createObjectStore(METADATA_STORE, { keyPath: 'id' });
          metadataStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Create PR cache store (added in version 2)
        if (!db.objectStoreNames.contains(PR_CACHE_STORE)) {
          const prCacheStore = db.createObjectStore(PR_CACHE_STORE, { keyPath: 'id' });
          prCacheStore.createIndex('cachedAt', 'cachedAt', { unique: false });
          prCacheStore.createIndex('repoFullName', 'repoFullName', { unique: false });
        }
      };
    });
  }

  /**
   * Store events data in IndexedDB
   */
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

  /**
   * Retrieve events data from IndexedDB
   */
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

  /**
   * Store metadata in IndexedDB
   */
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

  /**
   * Retrieve metadata from IndexedDB
   */
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

  /**
   * Clear all data from IndexedDB
   */
  async clearAll(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const stores = [EVENTS_STORE, METADATA_STORE];
      // Add PR_CACHE_STORE if it exists (may not exist if upgrading from older version)
      if (this.db.objectStoreNames.contains(PR_CACHE_STORE)) {
        stores.push(PR_CACHE_STORE);
      }

      const transaction = this.db.transaction(stores, 'readwrite');
      const eventsStore = transaction.objectStore(EVENTS_STORE);
      const metadataStore = transaction.objectStore(METADATA_STORE);

      const eventsRequest = eventsStore.clear();
      const metadataRequest = metadataStore.clear();

      const totalStores = stores.length;
      let completed = 0;
      const checkComplete = () => {
        completed++;
        if (completed === totalStores) resolve();
      };

      eventsRequest.onsuccess = checkComplete;
      metadataRequest.onsuccess = checkComplete;

      eventsRequest.onerror = () => reject(eventsRequest.error);
      metadataRequest.onerror = () => reject(metadataRequest.error);

      // Clear PR cache if store exists
      if (stores.includes(PR_CACHE_STORE)) {
        const prCacheStore = transaction.objectStore(PR_CACHE_STORE);
        const prCacheRequest = prCacheStore.clear();
        prCacheRequest.onsuccess = checkComplete;
        prCacheRequest.onerror = () => reject(prCacheRequest.error);
      }
    });
  }

  /**
   * Store PR details in cache
   */
  async storePRCache(prData: PRCacheRecord): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([PR_CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(PR_CACHE_STORE);

      const request = store.put(prData);

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to store PR cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get PR details from cache
   */
  async getPRCache(apiUrl: string): Promise<PRCacheRecord | null> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([PR_CACHE_STORE], 'readonly');
      const store = transaction.objectStore(PR_CACHE_STORE);
      const request = store.get(apiUrl);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        console.error('Failed to retrieve PR cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get all PR cache records
   */
  async getAllPRCache(): Promise<PRCacheRecord[]> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([PR_CACHE_STORE], 'readonly');
      const store = transaction.objectStore(PR_CACHE_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        console.error('Failed to retrieve all PR cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Clear PR cache
   */
  async clearPRCache(): Promise<void> {
    await this.init();

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([PR_CACHE_STORE], 'readwrite');
      const store = transaction.objectStore(PR_CACHE_STORE);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => {
        console.error('Failed to clear PR cache:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Get storage usage information
   */
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

  /**
   * Check if IndexedDB is supported
   */
  static isSupported(): boolean {
    return typeof indexedDB !== 'undefined';
  }
}

// Export singleton instance
export const indexedDBManager = new IndexedDBManager();

/**
 * Convenience functions for events storage
 */
export const eventsStorage = {
  /**
   * Store events data
   */
  async store(key: string, events: GitHubEvent[], metadata: EventsData['metadata']): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      console.warn('IndexedDB not supported, falling back to localStorage');
      // Fallback to localStorage for older browsers
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
      // Fallback to localStorage
      try {
        localStorage.setItem(key, JSON.stringify({ events, metadata }));
      } catch (localError) {
        console.error('Failed to store in localStorage:', localError);
      }
    }
  },

  /**
   * Retrieve events data
   */
  async retrieve(key: string): Promise<{ events: GitHubEvent[]; metadata: EventsData['metadata'] } | null> {
    if (!IndexedDBManager.isSupported()) {
      console.warn('IndexedDB not supported, trying localStorage');
      // Fallback to localStorage
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
      // Fallback to localStorage
      try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
      } catch (localError) {
        console.error('Failed to retrieve from localStorage:', localError);
        return null;
      }
    }
  },

  /**
   * Clear all events data
   */
  async clear(): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      // Clear localStorage keys that might contain events data
      const keysToRemove = [
        'github-raw-data-storage',
        'github-events-results',
        'github-raw-events-results',
      ];
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }

    try {
      await indexedDBManager.clearAll();
    } catch (error) {
      console.error('Failed to clear IndexedDB:', error);
    }
  },

  /**
   * Get storage information
   */
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

/**
 * Cache utilities for local-first data access
 */
export const cacheUtils = {
  /**
   * Check if cached data is fresh (within TTL)
   */
  isFresh(lastFetch: number, ttlMs: number = CACHE_TTL_MS): boolean {
    const now = Date.now();
    const age = now - lastFetch;
    return age < ttlMs;
  },

  /**
   * Check if cached data matches the current query parameters
   */
  matchesQuery(
    metadata: EventsData['metadata'],
    currentUsernames: string[],
    currentStartDate: string,
    currentEndDate: string
  ): boolean {
    // Check if usernames match (order doesn't matter)
    const cachedUsernames = metadata.usernames.sort();
    const queryUsernames = currentUsernames.sort();
    const usernamesMatch =
      cachedUsernames.length === queryUsernames.length &&
      cachedUsernames.every((username, index) => username === queryUsernames[index]);

    // Check if date range matches
    const datesMatch =
      metadata.startDate === currentStartDate &&
      metadata.endDate === currentEndDate;

    return usernamesMatch && datesMatch;
  },

  /**
   * Check if cached data is both fresh and matches the query
   */
  isValidCache(
    metadata: EventsData['metadata'],
    currentUsernames: string[],
    currentStartDate: string,
    currentEndDate: string,
    ttlMs: number = CACHE_TTL_MS
  ): boolean {
    return (
      this.isFresh(metadata.lastFetch, ttlMs) &&
      this.matchesQuery(metadata, currentUsernames, currentStartDate, currentEndDate)
    );
  },
};

/**
 * Convenience functions for PR cache storage
 */
export const prCacheStorage = {
  /**
   * Store PR details in cache
   */
  async store(prData: PRCacheRecord): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      // Fallback to localStorage with a key based on PR URL
      try {
        const cacheKey = `pr-cache-${prData.id}`;
        localStorage.setItem(cacheKey, JSON.stringify(prData));
      } catch (error) {
        console.error('Failed to store PR cache in localStorage:', error);
      }
      return;
    }

    try {
      await indexedDBManager.storePRCache(prData);
    } catch (error) {
      console.error('Failed to store PR cache in IndexedDB:', error);
    }
  },

  /**
   * Retrieve PR details from cache
   */
  async get(apiUrl: string): Promise<PRCacheRecord | null> {
    if (!IndexedDBManager.isSupported()) {
      try {
        const cacheKey = `pr-cache-${apiUrl}`;
        const data = localStorage.getItem(cacheKey);
        return data ? JSON.parse(data) : null;
      } catch (error) {
        console.error('Failed to retrieve PR cache from localStorage:', error);
        return null;
      }
    }

    try {
      return await indexedDBManager.getPRCache(apiUrl);
    } catch (error) {
      console.error('Failed to retrieve PR cache from IndexedDB:', error);
      return null;
    }
  },

  /**
   * Get all cached PR details
   */
  async getAll(): Promise<PRCacheRecord[]> {
    if (!IndexedDBManager.isSupported()) {
      // In localStorage fallback, we'd need to iterate all keys - not efficient
      return [];
    }

    try {
      return await indexedDBManager.getAllPRCache();
    } catch (error) {
      console.error('Failed to get all PR cache from IndexedDB:', error);
      return [];
    }
  },

  /**
   * Clear all PR cache
   */
  async clear(): Promise<void> {
    if (!IndexedDBManager.isSupported()) {
      // Clear localStorage PR cache entries
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('pr-cache-')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }

    try {
      await indexedDBManager.clearPRCache();
    } catch (error) {
      console.error('Failed to clear PR cache from IndexedDB:', error);
    }
  },
}; 