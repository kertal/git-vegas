import { StarredItem, StarredItemsStorage, GitHubItem } from '../types';
import { getItemType } from './resultsUtils';

const STARRED_ITEMS_KEY = 'gitvegas_starred_items';

/**
 * Utility class for managing starred items with localStorage persistence
 */
export class StarredItemsManager {
  /**
   * Load starred items from localStorage
   */
  static load(): StarredItemsStorage {
    try {
      const stored = localStorage.getItem(STARRED_ITEMS_KEY);
      if (stored) {
        const data = JSON.parse(stored) as StarredItemsStorage;
        return data;
      }
    } catch (error) {
      console.error('Failed to load starred items:', error);
    }
    
    return {
      starredItems: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save starred items to localStorage
   */
  static save(storage: StarredItemsStorage): void {
    try {
      storage.lastUpdated = new Date().toISOString();
      localStorage.setItem(STARRED_ITEMS_KEY, JSON.stringify(storage));
    } catch (error) {
      console.error('Failed to save starred items:', error);
    }
  }

  /**
   * Add an item to starred items
   */
  static addItem(item: GitHubItem, note?: string): void {
    const storage = this.load();
    const itemType = getItemType(item);
    const starredItem: StarredItem = {
      id: `${itemType}-${item.id}`,
      type: itemType,
      item,
      starredAt: new Date().toISOString(),
      note,
    };

    // Check if item is already starred
    const existingIndex = storage.starredItems.findIndex(starred => starred.id === starredItem.id);
    if (existingIndex >= 0) {
      // Update existing item
      storage.starredItems[existingIndex] = starredItem;
    } else {
      // Add new item
      storage.starredItems.push(starredItem);
    }

    this.save(storage);
  }

  /**
   * Remove an item from starred items
   */
  static removeItem(item: GitHubItem): void {
    const storage = this.load();
    const itemType = getItemType(item);
    const itemId = `${itemType}-${item.id}`;
    
    storage.starredItems = storage.starredItems.filter(starred => starred.id !== itemId);
    this.save(storage);
  }

  /**
   * Check if an item is starred
   */
  static isStarred(item: GitHubItem): boolean {
    const storage = this.load();
    const itemType = getItemType(item);
    const itemId = `${itemType}-${item.id}`;
    
    return storage.starredItems.some(starred => starred.id === itemId);
  }

  /**
   * Get all starred items
   */
  static getAllStarredItems(): StarredItem[] {
    const storage = this.load();
    return storage.starredItems.sort((a, b) => 
      new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime()
    );
  }

  /**
   * Get starred items by type
   */
  static getStarredItemsByType(type: 'issue' | 'pr' | 'comment'): StarredItem[] {
    const storage = this.load();
    return storage.starredItems
      .filter(starred => starred.type === type)
      .sort((a, b) => new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime());
  }

  /**
   * Update note for a starred item
   */
  static updateNote(item: GitHubItem, note: string): void {
    const storage = this.load();
    const itemType = getItemType(item);
    const itemId = `${itemType}-${item.id}`;
    
    const starredItem = storage.starredItems.find(starred => starred.id === itemId);
    if (starredItem) {
      starredItem.note = note;
      this.save(storage);
    }
  }

  /**
   * Clear all starred items
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STARRED_ITEMS_KEY);
    } catch (error) {
      console.error('Failed to clear starred items:', error);
    }
  }

  /**
   * Get count of starred items by type
   */
  static getCounts(): { total: number; issues: number; prs: number; comments: number } {
    const storage = this.load();
    const total = storage.starredItems.length;
    const issues = storage.starredItems.filter(item => item.type === 'issue').length;
    const prs = storage.starredItems.filter(item => item.type === 'pr').length;
    const comments = storage.starredItems.filter(item => item.type === 'comment').length;
    
    return { total, issues, prs, comments };
  }
} 