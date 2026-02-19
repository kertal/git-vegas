import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import { validateUsernameList } from '../utils';
import {
  validateGitHubUsernames,
  type BatchValidationResult,
} from '../utils';
import {
  getCachedAvatarUrls,
  createAddAvatarsToCache,
} from '../utils/usernameCache';
import { useLocalStorage } from './useLocalStorage';
import { useFormStore } from '../store/useFormStore';

interface UseGitHubFormStateReturn {
  validateUsernameFormat: (username: string) => void;
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  cachedAvatarUrls: string[];
}

export const useGitHubFormState = (onUrlParamsProcessed?: () => void): UseGitHubFormStateReturn => {
  // Read form values from the zustand store
  const username = useFormStore((s) => s.username);
  const githubToken = useFormStore((s) => s.githubToken);
  const hadUrlParams = useFormStore((s) => s._hadUrlParams);

  // Avatar URL cache (Map persisted in localStorage via enhanced serialization)
  const [avatarCache, setAvatarCache] = useLocalStorage<Map<string, string>>('github-avatar-cache', new Map());

  // Track if avatar fetching is in progress to prevent duplicates
  const fetchingRef = useRef<Set<string>>(new Set());

  // Track whether we already fired onUrlParamsProcessed for this mount
  const urlCallbackFiredRef = useRef(false);

  const [error, setError] = useState<string | null>(null);

  // Create cache update function (memoized)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const addAvatarsToCache = useCallback(createAddAvatarsToCache(setAvatarCache), [setAvatarCache]);

  // Memoize the usernames array
  const usernames = useMemo(() => {
    return username ? username.split(',').map((u) => u.trim()) : [];
  }, [username]);

  // Get cached avatar URLs for current usernames
  const cachedAvatarUrls = useMemo(() => {
    return getCachedAvatarUrls(usernames, avatarCache);
  }, [usernames, avatarCache]);

  // Rehydrate from localStorage and process URL parameters once on mount
  useEffect(() => {
    useFormStore.getState()._initOnMount();
  }, []);

  // Notify App.tsx when URL params were processed (triggers initial data fetch)
  useEffect(() => {
    if (hadUrlParams && !urlCallbackFiredRef.current) {
      urlCallbackFiredRef.current = true;
      onUrlParamsProcessed?.();
    }
  }, [hadUrlParams, onUrlParamsProcessed]);

  // Fetch avatars when URL params provided usernames (shared links)
  useEffect(() => {
    if (!hadUrlParams) return;
    if (!username.trim()) return;

    const fetchAvatarsForUsernames = async () => {
      const validation = validateUsernameList(username);
      if (validation.errors.length > 0) return;

      const usernameList = validation.usernames;
      const fetchKey = `${usernameList.join(',')}-${githubToken}`;

      if (fetchingRef.current.has(fetchKey)) return;

      console.log('Revalidating avatar cache for shared link usernames:', usernameList);
      fetchingRef.current.add(fetchKey);

      try {
        const result: BatchValidationResult = await validateGitHubUsernames(usernameList, githubToken);

        if (result.invalid.length > 0) {
          const errorMessages = result.invalid.map((u) => {
            const msg = result.errors[u] || 'Username validation failed';
            return `${u}: ${msg}`;
          });
          setError(`Invalid GitHub username${result.invalid.length > 1 ? 's' : ''}:\n${errorMessages.join('\n')}`);
        } else {
          setError(null);
        }

        if (Object.keys(result.avatarUrls).length > 0) {
          addAvatarsToCache(result.avatarUrls);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to validate usernames';
        console.warn('Failed to fetch avatar URLs:', err);
        setError(`Username validation error: ${msg}`);
      } finally {
        fetchingRef.current.delete(fetchKey);
      }
    };

    fetchAvatarsForUsernames();
  }, [hadUrlParams, username, githubToken, addAvatarsToCache]);

  // Real-time username format validation
  const validateUsernameFormat = useCallback((usernameString: string) => {
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
  }, []);

  return {
    validateUsernameFormat,
    addAvatarsToCache,
    error,
    setError,
    cachedAvatarUrls,
  };
};
