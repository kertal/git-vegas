import { describe, it, expect, vi } from 'vitest';
import {
  createAddToCache,
  createRemoveFromCache,
  categorizeUsernames,
  needsValidation,
  getInvalidUsernames
} from './usernameCache';

describe('usernameCache utilities', () => {
  describe('createAddToCache', () => {
    it('should create a function that adds usernames to a Set', () => {
      const mockSetter = vi.fn();
      const addToCache = createAddToCache(mockSetter);
      
      addToCache(['user1', 'user2']);
      
      expect(mockSetter).toHaveBeenCalledWith(expect.any(Function));
      
      // Test the function passed to setter
      const setterFunction = mockSetter.mock.calls[0][0];
      const initialSet = new Set(['existing']);
      const result = setterFunction(initialSet);
      
      expect(result).toBeInstanceOf(Set);
      expect(result.has('existing')).toBe(true);
      expect(result.has('user1')).toBe(true);
      expect(result.has('user2')).toBe(true);
      expect(result.size).toBe(3);
    });

    it('should not modify the original Set', () => {
      const mockSetter = vi.fn();
      const addToCache = createAddToCache(mockSetter);
      
      addToCache(['user1']);
      
      const setterFunction = mockSetter.mock.calls[0][0];
      const originalSet = new Set(['existing']);
      const result = setterFunction(originalSet);
      
      expect(originalSet.size).toBe(1);
      expect(result.size).toBe(2);
      expect(originalSet !== result).toBe(true);
    });

    it('should handle duplicate usernames gracefully', () => {
      const mockSetter = vi.fn();
      const addToCache = createAddToCache(mockSetter);
      
      addToCache(['user1', 'user1', 'user2']);
      
      const setterFunction = mockSetter.mock.calls[0][0];
      const result = setterFunction(new Set());
      
      expect(result.size).toBe(2);
      expect(result.has('user1')).toBe(true);
      expect(result.has('user2')).toBe(true);
    });

    it('should handle empty username array', () => {
      const mockSetter = vi.fn();
      const addToCache = createAddToCache(mockSetter);
      
      addToCache([]);
      
      const setterFunction = mockSetter.mock.calls[0][0];
      const originalSet = new Set(['existing']);
      const result = setterFunction(originalSet);
      
      expect(result.size).toBe(1);
      expect(result.has('existing')).toBe(true);
    });
  });

  describe('createRemoveFromCache', () => {
    it('should create a function that removes a username from a Set', () => {
      const mockSetter = vi.fn();
      const removeFromCache = createRemoveFromCache(mockSetter);
      
      removeFromCache('user1');
      
      expect(mockSetter).toHaveBeenCalledWith(expect.any(Function));
      
      // Test the function passed to setter
      const setterFunction = mockSetter.mock.calls[0][0];
      const initialSet = new Set(['user1', 'user2']);
      const result = setterFunction(initialSet);
      
      expect(result).toBeInstanceOf(Set);
      expect(result.has('user1')).toBe(false);
      expect(result.has('user2')).toBe(true);
      expect(result.size).toBe(1);
    });

    it('should not modify the original Set', () => {
      const mockSetter = vi.fn();
      const removeFromCache = createRemoveFromCache(mockSetter);
      
      removeFromCache('user1');
      
      const setterFunction = mockSetter.mock.calls[0][0];
      const originalSet = new Set(['user1', 'user2']);
      const result = setterFunction(originalSet);
      
      expect(originalSet.size).toBe(2);
      expect(result.size).toBe(1);
      expect(originalSet !== result).toBe(true);
    });

    it('should handle removing non-existent username gracefully', () => {
      const mockSetter = vi.fn();
      const removeFromCache = createRemoveFromCache(mockSetter);
      
      removeFromCache('nonexistent');
      
      const setterFunction = mockSetter.mock.calls[0][0];
      const originalSet = new Set(['user1', 'user2']);
      const result = setterFunction(originalSet);
      
      expect(result.size).toBe(2);
      expect(result.has('user1')).toBe(true);
      expect(result.has('user2')).toBe(true);
    });
  });

  describe('categorizeUsernames', () => {
    it('should correctly categorize usernames based on cache status', () => {
      const validatedCache = new Set(['valid1', 'valid2']);
      const invalidCache = new Set(['invalid1']);
      const usernames = ['valid1', 'invalid1', 'new1', 'new2'];
      
      const result = categorizeUsernames(usernames, validatedCache, invalidCache);
      
      expect(result.alreadyValid).toEqual(['valid1']);
      expect(result.alreadyInvalid).toEqual(['invalid1']);
      expect(result.needValidation).toEqual(['new1', 'new2']);
    });

    it('should handle empty caches', () => {
      const validatedCache = new Set<string>();
      const invalidCache = new Set<string>();
      const usernames = ['user1', 'user2'];
      
      const result = categorizeUsernames(usernames, validatedCache, invalidCache);
      
      expect(result.alreadyValid).toEqual([]);
      expect(result.alreadyInvalid).toEqual([]);
      expect(result.needValidation).toEqual(['user1', 'user2']);
    });

    it('should handle empty usernames array', () => {
      const validatedCache = new Set(['valid1']);
      const invalidCache = new Set(['invalid1']);
      const usernames: string[] = [];
      
      const result = categorizeUsernames(usernames, validatedCache, invalidCache);
      
      expect(result.alreadyValid).toEqual([]);
      expect(result.alreadyInvalid).toEqual([]);
      expect(result.needValidation).toEqual([]);
    });

    it('should handle usernames that exist in both caches (should not happen, but test edge case)', () => {
      const validatedCache = new Set(['user1']);
      const invalidCache = new Set(['user1']); // Edge case
      const usernames = ['user1'];
      
      const result = categorizeUsernames(usernames, validatedCache, invalidCache);
      
      // Should prioritize valid cache (appears in alreadyValid, not needValidation or alreadyInvalid)
      expect(result.alreadyValid).toEqual(['user1']);
      expect(result.alreadyInvalid).toEqual([]);
      expect(result.needValidation).toEqual([]);
    });

    it('should preserve order of usernames', () => {
      const validatedCache = new Set(['user2']);
      const invalidCache = new Set(['user3']);
      const usernames = ['user1', 'user2', 'user3', 'user4'];
      
      const result = categorizeUsernames(usernames, validatedCache, invalidCache);
      
      expect(result.needValidation).toEqual(['user1', 'user4']);
      expect(result.alreadyValid).toEqual(['user2']);
      expect(result.alreadyInvalid).toEqual(['user3']);
    });
  });

  describe('needsValidation', () => {
    it('should return true when usernames need validation', () => {
      const validatedCache = new Set(['valid1']);
      const invalidCache = new Set(['invalid1']);
      const usernames = ['valid1', 'new1'];
      
      const result = needsValidation(usernames, validatedCache, invalidCache);
      
      expect(result).toBe(true);
    });

    it('should return false when no usernames need validation', () => {
      const validatedCache = new Set(['user1', 'user2']);
      const invalidCache = new Set(['user3']);
      const usernames = ['user1', 'user2', 'user3'];
      
      const result = needsValidation(usernames, validatedCache, invalidCache);
      
      expect(result).toBe(false);
    });

    it('should return false for empty usernames array', () => {
      const validatedCache = new Set(['user1']);
      const invalidCache = new Set(['user2']);
      const usernames: string[] = [];
      
      const result = needsValidation(usernames, validatedCache, invalidCache);
      
      expect(result).toBe(false);
    });

    it('should return true when all usernames are new', () => {
      const validatedCache = new Set<string>();
      const invalidCache = new Set<string>();
      const usernames = ['user1', 'user2'];
      
      const result = needsValidation(usernames, validatedCache, invalidCache);
      
      expect(result).toBe(true);
    });
  });

  describe('getInvalidUsernames', () => {
    it('should return usernames that are in the invalid cache', () => {
      const invalidCache = new Set(['invalid1', 'invalid2']);
      const usernames = ['valid1', 'invalid1', 'new1', 'invalid2'];
      
      const result = getInvalidUsernames(usernames, invalidCache);
      
      expect(result).toEqual(['invalid1', 'invalid2']);
    });

    it('should return empty array when no usernames are invalid', () => {
      const invalidCache = new Set(['invalid1']);
      const usernames = ['valid1', 'valid2'];
      
      const result = getInvalidUsernames(usernames, invalidCache);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for empty usernames', () => {
      const invalidCache = new Set(['invalid1']);
      const usernames: string[] = [];
      
      const result = getInvalidUsernames(usernames, invalidCache);
      
      expect(result).toEqual([]);
    });

    it('should return empty array for empty invalid cache', () => {
      const invalidCache = new Set<string>();
      const usernames = ['user1', 'user2'];
      
      const result = getInvalidUsernames(usernames, invalidCache);
      
      expect(result).toEqual([]);
    });

    it('should preserve order of usernames', () => {
      const invalidCache = new Set(['user2', 'user1', 'user4']);
      const usernames = ['user1', 'user3', 'user2', 'user4', 'user5'];
      
      const result = getInvalidUsernames(usernames, invalidCache);
      
      expect(result).toEqual(['user1', 'user2', 'user4']);
    });
  });
});

