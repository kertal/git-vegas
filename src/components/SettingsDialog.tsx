import { memo, useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Heading,
  Text,
  FormControl,
  TextInput,
  Button,
  ButtonGroup,
} from '@primer/react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFormContext } from '../App';
import { SettingsDialogProps } from '../types';
import { clearAllGitHubData } from '../utils/storageUtils';
import { eventsStorage } from '../utils/indexedDB';

const SettingsDialog = memo(function SettingsDialog({
  isOpen,
  onDismiss,
  onClearEvents,
  onClearSearchItems,
}: SettingsDialogProps) {
  const { githubToken, setGithubToken } = useFormContext();
  const [tokenStorage, setTokenStorage] = useLocalStorage(
    'github-token-storage',
    'session'
  );

  // Local state for form values (before saving)
  const [localToken, setLocalToken] = useState('');
  const [localTokenStorage, setLocalTokenStorage] = useState('session');
  
  // Storage management state
  const [indexedDBInfo, setIndexedDBInfo] = useState<{ eventsCount: number; metadataCount: number; totalSize: number } | null>(null);

  // Initialize local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalToken(githubToken);
      setLocalTokenStorage(tokenStorage);
      
      // Get IndexedDB info
      eventsStorage.getInfo().then(info => {
        setIndexedDBInfo(info);
      }).catch(() => {
        setIndexedDBInfo(null);
      });
    }
  }, [isOpen, githubToken, tokenStorage]);

  const handleSave = useCallback(() => {
    // Apply token changes
    setGithubToken(localToken);

    // Apply storage changes
    if (localTokenStorage !== tokenStorage) {
      setTokenStorage(localTokenStorage);

      // Move token to selected storage
      if (localTokenStorage === 'local') {
        const sessionToken = sessionStorage.getItem('github-token');
        if (sessionToken) {
          localStorage.setItem('github-token', sessionToken);
          sessionStorage.removeItem('github-token');
        }
      } else {
        const localToken = localStorage.getItem('github-token');
        if (localToken) {
          sessionStorage.setItem('github-token', localToken);
          localStorage.removeItem('github-token');
        }
      }
    }

    // Save token to the selected storage
    if (localTokenStorage === 'local') {
      if (localToken) {
        localStorage.setItem('github-token', localToken);
      } else {
        localStorage.removeItem('github-token');
      }
    } else {
      if (localToken) {
        sessionStorage.setItem('github-token', localToken);
      } else {
        sessionStorage.removeItem('github-token');
      }
    }

    onDismiss();
  }, [localToken, localTokenStorage, tokenStorage, setGithubToken, setTokenStorage, onDismiss]);

  const handleCancel = useCallback(() => {
    // Reset local state to current values
    setLocalToken(githubToken);
    setLocalTokenStorage(tokenStorage);
    onDismiss();
  }, [githubToken, tokenStorage, onDismiss]);

  // Storage management functions
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
      onClose={handleCancel}
      title="Settings"
      position="right" 
    >

      <Box sx={{ p: 3 }}>
        {/* Storage Management Section */}
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
            Data Storage
          </Heading>
          
          {indexedDBInfo && (
            <Box sx={{ mb: 3 }}>
              <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 2 }}>
                IndexedDB Storage Information:
              </Text>
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
            </Box>
          )}
          
          <Text sx={{ fontSize: 1, color: 'fg.muted', mb: 3 }}>
            Clear stored data to free up space or reset the application state.
          </Text>
          
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

        <Box
          sx={{
            mb: 3,
            p: 3,
            bg: 'accent.subtle',
            border: '1px solid',
            borderColor: 'accent.muted',
            borderRadius: 2,
          }}
        >
          <Heading as="h2" sx={{ fontSize: 2, mb: 2, color: 'accent.fg' }}>
            About GitHub Tokens
          </Heading>
          <Text as="p" sx={{ fontSize: 1, mb: 2, color: 'fg.default' }}>
            A GitHub token is optional but recommended for:
          </Text>
          <Text as="ul" sx={{ fontSize: 1, pl: 3, color: 'fg.default' }}>
            <li>Accessing private repositories</li>
            <li>Increased API rate limits (5,000/hour vs 60/hour)</li>
            <li>Reduced likelihood of hitting request limits</li>
          </Text>
        </Box>

        <FormControl sx={{ mb: 3 }}>
          <FormControl.Label>
            Personal Access Token (Optional)
          </FormControl.Label>
          <TextInput
            type="password"
            value={localToken}
            onChange={(e) => setLocalToken(e.target.value)}
            placeholder="GitHub personal access token"
            block
            aria-describedby="token-help"
            sx={{ bg: 'canvas.default', color: 'fg.default' }}
          />
          <FormControl.Caption id="token-help">
            Use a fine-grained token with minimal permissions - read-only access
            to repositories is sufficient
          </FormControl.Caption>
        </FormControl>

        <FormControl sx={{ mb: 4 }}>
          <FormControl.Label>Token Storage Location</FormControl.Label>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box
              as="label"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'fg.default',
              }}
            >
              <input
                type="radio"
                name="storage"
                value="session"
                checked={localTokenStorage === 'session'}
                onChange={(e) => setLocalTokenStorage(e.target.value)}
              />
              Browser Session (Recommended)
            </Box>
            <Text sx={{ ml: 4, mb: 2, fontSize: 0, color: 'fg.muted' }}>
              Token is cleared when you close your browser. Most secure option.
            </Text>

            <Box
              as="label"
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                color: 'fg.default',
              }}
            >
              <input
                type="radio"
                name="storage"
                value="local"
                checked={localTokenStorage === 'local'}
                onChange={(e) => setLocalTokenStorage(e.target.value)}
              />
              Local Storage
            </Box>
            <Text sx={{ ml: 4, fontSize: 0, color: 'fg.muted' }}>
              Token persists after browser closes. Less secure but more
              convenient.
            </Text>
          </Box>
        </FormControl>

        {/* Action buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 2,
            mb: 3,
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'border.default',
          }}
        >
          <Button variant="default" onClick={handleCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save Settings
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
});

export default SettingsDialog;
