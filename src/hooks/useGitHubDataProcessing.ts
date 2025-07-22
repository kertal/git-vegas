import { useMemo } from 'react';
import { GitHubEvent, GitHubItem } from '../types';
import { processRawEvents, categorizeRawSearchItems } from '../utils/rawDataUtils';

interface UseGitHubDataProcessingProps {
  indexedDBEvents: GitHubEvent[];
  indexedDBSearchItems: GitHubEvent[];
  startDate: string;
  endDate: string;
  apiMode: 'search' | 'events' | 'summary';
}

interface UseGitHubDataProcessingReturn {
  results: GitHubItem[];
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;
}

export const useGitHubDataProcessing = ({
  indexedDBEvents,
  indexedDBSearchItems,
  startDate,
  endDate,
  apiMode,
}: UseGitHubDataProcessingProps): UseGitHubDataProcessingReturn => {
  // Categorize raw data into processed items based on current API mode and date filters
  const results = useMemo(() => {
    if (apiMode === 'events' || apiMode === 'summary') {
      return processRawEvents(indexedDBEvents, startDate, endDate);
    } else if (apiMode === 'search') {
      // Cast indexedDBSearchItems to GitHubItem[] since the hook returns GitHubEvent[]
      return categorizeRawSearchItems(
        indexedDBSearchItems as unknown as GitHubItem[],
        startDate,
        endDate
      );
    } else {
      return [];
    }
  }, [apiMode, indexedDBEvents, indexedDBSearchItems, startDate, endDate]);

  // Calculate counts for navigation tabs
  const searchItemsCount = useMemo(() => {
    return categorizeRawSearchItems(
      indexedDBSearchItems as unknown as GitHubItem[],
      startDate,
      endDate
    ).length;
  }, [indexedDBSearchItems, startDate, endDate]);

  const eventsCount = useMemo(() => {
    return processRawEvents(indexedDBEvents, startDate, endDate).length;
  }, [indexedDBEvents, startDate, endDate]);

  // Calculate grouped events count (number of unique URLs after grouping)
  // (Removed groupedEventsCount)

  const rawEventsCount = indexedDBEvents.length;

  return {
    results,
    searchItemsCount,
    eventsCount,
    rawEventsCount,
  };
}; 