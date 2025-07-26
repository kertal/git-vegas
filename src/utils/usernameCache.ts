import React from 'react';

/**
 * Username Cache Management Utilities
 *
 * Provides functions for managing cached validation state of GitHub usernames
 * and their associated avatar URLs to avoid repeated API calls.
 */

/**
 * Creates a function to add usernames to a Set-based cache
 *
 * @param setter - React state setter function for the Set
 * @returns Function that adds an array of usernames to the cache
 */
export const createAddToCache = (
  setter: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  return (usernames: string[]) => {
    setter(prevSet => {
      const newSet = new Set(prevSet);
      usernames.forEach(u => newSet.add(u));
      return newSet;
    });
  };
};

/**
 * Creates a function to remove a username from a Set-based cache
 *
 * @param setter - React state setter function for the Set
 * @returns Function that removes a username from the cache
 */
export const createRemoveFromCache = (
  setter: React.Dispatch<React.SetStateAction<Set<string>>>
) => {
  return (username: string) => {
    setter(prevSet => {
      const newSet = new Set(prevSet);
      newSet.delete(username);
      return newSet;
    });
  };
};

/**
 * Creates a function to add avatar URLs to a Map-based cache
 *
 * @param setter - React state setter function for the Map
 * @returns Function that adds username-avatar URL mappings to the cache
 */
export const createAddAvatarsToCache = (
  setter: React.Dispatch<React.SetStateAction<Map<string, string>>>
) => {
  return (avatarUrls: Record<string, string>) => {
    setter(prevMap => {
      // Ensure prevMap is a proper Map
      let safeMap: Map<string, string>;
      
      if (prevMap instanceof Map) {
        safeMap = new Map(prevMap);
      } else {
        // If prevMap is not a Map, create a new one
        safeMap = new Map();
        if (prevMap && typeof prevMap === 'object') {
          // Try to reconstruct from plain object
          try {
            Object.entries(prevMap).forEach(([key, value]) => {
              if (typeof value === 'string') {
                safeMap.set(key, value);
              }
            });
          } catch (error) {
            console.warn('Failed to reconstruct avatar cache from previous state:', error);
          }
        }
      }
      
      // Add new avatar URLs
      Object.entries(avatarUrls).forEach(([username, avatarUrl]) => {
        safeMap.set(username, avatarUrl);
      });
      
      return safeMap;
    });
  };
};

/**
 * Creates a function to update the lastFetched timestamp for usernames
 *
 * @param setter - React state setter function for the lastFetched Map
 * @returns Function that updates timestamps for usernames
 */
export const createUpdateLastFetched = (
  setter: React.Dispatch<React.SetStateAction<Map<string, number>>>
) => {
  return (usernames: string[]) => {
    const now = Date.now();
    setter(prevMap => {
      let safeMap: Map<string, number>;
      
      if (prevMap instanceof Map) {
        safeMap = new Map(prevMap);
      } else {
        safeMap = new Map();
        if (prevMap && typeof prevMap === 'object') {
          try {
            Object.entries(prevMap).forEach(([key, value]) => {
              if (typeof value === 'number') {
                safeMap.set(key, value);
              }
            });
          } catch (error) {
            console.warn('Failed to reconstruct lastFetched cache from previous state:', error);
          }
        }
      }
      
      // Update timestamps for the specified usernames
      usernames.forEach(username => {
        safeMap.set(username, now);
      });
      
      return safeMap;
    });
  };
};

/**
 * Checks if cached data for usernames is stale and needs revalidation
 *
 * @param usernames - Array of usernames to check
 * @param lastFetchedCache - Map of username to last fetch timestamp
 * @param maxAgeMs - Maximum age in milliseconds before considering data stale (default: 1 hour)
 * @returns Array of usernames that need revalidation
 */
