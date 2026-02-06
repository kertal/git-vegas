/**
 * Detects if the code is running in a test environment (jsdom, vitest, jest).
 */
export const isTestEnvironment = (): boolean =>
  typeof window !== 'undefined' &&
  (window.navigator?.userAgent?.includes('jsdom') ||
    process.env.NODE_ENV === 'test' ||
    import.meta.env?.MODE === 'test');
