import { truncateMiddle } from './textUtils';

describe('truncateMiddle', () => {
  it('should return original text if shorter than maxLength', () => {
    const text = 'Short text';
    const result = truncateMiddle(text, 50);
    expect(result).toBe(text);
  });

  it('should return original text if equal to maxLength', () => {
    const text = 'Exactly fifty characters long text for testing';
    const result = truncateMiddle(text, text.length);
    expect(result).toBe(text);
  });

  it('should truncate long text from the middle', () => {
    const text = 'This is a very long title that should be truncated in the middle to make it more readable';
    const result = truncateMiddle(text, 50);
    
    expect(result).toContain(' [...] ');
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.startsWith('This is a very long')).toBe(true);
    expect(result.endsWith('more readable')).toBe(true);
  });

  it('should handle custom separator', () => {
    const text = 'This is a very long title that should be truncated in the middle to make it more readable';
    const result = truncateMiddle(text, 50, ' ... ');
    
    expect(result).toContain(' ... ');
    expect(result.length).toBeLessThanOrEqual(50);
  });

  it('should handle very short maxLength', () => {
    const text = 'This is a very long title';
    const result = truncateMiddle(text, 10);
    
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should handle empty text', () => {
    const result = truncateMiddle('', 50);
    expect(result).toBe('');
  });

  it('should handle null/undefined text', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result1 = truncateMiddle(null as any, 50);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = truncateMiddle(undefined as any, 50);
    expect(result1).toBe('');
    expect(result2).toBe('');
  });

  it('should give more space to the beginning (60/40 split)', () => {
    const text = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA_BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
    const result = truncateMiddle(text, 50);
    
    // Should have more A's than B's due to 60/40 split
    const startPart = result.split(' [...] ')[0];
    const endPart = result.split(' [...] ')[1];
    
    expect(startPart.length).toBeGreaterThan(endPart.length);
  });

  it('should trim whitespace from start and end parts', () => {
    const text = 'This is some text with    lots of spaces    that should be trimmed properly';
    const result = truncateMiddle(text, 50);
    
    const parts = result.split(' [...] ');
    expect(parts[0]).not.toMatch(/\s+$/); // Should not end with whitespace
    expect(parts[1]).not.toMatch(/^\s+/); // Should not start with whitespace
  });
}); 