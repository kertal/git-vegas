import { useState, useEffect } from 'react';
import type { FormEvent } from 'react'; // Changed to type-only import
import './App.css';
import { TextInput, Button, Box, Text, Link, Label, PageLayout, Flash, Spinner } from '@primer/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
// Commenting out the problematic Table import for now to isolate the issue
// import { Table } from '@primer/react/drafts';

// Helper function to determine the optimal text color for a given background
const getContrastColor = (hexColor: string): string => {
  // Convert Hex to RGB
  const r = parseInt(hexColor.substring(0, 2), 16);
  const g = parseInt(hexColor.substring(2, 4), 16);
  const b = parseInt(hexColor.substring(4, 6), 16);
  
  // YIQ formula to calculate brightness (standard for accessibility)
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  
  // Return black or white based on brightness
  return yiq >= 128 ? '#000' : '#fff';
};

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: object; // Present if it's a Pull Request
  created_at: string;
  updated_at: string;
  state: string;
  body?: string; // Added body field
  labels?: { name: string; color?: string; description?: string }[];
  repository_url?: string;
  repository?: { full_name: string; html_url: string };
}

// Define a type for Label variants based on Primer's documentation
type PrimerLabelVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'attention' | 'severe' | 'danger' | 'done' | 'sponsors';

