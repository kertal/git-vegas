import { GitHubItem } from '../types';
import { getContrastColor } from '../utils';
import { truncateMiddle } from './textUtils';

export interface ClipboardOptions {
  isCompactView: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  isGroupedView?: boolean;
  groupedData?: Array<{
    groupName: string;
    items: GitHubItem[];
  }>;
}

export interface ClipboardResult {
  success: boolean;
  message: string;
  error?: Error;
}

/**
 * Formats a date string for display
 */
export const formatDateForClipboard = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString();
};

/**
 * Deduplicates items by title, keeping the most recent item for each unique title
 * @param items - Array of GitHub items to deduplicate
 * @returns Array of deduplicated items
 */
export const deduplicateByTitle = (items: GitHubItem[]): GitHubItem[] => {
  const keyMap = new Map<string, GitHubItem>();

  items.forEach(item => {
    // For reviews, use user+title as the deduplication key to allow multiple reviewers per PR
    const isReview = item.title.startsWith('Review on:') || item.originalEventType === 'PullRequestReviewEvent';
    const deduplicationKey = isReview 
      ? `${item.user.login}:${item.title}` 
      : item.title;
    
    const existing = keyMap.get(deduplicationKey);
    if (!existing) {
      keyMap.set(deduplicationKey, item);
    } else {
      // Keep the more recent item based on updated_at
      const itemDate = new Date(item.updated_at).getTime();
      const existingDate = new Date(existing.updated_at).getTime();
      if (itemDate > existingDate) {
        keyMap.set(deduplicationKey, item);
      }
    }
  });

  return Array.from(keyMap.values());
};

/**
 * Deduplicates items across all groups, removing items that appear in earlier groups
 * For reviews, deduplicates by user+title to allow multiple people to review the same PR
 * @param groupedData - Array of grouped data with items
 * @returns Array of grouped data with global deduplication applied
 */
export const deduplicateAcrossGroups = (
  groupedData: Array<{ groupName: string; items: GitHubItem[] }>
): Array<{ groupName: string; items: GitHubItem[] }> => {
  const seenKeys = new Set<string>();
  
  return groupedData.map(group => {
    // First deduplicate within the group to get the most recent version of each title
    const deduplicatedWithinGroup = deduplicateByTitle(group.items);
    
    // Then filter out items that were already seen in previous groups
    const globallyDeduplicatedItems = deduplicatedWithinGroup.filter(item => {
      // For reviews, use user+title as the deduplication key to allow multiple reviewers per PR
      const isReview = item.title.startsWith('Review on:') || item.originalEventType === 'PullRequestReviewEvent';
      const deduplicationKey = isReview 
        ? `${item.user.login}:${item.title}` 
        : item.title;
      
      if (seenKeys.has(deduplicationKey)) {
        return false; // Skip this item as it was already seen in an earlier group
      }
      seenKeys.add(deduplicationKey);
      return true;
    });
    
    return {
      ...group,
      items: globallyDeduplicatedItems
    };
  });
};

/**
 * Generates plain text format for GitHub items
 */
