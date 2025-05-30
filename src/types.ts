export interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: {
    merged_at?: string;
    url?: string;
  };
  created_at: string;
  updated_at: string;
  state: string;
  body?: string;
  labels?: { name: string; color?: string; description?: string }[];
  repository_url?: string;
  repository?: { full_name: string; html_url: string };
  merged?: boolean;
  merged_at?: string;
  closed_at?: string;
  number?: number;
  user: {
    login: string;
    avatar_url: string;
    html_url: string;
  };
} 