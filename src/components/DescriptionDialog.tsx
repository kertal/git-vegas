import { memo, useEffect, ReactNode, useState } from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Link,
  Text,
  UnderlineNav,
} from '@primer/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CodeIcon,
  FileIcon,
} from '@primer/octicons-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { GitHubItem } from '../types';

interface DescriptionDialogProps {
  item: GitHubItem | null;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  hasPrevious: boolean;
  hasNext: boolean;
  title?: string | ReactNode;
  maxHeight?: string;
}

const DescriptionDialog = memo(function DescriptionDialog({
  item,
  onClose,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  title,
  maxHeight = '40vh',
}: DescriptionDialogProps) {
  const [viewMode, setViewMode] = useState<'description' | 'json'>('description');

  // Add keyboard navigation
  useEffect(() => {
    if (!item) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [item, onPrevious, onNext, onClose, hasPrevious, hasNext]);

  // Reset view mode when item changes
  useEffect(() => {
    setViewMode('description');
  }, [item]);

  if (!item) return null;

  return (
    <Dialog
      onClose={onClose}
      role="dialog"
      title={title || item.title}
      renderFooter={() => (
        <div>
          <IconButton
            icon={ChevronLeftIcon}
            aria-label="Previous item"
            onClick={onPrevious}
            disabled={!hasPrevious}
            sx={{
              color: hasPrevious ? 'fg.default' : 'fg.muted',
            }}
          />
          <IconButton
            icon={ChevronRightIcon}
            aria-label="Next item"
            onClick={onNext}
            disabled={!hasNext}
            sx={{
              color: hasNext ? 'fg.default' : 'fg.muted',
            }}
          />
        </div>
      )}
    >
      <Box sx={{ p: 3, maxHeight, overflow: 'auto' }}>
        {/* View Mode Toggle */}
        <Box sx={{ mb: 3 }}>
          <UnderlineNav aria-label="View mode">
            <UnderlineNav.Item
              href="#"
              aria-current={viewMode === 'description' ? 'page' : undefined}
              onSelect={(e) => {
                e.preventDefault();
                setViewMode('description');
              }}
              icon={FileIcon}
            >
              Description
            </UnderlineNav.Item>
            <UnderlineNav.Item
              href="#"
              aria-current={viewMode === 'json' ? 'page' : undefined}
              onSelect={(e) => {
                e.preventDefault();
                setViewMode('json');
              }}
              icon={CodeIcon}
            >
              Raw JSON
            </UnderlineNav.Item>
          </UnderlineNav>
        </Box>

        {/* Content */}
        {viewMode === 'description' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              a: ({ href, children }) => (
                <Link href={href} target="_blank" rel="noopener noreferrer">
                  {children}
                </Link>
              ),
            }}
          >
            {item.body || 'No description available.'}
          </ReactMarkdown>
        ) : (
          <Box
            sx={{
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
              p: 2,
              fontFamily: 'monospace',
              fontSize: 0,
              whiteSpace: 'pre-wrap',
              overflow: 'auto',
              maxHeight: 'calc(100vh - 300px)',
            }}
          >
            <Text sx={{ fontSize: 0, color: 'fg.muted', mb: 2, display: 'block' }}>
              Original Event Data:
            </Text>
            {item.original ? (
              JSON.stringify(item.original, null, 2)
            ) : (
              <Text sx={{ color: 'fg.muted', fontStyle: 'italic' }}>
                No original event data available for this item.
              </Text>
            )}
          </Box>
        )}
      </Box>
    </Dialog>
  );
});

export default DescriptionDialog; 