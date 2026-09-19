import nodemailer from 'nodemailer';

const REQUIRED_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_FROM'];

function isSmtpConfigured() {
  return REQUIRED_KEYS.every((key) => Boolean(process.env[key] && String(process.env[key]).trim()));
}

/**
 * Build a fresh nodemailer transporter from SMTP_* env vars on every call.
 * Explicitly NOT cached: credentials could rotate at runtime and we never
 * want to silently keep using a stale/expired credential set.
 */
function buildTransporter() {
  if (!isSmtpConfigured()) {
    const error = new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM.'
    );
    error.code = 'SMTP_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  const port = Number(process.env.SMTP_PORT);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
  });
}

/**
 * sendEmail({ to, subject, html, text })
 *
 * Throws structured errors so the route layer can return a clean response
 * without leaking SMTP credentials or internal stack traces:
 *   - SMTP_NOT_CONFIGURED (503) — missing env vars
 *   - SMTP_SEND_FAILED    (502) — transport/network/server-level failure
 */

export async function sendEmail({ to, subject, html, text, attachments }) {
  let transporter;
  try {
    transporter = buildTransporter();
  } catch (err) {
    const error = new Error(err.message || 'SMTP is not configured');
    error.code = err.code || 'SMTP_NOT_CONFIGURED';
    error.statusCode = err.code === 'SMTP_NOT_CONFIGURED' ? 503 : 502;
    throw error;
  }

  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(attachments && attachments.length ? { attachments } : {}),
    });

    return {
      messageId: info?.messageId,
      accepted: info?.accepted || [],
    };
  } catch (err) {
    const error = new Error('Failed to send email. Please try again later.');
    error.code = 'SMTP_SEND_FAILED';
    error.statusCode = 502;
    error.details = { transportError: err?.message || 'unknown' };
    throw error;
  }
}

export default { sendEmail };
