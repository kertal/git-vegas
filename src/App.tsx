import { useState, useEffect } from 'react';
import type { FormEvent } from 'react'; // Changed to type-only import
import './App.css';
import { TextInput, Button, Box, Text, Link, Label, PageLayout, Flash } from '@primer/react';
// Commenting out the problematic Table import for now to isolate the issue
// import { Table } from '@primer/react/drafts';

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: object; // Present if it's a Pull Request
  created_at: string;
  updated_at: string;
  state: string;
}

// Define a type for Label variants based on Primer's documentation
type PrimerLabelVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'success' | 'attention' | 'severe' | 'danger' | 'done' | 'sponsors';

function App() {
  const [username, setUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<GitHubItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load saved state from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('github-username');
    const savedStartDate = localStorage.getItem('start-date');
    const savedEndDate = localStorage.getItem('end-date');
    const savedResults = localStorage.getItem('results');

    if (savedUsername) setUsername(savedUsername);
    if (savedStartDate) setStartDate(savedStartDate);
    if (savedEndDate) setEndDate(savedEndDate);
    if (savedResults) setResults(JSON.parse(savedResults));
  }, []);

  // Save state to localStorage
  useEffect(() => {
    localStorage.setItem('github-username', username);
    localStorage.setItem('start-date', startDate);
    localStorage.setItem('end-date', endDate);
    localStorage.setItem('results', JSON.stringify(results));
  }, [username, startDate, endDate, results]);

  const fetchGitHubData = async () => {
    if (!username || !startDate || !endDate) {
      setError('Please fill in all fields.');
      return;
    }
    setError(null);

    try {
      const response = await fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+created:${startDate}..${endDate}`
      );
      const data = await response.json();
      if (response.ok) {
        setResults(data.items || []);
      } else {
        setError(data.message || 'Failed to fetch data. Please try again.');
        setResults([]);
      }
    } catch (err: unknown) { // Changed error type to unknown
      console.error('Error fetching data:', err);
      if (err instanceof Error) {
        setError(err.message || 'Failed to fetch data. Please try again.');
      } else {
        setError('An unknown error occurred. Please try again.');
      }
      setResults([]);
    }
  };

  return (
    <PageLayout>
      <PageLayout.Header>
        <Box sx={{padding: '16px'}}>
          <Text as="h1" sx={{fontSize: 3, fontWeight: 'bold', color: 'fg.default'}}>GitHub Issues & PRs Viewer</Text>
        </Box>
      </PageLayout.Header>
      <PageLayout.Content>
        <Box sx={{maxWidth: '600px', margin: '0 auto', padding: '16px'}}>
          <Box as="form" sx={{display: 'flex', flexDirection: 'column', gap: '16px'}} onSubmit={(e: FormEvent<HTMLFormElement>) => { e.preventDefault(); fetchGitHubData(); }}> {/* Typed event `e` */}
            <TextInput
              aria-label="GitHub Username"
              name="username"
              placeholder="GitHub Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              sx={{width: '100%'}}
            />
            <TextInput
              aria-label="Start Date"
              name="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              sx={{width: '100%'}}
            />
            <TextInput
              aria-label="End Date"
              name="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              sx={{width: '100%'}}
            />
            <Button variant="primary" type="submit" sx={{width: '100%'}}>Submit</Button>
          </Box>
          {error && (
            <Flash variant="danger" sx={{marginTop: '16px'}}>
              {error}
            </Flash>
          )}
        </Box>

        {results.length > 0 && (
          <Box sx={{marginTop: '24px', padding: '16px'}}>
            <Text as="h2" sx={{fontSize: 2, fontWeight: 'semibold', marginBottom: '16px'}}>Results</Text>
            {/* Temporarily replace Table with a simpler list structure */}
            <ul>
              {results.map((item) => (
                <li key={item.id} style={{ marginBottom: '8px', padding: '8px', border: '1px solid #d0d7de', borderRadius: '6px' }}>
                  <Link href={item.html_url} target="_blank" rel="noopener noreferrer">
                    <Text sx={{fontWeight: 'bold'}}>{item.title}</Text>
                  </Link>
                  <Box sx={{display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px'}}>
                    <Label variant={item.pull_request ? 'success' : 'default' as PrimerLabelVariant}>
                      {item.pull_request ? 'PR' : 'Issue'}
                    </Label>
                    <Label variant="default">{item.state}</Label>
                  </Box>
                  <Box sx={{fontSize: 0, color: 'fg.muted', marginTop: '4px'}}>
                    <Text>Created: {new Date(item.created_at).toLocaleDateString()}</Text>
                    <Text sx={{marginLeft: '8px'}}>Updated: {new Date(item.updated_at).toLocaleDateString()}</Text>
                  </Box>
                </li>
              ))}
            </ul>
          </Box>
        )}
        {results.length === 0 && !error && (
            <Box sx={{marginTop: '24px', padding: '16px', textAlign: 'center'}}>
                 <Text>No results to display.</Text>
            </Box>
        )}
      </PageLayout.Content>
    </PageLayout>
  );
}

export default App;
