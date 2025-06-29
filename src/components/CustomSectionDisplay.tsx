import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Text,
  Button,
  Timeline,
  Avatar,
  Spinner,
  Link,
  Label,
} from '@primer/react';
import {
  GitPullRequestIcon,
  IssueOpenedIcon,
  SyncIcon,
} from '@primer/octicons-react';
import { CustomSection, CustomSectionData, GitHubItem } from '../types';
import CustomSectionsManager from '../utils/customSections';
import CustomSectionAPI from '../utils/customSectionAPI';
import { useFormContext } from '../App';
import { truncateMiddle } from '../utils/textUtils';

interface CustomSectionDisplayProps {
  section: CustomSection;
}

const CustomSectionDisplay = ({ section }: CustomSectionDisplayProps) => {
  const { githubToken } = useFormContext();
  const [sectionData, setSectionData] = useState<CustomSectionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFreshData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { items } = await CustomSectionAPI.fetchSectionData(section, githubToken);
      
      const newSectionData: CustomSectionData = {
        sectionId: section.id,
        items,
        events: [], // Events not implemented yet
        lastFetch: Date.now(),
        repository: section.repository,
        labels: section.labels,
        type: section.type,
      };

      await CustomSectionsManager.storeSectionData(newSectionData);
      setSectionData(newSectionData);
    } catch (error) {
      console.error('Failed to fetch section data:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch data');
    } finally {
      setIsLoading(false);
    }
  }, [section, githubToken]);

  const loadSectionData = useCallback(async () => {
    try {
      // Check if we have cached data
      const cachedData = await CustomSectionsManager.loadSectionData(section.id);
      if (cachedData) {
        setSectionData(cachedData);
      }

      // Check if we need to refresh
      const needsRefresh = await CustomSectionsManager.needsRefresh(section.id);
      if (needsRefresh) {
        fetchFreshData();
      }
    } catch (error) {
      console.error('Failed to load section data:', error);
      setError('Failed to load cached data');
    }
  }, [section.id, fetchFreshData]);

  // Load cached data on mount
  useEffect(() => {
    loadSectionData();
  }, [loadSectionData]);

  const displayItems = useMemo(() => {
    if (!sectionData) return [];
    return sectionData.items.slice(0, section.maxItems);
  }, [sectionData, section.maxItems]);

  const getRepositoryName = (item: GitHubItem): string => {
    // Try to get repository name from different sources
    if (item.repository?.full_name) {
      return item.repository.full_name;
    }
    
    if (item.repository_url) {
      // Extract from URL like https://api.github.com/repos/owner/repo
      const match = item.repository_url.match(/\/repos\/([^/]+\/[^/]+)/);
      if (match) {
        return match[1];
      }
    }
    
    return section.repository; // Fallback to section repository
  };

  const formatTimeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return '1 day ago';
    } else if (diffDays < 30) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!section.enabled) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Box>
          <Text as="h3" sx={{ fontSize: 1, fontWeight: 'semibold', mb: 0 }}>
            {section.title}
          </Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted', lineHeight: '1.2' }}>
            {section.repository} • {section.labels.join(', ')}
          </Text>
        </Box>
        <Button
          size="small"
          onClick={fetchFreshData}
          disabled={isLoading}
          variant="invisible"
          sx={{ p: 1 }}
        >
          <SyncIcon size={14} />
          {isLoading && <Spinner size="small" sx={{ ml: 1 }} />}
        </Button>
      </Box>

      {error && (
        <Box sx={{ p: 1, mb: 1, bg: 'danger.subtle', borderRadius: 1 }}>
          <Text sx={{ fontSize: 0, color: 'danger.fg' }}>
            {error}
          </Text>
        </Box>
      )}

      {displayItems.length === 0 ? (
        <Box sx={{ p: 2, textAlign: 'center', color: 'fg.muted', fontSize: 0 }}>
          {isLoading ? 'Loading...' : 'No items found'}
        </Box>
      ) : (
        <Timeline sx={{ mt: 1 }} clipSidebar>
                      {displayItems.map((item) => (
              <Timeline.Item key={item.id}>
                <Timeline.Badge>
                  {item.pull_request ? (
                    <GitPullRequestIcon size={14} />
                  ) : (
                    <IssueOpenedIcon size={14} />
                  )}
                </Timeline.Badge>
                <Timeline.Body>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                    <Avatar
                      src={item.user.avatar_url}
                      size={16}
                      alt={item.user.login}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ mb: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                          href={item.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{ fontSize: 0, fontWeight: 'semibold', lineHeight: '1.3' }}
                          title={item.title}
                        >
                          {truncateMiddle(item.title, 100)}
                        </Link>
                        {item.pull_request && (item.draft || item.pull_request.draft) && (
                          <Label variant="secondary" size="small">
                            Draft
                          </Label>
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', gap: 1, fontSize: 0, color: 'fg.muted', flexWrap: 'wrap' }}>
                        <Text>
                          #{item.number} by {item.user.login}
                        </Text>
                        <Text>{getRepositoryName(item)}</Text>
                        <Text>{formatTimeAgo(item.updated_at || item.created_at)}</Text>
                      </Box>
                    </Box>
                  </Box>
                </Timeline.Body>
              </Timeline.Item>
            ))}
        </Timeline>
      )}

      {sectionData && sectionData.lastFetch && (
        <Text sx={{ fontSize: 0, color: 'fg.muted', mt: 1 }}>
          Last updated: {formatTimeAgo(new Date(sectionData.lastFetch).toISOString())}
        </Text>
      )}
    </Box>
  );
};

export default CustomSectionDisplay; 