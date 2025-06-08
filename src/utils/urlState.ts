import { FormSettings, UISettings } from '../types';
import { ResultsFilter } from './resultsUtils';

// Define which app state properties can be shared via URL
export interface ShareableState {
  // Form settings
  username: string;
  startDate: string;
  endDate: string;
  apiMode: 'search' | 'events';

  // UI settings
  isCompactView: boolean;

  // Filter settings
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  excludedLabels: string[];
  repoFilters: string[];
  searchText: string;
}

// Map URL parameter names to their types for validation
const urlParamTypes: Record<
  keyof ShareableState,
  'string' | 'boolean' | 'string[]'
> = {
  username: 'string',
  startDate: 'string',
  endDate: 'string',
  apiMode: 'string',
  isCompactView: 'boolean',
  filter: 'string',
  statusFilter: 'string',
  excludedLabels: 'string[]',
  repoFilters: 'string[]',
  searchText: 'string',
};

// Valid values for enum-like parameters
const validValues: Partial<Record<keyof ShareableState, string[]>> = {
  apiMode: ['search', 'events'],
  filter: ['all', 'issue', 'pr', 'comment'],
  statusFilter: ['all', 'open', 'closed', 'merged'],
};

/**
 * Safely parse a URL parameter value based on its expected type
 */
export function parseUrlParam(
  value: string | null,
  type: 'string' | 'boolean' | 'string[]'
): any {
  if (value === null) return null;

  switch (type) {
    case 'string':
      return value;
    case 'boolean':
      return value === 'true';
    case 'string[]':
      return value
        ? value
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : [];
    default:
      return null;
  }
}

/**
 * Validate a URL parameter value against its expected constraints
 */
export function validateUrlParam(
  key: keyof ShareableState,
  value: any
): boolean {
  if (value === null || value === undefined) return true;

  // Check against valid values if they exist
  const validValuesList = validValues[key];
  if (validValuesList && !validValuesList.includes(value)) {
    return false;
  }

  // Additional validation
  switch (key) {
    case 'startDate':
    case 'endDate':
      // Validate date format YYYY-MM-DD
      return /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value));
    case 'username':
      // Basic username validation (more detailed validation happens elsewhere)
      return (
        typeof value === 'string' && value.length > 0 && value.length <= 100
      );
    case 'excludedLabels':
    case 'repoFilters':
      return (
        Array.isArray(value) && value.every(item => typeof item === 'string')
      );
    default:
      return true;
  }
}

/**
 * Parse URL parameters into a shareable state object
 * Only returns parameters that are present and valid
 */
export function parseUrlParams(): Partial<ShareableState> {
  const urlParams = new URLSearchParams(window.location.search);
  const result: Partial<ShareableState> = {};

  for (const [key, type] of Object.entries(urlParamTypes)) {
    const paramKey = key as keyof ShareableState;
    const rawValue = urlParams.get(key);

    if (rawValue !== null) {
      const parsedValue = parseUrlParam(rawValue, type);

      if (validateUrlParam(paramKey, parsedValue)) {
        result[paramKey] = parsedValue;
      } else {
        console.warn(`Invalid URL parameter "${key}" with value "${rawValue}"`);
      }
    }
  }

  return result;
}

/**
 * Generate URL parameters from current app state
 * Only includes non-default values to keep URLs clean
 */
export function generateUrlParams(state: ShareableState): URLSearchParams {
  const defaultState: ShareableState = {
    username: '',
    startDate: (() => {
      const date = new Date();
      date.setDate(date.getDate() - 30);
      return date.toISOString().split('T')[0];
    })(),
    endDate: new Date().toISOString().split('T')[0],
    apiMode: 'search',
    isCompactView: false,
    filter: 'all',
    statusFilter: 'all',
    excludedLabels: [],
    repoFilters: [],
    searchText: '',
  };

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(state)) {
    const paramKey = key as keyof ShareableState;
    const defaultValue = defaultState[paramKey];

    // Only add parameter if it differs from default
    if (JSON.stringify(value) !== JSON.stringify(defaultValue)) {
      if (Array.isArray(value)) {
        if (value.length > 0) {
          params.set(key, value.join(','));
        }
      } else if (value !== '' && value !== false) {
        params.set(key, String(value));
      }
    }
  }

  return params;
}

/**
 * Generate a shareable URL with current app state
 */
export function generateShareableUrl(state: ShareableState): string {
  const params = generateUrlParams(state);
  const url = new URL(window.location.origin + window.location.pathname);

  // Only add search params if there are any
  if (params.toString()) {
    url.search = params.toString();
  }

  return url.toString();
}

/**
 * Clean up URL parameters from the current page
 * This should be called after applying URL params to avoid polluting the URL
 */
export function cleanupUrlParams(): void {
  const url = new URL(window.location.href);

  // Only cleanup if there are actually parameters to clean
  if (url.search) {
    url.search = '';
    window.history.replaceState({}, '', url.toString());
  }
}

/**
 * Copy text to clipboard with error handling
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Extract shareable state from app state objects
 */
export function extractShareableState(
  formSettings: FormSettings,
  uiSettings: UISettings,
  currentFilters: ResultsFilter,
  searchText: string = ''
): ShareableState {
  return {
    username: formSettings.username,
    startDate: formSettings.startDate,
    endDate: formSettings.endDate,
    apiMode: formSettings.apiMode,
    isCompactView: uiSettings.isCompactView,
    filter: currentFilters.filter,
    statusFilter: currentFilters.statusFilter,
    excludedLabels: currentFilters.excludedLabels || [],
    repoFilters: currentFilters.repoFilters || [],
    searchText: searchText,
  };
}

/**
 * Apply URL state overrides to app state objects
 * Returns objects with URL overrides applied
 */
export function applyUrlOverrides(
  urlState: Partial<ShareableState>,
  formSettings: FormSettings,
  uiSettings: UISettings,
  currentFilters: ResultsFilter
): {
  formSettings: FormSettings;
  uiSettings: UISettings;
  currentFilters: ResultsFilter;
  searchText: string;
} {
  const newFormSettings: FormSettings = {
    ...formSettings,
    ...(urlState.username !== undefined && { username: urlState.username }),
    ...(urlState.startDate !== undefined && { startDate: urlState.startDate }),
    ...(urlState.endDate !== undefined && { endDate: urlState.endDate }),
    ...(urlState.apiMode !== undefined && { apiMode: urlState.apiMode }),
  };

  const newUISettings: UISettings = {
    ...uiSettings,
    ...(urlState.isCompactView !== undefined && {
      isCompactView: urlState.isCompactView,
    }),
  };

  const newCurrentFilters: ResultsFilter = {
    ...currentFilters,
    ...(urlState.filter !== undefined && { filter: urlState.filter }),
    ...(urlState.statusFilter !== undefined && {
      statusFilter: urlState.statusFilter,
    }),

    ...(urlState.excludedLabels !== undefined && {
      excludedLabels: urlState.excludedLabels,
    }),
    ...(urlState.repoFilters !== undefined && {
      repoFilters: urlState.repoFilters,
    }),
  };

  return {
    formSettings: newFormSettings,
    uiSettings: newUISettings,
    currentFilters: newCurrentFilters,
    searchText: urlState.searchText || '',
  };
}
