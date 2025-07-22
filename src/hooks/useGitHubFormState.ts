import { useCallback, useState } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { FormSettings } from '../types';
import { validateUsernameList } from '../utils';

interface UseGitHubFormStateReturn {
  formSettings: FormSettings;
  setUsername: (username: string) => void;
  setStartDate: (startDate: string) => void;
  setEndDate: (endDate: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (mode: 'search' | 'events' | 'summary') => void;
  handleUsernameBlur: () => void;
  validateUsernameFormat: (username: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
}

export const useGitHubFormState = (): UseGitHubFormStateReturn => {
  // Form settings (persisted in localStorage)
  const [formSettings, setFormSettings] = useLocalStorage<FormSettings>(
    'github-form-settings',
    {
      username: '',
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0], // 30 days ago
      endDate: new Date().toISOString().split('T')[0],
      githubToken: '',
      apiMode: 'summary',
    }
  );

  // Note: UI settings removed as no UI settings are currently needed
  // Format for copying is determined by the copy format button clicked

  const [error, setError] = useState<string | null>(null);

  // Handle form settings changes
  const setUsername = useCallback(
    (username: string) => {
      setFormSettings(prev => ({ ...prev, username }));
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
  const handleUsernameBlur = useCallback(() => {
    if (formSettings.username.trim()) {
      validateUsernameFormat(formSettings.username);
    }
  }, [formSettings.username, validateUsernameFormat]);

  return {
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
  };
}; 