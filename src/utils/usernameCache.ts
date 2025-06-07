import React from 'react';

/**
 * Username Cache Management Utilities
 *
 * Provides functions for managing cached validation state of GitHub usernames
 * to avoid repeated API calls for username validation.
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
