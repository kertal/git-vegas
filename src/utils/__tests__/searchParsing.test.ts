import { describe, it, expect } from 'vitest';
import { parseSearchText } from '../viewFiltering';

describe('parseSearchText', () => {
  it('should return empty arrays and text for empty input', () => {
    const result = parseSearchText('');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should return empty arrays and text for whitespace-only input', () => {
    const result = parseSearchText('   ');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse single included label', () => {
    const result = parseSearchText('label:bug');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse single excluded label', () => {
    const result = parseSearchText('-label:wontfix');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: ['wontfix'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse multiple included labels', () => {
    const result = parseSearchText('label:bug label:critical');
    expect(result).toEqual({
      includedLabels: ['bug', 'critical'],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse multiple excluded labels', () => {
    const result = parseSearchText('-label:wontfix -label:duplicate');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: ['wontfix', 'duplicate'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse mixed included and excluded labels', () => {
    const result = parseSearchText('label:bug -label:wontfix label:critical -label:duplicate');
    expect(result).toEqual({
      includedLabels: ['bug', 'critical'],
      excludedLabels: ['wontfix', 'duplicate'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse labels with regular text', () => {
    const result = parseSearchText('performance issue label:bug -label:wontfix');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: ['wontfix'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: 'performance issue',
    });
  });

  it('should clean up extra whitespace in text', () => {
    const result = parseSearchText('  performance   issue   label:bug   -label:wontfix  ');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: ['wontfix'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: 'performance issue',
    });
  });

  it('should handle labels with underscores and hyphens', () => {
    const result = parseSearchText('label:good_first_issue -label:help-wanted');
    expect(result).toEqual({
      includedLabels: ['good_first_issue'],
      excludedLabels: ['help-wanted'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should handle labels with colons and periods', () => {
    const result = parseSearchText('label:Team:DataDiscovery -label:v9.0.0');
    expect(result).toEqual({
      includedLabels: ['Team:DataDiscovery'],
      excludedLabels: ['v9.0.0'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should handle complex label names with multiple special characters', () => {
    const result = parseSearchText('label:api.v2:experimental -label:config.json.deprecated');
    expect(result).toEqual({
      includedLabels: ['api.v2:experimental'],
      excludedLabels: ['config.json.deprecated'],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse single user filter', () => {
    const result = parseSearchText('user:octocat');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: ['octocat'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse multiple user filters', () => {
    const result = parseSearchText('user:octocat user:github-user');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: ['octocat', 'github-user'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse mixed labels and user filters', () => {
    const result = parseSearchText('label:bug user:octocat -label:wontfix');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: ['wontfix'],
      userFilters: ['octocat'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse user filters with regular text', () => {
    const result = parseSearchText('performance issue user:octocat label:bug');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: [],
      userFilters: ['octocat'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: 'performance issue',
    });
  });

  it('should handle usernames with special characters', () => {
    const result = parseSearchText('user:user-name user:user.name user:user_name');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: ['user-name', 'user.name', 'user_name'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse repo filters correctly', () => {
    const result = parseSearchText('repo:owner/repo');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: ['owner/repo'],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse excluded repo filters correctly', () => {
    const result = parseSearchText('-repo:owner/repo');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: ['owner/repo'],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse multiple repo filters correctly', () => {
    const result = parseSearchText('repo:owner/repo1 repo:owner/repo2 -repo:owner/excluded');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: ['owner/repo1', 'owner/repo2'],
      excludedRepos: ['owner/excluded'],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should handle mixed label, user, and repo filters with text', () => {
    const result = parseSearchText('authentication label:bug user:alice repo:owner/repo -repo:owner/other');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: [],
      userFilters: ['alice'],
      includedRepos: ['owner/repo'],
      excludedRepos: ['owner/other'],
      includedOrgs: [],
      excludedOrgs: [],
      cleanText: 'authentication',
    });
  });

  it('should parse single org filter', () => {
    const result = parseSearchText('org:elastic');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: ['elastic'],
      excludedOrgs: [],
      cleanText: '',
    });
  });

  it('should parse excluded org filter', () => {
    const result = parseSearchText('-org:facebook');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: [],
      excludedOrgs: ['facebook'],
      cleanText: '',
    });
  });

  it('should parse multiple org filters', () => {
    const result = parseSearchText('org:elastic org:github -org:microsoft');
    expect(result).toEqual({
      includedLabels: [],
      excludedLabels: [],
      userFilters: [],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: ['elastic', 'github'],
      excludedOrgs: ['microsoft'],
      cleanText: '',
    });
  });

  it('should handle mixed label, user, repo, and org filters', () => {
    const result = parseSearchText('bug fix label:bug user:alice org:elastic -org:microsoft');
    expect(result).toEqual({
      includedLabels: ['bug'],
      excludedLabels: [],
      userFilters: ['alice'],
      includedRepos: [],
      excludedRepos: [],
      includedOrgs: ['elastic'],
      excludedOrgs: ['microsoft'],
      cleanText: 'bug fix',
    });
  });
});
