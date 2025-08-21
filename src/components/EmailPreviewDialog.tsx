import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  Chip,
  Alert,
  Divider
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { Visibility as VisibilityIcon } from '@mui/icons-material';
import { variableService, type TemplateVariable, type GlobalVariable } from '../services/variableService';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  fromEmail?: string;
  toEmail?: string;
  category: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EmailPreviewDialogProps {
  open: boolean;
  onClose: () => void;
  template: EmailTemplate | null;
  showSnackbar?: (message: string, severity: 'success' | 'error' | 'info' | 'warning') => void;
}

// Helper function to extract variables from template content
const extractVariables = (content: string, subject: string = ''): string[] => {
  const combinedText = `${content} ${subject}`;
  const matches = combinedText.match(/{{([^}]+)}}/g);
  if (!matches) return [];
  
  const variables = matches.map(match => match.replace(/[{}]/g, ''));
  return [...new Set(variables)];
};

// Helper function to get default values for common variables
const getDefaultValue = (variable: string): string => {
  const defaults: Record<string, string> = {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    fromName: 'Your Company',
    subject: 'Email Subject',
    companyName: 'Your Company',
    unsubscribeUrl: '#unsubscribe'
  };
  return defaults[variable] || `[${variable}]`;
};

export const EmailPreviewDialog: React.FC<EmailPreviewDialogProps> = ({
  open,
  onClose,
  template,
  showSnackbar
}) => {
  const [previewVariables, setPreviewVariables] = useState<Record<string, string>>({});
  const [templateVariables, setTemplateVariables] = useState<TemplateVariable[]>([]);
  const [globalVariables, setGlobalVariables] = useState<GlobalVariable[]>([]);
  const [loading, setLoading] = useState(false);

  // Load variables when template changes
  useEffect(() => {
    if (template && open) {
      loadTemplateVariables();
    }
  }, [template, open]);

  const loadTemplateVariables = async () => {
    if (!template) return;
    
    try {
      setLoading(true);
      
      // Load template-specific variables
      const templateVars = await variableService.template.getByTemplate(template.id);
      setTemplateVariables(templateVars);
      
      // Load all global variables
      const globalVars = await variableService.global.getAll();
      setGlobalVariables(globalVars);
      
      // Extract variables from template content
      const extractedVars = extractVariables(template.content, template.subject);
      
      // Initialize preview variables
      const initPreviewVars: Record<string, string> = {};
      extractedVars.forEach(variable => {
        const templateVar = templateVars.find(tv => tv.name === variable);
        const globalVar = globalVars.find(gv => gv.name === variable);
        const currentVar = templateVar || globalVar;
        initPreviewVars[variable] = currentVar?.defaultValue || getDefaultValue(variable);
      });
      
      setPreviewVariables(initPreviewVars);
      
      if (showSnackbar) {
        showSnackbar(`Previewing template "${template.name}"`, 'info');
      }
    } catch (err: any) {
      console.error('Failed to fetch template variables:', err);
      
      // Fallback to basic extraction
      const variables = extractVariables(template.content, template.subject);
      const initialVariables: Record<string, string> = {};
      
      variables.forEach(variable => {
        initialVariables[variable] = getDefaultValue(variable);
      });
      
      setPreviewVariables(initialVariables);
      
      if (showSnackbar) {
        showSnackbar(`Previewing template "${template.name}" (basic mode)`, 'info');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVariableChange = async (variable: string, value: string) => {
    setPreviewVariables(prev => ({ ...prev, [variable]: value }));
    
    // Save variable value if it's a template or global variable
    try {
      const templateVar = templateVariables.find(tv => tv.name === variable);
      const globalVar = globalVariables.find(gv => gv.name === variable);
      
      if (templateVar) {
        // Update template variable default value
        await variableService.template.update(templateVar.id, { defaultValue: value });
      } else if (globalVar) {
        // Update global variable default value
        await variableService.global.update(globalVar.id, { defaultValue: value });
      }
    } catch (err: any) {
      console.error('Failed to save variable value:', err);
      // Keep the local state change even if save fails
    }
  };

  const getPreviewContent = () => {
    if (!template || !template.content) return '';
    
    let content = template.content;
    
    // Replace all variables found in the template
    Object.entries(previewVariables).forEach(([variable, value]) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      content = content.replace(regex, value || `[${variable}]`);
    });
    
    return content;
  };

  const getPreviewSubject = () => {
    if (!template || !template.subject) return 'No subject';
    
    let subject = template.subject;
    
    // Replace all variables found in the subject
    Object.entries(previewVariables).forEach(([variable, value]) => {
      const regex = new RegExp(`{{${variable}}}`, 'g');
      subject = subject.replace(regex, value || `[${variable}]`);
    });
    
    return subject;
  };

  const resetToDefaults = () => {
    if (!template) return;
    
    const resetVariables: Record<string, string> = {};
    extractVariables(template.content, template.subject).forEach(variable => {
      const templateVar = templateVariables.find(tv => tv.name === variable);
      const globalVar = globalVariables.find(gv => gv.name === variable);
      const currentVar = templateVar || globalVar;
      resetVariables[variable] = currentVar?.defaultValue || getDefaultValue(variable);
    });
    setPreviewVariables(resetVariables);
    
    if (showSnackbar) {
      showSnackbar('Variables reset to default values', 'info');
    }
  };

  const extractedVars = template ? extractVariables(template.content, template.subject) : [];
  const hasVariables = extractedVars.length > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Template Preview: {template?.name}
          </Typography>
          <Chip 
            label={template?.category || 'Uncategorized'} 
            size="small" 
            variant="outlined"
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Grid container spacing={3}>
            {/* Variables Section */}
            <Grid item xs={12} md={5}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon color="primary" />
                    Template Variables
                  </Typography>
                  
                  {hasVariables ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {Object.keys(previewVariables).map((variable) => {
                        // Find if this is a template variable or global variable
                        const templateVar = templateVariables.find(tv => tv.name === variable);
                        const globalVar = globalVariables.find(gv => gv.name === variable);
                        const currentVar = templateVar || globalVar;
                        
                        const isTemplateVar = !!templateVar;
                        const isGlobalVar = !!globalVar;
                        
                        let description = '';
                        if (isTemplateVar) {
                          description = `Template variable: ${currentVar?.description || 'No description'}`;
                        } else if (isGlobalVar) {
                          description = `Global variable: ${currentVar?.description || 'No description'}`;
                        } else {
                          description = 'Standard variable';
                        }
                        
                        return (
                          <Box key={variable}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {variable}
                              </Typography>
                              {isTemplateVar && (
                                <Chip label="Template" size="small" color="primary" variant="outlined" />
                              )}
                              {isGlobalVar && (
                                <Chip label="Global" size="small" color="secondary" variant="outlined" />
                              )}
                            </Box>
                            
                            {description && (
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                {description}
                              </Typography>
                            )}
                            
                            <TextField
                              fullWidth
                              size="small"
                              value={previewVariables[variable] || ''}
                              onChange={(e) => handleVariableChange(variable, e.target.value)}
                              placeholder={`Enter ${variable}`}
                              sx={{ mb: 1 }}
                            />
                          </Box>
                        );
                      })}
                    </Box>
                  ) : (
                    <Alert severity="info">
                      <Typography variant="body2">
                        No variables found in this template. Add variables like {'{{firstName}}'} or {'{{companyName}}'} to your template content to make it dynamic.
                      </Typography>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </Grid>
            
            {/* Preview Section */}
            <Grid item xs={12} md={7}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VisibilityIcon color="primary" />
                    Email Preview
                  </Typography>
                  
                  {/* Email Header */}
                  <Box sx={{ mb: 3, p: 2, backgroundColor: '#f5f5f5', borderRadius: 1, border: '1px solid #e0e0e0' }}>
                    <Grid container spacing={2}>
                      {template?.fromEmail && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            FROM
                          </Typography>
                          <Typography variant="body2">
                            {template.fromEmail}
                          </Typography>
                        </Grid>
                      )}
                      {template?.toEmail && (
                        <Grid item xs={12}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                            TO
                          </Typography>
                          <Typography variant="body2">
                            {template.toEmail}
                          </Typography>
                        </Grid>
                      )}
                      <Grid item xs={12}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                          SUBJECT LINE
                        </Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                          {getPreviewSubject()}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Box>
                  
                  {/* Email Content */}
                  <Box
                    sx={{
                      border: '1px solid #e0e0e0',
                      borderRadius: 1,
                      p: 3,
                      backgroundColor: '#ffffff',
                      maxHeight: '600px',
                      overflow: 'auto',
                      minHeight: '400px',
                      fontFamily: 'Arial, sans-serif',
                      lineHeight: 1.6
                    }}
                  >
                    <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
                  </Box>
                  
                  {/* Preview Actions */}
                  {hasVariables && (
                    <Box sx={{ mt: 2, display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Button 
                        size="small" 
                        variant="outlined"
                        onClick={resetToDefaults}
                      >
                        Reset to Defaults
                      </Button>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} size="large">
          Close Preview
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EmailPreviewDialog;