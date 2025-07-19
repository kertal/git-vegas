import { memo, useMemo, useState, useEffect } from 'react';
import {
  Box,
  Text,
  Link,
  Button,
  Avatar,
  Timeline,
  Dialog,
} from '@primer/react';
import { 
  GitPullRequestIcon, 
  IssueOpenedIcon, 
  CalendarIcon, 
  LinkExternalIcon, 
  GearIcon,
  GitCommitIcon,
  GitBranchIcon,
  StarIcon,
  RepoIcon,
  CommentIcon
} from '@primer/octicons-react';
import { useFormContext } from '../App';
import { GitHubItem, GitHubEvent, CustomSection } from '../types';
import { categorizeRawSearchItems, categorizeRawEvents } from '../utils/rawDataUtils';
import CustomSectionsManager from '../utils/customSections';
import CustomSectionManager from '../components/CustomSectionManager';
import CustomSectionDisplay from '../components/CustomSectionDisplay';

import { 
  PushEventPayload, 
  CreateEventPayload, 
  ForkEventPayload, 
  DeleteEventPayload, 
  GollumEventPayload 
} from '../types';

interface OverviewTabProps {
  indexedDBSearchItems: GitHubItem[];
  indexedDBEvents: GitHubEvent[];
}

const OverviewTab = memo(function OverviewTab({ indexedDBSearchItems, indexedDBEvents }: OverviewTabProps) {
  const {
    startDate,
    endDate,
    setApiMode,
  } = useFormContext();

  // Custom sections state
  const [customSections, setCustomSections] = useState<CustomSection[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load custom sections on mount
  useEffect(() => {
    loadCustomSections();
  }, []);

  const loadCustomSections = () => {
    const config = CustomSectionsManager.loadConfig();
    setCustomSections(config.sections.filter(s => s.enabled));
  };

  // Get categorized data for the date range
  const searchItems = useMemo(() => {
    return categorizeRawSearchItems(indexedDBSearchItems, startDate, endDate);
  }, [indexedDBSearchItems, startDate, endDate]);

  const events = useMemo(() => {
    return categorizeRawEvents(indexedDBEvents, startDate, endDate);
  }, [indexedDBEvents, startDate, endDate]);

  // Get 10 most recent issues/PRs
  const recentSearchItems = useMemo(() => {
    return searchItems
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 10);
  }, [searchItems]);

  // Get 10 most recent events
  const recentEvents = useMemo(() => {
    return indexedDBEvents
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 10);
  }, [indexedDBEvents]);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Invalid date';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid date';
    try {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return date.toString();
    }
  };

  const getItemType = (item: GitHubItem) => {
    return item.pull_request ? 'pr' : 'issue';
  };

  const getItemIcon = (item: GitHubItem) => {
    const type = getItemType(item);
    switch (type) {
      case 'pr':
        return <GitPullRequestIcon size={16} />;
      case 'issue':
        return <IssueOpenedIcon size={16} />;
      default:
        return <IssueOpenedIcon size={16} />;
    }
  };

  // Helper functions for events
  const getEventIcon = (event: GitHubEvent) => {
    switch (event.type) {
      case 'PushEvent':
        return <GitCommitIcon size={14} />;
      case 'CreateEvent':
        return <GitBranchIcon size={14} />;
      case 'PullRequestEvent':
        return <GitPullRequestIcon size={14} />;
      case 'IssuesEvent':
        return <IssueOpenedIcon size={14} />;
      case 'ForkEvent':
        return <GitBranchIcon size={14} />;
      case 'WatchEvent':
        return <StarIcon size={14} />;
      case 'PublicEvent':
        return <RepoIcon size={14} />;
      case 'IssueCommentEvent':
      case 'PullRequestReviewCommentEvent':
        return <CommentIcon size={14} />;
      case 'PullRequestReviewEvent':
        return <GitPullRequestIcon size={14} />;
      case 'DeleteEvent':
        return <GitBranchIcon size={14} />;
      case 'GollumEvent':
        return <RepoIcon size={14} />;
      default:
        return <CalendarIcon size={14} />;
    }
  };

  const getEventDescription = (event: GitHubEvent) => {
    const actor = event.actor.login;
    
    switch (event.type) {
      case 'PushEvent': {
        const pushPayload = event.payload as PushEventPayload;
        const commits = pushPayload?.size || 0;
        const branch = pushPayload?.ref?.replace('refs/heads/', '') || 'main';
        return `${actor} pushed ${commits} commit${commits !== 1 ? 's' : ''} to ${branch}`;
      }
      
      case 'CreateEvent': {
        const createPayload = event.payload as CreateEventPayload;
        const refType = createPayload?.ref_type || 'repository';
        const ref = createPayload?.ref || '';
        return `${actor} created ${refType}${ref ? ` ${ref}` : ''}`;
      }
      
      case 'PullRequestEvent': {
        const action = event.payload?.action || 'updated';
        const prNumber = event.payload?.pull_request?.number;
        const prTitle = event.payload?.pull_request?.title || 'pull request';
        return `${actor} ${action} pull request #${prNumber}: ${prTitle}`;
      }
      
      case 'IssuesEvent': {
        const issueAction = event.payload?.action || 'updated';
        const issueNumber = event.payload?.issue?.number;
        const issueTitle = event.payload?.issue?.title || 'issue';
        return `${actor} ${issueAction} issue #${issueNumber}: ${issueTitle}`;
      }
      
      case 'ForkEvent': {
        const forkPayload = event.payload as ForkEventPayload;
        const forkee = forkPayload?.forkee?.full_name || 'repository';
        return `${actor} forked repository to ${forkee}`;
      }
      
      case 'WatchEvent':
        return `${actor} starred the repository`;
      
      case 'PublicEvent':
        return `${actor} made the repository public`;
      
      case 'IssueCommentEvent': {
        const commentIssueNumber = event.payload?.issue?.number;
        const commentIssueTitle = event.payload?.issue?.title || 'issue';
        return `${actor} commented on issue #${commentIssueNumber}: ${commentIssueTitle}`;
      }
      
      case 'PullRequestReviewCommentEvent': {
        const reviewPrNumber = event.payload?.pull_request?.number;
        const reviewPrTitle = event.payload?.pull_request?.title || 'pull request';
        return `${actor} commented on pull request #${reviewPrNumber}: ${reviewPrTitle}`;
      }
      
      case 'PullRequestReviewEvent': {
        const reviewAction = event.payload?.action || 'reviewed';
        const reviewPrNum = event.payload?.pull_request?.number;
        const reviewPrTtl = event.payload?.pull_request?.title || 'pull request';
        return `${actor} ${reviewAction} pull request #${reviewPrNum}: ${reviewPrTtl}`;
      }
      
      case 'DeleteEvent': {
        const deletePayload = event.payload as DeleteEventPayload;
        const deleteRefType = deletePayload?.ref_type || 'branch';
        const deleteRef = deletePayload?.ref || '';
        return `${actor} deleted ${deleteRefType}${deleteRef ? ` ${deleteRef}` : ''}`;
      }
      
      case 'GollumEvent': {
        const gollumPayload = event.payload as GollumEventPayload;
        const pages = gollumPayload?.pages?.length || 0;
        return `${actor} updated ${pages} wiki page${pages !== 1 ? 's' : ''}`;
      }
      
      default:
        return `${actor} performed ${event.type.replace(/([A-Z])/g, ' $1').toLowerCase()}`;
    }
  };

  const getEventLink = (event: GitHubEvent) => {
    switch (event.type) {
      case 'PushEvent': {
        const pushPayload = event.payload as PushEventPayload;
        const branch = pushPayload?.ref?.replace('refs/heads/', '') || 'main';
        return `https://github.com/${event.repo?.name}/commits/${branch}`;
      }
      
      case 'CreateEvent': {
        const createPayload = event.payload as CreateEventPayload;
        if (createPayload?.ref_type === 'branch') {
          return `https://github.com/${event.repo?.name}/tree/${createPayload.ref}`;
        }
        return `https://github.com/${event.repo?.name}`;
      }
      
      case 'PullRequestEvent': {
        const prNumber = event.payload?.pull_request?.number;
        return `https://github.com/${event.repo?.name}/pull/${prNumber}`;
      }
      
      case 'IssuesEvent': {
        const issueNumber = event.payload?.issue?.number;
        return `https://github.com/${event.repo?.name}/issues/${issueNumber}`;
      }
      
      case 'ForkEvent': {
        const forkPayload = event.payload as ForkEventPayload;
        const forkee = forkPayload?.forkee?.full_name;
        return forkee ? `https://github.com/${forkee}` : `https://github.com/${event.repo?.name}`;
      }
      
      case 'WatchEvent':
      case 'PublicEvent':
        return `https://github.com/${event.repo?.name}`;
      
      case 'IssueCommentEvent': {
        const commentIssueNum = event.payload?.issue?.number;
        return `https://github.com/${event.repo?.name}/issues/${commentIssueNum}`;
      }
      
      case 'PullRequestReviewCommentEvent': {
        const reviewCommentPrNum = event.payload?.pull_request?.number;
        return `https://github.com/${event.repo?.name}/pull/${reviewCommentPrNum}`;
      }
      
      case 'PullRequestReviewEvent': {
        const reviewPrNum = event.payload?.pull_request?.number;
        return `https://github.com/${event.repo?.name}/pull/${reviewPrNum}`;
      }
      
      case 'DeleteEvent':
        return `https://github.com/${event.repo?.name}`;
      
      case 'GollumEvent':
        return `https://github.com/${event.repo?.name}/wiki`;
      
      default:
        return `https://github.com/${event.repo?.name}`;
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      {/* Header with Settings Button */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Text as="h1" sx={{ fontSize: 2, fontWeight: 'bold' }}>
          Overview
        </Text>
        <Button
          size="small"
          onClick={() => setIsSettingsOpen(true)}
          variant="invisible"
          sx={{ p: 1 }}
        >
          <GearIcon size={14} /> Manage Sections
        </Button>
      </Box>

      {/* Custom Sections */}
      {customSections.length > 0 && (
        <Box sx={{ mb: 3 }}>
          {customSections.map((section) => (
            <CustomSectionDisplay
              key={section.id}
              section={section}
            />
          ))}
        </Box>
      )}

      {/* Issues & PRs Section */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Text as="h2" sx={{ fontSize: 1, fontWeight: 'bold' }}>
            Recent Issues & Pull Requests
          </Text>
          <Button
            size="small"
            onClick={() => setApiMode('search')}
            sx={{ p: 1 }}
          >
            View All ({searchItems.length})
          </Button>
        </Box>
        
        {recentSearchItems.length > 0 ? (
          <Timeline clipSidebar>
            {recentSearchItems.map((item) => (
              <Timeline.Item key={item.id} condensed>
                <Timeline.Badge>
                  {getItemIcon(item)}
                </Timeline.Badge>
                <Timeline.Body>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={item.user.avatar_url}
                          size={16}
                          alt={`${item.user.login} avatar`}
                        />
                        <Text sx={{ fontWeight: 'semibold', fontSize: 0 }}>
                          <Link href={item.user.html_url} target="_blank" rel="noopener noreferrer">
                            {item.user.login}
                          </Link>
                        </Text>
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          {getItemType(item) === 'pr' ? 'opened pull request' : 'opened issue'}
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
                            color: item.state === 'open' ? 'success.fg' : 'done.fg',
                            bg: item.state === 'open' ? 'success.subtle' : 'done.subtle',
                          }}
                        >
                          {item.state}
                        </Text>
                        
                        <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                          {formatDate(item.updated_at || item.created_at)}
                        </Text>
                      </Box>
                    </Box>
                    <Box sx={{ mt: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Link href={item.html_url} target="_blank" rel="noopener noreferrer" sx={{ fontSize: 0, fontWeight: 'semibold', lineHeight: '1.3' }}>
                        {item.title}
                        <Box as="span" sx={{ ml: 1 }}>
                          <LinkExternalIcon size={10} />
                        </Box>
                      </Link>
                    </Box>
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                      in <Link 
                        href={item.repository?.html_url || `https://github.com/${item.repository_url?.replace('https://api.github.com/repos/', '') || ''}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {item.repository?.full_name || item.repository_url?.replace('https://api.github.com/repos/', '') || 'Unknown'}
                      </Link>
                    </Text>
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
            <Text>No recent issues or pull requests found in the selected date range.</Text>
          </Box>
        )}
      </Box>

      {/* Events Section */}
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Text as="h2" sx={{ fontSize: 1, fontWeight: 'bold' }}>
            Recent Events
          </Text>
          <Button
            size="small"
            onClick={() => setApiMode('events')}
            sx={{ p: 1 }}
          >
            View All ({events.length})
          </Button>
        </Box>
        
        {recentEvents.length > 0 ? (
          <Timeline clipSidebar>
            {recentEvents.map((event) => (
              <Timeline.Item key={event.id} condensed>
                <Timeline.Badge>
                  {getEventIcon(event)}
                </Timeline.Badge>
                <Timeline.Body>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          src={event.actor.avatar_url}
                          size={16}
                          alt={`${event.actor.login} avatar`}
                        />
                        <Text sx={{ fontWeight: 'semibold', fontSize: 0 }}>
                          <Link href={`https://github.com/${event.actor.login}`} target="_blank" rel="noopener noreferrer">
                            {event.actor.login}
                          </Link>
                        </Text>
                      </Box>
                      <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                        {formatDate(event.created_at)}
                      </Text>
                    </Box>
                    <Box sx={{ mt: 0, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Link 
                        href={getEventLink(event)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        sx={{ fontSize: 0, fontWeight: 'semibold', lineHeight: '1.3' }}
                      >
                        {getEventDescription(event)}
                        <Box as="span" sx={{ ml: 1 }}>
                          <LinkExternalIcon size={10} />
                        </Box>
                      </Link>
                    </Box>
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                      in <Link 
                        href={`https://github.com/${event.repo?.name}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                      >
                        {event.repo?.name}
                        <Box as="span" sx={{ ml: 1 }}>
                          <LinkExternalIcon size={10} />
                        </Box>
                      </Link>
                    </Text>
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
            <Text>No recent events found in the selected date range.</Text>
          </Box>
        )}
      </Box>

      {/* Settings Dialog */}
      {isSettingsOpen && (
        <Dialog
          onClose={() => setIsSettingsOpen(false)}
          title="Manage Custom Sections"
          sx={{
            width: ['90%', '80%', '800px'],
            maxWidth: '900px',
            margin: '0 auto',
          }}
        >
          <Box sx={{ p: 3 }}>
            <CustomSectionManager
              onSectionsChange={() => {
                loadCustomSections();
              }}
            />
          </Box>
        </Dialog>
      )}
    </Box>
  );
});

export default OverviewTab; 