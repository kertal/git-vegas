import React, { memo, useCallback, FormEvent } from 'react';
import {
  Box,
  Button,
  FormControl,
  TextInput,
  Flash,
  UnderlineNav,
} from '@primer/react';
import { useFormContext } from '../App';
import { debounce } from '../utils';

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
    loading,
    error,
  } = useFormContext();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveToLocalStorage = useCallback(
    debounce((key: string, value: string) => {
      localStorage.setItem(key, value);
    }, 500),
    []
  );

  const handleUsernameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newUsername = e.target.value;
      setUsername(newUsername);
      debouncedSaveToLocalStorage('github-username', newUsername);

      // Add real-time format validation with debouncing
      if (newUsername.trim()) {
        const debouncedValidate = debounce(
          () => validateUsernameFormat(newUsername),
          500
        );
        debouncedValidate();
      }
    },
    [debouncedSaveToLocalStorage, setUsername, validateUsernameFormat]
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
        onSubmit={(e: FormEvent<HTMLFormElement>) => {
          e.preventDefault();
          handleSearch();
        }}
      >
        {/* Main search fields in a horizontal layout */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns:
              'minmax(300px, 3fr) repeat(2, minmax(150px, 1fr)) auto',
            gap: 3,
            alignItems: 'flex-start',
          }}
        >
          <FormControl required>
            <FormControl.Label>GitHub Username(s)</FormControl.Label>
            <TextInput
              placeholder="Enter usernames (comma-separated for multiple)"
              value={username}
              onChange={handleUsernameChange}
              onBlur={handleUsernameBlur}
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
              loading={loading}
            >
              {loading ? 'Loading...' : 'Fetch All Data'}
            </Button>
          </FormControl>
        </Box>
        {/* API Mode Switch */}
        <Box sx={{ mb: 2 }}>
          <UnderlineNav aria-label="GitHub API Mode">
            <UnderlineNav.Item
              href="#"
              aria-current={apiMode === 'search' ? 'page' : undefined}
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
