/**
 * Review & Schedule - Step 4 of Campaign Creation Wizard
 * Final review of campaign details and scheduling options
 */
import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  GridLegacy as Grid,
  Card,
  CardContent,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  TextField,
  Alert,
  Divider,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { Preview, Schedule, Send, People, Email, Subject } from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';

interface EmailList {
  id: string;
  name: string;
  recipientCount: number;
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

interface ReviewScheduleProps {
  data: CampaignData;
  onChange: (data: Partial<CampaignData>) => void;
}

export default function ReviewSchedule({ data, onChange }: ReviewScheduleProps) {
  const [emailLists, setEmailLists] = useState<EmailList[]>([]);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { token } = useAuthStore();

  useEffect(() => {
    fetchEmailLists();
  }, []);

  const fetchEmailLists = async () => {
    try {
      setLoading(true);
      
      const response = await fetch('/api/email-lists', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const lists = await response.json();
        setEmailLists(lists);
      }
    } catch (err) {
      console.error('Failed to fetch email lists:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleScheduleTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const scheduleType = event.target.value as 'now' | 'later';
    onChange({ scheduleType });
    
    if (scheduleType === 'now') {
      onChange({ scheduledAt: undefined });
    }
  };

  const handleScheduledAtChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const dateTime = new Date(event.target.value);
    onChange({ scheduledAt: dateTime });
  };

  const getSelectedLists = () => {
    return emailLists.filter(list => data.selectedLists.includes(list.id));
  };

  const getTotalRecipients = () => {
    return getSelectedLists().reduce((total, list) => total + list.recipientCount, 0);
  };

  const getPreviewContent = () => {
    return data.content
      .replace(/{{firstName}}/g, 'John')
      .replace(/{{lastName}}/g, 'Doe')
      .replace(/{{email}}/g, 'john.doe@example.com')
      .replace(/{{fromName}}/g, data.fromName)
      .replace(/{{subject}}/g, data.subject)
      .replace(/{{unsubscribeUrl}}/g, '#unsubscribe');
  };

  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes from now
    return now.toISOString().slice(0, 16);
  };

  const isValidScheduleTime = () => {
    if (data.scheduleType === 'now') return true;
    if (!data.scheduledAt) return false;
    
    const now = new Date();
    const scheduled = new Date(data.scheduledAt);
    return scheduled > new Date(now.getTime() + 5 * 60 * 1000); // At least 5 minutes from now
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Review & Schedule
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Review your campaign details and choose when to send it.
      </Typography>

      <Grid container spacing={3}>
        {/* Campaign Summary */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Email color="primary" />
                Campaign Summary
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Campaign Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.name}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Subject Line
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.subject}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      From Name
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.fromName}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      From Email
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {data.fromEmail}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Audience Summary */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <People color="primary" />
                Audience ({getTotalRecipients()} recipients)
              </Typography>
              
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {getSelectedLists().map(list => (
                  <Chip
                    key={list.id}
                    label={`${list.name} (${list.recipientCount})`}
                    color="primary"
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>

          {/* Content Preview */}
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Subject color="primary" />
                  Email Content
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Preview />}
                  onClick={() => setPreviewDialogOpen(true)}
                >
                  Full Preview
                </Button>
              </Box>
              
              <Box 
                sx={{ 
                  maxHeight: 200, 
                  overflow: 'hidden', 
                  border: 1, 
                  borderColor: 'divider', 
                  borderRadius: 1, 
                  p: 2,
                  bgcolor: 'grey.50',
                  position: 'relative'
                }}
              >
                <div 
                  dangerouslySetInnerHTML={{ __html: getPreviewContent() }}
                  style={{ fontSize: '12px', lineHeight: '1.4' }}
                />
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    height: 40, 
                    background: 'linear-gradient(transparent, white)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    pb: 1
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Click "Full Preview" to see the complete email
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Scheduling Options */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Schedule color="primary" />
                Schedule Options
              </Typography>
              
              <FormControl component="fieldset" sx={{ width: '100%' }}>
                <RadioGroup
                  value={data.scheduleType}
                  onChange={handleScheduleTypeChange}
                >
                  <FormControlLabel
                    value="now"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1">Send Now</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Campaign will be sent immediately
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <FormControlLabel
                    value="later"
                    control={<Radio />}
                    label={
                      <Box>
                        <Typography variant="body1">Schedule for Later</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Choose a specific date and time
                        </Typography>
                      </Box>
                    }
                  />
                </RadioGroup>
              </FormControl>

              {data.scheduleType === 'later' && (
                <Box sx={{ mt: 2 }}>
                  <TextField
                    fullWidth
                    type="datetime-local"
                    label="Schedule Date & Time"
                    value={data.scheduledAt ? new Date(data.scheduledAt).toISOString().slice(0, 16) : ''}
                    onChange={handleScheduledAtChange}
                    inputProps={{
                      min: getMinDateTime()
                    }}
                    error={data.scheduleType === 'later' && !isValidScheduleTime()}
                    helperText={
                      data.scheduleType === 'later' && !isValidScheduleTime()
                        ? 'Please select a time at least 5 minutes from now'
                        : 'Campaign will be sent at the specified time'
                    }
                  />
                </Box>
              )}

              <Divider sx={{ my: 3 }} />

              {/* Final Checklist */}
              <Typography variant="h6" gutterBottom>
                Pre-Send Checklist
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Alert severity={data.name && data.subject && data.fromEmail && data.fromName ? 'success' : 'warning'}>
                  <Typography variant="body2">
                    ✓ Campaign details completed
                  </Typography>
                </Alert>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Alert severity={data.selectedLists.length > 0 ? 'success' : 'warning'}>
                  <Typography variant="body2">
                    ✓ Audience selected ({getTotalRecipients()} recipients)
                  </Typography>
                </Alert>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Alert severity={data.content ? 'success' : 'warning'}>
                  <Typography variant="body2">
                    ✓ Email content created
                  </Typography>
                </Alert>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Alert severity={isValidScheduleTime() ? 'success' : 'warning'}>
                  <Typography variant="body2">
                    ✓ Schedule configured
                  </Typography>
                </Alert>
              </Box>

              {data.scheduleType === 'now' && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Ready to send!</strong> Your campaign will be sent immediately to {getTotalRecipients()} recipients.
                  </Typography>
                </Alert>
              )}

              {data.scheduleType === 'later' && data.scheduledAt && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Scheduled!</strong> Your campaign will be sent on {new Date(data.scheduledAt).toLocaleString()}.
                  </Typography>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Full Preview Dialog */}
      <Dialog 
        open={previewDialogOpen} 
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Email Preview - {data.subject}
        </DialogTitle>
        <DialogContent>
          <Box 
            sx={{ 
              border: 1, 
              borderColor: 'divider', 
              borderRadius: 1, 
              p: 2,
              bgcolor: 'background.paper',
              maxHeight: 600,
              overflow: 'auto'
            }}
          >
            <div dangerouslySetInnerHTML={{ __html: getPreviewContent() }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}