/**
 * Campaign Creation Wizard - 4-step process
 * Step 1: Setup (name, subject, from email)
 * Step 2: Audience Selection (email lists)
 * Step 3: Content Creation (email template)
 * Step 4: Review & Schedule
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Box,
  Button,
  Typography,
  Alert
} from '@mui/material';
import { ArrowBack, ArrowForward, Save, Send } from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import CampaignSetup from '../components/wizard/CampaignSetup';
import AudienceSelection from '../components/wizard/AudienceSelection';
import ContentCreation from '../components/wizard/ContentCreation';
import ReviewSchedule from '../components/wizard/ReviewSchedule';

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

const steps = [
  'Campaign Setup',
  'Audience Selection',
  'Content Creation',
  'Review & Schedule'
];

export default function CampaignWizard() {
  const [activeStep, setActiveStep] = useState(0);
  const [campaignData, setCampaignData] = useState<CampaignData>({
    name: '',
    subject: '',
    fromEmail: '',
    fromName: '',
    selectedLists: [],
    content: '',
    templateId: undefined,
    scheduleType: 'now'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { token, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Set default from email and name from user data
    if (user) {
      setCampaignData(prev => ({
        ...prev,
        fromEmail: user.email,
        fromName: `${user.firstName} ${user.lastName}`
      }));
    }
  }, [user]);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepChange = (step: number) => {
    setActiveStep(step);
  };

  const updateCampaignData = (data: Partial<CampaignData>) => {
    setCampaignData(prev => ({ ...prev, ...data }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 0: // Setup
        return !!(campaignData.name && campaignData.subject && campaignData.fromEmail && campaignData.fromName);
      case 1: // Audience
        return campaignData.selectedLists.length > 0;
      case 2: // Content
        return !!(campaignData.content || campaignData.templateId);
      case 3: // Review
        return true;
      default:
        return false;
    }
  };

  const canProceed = validateStep(activeStep);

  const handleSaveDraft = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...campaignData,
          status: 'draft'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to save campaign draft');
      }
      
      const campaign = await response.json();
      navigate(`/campaigns/${campaign.id}`);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  const handleSendCampaign = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...campaignData,
          status: campaignData.scheduleType === 'now' ? 'sending' : 'scheduled'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create campaign');
      }
      
      const campaign = await response.json();
      
      if (campaignData.scheduleType === 'now') {
        // Send immediately
        const sendResponse = await fetch(`/api/campaigns/${campaign.id}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!sendResponse.ok) {
          throw new Error('Failed to send campaign');
        }
      }
      
      navigate('/dashboard');
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send campaign');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <CampaignSetup
            data={campaignData}
            onChange={updateCampaignData}
          />
        );
      case 1:
        return (
          <AudienceSelection
            data={campaignData}
            onChange={updateCampaignData}
          />
        );
      case 2:
        return (
          <ContentCreation
            data={campaignData}
            onChange={updateCampaignData}
          />
        );
      case 3:
        return (
          <ReviewSchedule
            data={campaignData}
            onChange={updateCampaignData}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/dashboard')}
          sx={{ mr: 2 }}
        >
          Back to Dashboard
        </Button>
        <Typography variant="h4" component="h1">
          Create New Campaign
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Paper sx={{ p: 4 }}>
        {/* Stepper */}
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label, index) => (
            <Step key={label} completed={index < activeStep}>
              <StepLabel
                onClick={() => index < activeStep && handleStepChange(index)}
                sx={{
                  cursor: index < activeStep ? 'pointer' : 'default',
                  '& .MuiStepLabel-label': {
                    color: index < activeStep ? 'primary.main' : 'inherit'
                  }
                }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Step Content */}
        <Box sx={{ minHeight: 400, mb: 4 }}>
          {renderStepContent(activeStep)}
        </Box>

        {/* Navigation Buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              startIcon={<ArrowBack />}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          </Box>

          <Box sx={{ display: 'flex', gap: 2 }}>
            {/* Save Draft Button - available on all steps */}
            <Button
              variant="outlined"
              onClick={handleSaveDraft}
              disabled={loading || !campaignData.name}
              startIcon={<Save />}
            >
              Save Draft
            </Button>

            {/* Next/Send Button */}
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                onClick={handleSendCampaign}
                disabled={loading || !canProceed}
                startIcon={<Send />}
              >
                {campaignData.scheduleType === 'now' ? 'Send Campaign' : 'Schedule Campaign'}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={!canProceed}
                endIcon={<ArrowForward />}
              >
                Next
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}