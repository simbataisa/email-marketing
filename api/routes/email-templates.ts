/**
 * Email Templates management API routes
 * Handle email template CRUD operations and management
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';
import { validateRequest } from '../lib/validation.ts';
import { z } from 'zod';

const router = Router();

// Validation schemas
const createTemplateSchema = z.object({
  name: z.string().min(1).max(255),
  subject: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().max(100).optional(),
  isDefault: z.boolean().optional().default(false)
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  subject: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  category: z.string().max(100).optional(),
  isDefault: z.boolean().optional()
});

// All email template routes require authentication
router.use(authenticateToken);

/**
 * Get all email templates for the authenticated user
 * GET /api/email-templates
 */
router.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { category, search } = req.query;
    
    const where: any = { userId };
    
    if (category && typeof category === 'string') {
      where.category = category;
    }
    
    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: [
        { isDefault: 'desc' },
        { createdAt: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        subject: true,
        category: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            campaigns: true
          }
        }
      }
    });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching email templates:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get specific email template
 * GET /api/email-templates/:id
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const template = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching email template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new email template
 * POST /api/email-templates
 */
router.post('/', validateRequest(createTemplateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = req.body;

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          userId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.emailTemplate.create({
      data: {
        ...validatedData,
        userId
      }
    });

    res.status(201).json(template);
  } catch (error) {
    console.error('Error creating email template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update email template
 * PUT /api/email-templates/:id
 */
router.put('/:id', validateRequest(updateTemplateSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = req.body;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // If setting as default, unset other defaults
    if (validatedData.isDefault) {
      await prisma.emailTemplate.updateMany({
        where: {
          userId,
          isDefault: true,
          id: { not: id }
        },
        data: {
          isDefault: false
        }
      });
    }

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: validatedData
    });

    res.json(template);
  } catch (error) {
    console.error('Error updating email template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete email template
 * DELETE /api/email-templates/:id
 */
router.delete('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if template exists and belongs to user
    const existingTemplate = await prisma.emailTemplate.findFirst({
      where: {
        id,
        userId
      },
      include: {
        _count: {
          select: {
            campaigns: true
          }
        }
      }
    });

    if (!existingTemplate) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // Check if template is being used by campaigns
    if (existingTemplate._count.campaigns > 0) {
      res.status(400).json({ 
        error: 'Cannot delete template that is being used by campaigns',
        campaignCount: existingTemplate._count.campaigns
      });
      return;
    }

    await prisma.emailTemplate.delete({
      where: { id }
    });

    res.json({ message: 'Email template deleted successfully' });
  } catch (error) {
    console.error('Error deleting email template:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all template categories
 * GET /api/email-templates/meta/categories
 */
router.get('/meta/categories', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const categories = await prisma.emailTemplate.findMany({
      where: {
        userId,
        category: { not: null }
      },
      select: {
        category: true
      },
      distinct: ['category']
    });

    const categoryList = categories
      .map(t => t.category)
      .filter(Boolean)
      .sort();

    res.json(categoryList);
  } catch (error) {
    console.error('Error fetching template categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;