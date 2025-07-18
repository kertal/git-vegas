import { memo, useMemo, useState, useCallback } from 'react';
import {
  Text,
  Button,
  ButtonGroup,
  Heading,
  ActionMenu,
  ActionList,
  Checkbox,
  Box,
  TextInput,
  FormControl,
} from '@primer/react';
import {
  CopyIcon,
  SearchIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ResultsContainer } from '../components/ResultsContainer';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { copyResultsToClipboard as copyToClipboard } from '../utils/clipboard';
import { CloneIssueDialog } from '../components/CloneIssueDialog';
import DescriptionDialog from '../components/DescriptionDialog';
import ItemRow from '../components/ItemRow';
import './EventView.css';
import { useFormContext } from '../App';



type ViewMode = 'standard' | 'raw';

interface EventViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
}

const EventView = memo(function EventView({
  items,
  rawEvents = [],
}: EventViewProps) {
  // Get GitHub token and date range from form context
  const { githubToken, startDate, endDate } = useFormContext();
  
  // Internal state for view mode
  const [viewMode, setViewMode] = useState<ViewMode>('standard');
  
  // Internal state for selection
  const [selectedItems, setSelectedItems] = useState<Set<string | number>>(new Set());
  
  // Internal state for search
  const [searchText, setSearchText] = useState('');
  
  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    setSearchText,
    300
  );

  // Use copy feedback hook
  const { isCopied, triggerCopy } = useCopyFeedback(2000);

  // Internal selection handlers
  const toggleItemSelection = useCallback((id: string | number) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const selectAllItems = useCallback(() => {
    setSelectedItems(new Set(items.map(item => item.event_id || item.id)));
  }, [items]);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);



  // Memoize search text parsing to avoid repeated regex operations
  const parsedSearchText = useMemo(() => {
    return parseSearchText(searchText || '');
  }, [searchText]);

  // Filter raw events by date range and search text
  const filteredRawEvents = useMemo(() => {
    // First filter by date range
    let dateFilteredEvents = rawEvents;
    if (startDate || endDate) {
      const startDateTime = startDate ? new Date(startDate).getTime() : 0;
      const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;
      
      dateFilteredEvents = rawEvents.filter(event => {
        const eventTime = new Date(event.created_at).getTime();
        return eventTime >= startDateTime && eventTime <= endDateTime;
      });
    }

    // Then filter by search text if provided
    if (!searchText || !searchText.trim()) {
      return dateFilteredEvents;
    }

    const { userFilters, cleanText } = parsedSearchText;

    return dateFilteredEvents.filter(event => {
      // Check user filters
      if (userFilters.length > 0) {
        const eventUser = event.actor.login.toLowerCase();
        const matchesUser = userFilters.some(userFilter =>
          eventUser === userFilter.toLowerCase()
        );
        if (!matchesUser) return false;
      }

      // If there's clean text remaining, search in event type, repo name, and actor
      if (cleanText) {
        const searchLower = cleanText.toLowerCase();
        const typeMatch = event.type.toLowerCase().includes(searchLower);
        const repoMatch = event.repo?.name.toLowerCase().includes(searchLower);
        const actorMatch = event.actor.login.toLowerCase().includes(searchLower);
        const payloadMatch = JSON.stringify(event.payload).toLowerCase().includes(searchLower);
        return typeMatch || repoMatch || actorMatch || payloadMatch;
      }

      // If only user filters were used, event passed checks above
      return true;
    });
  }, [rawEvents, searchText, parsedSearchText, startDate, endDate]);

  // Filter items by search text (for standard view)
  const filteredItems = useMemo(() => {
    if (!searchText || !searchText.trim()) {
      return items;
    }

    const { includedLabels, excludedLabels, userFilters, cleanText } = parsedSearchText;

    return items.filter(item => {
      // Check label filters first
      if (includedLabels.length > 0 || excludedLabels.length > 0) {
        const itemLabels = (item.labels || []).map(label =>
          label.name.toLowerCase()
        );

        // Check if item has all required included labels
        if (includedLabels.length > 0) {
          const hasAllIncludedLabels = includedLabels.every(labelName =>
            itemLabels.includes(labelName.toLowerCase())
          );
          if (!hasAllIncludedLabels) return false;
        }

        // Check if item has any excluded labels
        if (excludedLabels.length > 0) {
          const hasExcludedLabel = excludedLabels.some(labelName =>
            itemLabels.includes(labelName.toLowerCase())
          );
          if (hasExcludedLabel) return false;
        }
      }

      // Check user filters
      if (userFilters.length > 0) {
        const itemUser = item.user.login.toLowerCase();
        const matchesUser = userFilters.some(userFilter =>
          itemUser === userFilter.toLowerCase()
        );
        if (!matchesUser) return false;
      }

      // If there's clean text remaining, search in title, body, and username
      if (cleanText) {
        const searchLower = cleanText.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(searchLower);
        const bodyMatch = item.body?.toLowerCase().includes(searchLower);
        const userMatch = item.user.login.toLowerCase().includes(searchLower);
        return titleMatch || bodyMatch || userMatch;
      }

      // If only label/user filters were used, item passed checks above
      return true;
    });
  }, [items, parsedSearchText, searchText]);

  // Sort filtered items by updated date (newest first)
  const sortedItems = [...filteredItems].sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );

  // Internal copy handler
  const copyResultsToClipboard = useCallback(async (format: 'detailed' | 'compact') => {
    if (viewMode === 'raw') {
      // Copy raw events
      const eventsToCopy = filteredRawEvents;
      const eventsText = eventsToCopy.map(event => 
        `${event.type} by ${event.actor.login} in ${event.repo.name} - ${event.created_at}\n${JSON.stringify(event, null, 2)}`
      ).join('\n\n');
      
      try {
        await navigator.clipboard.writeText(eventsText);
        triggerCopy(format);
      } catch (error) {
        console.error('Failed to copy raw events:', error);
      }
    } else {
      // Regular copy for standard view
      const selectedItemsArray =
        selectedItems.size > 0
          ? sortedItems.filter(item =>
              selectedItems.has(item.event_id || item.id)
            )
          : sortedItems;

      await copyToClipboard(selectedItemsArray, {
        isCompactView: format === 'compact',
        onSuccess: () => {
          // Trigger visual feedback via copy feedback system
          triggerCopy(format);
        },
        onError: (error: Error) => {
          console.error('Failed to copy results:', error);
        },
      });
    }
  }, [sortedItems, selectedItems, triggerCopy, viewMode, filteredRawEvents]);

  // Clipboard feedback helper
  const isClipboardCopied = useCallback((itemId: string | number) => {
    return isCopied(itemId);
  }, [isCopied]);

  // Calculate select all checkbox state
  const selectAllState = useMemo(() => {
    if (sortedItems.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = sortedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === sortedItems.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [sortedItems, selectedItems]);

  // Handle select all checkbox click
  const handleSelectAllChange = () => {
    const selectedCount = sortedItems.filter(item =>
      selectedItems.has(item.event_id || item.id)
    ).length;

    if (selectedCount === sortedItems.length) {
      // All are selected, clear selection
      clearSelection?.();
    } else {
      // Some or none are selected, select all
      selectAllItems?.();
    }
  };

  // Description dialog state and handlers
  const [selectedItemForDialog, setSelectedItemForDialog] =
    useState<GitHubItem | null>(null);

  // Clone dialog state
  const [selectedItemForClone, setSelectedItemForClone] =
    useState<GitHubItem | null>(null);

  // Check if we have no results but should show different messages
  const hasRawEvents = rawEvents && rawEvents.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

  // Dialog navigation handlers
  const handlePreviousItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = sortedItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex > 0) {
      setSelectedItemForDialog(sortedItems[currentIndex - 1]);
    }
  };

  const handleNextItem = () => {
    if (!selectedItemForDialog) return;
    const currentIndex = sortedItems.findIndex(
      item => item.id === selectedItemForDialog.id
    );
    if (currentIndex < sortedItems.length - 1) {
      setSelectedItemForDialog(sortedItems[currentIndex + 1]);
    }
  };

  const getCurrentItemIndex = () => {
    if (!selectedItemForDialog) return -1;
    return sortedItems.findIndex(item => item.id === selectedItemForDialog.id);
  };

  // Header left content
  const headerLeft = (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Checkbox
          checked={selectAllState.checked}
          indeterminate={selectAllState.indeterminate}
          onChange={handleSelectAllChange}
          aria-label="Select all events"
          disabled={sortedItems.length === 0}
        />
        <Heading
          as="h2"
          sx={{
            fontSize: 2,
            fontWeight: 'semibold',
            color: 'fg.default',
            m: 0,
          }}
        >
          Events
        </Heading>
      </Box>
      <ActionMenu>
        <ActionMenu.Button
          variant="default"
          size="small"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            fontSize: 0,
            borderColor: 'border.default',
          }}
        >
          {(isClipboardCopied('compact') || isClipboardCopied('detailed')) ? (
            <CheckIcon size={14} />
          ) : (
            <CopyIcon size={14} />
          )} {' '}
          {viewMode === 'raw' 
            ? filteredRawEvents.length 
            : selectedItems.size > 0 ? selectedItems.size : sortedItems.length}
        </ActionMenu.Button>

        <ActionMenu.Overlay>
          <ActionList>
            <ActionList.Item onSelect={() => copyResultsToClipboard('detailed')}>
              Detailed Format
            </ActionList.Item>
            <ActionList.Item onSelect={() => copyResultsToClipboard('compact')}>
              Compact Format
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>

    </>
  );

  // Header right content
  const headerRight = (
    <div className="timeline-header-right">
      <FormControl>
        <FormControl.Label visuallyHidden>Search events</FormControl.Label>
        <TextInput
          placeholder="Search events..."
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          leadingVisual={SearchIcon}
          size="small"
          sx={{ minWidth: '300px' }}
        />
      </FormControl>

      <div className="timeline-view-controls">
        <Text className="timeline-view-label">View:</Text>
        <ButtonGroup>
          <Button
            size="small"
            variant={viewMode === 'standard' ? 'primary' : 'default'}
            onClick={() => setViewMode('standard')}
          >
            Single
          </Button>

          <Button
            size="small"
            variant={viewMode === 'raw' ? 'primary' : 'default'}
            onClick={() => setViewMode('raw')}
          >
            Raw
          </Button>
        </ButtonGroup>
      </div>
    </div>
  );

  return (
    <ResultsContainer
      headerLeft={headerLeft}
      headerRight={headerRight}
      className="timeline-view"
    >
      {/* API Limitation Note */}
      <Box sx={{ p: 2,  bg: 'attention.subtle'}}>
        <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
          <strong>Note:</strong> {viewMode === 'raw' 
            ? 'Raw view shows all events in the selected time range. Standard view shows issues, PRs, comments, push events, and review events.'
            : 'Timeline includes up to 300 events from the past 30 days. Event latency can be 30s to 6h depending on time of day.'}
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {(viewMode === 'raw' ? filteredRawEvents.length === 0 : sortedItems.length === 0) ? (
          // Empty state - keep search box visible
          <div className="timeline-empty">
            <Text color="fg.muted">
              {hasSearchText
                ? `No events found matching "${searchText}". Try a different search term or use user:username for user filtering.`
                : !hasRawEvents
                  ? 'No cached events found. Please perform a search in events mode to load events.'
                  : 'No events found for the selected time period. Try adjusting your date range or filters.'}
            </Text>
            {hasSearchText && (
              <Box
                sx={{
                  mt: 2,
                  textAlign: 'center',
                  display: 'flex',
                  justifyContent: 'center',
                }}
              >
                <Button variant="default" size="small" onClick={clearSearch}>
                  Clear search
                </Button>
              </Box>
            )}
          </div>
        ) : viewMode === 'raw' ? (
          // Raw JSON view - show actual GitHub API events
          <div className="timeline-raw-container">
            {filteredRawEvents.length > 0 ? (
              filteredRawEvents
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((event, index) => (
                  <div
                    key={`${event.id}-${index}`}
                    className="timeline-raw-event"
                  >
                    <div className="timeline-raw-event-header">
                      <div className="timeline-raw-event-header-left">
                        <Text className="timeline-raw-event-type">
                          {event.type}
                        </Text>
                        <Text className="timeline-raw-event-meta">
                          by {event.actor.login} in {event.repo.name}
                        </Text>
                      </div>
                      <Text className="timeline-raw-event-time">
                        {formatDistanceToNow(new Date(event.created_at), {
                          addSuffix: true,
                        })}
                      </Text>
                    </div>
                    <div className="timeline-raw-event-content">
                      <pre
                        style={{
                          margin: 0,
                          whiteSpace: 'pre-wrap',
                          wordBreak: 'break-word',
                        }}
                      >
                        {JSON.stringify(event, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))
            ) : (
              <div className="timeline-raw-empty">
                <Text color="fg.muted">
                  No raw events available. Raw events are only available after
                  performing a new search in events mode.
                </Text>
              </div>
            )}
          </div>
        ) : (
          // Standard timeline view
          <>
            {sortedItems.map((item, index) => (
              <ItemRow
                key={`${item.id}-${index}`}
                item={item}
                githubToken={githubToken}
                isCopied={isCopied}
                onShowDescription={setSelectedItemForDialog}
                onCloneItem={setSelectedItemForClone}
                selected={selectedItems.has(item.event_id || item.id)}
                onSelect={toggleItemSelection}
                showCheckbox={!!toggleItemSelection}
                showRepo={true}
                showUser={true}
                showTime={true}
                size="small"
              />
            ))}
          </>
        )}
      </div>

      {/* Description Dialog */}
      <DescriptionDialog
        item={selectedItemForDialog}
        onClose={() => setSelectedItemForDialog(null)}
        onPrevious={handlePreviousItem}
        onNext={handleNextItem}
        hasPrevious={getCurrentItemIndex() > 0}
        hasNext={getCurrentItemIndex() < sortedItems.length - 1}
      />

      {/* Clone Issue Dialog */}
      <CloneIssueDialog
        isOpen={selectedItemForClone !== null}
        onClose={() => setSelectedItemForClone(null)}
        originalIssue={selectedItemForClone}
        onSuccess={(newIssue) => {
          console.log('Issue cloned successfully:', newIssue);
          // Optionally refresh data or show success message
        }}
      />
    </ResultsContainer>
  );
});

export default EventView; 