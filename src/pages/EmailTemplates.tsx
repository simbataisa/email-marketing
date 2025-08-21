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
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Checkbox,
  ListItemText,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as PreviewIcon,
  FileCopy as DuplicateIcon,
  MoreVert as MoreVertIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  GetApp as ExportIcon,
  Category as CategoryIcon,
  Visibility as VisibilityIcon,
  Email as EmailIcon,
  FileCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';
import { variableService, type TemplateVariable, type GlobalVariable, type VariableValue } from '../services/variableService';
import { useAuthStore } from '../store/authStore';
import EmailPreviewDialog from '../components/EmailPreviewDialog';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  fromEmail?: string;
  toEmails?: string[];
  ccEmails?: string[];
  bccEmails?: string[];
  maxRecipients?: number;
  attachments?: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
    base64?: string;
  }>;
  category: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CreateTemplateData {
  name: string;
  subject: string;
  content: string;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  bccEmails: string[];
  maxRecipients: number;
  attachments: Array<{
    name: string;
    type: string;
    size: number;
    url?: string;
    base64?: string;
  }>;
  category: string;
  isDefault: boolean;
}

const EmailTemplates: React.FC = () => {
  const { token } = useAuthStore();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emailErrors, setEmailErrors] = useState<{
    fromEmail?: string;
    toEmails?: string;
    ccEmails?: string;
    bccEmails?: string;
  }>({});
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
    fromEmail: '',
    toEmails: [],
    ccEmails: [],
    bccEmails: [],
    maxRecipients: 50,
    attachments: [],
    category: '',
    isDefault: false
  });
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info' | 'warning';
  }>({ open: false, message: '', severity: 'success' });

  // Email validation functions
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateEmailList = (emails: string[]): string | undefined => {
    if (emails.length === 0) return undefined;
    const invalidEmails = emails.filter(email => email && !validateEmail(email));
    if (invalidEmails.length > 0) {
      return `Invalid email(s): ${invalidEmails.join(', ')}`;
    }
    return undefined;
  };

  const handleEmailFieldChange = (field: 'toEmails' | 'ccEmails' | 'bccEmails', value: string) => {
    const emails = value.split(',').map(email => email.trim()).filter(email => email);
    setCreateData({ ...createData, [field]: emails });
    
    // Validate emails
    const error = validateEmailList(emails);
    setEmailErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleFromEmailChange = (value: string) => {
    setCreateData({ ...createData, fromEmail: value });
    
    // Validate from email
    const error = value && !validateEmail(value) ? 'Invalid email address' : undefined;
    setEmailErrors(prev => ({ ...prev, fromEmail: error }));
  };
  
  const [variableValues, setVariableValues] = useState<VariableValue[]>([]);
  
  // Edit mode variable states
  const [editTemplateVariables, setEditTemplateVariables] = useState<TemplateVariable[]>([]);
  const [editGlobalVariables, setEditGlobalVariables] = useState<GlobalVariable[]>([]);
  const [selectedGlobalVariables, setSelectedGlobalVariables] = useState<string[]>([]);
  const [newTemplateVariable, setNewTemplateVariable] = useState<Partial<TemplateVariable>>({});
  const [editPreviewVariables, setEditPreviewVariables] = useState<Record<string, string>>({});
  const [editVariableTab, setEditVariableTab] = useState(0);
  const [showEditPreview, setShowEditPreview] = useState(false);

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
      setEditGlobalVariables(variables);
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
      setCreateData({ name: '', subject: '', content: '', fromEmail: '', toEmails: [], ccEmails: [], bccEmails: [], maxRecipients: 50, attachments: [], category: '', isDefault: false });
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
      setCreateData({ name: '', subject: '', content: '', fromEmail: '', toEmails: [], ccEmails: [], bccEmails: [], maxRecipients: 50, attachments: [], category: '', isDefault: false });
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

  const openEditDialog = async () => {
    if (selectedTemplate) {
      try {
        // Load template data
        setCreateData({
          name: selectedTemplate.name,
          subject: selectedTemplate.subject,
          content: selectedTemplate.content,
          fromEmail: selectedTemplate.fromEmail || '',
          toEmails: selectedTemplate.toEmails || [],
          ccEmails: selectedTemplate.ccEmails || [],
          bccEmails: selectedTemplate.bccEmails || [],
          maxRecipients: selectedTemplate.maxRecipients || 50,
          attachments: selectedTemplate.attachments || [],
          category: selectedTemplate.category,
          isDefault: selectedTemplate.isDefault
        });
        
        // Load template-specific variables
        const templateVars = await variableService.template.getByTemplate(selectedTemplate.id);
        setEditTemplateVariables(templateVars);
        
        // Load all global variables
        const globalVars = await variableService.global.getAll();
        setEditGlobalVariables(globalVars);
        
        // Initialize selected global variables (those already used in template)
        const extractedVars = extractVariables(selectedTemplate.content, selectedTemplate.subject);
        const usedGlobalVars = globalVars
          .filter(gv => extractedVars.includes(gv.name))
          .map(gv => gv.id);
        setSelectedGlobalVariables(usedGlobalVars);
        
        // Initialize edit preview variables
        const initPreviewVars: Record<string, string> = {};
        extractedVars.forEach(variable => {
          const templateVar = templateVars.find(tv => tv.name === variable);
          const globalVar = globalVars.find(gv => gv.name === variable);
          const currentVar = templateVar || globalVar;
          initPreviewVars[variable] = currentVar?.defaultValue || getDefaultValue(variable);
        });
        setEditPreviewVariables(initPreviewVars);
        
        // Reset states
        setEditVariableTab(0);
        setShowEditPreview(false);
        setNewTemplateVariable({});
        
        showSnackbar(`Opening editor for "${selectedTemplate.name}"`, 'info');
        setEditDialogOpen(true);
      } catch (err: any) {
        console.error('Failed to load variables for edit:', err);
        showSnackbar('Failed to load template variables', 'error');
      }
    }
    handleMenuClose();
  };

  const openPreviewDialog = () => {
    setAnchorEl(null);
    setPreviewDialogOpen(true);
  };

  const openDeleteDialog = () => {
    setDeleteDialogOpen(true);
    handleMenuClose();
  };



  // Edit mode variable handlers
  const handleEditVariableChange = (variable: string, value: string) => {
    setEditPreviewVariables(prev => ({ ...prev, [variable]: value }));
  };
  
  const handleAddGlobalVariable = async (globalVariableId: string) => {
    if (!selectedTemplate) {
      showSnackbar('No template selected', 'error');
      return;
    }
    
    if (!globalVariableId) {
      showSnackbar('Invalid global variable ID', 'error');
      return;
    }
    
    if (selectedGlobalVariables.includes(globalVariableId)) {
      showSnackbar('Global variable already selected', 'warning');
      return;
    }
    
    try {
      const globalVar = editGlobalVariables.find(gv => gv.id === globalVariableId);
      if (!globalVar) {
        showSnackbar('Global variable not found', 'error');
        return;
      }
      
      // Add to selected global variables
      setSelectedGlobalVariables(prev => [...prev, globalVariableId]);
      
      // Add to edit preview variables with default value
      setEditPreviewVariables(prev => ({
        ...prev,
        [globalVar.name]: globalVar.defaultValue || getDefaultValue(globalVar.name)
      }));
      
      showSnackbar(`Added global variable "${globalVar.displayName || globalVar.name}"`, 'success');
    } catch (err: any) {
      console.error('Failed to add global variable:', err);
      showSnackbar('Failed to add global variable', 'error');
    }
  };
  
  const handleRemoveGlobalVariable = (globalVariableId: string) => {
    const globalVar = editGlobalVariables.find(gv => gv.id === globalVariableId);
    if (!globalVar) return;
    
    setSelectedGlobalVariables(prev => prev.filter(id => id !== globalVariableId));
    setEditPreviewVariables(prev => {
      const updated = { ...prev };
      delete updated[globalVar.name];
      return updated;
    });
    
    showSnackbar(`Removed global variable "${globalVar.displayName || globalVar.name}"`, 'info');
  };
  
  const handleCreateTemplateVariable = async () => {
    if (!selectedTemplate) {
      showSnackbar('No template selected', 'error');
      return;
    }
    
    if (!newTemplateVariable.name || newTemplateVariable.name.trim() === '') {
      showSnackbar('Variable name is required', 'error');
      return;
    }
    
    // Validate variable name format
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(newTemplateVariable.name.trim())) {
      showSnackbar('Variable name must start with a letter and contain only letters, numbers, and underscores', 'error');
      return;
    }
    
    // Check if variable name already exists
    const existingVariable = editTemplateVariables.find(v => v.name === newTemplateVariable.name.trim());
    if (existingVariable) {
      showSnackbar('Variable name already exists', 'error');
      return;
    }
    
    if (!newTemplateVariable.displayName || newTemplateVariable.displayName.trim() === '') {
      showSnackbar('Display name is required', 'error');
      return;
    }
    
    try {
      const templateVar = await variableService.template.create({
        templateId: selectedTemplate.id,
        name: newTemplateVariable.name.trim(),
        displayName: newTemplateVariable.displayName.trim(),
        description: newTemplateVariable.description?.trim() || '',
        type: newTemplateVariable.type || 'text',
        defaultValue: newTemplateVariable.defaultValue?.trim() || ''
      });
      
      // Update local state
      setEditTemplateVariables(prev => [...prev, templateVar]);
      setEditPreviewVariables(prev => ({
        ...prev,
        [templateVar.name]: templateVar.defaultValue || getDefaultValue(templateVar.name)
      }));
      
      // Reset form
      setNewTemplateVariable({});
      
      showSnackbar(`Created template variable "${templateVar.displayName}"`, 'success');
    } catch (err: any) {
      console.error('Failed to create template variable:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to create template variable';
      showSnackbar(errorMessage, 'error');
    }
  };
  
  const handleDeleteTemplateVariable = async (templateVariableId: string) => {
    if (!templateVariableId) {
      showSnackbar('Invalid variable ID', 'error');
      return;
    }
    
    const deletedVar = editTemplateVariables.find(tv => tv.id === templateVariableId);
    if (!deletedVar) {
      showSnackbar('Variable not found', 'error');
      return;
    }
    
    try {
      await variableService.template.delete(templateVariableId);
      
      setEditTemplateVariables(prev => prev.filter(tv => tv.id !== templateVariableId));
      setEditPreviewVariables(prev => {
        const updated = { ...prev };
        delete updated[deletedVar.name];
        return updated;
      });
      showSnackbar(`Deleted template variable "${deletedVar.displayName}"`, 'success');
    } catch (err: any) {
      console.error('Failed to delete template variable:', err);
      const errorMessage = err?.response?.data?.message || err?.message || 'Failed to delete template variable';
      showSnackbar(errorMessage, 'error');
    }
  };
  
  const getEditPreviewContent = () => {
    if (!selectedTemplate) return '';
    
    let content = createData.content;
    Object.entries(editPreviewVariables).forEach(([variable, value]) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, value || `[${variable}]`);
    });
    return content;
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
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="From Email"
                  type="email"
                  value={createData.fromEmail}
                  onChange={(e) => handleFromEmailChange(e.target.value)}
                  margin="normal"
                  placeholder="sender@example.com"
                  error={!!emailErrors.fromEmail}
                  helperText={emailErrors.fromEmail || "Sender's email address"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="To Emails (Default)"
                  value={createData.toEmails.join(', ')}
                  onChange={(e) => handleEmailFieldChange('toEmails', e.target.value)}
                  margin="normal"
                  placeholder="recipient1@example.com, recipient2@example.com"
                  error={!!emailErrors.toEmails}
                  helperText={emailErrors.toEmails || "Comma-separated list of default recipient emails (can be overridden when sending)"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="CC Emails"
                  value={createData.ccEmails.join(', ')}
                  onChange={(e) => handleEmailFieldChange('ccEmails', e.target.value)}
                  margin="normal"
                  placeholder="cc1@example.com, cc2@example.com"
                  error={!!emailErrors.ccEmails}
                  helperText={emailErrors.ccEmails || "Comma-separated list of CC emails"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="BCC Emails"
                  value={createData.bccEmails.join(', ')}
                  onChange={(e) => handleEmailFieldChange('bccEmails', e.target.value)}
                  margin="normal"
                  placeholder="bcc1@example.com, bcc2@example.com"
                  error={!!emailErrors.bccEmails}
                  helperText={emailErrors.bccEmails || "Comma-separated list of BCC emails"}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Max Recipients"
                  type="number"
                  value={createData.maxRecipients}
                  onChange={(e) => setCreateData({ ...createData, maxRecipients: parseInt(e.target.value) || 50 })}
                  margin="normal"
                  inputProps={{ min: 1, max: 1000 }}
                  helperText="Maximum number of recipients allowed (1-1000)"
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
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              Edit Template: {selectedTemplate?.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant={showEditPreview ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setShowEditPreview(!showEditPreview)}
                startIcon={<VisibilityIcon />}
              >
                {showEditPreview ? 'Hide Preview' : 'Show Preview'}
              </Button>
              <Chip 
                label={selectedTemplate?.category || 'Uncategorized'} 
                size="small" 
                variant="outlined"
              />
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <Grid container spacing={3}>
              {/* Template Content Section */}
              <Grid item xs={12} md={showEditPreview ? 6 : 8}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <EditIcon color="primary" />
                      Template Content
                    </Typography>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Template Name"
                          value={createData.name}
                          onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
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
                          onChange={(e) => {
                            setCreateData({ ...createData, subject: e.target.value });
                            // Update preview variables when subject changes
                            const extractedVars = extractVariables(createData.content, e.target.value);
                            const newPreviewVars: Record<string, string> = {};
                            extractedVars.forEach(variable => {
                              newPreviewVars[variable] = editPreviewVariables[variable] || getDefaultValue(variable);
                            });
                            setEditPreviewVariables(newPreviewVars);
                          }}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="From Email"
                          type="email"
                          value={createData.fromEmail}
                          onChange={(e) => handleFromEmailChange(e.target.value)}
                          size="small"
                          placeholder="sender@example.com"
                          error={!!emailErrors.fromEmail}
                          helperText={emailErrors.fromEmail || "Sender's email address"}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="To Emails (Default)"
                          value={createData.toEmails.join(', ')}
                          onChange={(e) => handleEmailFieldChange('toEmails', e.target.value)}
                          size="small"
                          placeholder="recipient1@example.com, recipient2@example.com"
                          error={!!emailErrors.toEmails}
                          helperText={emailErrors.toEmails || "Comma-separated list of default recipient emails (can be overridden when sending)"}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="CC Emails"
                          value={createData.ccEmails.join(', ')}
                          onChange={(e) => handleEmailFieldChange('ccEmails', e.target.value)}
                          size="small"
                          placeholder="cc1@example.com, cc2@example.com"
                          error={!!emailErrors.ccEmails}
                          helperText={emailErrors.ccEmails || "Comma-separated list of CC emails"}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="BCC Emails"
                          value={createData.bccEmails.join(', ')}
                          onChange={(e) => handleEmailFieldChange('bccEmails', e.target.value)}
                          size="small"
                          placeholder="bcc1@example.com, bcc2@example.com"
                          error={!!emailErrors.bccEmails}
                          helperText={emailErrors.bccEmails || "Comma-separated list of BCC emails"}
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <TextField
                          fullWidth
                          label="Max Recipients"
                          type="number"
                          value={createData.maxRecipients}
                          onChange={(e) => setCreateData({ ...createData, maxRecipients: parseInt(e.target.value) || 50 })}
                          size="small"
                          inputProps={{ min: 1, max: 1000 }}
                          helperText="Maximum number of recipients allowed (1-1000)"
                        />
                      </Grid>
                      <Grid item xs={12}>
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Email Content (HTML)
                          </Typography>
                          <ReactQuill
                            value={createData.content}
                            onChange={(content) => {
                              setCreateData({ ...createData, content });
                              // Update preview variables when content changes
                              const extractedVars = extractVariables(content, createData.subject);
                              const newPreviewVars: Record<string, string> = {};
                              extractedVars.forEach(variable => {
                                newPreviewVars[variable] = editPreviewVariables[variable] || getDefaultValue(variable);
                              });
                              setEditPreviewVariables(newPreviewVars);
                            }}
                            style={{ height: '250px', marginBottom: '50px' }}
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
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Variables Management Section */}
              <Grid item xs={12} md={showEditPreview ? 3 : 4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <SettingsIcon color="primary" />
                      Variables
                    </Typography>
                    
                    <Tabs value={editVariableTab} onChange={(e, newValue) => setEditVariableTab(newValue)} sx={{ mb: 2 }}>
                      <Tab label="Global" />
                      <Tab label="Template" />
                    </Tabs>
                    
                    {/* Global Variables Tab */}
                    {editVariableTab === 0 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Select global variables to use in this template:
                        </Typography>
                        
                        <Box sx={{ maxHeight: '300px', overflow: 'auto' }}>
                          {editGlobalVariables.map((globalVar) => (
                            <Box key={globalVar.id} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2">
                                    {globalVar.displayName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {'{'}{'{'}{globalVar.name}{'}'}{'}'}  • {globalVar.type}
                                  </Typography>
                                  {globalVar.description && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {globalVar.description}
                                    </Typography>
                                  )}
                                </Box>
                                <Checkbox
                                  checked={selectedGlobalVariables.includes(globalVar.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      handleAddGlobalVariable(globalVar.id);
                                    } else {
                                      handleRemoveGlobalVariable(globalVar.id);
                                    }
                                  }}
                                />
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                    
                    {/* Template Variables Tab */}
                    {editVariableTab === 1 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Template-specific variables:
                        </Typography>
                        
                        {/* Create New Template Variable */}
                        <Accordion sx={{ mb: 2 }}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography variant="subtitle2">Create New Variable</Typography>
                          </AccordionSummary>
                          <AccordionDetails>
                            <Grid container spacing={2}>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Variable Name"
                                  value={newTemplateVariable.name || ''}
                                  onChange={(e) => setNewTemplateVariable(prev => ({ ...prev, name: e.target.value }))}
                                  size="small"
                                  placeholder="e.g., customerName"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Display Name"
                                  value={newTemplateVariable.displayName || ''}
                                  onChange={(e) => setNewTemplateVariable(prev => ({ ...prev, displayName: e.target.value }))}
                                  size="small"
                                  placeholder="e.g., Customer Name"
                                />
                              </Grid>
                              <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                  <InputLabel>Type</InputLabel>
                                  <Select
                                    value={newTemplateVariable.type || 'text'}
                                    onChange={(e) => setNewTemplateVariable(prev => ({ ...prev, type: e.target.value }))}
                                    label="Type"
                                  >
                                    <MenuItem value="text">Text</MenuItem>
                                    <MenuItem value="number">Number</MenuItem>
                                    <MenuItem value="email">Email</MenuItem>
                                    <MenuItem value="url">URL</MenuItem>
                                    <MenuItem value="date">Date</MenuItem>
                                  </Select>
                                </FormControl>
                              </Grid>
                              <Grid item xs={6}>
                                <TextField
                                  fullWidth
                                  label="Default Value"
                                  value={newTemplateVariable.defaultValue || ''}
                                  onChange={(e) => setNewTemplateVariable(prev => ({ ...prev, defaultValue: e.target.value }))}
                                  size="small"
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <TextField
                                  fullWidth
                                  label="Description"
                                  value={newTemplateVariable.description || ''}
                                  onChange={(e) => setNewTemplateVariable(prev => ({ ...prev, description: e.target.value }))}
                                  size="small"
                                  multiline
                                  rows={2}
                                />
                              </Grid>
                              <Grid item xs={12}>
                                <Button
                                  variant="contained"
                                  onClick={handleCreateTemplateVariable}
                                  disabled={!newTemplateVariable.name}
                                  size="small"
                                  fullWidth
                                >
                                  Create Variable
                                </Button>
                              </Grid>
                            </Grid>
                          </AccordionDetails>
                        </Accordion>
                        
                        {/* Existing Template Variables */}
                        <Box sx={{ maxHeight: '250px', overflow: 'auto' }}>
                          {editTemplateVariables.map((templateVar) => (
                            <Box key={templateVar.id} sx={{ mb: 1, p: 1, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Box sx={{ flex: 1 }}>
                                  <Typography variant="subtitle2">
                                    {templateVar.displayName}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {'{'}{'{'}{templateVar.name}{'}'}{'}'}  • {templateVar.type}
                                  </Typography>
                                  {templateVar.description && (
                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                      {templateVar.description}
                                    </Typography>
                                  )}
                                </Box>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteTemplateVariable(templateVar.id)}
                                  color="error"
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Box>
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Preview Section */}
              {showEditPreview && (
                <Grid item xs={12} md={3}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <VisibilityIcon color="primary" />
                        Live Preview
                      </Typography>
                      
                      {/* Variable Inputs */}
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1 }}>Variable Values:</Typography>
                        <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                          {extractVariables(createData.content, createData.subject).map((variable) => (
                            <TextField
                              key={variable}
                              fullWidth
                              label={variable}
                              value={editPreviewVariables[variable] || ''}
                              onChange={(e) => handleEditVariableChange(variable, e.target.value)}
                              size="small"
                              sx={{ mb: 1 }}
                            />
                          ))}
                        </Box>
                      </Box>
                      
                      <Divider sx={{ mb: 2 }} />
                      
                      {/* Email Preview */}
                      <Box sx={{ mb: 2, p: 1, backgroundColor: '#f5f5f5', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          SUBJECT
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {(() => {
                            let subject = createData.subject || '';
                            Object.entries(editPreviewVariables).forEach(([variable, value]) => {
                              const regex = new RegExp(`{{${variable}}}`, 'g');
                              subject = subject.replace(regex, value || `[${variable}]`);
                            });
                            return subject || 'No subject';
                          })()}
                        </Typography>
                      </Box>
                      
                      <Box
                        sx={{
                          border: '1px solid #e0e0e0',
                          borderRadius: 1,
                          p: 1,
                          backgroundColor: '#ffffff',
                          maxHeight: '300px',
                          overflow: 'auto',
                          minHeight: '150px',
                          fontSize: '0.8rem'
                        }}
                      >
                        <div dangerouslySetInnerHTML={{ __html: getEditPreviewContent() }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)} size="large">
            Cancel
          </Button>
          <Button onClick={handleEditTemplate} variant="contained" size="large">
            Update Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <EmailPreviewDialog
        open={previewDialogOpen}
        onClose={() => {
          setPreviewDialogOpen(false);
          setSelectedTemplate(null);
        }}
        template={selectedTemplate}
        showSnackbar={showSnackbar}
      />

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