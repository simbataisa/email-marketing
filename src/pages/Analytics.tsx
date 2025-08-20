import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { GridLegacy as Grid } from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Email as EmailIcon,
  Mouse as ClickIcon,
  Visibility as OpenIcon,
  Cancel as BounceIcon,
  Unsubscribe as UnsubscribeIcon,
  Compare as CompareIcon
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import axios from 'axios';

interface OverviewMetrics {
  totalCampaigns: number;
  totalRecipients: number;
  averageOpenRate: number;
  averageClickRate: number;
  totalSent: number;
  totalOpened: number;
  totalClicked: number;
  totalBounced: number;
  totalUnsubscribed: number;
}

interface CampaignAnalytics {
  id: string;
  name: string;
  subject: string;
  sentAt: string;
  recipientCount: number;
  openCount: number;
  clickCount: number;
  bounceCount: number;
  unsubscribeCount: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
  unsubscribeRate: number;
}

interface TimeSeriesData {
  date: string;
  opens: number;
  clicks: number;
  bounces: number;
}

const Analytics: React.FC = () => {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [campaigns, setCampaigns] = useState<CampaignAnalytics[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [comparisonData, setComparisonData] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [selectedPeriod]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Fetch overview metrics
      const overviewResponse = await axios.get('/api/analytics/overview');
      setOverview(overviewResponse.data);
      
      // Fetch campaign analytics
      const campaignsResponse = await axios.get('/api/campaigns');
      const campaignsWithAnalytics = await Promise.all(
        campaignsResponse.data.map(async (campaign: any) => {
          try {
            const analyticsResponse = await axios.get(`/api/analytics/campaigns/${campaign.id}`);
            return {
              ...campaign,
              ...analyticsResponse.data
            };
          } catch (err) {
            return {
              ...campaign,
              openCount: 0,
              clickCount: 0,
              bounceCount: 0,
              unsubscribeCount: 0,
              openRate: 0,
              clickRate: 0,
              bounceRate: 0,
              unsubscribeRate: 0
            };
          }
        })
      );
      setCampaigns(campaignsWithAnalytics);
      
      // Generate mock time series data (in a real app, this would come from the API)
      const mockTimeSeriesData = generateMockTimeSeriesData(selectedPeriod);
      setTimeSeriesData(mockTimeSeriesData);
      
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateMockTimeSeriesData = (period: string) => {
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const data = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      data.push({
        date: date.toISOString().split('T')[0],
        opens: Math.floor(Math.random() * 100) + 20,
        clicks: Math.floor(Math.random() * 50) + 5,
        bounces: Math.floor(Math.random() * 10) + 1
      });
    }
    
    return data;
  };

  const handleCompareCampaigns = async () => {
    if (selectedCampaigns.length < 2) return;
    
    try {
      const response = await axios.post('/api/analytics/compare', {
        campaignIds: selectedCampaigns
      });
      setComparisonData(response.data);
    } catch (err) {
      setError('Failed to compare campaigns');
      console.error('Error comparing campaigns:', err);
    }
  };

  const getStatusColor = (rate: number, type: 'open' | 'click' | 'bounce' | 'unsubscribe') => {
    if (type === 'bounce' || type === 'unsubscribe') {
      return rate > 5 ? 'error' : rate > 2 ? 'warning' : 'success';
    }
    return rate > 25 ? 'success' : rate > 15 ? 'warning' : 'error';
  };

  const pieChartData = overview ? [
    { name: 'Opened', value: overview.totalOpened, color: '#4caf50' },
    { name: 'Clicked', value: overview.totalClicked, color: '#2196f3' },
    { name: 'Bounced', value: overview.totalBounced, color: '#f44336' },
    { name: 'Unsubscribed', value: overview.totalUnsubscribed, color: '#ff9800' }
  ] : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Analytics & Reports
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Period</InputLabel>
            <Select
              value={selectedPeriod}
              label="Period"
              onChange={(e) => setSelectedPeriod(e.target.value)}
            >
              <MenuItem value="7d">Last 7 days</MenuItem>
              <MenuItem value="30d">Last 30 days</MenuItem>
              <MenuItem value="90d">Last 90 days</MenuItem>
            </Select>
          </FormControl>
          <Button
            variant="outlined"
            startIcon={<CompareIcon />}
            onClick={() => setCompareDialogOpen(true)}
          >
            Compare Campaigns
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Overview Metrics */}
      {overview && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <EmailIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{overview.totalSent.toLocaleString()}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sent
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <OpenIcon color="success" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{overview.averageOpenRate.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Open Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <ClickIcon color="info" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{overview.averageClickRate.toFixed(1)}%</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Click Rate
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <TrendingUpIcon color="primary" sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="h6">{overview.totalCampaigns}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Campaigns
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Over Time
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="opens" stroke="#4caf50" name="Opens" />
                  <Line type="monotone" dataKey="clicks" stroke="#2196f3" name="Clicks" />
                  <Line type="monotone" dataKey="bounces" stroke="#f44336" name="Bounces" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Engagement
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Campaign Performance Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Campaign Performance
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Campaign</TableCell>
                  <TableCell align="center">Recipients</TableCell>
                  <TableCell align="center">Open Rate</TableCell>
                  <TableCell align="center">Click Rate</TableCell>
                  <TableCell align="center">Bounce Rate</TableCell>
                  <TableCell align="center">Unsubscribe Rate</TableCell>
                  <TableCell>Sent Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <Box>
                        <Typography variant="subtitle2">{campaign.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {campaign.subject}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center">
                      {campaign.recipientCount?.toLocaleString() || 0}
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${campaign.openRate?.toFixed(1) || 0}%`}
                        size="small"
                        color={getStatusColor(campaign.openRate || 0, 'open')}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${campaign.clickRate?.toFixed(1) || 0}%`}
                        size="small"
                        color={getStatusColor(campaign.clickRate || 0, 'click')}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${campaign.bounceRate?.toFixed(1) || 0}%`}
                        size="small"
                        color={getStatusColor(campaign.bounceRate || 0, 'bounce')}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${campaign.unsubscribeRate?.toFixed(1) || 0}%`}
                        size="small"
                        color={getStatusColor(campaign.unsubscribeRate || 0, 'unsubscribe')}
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      {campaign.sentAt ? new Date(campaign.sentAt).toLocaleDateString() : 'Not sent'}
                    </TableCell>
                  </TableRow>
                ))}
                {campaigns.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No campaigns found.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Compare Campaigns Dialog */}
      <Dialog open={compareDialogOpen} onClose={() => setCompareDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Compare Campaigns</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select 2 or more campaigns to compare their performance metrics.
          </Typography>
          {/* Campaign selection would go here */}
          <Typography variant="body2">
            Campaign comparison feature coming soon...
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCompareDialogOpen(false)}>Close</Button>
          <Button onClick={handleCompareCampaigns} variant="contained" disabled>
            Compare
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Analytics;