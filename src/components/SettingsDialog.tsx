import { memo, useCallback, useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Heading,
  Text,
  FormControl,
  TextInput,
  Button,
} from '@primer/react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useFormContext } from '../App';
import { SettingsDialogProps } from '../types';

const SettingsDialog = memo(function SettingsDialog({
  isOpen,
  onDismiss,
}: SettingsDialogProps) {
  const { githubToken, setGithubToken } = useFormContext();
  const [tokenStorage, setTokenStorage] = useLocalStorage(
    'github-token-storage',
    'session'
  );

  // Local state for form values (before saving)
  const [localToken, setLocalToken] = useState('');
  const [localTokenStorage, setLocalTokenStorage] = useState('session');

  // Initialize local state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalToken(githubToken);
      setLocalTokenStorage(tokenStorage);
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

  if (!isOpen) return null;

  return (
    <Dialog
      onClose={handleCancel}
      title="Settings"
      sx={{
        width: ['90%', '80%', '600px'],
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >

      <Box sx={{ p: 3 }}>
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

        <Box
          sx={{
            mt: 3,
            p: 3,
            bg: 'canvas.subtle',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <Heading as="h3" sx={{ fontSize: 1, mb: 2, color: 'fg.muted' }}>
            Security Best Practices
          </Heading>
          <Text as="ul" sx={{ fontSize: 0, color: 'fg.muted', pl: 3 }}>
            <li>
              Use fine-grained tokens with minimal permissions when possible
            </li>
            <li>Never share your token or commit it to version control</li>
            <li>Set an expiration date on your token for better security</li>
            <li>Review and revoke tokens regularly in your GitHub settings</li>
          </Text>
        </Box>
      </Box>
    </Dialog>
  );
});

export default SettingsDialog;
