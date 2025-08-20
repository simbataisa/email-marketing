/**
 * Campaign management API routes
 * Handle campaign CRUD operations, scheduling, and status management
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';
import { validateRequest, campaignSchema } from '../lib/validation.ts';

const router = Router();

// All campaign routes require authentication
router.use(authenticateToken);

/**
 * Get all campaigns for the authenticated user
 * GET /api/campaigns
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      userId: req.user!.userId
    };
    
    if (status && status !== 'all') {
      where.status = status;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { subject: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              campaignRecipients: true
            }
          }
        }
      }),
      prisma.campaign.count({ where })
    ]);
    
    res.json({
      campaigns: campaigns.map(campaign => ({
        ...campaign,
        recipientCount: campaign._count.campaignRecipients
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get campaigns error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific campaign by ID
 * GET /api/campaigns/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user!.userId
      },
      include: {
        campaignRecipients: {
          include: {
            recipient: true
          }
        },
        emailTracking: true,
        _count: {
          select: {
            campaignRecipients: true,
            emailTracking: true
          }
        }
      }
    });
    
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    res.json(campaign);
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new campaign
 * POST /api/campaigns
 */
router.post('/', validateRequest(campaignSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, subject, content, templateId, emailListIds, scheduledAt, settings } = req.body;
    
    const campaign = await prisma.campaign.create({
      data: {
        name,
        subject,
        content,
        templateId,
        userId: req.user!.userId,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });
    
    // If email lists are provided, add recipients
    if (emailListIds && emailListIds.length > 0) {
      // Get all recipients from the specified email lists
      const listRecipients = await prisma.listRecipient.findMany({
        where: {
          listId: { in: emailListIds },
          emailList: { userId: req.user!.userId }
        },
        include: {
          recipient: true
        }
      });
      
      // Create campaign recipients
      const campaignRecipients = listRecipients.map(lr => ({
        campaignId: campaign.id,
        recipientId: lr.recipientId,
        status: 'pending' as const
      }));
      
      if (campaignRecipients.length > 0) {
        await prisma.campaignRecipient.createMany({
          data: campaignRecipients,
          skipDuplicates: true
        });
      }
    }
    
    res.status(201).json({
      message: 'Campaign created successfully',
      campaign
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a campaign
 * PUT /api/campaigns/:id
 */
router.put('/:id', validateRequest(campaignSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, subject, content, templateId, emailListIds, scheduledAt, settings } = req.body;
    
    // Check if campaign exists and belongs to user
    const existingCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!existingCampaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    // Don't allow editing sent campaigns
    if (existingCampaign.status === 'sent') {
      res.status(400).json({ error: 'Cannot edit a campaign that has already been sent' });
      return;
    }
    
    const campaign = await prisma.campaign.update({
      where: { id },
      data: {
        name,
        subject,
        content,
        templateId,
        status: scheduledAt ? 'scheduled' : 'draft',
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null
      }
    });
    
    // Update recipients if email lists are provided
    if (emailListIds) {
      // Remove existing campaign recipients
      await prisma.campaignRecipient.deleteMany({
        where: { campaignId: id }
      });
      
      if (emailListIds.length > 0) {
        // Get all recipients from the specified email lists
        const listRecipients = await prisma.listRecipient.findMany({
          where: {
            listId: { in: emailListIds },
            emailList: { userId: req.user!.userId }
          }
        });
        
        // Create new campaign recipients
        const campaignRecipients = listRecipients.map(lr => ({
          campaignId: id,
          recipientId: lr.recipientId,
          status: 'pending' as const
        }));
        
        if (campaignRecipients.length > 0) {
          await prisma.campaignRecipient.createMany({
            data: campaignRecipients,
            skipDuplicates: true
          });
        }
      }
    }
    
    res.json({
      message: 'Campaign updated successfully',
      campaign
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a campaign
 * DELETE /api/campaigns/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    // Don't allow deleting sent campaigns
    if (campaign.status === 'sent') {
      res.status(400).json({ error: 'Cannot delete a campaign that has already been sent' });
      return;
    }
    
    // Delete campaign and related data (cascade will handle related records)
    await prisma.campaign.delete({
      where: { id }
    });
    
    res.json({ message: 'Campaign deleted successfully' });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Send a campaign immediately
 * POST /api/campaigns/:id/send
 */
router.post('/:id/send', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if campaign exists and belongs to user
    const campaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user!.userId
      },
      include: {
        campaignRecipients: true
      }
    });
    
    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    if (campaign.status === 'sent') {
      res.status(400).json({ error: 'Campaign has already been sent' });
      return;
    }
    
    if (campaign.campaignRecipients.length === 0) {
      res.status(400).json({ error: 'Campaign has no recipients' });
      return;
    }
    
    // Update campaign status to sending
    await prisma.campaign.update({
      where: { id },
      data: {
        status: 'sending',
        sentAt: new Date()
      }
    });
    
    // TODO: Implement actual email sending logic here
    // For now, we'll just mark it as sent
    setTimeout(async () => {
      await prisma.campaign.update({
        where: { id },
        data: { status: 'sent' }
      });
    }, 1000);
    
    res.json({ message: 'Campaign is being sent' });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Duplicate a campaign
 * POST /api/campaigns/:id/duplicate
 */
router.post('/:id/duplicate', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Get the original campaign
    const originalCampaign = await prisma.campaign.findFirst({
      where: {
        id,
        userId: req.user!.userId
      },
      include: {
        campaignRecipients: true
      }
    });
    
    if (!originalCampaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    
    // Create duplicate campaign
    const duplicatedCampaign = await prisma.campaign.create({
      data: {
        name: `${originalCampaign.name} (Copy)`,
        subject: originalCampaign.subject,
        content: originalCampaign.content,
        userId: req.user!.userId,
        status: 'draft'
      }
    });
    
    // Duplicate campaign recipients
    if (originalCampaign.campaignRecipients.length > 0) {
      const campaignRecipients = originalCampaign.campaignRecipients.map(cr => ({
        campaignId: duplicatedCampaign.id,
        recipientId: cr.recipientId,
        status: 'pending' as const
      }));
      
      await prisma.campaignRecipient.createMany({
        data: campaignRecipients
      });
    }
    
    res.status(201).json({
      message: 'Campaign duplicated successfully',
      campaign: duplicatedCampaign
    });
  } catch (error) {
    console.error('Duplicate campaign error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;