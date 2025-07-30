import { describe, it, expect, beforeEach } from 'vitest';
import {
  categorizeItem,
  categorizeItemWithoutDateFiltering,
  groupSummaryData,
  isDateInRange,
} from '../summaryGrouping';
import { SUMMARY_GROUP_NAMES } from '../summaryConstants';
import { GitHubItem } from '../../types';

describe('categorizeItem - PRs Updated', () => {
  const searchedUsernames = ['testuser'];
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
  });
});

describe('categorizeItemWithoutDateFiltering - For Already Date-Filtered Results', () => {
  const searchedUsernames = ['testuser'];
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

    const result = categorizeItemWithoutDateFiltering(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.PRS_UPDATED);
  });

  it('should categorize issue created before timeframe as ISSUES_UPDATED_AUTHOR (since it was found by API)', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe (but API found it, so it's relevant)
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItemWithoutDateFiltering(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR);
  });

  it('should still respect date filtering for actions within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItemWithoutDateFiltering(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
  });

  it('should categorize assigned issue as ISSUES_UPDATED_ASSIGNEE regardless of dates', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Assigned Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Not authored by searched user
    };

    const result = categorizeItemWithoutDateFiltering(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE);
  });
});

describe('categorizeItem - Issues with Date Filtering', () => {
  const searchedUsernames = ['testuser'];
  const addedReviewPRs = new Set<string>();
  const startDate = '2024-01-10';
  const endDate = '2024-01-20';

  beforeEach(() => {
    addedReviewPRs.clear();
  });

  it('should categorize issue created within timeframe as ISSUES_OPENED', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-15T00:00:00Z', // Within timeframe
      updated_at: '2024-01-16T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_OPENED);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_CLOSED);
  });

  it('should categorize issue updated but not created/closed within timeframe as ISSUES_UPDATED_AUTHOR', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Test Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'testuser', avatar_url: '', html_url: '' },
    };

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR);
  });

  it('should categorize assigned issue with activity as ISSUES_UPDATED_ASSIGNEE', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Assigned Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-15T00:00:00Z', // Within timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Not authored by searched user
    };

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBe(SUMMARY_GROUP_NAMES.ISSUES_UPDATED_ASSIGNEE);
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

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
  });

  it('should return null for assigned issue with no activity within timeframe', () => {
    const item: GitHubItem = {
      id: 1,
      html_url: 'https://github.com/test/repo/issues/1',
      title: 'Assigned Issue',
      created_at: '2024-01-05T00:00:00Z', // Before timeframe
      updated_at: '2024-01-25T00:00:00Z', // After timeframe
      state: 'open',
      user: { login: 'otheruser', avatar_url: '', html_url: '' }, // Not authored by searched user
    };

    const result = categorizeItem(item, searchedUsernames, addedReviewPRs, startDate, endDate);
    expect(result).toBeNull();
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
  const username = 'testuser';
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

    const result = groupSummaryData(items, [], username, startDate, endDate);

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

    const result = groupSummaryData(items, [], username, startDate, endDate);

    expect(result[SUMMARY_GROUP_NAMES.PRS_UPDATED]).toHaveLength(0);
  });

  it('should populate ISSUES_OPENED with issues created in timeframe', () => {
    const items: GitHubItem[] = [
      // Issue created within timeframe
      {
        id: 1,
        html_url: 'https://github.com/test/repo/issues/1',
        title: 'New Issue',
        created_at: '2024-01-15T00:00:00Z', // Within timeframe
        updated_at: '2024-01-16T00:00:00Z', // Within timeframe
        state: 'open',
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

    const result = groupSummaryData(items, [], username, startDate, endDate);

    expect(result[SUMMARY_GROUP_NAMES.ISSUES_OPENED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_OPENED][0].title).toBe('New Issue');

    expect(result[SUMMARY_GROUP_NAMES.ISSUES_CLOSED]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_CLOSED][0].title).toBe('Closed Issue');

    expect(result[SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR]).toHaveLength(1);
    expect(result[SUMMARY_GROUP_NAMES.ISSUES_UPDATED_AUTHOR][0].title).toBe('Updated Issue');
  });
}); 