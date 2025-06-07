// GitHub API Types
export interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;
    url?: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  body?: string;
  labels?: {
    name: string;
    color?: string;
    description?: string;
  }[];
  repository_url?: string;
  repository?: {
    full_name: string;
    html_url: string;
  };
  merged?: boolean;
  merged_at?: string;
  closed_at?: string;
  number?: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
}

// Context Types
export interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events';
  setUsername: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setGithubToken: (value: string) => void;
  setApiMode: (value: 'search' | 'events') => void;
  handleSearch: () => void;
  handleUsernameBlur: () => Promise<void>;
  validateUsernameFormat: (username: string) => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
}

export interface ResultsContextType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  sortOrder: 'updated' | 'created';
  labelFilter: string;
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (sort: 'updated' | 'created') => void;
  setLabelFilter: (filter: string) => void;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format: 'detailed' | 'compact') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  clearAllFilters: () => void;
  isCompactView: boolean;
  setIsCompactView: React.Dispatch<React.SetStateAction<boolean>>;
  selectedItems: Set<number>;
  toggleItemSelection: (id: number) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
}

// Component Props Types
export interface SlotMachineLoaderProps {
  avatarUrls: string[];
  isLoading: boolean;
  isManuallySpinning?: boolean;
}

export interface SettingsDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
}

/**
 * Consolidated settings types for localStorage optimization
 */

// Form-related settings that are used together
export interface FormSettings {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events';
}

// UI/Display settings that control how data is presented
export interface UISettings {
  isCompactView: boolean;
  sortOrder: 'updated' | 'created';
}

// Item-specific UI state (visibility, expansion, selection)
export interface ItemUIState {
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  selectedItems: Set<number>;
}

// Username validation cache for API optimization
export interface UsernameCache {
  validatedUsernames: Set<string>;
  invalidUsernames: Set<string>;
}
