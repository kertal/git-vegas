/**
 * Text manipulation utilities
 */

/**
 * Truncates text from the middle, keeping the beginning and end visible
 * 
 * @param text - The text to truncate
 * @param maxLength - Maximum length of the truncated text (default: 100)
 * @param separator - The separator string to use in the middle (default: ' [...] ')
 * @returns The truncated text or original text if it's shorter than maxLength
 * 
 * @example
 * ```typescript
 * const long = "This is a very long title that should be truncated in the middle to make it more readable";
 * const truncated = truncateMiddle(long, 50);
 * // Result: "This is a very long [...] more readable"
 * ```
 */
export const truncateMiddle = (
  text: string, 
  maxLength: number = 100, 
  separator: string = ' [...] '
): string => {
  if (!text || text.length <= maxLength) {
    return text || '';
  }

  // Calculate how much space we have for actual content
  const separatorLength = separator.length;
  const availableLength = maxLength - separatorLength;
  
  // If the available length is too small, just return the beginning
  if (availableLength <= 0) {
    return text.substring(0, maxLength);
  }

  // Split the available length between start and end
  // Give slightly more space to the beginning (useful for titles)
  const startLength = Math.ceil(availableLength * 0.6);
  const endLength = availableLength - startLength;

  const start = text.substring(0, startLength).trim();
  const end = text.substring(text.length - endLength).trim();

  return `${start}${separator}${end}`;
}; 