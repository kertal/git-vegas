import { useState, useEffect, memo } from 'react';
import {
  Dialog,
  Box,
  Heading,
  Text,
  Button,
  ButtonGroup,
  ProgressBar,
  Flash,
} from '@primer/react';
import { 
  getStorageStats, 
  getStorageInfo, 
  clearAllGitHubData,
  StorageInfo 
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
  const [storageInfo, setStorageInfo] = useState<StorageInfo[]>([]);
  const [stats, setStats] = useState(getStorageStats());
  const [indexedDBInfo, setIndexedDBInfo] = useState<{ eventsCount: number; metadataCount: number; totalSize: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
      
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
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
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

  const handleClearItem = (key: string) => {
    if (window.confirm(`Are you sure you want to clear "${key}"?`)) {
      localStorage.removeItem(key);
      setStorageInfo(getStorageInfo());
      setStats(getStorageStats());
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
        {/* Storage Statistics */}
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
            Storage Usage
          </Heading>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 3, mb: 3 }}>
            <Box>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Total Used:</Text>
              <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                {formatBytes(stats.totalSize)}
              </Text>
            </Box>
            <Box>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Available:</Text>
              <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                {formatBytes(stats.availableSpace)}
              </Text>
            </Box>
            <Box>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Usage:</Text>
              <Text 
                sx={{ 
                  fontSize: 1, 
                  fontFamily: 'mono', 
                  fontWeight: 'semibold',
                  color: stats.isNearLimit ? 'danger.fg' : 'fg.default'
                }}
              >
                {stats.usagePercent.toFixed(1)}%
              </Text>
            </Box>
            <Box>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>Limit:</Text>
              <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                {formatBytes(stats.maxSize)}
              </Text>
            </Box>
          </Box>
          
          {/* Progress bar */}
          <Box sx={{ mb: 2 }}>
            <ProgressBar
              progress={Math.min(stats.usagePercent, 100)}
              sx={{
                '& [data-component="ProgressBar.Item"]': {
                  backgroundColor: stats.isNearLimit ? 'danger.emphasis' : 'accent.emphasis',
                },
              }}
            />
          </Box>
          
          {stats.isNearLimit && (
            <Flash variant="warning" sx={{ mb: 0 }}>
              ⚠️ Storage is nearly full. Consider clearing old data.
            </Flash>
          )}

          {/* IndexedDB Info */}
          {indexedDBInfo && (
            <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'border.muted' }}>
              <Heading as="h4" sx={{ fontSize: 1, mb: 2, color: 'fg.default' }}>
                IndexedDB Storage
              </Heading>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3 }}>
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
            </Box>
          )}
        </Box>

        {/* Storage Items */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Heading as="h3" sx={{ fontSize: 2, color: 'fg.default' }}>
              Stored Data
            </Heading>
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
          
          {storageInfo.length === 0 && !indexedDBInfo?.eventsCount ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Text sx={{ fontSize: 1, color: 'fg.muted' }}>No data stored</Text>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {storageInfo.map((item) => (
                <Box 
                  key={item.key}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 3,
                    bg: 'canvas.subtle',
                    border: '1px solid',
                    borderColor: 'border.default',
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Text sx={{ fontSize: 1, fontFamily: 'mono', fontWeight: 'semibold' }}>
                      {item.key}
                    </Text>
                    <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                      {formatBytes(item.size)}
                    </Text>
                  </Box>
                  <Button
                    variant="default"
                    size="small"
                    onClick={() => handleClearItem(item.key)}
                    sx={{ ml: 2 }}
                  >
                    Clear
                  </Button>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        {/* Help Text */}
        <Box
          sx={{
            p: 3,
            bg: 'accent.subtle',
            border: '1px solid',
            borderColor: 'accent.muted',
            borderRadius: 2,
          }}
        >
          <Heading as="h4" sx={{ fontSize: 1, mb: 2, color: 'accent.fg' }}>
            About Storage
          </Heading>
          <Text as="ul" sx={{ fontSize: 1, color: 'fg.default', pl: 3 }}>
            <li>Events and search items are stored in IndexedDB for better performance and larger capacity</li>
            <li>Other settings use localStorage (limited to ~5MB)</li>
            <li>Old data is automatically cleared when space is needed</li>
            <li>You can manually clear data to free up space</li>
          </Text>
        </Box>
      </Box>
    </Dialog>
  );
}); 