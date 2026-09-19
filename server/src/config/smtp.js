/**
 * SMTP transport configuration — read exclusively from environment variables.
 * Credentials are NEVER hardcoded or baked into the bundle.
 */
const REQUIRED_KEYS = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

export function isSmtpConfigured() {
  const envKeys = REQUIRED_KEYS.map((k) => process.env[k]);
  // SMTP_USER/SMTP_PASS are optional for local relays / dev mailboxes;
  // the host+port are the hard requirement.
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT);
}

/**
 * Returns a validated SMTP config object, or throws a clean error when the
 * mandatory vars are missing so the caller can surface a friendly 503.
 */
export function getSmtpConfig() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
    const error = new Error(
      'SMTP is not configured. Set SMTP_HOST and SMTP_PORT in your environment.'
    );
    error.code = 'SMTP_NOT_CONFIGURED';
    error.statusCode = 503;
    throw error;
  }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465,
    auth:
      process.env.SMTP_USER
        ? {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || '',
          }
        : undefined,
    from: process.env.SMTP_FROM || `CodeClash <no-reply@${process.env.SMTP_HOST}>`,
  };
}

export default { isSmtpConfigured, getSmtpConfig };
