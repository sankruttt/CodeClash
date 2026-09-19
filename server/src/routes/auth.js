import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { validate, registerSchema, loginSchema, updateProfileSchema, sendOtpSchema, verifyOtpSchema } from '../validators/index.js';
import { authMiddleware } from '../middleware/auth.js';
import { validateOtpPurpose } from '../middleware/mailerGuard.js';

const router = Router();

router.post('/register', validate(registerSchema), validateOtpPurpose('email_verified'), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.get('/me', authMiddleware, authController.getProfile);
router.put('/profile', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.put('/me', authMiddleware, validate(updateProfileSchema), authController.updateProfile);
router.get('/streak', authMiddleware, authController.getStreak);

// OTP email-verification flow.
router.post('/send-otp', validate(sendOtpSchema), authController.sendOtpHandler);
router.post('/resend-otp', validate(sendOtpSchema), authController.resendOtpHandler);
router.post('/verify-otp', validate(verifyOtpSchema), authController.verifyOtpHandler);

export default router;
