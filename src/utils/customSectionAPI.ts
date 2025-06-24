import { CustomSection, GitHubItem, GitHubEvent } from '../types';

/**
 * API utility for fetching GitHub data for custom sections
 */
export class CustomSectionAPI {
  private static readonly BASE_URL = 'https://api.github.com';

  /**
   * Fetch issues and/or PRs for a custom section
   */
  static async fetchSectionData(
    section: CustomSection,
    githubToken?: string
  ): Promise<{ items: GitHubItem[]; events: GitHubEvent[] }> {
    const items: GitHubItem[] = [];
    const events: GitHubEvent[] = [];

    try {
      // Fetch issues and/or PRs based on section type
      if (section.type === 'issues' || section.type === 'both') {
        const issues = await this.fetchIssues(section, githubToken);
        items.push(...issues);
      }

      if (section.type === 'prs' || section.type === 'both') {
        const prs = await this.fetchPullRequests(section, githubToken);
        items.push(...prs);
      }

      // Sort by updated_at descending and limit to maxItems
      items.sort((a, b) => 
        new Date(b.updated_at || b.created_at).getTime() - 
        new Date(a.updated_at || a.created_at).getTime()
      );

      return {
        items: items.slice(0, section.maxItems),
        events: events, // Events could be implemented later if needed
      };
    } catch (error) {
      console.error('Failed to fetch section data:', error);
      throw error;
    }
  }

  /**
   * Fetch issues for a repository with label filtering
   */
  private static async fetchIssues(
    section: CustomSection,
    githubToken?: string
  ): Promise<GitHubItem[]> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitVegas-App',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Build search query
    const labelQuery = section.labels.map(label => `label:"${label}"`).join(' ');
    const query = `repo:${section.repository} is:issue ${labelQuery}`;

    const url = `${this.BASE_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${section.maxItems * 2}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please add a GitHub token in settings.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Fetch pull requests for a repository with label filtering
   */
  private static async fetchPullRequests(
    section: CustomSection,
    githubToken?: string
  ): Promise<GitHubItem[]> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitVegas-App',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    // Build search query
    const labelQuery = section.labels.map(label => `label:"${label}"`).join(' ');
    const query = `repo:${section.repository} is:pr ${labelQuery}`;

    const url = `${this.BASE_URL}/search/issues?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=${section.maxItems * 2}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error('GitHub API rate limit exceeded. Please add a GitHub token in settings.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  /**
   * Test if a repository exists and is accessible
   */
  static async testRepository(
    repository: string,
    githubToken?: string
  ): Promise<{ exists: boolean; accessible: boolean; error?: string }> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitVegas-App',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      const url = `${this.BASE_URL}/repos/${repository}`;
      const response = await fetch(url, { headers });

      if (response.ok) {
        return { exists: true, accessible: true };
      } else if (response.status === 404) {
        return { exists: false, accessible: false, error: 'Repository not found' };
      } else if (response.status === 403) {
        return { exists: true, accessible: false, error: 'Access denied - repository may be private' };
      } else {
        return { exists: false, accessible: false, error: `HTTP ${response.status}` };
      }
    } catch {
      return { exists: false, accessible: false, error: 'Network error' };
    }
  }

  /**
   * Get available labels for a repository
   */
  static async getRepositoryLabels(
    repository: string,
    githubToken?: string
  ): Promise<string[]> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'GitVegas-App',
    };

    if (githubToken) {
      headers['Authorization'] = `token ${githubToken}`;
    }

    try {
      const url = `${this.BASE_URL}/repos/${repository}/labels?per_page=100`;
      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch labels: ${response.status}`);
      }

      const labels = await response.json() as Array<{ name: string }>;
      return labels.map((label) => label.name);
    } catch (error) {
      console.error('Failed to fetch repository labels:', error);
      return [];
    }
  }
}

export default CustomSectionAPI; 