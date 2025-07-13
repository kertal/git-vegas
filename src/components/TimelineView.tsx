import { memo, useMemo, useState } from 'react';
import {
  Text,
  Link,
  Button,
  ButtonGroup,
  Heading,
  ActionMenu,
  ActionList,
  Checkbox,
  Box,
  IconButton,
  Dialog,
  TextInput,
  FormControl,
} from '@primer/react';
import {
  CopyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SearchIcon,
  CheckIcon,
} from '@primer/octicons-react';
import { GitHubItem, GitHubEvent } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ResultsContainer } from './ResultsContainer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';
import { useCopyFeedback } from '../hooks/useCopyFeedback';
import { parseSearchText } from '../utils/resultsUtils';
import { CloneIssueDialog } from './CloneIssueDialog';
import ItemRow from './ItemRow';
import './TimelineView.css';
import { useFormContext } from '../App';



type ViewMode = 'standard' | 'raw';

interface TimelineViewProps {
  items: GitHubItem[];
  rawEvents?: GitHubEvent[];
  viewMode?: ViewMode;
  setViewMode?: (viewMode: ViewMode) => void;
  // Selection functionality
  selectedItems?: Set<string | number>;
  toggleItemSelection?: (id: string | number) => void;
  selectAllItems?: () => void;
  clearSelection?: () => void;
  copyResultsToClipboard?: (format: 'detailed' | 'compact') => void;
  // Search functionality
  searchText?: string;
  setSearchText?: (searchText: string) => void;
  // Clipboard feedback
  isClipboardCopied?: (itemId: string | number) => boolean;
}

const TimelineView = memo(function TimelineView({
  items,
  rawEvents = [],
  viewMode = 'standard',
  setViewMode,
  selectedItems = new Set(),
  toggleItemSelection,
  selectAllItems,
  clearSelection,
  copyResultsToClipboard,
  searchText = '',
  setSearchText,
  isClipboardCopied,
}: TimelineViewProps) {
  // Get GitHub token from form context
  const { githubToken } = useFormContext();
  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    value => setSearchText?.(value),
    300
  );

  // Use copy feedback hook
  const { isCopied } = useCopyFeedback(2000);

  // Memoize search text parsing to avoid repeated regex operations
  const parsedSearchText = useMemo(() => {
    return parseSearchText(searchText || '');
  }, [searchText]);

  // Filter items by search text
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

  // Custom copy handler that supports grouped mode
  const handleCopyResults = async (format: 'detailed' | 'compact') => {
    if (!copyResultsToClipboard) return;

    // Regular copy for non-grouped modes
    copyResultsToClipboard(format);
  };

  // Check if we have no results but should show different messages
  const hasRawEvents = rawEvents && rawEvents.length > 0;
  const hasSearchText = searchText && searchText.trim().length > 0;

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
      {copyResultsToClipboard && (
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
            {(isClipboardCopied?.('compact') || isClipboardCopied?.('detailed')) ? (
              <CheckIcon size={14} />
            ) : (
              <CopyIcon size={14} />
            )} {' '}
            {selectedItems.size > 0 ? selectedItems.size : sortedItems.length}
          </ActionMenu.Button>

          <ActionMenu.Overlay>
            <ActionList>
              <ActionList.Item onSelect={() => handleCopyResults('detailed')}>
                Detailed Format
              </ActionList.Item>
              <ActionList.Item onSelect={() => handleCopyResults('compact')}>
                Compact Format
              </ActionList.Item>
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      )}

    </>
  );

  // Header right content
  const headerRight = (
    <div className="timeline-header-right">
      {setSearchText && (
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
      )}

      {setViewMode && (
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
      )}
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
          <strong>Note:</strong> Timeline includes up to 300 events from the
          past 30 days. Event latency can be 30s to 6h depending on time of day.
        </Text>
      </Box>

      {/* Timeline content */}
      <div className="timeline-content">
        {sortedItems.length === 0 ? (
          // Empty state - keep search box visible
          <div className="timeline-empty">
            <Text color="fg.muted">
              {hasSearchText
                ? `No events found matching "${searchText}". Try a different search term or use label:name / -label:name for label filtering.`
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
            {rawEvents.length > 0 ? (
              rawEvents
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
                showLabels={false}
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
      {selectedItemForDialog && (
        <Dialog
          onClose={() => setSelectedItemForDialog(null)}
          role="dialog"
          title={selectedItemForDialog.title}
          renderFooter={() => (
            <div>
              <IconButton
                icon={ChevronLeftIcon}
                aria-label="Previous item"
                onClick={handlePreviousItem}
                disabled={getCurrentItemIndex() <= 0}
                sx={{
                  color: getCurrentItemIndex() > 0 ? 'fg.default' : 'fg.muted',
                }}
              />
              <IconButton
                icon={ChevronRightIcon}
                aria-label="Next item"
                onClick={handleNextItem}
                disabled={getCurrentItemIndex() >= sortedItems.length - 1}
                sx={{
                  color:
                    getCurrentItemIndex() < sortedItems.length - 1
                      ? 'fg.default'
                      : 'fg.muted',
                }}
              />
            </div>
          )}
        >
          <Box sx={{ p: 3, maxHeight: '40vh', overflow: 'auto' }}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <Link href={href} target="_blank" rel="noopener noreferrer">
                    {children}
                  </Link>
                ),
              }}
            >
              {selectedItemForDialog.body || 'No description available.'}
            </ReactMarkdown>
          </Box>
        </Dialog>
      )}

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

export default TimelineView;
