import React, { memo, useCallback, FormEvent } from 'react';
import { Box, Button, FormControl, TextInput, Flash, Spinner, Radio, RadioGroup } from '@primer/react';
import { useFormContext } from '../App';
import { debounce } from '../utils';

const SearchForm = memo(function SearchForm() {
  const { 
    username, setUsername, 
    startDate, setStartDate, 
    endDate, setEndDate,
    apiMode, setApiMode,
    handleSearch,
    handleUsernameBlur,
    validateUsernameFormat,
    loading, 
    loadingProgress,
    error 
  } = useFormContext();

  const debouncedSaveToLocalStorage = useCallback(
    debounce((key: string, value: string) => {
      localStorage.setItem(key, value);
    }, 500),
    []
  );

  const handleUsernameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value;
    setUsername(newUsername);
    debouncedSaveToLocalStorage('github-username', newUsername);
    
    // Add real-time format validation with debouncing
    if (newUsername.trim()) {
      const debouncedValidate = debounce(() => validateUsernameFormat(newUsername), 500);
      debouncedValidate();
    }
  }, [debouncedSaveToLocalStorage, setUsername, validateUsernameFormat]);

  return (
    <Box sx={{maxWidth: '1200px', margin: '0 auto'}}>
      <Box as="form" 
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3
        }} 
        onSubmit={(e: FormEvent<HTMLFormElement>) => { 
          e.preventDefault(); 
          handleSearch(); 
        }}
      >
        {/* API Mode Selector */}
        <Box>
          <RadioGroup 
            name="apiMode" 
            onChange={(value) => setApiMode(value as 'search' | 'events')}
          >
            <RadioGroup.Label>API Mode</RadioGroup.Label>
            <FormControl>
              <Radio value="search" checked={apiMode === 'search'} />
              <FormControl.Label>Search API (recommended)</FormControl.Label>
            </FormControl>
            <FormControl>
              <Radio value="events" checked={apiMode === 'events'} />
              <FormControl.Label>Events API (last 90 days only, includes more activity types)</FormControl.Label>
            </FormControl>
          </RadioGroup>
        </Box>

        {/* Main search fields in a horizontal layout */}
        <Box sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(300px, 3fr) repeat(2, minmax(150px, 1fr)) auto',
          gap: 3,
          alignItems: 'flex-start'
        }}>
          <Box>
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
          </Box>
          
          <FormControl required>
            <FormControl.Label>Start Date</FormControl.Label>
            <TextInput
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-required="true"
              block
            />
          </FormControl>
          
          <FormControl required>
            <FormControl.Label>End Date</FormControl.Label>
            <TextInput
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-required="true"
              block
            />
          </FormControl>

          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
              sx={{ 
                minWidth: '120px',
                height: '32px'
              }}
            >
              {loading ? <Spinner size="small" /> : 'Search'}
            </Button>
          </Box>
        </Box>
      </Box>

      {apiMode === 'events' && (
        <Flash variant="warning" sx={{marginTop: 3}}>
          <strong>Events API Limitations:</strong> Only returns data from the last 30 days and may include different activity types than the Search API. Event data can have 30s-6h latency. The Search API is recommended for comprehensive issue/PR searches.
        </Flash>
      )}

      {error && (
        <Flash variant="danger" sx={{marginTop: 3}}>
          {error}
        </Flash>
      )}

      {loading && loadingProgress && (
        <Flash variant="default" sx={{marginTop: 3}}>
          {loadingProgress}
        </Flash>
      )}
    </Box>
  );
});

export default SearchForm; 