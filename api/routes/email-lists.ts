/**
 * Email Lists management API routes
 * Handle email list CRUD operations, CSV import/export, and recipient management
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';
import { validateRequest, emailListSchema } from '../lib/validation.ts';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// All email list routes require authentication
router.use(authenticateToken);

/**
 * Get all email lists for the authenticated user
 * GET /api/email-lists
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {
      userId: req.user!.userId
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }
    
    const [emailLists, total] = await Promise.all([
      prisma.emailList.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              listRecipients: true
            }
          }
        }
      }),
      prisma.emailList.count({ where })
    ]);
    
    res.json({
      emailLists: emailLists.map(list => ({
        ...list,
        recipientCount: list._count.listRecipients
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get email lists error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get a specific email list by ID
 * GET /api/email-lists/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      },
      include: {
        listRecipients: {
          include: {
            recipient: true
          },
          orderBy: {
            addedAt: 'desc'
          }
        },
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
    
    res.json(emailList);
  } catch (error) {
    console.error('Get email list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create a new email list
 * POST /api/email-lists
 */
router.post('/', validateRequest(emailListSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description } = req.body;
    
    const emailList = await prisma.emailList.create({
      data: {
        name,
        description,
        userId: req.user!.userId
      }
    });
    
    res.status(201).json({
      message: 'Email list created successfully',
      emailList
    });
  } catch (error) {
    console.error('Create email list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update an email list
 * PUT /api/email-lists/:id
 */
router.put('/:id', validateRequest(emailListSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    // Check if email list exists and belongs to user
    const existingList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!existingList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    const emailList = await prisma.emailList.update({
      where: { id },
      data: {
        name,
        description
      }
    });
    
    res.json({
      message: 'Email list updated successfully',
      emailList
    });
  } catch (error) {
    console.error('Update email list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete an email list
 * DELETE /api/email-lists/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    // Delete email list (cascade will handle related records)
    await prisma.emailList.delete({
      where: { id }
    });
    
    res.json({ message: 'Email list deleted successfully' });
  } catch (error) {
    console.error('Delete email list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Add recipients to an email list
 * POST /api/email-lists/:id/recipients
 */
router.post('/:id/recipients', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { recipients } = req.body; // Array of { email, name, metadata }
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      res.status(400).json({ error: 'Recipients array is required' });
      return;
    }
    
    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    for (const recipientData of recipients) {
      try {
        const { email, name, metadata } = recipientData;
        
        if (!email || typeof email !== 'string') {
          results.errors.push(`Invalid email: ${email}`);
          continue;
        }
        
        // Create or find recipient
        const recipient = await prisma.recipient.upsert({
          where: { email },
          update: {
            firstName: name || null,
            metadata: metadata || {}
          },
          create: {
            email,
            firstName: name || null,
            metadata: metadata || {}
          }
        });
        
        // Add to list if not already there
        const existingListRecipient = await prisma.listRecipient.findUnique({
          where: {
            listId_recipientId: {
              listId: id,
              recipientId: recipient.id
            }
          }
        });
        
        if (!existingListRecipient) {
          await prisma.listRecipient.create({
            data: {
              listId: id,
              recipientId: recipient.id
            }
          });
          results.added++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(`Error processing ${recipientData.email}: ${error}`);
      }
    }
    
    res.json({
      message: 'Recipients processed',
      results
    });
  } catch (error) {
    console.error('Add recipients error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Remove a recipient from an email list
 * DELETE /api/email-lists/:id/recipients/:recipientId
 */
router.delete('/:id/recipients/:recipientId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id, recipientId } = req.params;
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    // Remove recipient from list
    const deleted = await prisma.listRecipient.deleteMany({
      where: {
        listId: id,
        recipientId
      }
    });
    
    if (deleted.count === 0) {
      res.status(404).json({ error: 'Recipient not found in this list' });
      return;
    }
    
    res.json({ message: 'Recipient removed from list' });
  } catch (error) {
    console.error('Remove recipient error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Import recipients from CSV
 * POST /api/email-lists/:id/import
 */
router.post('/:id/import', upload.single('file'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({ error: 'CSV file is required' });
      return;
    }
    
    const results = {
      added: 0,
      skipped: 0,
      errors: [] as string[]
    };
    
    const csvData: any[] = [];
    
    // Parse CSV
    await new Promise((resolve, reject) => {
      const stream = Readable.from(req.file!.buffer.toString());
      stream
        .pipe(csv())
        .on('data', (data) => csvData.push(data))
        .on('end', resolve)
        .on('error', reject);
    });
    
    // Process each row
    for (const row of csvData) {
      try {
        const email = row.email || row.Email || row.EMAIL;
        const name = row.name || row.Name || row.NAME || row.first_name || row.firstName;
        
        if (!email || typeof email !== 'string') {
          results.errors.push(`Invalid email in row: ${JSON.stringify(row)}`);
          continue;
        }
        
        // Create or find recipient
        const recipient = await prisma.recipient.upsert({
          where: { email: email.toLowerCase().trim() },
          update: {
            firstName: name || null,
            metadata: row
          },
          create: {
            email: email.toLowerCase().trim(),
            firstName: name || null,
            metadata: row
          }
        });
        
        // Add to list if not already there
        const existingListRecipient = await prisma.listRecipient.findUnique({
          where: {
            listId_recipientId: {
              listId: id,
              recipientId: recipient.id
            }
          }
        });
        
        if (!existingListRecipient) {
          await prisma.listRecipient.create({
            data: {
              listId: id,
              recipientId: recipient.id
            }
          });
          results.added++;
        } else {
          results.skipped++;
        }
      } catch (error) {
        results.errors.push(`Error processing row: ${error}`);
      }
    }
    
    res.json({
      message: 'CSV import completed',
      results
    });
  } catch (error) {
    console.error('CSV import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Export recipients to CSV
 * GET /api/email-lists/:id/export
 */
router.get('/:id/export', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    
    // Check if email list exists and belongs to user
    const emailList = await prisma.emailList.findFirst({
      where: {
        id,
        userId: req.user!.userId
      },
      include: {
        listRecipients: {
          include: {
            recipient: true
          }
        }
      }
    });
    
    if (!emailList) {
      res.status(404).json({ error: 'Email list not found' });
      return;
    }
    
    // Generate CSV content
    const csvHeader = 'email,name,created_at\n';
    const csvRows = emailList.listRecipients.map(lr => {
      const recipient = lr.recipient;
      const fullName = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ');
      return `"${recipient.email}","${fullName}","${recipient.createdAt.toISOString()}"`;
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${emailList.name.replace(/[^a-zA-Z0-9]/g, '_')}_recipients.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error('CSV export error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;