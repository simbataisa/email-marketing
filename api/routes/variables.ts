/**
 * Variables management API routes
 * Handle global variables, template variables, and variable values
 */
import { Router, type Request, type Response } from 'express';
import { prisma } from '../lib/database.js';
import { authenticateToken, type AuthenticatedRequest } from '../lib/auth.js';
import { validateRequest } from '../lib/validation.ts';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createGlobalVariableSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  displayName: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  defaultValue: Joi.string().optional().allow(''),
  variableType: Joi.string().valid('text', 'email', 'url', 'number').default('text')
});

const updateGlobalVariableSchema = Joi.object({
  displayName: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional().allow(''),
  defaultValue: Joi.string().optional().allow(''),
  variableType: Joi.string().valid('text', 'email', 'url', 'number').optional(),
  isActive: Joi.boolean().optional()
});

const createTemplateVariableSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  displayName: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  defaultValue: Joi.string().optional().allow(''),
  variableType: Joi.string().valid('text', 'email', 'url', 'number').default('text'),
  isRequired: Joi.boolean().default(false)
});

const updateTemplateVariableSchema = Joi.object({
  displayName: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional().allow(''),
  defaultValue: Joi.string().optional().allow(''),
  variableType: Joi.string().valid('text', 'email', 'url', 'number').optional(),
  isRequired: Joi.boolean().optional()
});

const setVariableValueSchema = Joi.object({
  value: Joi.string().required()
});

// All variable routes require authentication
router.use(authenticateToken);

/**
 * Get all global variables for the authenticated user
 * GET /api/variables/global
 */