describe('Defensive Programming - Corrupted Cache Data', () => {
  const usernames = ['user1', 'user2', 'user3'];

  describe('categorizeUsernames with corrupted cache data', () => {
    it('should handle corrupted invalidCache gracefully', () => {
      const validatedCache = new Set(['user1']);
      const corruptedInvalidCache = ['user2', 'user3'] as any; // Array instead of Set

      const result = categorizeUsernames(usernames, validatedCache, corruptedInvalidCache);

      expect(result.needValidation).toEqual(['user2', 'user3']);
      expect(result.alreadyValid).toEqual(['user1']);
      expect(result.alreadyInvalid).toEqual([]);
    });

    it('should handle corrupted validatedCache gracefully', () => {
      const corruptedValidatedCache = { user1: true } as any; // Object instead of Set
      const invalidCache = new Set(['user2']);

      const result = categorizeUsernames(usernames, corruptedValidatedCache, invalidCache);

      expect(result.needValidation).toEqual(['user1', 'user3']);
      expect(result.alreadyValid).toEqual([]);
      expect(result.alreadyInvalid).toEqual(['user2']);
    });

    it('should handle both caches being corrupted', () => {
      const corruptedValidatedCache = 'not-a-set' as any;
      const corruptedInvalidCache = null as any;

      const result = categorizeUsernames(usernames, corruptedValidatedCache, corruptedInvalidCache);

      expect(result.needValidation).toEqual(['user1', 'user2', 'user3']);
      expect(result.alreadyValid).toEqual([]);
      expect(result.alreadyInvalid).toEqual([]);
    });
  });

  describe('needsValidation with corrupted cache data', () => {
    it('should handle corrupted caches gracefully', () => {
      const corruptedValidatedCache = undefined as any;
      const corruptedInvalidCache = [] as any; // Array instead of Set

      const result = needsValidation(usernames, corruptedValidatedCache, corruptedInvalidCache);

      expect(result).toBe(true); // All usernames need validation when caches are corrupted
    });
  });

  describe('getInvalidUsernames with corrupted cache data', () => {
    it('should handle corrupted invalidCache gracefully', () => {
      const corruptedInvalidCache = { user2: true, user3: true } as any; // Object instead of Set

      const result = getInvalidUsernames(usernames, corruptedInvalidCache);

      expect(result).toEqual([]); // No usernames should be considered invalid when cache is corrupted
    });

    it('should handle null invalidCache gracefully', () => {
      const nullInvalidCache = null as any;

      const result = getInvalidUsernames(usernames, nullInvalidCache);

      expect(result).toEqual([]);
    });

    it('should handle undefined invalidCache gracefully', () => {
      const undefinedInvalidCache = undefined as any;

      const result = getInvalidUsernames(usernames, undefinedInvalidCache);

      expect(result).toEqual([]);
    });
  });
}); 