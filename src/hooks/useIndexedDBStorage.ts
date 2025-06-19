import { useState, useEffect, useCallback } from 'react';
import { eventsStorage, type EventsData } from '../utils/indexedDB';
import { GitHubEvent } from '../types';

interface UseIndexedDBStorageReturn {
  events: GitHubEvent[];
  metadata: EventsData['metadata'] | null;
  isLoading: boolean;
  error: string | null;
  storeEvents: (key: string, events: GitHubEvent[], metadata: EventsData['metadata']) => Promise<void>;
  clearEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

/**
 * Custom hook for managing events storage using IndexedDB with localStorage fallback
 */
export function useIndexedDBStorage(key: string): UseIndexedDBStorageReturn {
  const [events, setEvents] = useState<GitHubEvent[]>([]);
  const [metadata, setMetadata] = useState<EventsData['metadata'] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load events from storage on mount
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await eventsStorage.retrieve(key);
      if (data) {
        setEvents(data.events);
        setMetadata(data.metadata);
      } else {
        setEvents([]);
        setMetadata(null);
      }
    } catch (err) {
      console.error('Failed to load events from storage:', err);
      setError(err instanceof Error ? err.message : 'Failed to load events');
      setEvents([]);
      setMetadata(null);
    } finally {
      setIsLoading(false);
    }
  }, [key]);

  // Store events in storage
  const storeEvents = useCallback(async (
    storageKey: string, 
    newEvents: GitHubEvent[], 
    newMetadata: EventsData['metadata']
  ) => {
    setError(null);

    try {
      await eventsStorage.store(storageKey, newEvents, newMetadata);
      setEvents(newEvents);
      setMetadata(newMetadata);
    } catch (err) {
      console.error('Failed to store events:', err);
      setError(err instanceof Error ? err.message : 'Failed to store events');
    }
  }, []);

  // Clear all events
  const clearEvents = useCallback(async () => {
    setError(null);

    try {
      await eventsStorage.clear();
      setEvents([]);
      setMetadata(null);
    } catch (err) {
      console.error('Failed to clear events:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear events');
    }
  }, []);

  // Refresh events (reload from storage)
  const refreshEvents = useCallback(async () => {
    await loadEvents();
  }, [loadEvents]);

  // Load events on mount and when key changes
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  return {
    events,
    metadata,
    isLoading,
    error,
    storeEvents,
    clearEvents,
    refreshEvents,
  };
} 