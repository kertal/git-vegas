import { CustomSection, CustomSectionConfig, CustomSectionData } from '../types';
import { indexedDBManager } from './indexedDB';

const CUSTOM_SECTIONS_KEY = 'gitvegas_custom_sections';
const CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

/**
 * Utility class for managing custom sections configuration and data
 */
export class CustomSectionsManager {
  /**
   * Load custom sections configuration from localStorage
   */
  static loadConfig(): CustomSectionConfig {
    try {
      const stored = localStorage.getItem(CUSTOM_SECTIONS_KEY);
      if (stored) {
        const config = JSON.parse(stored) as CustomSectionConfig;
        return config;
      }
    } catch (error) {
      console.error('Failed to load custom sections config:', error);
    }
    
    return {
      sections: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Save custom sections configuration to localStorage
   */
  static saveConfig(config: CustomSectionConfig): void {
    try {
      config.lastUpdated = new Date().toISOString();
      localStorage.setItem(CUSTOM_SECTIONS_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save custom sections config:', error);
    }
  }

  /**
   * Add a new custom section
   */
  static addSection(section: Omit<CustomSection, 'id' | 'createdAt' | 'updatedAt'>): CustomSection {
    const config = this.loadConfig();
    const newSection: CustomSection = {
      ...section,
      id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    config.sections.push(newSection);
    this.saveConfig(config);
    return newSection;
  }

  /**
   * Update an existing custom section
   */
  static updateSection(sectionId: string, updates: Partial<Omit<CustomSection, 'id' | 'createdAt'>>): boolean {
    const config = this.loadConfig();
    const sectionIndex = config.sections.findIndex(s => s.id === sectionId);
    
    if (sectionIndex === -1) {
      return false;
    }
    
    config.sections[sectionIndex] = {
      ...config.sections[sectionIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    
    this.saveConfig(config);
    return true;
  }

  /**
   * Delete a custom section
   */
  static deleteSection(sectionId: string): boolean {
    const config = this.loadConfig();
    const initialLength = config.sections.length;
    config.sections = config.sections.filter(s => s.id !== sectionId);
    
    if (config.sections.length !== initialLength) {
      this.saveConfig(config);
      // Also clear cached data for this section
      this.clearSectionData(sectionId);
      return true;
    }
    
    return false;
  }

  /**
   * Get a specific section by ID
   */
  static getSection(sectionId: string): CustomSection | null {
    const config = this.loadConfig();
    return config.sections.find(s => s.id === sectionId) || null;
  }

  /**
   * Get all enabled sections
   */
  static getEnabledSections(): CustomSection[] {
    const config = this.loadConfig();
    return config.sections.filter(s => s.enabled);
  }

  /**
   * Store section data in IndexedDB
   */
  static async storeSectionData(sectionData: CustomSectionData): Promise<void> {
    try {
      const key = `custom_section_${sectionData.sectionId}`;
      await indexedDBManager.storeMetadata(key, sectionData);
    } catch (error) {
      console.error('Failed to store section data:', error);
      throw error;
    }
  }

  /**
   * Load section data from IndexedDB
   */
  static async loadSectionData(sectionId: string): Promise<CustomSectionData | null> {
    try {
      const key = `custom_section_${sectionId}`;
      const data = await indexedDBManager.getMetadata(key) as CustomSectionData | null;
      
      // Check if data is expired
      if (data && Date.now() - data.lastFetch > CACHE_EXPIRY_MS) {
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Failed to load section data:', error);
      return null;
    }
  }

  /**
   * Clear cached data for a specific section
   */
  static async clearSectionData(sectionId: string): Promise<void> {
    try {
      const key = `custom_section_${sectionId}`;
      // Note: IndexedDB manager doesn't have a delete method, so we'll store null
      await indexedDBManager.storeMetadata(key, null);
    } catch (error) {
      console.error('Failed to clear section data:', error);
    }
  }

  /**
   * Check if section data needs refresh
   */
  static async needsRefresh(sectionId: string): Promise<boolean> {
    const data = await this.loadSectionData(sectionId);
    return !data || Date.now() - data.lastFetch > CACHE_EXPIRY_MS;
  }

  /**
   * Generate a cache key for a section
   */
  static generateCacheKey(section: CustomSection): string {
    const parts = [
      section.repository,
      section.type,
      section.labels.sort().join(','),
      section.maxItems.toString(),
    ];
    return parts.join('|');
  }

  /**
   * Validate section configuration
   */
  static validateSection(section: Partial<CustomSection>): string[] {
    const errors: string[] = [];
    
    if (!section.title?.trim()) {
      errors.push('Title is required');
    }
    
    if (!section.repository?.trim()) {
      errors.push('Repository is required');
    } else if (!/^[\w.-]+\/[\w.-]+$/.test(section.repository)) {
      errors.push('Repository must be in format "owner/repo"');
    }
    
    if (!section.labels || section.labels.length === 0) {
      errors.push('At least one label is required');
    }
    
    if (!section.type || !['issues', 'prs', 'both'].includes(section.type)) {
      errors.push('Type must be "issues", "prs", or "both"');
    }
    
    if (!section.maxItems || section.maxItems < 1 || section.maxItems > 50) {
      errors.push('Max items must be between 1 and 50');
    }
    
    return errors;
  }

  /**
   * Create a default section configuration
   */
  static createDefaultSection(): Omit<CustomSection, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      title: 'New Section',
      repository: '',
      labels: [],
      type: 'both',
      maxItems: 10,
      enabled: true,
    };
  }
}

export default CustomSectionsManager; 