import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { FormContextType, ResultsContextType } from '../types';

// Mock FormContext
const mockFormContext: FormContextType = {
  username: 'testuser',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  githubToken: 'test-token',
  apiMode: 'search',
  setUsername: vi.fn(),
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  setGithubToken: vi.fn(),
  setApiMode: vi.fn(),
  handleSearch: vi.fn(),
  handleUsernameBlur: vi.fn(),
  validateUsernameFormat: vi.fn(),
  loading: false,
  loadingProgress: '',
  error: null,
  searchItemsCount: 0,
  eventsCount: 0,
};

// Mock ResultsContext
const mockResultsContext: ResultsContextType = {
  results: [],
  filteredResults: [],
  filter: 'all',
  statusFilter: 'all',
  includedLabels: [],
  excludedLabels: [],
  searchText: '',
  repoFilters: [],
  userFilter: '',
  availableLabels: [],
  setFilter: vi.fn(),
  setStatusFilter: vi.fn(),
  setIncludedLabels: vi.fn(),
  setExcludedLabels: vi.fn(),
  setSearchText: vi.fn(),
  toggleDescriptionVisibility: vi.fn(),
  toggleExpand: vi.fn(),
  copyResultsToClipboard: vi.fn(),
  descriptionVisible: {},
  expanded: {},
  clipboardMessage: null,
  isCompactView: true,
  setIsCompactView: vi.fn(),
  selectedItems: new Set(),
  toggleItemSelection: vi.fn(),
  selectAllItems: vi.fn(),
  clearSelection: vi.fn(),
  setRepoFilters: vi.fn(),
  setUserFilter: vi.fn(),
  isClipboardCopied: vi.fn(() => false),
};

// Create mock contexts - we need to import the actual contexts from App.tsx
// For now, we'll create React contexts here to avoid circular imports
import { createContext } from 'react';

const MockFormContext = createContext<FormContextType | null>(mockFormContext);
const MockResultsContext = createContext<ResultsContextType | null>(mockResultsContext);

// Add any providers that your app needs here
// eslint-disable-next-line react-refresh/only-export-components
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <MockFormContext.Provider value={mockFormContext}>
      <MockResultsContext.Provider value={mockResultsContext}>
        {children}
      </MockResultsContext.Provider>
    </MockFormContext.Provider>
  );
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
// eslint-disable-next-line react-refresh/only-export-components
export * from '@testing-library/react';

// Override render method
export { customRender as render };

// Export mock contexts for individual test customization
export { mockFormContext, mockResultsContext };
