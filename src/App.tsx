import { useState, useEffect } from 'react';
import './App.css';

interface GitHubItem {
  id: number;
  html_url: string;
  title: string;
  pull_request?: object; // Present if it's a Pull Request
  created_at: string;
  updated_at: string;
  state: string; // Add state field
}

function App() {
  const [username, setUsername] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [results, setResults] = useState<GitHubItem[]>([]);

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
      alert('Please fill in all fields.');
      return;
    }

    try {
      const response = await fetch(
        `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+created:${startDate}..${endDate}`
      );
      const data = await response.json();
      setResults(data.items || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      alert('Failed to fetch data. Please try again.');
    }
  };

  return (
    <div className="App min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-center text-blue-600 mb-6">GitHub Issues & PRs Viewer</h1>
      <div className="form max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
        <input
          type="text"
          placeholder="GitHub Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full mb-4 p-2 border border-gray-300 rounded"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full mb-4 p-2 border border-gray-300 rounded"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-full mb-4 p-2 border border-gray-300 rounded"
        />
        <button
          onClick={fetchGitHubData}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
        >
          Submit
        </button>
      </div>
      <div className="results max-w-4xl mx-auto mt-8">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Results</h2>
        {results.length > 0 ? (
          <div className="overflow-x-auto shadow-md sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Type
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    State
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Created At
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Last Updated
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {results.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={item.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-semibold"
                      >
                        {item.title}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.pull_request
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {item.pull_request ? 'PR' : 'Issue'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.state}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.updated_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-600">No results to display.</p>
        )}
      </div>
    </div>
  );
}

export default App;