export const generatePlainTextFormat = (
  items: GitHubItem[],
  isCompactView: boolean,
  options?: { isGroupedView?: boolean; groupedData?: Array<{ groupName: string; items: GitHubItem[] }> }
): string => {
  // Handle grouped view
  if (options?.isGroupedView && options?.groupedData) {
    if (isCompactView) {
      // Apply global deduplication across all groups
      const globallyDeduplicatedGroups = deduplicateAcrossGroups(options.groupedData);
      
      return globallyDeduplicatedGroups
        .map(group => {
          if (group.items.length === 0) {
            return null; // Skip empty groups
          }
          
          const groupHeader = `${group.groupName}`;
          const groupItems = group.items
            .map(item => {
              const truncatedTitle = truncateMiddle(item.title, 100);
              return `- ${truncatedTitle} - ${item.html_url}`;
            })
            .join('\n');
          return `${groupHeader}\n${groupItems}`;
        })
        .filter(group => group !== null) // Remove empty groups
        .join('\n\n');
    } else {
      // Detailed grouped format
      // Apply global deduplication across all groups
      const globallyDeduplicatedGroups = deduplicateAcrossGroups(options.groupedData);
      const nonEmptyGroups = globallyDeduplicatedGroups.filter(group => group.items.length > 0);
      
      let plainText = '';
      nonEmptyGroups.forEach((group, groupIndex) => {
        plainText += `${group.groupName}\n`;
        plainText += '='.repeat(group.groupName.length) + '\n\n';
        
        group.items.forEach((item, index) => {
          plainText += `${index + 1}. ${item.title}\n`;
          plainText += `   Link: ${item.html_url}\n`;
          plainText += `   Type: ${item.pull_request ? 'Pull Request' : 'Issue'}${item.pull_request && (item.draft || item.pull_request.draft) ? ' (DRAFT)' : ''}\n`;
          plainText += `   Status: ${item.state}${item.merged ? ' (merged)' : ''}\n`;
          plainText += `   Created: ${formatDateForClipboard(item.created_at)}\n`;
          plainText += `   Updated: ${formatDateForClipboard(item.updated_at)}\n`;
          if (item.labels?.length) {
            plainText += `   Labels: ${item.labels.map(l => l.name).join(', ')}\n`;
          }
          if (item.body) {
            plainText += `   Description:\n${item.body
              .split('\n')
              .map(line => `     ${line}`)
              .join('\n')}\n`;
          }
          plainText += '\n';
        });
        
        if (groupIndex < nonEmptyGroups.length - 1) {
          plainText += '\n';
        }
      });
      return plainText;
    }
  }

  // Handle regular view
  if (isCompactView) {
    // Deduplicate items by title and apply truncation
    const deduplicatedItems = deduplicateByTitle(items);
    return deduplicatedItems
      .map(item => {
        const truncatedTitle = truncateMiddle(item.title, 100);
        return `${truncatedTitle} - ${item.html_url}`;
      })
      .join('\n');
  }

  // Detailed format - do NOT deduplicate, users expect to see all items with full context
  let plainText = '';
  items.forEach((item, index) => {
    plainText += `${index + 1}. ${item.title}\n`;
    plainText += `   Link: ${item.html_url}\n`;
    plainText += `   Type: ${item.pull_request ? 'Pull Request' : 'Issue'}${item.pull_request && (item.draft || item.pull_request.draft) ? ' (DRAFT)' : ''}\n`;
    plainText += `   Status: ${item.state}${item.merged ? ' (merged)' : ''}\n`;
    plainText += `   Created: ${formatDateForClipboard(item.created_at)}\n`;
    plainText += `   Updated: ${formatDateForClipboard(item.updated_at)}\n`;
    if (item.labels?.length) {
      plainText += `   Labels: ${item.labels.map(l => l.name).join(', ')}\n`;
    }
    if (item.body) {
      plainText += `   Description:\n${item.body
        .split('\n')
        .map(line => `     ${line}`)
        .join('\n')}\n`;
    }
    plainText += '\n';
  });

  return plainText;
};

/**
 * Generates HTML format for GitHub items
 */
