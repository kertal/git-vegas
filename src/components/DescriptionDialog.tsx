import { memo, useEffect, ReactNode, useState } from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Link,
  Button,
  Text,
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
        <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant={viewMode === 'description' ? 'primary' : 'invisible'}
            onClick={() => setViewMode('description')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <FileIcon size={14} />
            Description
          </Button>
          <Button
            size="small"
            variant={viewMode === 'json' ? 'primary' : 'invisible'}
            onClick={() => setViewMode('json')}
            sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CodeIcon size={14} />
            Raw JSON
          </Button>
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
              Raw JSON Object:
            </Text>
            {JSON.stringify(item, null, 2)}
          </Box>
        )}
      </Box>
    </Dialog>
  );
});

export default DescriptionDialog; 