import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
} from 'react';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PageLayout, PageHeader, Box, IconButton, Button } from '@primer/react';
import { GearIcon } from '@primer/octicons-react';

import { useGitHubFormState } from './hooks/useGitHubFormState';
import { useGitHubDataFetching } from './hooks/useGitHubDataFetching';
import { useGitHubDataProcessing } from './hooks/useGitHubDataProcessing';
import { useIndexedDBStorage } from './hooks/useIndexedDBStorage';
import { GitHubItem } from './types';
import { isTestEnvironment } from './utils/environment';

import SearchForm from './components/SearchForm';
import IssuesAndPRsList from './views/IssuesAndPRsList';
import EventView from './views/EventView';
import SummaryView from './views/Summary';
import SettingsDialog from './components/SettingsDialog';
import HeaderSearch from './components/HeaderSearch';

import { LoadingIndicator } from './components/LoadingIndicator';
import ShareButton from './components/ShareButton';
import { SlotMachineLoader } from './components/SlotMachineLoader';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAUpdateNotification } from './components/PWAUpdateNotification';
import GitVegasLogo from './assets/GitVegas.svg?react';

// Form context for sharing form state across components
interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events' | 'summary';
  searchText: string;
  setUsername: (username: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (mode: 'search' | 'events' | 'summary') => void;
  setSearchText: (searchText: string) => void;
  handleSearch: () => void;
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

// Pure comparator for case-insensitive string sorting (outside component to avoid re-creation)
const caseInsensitiveCompare = (a: string, b: string): number =>
  a.toLowerCase().localeCompare(b.toLowerCase());

function App() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [initialLoadingCount, setInitialLoadingCount] = useState(0);
  const [isManuallySpinning, setIsManuallySpinning] = useState(false);
  const [isDataLoadingComplete, setIsDataLoadingComplete] = useState(false);
  const [searchText, setSearchText] = useLocalStorage('header-search-text', '');

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
  } = useIndexedDBStorage<GitHubItem>('github-search-items-indexeddb');

  const {
    events: indexedDBReviewItems,
    storeEvents: storeReviewItems,
    clearEvents: clearReviewItems,
  } = useIndexedDBStorage<GitHubItem>('github-review-items-indexeddb');

  const { username, startDate, endDate, githubToken, apiMode } = formSettings;

  const {
    results,
    searchItemsCount,
    eventsCount,
    rawEventsCount,
    isEnriching,
    reviewItems,
  } = useGitHubDataProcessing({
    indexedDBEvents,
    indexedDBSearchItems,
    indexedDBReviewItems,
    startDate,
    endDate,
    apiMode,
    searchText,
    githubToken,
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
    indexedDBReviewItems,
    onError: setError,
    storeEvents,
    clearEvents,
    storeSearchItems,
    clearSearchItems,
    storeReviewItems,
    clearReviewItems,
  });

  // Extract unique users from results for search suggestions (with avatars)
  const availableUsers = useMemo(() => {
    const seen = new Set<string>();
    return results
      .filter(item => {
        if (!item.user?.login || seen.has(item.user.login)) return false;
        seen.add(item.user.login);
        return true;
      })
      .map(item => ({
        login: item.user.login,
        avatar_url: item.user.avatar_url || '',
      }))
      .sort((a, b) => caseInsensitiveCompare(a.login, b.login));
  }, [results]);

  // Extract labels from results sorted by frequency (most used first)
  const availableLabels = useMemo(() => {
    const labelCounts = results
      .flatMap(item => item.labels?.map(label => label.name) ?? [])
      .reduce((acc, label) => {
        acc.set(label, (acc.get(label) || 0) + 1);
        return acc;
      }, new Map<string, number>());

    return Array.from(labelCounts.entries())
      .sort((a, b) => b[1] - a[1] || caseInsensitiveCompare(a[0], b[0]))
      .map(([label]) => label);
  }, [results]);

  // Extract unique repos from results for search suggestions
  const availableRepos = useMemo(() =>
    [...new Set(
      results
        .map(item => item.repository_url?.replace('https://api.github.com/repos/', ''))
        .filter((repo): repo is string => Boolean(repo))
    )].sort(caseInsensitiveCompare),
    [results]
  );

  const handleManualSpin = useCallback(() => {
    setIsManuallySpinning(true);
    setTimeout(() => setIsManuallySpinning(false), 2000);
  }, []);

  useEffect(() => {
    if (initialLoadingCount === 1) {
      if (isTestEnvironment()) {
        setInitialLoadingCount(0);
        setIsDataLoadingComplete(false);
        return;
      }

      const startTime = Date.now();
      const minLoadingTime = 3000;

      handleSearch().then(() => {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
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
          px: 3,
          '@media (max-width: 767px)': {
            px: 2,
            gap: 2,
          },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            mb: 4,
          }}
        >
          <Box sx={{ fontSize: [30, 100], fontWeight: 'bold', color: 'fg.default', mb: 4 }}>
            GitVegas
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 4 }}>
            <SlotMachineLoader
              avatarUrls={cachedAvatarUrls}
              isLoading={loading}
              isManuallySpinning={isManuallySpinning}
              size="huge"
            />
          </Box>

          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: isDataLoadingComplete && !loading ? 'pointer' : 'not-allowed',
              transition: 'transform 0.2s ease',
              opacity: isDataLoadingComplete && !loading ? 1 : 0.5,
              mb: 4,
              '&:hover': {
                transform: isDataLoadingComplete && !loading ? 'scale(1.05)' : 'none',
              },
              '&:hover .slot-machine': {
                animation: isDataLoadingComplete && !loading ? 'spin 0.5s ease-in-out' : 'none',
              },
            }}
            onMouseEnter={isDataLoadingComplete && !loading ? handleManualSpin : undefined}
          >
            <Button
              size="medium"
              disabled={!isDataLoadingComplete || loading}
              onClick={handleStartClick}
              sx={{
                fontSize: '16px',
                fontWeight: 'bold',
                px: 4,
                py: 2,
                borderRadius: '8px',
                backgroundColor: isDataLoadingComplete && !loading ? 'white' : '#f0f0f0',
                color: isDataLoadingComplete && !loading ? 'black' : '#666',
                border: `2px solid ${isDataLoadingComplete && !loading ? 'black' : '#ccc'}`,
                transition: 'all 0.2s ease',
                minHeight: '48px',
                cursor: isDataLoadingComplete && !loading ? 'pointer' : 'not-allowed',
                '&:hover': {
                  transform: isDataLoadingComplete && !loading ? 'translateY(-1px)' : 'none',
                  boxShadow: isDataLoadingComplete && !loading ? '0 2px 8px rgba(0, 0, 0, 0.15)' : 'none',
                },
                '&:active': {
                  transform: 'translateY(0)',
                },
                '@media (max-width: 767px)': {
                  fontSize: '14px',
                  px: 3,
                  py: 2,
                  minHeight: '44px',
                  minWidth: '140px',
                },
              }}
            >
              🕹️ {isDataLoadingComplete && !loading ? 'Start' : 'Loading...'}
            </Button>
          </Box>

          <Box sx={{
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
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
                  gap: 2,
                  mt: 2,
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
              </Box>
            )}
          </Box>
        </Box>
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
              loadingProgress={isEnriching ? 'Enriching PR details...' : loadingProgress}
              isLoading={loading || isEnriching}
              currentUsername={currentUsername}
            />

            <HeaderSearch
              searchText={searchText}
              onSearchChange={setSearchText}
              availableUsers={availableUsers}
              availableLabels={availableLabels}
              availableRepos={availableRepos}
            />

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '@media (max-width: 767px)': {
                  '& > :first-child': { display: 'none' },
                },
              }}
            >
              <ShareButton formSettings={formSettings} size="medium" />
              <IconButton
                icon={GearIcon}
                aria-label="Settings"
                onClick={() => setIsSettingsOpen(true)}
              />
            </Box>

            <Box
              sx={{
                '@media (max-width: 767px)': {
                  '& .slot-machine': { transform: 'scale(0.8)' },
                },
              }}
            >
              <SlotMachineLoader
                avatarUrls={cachedAvatarUrls}
                isLoading={loading}
                isManuallySpinning={isManuallySpinning}
                size="small"
              />
            </Box>
          </PageHeader.Actions>
        </PageHeader>
      </PageLayout.Header>

      <PageLayout.Content
        sx={{
          px: 3,
          py: 1,
          '@media (max-width: 767px)': { px: 2 },
        }}
      >
        <FormContext.Provider
          value={{
            username,
            startDate,
            endDate,
            githubToken,
            apiMode,
            searchText,
            setUsername,
            setStartDate,
            setEndDate,
            setGithubToken,
            setApiMode,
            setSearchText,
            handleSearch,
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
              indexedDBSearchItems={indexedDBSearchItems}
              reviewedPRs={reviewItems}
            />
          ) : (
            <IssuesAndPRsList results={results} />
          )}

          <SettingsDialog
            isOpen={isSettingsOpen}
            onDismiss={() => setIsSettingsOpen(false)}
            onClearEvents={clearEvents}
            onClearSearchItems={clearSearchItems}
            onClearReviewItems={clearReviewItems}
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

      <PWAUpdateNotification />
    </PageLayout>
  );
}

export default App;
