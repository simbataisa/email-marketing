import Joi from 'joi';

// User registration validation schema
export const registerSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .min(8)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)'))
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
      'any.required': 'Password is required'
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Name must be at least 2 characters long',
      'string.max': 'Name cannot exceed 100 characters',
      'any.required': 'Name is required'
    })
});

// User login validation schema
export const loginSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  password: Joi.string()
    .required()
    .messages({
      'any.required': 'Password is required'
    })
});

// Campaign validation schema
export const campaignSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'Campaign name is required',
      'string.max': 'Campaign name cannot exceed 255 characters',
      'any.required': 'Campaign name is required'
    }),
  subject: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'Email subject is required',
      'string.max': 'Email subject cannot exceed 255 characters',
      'any.required': 'Email subject is required'
    }),
  content: Joi.string()
    .min(1)
    .when('templateId', {
      is: Joi.exist(),
      then: Joi.optional(),
      otherwise: Joi.required()
    })
    .messages({
      'string.min': 'Email content is required',
      'any.required': 'Email content is required when no template is selected'
    }),
  templateId: Joi.string()
    .uuid()
    .optional()
    .messages({
      'string.uuid': 'Template ID must be a valid UUID'
    }),
  listIds: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one email list must be selected',
      'any.required': 'Email lists are required'
    }),
  scheduledAt: Joi.date()
    .iso()
    .min('now')
    .optional()
    .messages({
      'date.min': 'Scheduled time must be in the future'
    })
}).or('content', 'templateId');

// Email list validation schema
export const emailListSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .required()
    .messages({
      'string.min': 'List name is required',
      'string.max': 'List name cannot exceed 255 characters',
      'any.required': 'List name is required'
    }),
  description: Joi.string()
    .max(1000)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description cannot exceed 1000 characters'
    })
});

// Recipient validation schema
export const recipientSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
  firstName: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'First name cannot exceed 100 characters'
    }),
  lastName: Joi.string()
    .max(100)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  metadata: Joi.object()
    .optional()
});

// Validation middleware
export function validateRequest(schema: Joi.ObjectSchema) {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    req.body = value;
    next();
  };
}