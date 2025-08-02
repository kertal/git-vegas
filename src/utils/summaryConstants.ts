// Summary view group name constants
export const SUMMARY_GROUP_NAMES = {
  PRS_OPENED: 'PRs - opened',
  PRS_UPDATED: 'PRs - updated',
  PRS_REVIEWED: 'PRs - reviewed',
  PRS_MERGED: 'PRs - merged', 
  PRS_CLOSED: 'PRs - closed',
  ISSUES_OPENED: 'Issues - opened',
  ISSUES_CLOSED: 'Issues - closed',
  ISSUES_UPDATED_AUTHOR: 'Issues (authored) - updated',
  ISSUES_UPDATED_ASSIGNEE: 'Issues (assigned) - updated',
  COMMITS: 'Commits',
  OTHER_EVENTS: 'Other Events',
} as const;

export type SummaryGroupName = typeof SUMMARY_GROUP_NAMES[keyof typeof SUMMARY_GROUP_NAMES];

// Helper to get all group names as an array
export const getAllGroupNames = (): SummaryGroupName[] => {
  return Object.values(SUMMARY_GROUP_NAMES);
};

// Helper to create empty groups object
export const createEmptyGroups = <T = unknown>(): Record<SummaryGroupName, T[]> => {
  return Object.values(SUMMARY_GROUP_NAMES).reduce((acc, groupName) => {
    acc[groupName] = [];
    return acc;
  }, {} as Record<SummaryGroupName, T[]>);
}; 