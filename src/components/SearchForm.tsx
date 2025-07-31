import React, { memo, useCallback, useEffect, FormEvent, useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  TextInput,
  Flash,
  UnderlineNav,
} from '@primer/react';
import { useFormContext } from '../App';
import { validateUsernameList, validateGitHubUsernames } from '../utils';

const SearchForm = memo(function SearchForm() {
  const {
    username,
    setUsername,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    apiMode,
    setApiMode,
    handleSearch,
    handleUsernameBlur,
    validateUsernameFormat,
    addAvatarsToCache,
    loading,
    error,
    searchItemsCount,
    rawEventsCount = 0,
    githubToken,
  } = useFormContext();

  // Track if validation is in progress
  const [isValidating, setIsValidating] = useState(false);
  const [pendingSearch, setPendingSearch] = useState(false);

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUsername = e.target.value;
      setUsername(newUsername);
      // Removed localStorage saving - now only saves when validation passes
    },
    [setUsername]
  );

  const handleUsernameBlurEvent = useCallback(
    async (e: React.FocusEvent<HTMLInputElement>) => {
      const username = e.target.value.trim();
      if (!username) {
        handleUsernameBlur();
        return;
      }

      // First validate format
      const validation = validateUsernameList(username);
      if (validation.errors.length > 0) {
        validateUsernameFormat(username); // This will set the error
        handleUsernameBlur();
        return;
      }

      // Then validate with GitHub API
      setIsValidating(true);
      try {
        const result = await validateGitHubUsernames(
          validation.usernames,
          githubToken
        );

        if (result.invalid.length > 0) {
          const invalidUsernames = result.invalid;
          const errorMessages = invalidUsernames.map(username => {
            const errorMsg = result.errors[username] || 'Username validation failed';
            return `${username}: ${errorMsg}`;
          });
          
          // Set API validation error - use a simpler approach
          const errorMessage = `Invalid GitHub username${invalidUsernames.length > 1 ? 's' : ''}:\n${errorMessages.join('\n')}`;
          validateUsernameFormat(errorMessage); // Just pass the error message
        } else {
          // All usernames are valid
          validateUsernameFormat(''); // Clear any errors
          // Save avatars to cache for slot machine display
          if (Object.keys(result.avatarUrls).length > 0) {
            addAvatarsToCache(result.avatarUrls);
          }
          // Save to localStorage only if validation passes
          localStorage.setItem('github-username', username);
        }
      } catch (error) {
        console.warn('GitHub API validation failed:', error);
        // Don't block form submission for network errors - just log them
        validateUsernameFormat(''); // Clear errors for network issues
        // Still save to localStorage for format-valid usernames
        localStorage.setItem('github-username', username);
      } finally {
        setIsValidating(false);
      }

      handleUsernameBlur();
    },
    [validateUsernameFormat, handleUsernameBlur, githubToken]
  );

  // Effect to handle pending search after validation completes
  useEffect(() => {
    if (!isValidating && pendingSearch) {
      setPendingSearch(false);
      handleSearch();
    }
  }, [isValidating, pendingSearch, handleSearch]);

  const handleFormSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      
      // If validation is in progress, queue the search to run after validation completes
      if (isValidating) {
        setPendingSearch(true);
        return;
      }
      
      // Run search immediately if not validating
      handleSearch();
    },
    [handleSearch, isValidating]
  );

  return (
    <Box>
      <Box
        as="form"
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
        }}
        onSubmit={handleFormSubmit}
      >
        {/* Main search fields in a responsive layout */}
        <Box
          sx={{
            display: 'grid',
            gap: 3,
            alignItems: 'flex-start',
            // Desktop: Original horizontal layout
            gridTemplateColumns: 'minmax(300px, 3fr) repeat(2, minmax(150px, 1fr)) auto',
            // Mobile and tablet: Stack vertically
            '@media (max-width: 1023px)': {
              gridTemplateColumns: '1fr',
            },
          }}
        >
          <FormControl required>
            <FormControl.Label>GitHub Username(s)</FormControl.Label>
            <TextInput
              placeholder="Enter usernames (comma-separated for multiple)"
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlurEvent}
              aria-required="true"
              block
            />
          </FormControl>

          <FormControl required>
            <FormControl.Label>Start Date</FormControl.Label>
            <TextInput
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              aria-required="true"
              block
            />
          </FormControl>

          <FormControl required>
            <FormControl.Label>End Date</FormControl.Label>
            <TextInput
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              aria-required="true"
              block
            />
          </FormControl>
          
          <FormControl>
            <FormControl.Label>Action</FormControl.Label>
            <Button
              variant="primary"
              type="submit"
              block
              disabled={loading}
              loading={loading || isValidating}
              sx={{
                minWidth: '160px', // Prevent width jumping
                textAlign: 'center',
              }}
            >
              {pendingSearch && isValidating ? 'Validating & queued' 
               : isValidating ? 'Validating...' 
               : loading ? 'Loading...' 
               : 'Update'}
            </Button>
          </FormControl>
        </Box>
        {/* API Mode Switch */}
        <Box 
          sx={{ 
            mb: 2,
            '@media (max-width: 767px)': {
              overflowX: 'auto',
              overflowY: 'hidden',
              '& nav': {
                whiteSpace: 'nowrap',
              },
            },
          }}
        >
          <UnderlineNav 
            aria-label="GitHub API Mode"
            sx={{
              '@media (max-width: 767px)': {
                minWidth: 'fit-content',
              },
            }}
          >
            <UnderlineNav.Item
              href="#"
              aria-current={apiMode === 'summary' ? 'page' : undefined}
              onSelect={e => {
                e.preventDefault();
                setApiMode('summary');
              }}
            >
              Summary
            </UnderlineNav.Item>
            <UnderlineNav.Item
              href="#"
              aria-current={apiMode === 'search' ? 'page' : undefined}
              counter={searchItemsCount > 0 ? searchItemsCount : undefined}
              onSelect={e => {
                e.preventDefault();
                setApiMode('search');
              }}
            >
              GitHub Issues & PRs
            </UnderlineNav.Item>
            <UnderlineNav.Item
              href="#"
              aria-current={apiMode === 'events' ? 'page' : undefined}
              counter={rawEventsCount > 0 ? rawEventsCount : undefined}
              onSelect={e => {
                e.preventDefault();
                setApiMode('events');
              }}
            >
              GitHub Events
            </UnderlineNav.Item>
          </UnderlineNav>
        </Box>
      </Box>

      {error && (
        <Flash variant="danger" sx={{ marginTop: 3 }}>
          {error}
        </Flash>
      )}
    </Box>
  );
});

export default SearchForm;
