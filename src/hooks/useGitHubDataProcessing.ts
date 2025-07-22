import { useMemo } from 'react';
import { GitHubEvent, GitHubItem } from '../types';
import { categorizeRawEvents, categorizeRawSearchItems } from '../utils/rawDataUtils';

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
  groupedEventsCount: number;
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
      return categorizeRawEvents(indexedDBEvents, startDate, endDate);
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
    return categorizeRawEvents(indexedDBEvents, startDate, endDate).length;
  }, [indexedDBEvents, startDate, endDate]);

  // Calculate grouped events count (number of unique URLs after grouping)
  const groupedEventsCount = useMemo(() => {
    if (apiMode !== 'summary') return 0;

    const categorizedEvents = categorizeRawEvents(
      indexedDBEvents,
      startDate,
      endDate
    );

    // Group by URL to count unique items
    const urlGroups: { [url: string]: GitHubItem[] } = {};

    categorizedEvents.forEach(item => {
      let groupingUrl = item.html_url;
      // For comments, extract the issue/PR URL from the comment URL
      if (item.title.startsWith('Comment on:')) {
        groupingUrl = groupingUrl.split('#')[0];
      }

      if (!urlGroups[groupingUrl]) {
        urlGroups[groupingUrl] = [];
      }
      urlGroups[groupingUrl].push(item);
    });

    return Object.keys(urlGroups).length;
  }, [indexedDBEvents, startDate, endDate, apiMode]);

  const rawEventsCount = indexedDBEvents.length;

  return {
    results,
    searchItemsCount,
    eventsCount,
    groupedEventsCount,
    rawEventsCount,
  };
}; 