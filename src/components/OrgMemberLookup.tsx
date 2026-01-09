import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  FormControl,
  TextInput,
  Flash,
  ActionList,
  ActionMenu,
  Avatar,
  Checkbox,
  Label,
  Spinner,
  Text,
} from '@primer/react';
import { OrganizationIcon, PeopleIcon } from '@primer/octicons-react';
import { fetchOrgMembers, FetchOrgMembersResult } from '../utils/githubSearch';
import { GitHubOrgMember, GitHubOrganization } from '../types';

interface OrgMemberLookupProps {
  /** Callback when usernames are selected and confirmed */
  onUsernamesSelected: (usernames: string[]) => void;
  /** GitHub token for authenticated requests */
  githubToken?: string;
  /** Current usernames in the search field */
  currentUsernames?: string;
}

/**
 * Component for looking up GitHub organization members and selecting them
 * to populate the username search field.
 */
export const OrgMemberLookup: React.FC<OrgMemberLookupProps> = ({
  onUsernamesSelected,
  githubToken,
  currentUsernames = '',
}) => {
  const [orgName, setOrgName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [members, setMembers] = useState<GitHubOrgMember[]>([]);
  const [organization, setOrganization] = useState<GitHubOrganization | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isOpen, setIsOpen] = useState(false);

  const handleFetchMembers = useCallback(async () => {
    if (!orgName.trim()) {
      setError('Please enter an organization name');
      return;
    }

    setLoading(true);
    setError(null);
    setProgress('');
    setMembers([]);
    setOrganization(null);
    setSelectedMembers(new Set());

    try {
      const result: FetchOrgMembersResult = await fetchOrgMembers(
        orgName.trim(),
        githubToken,
        setProgress
      );

      setMembers(result.members);
      setOrganization(result.organization);
      // Select all members by default
      setSelectedMembers(new Set(result.members.map(m => m.login)));
      setIsOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch organization members');
    } finally {
      setLoading(false);
      setProgress('');
    }
  }, [orgName, githubToken]);

  const handleToggleMember = useCallback((login: string) => {
    setSelectedMembers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(login)) {
        newSet.delete(login);
      } else {
        newSet.add(login);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedMembers(new Set(members.map(m => m.login)));
  }, [members]);

  const handleSelectNone = useCallback(() => {
    setSelectedMembers(new Set());
  }, []);

  const handleConfirmSelection = useCallback(() => {
    const selectedUsernames = Array.from(selectedMembers);
    if (selectedUsernames.length > 0) {
      // Merge with existing usernames
      const existingUsernames = currentUsernames
        .split(',')
        .map(u => u.trim())
        .filter(u => u);
      const allUsernames = [...new Set([...existingUsernames, ...selectedUsernames])];
      onUsernamesSelected(allUsernames);
    }
    setIsOpen(false);
  }, [selectedMembers, currentUsernames, onUsernamesSelected]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleFetchMembers();
      }
    },
    [handleFetchMembers]
  );

  return (
    <Box>
      <ActionMenu open={isOpen} onOpenChange={setIsOpen}>
        <ActionMenu.Anchor>
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
                  Organization Members Lookup
                </Box>
              </FormControl.Label>
              <TextInput
                placeholder="Enter organization name (e.g., facebook)"
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                sx={{ minWidth: '250px' }}
              />
            </FormControl>
            <Button
              onClick={handleFetchMembers}
              disabled={loading || !orgName.trim()}
              leadingVisual={loading ? Spinner : PeopleIcon}
            >
              {loading ? 'Loading...' : 'Fetch Members'}
            </Button>
          </Box>
        </ActionMenu.Anchor>

        <ActionMenu.Overlay width="large">
          <Box sx={{ p: 3, maxHeight: '500px', overflow: 'auto' }}>
            {organization && (
              <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={organization.avatar_url} size={40} />
                <Box>
                  <Text sx={{ fontWeight: 'bold', display: 'block' }}>
                    {organization.login}
                  </Text>
                  {organization.description && (
                    <Text sx={{ color: 'fg.muted', fontSize: 1 }}>
                      {organization.description}
                    </Text>
                  )}
                </Box>
              </Box>
            )}

            {members.length > 0 && (
              <>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                    pb: 2,
                    borderBottom: '1px solid',
                    borderColor: 'border.default',
                  }}
                >
                  <Text sx={{ fontWeight: 'bold' }}>
                    {selectedMembers.size} of {members.length} members selected
                  </Text>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button size="small" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button size="small" onClick={handleSelectNone}>
                      Select None
                    </Button>
                  </Box>
                </Box>

                <ActionList>
                  {members.map(member => (
                    <ActionList.Item
                      key={member.id}
                      onSelect={() => handleToggleMember(member.login)}
                    >
                      <ActionList.LeadingVisual>
                        <Checkbox
                          checked={selectedMembers.has(member.login)}
                          onChange={() => {}} // Handled by onSelect
                        />
                      </ActionList.LeadingVisual>
                      <Avatar src={member.avatar_url} size={20} sx={{ mr: 2 }} />
                      <Text>{member.login}</Text>
                      {member.site_admin && (
                        <Label sx={{ ml: 2 }} variant="accent">
                          Admin
                        </Label>
                      )}
                    </ActionList.Item>
                  ))}
                </ActionList>

                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: '1px solid',
                    borderColor: 'border.default',
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 2,
                  }}
                >
                  <Button onClick={() => setIsOpen(false)}>Cancel</Button>
                  <Button
                    variant="primary"
                    onClick={handleConfirmSelection}
                    disabled={selectedMembers.size === 0}
                  >
                    Add {selectedMembers.size} Member{selectedMembers.size !== 1 ? 's' : ''} to Search
                  </Button>
                </Box>
              </>
            )}
          </Box>
        </ActionMenu.Overlay>
      </ActionMenu>

      {loading && progress && (
        <Text sx={{ mt: 2, color: 'fg.muted', fontSize: 1, display: 'block' }}>
          {progress}
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

export default OrgMemberLookup;
