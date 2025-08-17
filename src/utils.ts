import { MAX_USERNAMES_PER_REQUEST } from './utils/settings';

// Debounce function for rate limiting
export const debounce = <T extends unknown[]>(fn: (...args: T) => void, ms = 300) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: T) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), ms);
  };
};

// Helper function to determine the optimal text color for a given background
export const getContrastColor = (hexColor: string): string => {
  // Convert Hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);

  // YIQ formula to calculate brightness (standard for accessibility)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;

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

export const updateUrlParams = (
  params: Record<string, string | null>
): void => {
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

// GitHub username validation types
export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface BatchValidationResult {
  valid: string[];
  invalid: string[];
  errors: Record<string, string>;
  avatarUrls: Record<string, string>;
}

// GitHub username format validation
export const validateGitHubUsernameFormat = (
  username: string
): UsernameValidationResult => {
  if (!username || typeof username !== 'string') {
    return { isValid: false, error: 'Username is required' };
  }

  const trimmed = username.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Username cannot be empty' };
  }

  if (trimmed.length < 1) {
    return {
      isValid: false,
      error: 'Username must be at least 1 character long',
    };
  }

  if (trimmed.length > 39) {
    return {
      isValid: false,
      error: 'Username cannot be longer than 39 characters',
    };
  }

  // Check specific GitHub username rules first
  if (trimmed.startsWith('-')) {
    return { isValid: false, error: 'Username cannot begin with a hyphen' };
  }

  if (trimmed.endsWith('-')) {
    return { isValid: false, error: 'Username cannot end with a hyphen' };
  }

  if (trimmed.includes('--')) {
    return {
      isValid: false,
      error: 'Username cannot contain consecutive hyphens',
    };
  }

  // Check for valid characters only (alphanumeric + single hyphens)
  if (!/^[a-zA-Z0-9-]+$/.test(trimmed)) {
    return {
      isValid: false,
      error: 'Username may only contain letters, numbers, and hyphens',
    };
  }

  // Check for reserved usernames
  const reservedUsernames = [
    'admin',
    'api',
    'www',
    'ftp',
    'mail',
    'email',
    'support',
    'help',
    'security',
    'abuse',
    'ghost',
    'anonymous',
    'null',
    'undefined',
    'root',
    'system',
    'user',
    'users',
    'app',
    'application',
    'applications',
  ];

  if (reservedUsernames.includes(trimmed.toLowerCase())) {
    return {
      isValid: false,
      error: 'This username is reserved and cannot be used',
    };
  }

  return { isValid: true };
};

// Validate multiple usernames with format checking
export const validateUsernameList = (
  usernameString: string
): { usernames: string[]; errors: string[] } => {
  const errors: string[] = [];

  if (!usernameString || typeof usernameString !== 'string') {
    return { usernames: [], errors: ['Please enter at least one username'] };
  }

  const usernames = usernameString
    .split(',')
    .map(u => u.trim())
    .filter(Boolean);

  if (usernames.length === 0) {
    return { usernames: [], errors: ['Please enter at least one username'] };
  }

  if (usernames.length > MAX_USERNAMES_PER_REQUEST) {
    errors.push(`Too many usernames. Please limit to ${MAX_USERNAMES_PER_REQUEST} usernames at a time.`);
    return { usernames: usernames.slice(0, MAX_USERNAMES_PER_REQUEST), errors };
  }

  // Check for duplicates
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  usernames.forEach(username => {
    if (seen.has(username)) {
      duplicates.add(username);
    }
    seen.add(username);
  });

  if (duplicates.size > 0) {
    errors.push(
      `Duplicate usernames found: ${Array.from(duplicates).join(', ')}`
    );
  }

  // Validate each username format
  usernames.forEach(username => {
    const validation = validateGitHubUsernameFormat(username);
    if (!validation.isValid) {
      errors.push(`"${username}": ${validation.error}`);
    }
  });

  // Remove duplicates from the final list
  const uniqueUsernames = Array.from(new Set(usernames));

  return { usernames: uniqueUsernames, errors };
};

// GitHub API validation function
export const validateGitHubUsernames = async (
  usernames: string[],
  token?: string
): Promise<BatchValidationResult> => {
  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: Record<string, string> = {};
  const avatarUrls: Record<string, string> = {};

  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  };

  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  await Promise.all(
    usernames.map(async username => {
      // First check format
      const formatValidation = validateGitHubUsernameFormat(username);
      if (!formatValidation.isValid) {
        invalid.push(username);
        errors[username] = formatValidation.error || 'Invalid username format';
        return;
      }

      try {
        const response = await fetch(
          `https://api.github.com/users/${username}`,
          { headers }
        );
        if (response.ok) {
          const userData = await response.json();
          valid.push(username);
          // Cache avatar URL if available
          if (userData.avatar_url) {
            avatarUrls[username] = userData.avatar_url;
          }
        } else if (response.status === 404) {
          invalid.push(username);
          errors[username] = 'Username not found on GitHub';
        } else if (response.status === 403) {
          invalid.push(username);
          errors[username] =
            'API rate limit exceeded. Please try again later or add a GitHub token.';
        } else {
          invalid.push(username);
          errors[username] = `GitHub API error: ${response.status}`;
        }
      } catch {
        invalid.push(username);
        errors[username] = 'Network error while validating username';
      }
    })
  );

  return { valid, invalid, errors, avatarUrls };
};
