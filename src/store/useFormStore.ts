import { create } from 'zustand';

type ApiMode = 'search' | 'events' | 'summary';

interface FormStoreState {
  // Form settings
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: ApiMode;
  searchText: string;

  // UI state
  loading: boolean;
  loadingProgress: string;
  error: string | null;

  // Counts
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;
}

interface FormStoreActions {
  setUsername: (username: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (mode: ApiMode) => void;
  setSearchText: (text: string) => void;
  handleSearch: () => void;
  validateUsernameFormat: (username: string) => void;
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;
}

type FormStore = FormStoreState & FormStoreActions;

/**
 * Zustand store replacing the former React Context (FormContext).
 *
 * State values and action callbacks are synced from App.tsx via
 * `useFormStoreSync` so that the existing hooks remain the source of truth
 * while consumers get fine-grained subscriptions without a Provider.
 */
const useFormStore = create<FormStore>()(() => ({
  // State defaults
  username: '',
  startDate: '',
  endDate: '',
  githubToken: '',
  apiMode: 'summary',
  searchText: '',
  loading: false,
  loadingProgress: '',
  error: null,
  searchItemsCount: 0,
  eventsCount: 0,
  rawEventsCount: 0,

  // Action stubs – replaced at runtime by App.tsx
  setUsername: () => {},
  setStartDate: () => {},
  setEndDate: () => {},
  setGithubToken: () => {},
  setApiMode: () => {},
  setSearchText: () => {},
  handleSearch: () => {},
  validateUsernameFormat: () => {},
  addAvatarsToCache: () => {},
}));

export { useFormStore };
export type { FormStoreState, FormStoreActions, FormStore };