export const generateHtmlFormat = (
  items: GitHubItem[],
  isCompactView: boolean,
  options?: { isGroupedView?: boolean; groupedData?: Array<{ groupName: string; items: GitHubItem[] }> }
): string => {
  // Handle grouped view
  if (options?.isGroupedView && options?.groupedData) {
    if (isCompactView) {
      // Apply global deduplication across all groups
      const globallyDeduplicatedGroups = deduplicateAcrossGroups(options.groupedData);
      
      const groupedContent = globallyDeduplicatedGroups
        .map(group => {
          if (group.items.length === 0) {
            return ''; // Skip empty groups
          }
          
          const listItems = group.items
            .map(item => {
              const truncatedTitle = truncateMiddle(item.title, 100);
              return `
        <li>
          <a href="${item.html_url}">${truncatedTitle}</a>
        </li>`;
            })
            .join('');

          return `
    <div style="margin-bottom: 16px;">
      <h3 style="margin-bottom: 8px; color: #1f2328;">${group.groupName}</h3>
      <ul>
        ${listItems}
      </ul>
    </div>`;
        })
        .filter(content => content !== '') // Remove empty group content
        .join('');

      return `
<div>
  ${groupedContent}
</div>`;
    }
    // Detailed grouped format would go here if needed
  }

  // Handle regular view
  if (isCompactView) {
    // Deduplicate items by title and apply truncation
    const deduplicatedItems = deduplicateByTitle(items);
    const listItems = deduplicatedItems
      .map(item => {
        const truncatedTitle = truncateMiddle(item.title, 100);
        return `
    <li>
      <a href="${item.html_url}">${truncatedTitle}</a>
    </li>`;
      })
      .join('');

    return `
<div>
  <ul>
    ${listItems}
  </ul>
</div>`;
  }

  // Detailed format
  let htmlContent = '<div>\n';

  items.forEach((item, index) => {
    htmlContent += `<div style="margin-bottom: 16px;">\n`;
    htmlContent += `  <div style="font-size: 16px; margin-bottom: 8px;">\n`;
    htmlContent += `    ${index + 1}. <a href="${item.html_url}" style="color: #0969da; text-decoration: none;">${item.title}</a>\n`;
    htmlContent += `  </div>\n`;
    htmlContent += `  <div style="color: #57606a; font-size: 14px; margin-left: 24px;">\n`;
    htmlContent += `    <div>Type: ${item.pull_request ? 'Pull Request' : 'Issue'}${item.pull_request && (item.draft || item.pull_request.draft) ? ' <span style="color: #9a6700; font-weight: bold;">(DRAFT)</span>' : ''}</div>\n`;
    htmlContent += `    <div>Status: <span style="color: ${
      item.merged ? '#8250df' : item.state === 'closed' ? '#cf222e' : '#1a7f37'
    };">${item.state}${item.merged ? ' (merged)' : ''}</span></div>\n`;
    htmlContent += `    <div>Created: ${formatDateForClipboard(item.created_at)}</div>\n`;
    htmlContent += `    <div>Updated: ${formatDateForClipboard(item.updated_at)}</div>\n`;

    if (item.labels?.length) {
      htmlContent += `    <div style="margin-top: 4px;">Labels: `;
      htmlContent += item.labels
        .map(l => {
          const bgColor = l.color ? `#${l.color}` : '#ededed';
          const textColor = l.color ? getContrastColor(l.color) : '#000000';
          return `<span style="
          display: inline-block;
          padding: 0 7px;
          font-size: 12px;
          font-weight: 500;
          line-height: 18px;
          border-radius: 2em;
          background-color: ${bgColor};
          color: ${textColor};
          margin-right: 4px;
        ">${l.name}</span>`;
        })
        .join('');
      htmlContent += `</div>\n`;
    }

    if (item.body) {
      htmlContent += `    <div style="margin-top: 8px;">Description:</div>\n`;
      htmlContent += `    <div style="
        margin-left: 8px;
        padding: 8px;
        background-color: #f6f8fa;
        border-radius: 6px;
        white-space: pre-wrap;
        font-family: monospace;
      ">${item.body}</div>\n`;
    }

    htmlContent += `  </div>\n`;
    htmlContent += `</div>\n`;
  });

  htmlContent += '</div>';
  return htmlContent;
};

/**
 * Generates a list of links from GitHub items
 */
export const generateLinksFormat = (items: GitHubItem[]): string => {
  return items
    .map(item => `${item.title}\n${item.html_url}`)
    .join('\n\n');
};



/**
 * Copies GitHub items to clipboard with both text and HTML formats
 */
export const copyResultsToClipboard = async (
  items: GitHubItem[],
  options: ClipboardOptions
): Promise<ClipboardResult> => {
  try {
    const formatOptions = {
      isGroupedView: options.isGroupedView,
      groupedData: options.groupedData
    };
    const plainText = generatePlainTextFormat(items, options.isCompactView, formatOptions);
    const htmlContent = generateHtmlFormat(items, options.isCompactView, formatOptions);

    // Check if ClipboardItem is available (modern browsers)
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
        'text/html': new Blob([htmlContent], { type: 'text/html' }),
      });

      await navigator.clipboard.write([clipboardItem]);
      const message = 'Results copied to clipboard with formatting!';
      options.onSuccess?.();
      return { success: true, message };
    } else {
      // Fallback to basic text clipboard for older browsers
      await navigator.clipboard.writeText(plainText);
      const message = 'Results copied to clipboard (plain text only)';
      options.onSuccess?.();
      return { success: true, message };
    }
  } catch (error) {
    const err =
      error instanceof Error ? error : new Error('Failed to copy to clipboard');
    options.onError?.(err);
    return { success: false, message: err.message, error: err };
  }
};
