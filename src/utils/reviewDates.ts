import { GitHubItem } from '../types';

/**
 * Review Date Enrichment via GitHub GraphQL API
 *
 * The REST Search API `reviewed-by:` query only tells us that a user reviewed
 * a PR — the `updated:` date filter applies to the PR's last update, not the
 * review timestamp.  The only way to get the actual review submission date is
 * through the GraphQL `timelineItems` on PullRequest nodes.
 *
 * This module batches review-item PRs into a single GraphQL request, extracts
 * the most recent review date per reviewer, and writes it back as `reviewed_at`.
 */

// Maximum PRs to query in a single GraphQL request (keep payload manageable)
const GRAPHQL_BATCH_SIZE = 25;

interface GraphQLReview {
  author: { login: string } | null;
  createdAt: string;
}

interface GraphQLTimelineResponse {
  nodes: GraphQLReview[];
}

interface GraphQLPullRequest {
  timelineItems: GraphQLTimelineResponse;
}

/**
 * Parse owner/repo and PR number from an html_url like
 * "https://github.com/owner/repo/pull/123"
 */
const parsePRUrl = (url: string): { owner: string; repo: string; number: number } | null => {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2], number: parseInt(match[3], 10) };
};

/**
 * Build a batched GraphQL query that fetches the last 30 PullRequestReview
 * timeline items for each PR in the batch.
 *
 * Each PR gets an aliased field like `pr0`, `pr1`, …
 */
const buildBatchQuery = (
  prs: { owner: string; repo: string; number: number }[]
): string => {
  const fragments = prs.map((pr, i) =>
    `pr${i}: repository(owner: "${pr.owner}", name: "${pr.repo}") {
      pullRequest(number: ${pr.number}) {
        timelineItems(itemTypes: PULL_REQUEST_REVIEW, last: 30) {
          nodes {
            ... on PullRequestReview {
              author { login }
              createdAt
            }
          }
        }
      }
    }`
  );
  return `query { ${fragments.join('\n')} }`;
};

/**
 * Execute the GraphQL query and return a map of PR URL → reviewer login → review date.
 */
const fetchReviewDates = async (
  token: string,
  items: GitHubItem[]
): Promise<Map<string, Map<string, string>>> => {
  const result = new Map<string, Map<string, string>>();

  // Parse all PR URLs and pair with their items
  const parsedItems = items
    .map(item => ({ item, parsed: parsePRUrl(item.html_url) }))
    .filter((entry): entry is { item: GitHubItem; parsed: NonNullable<ReturnType<typeof parsePRUrl>> } =>
      entry.parsed !== null
    );

  // Deduplicate by PR URL (multiple reviewers may point to same PR)
  const uniquePRs = new Map<string, { owner: string; repo: string; number: number }>();
  for (const { item, parsed } of parsedItems) {
    uniquePRs.set(item.html_url, parsed);
  }

  const prList = Array.from(uniquePRs.entries());

  // Process in batches
  for (let i = 0; i < prList.length; i += GRAPHQL_BATCH_SIZE) {
    const batch = prList.slice(i, i + GRAPHQL_BATCH_SIZE);
    const prs = batch.map(([, parsed]) => parsed);
    const urls = batch.map(([url]) => url);

    const query = buildBatchQuery(prs);

    try {
      const response = await fetch('https://api.github.com/graphql', {
        method: 'POST',
        headers: {
          Authorization: `bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        console.warn(`GraphQL review-dates request failed (${response.status}), skipping batch`);
        continue;
      }

      const json = await response.json();

      if (json.errors) {
        console.warn('GraphQL review-dates query returned errors:', json.errors);
        // Still try to process partial data if available
      }

      const data = json.data as Record<string, { pullRequest: GraphQLPullRequest | null } | null> | undefined;
      if (!data) continue;

      for (let j = 0; j < urls.length; j++) {
        const prData = data[`pr${j}`]?.pullRequest;
        if (!prData) continue;

        const reviewerMap = new Map<string, string>();
        for (const review of prData.timelineItems.nodes) {
          const login = review.author?.login?.toLowerCase();
          if (!login) continue;

          // Keep the most recent review date per reviewer
          const existing = reviewerMap.get(login);
          if (!existing || new Date(review.createdAt) > new Date(existing)) {
            reviewerMap.set(login, review.createdAt);
          }
        }

        result.set(urls[j], reviewerMap);
      }
    } catch (err) {
      console.warn('GraphQL review-dates fetch error, skipping batch:', err);
    }
  }

  return result;
};

/**
 * Enrich review items with the actual review submission date (`reviewed_at`).
 *
 * For each item that has `reviewedBy`, looks up the most recent
 * PullRequestReview by that reviewer on that PR via the GraphQL API.
 *
 * Items that can't be enriched (e.g., non-PR URLs, API errors) are left
 * unchanged — `reviewed_at` will remain undefined and callers should fall
 * back to `updated_at`.
 */
export const enrichReviewItemsWithDates = async (
  items: GitHubItem[],
  token: string,
  onProgress?: (current: number, total: number) => void
): Promise<GitHubItem[]> => {
  if (items.length === 0 || !token) return items;

  onProgress?.(0, items.length);

  const reviewDatesMap = await fetchReviewDates(token, items);

  onProgress?.(items.length, items.length);

  return items.map(item => {
    const reviewerLogin = item.reviewedBy?.login?.toLowerCase();
    if (!reviewerLogin) return item;

    const prReviews = reviewDatesMap.get(item.html_url);
    if (!prReviews) return item;

    const reviewDate = prReviews.get(reviewerLogin);
    if (!reviewDate) return item;

    return { ...item, reviewed_at: reviewDate };
  });
};
