/**
 * Audience Selection - Step 2 of Campaign Creation Wizard
 * Handles selection of email lists and shows recipient counts
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  GridLegacy as Grid,
  Chip,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import { Add, People, Email } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

interface EmailList {
  id: string;
  name: string;
  description?: string;
  recipientCount: number;
  createdAt: string;
}

interface CampaignData {
  name: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  selectedLists: string[];
  content: string;
  scheduleType: 'now' | 'later';
  scheduledAt?: Date;
}

interface AudienceSelectionProps {
  data: CampaignData;
  onChange: (data: Partial<CampaignData>) => void;
}

export default function AudienceSelection({ data, onChange }: AudienceSelectionProps) {
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDescription, setNewListDescription] = useState('');
  const [creating, setCreating] = useState(false);
  
  const { token } = useAuthStore();

  useEffect(() => {
    fetchEmailLists();
  }, []);

  const fetchEmailLists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/email-lists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch email lists');
      }
      
      const lists = await response.json();
      setEmailLists(lists);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load email lists');
    } finally {
      setLoading(false);
    }
  };

  const handleListToggle = (listId: string) => {
    const currentSelected = data.selectedLists;
    const newSelected = currentSelected.includes(listId)
      ? currentSelected.filter(id => id !== listId)
      : [...currentSelected, listId];
    
    onChange({ selectedLists: newSelected });
  };

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    
    try {
      setCreating(true);
      
      const response = await fetch('/api/email-lists', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newListName.trim(),
          description: newListDescription.trim() || undefined
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create email list');
      }
      
      const newList = await response.json();
      setEmailLists(prev => [...prev, newList]);
      
      // Auto-select the newly created list
      onChange({ selectedLists: [...data.selectedLists, newList.id] });
      
      // Reset form and close dialog
      setNewListName('');
      setNewListDescription('');
      setCreateDialogOpen(false);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create email list');
    } finally {
      setCreating(false);
    }
  };

  const getTotalRecipients = () => {
    return emailLists
      .filter(list => data.selectedLists.includes(list.id))
      .reduce((total, list) => total + list.recipientCount, 0);
  };

  const getSelectedLists = () => {
    return emailLists.filter(list => data.selectedLists.includes(list.id));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Select Your Audience
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose which email lists to send your campaign to. You can select multiple lists.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Summary */}
      {data.selectedLists.length > 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>{getTotalRecipients()} recipients</strong> selected across {data.selectedLists.length} list{data.selectedLists.length !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {getSelectedLists().map(list => (
              <Chip
                key={list.id}
                label={`${list.name} (${list.recipientCount})`}
                size="small"
                color="primary"
                variant="outlined"
              />
            ))}
          </Box>
        </Alert>
      )}

      {/* Create New List Button */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New List
        </Button>
      </Box>

      {/* Email Lists */}
      {emailLists.length === 0 ? (
        <Alert severity="warning">
          <Typography variant="body2">
            No email lists found. Create your first email list to get started.
          </Typography>
        </Alert>
      ) : (
        <Grid container spacing={2}>
          {emailLists.map((list) => (
            <Grid item xs={12} md={6} key={list.id}>
              <Card 
                sx={{ 
                  cursor: 'pointer',
                  border: data.selectedLists.includes(list.id) ? 2 : 1,
                  borderColor: data.selectedLists.includes(list.id) ? 'primary.main' : 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    boxShadow: 2
                  }
                }}
                onClick={() => handleListToggle(list.id)}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={data.selectedLists.includes(list.id)}
                            onChange={() => handleListToggle(list.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        }
                        label={
                          <Typography variant="h6" component="div">
                            {list.name}
                          </Typography>
                        }
                        sx={{ m: 0 }}
                      />
                      
                      {list.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          {list.description}
                        </Typography>
                      )}
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2, gap: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <People fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {list.recipientCount} recipients
                          </Typography>
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary">
                          Created {new Date(list.createdAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create List Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Email List</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            variant="outlined"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newListDescription}
            onChange={(e) => setNewListDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateList} 
            variant="contained"
            disabled={!newListName.trim() || creating}
          >
            {creating ? <CircularProgress size={20} /> : 'Create List'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}