/**
 * Campaign Setup - Step 1 of Campaign Creation Wizard
 * Handles campaign name, subject, from email, and from name
 */
import {
  Box,
  TextField,
  Typography,
  GridLegacy as Grid,
  FormHelperText
} from '@mui/material';

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

interface CampaignSetupProps {
  data: CampaignData;
  onChange: (data: Partial<CampaignData>) => void;
}

export default function CampaignSetup({ data, onChange }: CampaignSetupProps) {
  const handleChange = (field: keyof CampaignData) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: event.target.value });
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom>
        Campaign Setup
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Set up the basic information for your email campaign.
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Campaign Name"
            value={data.name}
            onChange={handleChange('name')}
            placeholder="e.g., Summer Sale 2024"
            required
            error={!data.name && data.name !== ''}
            helperText={!data.name && data.name !== '' ? 'Campaign name is required' : 'This name is for your reference and won\'t be visible to recipients'}
          />
        </Grid>

        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Email Subject"
            value={data.subject}
            onChange={handleChange('subject')}
            placeholder="e.g., Don't miss our summer sale - 50% off!"
            required
            error={!data.subject && data.subject !== ''}
            helperText={!data.subject && data.subject !== '' ? 'Email subject is required' : 'This will be the subject line recipients see in their inbox'}
            inputProps={{ maxLength: 100 }}
          />
          <FormHelperText sx={{ textAlign: 'right' }}>
            {data.subject.length}/100 characters
          </FormHelperText>
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="From Name"
            value={data.fromName}
            onChange={handleChange('fromName')}
            placeholder="e.g., John Doe"
            required
            error={!data.fromName && data.fromName !== ''}
            helperText={!data.fromName && data.fromName !== '' ? 'From name is required' : 'The name recipients will see as the sender'}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <TextField
            fullWidth
            label="From Email"
            type="email"
            value={data.fromEmail}
            onChange={handleChange('fromEmail')}
            placeholder="e.g., john@company.com"
            required
            error={(!data.fromEmail && data.fromEmail !== '') || (data.fromEmail && !validateEmail(data.fromEmail))}
            helperText={
              !data.fromEmail && data.fromEmail !== ''
                ? 'From email is required'
                : data.fromEmail && !validateEmail(data.fromEmail)
                ? 'Please enter a valid email address'
                : 'The email address recipients will see as the sender'
            }
          />
        </Grid>

        <Grid item xs={12}>
          <Box sx={{ p: 2, bgcolor: 'info.light', borderRadius: 1, mt: 2 }}>
            <Typography variant="body2" color="info.dark">
              <strong>Tips for better deliverability:</strong>
              <br />
              • Use a recognizable sender name and email address
              • Keep subject lines under 50 characters for mobile optimization
              • Avoid spam trigger words like "FREE", "URGENT", or excessive punctuation
              • Test your subject line with different audiences
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}