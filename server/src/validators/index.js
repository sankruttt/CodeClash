import { z } from 'zod';

// ============== AUTH VALIDATORS ==============

export const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dashes, or dots'),
  email: z.string()
    .email('Invalid email address')
    .toLowerCase(),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password too long'),
  avatar: z.string().max(10).optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const updateProfileSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name cannot be empty')
    .max(50, 'Name cannot exceed 50 characters')
    .optional(),
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_.-]+$/, 'Username can only contain letters, numbers, underscores, dashes, or dots')
    .optional(),
  primaryStack: z.enum(['C', 'C++', 'Java', 'JavaScript', 'Python']).optional()
}).refine(data => data.name !== undefined || data.username !== undefined || data.primaryStack !== undefined, {
  message: 'At least one of name, username, or primaryStack must be provided'
});

// ============== MATCH VALIDATORS ==============

export const createMatchSchema = z.object({
  type: z.enum(['ranked', 'casual', 'private', 'scrimmage']).default('ranked'),
  problemIds: z.array(z.string()).optional(),
  roomCode: z.string().optional(),
  player1: z.any().optional(),
  player2: z.any().optional(),
  questions: z.array(z.any()).optional(),
  questionCount: z.number().int().min(1).max(3).default(1),
  duration: z.number().int().refine((val) => [300, 600, 900].includes(val), {
    message: 'Duration must be 300 (5m), 600 (10m), or 900 (15m)'
  }).default(600),
  timeLimit: z.enum(['05:00', '10:00', '15:00']).default('10:00')
}).passthrough();

export const joinQueueSchema = z.object({
  questionCount: z.number().int().min(1).max(3).default(1),
  duration: z.number().int().refine((val) => [5, 10, 15, 300, 600, 900].includes(val), {
    message: 'Duration must be 5, 10, or 15 minutes'
  }).default(10)
}).passthrough();

export const updateRoomSettingsSchema = z.object({
  difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  timeLimit: z.enum(['05:00', '10:00', '15:00']).optional()
}).passthrough();

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
  language: z.enum(['javascript', 'python', 'typescript', 'java', 'c', 'cpp', 'c++']),
  playerId: z.string().optional()
}).passthrough();

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
    java: z.string().optional(),
    c: z.string().optional(),
    cpp: z.string().optional()
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
        const issueMsg = issues.map(e => e.message).filter(Boolean).join('. ') || 'Invalid request data';
        return res.status(400).json({
          success: false,
          error: 'VALIDATION_ERROR',
          message: issueMsg,
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

export default { validate, registerSchema, loginSchema, updateProfileSchema, createMatchSchema, joinMatchSchema, submitCodeSchema, createProblemSchema, joinQueueSchema, updateRoomSettingsSchema };
