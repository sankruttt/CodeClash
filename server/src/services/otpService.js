import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import OtpVerification from '../models/OtpVerification.js';
import { sendEmail } from './mailerService.js';

// ---------------------------------------------------------------------------
// Tunables — backed by env, CLI-friendly defaults. No secrets baked here.
// ---------------------------------------------------------------------------
const OTP_LIFETIME_MINUTES = Number(process.env.OTP_LIFETIME_MINUTES || 5);
const RESEND_COOLDOWN_SECONDS = Number(process.env.OTP_COOLDOWN_SECONDS || 60);
const MAX_ATTEMPTS = Number(process.env.OTP_MAX_ATTEMPTS || 5);
const PEPPER = process.env.OTP_PEPPER || '';

// Verified-email token — short-lived, purpose-scoped, never the general login
// JWT. Minted only by verifyOtp (single authoritative gate) and consumed
// server-side at registration. TTL env controls the registration grace window.
const EMAIL_VERIFIED_TOKEN_EXPIRES_IN = process.env.EMAIL_VERIFIED_TOKEN_EXPIRES_IN || '15m';
const JWT_SECRET = process.env.JWT_SECRET || '';

// Email normalization — MUST stay identical on every branch of the flow so
// a code requested for `  Foo@Bar.com ` verifies for `foo@bar.com`.
export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isEmailValid(maybeEmail) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(maybeEmail || '');
}

// Cryptographically-secure 6-digit code (never Math.random). Zero-padded so
// codes like "000123" stay exactly 6 chars.
function generateOtp() {
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
}

function generateSalt() {
  return crypto.randomBytes(16).toString('hex');
}

// Salted + peppered SHA-256 — the raw OTP is never persisted. `salt` is
// stored alongside the hash; `PEPPER` stays server-side only.
function hashOtp(otp, salt) {
  return crypto
    .createHash('sha256')
    .update(`${PEPPER}${otp}:${salt}`)
    .digest('hex');
}

