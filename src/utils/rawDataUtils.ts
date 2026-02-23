import { GitHubItem, GitHubEvent } from '../types';

/**
 * Raw Data Utilities
 * 
 * Provides functions for categorizing and processing raw data in the UI
 * instead of on the backend.
 */

/**
 * Extracts PR number from GitHub URLs
 * Handles both HTML URLs (github.com/.../pull/123) and API URLs (api.github.com/.../pulls/123)
 * 
 * @param htmlUrl - GitHub HTML URL (e.g., https://github.com/owner/repo/pull/123)
 * @param apiUrl - GitHub API URL (e.g., https://api.github.com/repos/owner/repo/pulls/123)
 * @returns PR number or undefined if not found
 */
const extractPRNumber = (htmlUrl?: string, apiUrl?: string): number | undefined => {
  // Try HTML URL first (uses /pull/ singular)
  if (htmlUrl) {
    const match = htmlUrl.match(/\/pull\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  
  // Try API URL (uses /pulls/ plural)
  if (apiUrl) {
    const match = apiUrl.match(/\/pulls\/(\d+)/);
    if (match) return parseInt(match[1], 10);
  }
  
  return undefined;
};

/**
 * Transforms GitHub Event to GitHubItem
 *
 * @param event - GitHub event from Events API
 * @returns GitHubItem or null if event doesn't contain relevant data
 */
export const transformEventToItem = (event: GitHubEvent): GitHubItem | null => {
  const { type, payload, repo } = event;

  // Create user object from event actor
  const actorUser = {
    login: event.actor.login,
    avatar_url: event.actor.avatar_url,
    html_url: `https://github.com/${event.actor.login}`,
  };

  // Only process events that contain issues, pull requests, or comments
  if (type === 'IssuesEvent' && payload.issue) {
    const issue = payload.issue;
    return {
      id: issue.id,
      event_id: event.id,
      html_url: issue.html_url,
      title: issue.title,
      action: payload.action, // e.g., 'opened', 'closed', 'reopened', 'labeled', 'assigned'
      created_at: event.created_at, // Use event timestamp, not issue timestamp
      updated_at: issue.updated_at,
      state: issue.state,
      body: issue.body,
      labels: issue.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: issue.closed_at,
      number: issue.number,
      user: actorUser, // Use event actor instead of issue user
      assignee: (payload as any).issue?.assignee || null, // Extract assignee from original payload
      assignees: (payload as any).issue?.assignees || [],
      pull_request: issue.pull_request,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PullRequestEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    const payloadWithAction = payload as { action?: string; number?: number; labels?: any[] };

    // GitHub API changed format - pr object may only contain url, not full details
    // Try to extract PR number from various sources
    let prNumber = pr.number || payloadWithAction.number;

    // If no number, try to extract from URLs
    if (!prNumber) {
      prNumber = extractPRNumber(pr.html_url, (pr as { url?: string }).url);
    }

    const htmlUrl = pr.html_url || (prNumber ? `https://github.com/${repo.name}/pull/${prNumber}` : `https://github.com/${repo.name}/pulls`);
    const action = payloadWithAction.action || 'updated';

    // Only use pr.title if it's a non-empty string (not undefined, null, or "undefined")
    const title = (pr.title && pr.title !== 'undefined') ? pr.title : (prNumber ? `Pull Request #${prNumber} ${action}` : `Pull Request ${action}`);

    return {
      id: pr.id || parseInt(event.id),
      event_id: event.id,
      html_url: htmlUrl,
      title: title,
      action: payloadWithAction.action, // e.g., 'opened', 'closed', 'reopened', 'synchronize', 'ready_for_review'
      created_at: event.created_at, // Use event timestamp, not PR timestamp
      updated_at: pr.updated_at || event.created_at,
      state: pr.state || 'open',
      body: pr.body || `Pull request ${action} by ${actorUser.login}`,
      labels: payloadWithAction.labels || pr.labels || [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: prNumber,
      user: actorUser, // Use event actor instead of PR user
      pull_request: {
        merged_at: pr.merged_at,
        url: htmlUrl,
      },
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PullRequestReviewEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    const payloadWithAction = payload as { action?: string; number?: number };

    // GitHub API changed format - pr object may only contain url, not full details
    // Try to extract PR number from various sources
    let prNumber = pr.number || payloadWithAction.number;

    // If no number, try to extract from URLs
    if (!prNumber) {
      prNumber = extractPRNumber(pr.html_url, (pr as { url?: string }).url);
    }

    const htmlUrl = pr.html_url || (prNumber ? `https://github.com/${repo.name}/pull/${prNumber}` : `https://github.com/${repo.name}/pulls`);
    // Only use pr.title if it's a non-empty string (not undefined, null, or "undefined")
    const prTitle = (pr.title && pr.title !== 'undefined') ? pr.title : (prNumber ? `Pull Request #${prNumber}` : 'Pull Request');

    // For review events, the actor is the reviewer. Try to get the PR author from the payload.
    const prAuthor = pr.user;
    // If PR author differs from reviewer, swap: set user to PR author, reviewedBy to reviewer
    const itemUser = (prAuthor && prAuthor.login !== actorUser.login) ? prAuthor : actorUser;

    return {
      id: pr.id || parseInt(event.id),
      event_id: event.id,
      html_url: htmlUrl,
      title: `Review on: ${prTitle}`,
      action: payloadWithAction.action, // e.g., 'submitted', 'edited', 'dismissed'
      created_at: event.created_at, // Use event timestamp, not PR timestamp
      updated_at: pr.updated_at || event.created_at,
      state: pr.state || 'open',
      body: pr.body || `Review by ${actorUser.login}`,
      labels: pr.labels || [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: prNumber,
      user: itemUser, // PR author if available, otherwise reviewer
      pull_request: {
        merged_at: pr.merged_at,
        url: htmlUrl,
      },
      original: payload,
      originalEventType: type,
      reviewedBy: actorUser, // The event actor is the reviewer
    };
  } else if (type === 'IssueCommentEvent' && payload.comment && payload.issue) {
    const comment = payload.comment;
    const issue = payload.issue;
    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Comment on: ${issue.title}`,
      action: payload.action, // e.g., 'created', 'edited', 'deleted'
      created_at: event.created_at, // Use event timestamp, not comment timestamp
      updated_at: comment.updated_at,
      state: issue.state,
      body: comment.body,
      labels: issue.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: issue.closed_at,
      number: issue.number,
      user: actorUser, // Use event actor instead of comment user
      pull_request: issue.pull_request,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PullRequestReviewCommentEvent' && payload.comment && payload.pull_request) {
    const comment = payload.comment;
    const pr = payload.pull_request;
    const payloadWithAction = payload as { action?: string; number?: number };

    // GitHub API changed format - pr object may only contain url, not full details
    // Try to extract PR number from various sources
    let prNumber = pr.number || payloadWithAction.number;

    // If no number, try to extract from URLs
    if (!prNumber) {
      prNumber = extractPRNumber(pr.html_url, (pr as { url?: string }).url);
    }

    const prHtmlUrl = pr.html_url || (prNumber ? `https://github.com/${repo.name}/pull/${prNumber}` : `https://github.com/${repo.name}/pulls`);
    // Only use pr.title if it's a non-empty string (not undefined, null, or "undefined")
    const prTitle = (pr.title && pr.title !== 'undefined') ? pr.title : (prNumber ? `Pull Request #${prNumber}` : 'Pull Request');

    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Review comment on: ${prTitle}`,
      action: payloadWithAction.action, // e.g., 'created', 'edited', 'deleted'
      created_at: event.created_at, // Use event timestamp, not comment timestamp
      updated_at: comment.updated_at,
      state: pr.state || 'open',
      body: comment.body,
      labels: pr.labels || [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: prNumber,
      user: actorUser, // Use event actor instead of comment user
      pull_request: {
        merged_at: pr.merged_at,
        url: prHtmlUrl,
      },
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PushEvent') {
    // Handle PushEvent - create a GitHubItem from push event data
    const pushPayload = payload as { ref?: string; commits?: Array<{ message: string; sha: string }>; distinct_size?: number; size?: number; head?: string; before?: string };
    const branch = pushPayload?.ref?.replace('refs/heads/', '') || 'main';

    // GitHub API changes: the commits array is the most reliable source.
    // Fallback chain for total commit count:
    //   1. commits.length (most accurate when provided)
    //   2. payload.size (total commits reported by GitHub)
    //   3. 0 if neither is present
    const totalCommitCount =
      pushPayload?.commits?.length ?? pushPayload?.size ?? 0;

    // distinct_size represents the number of distinct commits in the push.
    // If it is missing, fall back to the totalCommitCount so both values stay in sync.
    const distinctCount =
      pushPayload?.distinct_size !== undefined
        ? pushPayload.distinct_size
        : totalCommitCount;

    // Use the totalCommitCount as the display count when available; otherwise use distinctCount.
    // We prefer totalCommitCount because it represents the actual number of commits in the push,
    // while distinctCount excludes commits that already exist in other branches.
    const displayCount = totalCommitCount > 0 ? totalCommitCount : distinctCount;

    // Check if we have head/before indicating commits exist even without exact count
    const hasCommitIndicator = pushPayload?.head && pushPayload?.before && pushPayload.head !== pushPayload.before;

    // Create a title that describes the push (include repo owner for context)
    const repoOwner = repo.name.split('/')[0];
    let title: string;
    if (displayCount > 0) {
      title = `Committed ${displayCount} commit${displayCount !== 1 ? 's' : ''} to ${repoOwner}/${branch}`;
      if (distinctCount > 0 && totalCommitCount > distinctCount) {
        title += ` (${distinctCount} distinct)`;
      }
    } else if (hasCommitIndicator) {
      // We know commits were pushed but don't have the count
      title = `Committed to ${repoOwner}/${branch}`;
    } else {
      title = `Committed 0 commits to ${repoOwner}/${branch}`;
    }
    
    // Create a body with commit messages if available, or show commit range
    // Always include the repository name for context
    let body = `**Repository:** [${repo.name}](https://github.com/${repo.name})\n\n`;

    if (pushPayload?.commits && pushPayload.commits.length > 0) {
      body += pushPayload.commits
        .slice(0, 5) // Show first 5 commits
        .map((commit) => `- ${commit.message ? commit.message.split('\n')[0] : 'No commit message'}`) // First line of commit message
        .join('\n');

      if (pushPayload.commits.length > 5) {
        body += `\n... and ${pushPayload.commits.length - 5} more commits`;
      }
    } else if (hasCommitIndicator) {
      // Show commit range when we don't have commit details
      const shortHead = pushPayload.head!.substring(0, 7);
      const shortBefore = pushPayload.before!.substring(0, 7);
      body += `**Commits:** ${shortBefore}...${shortHead}`;
    }
    
    return {
      id: parseInt(event.id), // Convert string ID to number for GitHubItem
      event_id: event.id,
      html_url: `https://github.com/${repo.name}/commits/${branch}`,
      title: title,
      action: 'pushed', // PushEvent doesn't have payload.action, using semantic action
      created_at: event.created_at,
      updated_at: event.created_at, // Push events don't have updated_at, use created_at
      state: 'open', // Push events are always "open"
      body: body,
      labels: [], // Push events don't have labels
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: event as unknown as Record<string, unknown>,
      originalEventType: type,
      // Push events don't have pull_request, closed_at, merged_at, or number
    };
  } else if (type === 'CreateEvent') {
    // Handle CreateEvent - create a GitHubItem from create event data
    const createPayload = payload as { ref_type?: string; ref?: string; master_branch?: string; description?: string };
    const refType = createPayload?.ref_type || 'repository';
    const ref = createPayload?.ref || '';
    
    let title = '';
    let htmlUrl = `https://github.com/${repo.name}`;
    
    if (refType === 'branch') {
      title = `Created branch ${ref}`;
      htmlUrl = `https://github.com/${repo.name}/tree/${ref}`;
    } else if (refType === 'tag') {
      title = `Created tag ${ref}`;
      htmlUrl = `https://github.com/${repo.name}/releases/tag/${ref}`;
    } else {
      title = 'Created repository';
      if (createPayload?.description) {
        title += `: ${createPayload.description}`;
      }
    }
    
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: htmlUrl,
      title: title,
      action: 'created', // CreateEvent doesn't have payload.action, using semantic action
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'open',
      body: createPayload?.description || '',
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'ForkEvent') {
    // Handle ForkEvent - create a GitHubItem from fork event data
    const forkPayload = payload as { forkee?: { full_name?: string; html_url?: string } };
    const forkeeName = forkPayload?.forkee?.full_name || 'unknown repository';
    const forkeeUrl = forkPayload?.forkee?.html_url || `https://github.com/${repo.name}`;
    
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: forkeeUrl,
      title: `Forked repository to ${forkeeName}`,
      action: 'forked', // ForkEvent doesn't have payload.action, using semantic action
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'open',
      body: `Repository forked from ${repo.name} to ${forkeeName}`,
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'WatchEvent') {
    // Handle WatchEvent - create a GitHubItem from watch event data
    const action = payload?.action || 'starred';

    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}`,
      title: `${action === 'started' ? 'Starred' : 'Unstarred'} repository`,
      action: action, // e.g., 'started' (starred)
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'open',
      body: `${actorUser.login} ${action} the repository ${repo.name}`,
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PublicEvent') {
    // Handle PublicEvent - create a GitHubItem from public event data
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}`,
      title: 'Made repository public',
      action: 'publicized', // PublicEvent doesn't have payload.action, using semantic action
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'open',
      body: `${actorUser.login} made the repository ${repo.name} public`,
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'DeleteEvent') {
    // Handle DeleteEvent - create a GitHubItem from delete event data
    const deletePayload = payload as { ref_type?: string; ref?: string };
    const refType = deletePayload?.ref_type || 'branch';
    const ref = deletePayload?.ref || '';
    
    let title = '';
    if (refType === 'branch') {
      title = `Deleted branch ${ref}`;
    } else if (refType === 'tag') {
      title = `Deleted tag ${ref}`;
    } else {
      title = `Deleted ${refType}`;
    }
    
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}`,
      title: title,
      action: 'deleted', // DeleteEvent doesn't have payload.action, using semantic action
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'closed',
      body: `${actorUser.login} deleted ${refType} ${ref} from ${repo.name}`,
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'GollumEvent') {
    // Handle GollumEvent - create a GitHubItem from gollum event data
    const gollumPayload = payload as { pages?: Array<{ page_name: string; title: string; action: string; html_url: string }> };
    const pages = gollumPayload?.pages || [];
    
    if (pages.length === 0) {
      return null; // No pages to display
    }
    
    const page = pages[0]; // Show the first page
    const action = page.action || 'updated';
    const pageCount = pages.length;
    
    let title = '';
    if (pageCount === 1) {
      title = `${action === 'created' ? 'Created' : action === 'edited' ? 'Updated' : 'Deleted'} wiki page: ${page.title}`;
    } else {
      title = `${action === 'created' ? 'Created' : action === 'edited' ? 'Updated' : 'Deleted'} ${pageCount} wiki pages`;
    }
    
    let body = '';
    if (pages.length > 0) {
      body = pages
        .slice(0, 5)
        .map((p) => `- ${p.title} (${p.action})`)
        .join('\n');
      
      if (pages.length > 5) {
        body += `\n... and ${pages.length - 5} more pages`;
      }
    }
    
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: page.html_url || `https://github.com/${repo.name}/wiki`,
      title: title,
      action: action, // e.g., 'created', 'edited' (from the first wiki page)
      created_at: event.created_at,
      updated_at: event.created_at,
      state: 'open',
      body: body,
      labels: [],
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      user: actorUser,
      original: payload,
      originalEventType: type,
    };
  }

  // Return null for events that don't contain relevant data
  return null;
};

/**
 * Categorizes raw GitHub events into processed items
 *
 * @param rawEvents - Array of raw GitHub events
 * @param startDate - Start date for filtering (YYYY-MM-DD)
 * @param endDate - End date for filtering (YYYY-MM-DD)
 * @returns Array of processed GitHub items
 */
export const processRawEvents = (
  rawEvents: GitHubEvent[],
  startDate?: string,
  endDate?: string
): GitHubItem[] => {
  const items: GitHubItem[] = [];
  
  // Set up date filtering if dates are provided
  const startDateTime = startDate ? new Date(startDate).getTime() : 0;
  const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  for (const event of rawEvents) {
    const eventTime = new Date(event.created_at).getTime();

    // Filter by date range if dates are provided
    if (startDate && eventTime < startDateTime) {
      continue; // Skip events before start date
    }
    if (endDate && eventTime > endDateTime) {
      continue; // Skip events after end date
    }

    // Transform event to item
    const item = transformEventToItem(event);
    if (item) {
      items.push(item);
    }
  }

  return items;
};

/**
 * Categorizes raw search API results (already in GitHubItem format)
 * This is mainly for consistency, date filtering, and deduplication
 *
 * @param rawItems - Array of raw GitHub items from search API
 * @param startDate - Start date for filtering (YYYY-MM-DD)
 * @param endDate - End date for filtering (YYYY-MM-DD)
 * @returns Array of filtered and deduplicated GitHub items
 */
export const categorizeRawSearchItems = (
  rawItems: GitHubItem[],
  startDate?: string,
  endDate?: string
): GitHubItem[] => {
  // Set up date filtering if dates are provided
  const startDateTime = startDate ? new Date(startDate).getTime() : 0;
  const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  // First filter by date and validate required fields
  const dateFilteredItems = rawItems.filter(item => {
    // Validate required fields - skip items with missing title
    if (!item.title) {
      console.warn('Skipping item with missing title:', item.html_url || item.id);
      return false;
    }
    
    // For review items use the actual review date when available,
    // otherwise fall back to the PR's updated_at
    const dateField = item.reviewed_at ?? item.updated_at;
    const itemTime = new Date(dateField).getTime();

    // Filter by date range if dates are provided
    if (startDate && itemTime < startDateTime) {
      return false; // Skip items before start date
    }
    if (endDate && itemTime > endDateTime) {
      return false; // Skip items after end date
    }

    return true;
  });

  // Remove duplicates: use reviewer+url for review items (to preserve multiple reviewers),
  // plain html_url for everything else
  const dedupKeys = new Set<string>();
  const deduplicatedItems: GitHubItem[] = [];

  dateFilteredItems.forEach(item => {
    const key = item.reviewedBy
      ? `${item.reviewedBy.login}:${item.html_url}`
      : item.html_url;
    if (!dedupKeys.has(key)) {
      dedupKeys.add(key);
      deduplicatedItems.push(item);
    }
  });

  return deduplicatedItems;
};

/**
 * Gets all available labels from raw events
 *
 * @param rawEvents - Array of raw GitHub events
 * @returns Array of unique label names
 */
export const getAvailableLabelsFromRawEvents = (rawEvents: GitHubEvent[]): string[] => {
  const labelSet = new Set<string>();

  for (const event of rawEvents) {
    const item = transformEventToItem(event);
    if (item?.labels) {
      for (const label of item.labels) {
        labelSet.add(label.name);
      }
    }
  }

  return Array.from(labelSet).sort();
};

/**
 * Gets all available repositories from raw events
 *
 * @param rawEvents - Array of raw GitHub events
 * @returns Array of unique repository names
 */
export const getAvailableReposFromRawEvents = (rawEvents: GitHubEvent[]): string[] => {
  const repoSet = new Set<string>();

  for (const event of rawEvents) {
    const item = transformEventToItem(event);
    if (item?.repository?.full_name) {
      repoSet.add(item.repository.full_name);
    }
  }

  return Array.from(repoSet).sort();
};

/**
 * Gets all available users from raw events
 *
 * @param rawEvents - Array of raw GitHub events
 * @returns Array of unique usernames
 */
export const getAvailableUsersFromRawEvents = (rawEvents: GitHubEvent[]): string[] => {
  const userSet = new Set<string>();

  for (const event of rawEvents) {
    const item = transformEventToItem(event);
    if (item?.user?.login) {
      userSet.add(item.user.login);
    }
  }

  return Array.from(userSet).sort();
}; 