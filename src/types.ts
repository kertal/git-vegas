// GitHub API Types
export interface GitHubItem {
  id: number;
  event_id?: string;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;
    url?: string;
    draft?: boolean;
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
  assignee?: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
  assignees?: Array<{
    login: string;
    avatar_url: string;
    html_url: string;
  }>;
  draft?: boolean;
  original?: GitHubEvent['payload'] | Record<string, unknown>; // Original payload from GitHub API
}

// Raw data storage types
export interface RawDataStorage {
  // Raw events from GitHub Events API (legacy - now stored in IndexedDB)
  rawEvents: GitHubEvent[];
  // Raw items from GitHub Search API (stored in localStorage)
  rawSearchItems: GitHubItem[];
  // Metadata about the raw data
  metadata: {
    lastFetch: number;
    usernames: string[];
    apiMode: 'search' | 'events' | 'summary';
    startDate?: string;
    endDate?: string;
  };
}

// GitHub Event type (moved from githubSearch.ts for better organization)
export interface GitHubEvent {
  id: string;
  type: string;
  actor: {
    id: number;
    login: string;
    display_login?: string;
    avatar_url: string;
    url: string;
  };
  repo: {
    id: number;
    name: string;
    url: string;
  };
  payload: {
    action?: string;
    issue?: {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
      body?: string;
      labels: { name: string; color?: string; description?: string }[];
      created_at: string;
      updated_at: string;
      closed_at?: string;
      pull_request?: {
        merged_at?: string;
        url?: string;
      };
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
    pull_request?: {
      id: number;
      number: number;
      title: string;
      html_url: string;
      state: string;
      body?: string;
      labels: { name: string; color?: string; description?: string }[];
      created_at: string;
      updated_at: string;
      closed_at?: string;
      merged_at?: string;
      merged?: boolean;
      draft?: boolean;
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
    comment?: {
      id: number;
      body: string;
      html_url: string;
      created_at: string;
      updated_at: string;
      user: {
        login: string;
        avatar_url: string;
        html_url: string;
      };
    };
  };
  public: boolean;
  created_at: string;
}

// Specific payload types for different GitHub event types
export interface PushEventPayload {
  ref?: string;
  size?: number;
  distinct_size?: number;
  commits?: Array<{
    sha: string;
    message: string;
    author: { name: string; email: string };
  }>;
}

export interface CreateEventPayload {
  ref_type?: string;
  ref?: string;
  master_branch?: string;
  description?: string;
}

export interface ForkEventPayload {
  forkee?: {
    full_name?: string;
    html_url?: string;
  };
}

export interface DeleteEventPayload {
  ref_type?: string;
  ref?: string;
}

export interface GollumEventPayload {
  pages?: Array<{
    page_name: string;
    title: string;
    action: string;
    html_url: string;
  }>;
}

// Context Types
export interface FormContextType {
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: 'search' | 'events' | 'summary';
  setUsername: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setGithubToken: (value: string) => void;
  setApiMode: (value: 'search' | 'events' | 'summary') => void;
  handleSearch: (forceRefresh?: boolean) => void;
  handleUsernameBlur: () => Promise<void>;
  validateUsernameFormat: (username: string) => void;
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
  // Counts for navigation tabs
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount?: number;
}

export interface ResultsContextType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr' | 'comment';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  includedLabels: string[];
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  userFilter: string;
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr' | 'comment') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed' | 'merged') => void;
  setIncludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  setSearchText: (searchText: string) => void;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format: 'detailed' | 'compact') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  isCompactView: boolean;
  setIsCompactView: (value: boolean) => void;
  selectedItems: Set<string | number>;
  toggleItemSelection: (id: string | number) => void;
  selectAllItems: () => void;
  clearSelection: () => void;
  setRepoFilters: React.Dispatch<React.SetStateAction<string[]>>;
  setUserFilter: React.Dispatch<React.SetStateAction<string>>;
  isClipboardCopied: (itemId: string | number) => boolean;
}

// Component Props Types
export interface SlotMachineLoaderProps {
  avatarUrls: string[];
  isLoading: boolean;
  isManuallySpinning?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export interface SettingsDialogProps {
  isOpen: boolean;
  onDismiss: () => void;
  onClearEvents?: () => void;
  onClearSearchItems?: () => void;
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
  apiMode: 'search' | 'events' | 'summary';
}

// UI/Display settings that control how data is presented
// Note: UISettings interface removed as no UI settings are currently needed
// Format for copying is determined by the copy format button clicked ('detailed' | 'compact')

// Item-specific UI state (visibility, expansion, selection)
export interface ItemUIState {
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  selectedItems: Set<string | number>;
}

// Username validation cache for API optimization
export interface UsernameCache {
  validatedUsernames: Set<string>;
  invalidUsernames: Set<string>;
  avatarUrls: Map<string, string>;
  lastFetched: Map<string, number>; // Track when each username was last validated
}




