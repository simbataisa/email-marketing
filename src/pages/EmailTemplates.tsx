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
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Visibility as VisibilityIcon,
  FileCopy as CopyIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import axios from 'axios';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  category: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTemplateData {
  name: string;
  subject: string;
  content: string;
  category: string;
  isDefault: boolean;
}

const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [createData, setCreateData] = useState<CreateTemplateData>({
    name: '',
    subject: '',
    content: '',
    category: '',
    isDefault: false
  });

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/email-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(response.data);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch email templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/email-templates/categories', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, template: EmailTemplate) => {
    setAnchorEl(event.currentTarget);
    setSelectedTemplate(template);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedTemplate(null);
  };

  const handleCreateTemplate = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/email-templates', createData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCreateDialogOpen(false);
      setCreateData({ name: '', subject: '', content: '', category: '', isDefault: false });
      fetchTemplates();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create template');
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/email-templates/${selectedTemplate.id}`, createData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditDialogOpen(false);
      setCreateData({ name: '', subject: '', content: '', category: '', isDefault: false });
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update template');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/email-templates/${selectedTemplate.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDeleteDialogOpen(false);
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete template');
    }
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const token = localStorage.getItem('token');
      const duplicateData = {
        name: `${selectedTemplate.name} (Copy)`,
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
        category: selectedTemplate.category,
        isDefault: false
      };
      await axios.post('/api/email-templates', duplicateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to duplicate template');
    }
  };

  const openEditDialog = () => {
    if (selectedTemplate) {
      setCreateData({
        name: selectedTemplate.name,
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
        category: selectedTemplate.category,
        isDefault: selectedTemplate.isDefault
      });
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const openPreviewDialog = () => {
    setPreviewDialogOpen(true);
    handleMenuClose();
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const getPreviewContent = () => {
    if (!selectedTemplate) return '';
    return selectedTemplate.content
      .replace(/{{firstName}}/g, 'John')
      .replace(/{{lastName}}/g, 'Doe')
      .replace(/{{email}}/g, 'john.doe@example.com')
      .replace(/{{fromName}}/g, 'Your Company')
      .replace(/{{subject}}/g, selectedTemplate.subject)
      .replace(/{{unsubscribeUrl}}/g, '#unsubscribe');
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1">
            Email Templates
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Create Template
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Create and manage reusable email templates for your campaigns.
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Templates Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <EmailIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="h6">
                  Total Templates
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {templates.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <CategoryIcon color="primary" sx={{ mr: 1 }} />
                <Typography color="text.secondary" variant="h6">
                  Categories
                </Typography>
              </Box>
              <Typography variant="h4" component="div">
                {categories.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Templates Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Templates
          </Typography>
          {templates.length === 0 ? (
            <Alert severity="info">
              <Typography variant="body2">
                No email templates found. Create your first template to get started.
              </Typography>
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Subject</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Default</TableCell>
                    <TableCell>Created</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <Typography variant="subtitle2">{template.name}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {template.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={template.category} 
                          size="small" 
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {template.isDefault && (
                          <Chip 
                            label="Default" 
                            size="small" 
                            color="primary"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(template.createdAt).toLocaleDateString()}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleMenuClick(e, template)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={openPreviewDialog}>
          <VisibilityIcon sx={{ mr: 1 }} />
          Preview
        </MenuItem>
        <MenuItem onClick={openEditDialog}>
          <EditIcon sx={{ mr: 1 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleDuplicateTemplate}>
          <CopyIcon sx={{ mr: 1 }} />
          Duplicate
        </MenuItem>
        <MenuItem onClick={openDeleteDialog} sx={{ color: 'error.main' }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Template Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Create Email Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={createData.category}
                    onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject Line"
                  value={createData.subject}
                  onChange={(e) => setCreateData({ ...createData, subject: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Content (HTML)"
                  value={createData.content}
                  onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                  margin="normal"
                  multiline
                  rows={10}
                  helperText="Use {{firstName}}, {{lastName}}, {{email}}, {{fromName}}, {{subject}}, {{unsubscribeUrl}} for personalization"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={createData.isDefault}
                      onChange={(e) => setCreateData({ ...createData, isDefault: e.target.checked })}
                    />
                  }
                  label="Set as default template"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateTemplate} variant="contained">
            Create Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Email Template</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Template Name"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth margin="normal">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={createData.category}
                    onChange={(e) => setCreateData({ ...createData, category: e.target.value })}
                    label="Category"
                  >
                    {categories.map((category) => (
                      <MenuItem key={category} value={category}>
                        {category}
                      </MenuItem>
                    ))}
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Subject Line"
                  value={createData.subject}
                  onChange={(e) => setCreateData({ ...createData, subject: e.target.value })}
                  margin="normal"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Email Content (HTML)"
                  value={createData.content}
                  onChange={(e) => setCreateData({ ...createData, content: e.target.value })}
                  margin="normal"
                  multiline
                  rows={10}
                  helperText="Use {{firstName}}, {{lastName}}, {{email}}, {{fromName}}, {{subject}}, {{unsubscribeUrl}} for personalization"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={createData.isDefault}
                      onChange={(e) => setCreateData({ ...createData, isDefault: e.target.checked })}
                    />
                  }
                  label="Set as default template"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditTemplate} variant="contained">
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Template Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Typography variant="h6" gutterBottom>
              Subject: {selectedTemplate?.subject}
            </Typography>
            <Box
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                p: 2,
                backgroundColor: '#f9f9f9',
                maxHeight: '400px',
                overflow: 'auto'
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Template</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the template "{selectedTemplate?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteTemplate} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default EmailTemplates;