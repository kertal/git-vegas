import React, { memo, useCallback, useState } from 'react';
import {
  TextInput,
  Box,
  Text,
  Popover,
} from '@primer/react';
import { XIcon, SearchIcon } from '@primer/octicons-react';
import { useDebouncedSearch } from '../hooks/useDebouncedSearch';

interface HeaderSearchProps {
  searchText: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
}

const HeaderSearch = memo(function HeaderSearch({
  searchText,
  onSearchChange,
  placeholder = 'Search'
}: HeaderSearchProps) {
  const [isFocused, setIsFocused] = useState(false);

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

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  const showSyntaxHelp = !isFocused && !inputValue;

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
          <Popover.Content sx={{ p: 2, mt: 1, fontSize: '12px' }}>
            <Text sx={{ fontWeight: 'bold', display: 'block', mb: 1 }}>Search syntax:</Text>
            <Box as="ul" sx={{ m: 0, pl: 3 }}>
              <li><code>label:name</code> - include label</li>
              <li><code>-label:name</code> - exclude label</li>
              <li><code>user:name</code> - filter by author</li>
              <li><code>repo:owner/repo</code> - filter by repo</li>
            </Box>
          </Popover.Content>
        </Popover>
      )}
    </Box>
  );
});

export default HeaderSearch; 