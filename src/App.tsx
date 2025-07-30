import {
  useState,
  useEffect,  
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { PageLayout, PageHeader, Box, IconButton, Button } from '@primer/react';
import { GearIcon } from '@primer/octicons-react';

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
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;
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

// eslint-disable-next-line react-refresh/only-export-components
export const buttonStyles = {
  height: 28,
  minWidth: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 2,
};

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialLoadingCount, setInitialLoadingCount] = useState(0);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [isDataLoadingComplete, setIsDataLoadingComplete] = useState(false);

  const handleUrlParamsProcessed = useCallback(() => {
    setInitialLoadingCount(1);
  }, []);

  const {
    formSettings,
    setUsername,
    setStartDate,
    setEndDate,
    setGithubToken,
    setApiMode,
    handleUsernameBlur,
    validateUsernameFormat,
    addAvatarsToCache,
    error,
    setError,
    cachedAvatarUrls,
  } = useGitHubFormState(handleUrlParamsProcessed);

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

  const { username, startDate, endDate, githubToken, apiMode } = formSettings;

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

  const avatarUrls = useMemo(() => {
    // Prioritize cached avatar URLs if they exist, otherwise return empty array
    // Only return non-empty arrays to prevent unnecessary re-renders
    if (cachedAvatarUrls && cachedAvatarUrls.length > 0) {
      return cachedAvatarUrls;
    }
    return [];
  }, [cachedAvatarUrls]);

  const handleManualSpin = useCallback(() => {
    setIsManuallySpinning(true);
    setTimeout(() => setIsManuallySpinning(false), 2000);
  }, []);

  useEffect(() => {
    if (initialLoadingCount === 1) {
      const startTime = Date.now();
      const minLoadingTime = 3000; // 3 seconds minimum for better UX
      
      handleSearch().then(() => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        // Instead of automatically switching, mark data loading as complete
        setTimeout(() => {
          setIsDataLoadingComplete(true);
        }, remainingTime);
      });
    }
  }, [initialLoadingCount, handleSearch]);

  const handleStartClick = useCallback(() => {
    setInitialLoadingCount(0);
    setIsDataLoadingComplete(false);
  }, []);

  if (initialLoadingCount === 1) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 3,
        }}
      >
        <SlotMachineLoader
          avatarUrls={avatarUrls}
          isLoading={loading}
          isManuallySpinning={isManuallySpinning}
          size="large"
        />
        <LoadingIndicator
          loadingProgress={loadingProgress}
          isLoading={loading}
          currentUsername={currentUsername}
        />
        {isDataLoadingComplete && !loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              mt: 3,
              animation: 'fadeIn 0.5s ease-in',
              '@keyframes fadeIn': {
                from: { opacity: 0, transform: 'translateY(10px)' },
                to: { opacity: 1, transform: 'translateY(0)' },
              },
            }}
          >
            <Box sx={{ textAlign: 'center', color: 'success.fg' }}>
              <Box sx={{ fontSize: '18px', fontWeight: 'bold', mb: 1 }}>
                ✅ Data loaded successfully!
              </Box>
              <Box sx={{ fontSize: '14px', color: 'fg.muted' }}>
                Your GitHub activity is ready to view
              </Box>
            </Box>
            <Button
              variant="primary"
              size="large"
              onClick={handleStartClick}
              sx={{
                fontSize: '18px',
                fontWeight: 'bold',
                px: 5,
                py: 3,
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 6px 16px rgba(0, 0, 0, 0.2)',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
              }}
            >
              🚀 Start Exploring
            </Button>
          </Box>
        )}
      </Box>
    );
  }

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
              icon={GearIcon}
              aria-label="Settings"
              onClick={() => setIsSettingsOpen(true)}
            />
            <SlotMachineLoader
              avatarUrls={avatarUrls}
              isLoading={loading}
              isManuallySpinning={isManuallySpinning}
              size="small"
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
            addAvatarsToCache,
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
            onClearEvents={clearEvents}
            onClearSearchItems={clearSearchItems}
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
