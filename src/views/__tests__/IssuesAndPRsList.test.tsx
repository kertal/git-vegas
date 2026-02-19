import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '@primer/react';
import IssuesAndPRsList from '../IssuesAndPRsList';
import { GitHubItem } from '../../types';

// Mock useFormContext
vi.mock('../../App', () => ({
  useFormContext: () => ({
    searchText: '',
    setSearchText: vi.fn(),
  }),
}));

// Mock useLocalStorage to use plain useState
vi.mock('../../hooks/useLocalStorage', () => ({
  useLocalStorage: (_key: string, initial: unknown) => {
    const { useState } = require('react');
    return useState(initial);
  },
}));

const createMockItem = (id: number, isPR: boolean, title?: string): GitHubItem => ({
  id,
  html_url: `https://github.com/test/repo/${isPR ? 'pull' : 'issues'}/${id}`,
  title: title || `Test ${isPR ? 'PR' : 'Issue'} #${id}`,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: new Date(2024, 0, 15, 0, 0, id).toISOString(), // unique updated_at for sorting
  state: 'open',
  user: {
    login: 'testuser',
    avatar_url: 'https://github.com/testuser.png',
    html_url: 'https://github.com/testuser',
  },
  labels: [],
  repository_url: 'https://api.github.com/repos/test/repo',
  event_id: `event-${id}`,
  ...(isPR ? { pull_request: { url: `https://github.com/test/repo/pull/${id}` } } : {}),
});

const generateItems = (count: number, isPR: boolean, startId = 1): GitHubItem[] =>
  Array.from({ length: count }, (_, i) => createMockItem(startId + i, isPR));

const renderComponent = (results: GitHubItem[]) =>
  render(
    <ThemeProvider>
      <IssuesAndPRsList results={results} />
    </ThemeProvider>
  );

describe('IssuesAndPRsList pagination', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('does not show pagination when items are <= 100', () => {
    const items = [...generateItems(50, true), ...generateItems(30, false, 100)];
    renderComponent(items);

    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('shows pagination for a section with more than 100 items', () => {
    const items = generateItems(150, true);
    renderComponent(items);

    const nav = screen.getByRole('navigation', { name: /pagination/i });
    expect(nav).toBeInTheDocument();
  });

  it('only renders 100 items on the first page of a paginated section', () => {
    const items = generateItems(150, true);
    renderComponent(items);

    // Each item renders as a row with a checkbox; count checkboxes inside the section
    // The section content should have 100 item rows + the select all + section checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 select-all + 1 section checkbox + 100 item checkboxes = 102
    expect(checkboxes).toHaveLength(102);
  });

  it('navigates to the next page when clicking page 2', async () => {
    const user = userEvent.setup();
    const items = generateItems(150, true);
    renderComponent(items);

    const nav = screen.getByRole('navigation', { name: /pagination/i });
    const page2Button = within(nav).getByText('2');
    await user.click(page2Button);

    // After navigating to page 2, should show 50 remaining items
    const checkboxes = screen.getAllByRole('checkbox');
    // 1 select-all + 1 section checkbox + 50 item checkboxes = 52
    expect(checkboxes).toHaveLength(52);
  });

  it('select all selects items across all pages', async () => {
    const user = userEvent.setup();
    const items = generateItems(150, true);
    renderComponent(items);

    const selectAllCheckbox = screen.getByLabelText('Select all items');
    await user.click(selectAllCheckbox);

    // Select all should be checked (all 150 items selected, not just page 1's 100)
    expect(selectAllCheckbox).toBeChecked();

    // Navigate to page 2 - items there should also be selected
    const nav = screen.getByRole('navigation', { name: /pagination/i });
    const page2Button = within(nav).getByText('2');
    await user.click(page2Button);

    // All checkboxes on page 2 should be checked
    const itemCheckboxes = screen.getAllByRole('checkbox').filter(
      cb => cb.getAttribute('aria-label') !== 'Select all items' &&
            !cb.getAttribute('aria-label')?.startsWith('Select all items in')
    );
    itemCheckboxes.forEach(cb => {
      expect(cb).toBeChecked();
    });
  });

  it('deselect all clears items on all pages', async () => {
    const user = userEvent.setup();
    const items = generateItems(150, true);
    renderComponent(items);

    const selectAllCheckbox = screen.getByLabelText('Select all items');
    // Select all
    await user.click(selectAllCheckbox);
    expect(selectAllCheckbox).toBeChecked();

    // Deselect all
    await user.click(selectAllCheckbox);
    expect(selectAllCheckbox).not.toBeChecked();

    // Navigate to page 2 - items should not be selected
    const nav = screen.getByRole('navigation', { name: /pagination/i });
    const page2Button = within(nav).getByText('2');
    await user.click(page2Button);

    const itemCheckboxes = screen.getAllByRole('checkbox').filter(
      cb => cb.getAttribute('aria-label') !== 'Select all items' &&
            !cb.getAttribute('aria-label')?.startsWith('Select all items in')
    );
    itemCheckboxes.forEach(cb => {
      expect(cb).not.toBeChecked();
    });
  });

  it('shows independent pagination for PRs and Issues sections', () => {
    const items = [
      ...generateItems(150, true),         // 150 PRs
      ...generateItems(120, false, 1000),   // 120 Issues
    ];
    renderComponent(items);

    const navs = screen.getAllByRole('navigation', { name: /pagination/i });
    expect(navs).toHaveLength(2); // one for PRs, one for Issues
  });
});