function App() {
  // Initial state is loaded directly from localStorage
  const [username, setUsername] = useState(() => localStorage.getItem('github-username') || '');
  const [startDate, setStartDate] = useState(() => localStorage.getItem('start-date') || '');
  const [endDate, setEndDate] = useState(() => localStorage.getItem('end-date') || '');
  const [results, setResults] = useState<GitHubItem[]>(() => {
    const savedResults = localStorage.getItem('results');
    return savedResults ? JSON.parse(savedResults) : [];
  });
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'issue' | 'pr'>(() => 
    (localStorage.getItem('filter') as 'all' | 'issue' | 'pr') || 'all'
  );
  const [expanded, setExpanded] = useState<{ [id: number]: boolean }>(() => {
    const savedExpanded = localStorage.getItem('expanded');
    return savedExpanded ? JSON.parse(savedExpanded) : {};
  });
  const [descriptionVisible, setDescriptionVisible] = useState<{ [id: number]: boolean }>(() => {
    const savedDescVisible = localStorage.getItem('description-visible');
    return savedDescVisible ? JSON.parse(savedDescVisible) : {};
  });
  const [labelFilter, setLabelFilter] = useState<string>(() => localStorage.getItem('label-filter') || '');
  const [searchText, setSearchText] = useState<string>(() => localStorage.getItem('search-text') || '');
  const [availableLabels, setAvailableLabels] = useState<string[]>(() => {
    const savedLabels = localStorage.getItem('available-labels');
    return savedLabels ? JSON.parse(savedLabels) : [];
  });
  const [availableRepos, setAvailableRepos] = useState<string[]>(() => {
    const savedRepos = localStorage.getItem('available-repos');
    return savedRepos ? JSON.parse(savedRepos) : [];
  });
  const [repoFilters, setRepoFilters] = useState<string[]>(() => {
    const savedRepoFilters = localStorage.getItem('repo-filters');
    return savedRepoFilters ? JSON.parse(savedRepoFilters) : [];
  });
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState<string>('');
  const [clipboardMessage, setClipboardMessage] = useState<string | null>(null);

  // Save state to localStorage on changes
  useEffect(() => {
    localStorage.setItem('github-username', username);
    localStorage.setItem('start-date', startDate);
    localStorage.setItem('end-date', endDate);
    localStorage.setItem('results', JSON.stringify(results));
    localStorage.setItem('filter', filter);
    localStorage.setItem('label-filter', labelFilter);
    localStorage.setItem('search-text', searchText);
    localStorage.setItem('available-labels', JSON.stringify(availableLabels));
    localStorage.setItem('available-repos', JSON.stringify(availableRepos));
    localStorage.setItem('repo-filters', JSON.stringify(repoFilters));
    localStorage.setItem('expanded', JSON.stringify(expanded));
    localStorage.setItem('description-visible', JSON.stringify(descriptionVisible));
  }, [username, startDate, endDate, results, filter, labelFilter, searchText, availableLabels, availableRepos, repoFilters, expanded, descriptionVisible]);

  const fetchGitHubData = async () => {
    if (!username || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);
    setLoading(true);
    setLoadingProgress('Fetching data...');
    
    try {
      const MAX_PAGES = 5; // Fetch up to 5 pages (500 results total)
      let allItems: GitHubItem[] = [];
      const labelsSet = new Set<string>();
      const reposSet = new Set<string>();
      let hasMorePages = true;
      
      // Fetch pages in sequence
      for (let page = 1; page <= MAX_PAGES && hasMorePages; page++) {
        setLoadingProgress(`Fetching page ${page} of ${MAX_PAGES}...`);
        
        const response = await fetch(
          `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+created:${startDate}..${endDate}&per_page=100&page=${page}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Failed to fetch page ${page}`);
        }
        
        const data = await response.json();
        const items = data.items || [];
        
        // Process items from this page
        items.forEach((item: GitHubItem) => {
          // Add labels to set
          item.labels?.forEach(l => labelsSet.add(l.name));
          
          // Add repository to set if available
          if (item.repository_url) {
            const repoName = item.repository_url.replace('https://api.github.com/repos/', '');
            reposSet.add(repoName);
          }
        });
        
        // Add items from this page to our results
        allItems = [...allItems, ...items];
        
        // Check if we've reached the end of results
        hasMorePages = items.length === 100 && data.total_count > page * 100;
        
        // Add a small delay to avoid rate limiting issues
        if (page < MAX_PAGES && hasMorePages) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      setLoadingProgress(`Found ${allItems.length} results.`);
      
      // Update state with all collected items
      setResults(allItems);
      setAvailableLabels(Array.from(labelsSet));
      setAvailableRepos(Array.from(reposSet));
      setRepoFilters([]);
      
    } catch (err: unknown) {
      console.error('Error fetching data:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch data. Please try again.');
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      setResults([]);
      setAvailableLabels([]);
      setAvailableRepos([]);
    } finally {
      setLoading(false);
      setLoadingProgress('');
    }
  };

  const filteredResults = results.filter(item => {
    // Type filter (Issue or PR)
    const typeMatch = 
      filter === 'all' ? true : 
      filter === 'pr' ? !!item.pull_request : 
      !item.pull_request;
    
    // Label filter
    const labelMatch = labelFilter ? item.labels?.some(l => l.name === labelFilter) : true;
    
    // Repository filter - if repo filters are selected, only show items from those repos
    const repoMatch = repoFilters.length === 0 ? true : (
      item.repository_url && repoFilters.includes(
        item.repository_url.replace('https://api.github.com/repos/', '')
      )
    );
    
    // Text filter (search in title and description)
    const searchMatch = searchText.trim() === '' ? true : (
      (item.title?.toLowerCase().includes(searchText.toLowerCase()) || 
       item.body?.toLowerCase().includes(searchText.toLowerCase()))
    );
    
    return typeMatch && labelMatch && repoMatch && searchMatch;
  });

  // Calculate stats for found items
  const stats = {
    total: filteredResults.length,
    issues: filteredResults.filter(item => !item.pull_request).length,
    prs: filteredResults.filter(item => !!item.pull_request).length,
    open: filteredResults.filter(item => item.state === 'open').length,
    closed: filteredResults.filter(item => item.state === 'closed').length
  };

  const toggleExpand = (id: number) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleDescriptionVisibility = (id: number) => {
    setDescriptionVisible(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Format the filtered results for export to clipboard
  const formatResultsForExport = (items: GitHubItem[]): string => {
    const dateRangeInfo = `GitHub activity from ${startDate} to ${endDate}`;
    const statsInfo = `Total: ${stats.total} (Issues: ${stats.issues}, PRs: ${stats.prs}, Open: ${stats.open}, Closed: ${stats.closed})`;
    
    const header = `# ${username}'s GitHub Activity\n${dateRangeInfo}\n${statsInfo}\n\n`;
    
    const formattedItems = items.map(item => {
      const type = item.pull_request ? 'PR' : 'Issue';
      const status = item.state;
      const repo = item.repository_url 
        ? item.repository_url.replace('https://api.github.com/repos/', '')
        : 'Unknown Repository';
      const createdDate = new Date(item.created_at).toLocaleDateString();
      const labels = item.labels && item.labels.length > 0
        ? `\nLabels: ${item.labels.map(l => l.name).join(', ')}`
        : '';
      
      return `## [${type}] ${item.title}\n` +
        `Repository: ${repo}\n` +
        `Status: ${status} | Created: ${createdDate}${labels}\n` +
        `Link: ${item.html_url}\n`;
    }).join('\n');
    
    return header + formattedItems;
  };

  // Copy formatted results to clipboard
  const copyResultsToClipboard = async () => {
    try {
      const formattedText = formatResultsForExport(filteredResults);
      await navigator.clipboard.writeText(formattedText);
      setClipboardMessage('Results copied to clipboard!');
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setClipboardMessage(null);
      }, 3000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      setClipboardMessage('Failed to copy to clipboard. Please try again.');
      
      // Clear the error message after 3 seconds
      setTimeout(() => {
        setClipboardMessage(null);
      }, 3000);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', bg: 'canvas.default' }}> {/* Outer Box for full page background */}
      <PageLayout>
        <PageLayout.Header>
          <Box sx={{padding: 3, borderBottom: '1px solid', borderColor: 'border.default', bg: 'canvas.subtle' }}>
            <Text as="h1" sx={{fontSize: 4, fontWeight: 'semibold', color: 'fg.default'}}>GitHub Issues & PRs Viewer</Text>
          </Box>
        </PageLayout.Header>
        <PageLayout.Content sx={{ padding: 3 }}> {/* bg: 'canvas.default' is inherited from outer Box, padding remains */}
          <Box sx={{maxWidth: '800px', margin: '0 auto'}}>
            <Box as="form" sx={{display: 'flex', flexDirection: 'column', gap: 3}} onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); fetchGitHubData(); }}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text as="label" htmlFor="username" sx={{ fontWeight: 'bold', fontSize: 1 }}>GitHub Username</Text>
                <TextInput
                  id="username"
                  aria-label="GitHub Username"
                  name="username"
                  placeholder="GitHub Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  sx={{width: '100%'}}
                  block
                />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text as="label" htmlFor="startDate" sx={{ fontWeight: 'bold', fontSize: 1 }}>Start Date</Text>
                <TextInput
                  id="startDate"
                  aria-label="Start Date"
                  name="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  sx={{width: '100%'}}
                  block
                />
              </Box>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text as="label" htmlFor="endDate" sx={{ fontWeight: 'bold', fontSize: 1 }}>End Date</Text>
                <TextInput
                  id="endDate"
                  aria-label="End Date"
                  name="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  sx={{width: '100%'}}
                  block
                />
              </Box>
              
              <Button variant="primary" type="submit" sx={{width: '100%', mt: 1}}>Search</Button>
            </Box>
            {error && (
              <Flash variant="danger" sx={{marginTop: 3}}>
                {error}
              </Flash>
            )}
          </Box>

          {/* Filter UI */}
          <Box sx={{maxWidth: '800px', margin: '24px auto 0', display: 'flex', gap: 2, alignItems: 'center'}}>
            <Text as="span" sx={{fontWeight: 'bold'}}>Filter:</Text>
            <Button variant={filter === 'all' ? 'primary' : 'default'} onClick={() => setFilter('all')}>All</Button>
            <Button variant={filter === 'issue' ? 'primary' : 'default'} onClick={() => setFilter('issue')}>Issues</Button>
            <Button variant={filter === 'pr' ? 'primary' : 'default'} onClick={() => setFilter('pr')}>PRs</Button>
          </Box>

          {/* Label-Filter UI */}
          {availableLabels.length > 0 && (
            <Box sx={{maxWidth: '800px', margin: '16px auto 0', display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap'}}>
              <Text as="span" sx={{fontWeight: 'bold'}}>Label Filter:</Text>
              <Button
                size="small"
                variant={labelFilter === '' ? 'primary' : 'default'}
                onClick={() => setLabelFilter('')}
              >All</Button>
              {availableLabels.map(label => (
                <Button
                  key={label}
                  size="small"
                  variant={labelFilter === label ? 'primary' : 'default'}
                  onClick={() => setLabelFilter(label)}
                  sx={{bg: labelFilter === label ? undefined : undefined, color: 'fg.default'}}
                >{label}</Button>
              ))}
            </Box>
          )}

          {/* Repository Filter UI */}
          {availableRepos.length > 0 && (
            <Box sx={{maxWidth: '800px', margin: '16px auto 0'}}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text as="span" sx={{ fontWeight: 'bold', fontSize: 1 }}>Repository Filter:</Text>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Button
                    size="small"
                    variant={repoFilters.length === 0 ? 'primary' : 'default'}
                    onClick={() => setRepoFilters([])}
                  >
                    All Repositories
                  </Button>
                  {availableRepos.map(repo => (
                    <Button
                      key={repo}
                      size="small"
                      variant={repoFilters.includes(repo) ? 'primary' : 'default'}
                      onClick={() => {
                        if (repoFilters.includes(repo)) {
                          // Remove from selection
                          setRepoFilters(prev => prev.filter(r => r !== repo));
                        } else {
                          // Add to selection
                          setRepoFilters(prev => [...prev, repo]);
                        }
                      }}
                      sx={{
                        borderColor: repoFilters.includes(repo) ? 'accent.emphasis' : 'border.default',
                        color: 'fg.default'
                      }}
                    >
                      {repo.split('/')[1] || repo} {/* Show only repo name, not owner/repo */}
                    </Button>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {/* Text Search */}
          {results.length > 0 && (
            <Box sx={{maxWidth: '800px', margin: '16px auto 0'}}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Text as="label" htmlFor="searchText" sx={{ fontWeight: 'bold', fontSize: 1 }}>Text Search</Text>
                <TextInput
                  id="searchText"
                  aria-label="Text Search"
                  name="searchText"
                  placeholder="Search in title and description..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  leadingVisual={() => (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                      <path fillRule="evenodd" d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"></path>
                    </svg>
                  )}
                  trailingAction={searchText ? (
                    <TextInput.Action onClick={() => setSearchText('')} aria-label="Reset search">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
                        <path fillRule="evenodd" d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z"></path>
                      </svg>
                    </TextInput.Action>
                  ) : null}
                  sx={{width: '100%'}}
                  block
                />
              </Box>
            </Box>
          )}

          {loading && (
            <Box sx={{maxWidth: '800px', margin: '32px auto', textAlign: 'center'}}>
              <Spinner size="large" />
              {loadingProgress && (
                <Text sx={{ mt: 2, color: 'fg.muted' }}>{loadingProgress}</Text>
              )}
            </Box>
          )}

          {filteredResults.length > 0 && (
            <Box sx={{maxWidth: '800px', margin: '24px auto'}}>
              <Box sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 3,
                borderBottom: '1px solid',
                borderColor: 'border.default',
                pb: 2
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Text as="h2" sx={{fontSize: 3, fontWeight: 'semibold', color: 'fg.default'}}>Results</Text>
                  {clipboardMessage && (
                    <Flash variant="success" sx={{ py: 1, px: 2 }}>
                      {clipboardMessage}
                    </Flash>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button 
                    onClick={copyResultsToClipboard}
                    variant="outline"
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 1,
                      fontSize: 1
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ display: 'inline-block', verticalAlign: 'text-bottom' }}>
                      <path fillRule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path>
                      <path fillRule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path>
                    </svg>
                    Export to Clipboard
                  </Button>
                  <Box sx={{display: 'flex', gap: 3}}>
                    <Box sx={{textAlign: 'center'}}>
                      <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'fg.default'}}>{stats.total}</Text>
                      <Text sx={{fontSize: 1, color: 'fg.muted'}}>Total</Text>
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                      <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'accent.fg'}}>{stats.issues}</Text>
                      <Text sx={{fontSize: 1, color: 'fg.muted'}}>Issues</Text>
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                      <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'success.fg'}}>{stats.prs}</Text>
                      <Text sx={{fontSize: 1, color: 'fg.muted'}}>PRs</Text>
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                      <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'success.fg'}}>{stats.open}</Text>
                      <Text sx={{fontSize: 1, color: 'fg.muted'}}>Open</Text>
                    </Box>
                    <Box sx={{textAlign: 'center'}}>
                      <Text sx={{fontSize: 4, fontWeight: 'bold', color: 'done.fg'}}>{stats.closed}</Text>
                      <Text sx={{fontSize: 1, color: 'fg.muted'}}>Closed</Text>
                    </Box>
                  </Box>
                </Box>
              </Box>
              <Box>
                {filteredResults.map((item) => (
                  <Box key={item.id} sx={{ border: '1px solid', borderColor: 'border.default', borderRadius: 2, p: 3, mb: 3, bg: 'canvas.subtle' }}>
                    {/* Project info if available */}
                    {item.repository_url && (
                      <Box sx={{mb: 2}}>
                        <Text as="span" sx={{fontWeight: 'bold', color: 'fg.muted', fontSize: 1}}>Project: </Text>
                        <Link
                          href={`https://github.com/${item.repository_url.replace('https://api.github.com/repos/', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{fontSize: 1, color: 'accent.fg'}}
                        >{item.repository_url.replace('https://api.github.com/repos/', '')}</Link>
                      </Box>
                    )}
                    <Link href={item.html_url} target="_blank" rel="noopener noreferrer" sx={{display: 'block', mb: 1}}>
                      <Text sx={{fontWeight: 'semibold', fontSize: 2, color: 'accent.fg'}}>{item.title}</Text>
                    </Link>
                    <Box sx={{display: 'flex', gap: 1, alignItems: 'center', mb: 1, flexWrap: 'wrap'}}>
                      <Label variant={item.pull_request ? 'success' : 'accent' as PrimerLabelVariant}>
                        {item.pull_request ? 'PR' : 'Issue'}
                      </Label>
                      <Label variant={item.state === 'open' ? 'success' : 'done' as PrimerLabelVariant}>
                        {item.state}
                      </Label>
                      {/* Display labels nicely */}
                      {item.labels && item.labels.map(l => (
                        <Label
                          key={l.name}
                          sx={{
                            ml: 1,
                            backgroundColor: l.color ? `#${l.color}` : undefined,
                            color: l.color ? getContrastColor(l.color) : undefined,
                            fontWeight: 'bold',
                            fontSize: 0,
                            cursor: 'pointer',
                          }}
                          title={l.description || l.name}
                          onClick={() => setLabelFilter(l.name)}
                        >{l.name}</Label>
                      ))}
                    </Box>
                    <Box sx={{fontSize: 0, color: 'fg.muted', mt: 2, display: 'flex', alignItems: 'center', gap: 3}}>
                      <Box sx={{display: 'flex', gap: 2}}>
                        <Text>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                        <Text>Updated: {new Date(item.updated_at).toLocaleDateString()}</Text>
                      </Box>
                      {item.body && (
                        <Button 
                          size="small" 
                          variant={descriptionVisible[item.id] ? "primary" : "default"}
                          onClick={() => toggleDescriptionVisibility(item.id)}
                          sx={{ ml: 'auto' }}
                        >
                          {descriptionVisible[item.id] ? 'Hide description' : 'Show description'}
                        </Button>
                      )}
                    </Box>
                    
                    {/* Description shown only on demand */}
                    {item.body && descriptionVisible[item.id] && (
                      <Box sx={{
                        maxHeight: expanded[item.id] ? 'none' : '200px',
                        overflow: 'hidden',
                        position: 'relative',
                        mt: 2,
                        bg: 'canvas.default',
                        p: 2,
                        borderRadius: 1,
                        border: '1px solid',
                        borderColor: 'border.muted',
                        fontSize: 1,
                        color: 'fg.muted',
                      }}>
                        <ReactMarkdown 
                          remarkPlugins={[remarkGfm]}
                          components={{
                            a: ({node, ...props}) => (
                              <Link 
                                target="_blank" 
                                rel="noopener noreferrer"
                                sx={{color: 'accent.fg'}}
                                {...props} 
                              />
                            ),
                            pre: ({node, ...props}) => (
                              <Box 
                                as="pre"
                                sx={{
                                  bg: 'canvas.subtle',
                                  p: 2,
                                  borderRadius: 1,
                                  overflowX: 'auto',
                                  fontSize: 0,
                                  border: '1px solid',
                                  borderColor: 'border.muted'
                                }}
                                {...props}
                              />
                            ),
                            code: ({node, inline, ...props}) => (
                              inline
                                ? <Box as="code" sx={{bg: 'canvas.subtle', p: '2px 4px', borderRadius: 1, fontSize: 0}} {...props} />
                                : <Box as="code" sx={{display: 'block', fontSize: 0}} {...props} />
                            ),
                            img: ({node, ...props}) => (
                              <Box as="img" sx={{maxWidth: '100%', height: 'auto'}} {...props} />
                            )
                          }}
                        >
                          {item.body}
                        </ReactMarkdown>
                        {!expanded[item.id] && item.body.length > 400 && (
                          <Box sx={{
                            position: 'absolute', 
                            bottom: 0, 
                            left: 0, 
                            width: '100%', 
                            height: '3em', 
                            background: 'linear-gradient(to bottom, transparent, var(--color-canvas-default) 90%)'
                          }} />
                        )}
                        
                        {item.body.length > 400 && (
                          <Button 
                            size="small" 
                            variant="invisible" 
                            onClick={() => toggleExpand(item.id)}
                            sx={{ mt: 1 }}
                          >
                            {expanded[item.id] ? 'Show less' : 'Show more'}
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ))}
              </Box>
            </Box>
          )}
          {filteredResults.length === 0 && !error && username && startDate && endDate && ( // Show only after a search attempt
              <Box sx={{maxWidth: '800px', margin: '24px auto', textAlign: 'center'}}>
                   <Text sx={{color: 'fg.default'}}>No results to display for the given criteria.</Text>
              </Box>
          )}
        </PageLayout.Content>
      </PageLayout>
    </Box>
  );
}

export default App;
