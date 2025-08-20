/**
 * Recipients management API routes
 * Handle recipient CRUD operations and management
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';
import { validateRequest, recipientSchema } from '../lib/validation.ts';

const router = Router();

// All recipient routes require authentication
router.use(authenticateToken);

/**
 * Get all recipients accessible to the authenticated user
 * GET /api/recipients
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search, listId } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    let where: any = {};
    
    if (listId) {
      // Get recipients from a specific list owned by the user
      where = {
        listRecipients: {
          some: {
            listId: listId as string,
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      };
    } else {
      // Get all recipients from lists owned by the user
      where = {
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      };
    }
    
    if (search) {
      where.OR = [
        { email: { contains: search as string, mode: 'insensitive' } },
        { name: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const [recipients, total] = await Promise.all([
      prisma.recipient.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          listRecipients: {
            include: {
              emailList: {
                select: {
                  id: true,
                  name: true
                }
              }
            },
            where: {
              emailList: {
                userId: req.user!.userId
              }
            }
          },
          _count: {
            select: {
              campaignRecipients: true
            }
          }
        }
      }),
      prisma.recipient.count({ where })
    ]);
    
    res.json({
      recipients: recipients.map(recipient => ({
        ...recipient,
        emailLists: recipient.listRecipients.map(lr => lr.emailList),
        campaignCount: recipient._count.campaignRecipients
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get recipients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific recipient by ID
 * GET /api/recipients/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      },
      include: {
        listRecipients: {
          include: {
            emailList: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          },
          where: {
            emailList: {
              userId: req.user!.userId
            }
          }
        },
        campaignRecipients: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                subject: true,
                status: true,
                sentAt: true
              }
            }
          },
          where: {
            campaign: {
              userId: req.user!.userId
            }
          }
        },
        emailTracking: {
          include: {
            campaign: {
              select: {
                id: true,
                name: true,
                subject: true
              }
            }
          },
          where: {
            campaign: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    res.json({
      ...recipient,
      emailLists: recipient.listRecipients.map(lr => lr.emailList),
      campaigns: recipient.campaignRecipients.map(cr => cr.campaign)
    });
  } catch (error) {
    console.error('Get recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new recipient
 * POST /api/recipients
 */
router.post('/', validateRequest(recipientSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { email, firstName, lastName, metadata, emailListIds } = req.body;
    
    // Check if recipient already exists
    const existingRecipient = await prisma.recipient.findUnique({
      where: { email: email.toLowerCase().trim() }
    });
    
    if (existingRecipient) {
      res.status(409).json({ error: 'Recipient with this email already exists' });
      return;
    }
    
    // Create recipient
    const recipient = await prisma.recipient.create({
      data: {
        email: email.toLowerCase().trim(),
        firstName: firstName || null,
        lastName: lastName || null,
        metadata: metadata || {}
      }
    });
    
    // Add to email lists if provided
    if (emailListIds && emailListIds.length > 0) {
      // Verify that all email lists belong to the user
      const userLists = await prisma.emailList.findMany({
        where: {
          id: { in: emailListIds },
          userId: req.user!.userId
        }
      });
      
      if (userLists.length !== emailListIds.length) {
        res.status(400).json({ error: 'One or more email lists not found or not accessible' });
        return;
      }
      
      // Create list recipient relationships
      const listRecipients = emailListIds.map((listId: string) => ({
          listId: listId,
        recipientId: recipient.id
      }));
      
      await prisma.listRecipient.createMany({
        data: listRecipients
      });
    }
    
    res.status(201).json({
      message: 'Recipient created successfully',
      recipient
    });
  } catch (error) {
    console.error('Create recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update a recipient
 * PUT /api/recipients/:id
 */
router.put('/:id', validateRequest(recipientSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, metadata } = req.body;
    
    // Check if recipient exists and is accessible to user
    const existingRecipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!existingRecipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    // Check if email is being changed and if new email already exists
    if (email && email.toLowerCase().trim() !== existingRecipient.email) {
      const emailExists = await prisma.recipient.findUnique({
        where: { email: email.toLowerCase().trim() }
      });
      
      if (emailExists) {
        res.status(409).json({ error: 'Recipient with this email already exists' });
        return;
      }
    }
    
    const recipient = await prisma.recipient.update({
      where: { id },
      data: {
        email: email ? email.toLowerCase().trim() : undefined,
        firstName: firstName !== undefined ? firstName : undefined,
        lastName: lastName !== undefined ? lastName : undefined,
        metadata: metadata !== undefined ? metadata : undefined
      }
    });
    
    res.json({
      message: 'Recipient updated successfully',
      recipient
    });
  } catch (error) {
    console.error('Update recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a recipient
 * DELETE /api/recipients/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if recipient exists and is accessible to user
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    // Delete recipient (cascade will handle related records)
    await prisma.recipient.delete({
      where: { id }
    });
    
    res.json({ message: 'Recipient deleted successfully' });
  } catch (error) {
    console.error('Delete recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get recipient's email tracking history
 * GET /api/recipients/:id/tracking
 */
router.get('/:id/tracking', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    // Check if recipient exists and is accessible to user
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    const [trackingEvents, total] = await Promise.all([
      prisma.emailTracking.findMany({
        where: {
          recipientId: id,
          campaign: {
            userId: req.user!.userId
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          campaign: {
            select: {
              id: true,
              name: true,
              subject: true
            }
          }
        }
      }),
      prisma.emailTracking.count({
        where: {
          recipientId: id,
          campaign: {
            userId: req.user!.userId
          }
        }
      })
    ]);
    
    res.json({
      trackingEvents,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get recipient tracking error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Unsubscribe a recipient from all lists
 * POST /api/recipients/:id/unsubscribe
 */
router.post('/:id/unsubscribe', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if recipient exists and is accessible to user
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    // Update recipient status to unsubscribed
    await prisma.recipient.update({
      where: { id },
      data: {
        status: 'unsubscribed',
        unsubscribedAt: new Date()
      }
    });
    
    res.json({ message: 'Recipient unsubscribed successfully' });
  } catch (error) {
    console.error('Unsubscribe recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Resubscribe a recipient
 * POST /api/recipients/:id/resubscribe
 */
router.post('/:id/resubscribe', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if recipient exists and is accessible to user
    const recipient = await prisma.recipient.findFirst({
      where: {
        id,
        listRecipients: {
          some: {
            emailList: {
              userId: req.user!.userId
            }
          }
        }
      }
    });
    
    if (!recipient) {
      res.status(404).json({ error: 'Recipient not found' });
      return;
    }
    
    // Update recipient status to active
    await prisma.recipient.update({
      where: { id },
      data: {
        status: 'active',
        unsubscribedAt: null
      }
    });
    
    res.json({ message: 'Recipient resubscribed successfully' });
  } catch (error) {
    console.error('Resubscribe recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;