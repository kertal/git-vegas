import { useMemo, useState, useEffect } from 'react';
import { GitHubEvent, GitHubItem } from '../types';
import { processRawEvents, categorizeRawSearchItems, enrichItemsWithPRDetails } from '../utils/githubData';
import { filterItemsByAdvancedSearch } from '../utils/filtering';

interface UseGitHubDataProcessingProps {
  indexedDBEvents: GitHubEvent[];
  indexedDBSearchItems: GitHubEvent[];
  startDate: string;
  endDate: string;
  apiMode: 'search' | 'events' | 'summary';
  searchText: string;
  githubToken?: string;
}

interface UseGitHubDataProcessingReturn {
  results: GitHubItem[];
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;
  isEnriching: boolean;
}

export const useGitHubDataProcessing = ({
  indexedDBEvents,
  indexedDBSearchItems,
  startDate,
  endDate,
  apiMode,
  searchText,
  githubToken,
}: UseGitHubDataProcessingProps): UseGitHubDataProcessingReturn => {
  const [enrichedResults, setEnrichedResults] = useState<GitHubItem[]>([]);
  const [isEnriching, setIsEnriching] = useState(false);

  // Categorize raw data into processed items based on current API mode and date filters
  const baseResults = useMemo(() => {
    if (apiMode === 'events') {
      // Events view: only processed events
      return processRawEvents(indexedDBEvents, startDate, endDate);
    } else if (apiMode === 'search') {
      // Issues and PRs view: only search items
      return categorizeRawSearchItems(
        indexedDBSearchItems as unknown as GitHubItem[],
        startDate,
        endDate
      );
    } else if (apiMode === 'summary') {
      // Summary view: merge both events AND search items for complete picture
      const processedEvents = processRawEvents(indexedDBEvents, startDate, endDate);
      const processedSearchItems = categorizeRawSearchItems(
        indexedDBSearchItems as unknown as GitHubItem[],
        startDate,
        endDate
      );
      
      // Combine both datasets, removing duplicates based on html_url
      const urlSet = new Set<string>();
      const combinedResults: GitHubItem[] = [];
      
      // Add search items first (they are more complete/accurate)
      processedSearchItems.forEach(item => {
        if (!urlSet.has(item.html_url)) {
          urlSet.add(item.html_url);
          combinedResults.push(item);
        }
      });
      
      // Add events that aren't already covered by search items
      processedEvents.forEach(item => {
        if (!urlSet.has(item.html_url)) {
          urlSet.add(item.html_url);
          combinedResults.push(item);
        }
      });
      
      // Sort by updated_at (newest first)
      return combinedResults.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    } else {
      return [];
    }
  }, [apiMode, indexedDBEvents, indexedDBSearchItems, startDate, endDate]);

  // Enrich items with PR details when a token is available
  useEffect(() => {
    let cancelled = false;

    const enrichItems = async () => {
      // If no token or no items, just use base results
      if (!githubToken || baseResults.length === 0) {
        setEnrichedResults(baseResults);
        return;
      }

      setIsEnriching(true);
      
      try {
        const enriched = await enrichItemsWithPRDetails(
          baseResults,
          githubToken,
          (current, total) => {
            if (!cancelled) {
              console.log(`Enriching PR details: ${current}/${total}`);
            }
          }
        );

        if (!cancelled) {
          setEnrichedResults(enriched);
        }
      } catch (error) {
        console.error('Error enriching items with PR details:', error);
        // Fall back to base results on error
        if (!cancelled) {
          setEnrichedResults(baseResults);
        }
      } finally {
        if (!cancelled) {
          setIsEnriching(false);
        }
      }
    };

    enrichItems();

    return () => {
      cancelled = true;
    };
  }, [baseResults, githubToken]);

  // Use enriched results if available, otherwise use base results
  const results = enrichedResults.length > 0 ? enrichedResults : baseResults;

  // Calculate counts for navigation tabs (with search filtering applied)
  const searchItemsCount = useMemo(() => {
    const rawSearchItems = categorizeRawSearchItems(
      indexedDBSearchItems as unknown as GitHubItem[],
      startDate,
      endDate
    );
    return filterItemsByAdvancedSearch(rawSearchItems, searchText).length;
  }, [indexedDBSearchItems, startDate, endDate, searchText]);

  const eventsCount = useMemo(() => {
    const rawEvents = processRawEvents(indexedDBEvents, startDate, endDate);
    return filterItemsByAdvancedSearch(rawEvents, searchText).length;
  }, [indexedDBEvents, startDate, endDate, searchText]);

  const rawEventsCount = indexedDBEvents.length;

  return {
    results,
    searchItemsCount,
    eventsCount,
    rawEventsCount,
    isEnriching,
  };
}; 