/**
 * GitHub Data Utilities
 *
 * Consolidates all GitHub data transformation and enrichment:
 * - Event to GitHubItem transformation
 * - Raw data processing and categorization
 * - PR detail enrichment
 */

import { GitHubItem, GitHubEvent } from '../types';

// ============================================================================
// EVENT TRANSFORMATION
// ============================================================================

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
      created_at: event.created_at,
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
      user: actorUser,
      assignee: (payload as Record<string, unknown>).issue?.assignee || null,
      assignees: (payload as Record<string, unknown>).issue?.assignees || [],
      pull_request: issue.pull_request,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PullRequestEvent' && payload.pull_request) {
    const pr = payload.pull_request;
    const payloadWithAction = payload as { action?: string; number?: number; labels?: { name: string; color?: string; description?: string }[] };

    const prNumber = pr.number || payloadWithAction.number;
    const htmlUrl = pr.html_url || `https://github.com/${repo.name}/pull/${prNumber}`;
    const action = payloadWithAction.action || 'updated';
    const title = pr.title || `Pull Request #${prNumber} ${action}`;

    return {
      id: pr.id,
      event_id: event.id,
      html_url: htmlUrl,
      title: title,
      created_at: event.created_at,
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
      user: actorUser,
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

    const prNumber = pr.number || payloadWithAction.number;
    const htmlUrl = pr.html_url || `https://github.com/${repo.name}/pull/${prNumber}`;
    const prTitle = pr.title || `Pull Request #${prNumber}`;

    return {
      id: pr.id,
      event_id: event.id,
      html_url: htmlUrl,
      title: `Review on: ${prTitle}`,
      created_at: event.created_at,
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
      user: actorUser,
      pull_request: {
        merged_at: pr.merged_at,
        url: htmlUrl,
      },
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'IssueCommentEvent' && payload.comment && payload.issue) {
    const comment = payload.comment;
    const issue = payload.issue;
    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Comment on: ${issue.title}`,
      created_at: event.created_at,
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
      user: actorUser,
      pull_request: issue.pull_request,
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PullRequestReviewCommentEvent' && payload.comment && payload.pull_request) {
    const comment = payload.comment;
    const pr = payload.pull_request;
    const payloadWithAction = payload as { action?: string; number?: number };

    const prNumber = pr.number || payloadWithAction.number;
    const prHtmlUrl = pr.html_url || `https://github.com/${repo.name}/pull/${prNumber}`;
    const prTitle = pr.title || `Pull Request #${prNumber}`;

    return {
      id: comment.id,
      event_id: event.id,
      html_url: comment.html_url,
      title: `Review comment on: ${prTitle}`,
      created_at: event.created_at,
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
      user: actorUser,
      pull_request: {
        merged_at: pr.merged_at,
        url: prHtmlUrl,
      },
      original: payload,
      originalEventType: type,
    };
  } else if (type === 'PushEvent') {
    const pushPayload = payload as {
      ref?: string;
      commits?: Array<{ message: string }>;
      distinct_size?: number;
    };
    const branch = pushPayload?.ref?.replace('refs/heads/', '') || 'main';
    const commitCount = pushPayload?.commits?.length || 0;
    const distinctCount = pushPayload?.distinct_size || 0;

    let title = `Pushed ${distinctCount} commit${distinctCount !== 1 ? 's' : ''} to ${branch}`;
    if (commitCount > distinctCount) {
      title += ` (${commitCount} total)`;
    }

    let body = '';
    if (pushPayload?.commits && pushPayload.commits.length > 0) {
      body = pushPayload.commits
        .slice(0, 5)
        .map((commit) => `- ${commit.message ? commit.message.split('\n')[0] : 'No commit message'}`)
        .join('\n');

      if (pushPayload.commits.length > 5) {
        body += `\n... and ${pushPayload.commits.length - 5} more commits`;
      }
    }

    return {
      id: parseInt(event.id),
      event_id: event.id,
      html_url: `https://github.com/${repo.name}/commits/${branch}`,
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
      originalEventType: type,
    };
  } else if (type === 'CreateEvent') {
    const createPayload = payload as {
      ref_type?: string;
      ref?: string;
      master_branch?: string;
      description?: string;
    };
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
      originalEventType: type,
    };
  } else if (type === 'ForkEvent') {
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
      originalEventType: type,
    };
  } else if (type === 'WatchEvent') {
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
      originalEventType: type,
    };
  } else if (type === 'PublicEvent') {
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
      originalEventType: type,
    };
  } else if (type === 'DeleteEvent') {
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
      originalEventType: type,
    };
  } else if (type === 'GollumEvent') {
    const gollumPayload = payload as {
      pages?: Array<{ page_name: string; title: string; action: string; html_url: string }>;
    };
    const pages = gollumPayload?.pages || [];

    if (pages.length === 0) {
      return null;
    }

    const page = pages[0];
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
      originalEventType: type,
    };
  }

  return null;
};

