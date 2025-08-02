import { 
  SUMMARY_GROUP_NAMES, 
  getAllGroupNames, 
  createEmptyGroups
} from '../summaryConstants';

describe('summaryConstants', () => {
  describe('SUMMARY_GROUP_NAMES', () => {
    it('should contain all expected group names', () => {
      expect(SUMMARY_GROUP_NAMES.PRS_OPENED).toBe('PRs - opened');
      expect(SUMMARY_GROUP_NAMES.PRS_MERGED).toBe('PRs - merged');
      expect(SUMMARY_GROUP_NAMES.PRS_CLOSED).toBe('PRs - closed');
      expect(SUMMARY_GROUP_NAMES.PRS_UPDATED).toBe('PRs - updated');
      expect(SUMMARY_GROUP_NAMES.PRS_REVIEWED).toBe('PRs - reviewed');
      expect(SUMMARY_GROUP_NAMES.ISSUES_OPENED).toBe('Issues - opened');
      expect(SUMMARY_GROUP_NAMES.ISSUES_CLOSED).toBe('Issues - closed');
      expect(SUMMARY_GROUP_NAMES.ISSUES_UPDATED).toBe('Issues - updated');
      expect(SUMMARY_GROUP_NAMES.COMMENTS).toBe('Comments');
      expect(SUMMARY_GROUP_NAMES.COMMITS).toBe('Commits');
      expect(SUMMARY_GROUP_NAMES.OTHER_EVENTS).toBe('Other Events');
    });

    it('should be a constant object', () => {
      // Constants should have expected structure
      expect(typeof SUMMARY_GROUP_NAMES).toBe('object');
      expect(SUMMARY_GROUP_NAMES.PRS_OPENED).toBeDefined();
    });
  });

  describe('getAllGroupNames', () => {
    it('should return all group names as an array', () => {
      const groupNames = getAllGroupNames();
      
      expect(groupNames).toHaveLength(11);
      expect(groupNames).toContain('PRs - opened');
      expect(groupNames).toContain('PRs - merged');
      expect(groupNames).toContain('PRs - closed');
      expect(groupNames).toContain('PRs - updated');
      expect(groupNames).toContain('PRs - reviewed');
      expect(groupNames).toContain('Issues - opened');
      expect(groupNames).toContain('Issues - closed');
      expect(groupNames).toContain('Issues - updated');
      expect(groupNames).toContain('Comments');
      expect(groupNames).toContain('Commits');
      expect(groupNames).toContain('Other Events');
    });

    it('should return unique values', () => {
      const groupNames = getAllGroupNames();
      const uniqueNames = [...new Set(groupNames)];
      
      expect(groupNames).toHaveLength(uniqueNames.length);
    });
  });

  describe('createEmptyGroups', () => {
    it('should create an object with all group names as keys', () => {
      const groups = createEmptyGroups();
      
      expect(Object.keys(groups)).toHaveLength(11);
      expect(groups).toHaveProperty('PRs - opened');
      expect(groups).toHaveProperty('PRs - merged');
      expect(groups).toHaveProperty('PRs - closed');
      expect(groups).toHaveProperty('PRs - updated');
      expect(groups).toHaveProperty('PRs - reviewed');
      expect(groups).toHaveProperty('Issues - opened');
      expect(groups).toHaveProperty('Issues - closed');
      expect(groups).toHaveProperty('Issues - updated');
      expect(groups).toHaveProperty('Comments');
      expect(groups).toHaveProperty('Commits');
      expect(groups).toHaveProperty('Other Events');
    });

    it('should initialize all groups with empty arrays', () => {
      const groups = createEmptyGroups();
      
      Object.values(groups).forEach(group => {
        expect(Array.isArray(group)).toBe(true);
        expect(group).toHaveLength(0);
      });
    });

    it('should create independent array instances', () => {
      const groups1 = createEmptyGroups();
      const groups2 = createEmptyGroups();
      
      groups1['PRs - opened'].push('test');
      
      expect(groups1['PRs - opened']).toHaveLength(1);
      expect(groups2['PRs - opened']).toHaveLength(0);
    });
  });
}); 