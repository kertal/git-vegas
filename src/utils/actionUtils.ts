/**
 * Utilities for handling GitHub event actions
 */

export type LabelVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'attention' | 'severe' | 'danger' | 'done' | 'sponsors';

/**
 * Get the appropriate Primer Label color variant for a GitHub event action
 *
 * @param action - The action string from the GitHub event (e.g., 'opened', 'closed', 'merged')
 * @returns The Primer Label variant to use for styling
 */
export const getActionVariant = (action: string | undefined): LabelVariant => {
  if (!action) return 'secondary';

  switch (action.toLowerCase()) {
    case 'opened':
    case 'created':
    case 'forked':
      return 'success';
    case 'closed':
    case 'deleted':
      return 'danger';
    case 'merged':
      return 'done';
    case 'synchronize':
    case 'pushed':
      return 'accent';
    case 'reopened':
    case 'ready_for_review':
      return 'attention';
    case 'submitted':
    case 'edited':
    case 'labeled':
    case 'assigned':
      return 'secondary';
    case 'started':
    case 'publicized':
      return 'sponsors';
    default:
      return 'secondary';
  }
};
