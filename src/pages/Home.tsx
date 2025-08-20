import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  Card,
  CardContent,
  AppBar,
  Toolbar,
  Stack
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Email,
  Analytics,
  People,
  Schedule,
  TrendingUp,
  Security
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleGetStarted = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/register');
    }
  };

  const handleSignIn = () => {
    navigate('/login');
  };

  const features = [
    {
      icon: <Email sx={{ fontSize: 40 }} />,
      title: 'Email Campaigns',
      description: 'Create and send beautiful email campaigns with our intuitive editor'
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: 'Contact Management',
      description: 'Organize your contacts with smart lists and segmentation tools'
    },
    {
      icon: <Analytics sx={{ fontSize: 40 }} />,
      title: 'Advanced Analytics',
      description: 'Track opens, clicks, and conversions with detailed reporting'
    },
    {
      icon: <Schedule sx={{ fontSize: 40 }} />,
      title: 'Smart Scheduling',
      description: 'Schedule campaigns for optimal delivery times'
    },
    {
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      title: 'Performance Insights',
      description: 'Get actionable insights to improve your email marketing ROI'
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Secure & Reliable',
      description: 'Enterprise-grade security with 99.9% uptime guarantee'
    }
  ];

  return (
    <Box>
      {/* Navigation Bar */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Email Marketing Platform
          </Typography>
          {!user && (
            <Stack direction="row" spacing={2}>
              <Button color="inherit" onClick={handleSignIn}>
                Sign In
              </Button>
              <Button variant="contained" onClick={handleGetStarted}>
                Get Started
              </Button>
            </Stack>
          )}
          {user && (
            <Button variant="contained" onClick={() => navigate('/dashboard')}>
              Go to Dashboard
            </Button>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 12,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Powerful Email Marketing Made Simple
          </Typography>
          <Typography variant="h5" sx={{ mb: 4, opacity: 0.9 }}>
            Create, send, and track email campaigns that drive results.
            Join thousands of businesses growing with our platform.
          </Typography>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                bgcolor: 'white',
                color: 'primary.main',
                '&:hover': { bgcolor: 'grey.100' },
                px: 4,
                py: 1.5
              }}
            >
              {user ? 'Go to Dashboard' : 'Start Free Trial'}
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' },
                px: 4,
                py: 1.5
              }}
            >
              Watch Demo
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h3" component="h2" gutterBottom>
            Everything You Need to Succeed
          </Typography>
          <Typography variant="h6" color="text.secondary">
            Powerful features designed to help you create effective email campaigns
          </Typography>
        </Box>

        <Grid container spacing={4}>
          {features.map((feature, index) => (
            <Grid item xs={12} md={6} lg={4} key={index}>
              <Card
                sx={{
                  height: '100%',
                  textAlign: 'center',
                  p: 2,
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'translateY(-4px)' }
                }}
              >
                <CardContent>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* CTA Section */}
      <Box
        sx={{
          bgcolor: 'grey.50',
          py: 8,
          textAlign: 'center'
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h4" component="h2" gutterBottom>
            Ready to Transform Your Email Marketing?
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
            Join thousands of businesses already using our platform to grow their audience and increase sales.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleGetStarted}
            sx={{ px: 4, py: 1.5 }}
          >
            {user ? 'Go to Dashboard' : 'Get Started Today'}
          </Button>
        </Container>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          bgcolor: 'grey.900',
          color: 'white',
          py: 4,
          textAlign: 'center'
        }}
      >
        <Container>
          <Typography variant="body2">
            &copy; 2024 Email Marketing Platform. All rights reserved.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}