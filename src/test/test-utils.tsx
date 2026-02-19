import { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { useFormStore } from '../store/useFormStore';
import type { FormStore } from '../store/useFormStore';

// Default mock values for the form store (used by tests that need a populated store)
const mockFormStoreValues: FormStore = {
  username: 'testuser',
  startDate: '2023-01-01',
  endDate: '2023-12-31',
  githubToken: 'test-token',
  apiMode: 'search',
  searchText: '',
  setUsername: vi.fn(),
  setStartDate: vi.fn(),
  setEndDate: vi.fn(),
  setGithubToken: vi.fn(),
  setApiMode: vi.fn(),
  setSearchText: vi.fn(),
  handleSearch: vi.fn(),
  validateUsernameFormat: vi.fn(),
  addAvatarsToCache: vi.fn(),
  loading: false,
  loadingProgress: '',
  error: null,
  searchItemsCount: 0,
  eventsCount: 0,
  rawEventsCount: 0,
};

/**
 * Populate the zustand store with mock values for testing.
 * Call this in beforeEach() to reset the store between tests.
 */
export function seedFormStore(overrides: Partial<FormStore> = {}) {
  useFormStore.setState({ ...mockFormStoreValues, ...overrides });
}

// Simple wrapper – no Providers needed since zustand is provider-free
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
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

// Export mock store values for individual test customization
export { mockFormStoreValues };