router.get('/global', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { active } = req.query;
    
    const where: any = { userId };
    if (active === 'true') {
      where.isActive = true;
    }

    const variables = await prisma.globalVariable.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            variableValues: true
          }
        }
      }
    });

    res.json(variables);
  } catch (error) {
    console.error('Error fetching global variables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create new global variable
 * POST /api/variables/global
 */
router.post('/global', validateRequest(createGlobalVariableSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const validatedData = req.body;

    // Check if variable name already exists for this user
    const existingVariable = await prisma.globalVariable.findUnique({
      where: {
        userId_name: {
          userId,
          name: validatedData.name
        }
      }
    });

    if (existingVariable) {
      res.status(400).json({ error: 'Variable name already exists' });
      return;
    }

    const variable = await prisma.globalVariable.create({
      data: {
        ...validatedData,
        userId
      }
    });

    res.status(201).json(variable);
  } catch (error) {
    console.error('Error creating global variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update global variable
 * PUT /api/variables/global/:id
 */
router.put('/global/:id', validateRequest(updateGlobalVariableSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validatedData = req.body;

    // Check if variable exists and belongs to user
    const existingVariable = await prisma.globalVariable.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingVariable) {
      res.status(404).json({ error: 'Global variable not found' });
      return;
    }

    const variable = await prisma.globalVariable.update({
      where: { id },
      data: validatedData
    });

    res.json(variable);
  } catch (error) {
    console.error('Error updating global variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete global variable
 * DELETE /api/variables/global/:id
 */
router.delete('/global/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Check if variable exists and belongs to user
    const existingVariable = await prisma.globalVariable.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingVariable) {
      res.status(404).json({ error: 'Global variable not found' });
      return;
    }

    await prisma.globalVariable.delete({
      where: { id }
    });

    res.json({ message: 'Global variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting global variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get template variables for a specific template
 * GET /api/variables/template/:templateId
 */
router.get('/template/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId } = req.params;

    // Verify template belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    const variables = await prisma.templateVariable.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(variables);
  } catch (error) {
    console.error('Error fetching template variables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Create template variable
 * POST /api/variables/template/:templateId
 */
router.post('/template/:templateId', validateRequest(createTemplateVariableSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId } = req.params;
    const validatedData = req.body;

    // Verify template belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // Check if variable name already exists for this template
    const existingVariable = await prisma.templateVariable.findUnique({
      where: {
        templateId_name: {
          templateId,
          name: validatedData.name
        }
      }
    });

    if (existingVariable) {
      res.status(400).json({ error: 'Variable name already exists for this template' });
      return;
    }

    const variable = await prisma.templateVariable.create({
      data: {
        ...validatedData,
        templateId
      }
    });

    res.status(201).json(variable);
  } catch (error) {
    console.error('Error creating template variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Update template variable
 * PUT /api/variables/template/:templateId/:id
 */
router.put('/template/:templateId/:id', validateRequest(updateTemplateVariableSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId, id } = req.params;
    const validatedData = req.body;

    // Verify template belongs to user and variable exists
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    const existingVariable = await prisma.templateVariable.findFirst({
      where: {
        id,
        templateId
      }
    });

    if (!existingVariable) {
      res.status(404).json({ error: 'Template variable not found' });
      return;
    }

    const variable = await prisma.templateVariable.update({
      where: { id },
      data: validatedData
    });

    res.json(variable);
  } catch (error) {
    console.error('Error updating template variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete template variable
 * DELETE /api/variables/template/:templateId/:id
 */
router.delete('/template/:templateId/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId, id } = req.params;

    // Verify template belongs to user and variable exists
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    const existingVariable = await prisma.templateVariable.findFirst({
      where: {
        id,
        templateId
      }
    });

    if (!existingVariable) {
      res.status(404).json({ error: 'Template variable not found' });
      return;
    }

    await prisma.templateVariable.delete({
      where: { id }
    });

    res.json({ message: 'Template variable deleted successfully' });
  } catch (error) {
    console.error('Error deleting template variable:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get all variable values for the authenticated user
 * GET /api/variables/values
 */
router.get('/values', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const values = await prisma.variableValue.findMany({
      where: {
        userId
      },
      include: {
        globalVariable: true,
        templateVariable: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(values);
  } catch (error) {
    console.error('Error fetching variable values:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Get variable values for a specific template
 * GET /api/variables/values/:templateId
 */
router.get('/values/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId } = req.params;

    // Verify template belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    const values = await prisma.variableValue.findMany({
      where: {
        userId,
        templateId
      },
      include: {
        globalVariable: true,
        templateVariable: true
      }
    });

    res.json(values);
  } catch (error) {
    console.error('Error fetching variable values:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Set variable value for a template
 * PUT /api/variables/values/:templateId/global/:globalVariableId
 * PUT /api/variables/values/:templateId/template/:templateVariableId
 */
router.put('/values/:templateId/global/:globalVariableId', validateRequest(setVariableValueSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId, globalVariableId } = req.params;
    const { value } = req.body;

    // Verify template and global variable belong to user
    const [template, globalVariable] = await Promise.all([
      prisma.emailTemplate.findFirst({
        where: { id: templateId, userId }
      }),
      prisma.globalVariable.findFirst({
        where: { id: globalVariableId, userId }
      })
    ]);

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    if (!globalVariable) {
      res.status(404).json({ error: 'Global variable not found' });
      return;
    }

    const variableValue = await prisma.variableValue.upsert({
      where: {
        userId_templateId_globalVariableId: {
          userId,
          templateId,
          globalVariableId
        }
      },
      update: { value },
      create: {
        userId,
        templateId,
        globalVariableId,
        value
      }
    });

    res.json(variableValue);
  } catch (error) {
    console.error('Error setting global variable value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/values/:templateId/template/:templateVariableId', validateRequest(setVariableValueSchema), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId, templateVariableId } = req.params;
    const { value } = req.body;

    // Verify template and template variable exist
    const [template, templateVariable] = await Promise.all([
      prisma.emailTemplate.findFirst({
        where: { id: templateId, userId }
      }),
      prisma.templateVariable.findFirst({
        where: { id: templateVariableId, templateId }
      })
    ]);

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    if (!templateVariable) {
      res.status(404).json({ error: 'Template variable not found' });
      return;
    }

    const variableValue = await prisma.variableValue.upsert({
      where: {
        userId_templateId_templateVariableId: {
          userId,
          templateId,
          templateVariableId
        }
      },
      update: { value },
      create: {
        userId,
        templateId,
        templateVariableId,
        value
      }
    });

    res.json(variableValue);
  } catch (error) {
    console.error('Error setting template variable value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Extract variables from template content and create template variables
 * POST /api/variables/extract/:templateId
 */
router.post('/extract/:templateId', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const { templateId } = req.params;

    // Verify template belongs to user
    const template = await prisma.emailTemplate.findFirst({
      where: {
        id: templateId,
        userId
      }
    });

    if (!template) {
      res.status(404).json({ error: 'Email template not found' });
      return;
    }

    // Extract variables from template content and subject
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const extractedVars = new Set<string>();
    
    // Extract from content
    let match;
    while ((match = variableRegex.exec(template.content)) !== null) {
      extractedVars.add(match[1].trim());
    }
    
    // Extract from subject
    variableRegex.lastIndex = 0;
    while ((match = variableRegex.exec(template.subject)) !== null) {
      extractedVars.add(match[1].trim());
    }

    // Get existing template variables
    const existingVariables = await prisma.templateVariable.findMany({
      where: { templateId },
      select: { name: true }
    });
    
    const existingNames = new Set(existingVariables.map(v => v.name));
    
    // Create new template variables for extracted variables that don't exist
    const newVariables = [];
    for (const varName of extractedVars) {
      if (!existingNames.has(varName)) {
        newVariables.push({
          templateId,
          name: varName,
          displayName: varName.charAt(0).toUpperCase() + varName.slice(1),
          variableType: 'text' as const,
          isRequired: false
        });
      }
    }

    if (newVariables.length > 0) {
      await prisma.templateVariable.createMany({
        data: newVariables
      });
    }

    // Return all template variables
    const allVariables = await prisma.templateVariable.findMany({
      where: { templateId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      extracted: Array.from(extractedVars),
      created: newVariables.length,
      variables: allVariables
    });
  } catch (error) {
    console.error('Error extracting template variables:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;