import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Tooltip
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  People as PeopleIcon,
  Email as EmailIcon
} from '@mui/icons-material';
import axios from 'axios';

interface EmailList {
  id: string;
  name: string;
  description?: string;
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
}

interface CreateListData {
  name: string;
  description: string;
}

const EmailLists: React.FC = () => {
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedList, setSelectedList] = useState<EmailList | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateListData>({ name: '', description: '' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    fetchEmailLists();
  }, []);

  const fetchEmailLists = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/email-lists');
      setEmailLists(response.data);
    } catch (err) {
      setError('Failed to fetch email lists');
      console.error('Error fetching email lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, list: EmailList) => {
    setAnchorEl(event.currentTarget);
    setSelectedList(list);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedList(null);
  };

  const handleCreateList = async () => {
    try {
      await axios.post('/api/email-lists', createData);
      setCreateDialogOpen(false);
      setCreateData({ name: '', description: '' });
      fetchEmailLists();
    } catch (err) {
      setError('Failed to create email list');
      console.error('Error creating email list:', err);
    }
  };

  const handleEditList = async () => {
    if (!selectedList) return;
    
    try {
      await axios.put(`/api/email-lists/${selectedList.id}`, createData);
      setEditDialogOpen(false);
      setCreateData({ name: '', description: '' });
      handleMenuClose();
      fetchEmailLists();
    } catch (err) {
      setError('Failed to update email list');
      console.error('Error updating email list:', err);
    }
  };

  const handleDeleteList = async () => {
    if (!selectedList) return;
    
    try {
      await axios.delete(`/api/email-lists/${selectedList.id}`);
      setDeleteDialogOpen(false);
      handleMenuClose();
      fetchEmailLists();
    } catch (err) {
      setError('Failed to delete email list');
      console.error('Error deleting email list:', err);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || !selectedList) return;
    
    try {
      setImportLoading(true);
      const formData = new FormData();
      formData.append('file', importFile);
      
      await axios.post(`/api/email-lists/${selectedList.id}/import`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setImportDialogOpen(false);
      setImportFile(null);
      handleMenuClose();
      fetchEmailLists();
    } catch (err) {
      setError('Failed to import CSV file');
      console.error('Error importing CSV:', err);
    } finally {
      setImportLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedList) return;
    
    try {
      const response = await axios.get(`/api/email-lists/${selectedList.id}/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${selectedList.name}-recipients.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      handleMenuClose();
    } catch (err) {
      setError('Failed to export CSV file');
      console.error('Error exporting CSV:', err);
    }
  };

  const openEditDialog = () => {
    if (selectedList) {
      setCreateData({ name: selectedList.name, description: selectedList.description || '' });
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const openImportDialog = () => {
    setImportDialogOpen(true);
    handleMenuClose();
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Email Lists
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create List
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <EmailIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">{emailLists.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Lists
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <PeopleIcon color="primary" sx={{ mr: 2 }} />
                <Box>
                  <Typography variant="h6">
                    {emailLists.reduce((sum, list) => sum + list.recipientCount, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Recipients
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email Lists Table */}
      <Card>
        <CardContent>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="center">Recipients</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {emailLists.map((list) => (
                  <TableRow key={list.id}>
                    <TableCell>
                      <Typography variant="subtitle2">{list.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {list.description || 'No description'}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Chip 
                        label={list.recipientCount} 
                        size="small" 
                        color="primary" 
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {new Date(list.createdAt).toLocaleDateString()}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <IconButton
                        onClick={(e) => handleMenuClick(e, list)}
                        size="small"
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {emailLists.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No email lists found. Create your first list to get started.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={openEditDialog}>
          <EditIcon sx={{ mr: 1 }} fontSize="small" />
          Edit
        </MenuItem>
        <MenuItem onClick={openImportDialog}>
          <UploadIcon sx={{ mr: 1 }} fontSize="small" />
          Import CSV
        </MenuItem>
        <MenuItem onClick={handleExportCSV}>
          <DownloadIcon sx={{ mr: 1 }} fontSize="small" />
          Export CSV
        </MenuItem>
        <MenuItem onClick={openDeleteDialog} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen || editDialogOpen} onClose={() => {
        setCreateDialogOpen(false);
        setEditDialogOpen(false);
        setCreateData({ name: '', description: '' });
      }}>
        <DialogTitle>
          {editDialogOpen ? 'Edit Email List' : 'Create New Email List'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="List Name"
            fullWidth
            variant="outlined"
            value={createData.name}
            onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={createData.description}
            onChange={(e) => setCreateData({ ...createData, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCreateDialogOpen(false);
            setEditDialogOpen(false);
            setCreateData({ name: '', description: '' });
          }}>
            Cancel
          </Button>
          <Button 
            onClick={editDialogOpen ? handleEditList : handleCreateList}
            variant="contained"
            disabled={!createData.name.trim()}
          >
            {editDialogOpen ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import CSV Dialog */}
      <Dialog open={importDialogOpen} onClose={() => {
        setImportDialogOpen(false);
        setImportFile(null);
      }}>
        <DialogTitle>Import Recipients from CSV</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Upload a CSV file with email addresses. The file should have an 'email' column.
            Optional columns: firstName, lastName.
          </Typography>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            style={{ marginBottom: '16px' }}
          />
          {importFile && (
            <Typography variant="body2" color="primary">
              Selected: {importFile.name}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportDialogOpen(false);
            setImportFile(null);
          }}>
            Cancel
          </Button>
          <Button 
            onClick={handleImportCSV}
            variant="contained"
            disabled={!importFile || importLoading}
            startIcon={importLoading ? <CircularProgress size={20} /> : <UploadIcon />}
          >
            {importLoading ? 'Importing...' : 'Import'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Email List</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{selectedList?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleDeleteList} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailLists;