import React, { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
  CircularProgress,
  Snackbar,
  Chip,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Alert } from '@mui/material';
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
import { variableService, type TemplateVariable, type GlobalVariable, type VariableValue } from '../services/variableService';
import { useAuthStore } from '../store/authStore';

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
  const { token } = useAuthStore();
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
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'success' });
  
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [variableValues, setVariableValues] = useState<VariableValue[]>([]);

  // Extract variables from template content
  const extractVariables = (content: string, subject: string = '') => {
    const combinedText = `${content} ${subject}`;
    const variableRegex = /{{(\w+)}}/g;
    const variables = new Set<string>();
    let match;
    
    while ((match = variableRegex.exec(combinedText)) !== null) {
      variables.add(match[1]);
    }
    
    return Array.from(variables);
  };

  // Get default values for common variables
  const getDefaultValue = (variable: string) => {
    const defaults: Record<string, string> = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      fromName: 'Your Company',
      subject: '',
      unsubscribeUrl: '#unsubscribe',
      companyName: 'Your Company',
      phone: '+1 (555) 123-4567',
      address: '123 Main St, City, State 12345'
    };
    return defaults[variable] || `[${variable}]`;
  };

  useEffect(() => {
    console.log('EmailTemplates: token exists:', !!token);
    console.log('EmailTemplates: token value:', token ? 'present' : 'missing');
    fetchTemplates();
    fetchCategories();
    fetchGlobalVariables();
    fetchVariableValues();
  }, [token]);

  const fetchGlobalVariables = async () => {
    try {
      const variables = await variableService.global.getAll();
      setGlobalVariables(variables);
    } catch (err: any) {
      console.error('Failed to fetch global variables:', err);
    }
  };

  const fetchVariableValues = async () => {
    try {
      console.log('Fetching variable values with token:', !!token);
      const values = await variableService.values.getAll();
      console.log('Variable values response:', values);
      setVariableValues(values);
    } catch (err: any) {
      console.error('Failed to fetch variable values:', err);
      console.error('Error details:', err.response?.data);
      console.error('Error status:', err.response?.status);
    }
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/email-templates');
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
      const response = await axios.get('/api/email-templates/meta/categories');
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

  const showSnackbar = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleCreateTemplate = async () => {
    try {
      const response = await axios.post('/api/email-templates', createData);
      
      const newTemplate = response.data;
      
      // Extract and create template variables
      try {
        await variableService.template.extractFromTemplate(newTemplate.id);
      } catch (extractErr: any) {
        console.error('Failed to extract template variables:', extractErr);
        // Don't fail the template creation if variable extraction fails
      }
      
      setCreateDialogOpen(false);
      setCreateData({ name: '', subject: '', content: '', category: '', isDefault: false });
      showSnackbar(`Template "${createData.name}" created successfully!`, 'success');
      fetchTemplates();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to create template';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleEditTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await axios.put(`/api/email-templates/${selectedTemplate.id}`, createData);
      
      // Extract and create template variables for updated content
      try {
        await variableService.template.extractFromTemplate(selectedTemplate.id);
      } catch (extractErr: any) {
        console.error('Failed to extract template variables:', extractErr);
        // Don't fail the template update if variable extraction fails
      }
      
      setEditDialogOpen(false);
      setCreateData({ name: '', subject: '', content: '', category: '', isDefault: false });
      showSnackbar(`Template "${createData.name}" updated successfully!`, 'success');
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to update template';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      await axios.delete(`/api/email-templates/${selectedTemplate.id}`);
      setDeleteDialogOpen(false);
      showSnackbar(`Template "${selectedTemplate.name}" deleted successfully!`, 'success');
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to delete template';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDuplicateTemplate = async () => {
    if (!selectedTemplate) return;
    
    try {
      const duplicateData = {
        name: `${selectedTemplate.name} (Copy)`,
        subject: selectedTemplate.subject,
        content: selectedTemplate.content,
        category: selectedTemplate.category,
        isDefault: false
      };
      await axios.post('/api/email-templates', duplicateData);
      showSnackbar(`Template "${selectedTemplate.name}" duplicated successfully!`, 'success');
      fetchTemplates();
      handleMenuClose();
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to duplicate template';
      setError(errorMessage);
      showSnackbar(errorMessage, 'error');
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
      showSnackbar(`Opening editor for "${selectedTemplate.name}"`, 'info');
      setEditDialogOpen(true);
    }
    handleMenuClose();
  };

  const openPreviewDialog = async () => {
    if (selectedTemplate) {
      try {
        console.log('Opening preview dialog for template:', selectedTemplate.id);
        // Fetch template-specific variables
        const templateVars = await variableService.template.getByTemplate(selectedTemplate.id);
        console.log('Template variables fetched:', templateVars);
        setTemplateVariables(templateVars);
        
        // Extract variables from template content as fallback
        const extractedVariables = extractVariables(selectedTemplate.content, selectedTemplate.subject);
        console.log('Extracted variables:', extractedVariables);
        console.log('Global variables:', globalVariables);
        console.log('Variable values:', variableValues);
        const initialVariables: Record<string, string> = {};
        
        // First, use template variables if they exist
        templateVars.forEach(templateVar => {
          const userValue = variableValues.find(v => v.templateVariableId === templateVar.id);
          initialVariables[templateVar.name] = userValue?.value || templateVar.defaultValue || getDefaultValue(templateVar.name);
        });
        
        // Then, add any extracted variables that don't have template variables
        extractedVariables.forEach(variable => {
          if (!templateVars.some(tv => tv.name === variable)) {
            // Check if there's a global variable for this
            const globalVar = globalVariables.find(gv => gv.name === variable);
            if (globalVar) {
              const userValue = variableValues.find(v => v.globalVariableId === globalVar.id);
              initialVariables[variable] = userValue?.value || globalVar.defaultValue || getDefaultValue(variable);
            } else {
              initialVariables[variable] = getDefaultValue(variable);
            }
          }
        });
        
        // Override subject with actual template subject if it exists as a variable
        if (extractedVariables.includes('subject')) {
          initialVariables.subject = selectedTemplate.subject || '';
        }
        
        console.log('Final preview variables:', initialVariables);
        setPreviewVariables(initialVariables);
        showSnackbar(`Previewing template "${selectedTemplate.name}"`, 'info');
      } catch (err: any) {
        console.error('Failed to fetch template variables:', err);
        // Fallback to basic extraction
        const variables = extractVariables(selectedTemplate.content, selectedTemplate.subject);
        const initialVariables: Record<string, string> = {};
        
        variables.forEach(variable => {
          initialVariables[variable] = getDefaultValue(variable);
        });
        
        setPreviewVariables(initialVariables);
        showSnackbar(`Previewing template "${selectedTemplate.name}" (basic mode)`, 'info');
      }
    }
    setPreviewDialogOpen(true);
    handleMenuClose();
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const getPreviewContent = () => {
    if (!selectedTemplate || !selectedTemplate.content) return '';
    
    let content = selectedTemplate.content;
    
    // Replace all variables found in the template
    Object.entries(previewVariables).forEach(([variable, value]) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, value || `[${variable}]`);
    });
    
    return content;
  };

  const handleVariableChange = async (variableName: string, value: string) => {
    // Update local state immediately for responsive UI
    setPreviewVariables(prev => ({ ...prev, [variableName]: value }));
    
    try {
      // Find if this is a template variable or global variable
      const templateVar = templateVariables.find(tv => tv.name === variableName);
      const globalVar = globalVariables.find(gv => gv.name === variableName);
      
      if (templateVar) {
        // Check if user already has a value for this template variable
        const existingValue = variableValues.find(v => v.templateVariableId === templateVar.id);
        
        if (existingValue) {
          // Update existing value
          const updatedValue = await variableService.values.update(existingValue.id, { value });
          setVariableValues(prev => prev.map(v => v.id === existingValue.id ? updatedValue : v));
        } else {
          // Create new value
          const newValue = await variableService.values.create({ templateVariableId: templateVar.id, value });
          setVariableValues(prev => [...prev, newValue]);
        }
      } else if (globalVar) {
        // Check if user already has a value for this global variable
        const existingValue = variableValues.find(v => v.globalVariableId === globalVar.id);
        
        if (existingValue) {
          // Update existing value
          const updatedValue = await variableService.values.update(existingValue.id, { value });
          setVariableValues(prev => prev.map(v => v.id === existingValue.id ? updatedValue : v));
        } else {
          // Create new value
          const newValue = await variableService.values.create({ globalVariableId: globalVar.id, value });
          setVariableValues(prev => [...prev, newValue]);
        }
      }
      // If it's neither template nor global variable, just keep it in local state
    } catch (err: any) {
      console.error('Failed to save variable value:', err);
      // Keep the local state change even if save fails
    }
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Email Content (HTML)
                  </Typography>
                  <ReactQuill
                    value={createData.content}
                    onChange={(content) => setCreateData({ ...createData, content })}
                    style={{ height: '300px', marginBottom: '50px' }}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean']
                      ]
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Use {'{'}firstName{'}'}, {'{'}lastName{'}'}, {'{'}email{'}'}, {'{'}fromName{'}'}, {'{'}subject{'}'}, {'{'}unsubscribeUrl{'}'} for personalization
                  </Typography>
                </Box>
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
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Email Content (HTML)
                  </Typography>
                  <ReactQuill
                    value={createData.content}
                    onChange={(content) => setCreateData({ ...createData, content })}
                    style={{ height: '300px', marginBottom: '50px' }}
                    modules={{
                      toolbar: [
                        [{ 'header': [1, 2, 3, false] }],
                        ['bold', 'italic', 'underline', 'strike'],
                        [{ 'color': [] }, { 'background': [] }],
                        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                        [{ 'align': [] }],
                        ['link', 'image'],
                        ['clean']
                      ]
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Use {'{'}firstName{'}'}, {'{'}lastName{'}'}, {'{'}email{'}'}, {'{'}fromName{'}'}, {'{'}subject{'}'}, {'{'}unsubscribeUrl{'}'} for personalization
                  </Typography>
                </Box>
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
      <Dialog open={previewDialogOpen} onClose={() => setPreviewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Template Preview</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              {/* Variables Input Section */}
              <Grid item xs={12} md={4}>
                <Typography variant="h6" gutterBottom>
                  Preview Variables
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {selectedTemplate && extractVariables(selectedTemplate.content, selectedTemplate.subject).length > 0 ? (
                    extractVariables(selectedTemplate.content, selectedTemplate.subject).map((variable) => {
                      // Format variable name for display
                      const formatLabel = (varName: string) => {
                        return varName
                          .replace(/([A-Z])/g, ' $1')
                          .replace(/^./, str => str.toUpperCase())
                          .trim();
                      };
                      
                      return (
                        <TextField
                          key={variable}
                          label={formatLabel(variable)}
                          value={previewVariables[variable] || ''}
                          onChange={(e) => handleVariableChange(variable, e.target.value)}
                          size="small"
                          fullWidth
                          placeholder={`Enter ${formatLabel(variable).toLowerCase()}`}
                        />
                      );
                    })
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                      No variables found in this template
                    </Typography>
                  )}
                </Box>
              </Grid>
              
              {/* Preview Section */}
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Email Preview
                </Typography>
                <Box sx={{ mb: 2, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                   <Typography variant="subtitle2" color="text.secondary">
                     Subject: {(() => {
                       if (!selectedTemplate) return 'No subject';
                       let subject = selectedTemplate.subject || '';
                       Object.entries(previewVariables).forEach(([variable, value]) => {
                         const regex = new RegExp(`{{${variable}}}`, 'g');
                         subject = subject.replace(regex, value || `[${variable}]`);
                       });
                       return subject || 'No subject';
                     })()}
                   </Typography>
                   <Typography variant="caption" color="text.secondary">
                     From: {previewVariables.fromName || '[fromName]'}
                   </Typography>
                 </Box>
                <Box
                  sx={{
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    p: 2,
                    backgroundColor: '#ffffff',
                    maxHeight: '500px',
                    overflow: 'auto',
                    minHeight: '300px'
                  }}
                >
                  <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                </Box>
              </Grid>
            </Grid>
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

      {/* Snackbar for user feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default EmailTemplates;