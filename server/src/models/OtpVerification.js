import mongoose from 'mongoose';

/**
 * Single active email-verification record per email.
 *
 * The OTP value itself is NEVER stored in plaintext — only a salted hash
 * (`otpHash` = sha256(`salt` + otp)). `attempts`/`maxAttempts` bound
 * brute-force guessing; `resendCooldownUntil` enforces a per-email resend
 * cooldown; `expiresAt` bounds the OTP lifetime; `consumedAt` guarantees
 * single-use (an OTP can never be replayed once accepted).
 *
 * Records are indexed by `email` (unique) and auto-purged after `expiresAt`
 * via a TTL index (48h safety margin beyond the live OTP lifetime).
 */
const otpVerificationSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true
    },
    otpHash: {
      type: String,
      required: true
    },
    salt: {
      type: String,
      required: true
    },
    attempts: {
      type: Number,
      default: 0
    },
    maxAttempts: {
      type: Number,
      default: 5
    },
    resendCooldownUntil: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true
    },
    consumedAt: {
      type: Date,
      default: null
    },
    version: {
      type: Number,
      default: 1
    }
  },
  {
    timestamps: true
  }
);

// Single active OTP per email — a resend replaces it atomically
otpVerificationSchema.index({ email: 1 }, { unique: true });

// TTL: auto-purge expired/abandoned records
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema);

export default OtpVerification;
