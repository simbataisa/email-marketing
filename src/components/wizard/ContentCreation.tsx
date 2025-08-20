/**
 * Content Creation - Step 3 of Campaign Creation Wizard
 * Handles email content creation with templates and rich text editor
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Divider,
  Alert,
  Chip,
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import { Preview, Code, Article, PersonAdd } from '@mui/icons-material';
import axios from 'axios';

interface CampaignData {
  name: string;
  subject: string;
  fromEmail: string;
  fromName: string;
  selectedLists: string[];
  content: string;
  templateId?: string;
  scheduleType: 'now' | 'later';
  scheduledAt?: Date;
}

interface ContentCreationProps {
  data: CampaignData;
  onChange: (data: Partial<CampaignData>) => void;
}

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

// Email templates will be fetched from the API

const personalizationTags = [
  { tag: '{{firstName}}', description: 'Recipient\'s first name' },
  { tag: '{{lastName}}', description: 'Recipient\'s last name' },
  { tag: '{{email}}', description: 'Recipient\'s email address' },
  { tag: '{{fromName}}', description: 'Sender\'s name' },
  { tag: '{{subject}}', description: 'Email subject line' },
  { tag: '{{unsubscribeUrl}}', description: 'Unsubscribe link (required)' }
];

export default function ContentCreation({ data, onChange }: ContentCreationProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [personalizationDialogOpen, setPersonalizationDialogOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  useEffect(() => {
    fetchEmailTemplates();
  }, []);

  const fetchEmailTemplates = async () => {
    try {
      setTemplatesLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get('/api/email-templates', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmailTemplates(response.data);
      setTemplatesError(null);
    } catch (err: any) {
      setTemplatesError(err.response?.data?.error || 'Failed to fetch email templates');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    onChange({ 
      content: template.content,
      templateId: template.id,
      subject: template.subject
    });
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTemplate(null);
    onChange({ 
      content: event.target.value,
      templateId: undefined
    });
  };

  const insertPersonalizationTag = (tag: string) => {
    const textarea = document.getElementById('email-content') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = data.content.substring(0, start) + tag + data.content.substring(end);
      onChange({ content: newContent });
      
      // Set cursor position after the inserted tag
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + tag.length, start + tag.length);
      }, 0);
    }
    setPersonalizationDialogOpen(false);
  };

  const handleTemplatePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template.id);
    setPreviewDialogOpen(true);
  };

  const getPreviewContent = (content?: string) => {
    const contentToPreview = content || data.content;
    return contentToPreview
      .replace(/{{firstName}}/g, 'John')
      .replace(/{{lastName}}/g, 'Doe')
      .replace(/{{email}}/g, 'john.doe@example.com')
      .replace(/{{fromName}}/g, data.fromName || 'Your Name')
      .replace(/{{subject}}/g, data.subject || 'Your Subject')
      .replace(/{{unsubscribeUrl}}/g, '#unsubscribe');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Create Your Email Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Choose a template or create your own email content. Use personalization tags to customize emails for each recipient.
      </Typography>

      <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)} sx={{ mb: 3 }}>
        <Tab label="Templates" icon={<Article />} />
        <Tab label="Custom Content" icon={<Code />} />
      </Tabs>

      {activeTab === 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Choose a Template
          </Typography>
          {templatesLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <Typography>Loading templates...</Typography>
            </Box>
          ) : templatesError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {templatesError}
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {emailTemplates.map((template) => (
                <Grid item xs={12} md={4} key={template.id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flex: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        {template.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        {template.subject}
                      </Typography>
                      <Chip 
                        label={template.category} 
                        size="small" 
                        variant="outlined"
                        sx={{ mt: 1 }}
                      />
                    </CardContent>
                    <CardActions>
                      <Button 
                        size="small" 
                        onClick={() => handleTemplateSelect(template)}
                        variant="outlined"
                      >
                        Use Template
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {activeTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Email Content
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                startIcon={<PersonAdd />}
                onClick={() => setPersonalizationDialogOpen(true)}
              >
                Add Personalization
              </Button>
              <Button
                size="small"
                startIcon={<Preview />}
                onClick={() => setPreviewDialogOpen(true)}
                disabled={!data.content}
              >
                Preview
              </Button>
            </Box>
          </Box>

          <TextField
            id="email-content"
            fullWidth
            multiline
            rows={20}
            value={data.content}
            onChange={handleContentChange}
            placeholder="Enter your email content here... You can use HTML for formatting."
            variant="outlined"
            sx={{ fontFamily: 'monospace' }}
          />

          {!data.content && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Email content is required. You can start with a template or write your own HTML content.
            </Alert>
          )}

          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <strong>Tips:</strong>
              <br />
              • Use HTML for formatting (headings, paragraphs, links, etc.)
              • Include personalization tags like &#123;&#123;firstName&#125;&#125; to customize emails
              • Always include an unsubscribe link: &#123;&#123;unsubscribeUrl&#125;&#125;
              • Test your email in the preview before sending
            </Typography>
          </Alert>
        </Box>
      )}

      {/* Personalization Tags Dialog */}
      <Dialog 
        open={personalizationDialogOpen} 
        onClose={() => setPersonalizationDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add Personalization Tags</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Click on a tag to insert it at your cursor position in the email content.
          </Typography>
          <Grid container spacing={1}>
            {personalizationTags.map((item) => (
              <Grid item xs={12} key={item.tag}>
                <Chip
                  label={item.tag}
                  onClick={() => insertPersonalizationTag(item.tag)}
                  sx={{ mr: 1, mb: 1, cursor: 'pointer' }}
                  color="primary"
                  variant="outlined"
                />
                <Typography variant="body2" component="span" color="text.secondary">
                  {item.description}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPersonalizationDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Email Preview</DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: 'background.paper'
            }}
          >
            <div dangerouslySetInnerHTML={{ 
              __html: getPreviewContent(
                selectedTemplate ? 
                  emailTemplates.find(t => t.id === selectedTemplate)?.content : 
                  undefined
              ) 
            }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}