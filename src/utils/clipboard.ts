import { GitHubItem } from '../types';
import { getContrastColor } from '../utils';

export interface ClipboardOptions {
  isCompactView: boolean;
  onSuccess?: (message: string) => void;
  onError?: (error: Error) => void;
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
 * Generates plain text format for GitHub items
 */
export const generatePlainTextFormat = (
  items: GitHubItem[], 
  isCompactView: boolean
): string => {
  if (isCompactView) {
    return items.map((item) => {
      const status = item.pull_request
        ? (item.pull_request.merged_at || item.merged) ? 'merged'
          : item.state
        : item.state;
      return `${item.title} (${status}) - ${item.html_url}`;
    }).join('\n');
  }

  // Detailed format
  let plainText = '';
  items.forEach((item, index) => {
    plainText += `${index + 1}. ${item.title}\n`;
    plainText += `   Link: ${item.html_url}\n`;
    plainText += `   Type: ${item.pull_request ? 'Pull Request' : 'Issue'}\n`;
    plainText += `   Status: ${item.state}${item.merged ? ' (merged)' : ''}\n`;
    plainText += `   Created: ${formatDateForClipboard(item.created_at)}\n`;
    plainText += `   Updated: ${formatDateForClipboard(item.updated_at)}\n`;
    if (item.labels?.length) {
      plainText += `   Labels: ${item.labels.map(l => l.name).join(', ')}\n`;
    }
    if (item.body) {
      plainText += `   Description:\n${item.body.split('\n').map(line => `     ${line}`).join('\n')}\n`;
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
  isCompactView: boolean
): string => {
  if (isCompactView) {
    const listItems = items.map(item => {
      const status = item.pull_request
        ? (item.pull_request.merged_at || item.merged) ? 'merged'
          : item.state
        : item.state;
      const statusColor = 
        (item.pull_request?.merged_at || item.merged) ? '#8250df' :
        item.state === 'closed' ? '#cf222e' : '#1a7f37';
      
      return `
    <li>
      <a href="${item.html_url}">${item.title}</a>
      <span style="color: ${statusColor};">(${status})</span>
    </li>`;
    }).join('');

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
    htmlContent += `    <div>Type: ${item.pull_request ? 'Pull Request' : 'Issue'}</div>\n`;
    htmlContent += `    <div>Status: <span style="color: ${
      item.merged ? '#8250df' : 
      item.state === 'closed' ? '#cf222e' : '#1a7f37'
    };">${item.state}${item.merged ? ' (merged)' : ''}</span></div>\n`;
    htmlContent += `    <div>Created: ${formatDateForClipboard(item.created_at)}</div>\n`;
    htmlContent += `    <div>Updated: ${formatDateForClipboard(item.updated_at)}</div>\n`;
    
    if (item.labels?.length) {
      htmlContent += `    <div style="margin-top: 4px;">Labels: `;
      htmlContent += item.labels.map(l => {
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
      }).join('');
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
 * Copies GitHub items to clipboard with both text and HTML formats
 */
export const copyResultsToClipboard = async (
  items: GitHubItem[], 
  options: ClipboardOptions
): Promise<ClipboardResult> => {
  try {
    const plainText = generatePlainTextFormat(items, options.isCompactView);
    const htmlContent = generateHtmlFormat(items, options.isCompactView);

    // Check if ClipboardItem is available (modern browsers)
    if (typeof ClipboardItem !== 'undefined') {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([plainText], { type: 'text/plain' }),
        'text/html': new Blob([htmlContent], { type: 'text/html' })
      });
      
      await navigator.clipboard.write([clipboardItem]);
      const message = 'Results copied to clipboard with formatting!';
      options.onSuccess?.(message);
      return { success: true, message };
    } else {
      // Fallback to basic text clipboard for older browsers
      await navigator.clipboard.writeText(plainText);
      const message = 'Results copied to clipboard (plain text only)';
      options.onSuccess?.(message);
      return { success: true, message };
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Failed to copy to clipboard');
    options.onError?.(err);
    return { success: false, message: err.message, error: err };
  }
}; 