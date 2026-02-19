import { describe, it, expect, beforeEach } from 'vitest';
import {
  categorizeItem,
  groupSummaryData,
  isDateInRange,
} from '../summaryGrouping';
import { SUMMARY_GROUP_NAMES } from '../summaryConstants';
import { GitHubItem } from '../../types';

describe('categorizeItem - PRs Updated', () => {
  const addedReviewPRs = new Set<string>();
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  beforeEach(() => {
    addedReviewPRs.clear();
  });

  it('should categorize PR created before timeframe but updated within as PRS_UPDATED', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_UPDATED);
  });

  it('should not categorize PR as updated if it was created within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_OPENED);
  });

  it('should not categorize PR as updated if it was merged within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      merged_at: '2024-01-15T00:00:00Z', // Merged within timeframe
      state: 'closed',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_MERGED);
  });

  it('should not categorize PR as updated if it was closed within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      closed_at: '2024-01-15T00:00:00Z', // Closed within timeframe
      state: 'closed',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_CLOSED);
  });

  it('should return null for PR updated outside timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
  });

  it('should not categorize merged PR as closed even when closed_at is in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      closed_at: '2024-01-15T00:00:00Z', // Within timeframe
      merged_at: '2024-01-15T00:00:00Z', // Merged within timeframe
      state: 'closed',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_MERGED); // Should be merged, not closed
  });

  it('should handle PR with merged_at nested in pull_request object', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      closed_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'closed',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: {
        url: 'https://github.com/test/repo/pull/1',
        merged_at: '2024-01-15T00:00:00Z', // Merged nested in pull_request
      },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_MERGED); // Should be merged, not closed
  });
});

describe('categorizeItem with applyDateFiltering=false - For Already Date-Filtered Results', () => {
  const addedReviewPRs = new Set<string>();
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  beforeEach(() => {
    addedReviewPRs.clear();
  });

  it('should categorize PR created before timeframe as PRS_UPDATED (since it was found by API)', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/pull/1',
      title: 'Test PR',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe (but API found it, so it's relevant)
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
      pull_request: { url: 'https://github.com/test/repo/pull/1' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_UPDATED);
  });

  it('should categorize issue created before timeframe as ISSUES_UPDATED (since it was found by API)', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe (but API found it, so it's relevant)
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize issue created in timeframe as ISSUES_OPENED when action is opened', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      action: 'opened', // Explicitly opened action
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
  });

  it('should categorize issue created in timeframe as ISSUES_OPENED when no action specified (Search API)', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      // No action field - simulates Search API results
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
  });

  it('should categorize labeled issue as ISSUES_UPDATED even if created in timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      action: 'labeled', // Not an 'opened' action
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize any issue as ISSUES_UPDATED regardless of authorship', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Any Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Different user
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate, false);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });
});

describe('categorizeItem - Issues with Date Filtering', () => {
  const addedReviewPRs = new Set<string>();
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  beforeEach(() => {
    addedReviewPRs.clear();
  });

  it('should categorize issue created within timeframe as ISSUES_OPENED when action is opened', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      action: 'opened', // Explicitly opened action
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
  });

  it('should categorize issue created within timeframe as ISSUES_OPENED when no action specified (Search API)', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      // No action field - simulates Search API results
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
  });

  it('should categorize labeled issue as ISSUES_UPDATED even if created in timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      action: 'labeled', // Not an 'opened' action - should go to ISSUES_UPDATED
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize issue closed within timeframe as ISSUES_CLOSED', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      closed_at: '2024-01-15T00:00:00Z', // Closed within timeframe
      state: 'closed',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_CLOSED);
  });

  it('should categorize issue updated but not created/closed within timeframe as ISSUES_UPDATED', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize any issue with activity as ISSUES_UPDATED regardless of authorship', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Any Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Different user
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should return null for issue with no activity within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
  });

  it('should return null for any issue with no activity within timeframe regardless of authorship', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Any Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Different user
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
  });
});

describe('categorizeItem - Issue Action Handling', () => {
  const addedReviewPRs = new Set<string>();
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  beforeEach(() => {
    addedReviewPRs.clear();
  });

  it('should categorize issue with action=assigned as ISSUES_UPDATED even if created in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z',
      state: 'open',
      action: 'assigned',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize issue with action=unassigned as ISSUES_UPDATED even if created in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      state: 'open',
      action: 'unassigned',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize issue with action=unlabeled as ISSUES_UPDATED even if created in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      state: 'open',
      action: 'unlabeled',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should categorize issue with action=edited as ISSUES_UPDATED even if created in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      state: 'open',
      action: 'edited',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED);
  });

  it('should prioritize ISSUES_CLOSED over action type when closed in range', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z',
      updated_at: '2024-01-16T00:00:00Z',
      closed_at: '2024-01-16T00:00:00Z',
      state: 'closed',
      action: 'closed', // Even with closed action, should be categorized by state
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_CLOSED);
  });
});

