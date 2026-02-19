import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { getParamFromUrl, isValidDateString, validateUsernameList } from '../utils';
import { isTestEnvironment } from '../utils/environment';

type ApiMode = 'search' | 'events' | 'summary';

interface FormStoreState {
  // Form settings (persisted)
  username: string;
  startDate: string;
  endDate: string;
  githubToken: string;
  apiMode: ApiMode;
  searchText: string;

  // UI state (not persisted)
  loading: boolean;
  loadingProgress: string;
  error: string | null;

  // Counts (not persisted)
  searchItemsCount: number;
  eventsCount: number;
  rawEventsCount: number;

  // Flag: URL params were found and applied (not persisted)
  _hadUrlParams: boolean;
}

interface FormStoreActions {
  setUsername: (username: string) => void;
  setStartDate: (date: string) => void;
  setEndDate: (date: string) => void;
  setGithubToken: (token: string) => void;
  setApiMode: (mode: ApiMode) => void;
  setSearchText: (text: string) => void;

  // Callbacks – registered at runtime by App.tsx
  handleSearch: () => void;
  validateUsernameFormat: (username: string) => void;
  addAvatarsToCache: (avatarUrls: { [username: string]: string }) => void;

  /** Rehydrate from localStorage and process URL parameters. Called once on mount. */
  _initOnMount: () => void;
}

type FormStore = FormStoreState & FormStoreActions;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultStartDate = () =>
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
const defaultEndDate = () =>
  new Date().toISOString().split('T')[0];

/** Read form settings from localStorage (handles both legacy and zustand-persist formats). */
function readPersistedSettings(): Partial<Record<'username' | 'startDate' | 'endDate' | 'githubToken' | 'apiMode' | 'searchText', string>> {
  try {
    const raw = window.localStorage.getItem('github-form-settings');
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const data = parsed?.state ?? parsed;
    if (data && typeof data === 'object') return data;
  } catch { /* ignore */ }
  return {};
}

/** Read legacy searchText stored under its own key (pre-zustand). */
function readLegacySearchText(): string {
  try {
    const raw = window.localStorage.getItem('header-search-text');
    if (raw !== null) return JSON.parse(raw);
  } catch { /* ignore */ }
  return '';
}

// Compute initial state synchronously from localStorage.
function computeInitialState() {
  const persisted = readPersistedSettings();
  const legacySearchText = readLegacySearchText();

  return {
    username: persisted.username || '',
    startDate: persisted.startDate || defaultStartDate(),
    endDate: persisted.endDate || defaultEndDate(),
    githubToken: persisted.githubToken || '',
    apiMode: (persisted.apiMode || 'summary') as ApiMode,
    searchText: persisted.searchText || legacySearchText || '',
  };
}

const initial = computeInitialState();

// Clean up the legacy searchText key now that it's merged into the store
try { window.localStorage.removeItem('header-search-text'); } catch { /* ignore */ }

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const useFormStore = create<FormStore>()(
  persist(
    (set, get) => ({
      // Form settings (persisted) – seeded from localStorage
      username: initial.username,
      startDate: initial.startDate,
      endDate: initial.endDate,
      githubToken: initial.githubToken,
      apiMode: initial.apiMode,
      searchText: initial.searchText,

      // Non-persisted state
      loading: false,
      loadingProgress: '',
      error: null,
      searchItemsCount: 0,
      eventsCount: 0,
      rawEventsCount: 0,
      _hadUrlParams: false,

      // Form setters
      setUsername: (username) => set({ username }),
      setStartDate: (startDate) => set({ startDate }),
      setEndDate: (endDate) => set({ endDate }),
      setGithubToken: (githubToken) => set({ githubToken }),
      setApiMode: (apiMode) => set({ apiMode }),
      setSearchText: (searchText) => set({ searchText }),

      // Callback stubs – replaced at runtime by App.tsx
      handleSearch: () => {},
      validateUsernameFormat: () => {},
      addAvatarsToCache: () => {},

      // Rehydrate from localStorage + process URL params. Called once on mount.
      _initOnMount: () => {
        if (get()._hadUrlParams) return;

        // 1. Rehydrate persisted form settings from localStorage.
        //    This picks up values written after the module was first imported
        //    (important for tests and for fresh page loads).
        const persisted = readPersistedSettings();
        if (Object.keys(persisted).length > 0) {
          set({
            username: persisted.username ?? get().username,
            startDate: persisted.startDate ?? get().startDate,
            endDate: persisted.endDate ?? get().endDate,
            githubToken: persisted.githubToken ?? get().githubToken,
            apiMode: (persisted.apiMode ?? get().apiMode) as ApiMode,
            searchText: persisted.searchText ?? get().searchText,
          });
        }

        // 2. Process URL parameters (override localStorage values).
        const urlUsername = getParamFromUrl('username');
        const urlStartDate = getParamFromUrl('startDate');
        const urlEndDate = getParamFromUrl('endDate');

        if (urlUsername === null && urlStartDate === null && urlEndDate === null) return;

        const updates: Partial<FormStoreState> = { _hadUrlParams: true };

        if (urlUsername !== null) {
          const v = validateUsernameList(urlUsername);
          if (v.errors.length === 0 && v.usernames.length > 0) {
            updates.username = v.usernames.join(',');
          }
        }
        if (urlStartDate !== null && isValidDateString(urlStartDate)) {
          updates.startDate = urlStartDate;
        }
        if (urlEndDate !== null && isValidDateString(urlEndDate)) {
          updates.endDate = urlEndDate;
        }

        set(updates);

        // Clean up URL
        try {
          const url = new URL(window.location.href);
          if (url.search) {
            url.search = '';
            window.history.replaceState({}, '', url.toString());
          }
        } catch { /* ignore in tests */ }

        // Background cache cleanup for shared links
        if (!isTestEnvironment()) {
          (async () => {
            try {
              const { clearCachesKeepToken } = await import('../utils/storageUtils');
              const preservedToken = await clearCachesKeepToken();
              if (preservedToken) {
                useFormStore.setState({ githubToken: preservedToken });
              }
            } catch (e) {
              console.error('Background cache cleanup failed:', e);
            }
          })();
        }
      },
    }),
    {
      name: 'github-form-settings',
      partialize: (state) => ({
        username: state.username,
        startDate: state.startDate,
        endDate: state.endDate,
        githubToken: state.githubToken,
        apiMode: state.apiMode,
        searchText: state.searchText,
      }),
      // Skip auto-hydration – we already read from localStorage in computeInitialState.
      // This avoids hydration-during-commit conflicts that cause infinite render loops.
      skipHydration: true,
      // Custom storage that handles legacy (non-wrapped) data gracefully.
      storage: createJSONStorage(() => ({
        getItem: (name: string) => {
          const raw = window.localStorage.getItem(name);
          if (!raw) return null;
          try {
            const parsed = JSON.parse(raw);
            if (parsed?.state !== undefined) return raw;
            return JSON.stringify({ state: parsed, version: 0 });
          } catch {
            return null;
          }
        },
        setItem: (name: string, value: string) => {
          window.localStorage.setItem(name, value);
        },
        removeItem: (name: string) => {
          window.localStorage.removeItem(name);
        },
      })),
    },
  ),
);

export { useFormStore };
export type { FormStoreState, FormStoreActions, FormStore };
