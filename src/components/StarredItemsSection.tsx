import { memo, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Text,
  Link,
  Avatar,
  Timeline,
  Label,
} from '@primer/react';
import { 
  GitPullRequestIcon, 
  IssueOpenedIcon, 
  CommentIcon,
  LinkExternalIcon,
} from '@primer/octicons-react';
import { StarredItem } from '../types';
import { StarredItemsManager } from '../utils/starredItems';
import StarButton from './StarButton';

interface StarredItemsSectionProps {
  onRefresh?: () => void;
}

const StarredItemsSection = memo(function StarredItemsSection({ onRefresh }: StarredItemsSectionProps) {
  const [starredItems, setStarredItems] = useState<StarredItem[]>([]);
  const [activeFilter] = useState<'all' | 'issue' | 'pr' | 'comment'>('all');

  // Load starred items on mount and when refresh is triggered
  useEffect(() => {
    loadStarredItems();
  }, []);

  const loadStarredItems = () => {
    const items = StarredItemsManager.getAllStarredItems();
    setStarredItems(items);
  };

  // Filter items based on active filter
  const filteredItems = useMemo(() => {
    if (activeFilter === 'all') {
      return starredItems;
    }
    return starredItems.filter(item => item.type === activeFilter);
  }, [starredItems, activeFilter]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getItemIcon = (item: StarredItem) => {
    switch (item.type) {
      case 'pr':
        return <GitPullRequestIcon size={16} />;
      case 'issue':
        return <IssueOpenedIcon size={16} />;
      case 'comment':
        return <CommentIcon size={16} />;
      default:
        return <IssueOpenedIcon size={16} />;
    }
  };

  const counts = useMemo(() => StarredItemsManager.getCounts(), []);

  if (starredItems.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Text as="h2" sx={{ fontSize: 1, fontWeight: 'bold' }}>
          Starred Items ({counts.total})
        </Text>
      </Box>
      
      {filteredItems.length > 0 ? (
        <Timeline clipSidebar>
          {filteredItems.map((starredItem) => (
            <Timeline.Item key={starredItem.id} condensed>
              <Timeline.Badge>
                {getItemIcon(starredItem)}
              </Timeline.Badge>
              <Timeline.Body>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar
                        src={starredItem.item.user.avatar_url}
                        size={16}
                        alt={`${starredItem.item.user.login} avatar`}
                      />
                      <Text sx={{ fontWeight: 'semibold', fontSize: 0 }}>
                        <Link href={starredItem.item.user.html_url} target="_blank" rel="noopener noreferrer">
                          {starredItem.item.user.login}
                        </Link>
                      </Text>
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        {starredItem.type === 'pr' ? 'opened pull request' : 
                         starredItem.type === 'issue' ? 'opened issue' : 'commented on'}
                      </Text>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Text
                        sx={{
                          px: 1,
                          py: 0,
                          borderRadius: 1,
                          fontSize: '9px',
                          fontWeight: 'bold',
                          color: starredItem.item.state === 'open' ? 'success.fg' : 'done.fg',
                          bg: starredItem.item.state === 'open' ? 'success.subtle' : 'done.subtle',
                        }}
                      >
                        {starredItem.item.state}
                      </Text>
                      
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        starred {formatDate(starredItem.starredAt)}
                      </Text>
                    </Box>
                  </Box>
                  <Box sx={{ mt: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Link href={starredItem.item.html_url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 0, fontWeight: 'semibold', lineHeight: '1.3' }}>
                      {starredItem.item.title}
                      <Box as="span" sx={{ ml: 1 }}>
                        <LinkExternalIcon size={10} />
                      </Box>
                    </Link>
                    {starredItem.type === 'pr' && (starredItem.item.draft || starredItem.item.pull_request?.draft) && (
                      <Label variant="secondary" size="small">
                        Draft
                      </Label>
                    )}
                  </Box>
                  {starredItem.note && (
                    <Text sx={{ fontSize: 0, color: 'fg.muted', fontStyle: 'italic', mt: 0.5 }}>
                      Note: {starredItem.note}
                    </Text>
                  )}
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                    in <Link 
                      href={starredItem.item.repository?.html_url || `https://github.com/${starredItem.item.repository_url?.replace('https://api.github.com/repos/', '') || ''}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                    >
                      {starredItem.item.repository?.full_name || starredItem.item.repository_url?.replace('https://api.github.com/repos/', '') || 'Unknown'}
                    </Link>
                  </Text>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <StarButton 
                      item={starredItem.item} 
                      onStarChange={() => {
                        loadStarredItems();
                        onRefresh?.();
                      }}
                    />
                  </Box>
                </Box>
              </Timeline.Body>
            </Timeline.Item>
          ))}
        </Timeline>
      ) : (
        <Box
          sx={{
            p: 2,
            textAlign: 'center',
            color: 'fg.muted',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            fontSize: 0,
          }}
        >
          <Text>No starred {activeFilter === 'all' ? 'items' : activeFilter === 'pr' ? 'pull requests' : activeFilter === 'issue' ? 'issues' : 'comments'} found.</Text>
        </Box>
      )}
    </Box>
  );
});

export default StarredItemsSection; 