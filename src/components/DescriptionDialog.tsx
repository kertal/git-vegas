import { memo, useEffect, ReactNode, useState } from 'react';
import {
  Box,
  Dialog,
  IconButton,
  Label,
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
import { getActionVariant } from '../utils/actionUtils';

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
  maxHeight = '85vh',
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
      position="right" 
      renderFooter={() => (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', px: 2 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            opacity: hasPrevious ? 1 : 0.5,
            cursor: hasPrevious ? 'pointer' : 'default'
          }}>
            <IconButton
              icon={ChevronLeftIcon}
              aria-label="Previous item"
              onClick={onPrevious}
              disabled={!hasPrevious}
              sx={{
                color: hasPrevious ? 'fg.default' : 'fg.muted',
                '&:hover': hasPrevious ? { bg: 'neutral.subtle' } : {},
              }}
            />
            <Text sx={{ 
              fontSize: 0, 
              color: hasPrevious ? 'fg.default' : 'fg.muted', 
              fontWeight: 500,
              userSelect: 'none'
            }}>
              Previous
            </Text>
          </Box>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 1,
            opacity: hasNext ? 1 : 0.5,
            cursor: hasNext ? 'pointer' : 'default'
          }}>
            <Text sx={{ 
              fontSize: 0, 
              color: hasNext ? 'fg.default' : 'fg.muted', 
              fontWeight: 500,
              userSelect: 'none'
            }}>
              Next
            </Text>
            <IconButton
              icon={ChevronRightIcon}
              aria-label="Next item"
              onClick={onNext}
              disabled={!hasNext}
              sx={{
                color: hasNext ? 'fg.default' : 'fg.muted',
                '&:hover': hasNext ? { bg: 'neutral.subtle' } : {},
              }}
            />
          </Box>
        </Box>
      )}
    >
      <Box sx={{ 
        p: 3, 
        maxHeight, 
        overflow: 'auto', 
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Event Metadata */}
        {(item.action || item.originalEventType) && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              mb: 3,
              flexWrap: 'wrap'
            }}
          >
            {item.action && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Action:</Text>
                <Label variant={getActionVariant(item.action)} size="small">
                  {item.action}
                </Label>
              </Box>
            )}
            {item.originalEventType && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>Event:</Text>
                <Label variant="secondary" size="small">
                  {item.originalEventType}
                </Label>
              </Box>
            )}
          </Box>
        )}

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
          <Box sx={{ minHeight: '50vh', flex: 1 }}>
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
              maxHeight: 'calc(85vh - 200px)',
              minHeight: '50vh',
              flex: 1,
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