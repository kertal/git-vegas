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
    description?: string 
  }[];
  repository_url?: string;
  repository?: { 
    full_name: string; 
    html_url: string 
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
  setUsername: (value: string) => void;
  setStartDate: (value: string) => void;
  setEndDate: (value: string) => void;
  setGithubToken: (value: string) => void;
  handleSearch: () => void;
  loading: boolean;
  loadingProgress: string;
  error: string | null;
}

export interface ResultsContextType {
  results: GitHubItem[];
  filteredResults: GitHubItem[];
  filter: 'all' | 'issue' | 'pr';
  statusFilter: 'all' | 'open' | 'closed' | 'merged';
  sortOrder: 'updated' | 'created';
  labelFilter: string;
  excludedLabels: string[];
  searchText: string;
  repoFilters: string[];
  availableLabels: string[];
  setFilter: (filter: 'all' | 'issue' | 'pr') => void;
  setStatusFilter: (status: 'all' | 'open' | 'closed' | 'merged') => void;
  setSortOrder: (sort: 'updated' | 'created') => void;
  setLabelFilter: (filter: string) => void;
  setExcludedLabels: React.Dispatch<React.SetStateAction<string[]>>;
  toggleDescriptionVisibility: (id: number) => void;
  toggleExpand: (id: number) => void;
  copyResultsToClipboard: (format?: 'markdown' | 'html') => void;
  descriptionVisible: { [id: number]: boolean };
  expanded: { [id: number]: boolean };
  clipboardMessage: string | null;
  clearAllFilters: () => void;
  isCompactView: boolean;
  setIsCompactView: React.Dispatch<React.SetStateAction<boolean>>;
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