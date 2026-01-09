import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  TextInput,
  Flash,
  Text,
} from '@primer/react';
import { OrganizationIcon, XIcon } from '@primer/octicons-react';
import { validateGitHubOrganization } from '../utils/githubSearch';
import { GitHubOrganization } from '../types';

interface OrgActivityFilterProps {
  /** Current organization filter value */
  organization: string;
  /** Callback when organization filter changes */
  onOrganizationChange: (org: string) => void;
  /** GitHub token for authenticated requests */
  githubToken?: string;
}

/**
 * Component for filtering GitHub activity by organization.
 * When an organization is set, search results will be filtered to only
 * show issues, PRs, and events within that organization's repositories.
 */
export const OrgActivityFilter: React.FC<OrgActivityFilterProps> = ({
  organization,
  onOrganizationChange,
  githubToken,
}) => {
  const [inputValue, setInputValue] = useState(organization || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedOrg, setValidatedOrg] = useState<GitHubOrganization | null>(null);

  const handleValidateOrg = useCallback(async () => {
    if (!inputValue.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const org = await validateGitHubOrganization(inputValue.trim(), githubToken);
      setValidatedOrg(org);
      onOrganizationChange(org.login);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate organization');
      setValidatedOrg(null);
    } finally {
      setLoading(false);
    }
  }, [inputValue, githubToken, onOrganizationChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    setValidatedOrg(null);
    setError(null);
    onOrganizationChange('');
  }, [onOrganizationChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleValidateOrg();
      }
    },
    [handleValidateOrg]
  );

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          gap: 2,
          alignItems: 'flex-end',
        }}
      >
        <FormControl>
          <FormControl.Label>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <OrganizationIcon size={16} />
              Filter by Organization (optional)
            </Box>
          </FormControl.Label>
          <FormControl.Caption>
            Only show activity in this organization's repositories
          </FormControl.Caption>
          <TextInput
            placeholder="e.g., facebook, microsoft, google"
            value={inputValue}
            onChange={e => {
              setInputValue(e.target.value);
              if (validatedOrg) {
                setValidatedOrg(null);
                onOrganizationChange('');
              }
            }}
            onKeyDown={handleKeyDown}
            disabled={loading}
            sx={{ minWidth: '250px' }}
          />
        </FormControl>

        {!validatedOrg ? (
          <Button
            onClick={handleValidateOrg}
            disabled={loading || !inputValue.trim()}
            loading={loading}
          >
            {loading ? 'Validating...' : 'Apply Filter'}
          </Button>
        ) : (
          <Button
            onClick={handleClear}
            leadingVisual={XIcon}
            variant="danger"
          >
            Clear Filter
          </Button>
        )}
      </Box>

      {validatedOrg && (
        <Text sx={{ mt: 2, color: 'success.fg', fontSize: 1, display: 'block' }}>
          Filtering results to organization: <strong>{validatedOrg.login}</strong>
        </Text>
      )}

      {error && (
        <Flash variant="danger" sx={{ mt: 2 }}>
          {error}
        </Flash>
      )}
    </Box>
  );
};

// Keep backward compatibility with old name
export const OrgMemberLookup = OrgActivityFilter;

export default OrgActivityFilter;
