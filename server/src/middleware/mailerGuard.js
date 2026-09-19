import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}
const EFFECTIVE_OTP_PURPOSE = 'email_verified';

export function validateOtpPurpose(requiredPurpose = EFFECTIVE_OTP_PURPOSE) {
  return function mailerPurposeGuard(req, res, next) {
    const { emailVerifiedToken } = req.body || {};
    if (!emailVerifiedToken) {
      return res.status(401).json({
        error: {
          code: 'EMAIL_VERIFICATION_REQUIRED',
          message: 'This step requires a verified-email token from /auth/verify-otp.',
        },
      });
    }
    try {
      const payload = jwt.verify(emailVerifiedToken, JWT_SECRET, {
        algorithms: ['HS256'],
      });
      if (payload.purpose !== requiredPurpose || typeof payload.email !== 'string') {
        return res.status(401).json({
          error: {
            code: 'EMAIL_VERIFICATION_INVALID',
            message: 'The verified-email token does not match this step.',
          },
        });
      }
      req.otp = { email: payload.email, verified: true };
      next();
    } catch {
      return res.status(401).json({
        error: {
          code: 'EMAIL_VERIFICATION_INVALID',
          message: 'The verified-email token is missing, malformed, or has expired.',
        },
      });
    }
  };
}

export default validateOtpPurpose;
