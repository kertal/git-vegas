import { GitHubEvent } from '../types';

/**
 * IndexedDB utilities for storing and retrieving GitHub events data
 * Provides much more storage capacity than localStorage
 */

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
    apiMode: 'search' | 'events';
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