import { useCallback, useState, useEffect } from 'react';
import { validateUsernameList } from '../utils';
import { useFormSettings } from './useLocalStorage';
import { FormSettings } from '../types';
import { 
  validateGitHubUsernames,
  type BatchValidationResult 
} from '../utils';
import { 
  getCachedAvatarUrls,
  createAddAvatarsToCache
} from '../utils/usernameCache';
import { useLocalStorage } from './useLocalStorage';

interface UseGitHubFormStateReturn {
  formSettings: FormSettings;
  setFormSettings: React.Dispatch<React.SetStateAction<FormSettings>>;
  setUsername: (username: string) => void;
  setStartDate: (startDate: string) => void;
  setEndDate: (endDate: string) => void;
  setGithubToken: (githubToken: string) => void;
  setApiMode: (apiMode: 'search' | 'events' | 'summary') => void;
  handleUsernameBlur: () => Promise<void>;
  validateUsernameFormat: (username: string) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  cachedAvatarUrls: string[];
}

export const useGitHubFormState = (onUrlParamsProcessed?: () => void): UseGitHubFormStateReturn => {
  // Avatar URL cache
  const [avatarCache, setAvatarCache] = useLocalStorage<Map<string, string>>('github-avatar-cache', new Map());
  
  // Track if usernames came from URL params for revalidation
  const [fromUrlParams, setFromUrlParams] = useState(false);
  
  // Form settings (persisted in localStorage with URL parameter processing)
  const [formSettings, setFormSettings] = useFormSettings(
    'github-form-settings',
    {
      username: '',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0],
      githubToken: '',
      apiMode: 'summary',
    },
    () => {
      setFromUrlParams(true);
      onUrlParamsProcessed?.();
    }
  );

  // Note: UI settings removed as no UI settings are currently needed
  // Format for copying is determined by the copy format button clicked

  const [error, setError] = useState<string | null>(null);

  // Create cache update function
  const addAvatarsToCache = createAddAvatarsToCache(setAvatarCache);

  // Get cached avatar URLs for current usernames
  const cachedAvatarUrls = getCachedAvatarUrls(
    formSettings.username ? formSettings.username.split(',').map(u => u.trim()) : [],
    avatarCache
  );

  // Fetch avatars immediately when usernames change (e.g., from URL params)
  useEffect(() => {
    const fetchAvatarsForUsernames = async () => {
      if (!formSettings.username.trim()) return;

      const validation = validateUsernameList(formSettings.username);
      if (validation.errors.length > 0) return;

      const usernames = validation.usernames;
      
      // Determine which usernames need fetching
      let needAvatarFetch: string[];
      
      if (fromUrlParams) {
        // For URL params (shared links), revalidate all usernames for fresh data
        needAvatarFetch = usernames;
        console.log('Revalidating avatar cache for shared link usernames:', needAvatarFetch);
      } else {
        // For manual entry, only fetch uncached usernames
        needAvatarFetch = usernames.filter(username => !avatarCache.has(username));
      }
      
      if (needAvatarFetch.length === 0) return;

      try {
        const result: BatchValidationResult = await validateGitHubUsernames(
          needAvatarFetch,
          formSettings.githubToken
        );

        // Cache avatar URLs for successful validations
        if (Object.keys(result.avatarUrls).length > 0) {
          addAvatarsToCache(result.avatarUrls);
        }
        
        // Reset URL params flag after first fetch
        if (fromUrlParams) {
          setFromUrlParams(false);
        }
      } catch (error) {
        console.warn('Failed to fetch avatar URLs:', error);
        // Reset URL params flag even on error
        if (fromUrlParams) {
          setFromUrlParams(false);
        }
      }
    };

    fetchAvatarsForUsernames();
  }, [formSettings.username, formSettings.githubToken, avatarCache, addAvatarsToCache, fromUrlParams]);

  // Handle form settings changes
  const setUsername = useCallback(
    (username: string) => {
      setFormSettings(prev => ({ ...prev, username }));
      // Manual username changes should not trigger revalidation
      setFromUrlParams(false);
    },
    [setFormSettings]
  );

  const setStartDate = useCallback(
    (startDate: string) => {
      setFormSettings(prev => ({ ...prev, startDate }));
    },
    [setFormSettings]
  );

  const setEndDate = useCallback(
    (endDate: string) => {
      setFormSettings(prev => ({ ...prev, endDate }));
    },
    [setFormSettings]
  );

  const setGithubToken = useCallback(
    (token: string) => {
      setFormSettings(prev => ({ ...prev, githubToken: token }));
    },
    [setFormSettings]
  );

  const setApiMode = useCallback(
    (apiMode: 'search' | 'events' | 'summary') => {
      setFormSettings(prev => ({ ...prev, apiMode }));
    },
    [setFormSettings]
  );

  // Real-time username format validation
  const validateUsernameFormat = useCallback(
    (usernameString: string) => {
      if (!usernameString.trim()) {
        setError(null);
        return;
      }

      const validation = validateUsernameList(usernameString);

      if (validation.errors.length === 0) {
        setError(null);
      } else {
        setError(validation.errors.join('\n'));
      }
    },
    []
  );

  // Handle username blur event
  const handleUsernameBlur = useCallback(async () => {
    // This can be used for additional validation if needed
    // Currently, immediate validation is handled in the useEffect above
  }, []);

  return {
    formSettings,
    setFormSettings,
    setUsername,
    setStartDate,
    setEndDate,
    setGithubToken,
    setApiMode,
    handleUsernameBlur,
    validateUsernameFormat,
    error,
    setError,
    cachedAvatarUrls,
  };
}; 