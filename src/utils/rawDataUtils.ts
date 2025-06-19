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
      pull_request: issue.pull_request,
    };
  } else if (type === 'PullRequestEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    return {
      id: pr.id,
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
    };
  } else if (type === 'PullRequestReviewEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    return {
      id: pr.id,
      html_url: pr.html_url,
      title: `Reviewed: ${pr.title}`,
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
    };
  } else if (type === 'IssueCommentEvent' && payload.comment && payload.issue) {
    const comment = payload.comment;
    const issue = payload.issue;
    return {
      id: comment.id,
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
export const categorizeRawEvents = (
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
 * This is mainly for consistency and date filtering
 *
 * @param rawItems - Array of raw GitHub items from search API
 * @param startDate - Start date for filtering (YYYY-MM-DD)
 * @param endDate - End date for filtering (YYYY-MM-DD)
 * @returns Array of filtered GitHub items
 */
export const categorizeRawSearchItems = (
  rawItems: GitHubItem[],
  startDate?: string,
  endDate?: string
): GitHubItem[] => {
  // Set up date filtering if dates are provided
  const startDateTime = startDate ? new Date(startDate).getTime() : 0;
  const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  return rawItems.filter(item => {
    const itemTime = new Date(item.created_at).getTime();

    // Filter by date range if dates are provided
    if (startDate && itemTime < startDateTime) {
      return false; // Skip items before start date
    }
    if (endDate && itemTime > endDateTime) {
      return false; // Skip items after end date
    }

    return true;
  });
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