describe('isDateInRange', () => {
  it('should return true for date within range', () => {
    expect(isDateInRange('2024-01-15T00:00:00Z', '2024-01-10', '2024-01-20')).toBe(true);
  });

  it('should return true for date on start date', () => {
    expect(isDateInRange('2024-01-10T00:00:00Z', '2024-01-10', '2024-01-20')).toBe(true);
  });

  it('should return true for date on end date', () => {
    expect(isDateInRange('2024-01-20T23:59:59Z', '2024-01-10', '2024-01-20')).toBe(true);
  });

  it('should return false for date before range', () => {
    expect(isDateInRange('2024-01-05T00:00:00Z', '2024-01-10', '2024-01-20')).toBe(false);
  });

  it('should return false for date after range', () => {
    expect(isDateInRange('2024-01-25T00:00:00Z', '2024-01-10', '2024-01-20')).toBe(false);
  });
});

describe('groupSummaryData - Integration Test', () => {
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  it('should populate PRS_UPDATED category with appropriate PRs', () => {
    const items: GitHubItem[] = [
      // PR created before but updated within timeframe - should be in PRS_UPDATED
      {
        id: 1,
        html_url: 'https://github.com/test/repo/pull/1',
        title: 'Updated PR',
        created_at: '2024-01-05T00:00:00Z', // Before timeframe
        updated_at: '2024-01-15T00:00:00Z', // Within timeframe
        state: 'open',
        user: { login: 'testuser', avatar_url: '', html_url: '' },
        pull_request: { url: 'https://github.com/test/repo/pull/1' },
      },
      // PR created within timeframe - should NOT be in PRS_UPDATED
      {
        id: 2,
        html_url: 'https://github.com/test/repo/pull/2',
        title: 'Created PR',
        created_at: '2024-01-15T00:00:00Z', // Within timeframe
        updated_at: '2024-01-16T00:00:00Z', // Within timeframe
        state: 'open',
        user: { login: 'testuser', avatar_url: '', html_url: '' },
        pull_request: { url: 'https://github.com/test/repo/pull/2' },
      },
    ];

    const result = groupSummaryData(items, [], startDate, endDate);

    expect(result[SUMMARY_GROUP_NAMES.PRS_UPDATED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.PRS_UPDATED][0].title).toBe('Updated PR');
    expect(result[SUMMARY_GROUP_NAMES.PRS_OPENED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.PRS_OPENED][0].title).toBe('Created PR');
  });

  it('should handle empty PRS_UPDATED category when no qualifying PRs exist', () => {
    const items: GitHubItem[] = [
      // PR created and updated outside timeframe - should not appear
      {
        id: 1,
        html_url: 'https://github.com/test/repo/pull/1',
        title: 'Old PR',
        created_at: '2024-01-05T00:00:00Z', // Before timeframe
        updated_at: '2024-01-25T00:00:00Z', // After timeframe
        state: 'open',
        user: { login: 'testuser', avatar_url: '', html_url: '' },
        pull_request: { url: 'https://github.com/test/repo/pull/1' },
      },
    ];

    const result = groupSummaryData(items, [], startDate, endDate);

    expect(result[SUMMARY_GROUP_NAMES.PRS_UPDATED]).toHaveLength(0);
  });

  it('should populate ISSUES_OPENED with issues explicitly opened in timeframe', () => {
    const items: GitHubItem[] = [
      // Issue explicitly opened within timeframe
      {
        id: 1,
        html_url: 'https://github.com/test/repo/issues/1',
        title: 'New Issue',
        created_at: '2024-01-15T00:00:00Z', // Within timeframe
        updated_at: '2024-01-16T00:00:00Z', // Within timeframe
        state: 'open',
        action: 'opened', // Explicitly opened action
        user: { login: 'testuser', avatar_url: '', html_url: '' },
      },
      // Issue labeled within timeframe (should go to ISSUES_UPDATED, not OPENED)
      {
        id: 4,
        html_url: 'https://github.com/test/repo/issues/4',
        title: 'Labeled Issue',
        created_at: '2024-01-15T00:00:00Z', // Within timeframe
        updated_at: '2024-01-16T00:00:00Z', // Within timeframe
        state: 'open',
        action: 'labeled', // Not an 'opened' action
        user: { login: 'testuser', avatar_url: '', html_url: '' },
      },
      // Issue closed within timeframe
      {
        id: 2,
        html_url: 'https://github.com/test/repo/issues/2',
        title: 'Closed Issue',
        created_at: '2024-01-05T00:00:00Z', // Before timeframe
        updated_at: '2024-01-16T00:00:00Z', // Within timeframe
        closed_at: '2024-01-15T00:00:00Z', // Closed within timeframe
        state: 'closed',
        user: { login: 'testuser', avatar_url: '', html_url: '' },
      },
      // Issue updated within timeframe but not created or closed
      {
        id: 3,
        html_url: 'https://github.com/test/repo/issues/3',
        title: 'Updated Issue',
        created_at: '2024-01-05T00:00:00Z', // Before timeframe
        updated_at: '2024-01-15T00:00:00Z', // Within timeframe
        state: 'open',
        user: { login: 'testuser', avatar_url: '', html_url: '' },
      },
    ];

    const result = groupSummaryData(items, [], startDate, endDate);

    expect(result[SUMMARY_GROUP_NAMES.ISSUES_OPENED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_OPENED][0].title).toBe('New Issue');

    expect(result[SUMMARY_GROUP_NAMES.ISSUES_CLOSED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_CLOSED][0].title).toBe('Closed Issue');

    // Should include both 'Updated Issue' and 'Labeled Issue'
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_UPDATED]).toHaveLength(2);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map(i => i.title)).toContain('Updated Issue');
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_UPDATED].map(i => i.title)).toContain('Labeled Issue');
  });
}); 