export const getStaleUsernames = (
  usernames: string[],
  lastFetchedCache: Map<string, number>,
  maxAgeMs: number = 60 * 60 * 1000 // 1 hour default
): string[] => {
  const now = Date.now();
  
  // Ensure lastFetchedCache is a proper Map
  let safeMap: Map<string, number>;
  if (lastFetchedCache instanceof Map) {
    safeMap = lastFetchedCache;
  } else {
    safeMap = new Map();
    if (lastFetchedCache && typeof lastFetchedCache === 'object') {
      try {
        Object.entries(lastFetchedCache).forEach(([key, value]) => {
          if (typeof value === 'number') {
            safeMap.set(key, value);
          }
        });
      } catch (error) {
        console.warn('Failed to reconstruct lastFetched cache:', error);
      }
    }
  }
  
  return usernames.filter(username => {
    const lastFetched = safeMap.get(username);
    return !lastFetched || (now - lastFetched) > maxAgeMs;
  });
};

/**
 * Gets cached avatar URLs for given usernames
 *
 * @param usernames - Array of usernames to get avatars for
 * @param avatarCache - Map of cached username-avatar URL mappings
 * @returns Array of avatar URLs for the usernames (in same order)
 */
export const getCachedAvatarUrls = (
  usernames: string[],
  avatarCache: Map<string, string>
): string[] => {
  // Defensive programming: ensure avatarCache is a proper Map
  let safeAvatarCache: Map<string, string>;
  
  if (avatarCache instanceof Map) {
    safeAvatarCache = avatarCache;
  } else {
    // If avatarCache is not a Map (e.g., plain object from localStorage), convert it
    safeAvatarCache = new Map();
    if (avatarCache && typeof avatarCache === 'object') {
      // Try to reconstruct from plain object
      try {
        Object.entries(avatarCache).forEach(([key, value]) => {
          if (typeof value === 'string') {
            safeAvatarCache.set(key, value);
          }
        });
      } catch (error) {
        console.warn('Failed to reconstruct avatar cache from object:', error);
      }
    }
  }

  return usernames
    .map(username => safeAvatarCache.get(username))
    .filter((url): url is string => !!url);
};

/**
 * Categorizes usernames based on their validation cache status
 *
 * @param usernames - Array of usernames to categorize
 * @param validatedCache - Set of previously validated usernames
 * @param invalidCache - Set of previously invalidated usernames
 * @returns Object containing categorized username arrays
 */
export const categorizeUsernames = (
  usernames: string[],
  validatedCache: Set<string>,
  invalidCache: Set<string>
) => {
  // Defensive programming: ensure caches are Sets
  const safeValidatedCache =
    validatedCache instanceof Set ? validatedCache : new Set<string>();
  const safeInvalidCache =
    invalidCache instanceof Set ? invalidCache : new Set<string>();

  const needValidation = usernames.filter(
    u => !safeValidatedCache.has(u) && !safeInvalidCache.has(u)
  );
  const alreadyValid = usernames.filter(u => safeValidatedCache.has(u));
  // Only include in alreadyInvalid if NOT in validatedCache (prioritize validated)
  const alreadyInvalid = usernames.filter(
    u => safeInvalidCache.has(u) && !safeValidatedCache.has(u)
  );

  return {
    needValidation,
    alreadyValid,
    alreadyInvalid,
  };
};

/**
 * Checks if username validation is needed for any usernames
 *
 * @param usernames - Array of usernames to check
 * @param validatedCache - Set of previously validated usernames
 * @param invalidCache - Set of previously invalidated usernames
 * @returns True if any usernames need validation
 */
export const needsValidation = (
  usernames: string[],
  validatedCache: Set<string>,
  invalidCache: Set<string>
): boolean => {
  const { needValidation } = categorizeUsernames(
    usernames,
    validatedCache,
    invalidCache
  );
  return needValidation.length > 0;
};

/**
 * Gets usernames that are known to be invalid from cache
 *
 * @param usernames - Array of usernames to check
 * @param invalidCache - Set of previously invalidated usernames
 * @returns Array of usernames that are cached as invalid
 */
export const getInvalidUsernames = (
  usernames: string[],
  invalidCache: Set<string>
): string[] => {
  // Defensive programming: ensure invalidCache is a Set
  const safeInvalidCache =
    invalidCache instanceof Set ? invalidCache : new Set<string>();
  return usernames.filter(u => safeInvalidCache.has(u));
};
