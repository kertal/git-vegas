import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Create storage mock with Map implementation
class StorageMock {
  private store = new Map<string, string>();

  getItem = vi.fn((key: string): string | null => {
    return this.store.get(key) || null;
  });

  setItem = vi.fn((key: string, value: string): void => {
    this.store.set(key, value);
  });

  removeItem = vi.fn((key: string): void => {
    this.store.delete(key);
  });

  clear = vi.fn((): void => {
    this.store.clear();
  });
}

const localStorageMock = new StorageMock();
const sessionStorageMock = new StorageMock();

// Mock CSS.supports
Object.defineProperty(window, 'CSS', {
  value: {
    supports: (prop: string, value?: string) => {
      // Handle both method signatures
      if (value === undefined) {
        // Handle combined property-value string
        return true;
      }
      // Handle separate property and value
      return true;
    }
  }
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
  }
  callback: IntersectionObserverCallback;
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
  takeRecords = () => [];
}

window.IntersectionObserver = IntersectionObserverMock;

// Mock URL handling
const BASE_URL = 'http://localhost:3000';

function ensureAbsoluteUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  if (url.startsWith('?')) {
    return `${BASE_URL}${url}`;
  }
  if (url.startsWith('/')) {
    return `${BASE_URL}${url}`;
  }
  return `${BASE_URL}/${url}`;
}

// Mock location
const locationMock = {
  href: BASE_URL,
  search: '',
  pathname: '/',
  hash: '',
  host: 'localhost:3000',
  hostname: 'localhost',
  origin: BASE_URL,
  port: '3000',
  protocol: 'http:',
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  toString: function() { return this.href; }
};

// Mock history
const historyMock = {
  replaceState: vi.fn((state: any, title: string, url: string) => {
    const absoluteUrl = ensureAbsoluteUrl(url);
    const newUrl = new URL(absoluteUrl);
    locationMock.search = newUrl.search;
    locationMock.href = absoluteUrl;
    locationMock.pathname = newUrl.pathname;
  }),
  pushState: vi.fn((state: any, title: string, url: string) => {
    const absoluteUrl = ensureAbsoluteUrl(url);
    const newUrl = new URL(absoluteUrl);
    locationMock.search = newUrl.search;
    locationMock.href = absoluteUrl;
    locationMock.pathname = newUrl.pathname;
  }),
  back: vi.fn(),
  forward: vi.fn(),
  go: vi.fn(),
};

beforeAll(() => {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
  // Setup location mock
  Object.defineProperty(window, 'location', { value: locationMock, writable: true });
  // Setup history mock
  Object.defineProperty(window, 'history', { value: historyMock });
});

afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  // Cleanup React Testing Library
  cleanup();
  // Clear storages
  localStorageMock.clear();
  sessionStorageMock.clear();
  // Reset location
  locationMock.search = '';
  locationMock.href = 'http://localhost:3000';
});

afterAll(() => {
  vi.resetAllMocks();
}); 