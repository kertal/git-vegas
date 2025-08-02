import { GitHubItem, GitHubEvent } from '../types';

/**
 * Raw Data Utilities
 * 
 * Provides functions for categorizing and processing raw data in the UI
 * instead of on the backend.
 */

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
    };
  } else if (type === 'PullRequestEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    return {
      id: pr.id,
      event_id: event.id,
      html_url: pr.html_url,
      title: pr.title,
      created_at: event.created_at, // Use event timestamp, not PR timestamp
      updated_at: pr.updated_at,
      state: pr.state,
      body: pr.body,
      labels: pr.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: pr.number,
      user: actorUser, // Use event actor instead of PR user
      pull_request: {
        merged_at: pr.merged_at,
        url: pr.html_url,
      },
      original: payload,
    };
  } else if (type === 'PullRequestReviewEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    return {
      id: pr.id,
      event_id: event.id,
      html_url: pr.html_url,
      title: `Review on: ${pr.title}`,
      created_at: event.created_at, // Use event timestamp, not PR timestamp
      updated_at: pr.updated_at,
      state: pr.state,
      body: pr.body,
      labels: pr.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: pr.number,
      user: actorUser, // Use event actor instead of PR user
      pull_request: {
        merged_at: pr.merged_at,
        url: pr.html_url,
      },
      original: payload,
    };
  } else if (type === 'IssueCommentEvent' && payload.comment && payload.issue) {
    const comment = payload.comment;
    const issue = payload.issue;
    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Comment on: ${issue.title}`,
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
    };
  } else if (type === 'PullRequestReviewCommentEvent' && payload.comment && payload.pull_request) {
    const comment = payload.comment;
    const pr = payload.pull_request;
    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Review comment on: ${pr.title}`,
      created_at: event.created_at, // Use event timestamp, not comment timestamp
      updated_at: comment.updated_at,
      state: pr.state,
      body: comment.body,
      labels: pr.labels,
      repository_url: `https://api.github.com/repos/${repo.name}`,
      repository: {
        full_name: repo.name,
        html_url: `https://github.com/${repo.name}`,
      },
      closed_at: pr.closed_at,
      merged_at: pr.merged_at,
      merged: pr.merged,
      number: pr.number,
      user: actorUser, // Use event actor instead of comment user
      pull_request: {
        merged_at: pr.merged_at,
        url: pr.html_url,
      },
      original: payload,
    };
  } else if (type === 'PushEvent') {
    // Handle PushEvent - create a GitHubItem from push event data
    const pushPayload = payload as { ref?: string; commits?: Array<{ message: string }>; distinct_size?: number };
    const branch = pushPayload?.ref?.replace('refs/heads/', '') || 'main';
    const commitCount = pushPayload?.commits?.length || 0;
    const distinctCount = pushPayload?.distinct_size || 0;
    
    // Create a title that describes the push
    let title = `Pushed ${distinctCount} commit${distinctCount !== 1 ? 's' : ''} to ${branch}`;
    if (commitCount > distinctCount) {
      title += ` (${commitCount} total)`;
    }
    
    // Create a body with commit messages if available
    let body = '';
    if (pushPayload?.commits && pushPayload.commits.length > 0) {
      body = pushPayload.commits
        .slice(0, 5) // Show first 5 commits
        .map((commit) => `- ${commit.message.split('\n')[0]}`) // First line of commit message
        .join('\n');
      
      if (pushPayload.commits.length > 5) {
        body += `\n... and ${pushPayload.commits.length - 5} more commits`;
      }
    }
    
    return {
      id: parseInt(event.id), // Convert string ID to number for GitHubItem
      event_id: event.id,
      html_url: `https://github.com/${repo.name}/commits/${branch}`,
      title: title,
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
      original: payload,
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
    };
  } else if (type === 'WatchEvent') {
    // Handle WatchEvent - create a GitHubItem from watch event data
    const action = payload?.action || 'starred';
    
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}`,
      title: `${action === 'started' ? 'Starred' : 'Unstarred'} repository`,
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
    };
  } else if (type === 'PublicEvent') {
    // Handle PublicEvent - create a GitHubItem from public event data
    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}`,
      title: 'Made repository public',
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

  // First filter by date
  const dateFilteredItems = rawItems.filter(item => {
    const itemTime = new Date(item.updated_at).getTime();

    // Filter by date range if dates are provided
    if (startDate && itemTime < startDateTime) {
      return false; // Skip items before start date
    }
    if (endDate && itemTime > endDateTime) {
      return false; // Skip items after end date
    }

    return true;
  });

  // Then remove duplicates based on html_url (unique identifier for issues/PRs)
  const urlSet = new Set<string>();
  const deduplicatedItems: GitHubItem[] = [];
  
  dateFilteredItems.forEach(item => {
    if (!urlSet.has(item.html_url)) {
      urlSet.add(item.html_url);
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