// Constant-time comparison to avoid leaking byte-length + timing signals.
function safeHashEquals(a, b) {
  const aBuf = Buffer.from(a || '');
  const bBuf = Buffer.from(b || '');
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function cooldownRemaining(record) {
  if (!record || !record.resendCooldownUntil) return 0;
  return Math.max(0, record.resendCooldownUntil.getTime() - Date.now());
}

// ---------------------------------------------------------------------------
// sendOtp / resendOtp
// ---------------------------------------------------------------------------
async function createOrReplaceOtp({ email }) {
  const otp = generateOtp();
  const salt = generateSalt();
  const otpHash = hashOtp(otp, salt);
  const now = Date.now();

  const record = await OtpVerification.findOneAndUpdate(
    { email },
    {
      $set: {
        otpHash,
        salt,
        attempts: 0,
        resendCooldownUntil: new Date(now + RESEND_COOLDOWN_SECONDS * 1000),
        expiresAt: new Date(now + OTP_LIFETIME_MINUTES * 60_000),
        consumedAt: null
      },
      $inc: { version: 1 }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { otp, record };
}

/**
 * Send (or resend) a verification code for an email.
 *
 * A fresh code atomically replaces any previous record — there is never more
 * than one active OTP per email, so two concurrent requests can't create two
 * conflicting codes for the same inbox. A back-to-back request within the
 * cooldown window is rejected by the route layer via the cooldown deadlines
 * returned here; `sendOtp` itself is idempotent-ish for our purposes.
 */
export async function sendOtp({ email, username }) {
  const normalized = normalizeEmail(email);
  if (!isEmailValid(normalized)) {
    const error = new Error('A valid email address is required');
    error.code = 'INVALID_EMAIL';
    error.statusCode = 400;
    throw error;
  }

  const existing = await OtpVerification.findOne({ email: normalized });
  const cooldown = cooldownRemaining(existing);

  if (cooldown > 0 && existing && !existing.consumedAt) {
    const error = new Error(
      'Please wait before requesting another code'
    );
    error.code = 'RESEND_COOLDOWN';
    error.statusCode = 429;
    error.retryAfter = Math.ceil(cooldown / 1000);
    throw error;
  }

  const { otp, record } = await createOrReplaceOtp({ email: normalized });

  try {
    await sendEmail({
      to: normalized,
      subject: 'Your CodeClash verification code',
      html: buildOtpEmailHtml({
        username,
        otp,
        lifetimeMinutes: OTP_LIFETIME_MINUTES
      }),
      text: buildOtpEmailText({
        username,
        otp,
        lifetimeMinutes: OTP_LIFETIME_MINUTES
      }),
      attachments: [
        {
          filename: 'code-clash logo.png',
          path: new URL('../assets/code-clash_logo.png', import.meta.url).pathname,
          cid: 'codeclash_logo'
        }
      ]
    });
  } catch (smtpError) {
    // Roll back so a failed send never starts a phantom cooldown window.
    await OtpVerification.deleteMany({ email: normalized }).catch(() => null);
    throw smtpError;
  }

  return {
    email: normalized,
    expiresIn: OTP_LIFETIME_MINUTES * 60,
    resendIn: RESEND_COOLDOWN_SECONDS,
    record
  };
}

export async function resendOtp({ email, username }) {
  return sendOtp({ email, username });
}

// ---------------------------------------------------------------------------
// verifyOtp — single-use, attempt-capped, expiry-guarded
// ---------------------------------------------------------------------------
export async function verifyOtp({ email, otp }) {
  const normalized = normalizeEmail(email);
  if (!isEmailValid(normalized)) {
    const error = new Error('A valid email address is required');
    error.code = 'INVALID_EMAIL';
    error.statusCode = 400;
    throw error;
  }
  const cleanOtp = String(otp || '').trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    const error = new Error('Verification code must be exactly 6 digits');
    error.code = 'INVALID_OTP';
    error.statusCode = 400;
    throw error;
  }

  const record = await OtpVerification.findOne({ email: normalized });

  if (!record) {
    const error = new Error(
      'No verification code found for this email. Request a new one.'
    );
    error.code = 'OTP_NOT_FOUND';
    error.statusCode = 404;
    throw error;
  }

  // Already used — never allow replay of a consumed code.
  if (record.consumedAt) {
    const error = new Error('This code has already been used');
    error.code = 'OTP_ALREADY_USED';
    error.statusCode = 409;
    throw error;
  }

  // Expired — terminal; purge for a clean slate.
  if (record.expiresAt.getTime() < Date.now()) {
    await OtpVerification.deleteOne({ _id: record._id }).catch(() => null);
    const error = new Error('This code has expired. Request a new one.');
    error.code = 'OTP_EXPIRED';
    error.statusCode = 410;
    throw error;
  }

  // Attempt cap reached — consume + purge, force a fresh request.
  if (record.attempts >= Number(record.maxAttempts || MAX_ATTEMPTS)) {
    await OtpVerification.findOneAndUpdate(
      { _id: record._id },
      { $set: { consumedAt: new Date() } }
    ).catch(() => null);
    const error = new Error(
      'Too many incorrect attempts. Request a new code.'
    );
    error.code = 'OTP_TOO_MANY_ATTEMPTS';
    error.statusCode = 429;
    throw error;
  }

  // Atomic single-consumption claim: only one concurrent verify wins; the
  // winner's attempt is counted immediately so a loser can't keep guessing.
  const claim = await OtpVerification.findOneAndUpdate(
    {
      _id: record._id,
      consumedAt: null,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: Number(record.maxAttempts || MAX_ATTEMPTS) }
    },
    { $inc: { attempts: 1 } },
    { new: true }
  );

  if (!claim) {
    const error = new Error('Could not verify this code. Please request a new one.');
    error.code = 'OTP_VERIFY_FAILED';
    error.statusCode = 409;
    throw error;
  }

  // Timing-safe hash compare with the stored value.
  if (!safeHashEquals(claim.otpHash, hashOtp(cleanOtp, claim.salt))) {
    const remaining = Math.max(
      0,
      Number(record.maxAttempts || MAX_ATTEMPTS) - (claim.attempts || 0)
    );
    const error = new Error(
      remaining > 0
        ? 'Incorrect code'
        : 'Too many incorrect attempts. Request a new code.'
    );
    error.code = remaining > 0 ? 'INVALID_OTP' : 'OTP_TOO_MANY_ATTEMPTS';
    error.statusCode = remaining > 0 ? 401 : 429;
    error.attemptsLeft = remaining;
    throw error;
  }

  // Correct OTP — consume it single-use right now, atomically.
  await OtpVerification.findOneAndUpdate(
    { _id: claim._id },
    { $set: { consumedAt: new Date() } }
  );

  return {
    email: normalized,
    verified: true,
    emailVerifiedToken: buildVerifiedToken(normalized)
  };
}

function buildVerifiedToken(email) {
  return jwt.sign(
    {
      purpose: 'email_verified',
      email: String(email || '').trim().toLowerCase()
    },
    JWT_SECRET,
    { expiresIn: EMAIL_VERIFIED_TOKEN_EXPIRES_IN }
  );
}


/**
 * Assert an email has been server-verified. The ONLY producer of the
 * emailVerifiedToken is a successful verifyOtp; it is purpose-scoped
 * ('email_verified'), short-lived, and single-email-bound. Register/login
 * call this so a frontend can never self-attest 'I verified this email'.
 */
export function assertEmailVerified({ email, emailVerifiedToken }) {
  if (!emailVerifiedToken) {
    const error = new Error('Email must be verified before completing this action');
    error.statusCode = 400;
    error.code = 'EMAIL_NOT_VERIFIED';
    throw error;
  }
  let payload;
  try {
    payload = jwt.verify(emailVerifiedToken, JWT_SECRET);
  } catch (err) {
    const error = new Error('Email verification is invalid or has expired');
    error.statusCode = 401;
    error.code = 'EMAIL_VERIFICATION_INVALID';
    throw error;
  }
  if (payload.purpose !== 'email_verified') {
    const error = new Error('Email verification token has an invalid purpose');
    error.statusCode = 400;
    error.code = 'EMAIL_VERIFICATION_INVALID';
    throw error;
  }
  const payloadEmail = String(payload.email || '').trim().toLowerCase();
  const targetEmail = normalizeEmail(email);
  if (payloadEmail !== targetEmail) {
    const error = new Error('Email verification does not match this account');
    error.statusCode = 400;
    error.code = 'EMAIL_VERIFICATION_MISMATCH';
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Email templates — plain, brand-light, no external assets required.
// ---------------------------------------------------------------------------
function safeName(value) {
  return String(value || 'Combatant').replace(/[<>]/g, '');
}

function buildOtpEmailHtml({ username, otp, lifetimeMinutes }) {
  const name = safeName(username);
  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#0f172a;">
      <div style="text-align:center;margin:0 0 6px;">
        <img src="cid:codeclash_logo" alt="CodeClash" style="display:block;margin:0 auto;width:96px;height:auto;" />
      </div>
      <div style="text-align:center;font-family:ui-monospace,monospace;font-weight:800;letter-spacing:.08em;color:#4f46e5;font-size:15px;margin-bottom:18px;">CODECLASH</div>
      <h1 style="font-size:20px;margin:0 0 8px;color:#0f172a;">Verify your email</h1>
      <p style="font-size:14px;line-height:1.6;color:#475569;margin:0 0 20px;">Hey ${name}, use this code to activate your CodeClash combatant account. It expires in ${lifetimeMinutes} minutes.</p>
      <div style="font-family:ui-monospace,monospace;font-size:32px;font-weight:700;letter-spacing:.35em;color:#0f172a;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:18px 20px;text-align:center;">${otp}</div>
      <p style="font-size:12px;line-height:1.6;color:#94a3b8;margin:18px 0 0;">If you didn't request this, you can safely ignore this email.</p>
    </div>
  `;
}

function buildOtpEmailText({ username, otp, lifetimeMinutes }) {
  const name = safeName(username);
  return [
    'CODECLASH \u2014 Verify your email',
    '',
    `Hey ${name},`,
    '',
    `Use this code to activate your CodeClash combatant account. It expires in ${lifetimeMinutes} minutes:`,
    '',
    `  ${otp}`,
    '',
    "If you didn't request this, you can safely ignore this email."
  ].join('\n');
}

export default {
  sendOtp,
  resendOtp,
  verifyOtp,
  normalizeEmail
};