// ============================================================================
// RAW DATA PROCESSING
// ============================================================================

/**
 * Categorizes raw GitHub events into processed items
 */
export const processRawEvents = (
  rawEvents: GitHubEvent[],
  startDate?: string,
  endDate?: string
): GitHubItem[] => {
  const items: GitHubItem[] = [];

  const startDateTime = startDate ? new Date(startDate).getTime() : 0;
  const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  for (const event of rawEvents) {
    const eventTime = new Date(event.created_at).getTime();

    if (startDate && eventTime < startDateTime) {
      continue;
    }
    if (endDate && eventTime > endDateTime) {
      continue;
    }

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
 */
export const categorizeRawSearchItems = (
  rawItems: GitHubItem[],
  startDate?: string,
  endDate?: string
): GitHubItem[] => {
  const startDateTime = startDate ? new Date(startDate).getTime() : 0;
  const endDateTime = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 : Infinity;

  // First filter by date and validate required fields
  const dateFilteredItems = rawItems.filter((item) => {
    if (!item.title) {
      console.warn('Skipping item with missing title:', item.html_url || item.id);
      return false;
    }

    const itemTime = new Date(item.updated_at).getTime();

    if (startDate && itemTime < startDateTime) {
      return false;
    }
    if (endDate && itemTime > endDateTime) {
      return false;
    }

    return true;
  });

  // Then remove duplicates based on html_url
  const urlSet = new Set<string>();
  const deduplicatedItems: GitHubItem[] = [];

  dateFilteredItems.forEach((item) => {
    if (!urlSet.has(item.html_url)) {
      urlSet.add(item.html_url);
      deduplicatedItems.push(item);
    }
  });

  return deduplicatedItems;
};

/**
 * Gets all available labels from raw events
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

// ============================================================================
// PR ENRICHMENT
// ============================================================================

interface PRDetails {
  title: string;
  state: string;
  body: string;
  html_url: string;
  labels: Array<{ name: string; color?: string; description?: string }>;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merged?: boolean;
}

// In-memory cache for PR details to avoid duplicate fetches
const prCache = new Map<string, PRDetails>();

/**
 * Extracts PR API URL from a GitHubItem
 * Returns null if the item is not a PR or doesn't have a PR URL
 */
const getPRApiUrl = (item: GitHubItem): string | null => {
  if (!item.originalEventType?.includes('PullRequest')) {
    return null;
  }

  const match = item.html_url?.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
  if (!match) {
    return null;
  }

  const [, repoFullName, prNumber] = match;
  return `https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`;
};

/**
 * Checks if an item needs PR details enrichment
 */
export const needsPREnrichment = (item: GitHubItem): boolean => {
  if (!item.originalEventType?.includes('PullRequest')) {
    return false;
  }

  // Check if title is a generic fallback (indicates missing data)
  if (
    item.title?.match(
      /^Pull Request #\d+ (opened|closed|labeled|unlabeled|synchronized|reopened|edited|assigned|unassigned|review_requested|review_request_removed)$/
    )
  ) {
    return true;
  }

  // Check if title starts with "Review on: Pull Request #" (indicates missing PR title)
  if (item.title?.startsWith('Review on: Pull Request #')) {
    return true;
  }

  // Check if title starts with "Review comment on: Pull Request #" (indicates missing PR title)
  if (item.title?.startsWith('Review comment on: Pull Request #')) {
    return true;
  }

  return false;
};

/**
 * Fetches PR details from GitHub API
 */
const fetchPRDetails = async (apiUrl: string, githubToken?: string): Promise<PRDetails | null> => {
  if (prCache.has(apiUrl)) {
    return prCache.get(apiUrl)!;
  }

  try {
    const headers: HeadersInit = {
      Accept: 'application/vnd.github.v3+json',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      console.warn(`Failed to fetch PR details from ${apiUrl}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    const details: PRDetails = {
      title: data.title,
      state: data.state,
      body: data.body || '',
      html_url: data.html_url,
      labels: data.labels || [],
      updated_at: data.updated_at,
      closed_at: data.closed_at,
      merged_at: data.merged_at,
      merged: data.merged,
    };

    prCache.set(apiUrl, details);

    return details;
  } catch (error) {
    console.warn(`Error fetching PR details from ${apiUrl}:`, error);
    return null;
  }
};

/**
 * Enriches a single GitHubItem with full PR details if needed
 */
export const enrichItemWithPRDetails = async (
  item: GitHubItem,
  githubToken?: string
): Promise<GitHubItem> => {
  if (!githubToken) {
    return item;
  }

  if (!needsPREnrichment(item)) {
    return item;
  }

  const apiUrl = getPRApiUrl(item);
  if (!apiUrl) {
    return item;
  }

  const prDetails = await fetchPRDetails(apiUrl, githubToken);
  if (!prDetails) {
    return item;
  }

  const enrichedItem: GitHubItem = {
    ...item,
    labels: prDetails.labels.length > 0 ? prDetails.labels : item.labels,
    updated_at: prDetails.updated_at || item.updated_at,
    closed_at: prDetails.closed_at || item.closed_at,
    merged_at: prDetails.merged_at || item.merged_at,
    merged: prDetails.merged !== undefined ? prDetails.merged : item.merged,
    state: prDetails.state || item.state,
  };

  // Update title based on event type
  if (item.originalEventType === 'PullRequestReviewEvent') {
    enrichedItem.title = `Review on: ${prDetails.title}`;
  } else if (item.originalEventType === 'PullRequestReviewCommentEvent') {
    enrichedItem.title = `Review comment on: ${prDetails.title}`;
  } else if (item.title?.match(/^Pull Request #\d+/)) {
    const actionMatch = item.title?.match(/^Pull Request #\d+ (.+)$/);
    const action = actionMatch ? actionMatch[1] : '';
    enrichedItem.title = action ? `${prDetails.title} (${action})` : prDetails.title;
  }

  return enrichedItem;
};

/**
 * Enriches multiple GitHubItems with PR details in batch
 * Only fetches details for items that need enrichment
 */
export const enrichItemsWithPRDetails = async (
  items: GitHubItem[],
  githubToken?: string,
  onProgress?: (current: number, total: number) => void
): Promise<GitHubItem[]> => {
  if (!githubToken) {
    return items;
  }

  const itemsNeedingEnrichment = items.filter(needsPREnrichment);

  if (itemsNeedingEnrichment.length === 0) {
    return items;
  }

  console.log(`Enriching ${itemsNeedingEnrichment.length} items with PR details...`);

  const enrichmentMap = new Map<number, GitHubItem>();

  let processed = 0;
  for (const item of itemsNeedingEnrichment) {
    const enrichedItem = await enrichItemWithPRDetails(item, githubToken);
    enrichmentMap.set(item.id, enrichedItem);

    processed++;
    if (onProgress) {
      onProgress(processed, itemsNeedingEnrichment.length);
    }

    // Add a small delay to respect rate limits
    if (processed < itemsNeedingEnrichment.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return items.map((item) => enrichmentMap.get(item.id) || item);
};

/**
 * Clears the PR details cache
 */
export const clearPRCache = (): void => {
  prCache.clear();
};

/**
 * Gets the current cache size (for debugging/monitoring)
 */
export const getPRCacheSize = (): number => {
  return prCache.size;
};
