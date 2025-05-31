import '@testing-library/jest-dom';

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
  jest.clearAllMocks();
}); 