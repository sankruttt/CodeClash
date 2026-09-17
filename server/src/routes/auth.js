import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate, registerSchema, loginSchema, updateProfileSchema } from '../validators/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.put('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.get('/streak', authMiddleware, authController.getStreak);

export default router;
