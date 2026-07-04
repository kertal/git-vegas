import { useState, useEffect, useCallback } from 'react';
import { eventsStorage, type EventsMetadata } from '../utils/indexedDB';
import { GitHubEvent } from '../types';

interface UseIndexedDBStorageReturn<T> {
  events: T[];
  metadata: EventsMetadata | null;
  isLoading: boolean;
  error: string | null;
  storeEvents: (key: string, events: T[], metadata: EventsMetadata) => Promise<void>;
  clearEvents: () => Promise<void>;
  refreshEvents: () => Promise<void>;
}

/**
 * Custom hook for managing item storage using IndexedDB with localStorage
 * fallback. Generic over the stored item type (`GitHubEvent` by default, or
 * `GitHubItem` for the Search API store).
 */
export function useIndexedDBStorage<T = GitHubEvent>(key: string): UseIndexedDBStorageReturn<T> {
  const [events, setEvents] = useState<T[]>([]);
  const [metadata, setMetadata] = useState<EventsMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load events from storage on mount
  const loadEvents = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await eventsStorage.retrieve<T>(key);
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
    newEvents: T[],
    newMetadata: EventsMetadata
  ) => {
    setError(null);

    try {
      await eventsStorage.store<T>(storageKey, newEvents, newMetadata);
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
