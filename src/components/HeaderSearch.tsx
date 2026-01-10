import React, { memo, useCallback, useState, useRef } from 'react';
import {
  TextInput,
  Box,
  Text,
  Popover,
  ActionList,
} from '@primer/react';
import { XIcon, SearchIcon } from '@primer/octicons-react';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

interface HeaderSearchProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** Available users for suggestions */
  availableUsers?: string[];
  /** Available labels for suggestions */
  availableLabels?: string[];
  /** Available repos for suggestions */
  availableRepos?: string[];
}

const HeaderSearch = memo(function HeaderSearch({
  searchText,
  onSearchChange,
  placeholder = 'Search',
  availableUsers = [],
  availableLabels = [],
  availableRepos = [],
}: HeaderSearchProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Use debounced search hook
  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    onSearchChange,
    300 // 300ms debounce delay
  );

  // Handle input change (when typing new text)
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  }, [setInputValue]);

  // Clear all search
  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  // Handle focus state
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((event: React.FocusEvent) => {
    // Check if focus is moving to the popover content
    const relatedTarget = event.relatedTarget as HTMLElement;
    if (relatedTarget?.closest('[data-search-popover]')) {
      // Keep popover open, refocus input
      return;
    }
    setIsFocused(false);
  }, []);

  // Add filter text to search input
  const addFilterText = useCallback((filterText: string) => {
    const newValue = inputValue ? `${inputValue} ${filterText}` : filterText;
    setInputValue(newValue);
    // Keep focus on input
    inputRef.current?.focus();
  }, [inputValue, setInputValue]);

  const showSyntaxHelp = isFocused;

  // Get top suggestions (limit to prevent huge lists)
  const topUsers = availableUsers.slice(0, 5);
  const topLabels = availableLabels.slice(0, 8);
  const topRepos = availableRepos.slice(0, 5);

  return (
    <Box
      sx={{
        minWidth: '300px',
        maxWidth: '500px',
        position: 'relative',
        '@media (max-width: 767px)': {
          minWidth: '200px',
          maxWidth: '280px',
        },
      }}
    >
      <TextInput
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        size="small"
        leadingVisual={SearchIcon}
        {...(inputValue && {
          trailingAction: (
            <TextInput.Action
              onClick={handleClearSearch}
              icon={XIcon}
              aria-label="Clear search"
              sx={{ color: 'fg.muted' }}
            />
          ),
        })}
        sx={{
          fontSize: '12px',
          minHeight: '28px',
          '& input': {
            fontSize: '12px',
            minHeight: '26px',
            py: '4px',
          },
        }}
        block={true}
      />
      {showSyntaxHelp && (
        <Popover open={true} caret="top">
          <Popover.Content
            data-search-popover
            sx={{
              p: 2,
              mt: 1,
              fontSize: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              minWidth: '280px',
            }}
          >
            <Text sx={{ fontWeight: 'bold', display: 'block', mb: 1, color: 'fg.default' }}>
              Search syntax:
            </Text>
            <Box as="ul" sx={{ m: 0, pl: 3, mb: 2, color: 'fg.muted' }}>
              <li><code>label:name</code> - include label</li>
              <li><code>-label:name</code> - exclude label</li>
              <li><code>user:name</code> - filter by author</li>
              <li><code>repo:org/repo</code> - filter by repo</li>
              <li><code>-repo:org/repo</code> - exclude repo</li>
              <li><em>free text</em> - search in title/body</li>
            </Box>

            {topUsers.length > 0 && (
              <>
                <Text sx={{ fontWeight: 'bold', display: 'block', mb: 1, mt: 2, color: 'fg.default' }}>
                  Filter by user:
                </Text>
                <ActionList sx={{ py: 0 }}>
                  {topUsers.map(user => (
                    <ActionList.Item
                      key={user}
                      onSelect={() => addFilterText(`user:${user}`)}
                      sx={{ fontSize: '12px', py: 1 }}
                    >
                      user:{user}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </>
            )}

            {topLabels.length > 0 && (
              <>
                <Text sx={{ fontWeight: 'bold', display: 'block', mb: 1, mt: 2, color: 'fg.default' }}>
                  Filter by label:
                </Text>
                <ActionList sx={{ py: 0 }}>
                  {topLabels.map(label => (
                    <ActionList.Item
                      key={label}
                      onSelect={() => addFilterText(`label:${label}`)}
                      sx={{ fontSize: '12px', py: 1 }}
                    >
                      label:{label}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </>
            )}

            {topRepos.length > 0 && (
              <>
                <Text sx={{ fontWeight: 'bold', display: 'block', mb: 1, mt: 2, color: 'fg.default' }}>
                  Filter by repo:
                </Text>
                <ActionList sx={{ py: 0 }}>
                  {topRepos.map(repo => (
                    <ActionList.Item
                      key={repo}
                      onSelect={() => addFilterText(`repo:${repo}`)}
                      sx={{ fontSize: '12px', py: 1 }}
                    >
                      repo:{repo}
                    </ActionList.Item>
                  ))}
                </ActionList>
              </>
            )}
          </Popover.Content>
        </Popover>
      )}
    </Box>
  );
});

export default HeaderSearch;
