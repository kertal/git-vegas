import { useState, useEffect, memo } from 'react';
import {
  Dialog,
  Box,
  Heading,
  Text,
  Button,
  ButtonGroup,
} from '@primer/react';
import { 
  clearAllGitHubData
} from '../utils/storageUtils';
import { eventsStorage } from '../utils/indexedDB';

interface StorageManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onClearEvents?: () => void;
  onClearSearchItems?: () => void;
}

export const StorageManager = memo(function StorageManager({ 
  isOpen, 
  onClose, 
  onClearEvents, 
  onClearSearchItems 
}: StorageManagerProps) {
  const [indexedDBInfo, setIndexedDBInfo] = useState<{ eventsCount: number; metadataCount: number; totalSize: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Get IndexedDB info
      eventsStorage.getInfo().then(info => {
        setIndexedDBInfo(info);
      }).catch(() => {
        setIndexedDBInfo(null);
      });
    }
  }, [isOpen]);

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all GitHub data? This action cannot be undone.')) {
      clearAllGitHubData();
      eventsStorage.clear().catch(console.error);
      onClearEvents?.();
      onClearSearchItems?.();
      setIndexedDBInfo(null);
    }
  };

  const handleClearEvents = () => {
    if (window.confirm('Are you sure you want to clear all events data? This action cannot be undone.')) {
      eventsStorage.clear().catch(console.error);
      onClearEvents?.();
      setIndexedDBInfo(null);
    }
  };

  const handleClearSearchItems = () => {
    if (window.confirm('Are you sure you want to clear all search items data? This action cannot be undone.')) {
      onClearSearchItems?.();
    }
  };



  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <Dialog
      onClose={onClose}
      title="Storage Manager"
      position="right" 
    >

      <Box sx={{ p: 3, maxHeight: 'calc(80vh - 120px)', overflow: 'auto' }}>
        {/* IndexedDB Info */}
        {indexedDBInfo && (
          <Box
            sx={{
              mb: 4,
              p: 3,
              bg: 'canvas.subtle',
              border: '1px solid',
              borderColor: 'border.default',
              borderRadius: 2,
            }}
          >
            <Heading as="h3" sx={{ fontSize: 2, mb: 3, color: 'fg.default' }}>
              IndexedDB Storage
            </Heading>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, mb: 3 }}>
              <Box>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Events:</Text>
                <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                  {indexedDBInfo.eventsCount}
                </Text>
              </Box>
              <Box>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Metadata:</Text>
                <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                  {indexedDBInfo.metadataCount}
                </Text>
              </Box>
              <Box>
                <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Size:</Text>
                <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                  {formatBytes(indexedDBInfo.totalSize)}
                </Text>
              </Box>
            </Box>
            <ButtonGroup>
              <Button
                variant="default"
                size="small"
                onClick={handleClearEvents}
                sx={{ 
                  bg: 'attention.subtle',
                  color: 'attention.fg',
                  borderColor: 'attention.muted',
                  ':hover': {
                    bg: 'attention.emphasis',
                    color: 'fg.onEmphasis',
                  }
                }}
              >
                Clear Events
              </Button>
              <Button
                variant="default"
                size="small"
                onClick={handleClearSearchItems}
                sx={{ 
                  bg: 'severe.subtle',
                  color: 'severe.fg',
                  borderColor: 'severe.muted',
                  ':hover': {
                    bg: 'severe.emphasis',
                    color: 'fg.onEmphasis',
                  }
                }}
              >
                Clear Search Items
              </Button>
              <Button
                variant="danger"
                size="small"
                onClick={handleClearAll}
              >
                Clear All
              </Button>
            </ButtonGroup>
          </Box>
        )}


      </Box>
    </Dialog>
  );
}); 