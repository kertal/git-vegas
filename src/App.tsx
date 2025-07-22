import {
  useState,
  useEffect,  
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { PageLayout, PageHeader, Box, IconButton } from '@primer/react';
import { GearIcon, DatabaseIcon } from '@primer/octicons-react';

import { useGitHubFormState } from './hooks/useGitHubFormState';
import { useGitHubDataFetching } from './hooks/useGitHubDataFetching';
import { useGitHubDataProcessing } from './hooks/useGitHubDataProcessing';
import { useIndexedDBStorage } from './hooks/useIndexedDBStorage';
import { GitHubItem } from './types';

import SearchForm from './components/SearchForm';
import IssuesAndPRsList from './views/IssuesAndPRsList';
import EventView from './views/EventView';
import SummaryView from './views/Summary';
import SettingsDialog from './components/SettingsDialog';
import { StorageManager } from './components/StorageManager';
import { LoadingIndicator } from './components/LoadingIndicator';
import ShareButton from './components/ShareButton';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import { OfflineBanner } from './components/OfflineBanner';
import GitVegasLogo from './assets/GitVegas.svg?react';

// Form context for sharing form state across components
interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events' | 'summary';
  setUsername: (username: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (
    mode: 'search' | 'events' | 'summary'
  ) => void;
  handleSearch: () => void;
  handleUsernameBlur: () => void;
  validateUsernameFormat: (username: string) => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;
}

const FormContext = createContext<FormContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useFormContext() {
  const context = useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a FormContextProvider');
  }
  return context;
}

// Update button styles to be consistent
// eslint-disable-next-line react-refresh/only-export-components
export const buttonStyles = {
  height: 28,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

// Add back the events-grouped logic in the results calculation and render logic. Update the results useMemo to include 'events-grouped' mode and add the SummaryView component usage in the render section.
// Add the main App component
function App() {
  // Additional component state (not persisted)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [initialLoadingCount, setInitialLoadingCount] = useState(0);

  const [isManuallySpinning, setIsManuallySpinning] = useState(false);

  // Callback for URL parameter processing
  const handleUrlParamsProcessed = useCallback(() => {
    setInitialLoadingCount(1);
  }, []);

  // Use the new custom hooks for form state and data fetching
  const {
    formSettings,
    setUsername,
    setStartDate,
    setEndDate,
    setGithubToken,
    setApiMode,
    handleUsernameBlur,
    validateUsernameFormat,
    error,
    setError,
  } = useGitHubFormState(handleUrlParamsProcessed);



  // IndexedDB storage for events and search items
  const {
    events: indexedDBEvents,
    storeEvents,
    clearEvents,
  } = useIndexedDBStorage('github-events-indexeddb');

  const {
    events: indexedDBSearchItems,
    storeEvents: storeSearchItems,
    clearEvents: clearSearchItems,
  } = useIndexedDBStorage('github-search-items-indexeddb');

  // Extract individual values for convenience
  const { username, startDate, endDate, githubToken, apiMode } = formSettings;

  // Use the data processing hook
  const {
    results,
    searchItemsCount,
    eventsCount,
    rawEventsCount,
  } = useGitHubDataProcessing({
    indexedDBEvents,
    indexedDBSearchItems,
    startDate,
    endDate,
    apiMode,
  });



  // Use the data fetching hook
  const {
    loading,
    loadingProgress,
    currentUsername,
    handleSearch,
  } = useGitHubDataFetching({
    username,
    githubToken,
    startDate,
    endDate,
    indexedDBEvents,
    indexedDBSearchItems,
    onError: setError,
    storeEvents,
    clearEvents,
    storeSearchItems,
    clearSearchItems,
  });

  // Clipboard feedback
  // const { isCopied: isClipboardCopied, triggerCopy: triggerClipboardCopy } = useCopyFeedback(2000);

  // Note: Search text is managed by individual view components
  // Each view (Summary, EventView, IssuesAndPRsList) has its own searchText state

  // Memoize avatar URLs extraction to avoid recalculating on every render
  const avatarUrls = useMemo(() => {
    return (Array.isArray(results) ? results : [])
      .map(item => item.user.avatar_url)
      .filter(Boolean);
  }, [results]);

  // Handle manual slot machine spin
  const handleManualSpin = useCallback(() => {
    setIsManuallySpinning(true);
    setTimeout(() => setIsManuallySpinning(false), 2000);
  }, []);

   // Auto-fetch data if no data is available and username is provided
   useEffect(() => {
    if (initialLoadingCount === 1) {
      // Trigger initial fetch
      setInitialLoadingCount(0);
      handleSearch();
    }
  }, [initialLoadingCount, loading, handleSearch]);



  return (
    <PageLayout sx={{ '--spacing': '4 !important' }} containerWidth="full">
      <PageLayout.Header className="border-bottom bgColor-inset">
        <PageHeader role="banner" aria-label="Title" sx={{ p: '2' }}>
          <PageHeader.TitleArea>
            <PageHeader.LeadingVisual>
              <GitVegasLogo width={32} height={32} onClick={handleManualSpin} />
            </PageHeader.LeadingVisual>
            <PageHeader.Title>GitVegas</PageHeader.Title>
          </PageHeader.TitleArea>
          <PageHeader.Actions>
            <LoadingIndicator
              loadingProgress={loadingProgress}
              isLoading={loading}
              currentUsername={currentUsername}
            />
            <ShareButton
              formSettings={formSettings}
              size="medium"
            />
            <IconButton
              icon={DatabaseIcon}
              aria-label="Storage Manager"
              onClick={() => setIsStorageManagerOpen(true)}
            />
            <IconButton
              icon={GearIcon}
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            />
            <SlotMachineLoader
              avatarUrls={avatarUrls}
              isLoading={loading}
              isManuallySpinning={isManuallySpinning}
            />
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>

      <PageLayout.Content sx={{ px: 3, py: 1 }}>
        <FormContext.Provider
          value={{
            username,
            startDate,
            endDate,
            githubToken,
            apiMode,
            setUsername,
            setStartDate,
            setEndDate,
            setGithubToken,
            setApiMode,
            handleSearch,
            handleUsernameBlur,
            validateUsernameFormat,
            loading,
            loadingProgress,
            error,
            searchItemsCount,
            eventsCount,
            rawEventsCount,
          }}
        >
          <SearchForm />
          {apiMode === 'events' ? (
            <EventView items={results} rawEvents={indexedDBEvents} />
          ) : apiMode === 'summary' ? (
            <SummaryView
              items={results}
              rawEvents={indexedDBEvents}
              indexedDBSearchItems={
                indexedDBSearchItems as unknown as GitHubItem[]
              }
            />
          ) : (
            <IssuesAndPRsList results={results} buttonStyles={buttonStyles} />
          )}

          <SettingsDialog
            isOpen={isSettingsOpen}
            onDismiss={() => setIsSettingsOpen(false)}
          />
          <StorageManager
            isOpen={isStorageManagerOpen}
            onClose={() => setIsStorageManagerOpen(false)}
          />
        </FormContext.Provider>
      </PageLayout.Content>

      <PageLayout.Footer padding="condensed">
        <small>
          v0.0.7.7.7, prompted by{' '}
          <a href="https://github.com/kertal">@kertal</a>
        </small>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            py: 1,
            minHeight: '40px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <OfflineBanner />
          </Box>
        </Box>
      </PageLayout.Footer>
    </PageLayout>
  );
}

export default App;
