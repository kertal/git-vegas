import { GitHubItem } from '../types';

/**
 * GitHub API utility for creating issues
 */
export class GitHubAPI {
  private static readonly BASE_URL = 'https://api.github.com';

  /**
   * Create a new issue in a repository
   */
  static async createIssue(
    repositoryUrl: string,
    issueData: {
      title: string;
      body?: string;
      labels?: string[];
    },
    githubToken: string
  ): Promise<GitHubItem> {
    // Extract owner and repo from repository URL
    const repoMatch = repositoryUrl.match(/repos\/([^/]+\/[^/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid repository URL format');
    }
    
    const repo = repoMatch[1];
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${githubToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GitVegas-App',
    };

    const requestBody = {
      title: issueData.title,
      body: issueData.body || '',
      labels: issueData.labels || [],
    };

    const url = `${this.BASE_URL}/repos/${repo}/issues`;

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication failed. Please check your GitHub token.');
      }
      if (response.status === 403) {
        throw new Error('Permission denied. Make sure your token has the necessary permissions.');
      }
      if (response.status === 404) {
        throw new Error('Repository not found or you do not have access to it.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    const newIssue = await response.json();
    
    // Transform the GitHub API response to match our GitHubItem interface
    return {
      id: newIssue.id,
      html_url: newIssue.html_url,
      title: newIssue.title,
      created_at: newIssue.created_at,
      updated_at: newIssue.updated_at,
      state: newIssue.state,
      body: newIssue.body,
      labels: newIssue.labels,
      repository_url: repositoryUrl,
      repository: {
        full_name: repo,
        html_url: `https://github.com/${repo}`,
      },
      closed_at: newIssue.closed_at,
      number: newIssue.number,
      user: {
        login: newIssue.user.login,
        avatar_url: newIssue.user.avatar_url,
        html_url: newIssue.user.html_url,
      },
      pull_request: undefined,
      merged: false,
    };
  }

  /**
   * Get repository information to validate access
   */
  static async getRepository(repositoryUrl: string, githubToken: string): Promise<{
    full_name: string;
    html_url: string;
    permissions?: {
      admin: boolean;
      push: boolean;
      pull: boolean;
    };
  }> {
    const repoMatch = repositoryUrl.match(/repos\/([^/]+\/[^/]+)/);
    if (!repoMatch) {
      throw new Error('Invalid repository URL format');
    }
    
    const repo = repoMatch[1];
    
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `token ${githubToken}`,
      'User-Agent': 'GitVegas-App',
    };

    const url = `${this.BASE_URL}/repos/${repo}`;

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Repository access failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }
} 