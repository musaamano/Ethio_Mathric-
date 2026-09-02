/**
 * emailService.js
 * Sends transactional emails via nodemailer (SMTP).
 * Configured via .env: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM
 *
 * When MAIL_USER is not configured, emails are logged to the console instead
 * so development works without an SMTP server.
 */
const nodemailer = require('nodemailer');
const logger     = require('./logger');

// ── Transporter (lazy-initialised) ──────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  if (!process.env.MAIL_USER || process.env.MAIL_USER === 'your_email@gmail.com') {
    // Dev mode — log emails to console, don't actually send
    logger.warn('[EmailService] MAIL_USER not configured — emails will be logged only');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.MAIL_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.MAIL_PORT) || 587,
    secure: parseInt(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return _transporter;
}

// ── Core send helper ─────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  const from = process.env.MAIL_FROM || '"Ethio Matric Academy" <noreply@ethiomatric.com>';
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — log instead of sending
    logger.info(`[EmailService] DEV EMAIL to: ${to} | subject: ${subject}`);
    const linkMatch = html.match(/href="(http[^"]+)"/);
    if (linkMatch) {
      logger.info(`[EmailService] 🔗 DEV LINK: ${linkMatch[1]}`);
    }
    return;
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, html });
    logger.info(`[EmailService] Sent to ${to}: ${info.messageId}`);
  } catch (err) {
    logger.error(`[EmailService] Failed to send to ${to}: ${err.message}`);
    throw err; // re-throw so callers can decide to fail gracefully
  }
}

// ── Email templates ──────────────────────────────────────────

/**
 * Send an email verification link to a newly registered user.
 * @param {string} to          - Recipient email
 * @param {string} firstName   - User's first name for personalisation
 * @param {string} token       - Verification UUID token
 */
async function sendVerificationEmail(to, firstName, token) {
  const clientUrl  = process.env.CLIENT_URL || 'http://localhost:5173';
  const verifyLink = `${clientUrl}/verify-email/${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #1a472a, #2d6a4f); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Ethio Matric Academy</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Verify your email address</p>
      </div>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>Thank you for registering! Please verify your email address to activate your account.</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${verifyLink}"
           style="background: #2d6a4f; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
          ✉️ Verify My Email
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        This link expires in <strong>24 hours</strong>. If you did not create an account,
        you can safely ignore this email.
      </p>
      <p style="color: #999; font-size: 12px;">
        If the button doesn't work, copy this link into your browser:<br/>
        <a href="${verifyLink}" style="color: #2d6a4f;">${verifyLink}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} Ethio Matric Academy. All rights reserved.
      </p>
    </body>
    </html>
  `;

  await sendMail({
    to,
    subject: '✅ Verify your Ethio Matric Academy email',
    html,
  });
}

/**
 * Send a password reset link.
 * @param {string} to          - Recipient email
 * @param {string} firstName   - User's first name
 * @param {string} token       - Password reset UUID token
 */
async function sendPasswordResetEmail(to, firstName, token) {
  const clientUrl  = process.env.CLIENT_URL || 'http://localhost:5173';
  const resetLink  = `${clientUrl}/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background: linear-gradient(135deg, #1a472a, #2d6a4f); padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 24px;">
        <h1 style="color: white; margin: 0; font-size: 24px;">📚 Ethio Matric Academy</h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0;">Password Reset Request</p>
      </div>

      <p>Hi <strong>${firstName}</strong>,</p>
      <p>We received a request to reset your password. Click the button below to set a new one.</p>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetLink}"
           style="background: #c0392b; color: white; padding: 14px 32px; border-radius: 8px;
                  text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
          🔑 Reset My Password
        </a>
      </div>

      <p style="color: #666; font-size: 14px;">
        This link expires in <strong>1 hour</strong>. If you did not request a password reset,
        please ignore this email — your account is safe.
      </p>
      <p style="color: #999; font-size: 12px;">
        If the button doesn't work, copy this link:<br/>
        <a href="${resetLink}" style="color: #c0392b;">${resetLink}</a>
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;"/>
      <p style="color: #999; font-size: 12px; text-align: center;">
        © ${new Date().getFullYear()} Ethio Matric Academy. All rights reserved.
      </p>
    </body>
    </html>
  `;

  await sendMail({
    to,
    subject: '🔑 Reset your Ethio Matric Academy password',
    html,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
