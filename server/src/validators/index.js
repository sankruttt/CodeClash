import { z } from 'zod';

// ============== AUTH VALIDATORS ==============

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password too long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  avatar: z.string().max(3).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

// ============== MATCH VALIDATORS ==============

export const createMatchSchema = z.object({
  type: z.enum(['ranked', 'casual', 'private']).default('ranked'),
  problemIds: z.array(z.string()).optional()
});

export const joinMatchSchema = z.object({
  roomCode: z.string()
    .min(1, 'Room code is required')
    .max(16, 'Room code is too long')
    .transform((value) => value.trim().toUpperCase())
});

export const matchIdSchema = z.object({
  id: z.string().min(1, 'Invalid match ID')
});

// ============== SUBMISSION VALIDATORS ==============

export const submitCodeSchema = z.object({
  matchId: z.string().min(1, 'Invalid match ID'),
  problemId: z.string().min(1, 'Invalid problem ID'),
  code: z.string()
    .min(1, 'Code cannot be empty')
    .max(50000, 'Code too long (max 50000 chars)'),
  language: z.enum(['javascript', 'python', 'typescript', 'java'])
});

// ============== PROBLEM VALIDATORS ==============

export const createProblemSchema = z.object({
  title: z.string().min(3).max(100),
  difficulty: z.enum(['Easy', 'Medium', 'Hard']),
  description: z.string().min(20),
  constraints: z.array(z.string()).default([]),
  examples: z.array(z.object({
    input: z.string(),
    output: z.string(),
    explanation: z.string().optional()
  })),
  starterCode: z.object({
    javascript: z.string().optional(),
    python: z.string().optional(),
    typescript: z.string().optional(),
    java: z.string().optional()
  }).optional(),
  tags: z.array(z.string()).default([]),
  timeLimit: z.number().int().min(1).max(3600).default(60),
  memoryLimit: z.number().int().min(1).max(1024).default(256),
  points: z.number().int().min(1).max(1000).default(100)
});

// ============== VALIDATION MIDDLEWARE ==============

export function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const data = source === 'body' ? req.body : 
                   source === 'params' ? req.params : 
                   source === 'query' ? req.query : req.body;
      
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const issues = result.error.issues || result.error.errors || [];
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: issues.map(e => ({
            field: (e.path || []).join('.'),
            message: e.message
          }))
        });
      }
      
      // Replace with validated/transformed data
      if (source === 'body') req.body = result.data;
      else if (source === 'params') req.params = result.data;
      else req.query = result.data;
      
      next();
    } catch (error) {
      next(error);
    }
  };
}

export default { validate, registerSchema, loginSchema, createMatchSchema, joinMatchSchema, submitCodeSchema, createProblemSchema };
