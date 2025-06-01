import '@testing-library/jest-dom';
import { vi, beforeAll, afterAll, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Storage Mock Class
class StorageMock {
  private store: { [key: string]: string } = {};

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }
}

// Mock IntersectionObserver
class IntersectionObserverMock implements IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];

  constructor(
    private callback: IntersectionObserverCallback,
    private options: IntersectionObserverInit = {}
  ) {
    if (options.root instanceof Element) this.root = options.root;
    if (options.rootMargin) this.rootMargin = options.rootMargin;
    if (options.threshold) this.thresholds = Array.isArray(options.threshold) ? options.threshold : [options.threshold];
  }

  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
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

// @ts-ignore: Ignore type mismatch for testing purposes
window.IntersectionObserver = IntersectionObserverMock;

// Mock URL handling
const BASE_URL = 'http://localhost:3000';

function parseUrl(url: string): { pathname: string; search: string; hash: string } {
  let pathname = '/';
  let search = '';
  let hash = '';
  
  if (!url) return { pathname, search, hash };
  
  // Handle hash first
  const hashIndex = url.indexOf('#');
  if (hashIndex !== -1) {
    hash = url.substring(hashIndex);
    url = url.substring(0, hashIndex);
  }
  
  // Handle search parameters
  const searchIndex = url.indexOf('?');
  if (searchIndex !== -1) {
    search = url.substring(searchIndex);
    pathname = url.substring(0, searchIndex) || '/';
  } else {
    pathname = url || '/';
  }
  
  // Ensure pathname starts with /
  if (!pathname.startsWith('/')) {
    pathname = '/' + pathname;
  }
  
  return { pathname, search, hash };
}

// Mock URL class
class MockURL {
  private _pathname: string = '/';
  private _search: string = '';
  private _hash: string = '';
  private _origin: string = BASE_URL;
  private _protocol: string = 'http:';
  private _host: string = 'localhost:3000';
  private _hostname: string = 'localhost';
  private _port: string = '3000';
  private _searchParams: URLSearchParams;

  constructor(url: string, base?: string) {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      const [protocol, rest] = url.split('://');
      const [host, ...pathParts] = rest.split('/');
      this._protocol = `${protocol}:`;
      this._host = host;
      this._hostname = host.split(':')[0];
      this._port = host.split(':')[1] || '';
      this._origin = `${protocol}://${host}`;
      const pathAndQuery = pathParts.join('/');
      const parsed = parseUrl(pathAndQuery);
      this._pathname = parsed.pathname;
      this._search = parsed.search;
      this._hash = parsed.hash;
    } else {
      const parsed = parseUrl(url);
      this._pathname = parsed.pathname;
      this._search = parsed.search;
      this._hash = parsed.hash;
    }
    
    // Initialize searchParams
    this._searchParams = new URLSearchParams(this._search.startsWith('?') ? this._search.slice(1) : this._search);
  }

  get href() { 
    return `${this._origin}${this._pathname}${this._search}${this._hash}`;
  }
  
  get search() { 
    return this._search; 
  }
  
  set search(value: string) {
    this._search = value.startsWith('?') ? value : (value ? `?${value}` : '');
    this._searchParams = new URLSearchParams(this._search.startsWith('?') ? this._search.slice(1) : this._search);
  }
  
  get searchParams() {
    // Return a proxy that updates the internal search when modified
    const self = this;
    return new Proxy(this._searchParams, {
      get(target, prop) {
        const value = target[prop as keyof URLSearchParams];
        if (typeof value === 'function') {
          return function(this: URLSearchParams, ...args: any[]) {
            const result = (value as Function).apply(target, args);
            // Update the internal search string after any modification
            const searchString = target.toString();
            self._search = searchString ? `?${searchString}` : '';
            return result;
          };
        }
        return value;
      }
    });
  }
  
  get pathname() { return this._pathname; }
  get hash() { return this._hash; }
  get host() { return this._host; }
  get hostname() { return this._hostname; }
  get origin() { return this._origin; }
  get port() { return this._port; }
  get protocol() { return this._protocol; }

  toString() { return this.href; }
}

// Mock location
const locationMock = {
  _pathname: '/',
  _search: '',
  _hash: '',
  _origin: BASE_URL,
  get href() { 
    return `${this._origin}${this._pathname}${this._search}${this._hash}`;
  },
  set href(value: string) {
    if (value.startsWith('http://') || value.startsWith('https://')) {
      const [protocol, rest] = value.split('://')
      const [host, ...pathParts] = rest.split('/')
      this._origin = `${protocol}://${host}`
      const pathAndQuery = pathParts.join('/')
      const parsed = parseUrl(pathAndQuery)
      this._pathname = parsed.pathname
      this._search = parsed.search
      this._hash = parsed.hash
    } else {
      const parsed = parseUrl(value)
      this._pathname = parsed.pathname
      this._search = parsed.search
      this._hash = parsed.hash
    }
  },
  get search() { 
    return this._search;
  },
  set search(value: string) {
    this._search = value;
  },
  get pathname() { 
    return this._pathname;
  },
  set pathname(value: string) {
    this._pathname = value;
  },
  get hash() { 
    return this._hash;
  },
  set hash(value: string) {
    this._hash = value;
  },
  get origin() { 
    return this._origin;
  },
  get host() { 
    return this._origin.replace(/^https?:\/\//, '');
  },
  get hostname() { 
    return this.host.split(':')[0];
  },
  get port() { 
    const parts = this.host.split(':');
    return parts.length > 1 ? parts[1] : '';
  },
  get protocol() { 
    return this._origin.startsWith('https') ? 'https:' : 'http:';
  },
  assign: vi.fn(),
  replace: vi.fn(),
  reload: vi.fn(),
  toString() { 
    return this.href;
  }
};

// Override window.location
Object.defineProperty(window, 'location', {
  value: locationMock,
  writable: true,
  configurable: true
});

// Mock history with proper location updates
const originalReplaceState = window.history.replaceState;
window.history.replaceState = vi.fn((state, title, url) => {
  if (url) {
    // Update the location mock when replaceState is called
    if (typeof url === 'string') {
      let fullUrl: string;
      
      if (url.startsWith('http://') || url.startsWith('https://')) {
        fullUrl = url;
      } else if (url.startsWith('/')) {
        fullUrl = `${BASE_URL}${url}`;
      } else if (url.startsWith('?')) {
        fullUrl = `${BASE_URL}${url}`;
      } else {
        fullUrl = `${BASE_URL}/${url}`;
      }
      
      // Parse the URL manually to extract components
      const urlMatch = fullUrl.match(/^(https?:\/\/[^\/\?#]+)(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
      
      if (urlMatch) {
        const [, origin, pathname = '/', search = '', hash = ''] = urlMatch;
        locationMock._origin = origin;
        locationMock._pathname = pathname;
        locationMock._search = search;
        locationMock._hash = hash;
      } else {
        // Fallback for simple cases
        locationMock.href = fullUrl;
      }
    }
  }
  return originalReplaceState.call(window.history, state, title, url);
});

beforeAll(() => {
  // Setup localStorage mock
  Object.defineProperty(window, 'localStorage', { value: localStorageMock });
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });
  // Setup URL mock
  Object.defineProperty(window, 'URL', { value: MockURL });
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
  locationMock.href = BASE_URL;
});

afterAll(() => {
  vi.resetAllMocks();
}); 