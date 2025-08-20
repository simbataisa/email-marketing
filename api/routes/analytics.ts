/**
 * Analytics API routes
 * Handle email tracking, campaign analytics, and performance metrics
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';

const router = Router();

// All analytics routes require authentication
router.use(authenticateToken);

/**
 * Get dashboard overview metrics
 * GET /api/analytics/overview
 */
router.get('/overview', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    
    // Get date range (default to last 30 days)
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();
    
    // Get basic counts
    const [campaignCount, emailListCount, recipientCount, totalSent] = await Promise.all([
      prisma.campaign.count({
        where: { userId }
      }),
      prisma.emailList.count({
        where: { userId }
      }),
      prisma.recipient.count({
        where: {
          listRecipients: {
            some: {
              emailList: { userId }
            }
          }
        }
      }),
      prisma.campaignRecipient.count({
        where: {
          campaign: { userId },
          status: 'sent'
        }
      })
    ]);
    
    // Get email tracking metrics
    const trackingMetrics = await prisma.emailTracking.groupBy({
      by: ['eventType'],
      where: {
        campaign: { userId },
        createdAt: {
          gte: start,
          lte: end
        }
      },
      _count: {
        id: true
      }
    });
    
    // Calculate rates
    const opens = trackingMetrics.find(m => m.eventType === 'open')?._count.id || 0;
    const clicks = trackingMetrics.find(m => m.eventType === 'click')?._count.id || 0;
    const bounces = trackingMetrics.find(m => m.eventType === 'bounce')?._count.id || 0;
    const unsubscribes = trackingMetrics.find(m => m.eventType === 'unsubscribe')?._count.id || 0;
    
    const openRate = totalSent > 0 ? (opens / totalSent) * 100 : 0;
    const clickRate = totalSent > 0 ? (clicks / totalSent) * 100 : 0;
    const bounceRate = totalSent > 0 ? (bounces / totalSent) * 100 : 0;
    const unsubscribeRate = totalSent > 0 ? (unsubscribes / totalSent) * 100 : 0;
    
    // Get recent campaigns
    const recentCampaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        _count: {
          select: {
            campaignRecipients: true
          }
        }
      }
    });
    
    res.json({
      overview: {
        totalCampaigns: campaignCount,
        totalEmailLists: emailListCount,
        totalRecipients: recipientCount,
        totalEmailsSent: totalSent,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        unsubscribeRate: Math.round(unsubscribeRate * 100) / 100
      },
      recentCampaigns: recentCampaigns.map(campaign => ({
        ...campaign,
        recipientCount: campaign._count.campaignRecipients
      })),
      dateRange: {
        startDate: start,
        endDate: end
      }
    });
  } catch (error) {
    console.error('Get overview analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get campaign analytics
 * GET /api/analytics/campaigns/:id
 */
router.get('/campaigns/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Check if campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            campaignRecipients: true
          }
        }
      }
    });
    
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    // Get campaign recipient statistics
    const recipientStats = await prisma.campaignRecipient.groupBy({
      by: ['status'],
      where: {
        campaignId: id
      },
      _count: {
        id: true
      }
    });
    
    // Get email tracking events for this campaign
    const trackingEvents = await prisma.emailTracking.groupBy({
      by: ['eventType'],
      where: {
        campaignId: id
      },
      _count: {
        id: true
      }
    });
    
    // Get tracking events over time (daily)
    const trackingOverTime = await prisma.emailTracking.groupBy({
      by: ['eventType'],
      where: {
        campaignId: id
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });
    
    // Get top performing links (if any click tracking)
    const topLinks = await prisma.emailTracking.groupBy({
      by: ['eventData'],
      where: {
        campaignId: id,
        eventType: 'click'
      },
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      },
      take: 10
    });
    
    // Calculate metrics
    const totalRecipients = campaign._count.campaignRecipients;
    const sent = recipientStats.find(s => s.status === 'sent')?._count.id || 0;
    const pending = recipientStats.find(s => s.status === 'pending')?._count.id || 0;
    const failed = recipientStats.find(s => s.status === 'failed')?._count.id || 0;
    
    const opens = trackingEvents.find(e => e.eventType === 'open')?._count.id || 0;
    const clicks = trackingEvents.find(e => e.eventType === 'click')?._count.id || 0;
    const bounces = trackingEvents.find(e => e.eventType === 'bounce')?._count.id || 0;
    const unsubscribes = trackingEvents.find(e => e.eventType === 'unsubscribe')?._count.id || 0;
    
    const openRate = sent > 0 ? (opens / sent) * 100 : 0;
    const clickRate = sent > 0 ? (clicks / sent) * 100 : 0;
    const bounceRate = sent > 0 ? (bounces / sent) * 100 : 0;
    const unsubscribeRate = sent > 0 ? (unsubscribes / sent) * 100 : 0;
    const deliveryRate = totalRecipients > 0 ? (sent / totalRecipients) * 100 : 0;
    
    res.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        subject: campaign.subject,
        status: campaign.status,
        createdAt: campaign.createdAt,
        sentAt: campaign.sentAt
      },
      metrics: {
        totalRecipients,
        sent,
        pending,
        failed,
        opens,
        clicks,
        bounces,
        unsubscribes,
        openRate: Math.round(openRate * 100) / 100,
        clickRate: Math.round(clickRate * 100) / 100,
        bounceRate: Math.round(bounceRate * 100) / 100,
        unsubscribeRate: Math.round(unsubscribeRate * 100) / 100,
        deliveryRate: Math.round(deliveryRate * 100) / 100
      },
      trackingOverTime,
      topLinks: topLinks.map(link => ({
        url: link.eventData,
        clicks: link._count.id
      }))
    });
  } catch (error) {
    console.error('Get campaign analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get email list analytics
 * GET /api/analytics/email-lists/:id
 */
router.get('/email-lists/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            listRecipients: true
          }
        }
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    // Get recipient status breakdown
    const recipientStats = await prisma.recipient.groupBy({
      by: ['status'],
      where: {
        listRecipients: {
          some: {
            listId: id
          }
        }
      },
      _count: {
        id: true
      }
    });
    
    // Get growth over time (monthly)
    const growthData = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC('month', lr."addedAt") as month,
        COUNT(*) as count
      FROM "ListRecipient" lr
      WHERE lr."listId" = ${id}
      GROUP BY DATE_TRUNC('month', lr."addedAt")
      ORDER BY month DESC
      LIMIT 12
    ` as Array<{ month: Date; count: bigint }>;
    
    // Get campaigns that used this list
    const campaignsUsingList = await prisma.campaign.findMany({
      where: {
        userId,
        campaignRecipients: {
          some: {
            recipient: {
              listRecipients: {
                some: {
                  listId: id
                }
              }
            }
          }
        }
      },
      select: {
        id: true,
        name: true,
        subject: true,
        status: true,
        sentAt: true,
        _count: {
          select: {
            campaignRecipients: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    const totalRecipients = emailList._count.listRecipients;
    const activeRecipients = recipientStats.find(s => s.status === 'active')?._count.id || 0;
    const unsubscribedRecipients = recipientStats.find(s => s.status === 'unsubscribed')?._count.id || 0;
    const bouncedRecipients = recipientStats.find(s => s.status === 'bounced')?._count.id || 0;
    
    res.json({
      emailList: {
        id: emailList.id,
        name: emailList.name,
        description: emailList.description,
        createdAt: emailList.createdAt
      },
      metrics: {
        totalRecipients,
        activeRecipients,
        unsubscribedRecipients,
        bouncedRecipients,
        activeRate: totalRecipients > 0 ? Math.round((activeRecipients / totalRecipients) * 10000) / 100 : 0
      },
      growth: growthData.map(item => ({
        month: item.month,
        count: Number(item.count)
      })),
      recentCampaigns: campaignsUsingList
    });
  } catch (error) {
    console.error('Get email list analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Track email event (open, click, bounce, unsubscribe)
 * POST /api/analytics/track
 */
router.post('/track', async (req: Request, res: Response): Promise<void> => {
  try {
    const { campaignId, recipientId, eventType, metadata } = req.body;
    
    if (!campaignId || !recipientId || !eventType) {
      res.status(400).json({ error: 'campaignId, recipientId, and eventType are required' });
      return;
    }
    
    // Validate event type
    const validEventTypes = ['open', 'click', 'bounce', 'unsubscribe'];
    if (!validEventTypes.includes(eventType)) {
      res.status(400).json({ error: 'Invalid event type' });
      return;
    }
    
    // Check if campaign and recipient exist
    const [campaign, recipient] = await Promise.all([
      prisma.campaign.findUnique({ where: { id: campaignId } }),
      prisma.recipient.findUnique({ where: { id: recipientId } })
    ]);
    
    if (!campaign || !recipient) {
      res.status(404).json({ error: 'Campaign or recipient not found' });
      return;
    }
    
    // Create tracking event
    const trackingEvent = await prisma.emailTracking.create({
      data: {
        campaignId,
        recipientId,
        eventType,
        eventData: metadata || {}
      }
    });
    
    // Update recipient status based on event type
    if (eventType === 'bounce') {
      await prisma.recipient.update({
        where: { id: recipientId },
        data: { status: 'bounced' }
      });
    } else if (eventType === 'unsubscribe') {
      await prisma.recipient.update({
        where: { id: recipientId },
        data: {
          status: 'unsubscribed',
          unsubscribedAt: new Date()
        }
      });
    }
    
    res.json({
      message: 'Event tracked successfully',
      trackingEvent
    });
  } catch (error) {
    console.error('Track event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get performance comparison between campaigns
 * GET /api/analytics/compare
 */
router.get('/compare', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { campaignIds } = req.query;
    const userId = req.user!.userId;
    
    if (!campaignIds || !Array.isArray(campaignIds)) {
      res.status(400).json({ error: 'campaignIds array is required' });
      return;
    }
    
    // Get campaigns and their metrics
    const campaigns = await Promise.all(
      (campaignIds as string[]).map(async (campaignId) => {
        const campaign = await prisma.campaign.findFirst({
          where: {
            id: campaignId,
            userId
          },
          include: {
            _count: {
              select: {
                campaignRecipients: true
              }
            }
          }
        });
        
        if (!campaign) return null;
        
        // Get tracking metrics for this campaign
        const trackingMetrics = await prisma.emailTracking.groupBy({
          by: ['eventType'],
          where: {
            campaignId
          },
          _count: {
            id: true
          }
        });
        
        const sent = await prisma.campaignRecipient.count({
          where: {
            campaignId,
            status: 'sent'
          }
        });
        
        const opens = trackingMetrics.find(m => m.eventType === 'open')?._count.id || 0;
        const clicks = trackingMetrics.find(m => m.eventType === 'click')?._count.id || 0;
        const bounces = trackingMetrics.find(m => m.eventType === 'bounce')?._count.id || 0;
        
        return {
          id: campaign.id,
          name: campaign.name,
          subject: campaign.subject,
          status: campaign.status,
          sentAt: campaign.sentAt,
          totalRecipients: campaign._count.campaignRecipients,
          sent,
          opens,
          clicks,
          bounces,
          openRate: sent > 0 ? Math.round((opens / sent) * 10000) / 100 : 0,
          clickRate: sent > 0 ? Math.round((clicks / sent) * 10000) / 100 : 0,
          bounceRate: sent > 0 ? Math.round((bounces / sent) * 10000) / 100 : 0
        };
      })
    );
    
    const validCampaigns = campaigns.filter(Boolean);
    
    res.json({
      campaigns: validCampaigns,
      comparison: {
        averageOpenRate: validCampaigns.length > 0 
          ? Math.round((validCampaigns.reduce((sum, c) => sum + c!.openRate, 0) / validCampaigns.length) * 100) / 100
          : 0,
        averageClickRate: validCampaigns.length > 0
          ? Math.round((validCampaigns.reduce((sum, c) => sum + c!.clickRate, 0) / validCampaigns.length) * 100) / 100
          : 0,
        averageBounceRate: validCampaigns.length > 0
          ? Math.round((validCampaigns.reduce((sum, c) => sum + c!.bounceRate, 0) / validCampaigns.length) * 100) / 100
          : 0
      }
    });
  } catch (error) {
    console.error('Compare campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;