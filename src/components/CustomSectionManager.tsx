import { useState, useEffect } from 'react';
import {
  Box,
  Text,
  Button,
  TextInput,
  FormControl,
  Dialog,
  IconButton,
  ActionList,
  ActionMenu,
  Token,
  Spinner,
} from '@primer/react';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XIcon,
  CheckIcon,
  AlertIcon,
} from '@primer/octicons-react';
import { CustomSection } from '../types';
import CustomSectionsManager from '../utils/customSections';
import CustomSectionAPI from '../utils/customSectionAPI';
import { useFormContext } from '../App';

interface CustomSectionManagerProps {
  onSectionsChange?: () => void;
}

interface SectionFormData {
  title: string;
  repository: string;
  labels: string[];
  type: 'issues' | 'prs' | 'both';
  maxItems: number;
  enabled: boolean;
}

const CustomSectionManager = ({ onSectionsChange }: CustomSectionManagerProps) => {
  const { githubToken } = useFormContext();
  const [sections, setSections] = useState<CustomSection[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<CustomSection | null>(null);
  const [formData, setFormData] = useState<SectionFormData>({
    title: '',
    repository: '',
    labels: [],
    type: 'both',
    maxItems: 10,
    enabled: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [availableLabels, setAvailableLabels] = useState<string[]>([]);
  const [newLabelInput, setNewLabelInput] = useState('');
  const [repositoryStatus, setRepositoryStatus] = useState<{
    exists: boolean;
    accessible: boolean;
    error?: string;
  } | null>(null);

  // Load sections on mount
  useEffect(() => {
    loadSections();
  }, []);

  const loadSections = () => {
    const config = CustomSectionsManager.loadConfig();
    setSections(config.sections);
  };

  const handleAddSection = () => {
    setEditingSection(null);
    setFormData({
      title: '',
      repository: '',
      labels: [],
      type: 'both',
      maxItems: 10,
      enabled: true,
    });
    setErrors([]);
    setAvailableLabels([]);
    setRepositoryStatus(null);
    setIsDialogOpen(true);
  };

  const handleEditSection = (section: CustomSection) => {
    setEditingSection(section);
    setFormData({
      title: section.title,
      repository: section.repository,
      labels: [...section.labels],
      type: section.type,
      maxItems: section.maxItems,
      enabled: section.enabled,
    });
    setErrors([]);
    setAvailableLabels([]);
    setRepositoryStatus(null);
    setIsDialogOpen(true);
  };

  const handleDeleteSection = (sectionId: string) => {
    if (confirm('Are you sure you want to delete this section?')) {
      CustomSectionsManager.deleteSection(sectionId);
      loadSections();
      onSectionsChange?.();
    }
  };

  const handleToggleSection = (sectionId: string, enabled: boolean) => {
    CustomSectionsManager.updateSection(sectionId, { enabled });
    loadSections();
    onSectionsChange?.();
  };

  const handleSaveSection = async () => {
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate form data
      const validationErrors = CustomSectionsManager.validateSection(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        setIsLoading(false);
        return;
      }

      // Test repository access
      const repoTest = await CustomSectionAPI.testRepository(formData.repository, githubToken);
      if (!repoTest.exists || !repoTest.accessible) {
        setErrors([repoTest.error || 'Repository is not accessible']);
        setIsLoading(false);
        return;
      }

      // Save section
      if (editingSection) {
        CustomSectionsManager.updateSection(editingSection.id, formData);
      } else {
        CustomSectionsManager.addSection(formData);
      }

      setIsDialogOpen(false);
      loadSections();
      onSectionsChange?.();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : 'Failed to save section']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRepositoryChange = async (repository: string) => {
    setFormData({ ...formData, repository });
    setRepositoryStatus(null);
    setAvailableLabels([]);

    if (repository && /^[\w.-]+\/[\w.-]+$/.test(repository)) {
      try {
        // Test repository and fetch labels
        const [repoTest, labels] = await Promise.all([
          CustomSectionAPI.testRepository(repository, githubToken),
          CustomSectionAPI.getRepositoryLabels(repository, githubToken),
        ]);

        setRepositoryStatus(repoTest);
        if (repoTest.exists && repoTest.accessible) {
          setAvailableLabels(labels);
        }
             } catch {
         setRepositoryStatus({
           exists: false,
           accessible: false,
           error: 'Failed to check repository',
         });
       }
    }
  };

  const handleAddLabel = (label: string) => {
    if (label && !formData.labels.includes(label)) {
      setFormData({
        ...formData,
        labels: [...formData.labels, label],
      });
    }
    setNewLabelInput('');
  };

  const handleRemoveLabel = (labelToRemove: string) => {
    setFormData({
      ...formData,
      labels: formData.labels.filter(label => label !== labelToRemove),
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Text as="h3" sx={{ fontSize: 1, fontWeight: 'bold' }}>
          Custom Sections
        </Text>
        <Button size="small" onClick={handleAddSection} sx={{ p: 1 }}>
          <PlusIcon size={14} /> Add Section
        </Button>
      </Box>

      {sections.length === 0 ? (
        <Box
          sx={{
            p: 4,
            textAlign: 'center',
            border: '1px dashed',
            borderColor: 'border.default',
            borderRadius: 2,
          }}
        >
          <Text sx={{ color: 'fg.muted' }}>
            No custom sections configured. Add a section to track specific issues and PRs by labels.
          </Text>
        </Box>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {sections.map((section) => (
            <Box
              key={section.id}
              sx={{
                p: 2,
                border: '1px solid',
                borderColor: 'border.default',
                borderRadius: 2,
                opacity: section.enabled ? 1 : 0.6,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Text sx={{ fontSize: 0, fontWeight: 'semibold' }}>{section.title}</Text>
                  <Text sx={{ fontSize: 0, color: 'fg.muted' }}>{section.repository}</Text>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    size="small"
                    variant={section.enabled ? 'default' : 'primary'}
                    onClick={() => handleToggleSection(section.id, !section.enabled)}
                    sx={{ p: 1 }}
                  >
                    {section.enabled ? 'Disable' : 'Enable'}
                  </Button>
                  <IconButton
                    size="small"
                    icon={PencilIcon}
                    aria-label="Edit section"
                    onClick={() => handleEditSection(section)}
                  />
                  <IconButton
                    size="small"
                    icon={TrashIcon}
                    aria-label="Delete section"
                    variant="danger"
                    onClick={() => handleDeleteSection(section.id)}
                  />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                {section.labels.map((label) => (
                  <Token key={label} text={label} size="small" />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2, fontSize: 0, color: 'fg.muted' }}>
                <Text>Type: {section.type}</Text>
                <Text>Max items: {section.maxItems}</Text>
                <Text>Updated: {new Date(section.updatedAt).toLocaleDateString()}</Text>
              </Box>
            </Box>
          ))}
        </Box>
      )}

      {isDialogOpen && (
        <Dialog
          onClose={() => setIsDialogOpen(false)}
          title={editingSection ? 'Edit Section' : 'Add Section'}
          sx={{
            width: ['90%', '80%', '600px'],
            maxWidth: '800px',
            margin: '0 auto',
          }}
        >
        <Box sx={{ p: 3 }}>
          {errors.length > 0 && (
            <Box sx={{ mb: 3, p: 2, bg: 'danger.subtle', borderRadius: 1 }}>
              {errors.map((error, index) => (
                <Text key={index} sx={{ fontSize: 0, color: 'danger.fg', display: 'block' }}>
                  <AlertIcon size={12} /> {error}
                </Text>
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <FormControl>
              <FormControl.Label>Title</FormControl.Label>
              <TextInput
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., High Priority Bugs"
              />
            </FormControl>

            <FormControl>
              <FormControl.Label>Repository</FormControl.Label>
              <TextInput
                value={formData.repository}
                onChange={(e) => handleRepositoryChange(e.target.value)}
                placeholder="owner/repo"
              />
              {repositoryStatus && (
                <Box sx={{ mt: 1, fontSize: 0 }}>
                  {repositoryStatus.exists && repositoryStatus.accessible ? (
                    <Text sx={{ color: 'success.fg' }}>
                      <CheckIcon size={12} /> Repository accessible
                    </Text>
                  ) : (
                    <Text sx={{ color: 'danger.fg' }}>
                      <XIcon size={12} /> {repositoryStatus.error}
                    </Text>
                  )}
                </Box>
              )}
            </FormControl>

            <FormControl>
              <FormControl.Label>Labels</FormControl.Label>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {formData.labels.map((label) => (
                  <Token
                    key={label}
                    text={label}
                    size="small"
                    onRemove={() => handleRemoveLabel(label)}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextInput
                  value={newLabelInput}
                  onChange={(e) => setNewLabelInput(e.target.value)}
                  placeholder="Add label"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel(newLabelInput);
                    }
                  }}
                />
                <Button
                  size="small"
                  onClick={() => handleAddLabel(newLabelInput)}
                  disabled={!newLabelInput}
                >
                  Add
                </Button>
                {availableLabels.length > 0 && (
                  <ActionMenu>
                    <ActionMenu.Button size="small">Repository Labels</ActionMenu.Button>
                    <ActionMenu.Overlay>
                      <ActionList>
                        {availableLabels
                          .filter(label => !formData.labels.includes(label))
                          .map((label) => (
                            <ActionList.Item
                              key={label}
                              onSelect={() => handleAddLabel(label)}
                            >
                              {label}
                            </ActionList.Item>
                          ))}
                      </ActionList>
                    </ActionMenu.Overlay>
                  </ActionMenu>
                )}
              </Box>
            </FormControl>

            <FormControl>
              <FormControl.Label>Type</FormControl.Label>
              <Box sx={{ display: 'flex', gap: 2 }}>
                {(['issues', 'prs', 'both'] as const).map((type) => (
                  <Button
                    key={type}
                    size="small"
                    variant={formData.type === type ? 'primary' : 'default'}
                    onClick={() => setFormData({ ...formData, type })}
                  >
                    {type === 'issues' ? 'Issues' : type === 'prs' ? 'Pull Requests' : 'Both'}
                  </Button>
                ))}
              </Box>
            </FormControl>

            <FormControl>
              <FormControl.Label>Max Items</FormControl.Label>
              <TextInput
                type="number"
                value={formData.maxItems.toString()}
                onChange={(e) => setFormData({ ...formData, maxItems: parseInt(e.target.value) || 10 })}
                min="1"
                max="50"
              />
            </FormControl>
          </Box>
        </Box>
        <Box sx={{ p: 3, borderTop: '1px solid', borderColor: 'border.default', display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button onClick={() => setIsDialogOpen(false)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={handleSaveSection}
            disabled={isLoading}
          >
            {isLoading && <Spinner size="small" />} {editingSection ? 'Update' : 'Create'}
          </Button>
        </Box>
        </Dialog>
      )}
    </Box>
  );
};

export default CustomSectionManager; 