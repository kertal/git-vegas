import { memo, useEffect, ReactNode } from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Link,
} from '@primer/react';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
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
      </Box>
    </Dialog>
  );
});

export default DescriptionDialog; 