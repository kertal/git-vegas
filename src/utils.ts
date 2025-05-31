// Debounce function for rate limiting
export const debounce = (fn: Function, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

// Helper function to determine the optimal text color for a given background
export const getContrastColor = (hexColor: string): string => {
  // Convert Hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // YIQ formula to calculate brightness (standard for accessibility)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on brightness
  return yiq >= 128 ? '#000' : '#fff';
};

// Helper function to safely parse a date string
export const isValidDateString = (dateStr: string): boolean => {
  if (!dateStr || typeof dateStr !== 'string') return false;
  // Check for YYYY-MM-DD format
  const dateFormatRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateFormatRegex.test(dateStr)) return false;
  
  // Check if it's a valid date
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

// Helper functions for URL params
export const getParamFromUrl = (param: string): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
};

export const updateUrlParams = (params: Record<string, string | null>): void => {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.replaceState({}, '', url.toString());
};

// GitHub API validation function
export const validateGitHubUsernames = async (usernames: string[], token?: string): Promise<{ valid: string[]; invalid: string[] }> => {
  const valid: string[] = [];
  const invalid: string[] = [];
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  await Promise.all(usernames.map(async (username) => {
    try {
      const response = await fetch(`https://api.github.com/users/${username}`, { headers });
      if (response.ok) {
        valid.push(username);
      } else {
        invalid.push(username);
      }
    } catch {
      invalid.push(username);
    }
  }));

  return { valid, invalid };
}; 