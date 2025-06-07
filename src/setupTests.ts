import '@testing-library/jest-dom';
import { expect, afterEach, vi } from 'vitest';
import matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with Testing Library matchers
expect.extend(matchers);

// Mock window.URL
class MockURL {
  searchParams: URLSearchParams;
  href: string;

  constructor(url: string) {
    this.href = url;
    this.searchParams = new URLSearchParams(url.split('?')[1] || '');
  }

  toString() {
    const params = this.searchParams.toString();
    return params ? `${this.href.split('?')[0]}?${params}` : this.href;
  }
}

// Mock window properties and methods used in tests
Object.defineProperty(window, 'URL', { value: MockURL });

// Reset all mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Clean up after each test
afterEach(() => {
  vi.restoreAllMocks();
});
