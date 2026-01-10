import React, { memo, useCallback, useState, useRef } from 'react';
import {
  TextInput,
  Box,
  Text,
  Popover,
  Avatar,
  Token,
  Tooltip,
} from '@primer/react';
import { XIcon, SearchIcon } from '@primer/octicons-react';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

interface UserSuggestion {
  login: string;
  avatar_url: string;
}

interface HeaderSearchProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  /** Available users for suggestions */
  availableUsers?: UserSuggestion[];
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
  const topUsers = availableUsers.slice(0, 8);
  const topLabels = availableLabels.slice(0, 12);
  const topRepos = availableRepos.slice(0, 8);

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
              p: 3,
              mt: 1,
              fontSize: '12px',
              maxHeight: '450px',
              overflowY: 'auto',
              minWidth: '320px',
              boxShadow: 'shadow.large',
            }}
          >
            {/* Search Syntax Section */}
            <Box sx={{ mb: 3 }}>
              <Text
                sx={{
                  fontSize: '11px',
                  fontWeight: 'semibold',
                  color: 'fg.muted',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  display: 'block',
                  mb: 2,
                }}
              >
                Search Syntax
              </Text>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 1,
                  fontSize: '11px',
                  color: 'fg.muted',
                }}
              >
                <Text><code>label:name</code></Text>
                <Text><code>-label:name</code></Text>
                <Text><code>user:name</code></Text>
                <Text><code>repo:org/repo</code></Text>
              </Box>
            </Box>

            {/* Users Section - Avatars */}
            {topUsers.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Text
                  sx={{
                    fontSize: '11px',
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    mb: 2,
                  }}
                >
                  Filter by User
                </Text>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 2,
                  }}
                >
                  {topUsers.map(user => (
                    <Tooltip key={user.login} text={`user:${user.login}`} direction="s">
                      <Box
                        as="button"
                        onClick={() => addFilterText(`user:${user.login}`)}
                        sx={{
                          border: 'none',
                          background: 'none',
                          padding: 0,
                          cursor: 'pointer',
                          borderRadius: '50%',
                          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                          ':hover': {
                            transform: 'scale(1.15)',
                            boxShadow: '0 0 0 2px var(--bgColor-accent-emphasis, #0969da)',
                          },
                          ':focus': {
                            outline: 'none',
                            boxShadow: '0 0 0 2px var(--bgColor-accent-emphasis, #0969da)',
                          },
                        }}
                      >
                        <Avatar src={user.avatar_url} size={32} alt={user.login} />
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}

            {/* Labels Section - Pills */}
            {topLabels.length > 0 && (
              <Box sx={{ mb: 3 }}>
                <Text
                  sx={{
                    fontSize: '11px',
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    mb: 2,
                  }}
                >
                  Filter by Label
                </Text>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  {topLabels.map(label => (
                    <Token
                      key={label}
                      text={label}
                      onClick={() => addFilterText(`label:${label}`)}
                      sx={{
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'transform 0.1s ease',
                        ':hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}

            {/* Repos Section - Pills */}
            {topRepos.length > 0 && (
              <Box>
                <Text
                  sx={{
                    fontSize: '11px',
                    fontWeight: 'semibold',
                    color: 'fg.muted',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    display: 'block',
                    mb: 2,
                  }}
                >
                  Filter by Repository
                </Text>
                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1,
                  }}
                >
                  {topRepos.map(repo => (
                    <Token
                      key={repo}
                      text={repo}
                      onClick={() => addFilterText(`repo:${repo}`)}
                      sx={{
                        cursor: 'pointer',
                        fontSize: '11px',
                        transition: 'transform 0.1s ease',
                        ':hover': {
                          transform: 'scale(1.05)',
                        },
                      }}
                    />
                  ))}
                </Box>
              </Box>
            )}
          </Popover.Content>
        </Popover>
      )}
    </Box>
  );
});

export default HeaderSearch;
