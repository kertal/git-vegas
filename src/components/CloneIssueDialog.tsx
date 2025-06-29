import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Box,
  Text,
  TextInput,
  Textarea,
  Button,
  FormControl,
  Spinner,
  Flash,
  Label,
  IconButton,
} from '@primer/react';
import { XIcon } from '@primer/octicons-react';
import { GitHubItem } from '../types';
import { GitHubAPI } from '../utils/githubAPI';
import { useFormContext } from '../App';

interface CloneIssueDialogProps {
  isOpen: boolean;
  onClose: () => void;
  originalIssue: GitHubItem | null;
  onSuccess?: (newIssue: GitHubItem) => void;
}

export const CloneIssueDialog: React.FC<CloneIssueDialogProps> = ({
  isOpen,
  onClose,
  originalIssue,
  onSuccess,
}) => {
  const { githubToken } = useFormContext();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [labels, setLabels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Initialize form with original issue data
  useEffect(() => {
    if (originalIssue && isOpen) {
      setTitle(`[Clone] ${originalIssue.title}`);
      setBody(originalIssue.body || '');
      setLabels(originalIssue.labels?.map(label => label.name) || []);
      setError(null);
      setSuccess(null);
    }
  }, [originalIssue, isOpen]);

  const handleClose = () => {
    setTitle('');
    setBody('');
    setLabels([]);
    setError(null);
    setSuccess(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!originalIssue || !githubToken) {
      setError('Missing required information to clone issue');
      return;
    }

    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const newIssue = await GitHubAPI.createIssue(
        originalIssue.repository_url!,
        {
          title: title.trim(),
          body: body.trim(),
          labels,
        },
        githubToken
      );

      setSuccess('Issue cloned successfully!');
      onSuccess?.(newIssue);
      
      // Close dialog after a short delay to show success message
      setTimeout(() => {
        handleClose();
      }, 1500);

    } catch (error) {
      console.error('Failed to clone issue:', error);
      setError(error instanceof Error ? error.message : 'Failed to clone issue');
    } finally {
      setIsLoading(false);
    }
  };

  const removeLabel = (labelToRemove: string) => {
    setLabels(labels.filter(label => label !== labelToRemove));
  };

  if (!isOpen || !originalIssue) {
    return null;
  }

  // Check if it's actually an issue (not a PR)
  if (originalIssue.pull_request) {
    return null;
  }

  const repositoryName = originalIssue.repository?.full_name || 
    originalIssue.repository_url?.replace('https://api.github.com/repos/', '') || 
    'Unknown Repository';

  return (
    <Dialog
      onClose={handleClose}
      sx={{ width: ['90%', '80%', '600px'], maxWidth: '600px' }}
    >
      <Dialog.Header>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text sx={{ fontSize: 3, fontWeight: 'bold' }}>
            Clone Issue
          </Text>
          <IconButton
            icon={XIcon}
            aria-label="Close dialog"
            onClick={handleClose}
            variant="invisible"
          />
        </Box>
      </Dialog.Header>

      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Text sx={{ fontSize: 1, color: 'fg.muted' }}>
            Cloning issue from: <strong>{repositoryName}</strong>
          </Text>
          <Text sx={{ fontSize: 0, color: 'fg.muted', mt: 1 }}>
            Original: <a href={originalIssue.html_url} target="_blank" rel="noopener noreferrer">
              #{originalIssue.number} {originalIssue.title}
            </a>
          </Text>
        </Box>

        {error && (
          <Flash variant="danger" sx={{ mb: 3 }}>
            {error}
          </Flash>
        )}

        {success && (
          <Flash variant="success" sx={{ mb: 3 }}>
            {success}
          </Flash>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ mb: 3 }}>
            <FormControl>
              <FormControl.Label htmlFor="issue-title">
                Title *
              </FormControl.Label>
              <TextInput
                id="issue-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter issue title"
                disabled={isLoading}
                required
                sx={{ width: '100%' }}
              />
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControl>
              <FormControl.Label htmlFor="issue-body">
                Description
              </FormControl.Label>
              <Textarea
                id="issue-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter issue description"
                disabled={isLoading}
                rows={8}
                sx={{ width: '100%', fontFamily: 'monospace', fontSize: 1 }}
              />
            </FormControl>
          </Box>

          <Box sx={{ mb: 3 }}>
            <FormControl>
              <FormControl.Label>
                Labels
              </FormControl.Label>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
                {labels.map((label) => (
                  <Label key={label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {label}
                    <IconButton
                      icon={XIcon}
                      size="small"
                      variant="invisible"
                      aria-label={`Remove ${label} label`}
                      onClick={() => removeLabel(label)}
                      disabled={isLoading}
                      sx={{ color: 'inherit' }}
                    />
                  </Label>
                ))}
                {labels.length === 0 && (
                  <Text sx={{ fontSize: 1, color: 'fg.muted', fontStyle: 'italic' }}>
                    No labels from original issue
                  </Text>
                )}
              </Box>
            </FormControl>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
            <Button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isLoading || !title.trim() || !githubToken}
            >
              {isLoading ? (
                <>
                  <Spinner size="small" sx={{ mr: 1 }} />
                  Creating...
                </>
              ) : (
                'Create Issue'
              )}
            </Button>
          </Box>
        </form>

        {!githubToken && (
          <Box sx={{ mt: 3, p: 2, bg: 'attention.subtle', borderRadius: 1 }}>
            <Text sx={{ fontSize: 1, color: 'attention.fg' }}>
              GitHub token is required to create issues. Please add your token in settings.
            </Text>
          </Box>
        )}
      </Box>
    </Dialog>
  );
}; 