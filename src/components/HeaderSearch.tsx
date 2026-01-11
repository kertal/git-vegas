import React, { memo, useCallback, useState, useRef, useMemo } from 'react';
import {
  TextInput,
  Box,
  Text,
  Popover,
  Avatar,
  Tooltip,
  type SxProp,
} from '@primer/react';
import { XIcon, SearchIcon } from '@primer/octicons-react';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

// Constants with semantic meaning
const MAX_USER_SUGGESTIONS = 8;
const MAX_LABEL_SUGGESTIONS = 12;
const MAX_REPO_SUGGESTIONS = 8;

// Shared styles extracted for reuse (DRY principle)
const sectionHeaderStyles: SxProp['sx'] = {
  fontSize: '11px',
  fontWeight: 'semibold',
  color: 'fg.muted',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  display: 'block',
  mb: 2,
};

const avatarButtonStyles: SxProp['sx'] = {
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
};

const tokenStyles: SxProp['sx'] = {
  cursor: 'pointer',
  fontSize: '11px',
  transition: 'transform 0.1s ease',
  ':hover': {
    transform: 'scale(1.05)',
  },
};

// Pure component for section headers
const SectionHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Text sx={sectionHeaderStyles}>{children}</Text>
);

export interface UserSuggestion {
  login: string;
  avatar_url: string;
}

interface HeaderSearchProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  availableUsers?: UserSuggestion[];
  availableLabels?: string[];
  availableRepos?: string[];
}

// Pure function for building filter text
const buildFilterText = (current: string, addition: string): string =>
  current ? `${current} ${addition}` : addition;

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

  const { inputValue, setInputValue, clearSearch } = useDebouncedSearch(
    searchText,
    onSearchChange,
    300
  );

  // Memoized sliced suggestions to avoid recalculation on each render
  const topUsers = useMemo(
    () => availableUsers.slice(0, MAX_USER_SUGGESTIONS),
    [availableUsers]
  );
  const topLabels = useMemo(
    () => availableLabels.slice(0, MAX_LABEL_SUGGESTIONS),
    [availableLabels]
  );
  const topRepos = useMemo(
    () => availableRepos.slice(0, MAX_REPO_SUGGESTIONS),
    [availableRepos]
  );

  const handleInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setInputValue(event.target.value);
    },
    [setInputValue]
  );

  const handleClearSearch = useCallback(() => {
    clearSearch();
  }, [clearSearch]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback((event: React.FocusEvent) => {
    const relatedTarget = event.relatedTarget;
    // Type-safe check instead of unsafe type assertion
    if (relatedTarget instanceof HTMLElement && relatedTarget.closest('[data-search-popover]')) {
      return;
    }
    setIsFocused(false);
  }, []);

  const addFilterText = useCallback(
    (filterText: string) => {
      const newValue = buildFilterText(inputValue, filterText);
      setInputValue(newValue);
      // Close popover after selection
      setIsFocused(false);
    },
    [inputValue, setInputValue]
  );

  // Factory functions for mousedown handlers (mousedown fires before blur)
  const createUserMouseDownHandler = useCallback(
    (login: string) => (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent blur
      addFilterText(`user:${login}`);
    },
    [addFilterText]
  );

  const createLabelMouseDownHandler = useCallback(
    (label: string) => (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent blur
      addFilterText(`label:${label}`);
    },
    [addFilterText]
  );

  const createRepoMouseDownHandler = useCallback(
    (repo: string) => (e: React.MouseEvent) => {
      e.preventDefault(); // Prevent blur
      addFilterText(`repo:${repo}`);
    },
    [addFilterText]
  );

  // Semantic boolean flags for readability
  const hasUsers = topUsers.length > 0;
  const hasLabels = topLabels.length > 0;
  const hasRepos = topRepos.length > 0;

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
        trailingAction={
          inputValue ? (
            <TextInput.Action
              onClick={handleClearSearch}
              icon={XIcon}
              aria-label="Clear search"
              sx={{ color: 'fg.muted' }}
            />
          ) : undefined
        }
        sx={{
          fontSize: '12px',
          minHeight: '28px',
          '& input': {
            fontSize: '12px',
            minHeight: '26px',
            py: '4px',
          },
        }}
        block
      />

      {isFocused && (
        <Popover open caret="top">
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
              <SectionHeader>Search Syntax</SectionHeader>
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

            {/* Users Section */}
            {hasUsers && (
              <Box sx={{ mb: 3 }}>
                <SectionHeader>Filter by User</SectionHeader>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  {topUsers.map(user => (
                    <Tooltip key={user.login} text={`user:${user.login}`} direction="s">
                      <Box
                        as="button"
                        onMouseDown={createUserMouseDownHandler(user.login)}
                        sx={avatarButtonStyles}
                      >
                        <Avatar src={user.avatar_url} size={32} alt={user.login} />
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            )}

            {/* Labels Section */}
            {hasLabels && (
              <Box sx={{ mb: 3 }}>
                <SectionHeader>Filter by Label</SectionHeader>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {topLabels.map(label => (
                    <Box
                      key={label}
                      as="button"
                      onMouseDown={createLabelMouseDownHandler(label)}
                      sx={{
                        ...tokenStyles,
                        border: '1px solid',
                        borderColor: 'border.default',
                        borderRadius: '2em',
                        px: 2,
                        py: '2px',
                        background: 'canvas.subtle',
                        color: 'fg.default',
                      }}
                    >
                      {label}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {/* Repos Section */}
            {hasRepos && (
              <Box>
                <SectionHeader>Filter by Repository</SectionHeader>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {topRepos.map(repo => (
                    <Box
                      key={repo}
                      as="button"
                      onMouseDown={createRepoMouseDownHandler(repo)}
                      sx={{
                        ...tokenStyles,
                        border: '1px solid',
                        borderColor: 'border.default',
                        borderRadius: '2em',
                        px: 2,
                        py: '2px',
                        background: 'canvas.subtle',
                        color: 'fg.default',
                      }}
                    >
                      {repo}
                    </Box>
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
