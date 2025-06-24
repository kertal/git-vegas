import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@primer/react';
import CustomSectionDisplay from '../CustomSectionDisplay';
import { CustomSection } from '../../types';

// Mock the App context
const mockFormContext = {
  githubToken: 'test-token',
};

vi.mock('../../App', () => ({
  useFormContext: () => mockFormContext,
}));

// Mock the utilities
vi.mock('../../utils/customSections', () => ({
  default: {
    loadSectionData: vi.fn().mockResolvedValue(null),
    needsRefresh: vi.fn().mockResolvedValue(true),
    storeSectionData: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../../utils/customSectionAPI', () => ({
  default: {
    fetchSectionData: vi.fn().mockResolvedValue({ items: [], events: [] }),
  },
}));

const mockSection: CustomSection = {
  id: 'test-section',
  title: 'Test Section',
  repository: 'owner/repo',
  labels: ['bug', 'high-priority'],
  type: 'issues',
  maxItems: 10,
  enabled: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const renderCustomSectionDisplay = (section: CustomSection = mockSection) => {
  return render(
    <ThemeProvider>
      <CustomSectionDisplay section={section} />
    </ThemeProvider>
  );
};

describe('CustomSectionDisplay', () => {
  it('should render section title and repository info', () => {
    renderCustomSectionDisplay();

    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText(/owner\/repo • bug, high-priority/)).toBeInTheDocument();
  });

  it('should not render disabled sections', () => {
    const disabledSection = { ...mockSection, enabled: false };
    const { container } = renderCustomSectionDisplay(disabledSection);

    expect(container.firstChild).toBeNull();
  });

  it('should show loading state when no items found', () => {
    renderCustomSectionDisplay();

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('should render refresh button', () => {
    renderCustomSectionDisplay();

    const refreshButton = screen.getByRole('button');
    expect(refreshButton).toBeInTheDocument();
  });
}); 