/**
 * Dashboard page component
 * Displays key metrics cards and campaigns table with actions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
  LinearProgress,
  Divider,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  Add,
  MoreVert,
  Email,
  People,
  TrendingUp,
  Schedule,
  Edit,
  Delete,
  FileCopy,
  Send,
  Visibility,
  Analytics,
  Description,
  List as ListIcon,
  Assessment,
  ArrowUpward,
  ArrowDownward,
  AccessTime,
  CheckCircle,
  Drafts,
  SendOutlined
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';

interface Campaign {
  id: string;
  name: string;
  subject: string;
  status: 'draft' | 'scheduled' | 'sent' | 'sending';
  recipientCount: number;
  openRate: number;
  clickRate: number;
  createdAt: string;
  scheduledAt?: string;
  sentAt?: string;
}

interface DashboardMetrics {
  totalCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  campaignsSentThisMonth: number;
  activeEmailLists: number;
  totalEmailTemplates?: number;
  campaignsThisWeek?: number;
  openRateChange?: number;
  clickRateChange?: number;
}

interface RecentActivity {
  id: string;
  type: 'campaign_sent' | 'campaign_created' | 'list_created' | 'template_created';
  title: string;
  description: string;
  timestamp: string;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  color: 'primary' | 'secondary' | 'success' | 'warning';
}

export default function Dashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const { user, token } = useAuthStore();
  const navigate = useNavigate();

  // Quick actions configuration
  const quickActions: QuickAction[] = [
    {
      title: 'Create Campaign',
      description: 'Start a new email campaign',
      icon: <Email />,
      action: () => navigate('/campaigns/create'),
      color: 'primary'
    },
    {
      title: 'Manage Templates',
      description: 'Create and edit email templates',
      icon: <Description />,
      action: () => navigate('/email-templates'),
      color: 'secondary'
    },
    {
      title: 'Email Lists',
      description: 'Manage your subscriber lists',
      icon: <ListIcon />,
      action: () => navigate('/email-lists'),
      color: 'success'
    },
    {
      title: 'View Analytics',
      description: 'Detailed campaign analytics',
      icon: <Assessment />,
      action: () => navigate('/analytics'),
      color: 'warning'
    }
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch dashboard metrics
      const metricsResponse = await fetch('/api/analytics/overview', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!metricsResponse.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      
      const metricsData = await metricsResponse.json();
      setMetrics(metricsData);
      
      // Fetch campaigns
      const campaignsResponse = await fetch('/api/campaigns', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!campaignsResponse.ok) {
        throw new Error('Failed to fetch campaigns');
      }
      
      const campaignsData = await campaignsResponse.json();
      setCampaigns(campaignsData.campaigns || []);
      
      // Generate mock recent activity (in a real app, this would come from an API)
      const mockActivity: RecentActivity[] = (campaignsData.campaigns || []).slice(0, 5).map((campaign: Campaign, index: number) => ({
        id: `activity-${campaign.id}`,
        type: campaign.status === 'sent' ? 'campaign_sent' : 'campaign_created',
        title: campaign.status === 'sent' ? `Campaign "${campaign.name}" sent` : `Campaign "${campaign.name}" created`,
        description: `${campaign.recipientCount} recipients`,
        timestamp: campaign.sentAt || campaign.createdAt
      }));
      setRecentActivity(mockActivity);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: RecentActivity['type']) => {
    switch (type) {
      case 'campaign_sent': return <SendOutlined />;
      case 'campaign_created': return <Drafts />;
      case 'list_created': return <ListIcon />;
      case 'template_created': return <Description />;
      default: return <CheckCircle />;
    }
  };

  const getActivityColor = (type: RecentActivity['type']) => {
    switch (type) {
      case 'campaign_sent': return '#4caf50';
      case 'campaign_created': return '#2196f3';
      case 'list_created': return '#ff9800';
      case 'template_created': return '#9c27b0';
      default: return '#757575';
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handleCreateCampaign = () => {
    navigate('/campaigns/create');
  };

  const handleEditCampaign = () => {
    if (selectedCampaign) {
      navigate(`/campaigns/${selectedCampaign.id}/edit`);
    }
    handleMenuClose();
  };

  const handleViewCampaign = () => {
    if (selectedCampaign) {
      navigate(`/campaigns/${selectedCampaign.id}`);
    }
    handleMenuClose();
  };

  const handleDuplicateCampaign = async () => {
    if (!selectedCampaign) return;
    
    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/duplicate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        fetchDashboardData(); // Refresh data
      }
    } catch (err) {
      console.error('Failed to duplicate campaign:', err);
    }
    
    handleMenuClose();
  };

  const handleDeleteCampaign = async () => {
    if (!selectedCampaign) return;
    
    if (window.confirm(`Are you sure you want to delete "${selectedCampaign.name}"?`)) {
      try {
        const response = await fetch(`/api/campaigns/${selectedCampaign.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          fetchDashboardData(); // Refresh data
        }
      } catch (err) {
        console.error('Failed to delete campaign:', err);
      }
    }
    
    handleMenuClose();
  };

  const handleSendCampaign = async () => {
    if (!selectedCampaign) return;
    
    if (window.confirm(`Are you sure you want to send "${selectedCampaign.name}"?`)) {
      try {
        const response = await fetch(`/api/campaigns/${selectedCampaign.id}/send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          fetchDashboardData(); // Refresh data
        }
      } catch (err) {
        console.error('Failed to send campaign:', err);
      }
    }
    
    handleMenuClose();
  };

  const getStatusColor = (status: Campaign['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'scheduled': return 'warning';
      case 'sending': return 'info';
      case 'sent': return 'success';
      default: return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress size={60} />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={fetchDashboardData}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <>
    <Container maxWidth="lg">
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom>
            Welcome back, {user?.firstName}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Here's an overview of your email marketing performance
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateCampaign}
          size="large"
        >
          Create Campaign
        </Button>
      </Box>

      {/* Quick Actions */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {quickActions.map((action, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer', 
                transition: 'all 0.2s',
                '&:hover': { 
                  transform: 'translateY(-2px)', 
                  boxShadow: 4 
                }
              }}
              onClick={action.action}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: `${action.color}.main`, mr: 2 }}>
                    {action.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="div">
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Enhanced Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Email color="primary" sx={{ mr: 1 }} />
                  <Typography color="text.secondary" variant="subtitle1">
                    Total Campaigns
                  </Typography>
                </Box>
                <TrendingUp color="success" fontSize="small" />
              </Box>
              <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                {metrics?.totalCampaigns || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {metrics?.campaignsSentThisMonth || 0} sent this month
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((metrics?.campaignsSentThisMonth || 0) / Math.max(metrics?.totalCampaigns || 1, 1) * 100, 100)} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <People color="primary" sx={{ mr: 1 }} />
                  <Typography color="text.secondary" variant="subtitle1">
                    Total Recipients
                  </Typography>
                </Box>
                <TrendingUp color="success" fontSize="small" />
              </Box>
              <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                {metrics?.totalRecipients?.toLocaleString() || 0}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {metrics?.activeEmailLists || 0} active lists
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={75} 
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Visibility color="primary" sx={{ mr: 1 }} />
                  <Typography color="text.secondary" variant="subtitle1">
                    Avg. Open Rate
                  </Typography>
                </Box>
                {(metrics?.averageOpenRate || 0) > 21.3 ? 
                  <ArrowUpward color="success" fontSize="small" /> : 
                  <ArrowDownward color="error" fontSize="small" />
                }
              </Box>
              <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                {metrics?.averageOpenRate ? `${metrics.averageOpenRate.toFixed(1)}%` : '0%'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Industry avg: 21.3%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((metrics?.averageOpenRate || 0) / 21.3 * 100, 100)} 
                color={(metrics?.averageOpenRate || 0) > 21.3 ? 'success' : 'warning'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <TrendingUp color="primary" sx={{ mr: 1 }} />
                  <Typography color="text.secondary" variant="subtitle1">
                    Avg. Click Rate
                  </Typography>
                </Box>
                {(metrics?.averageClickRate || 0) > 2.6 ? 
                  <ArrowUpward color="success" fontSize="small" /> : 
                  <ArrowDownward color="error" fontSize="small" />
                }
              </Box>
              <Typography variant="h3" component="div" sx={{ mb: 1 }}>
                {metrics?.averageClickRate ? `${metrics.averageClickRate.toFixed(1)}%` : '0%'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Industry avg: 2.6%
              </Typography>
              <LinearProgress 
                variant="determinate" 
                value={Math.min((metrics?.averageClickRate || 0) / 2.6 * 100, 100)} 
                color={(metrics?.averageClickRate || 0) > 2.6 ? 'success' : 'warning'}
                sx={{ height: 6, borderRadius: 3 }}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Grid */}
      <Grid container spacing={3}>
        {/* Campaigns Table */}
        <Grid item xs={12} lg={8}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" component="h2">
                  Recent Campaigns
                </Typography>
                <Button
                  variant="outlined"
                  startIcon={<Analytics />}
                  onClick={() => navigate('/analytics')}
                >
                  View Analytics
                </Button>
              </Box>
              
              <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign Name</TableCell>
                  <TableCell>Subject</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Recipients</TableCell>
                  <TableCell align="right">Open Rate</TableCell>
                  <TableCell align="right">Click Rate</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No campaigns yet. Create your first campaign to get started!
                      </Typography>
                      <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={handleCreateCampaign}
                        sx={{ mt: 2 }}
                      >
                        Create Campaign
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  campaigns.map((campaign) => (
                    <TableRow key={campaign.id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {campaign.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {campaign.subject}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={campaign.status.charAt(0).toUpperCase() + campaign.status.slice(1)}
                          color={getStatusColor(campaign.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">
                        {campaign.recipientCount.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {campaign.status === 'sent' ? `${campaign.openRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell align="right">
                        {campaign.status === 'sent' ? `${campaign.clickRate.toFixed(1)}%` : '-'}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {campaign.sentAt
                            ? formatDate(campaign.sentAt)
                            : campaign.scheduledAt
                            ? formatDate(campaign.scheduledAt)
                            : formatDate(campaign.createdAt)
                          }
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="More actions">
                          <IconButton
                            onClick={(e) => handleMenuOpen(e, campaign)}
                            size="small"
                          >
                            <MoreVert />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity Sidebar */}
        <Grid item xs={12} lg={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="h2" sx={{ mb: 2 }}>
                Recent Activity
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {recentActivity.length === 0 ? (
                <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No recent activity
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {recentActivity.map((activity) => (
                    <ListItem key={activity.id} sx={{ px: 0, py: 1 }}>
                      <ListItemAvatar>
                        <Avatar 
                          sx={{ 
                            bgcolor: getActivityColor(activity.type), 
                            width: 32, 
                            height: 32 
                          }}
                        >
                          {getActivityIcon(activity.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {activity.title}
                          </Typography>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {activity.description}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                              {formatTimeAgo(activity.timestamp)}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={handleViewCampaign}>
          <Visibility sx={{ mr: 1 }} fontSize="small" />
          View Details
        </MenuItem>
        
        {selectedCampaign?.status === 'draft' && (
          <MenuItem onClick={handleEditCampaign}>
            <Edit sx={{ mr: 1 }} fontSize="small" />
            Edit
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDuplicateCampaign}>
          <FileCopy sx={{ mr: 1 }} fontSize="small" />
          Duplicate
        </MenuItem>

        {selectedCampaign?.status === 'draft' && (
          <MenuItem onClick={handleSendCampaign}>
            <Send sx={{ mr: 1 }} fontSize="small" />
            Send Now
          </MenuItem>
        )}
        
        <MenuItem onClick={handleDeleteCampaign} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" />
          Delete
        </MenuItem>
      </Menu>
    </Container>
    </>
  );
}