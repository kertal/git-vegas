import React, { memo, useCallback } from 'react';
import {
  TextInput,
  Box,
} from '@primer/react';
import { XIcon, SearchIcon } from '@primer/octicons-react';

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

  // Handle input change (when typing new text)
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);

  // Clear all search
  const handleClearSearch = useCallback(() => {
    onSearchChange('');
  }, [onSearchChange]);

  return (
    <Box
      sx={{
        minWidth: '300px',
        maxWidth: '500px',
        '@media (max-width: 767px)': {
          minWidth: '200px',
          maxWidth: '280px',
        },
      }}
    >
      <TextInput
        value={searchText}
        onChange={handleInputChange}
        placeholder={placeholder}
        size="small"
        leadingVisual={SearchIcon}
        {...(searchText && {
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
    </Box>
  );
});

export default HeaderSearch; 