/**
 * emailService.js
 * Sends transactional emails via nodemailer (SMTP).
 * Configured via .env: MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS, MAIL_FROM
 *
 * When SMTP credentials are not configured, emails are logged to the console instead
 * so development works without an SMTP server.
 */
const nodemailer = require('nodemailer');
const logger = require('./logger');

// ── Transporter (lazy-initialised) ──────────────────────────
let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const missingCredentials = !process.env.MAIL_USER
    || !process.env.MAIL_PASS
    || process.env.MAIL_USER === 'your_email@gmail.com'
    || process.env.MAIL_USER === 'your-system-email@gmail.com'
    || process.env.MAIL_PASS === 'your_app_password'
    || process.env.MAIL_PASS === 'your-16-character-app-password';

  if (missingCredentials) {
    // Dev mode — log emails to console, don't actually send
    logger.warn('[EmailService] SMTP credentials not configured — emails will be logged only');
    return null;
  }

  _transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true' || parseInt(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS,
    },
  });

  return _transporter;
}

// ── Core send helper ─────────────────────────────────────────
async function sendMail({ to, subject, html, text }) {
  const from = process.env.MAIL_FROM
    || (process.env.MAIL_USER ? `"Ethio Matric Academy" <${process.env.MAIL_USER}>` : '"Ethio Matric Academy" <noreply@ethiomatric.com>');
  const transporter = getTransporter();

  if (!transporter) {
    // Dev fallback — log instead of sending
    logger.info(`[EmailService] DEV EMAIL to: ${to} | subject: ${subject}`);
    return;
  }

  try {
    const info = await transporter.sendMail({ from, to, subject, html, text });
    logger.info(`[EmailService] Sent to ${to}: ${info.messageId}`);
  } catch (err) {
    logger.error(`[EmailService] Failed to send to ${to}: ${err.message}`);
    throw err; // re-throw so callers can decide to fail gracefully
  }
}

// ── Shared style constants ────────────────────────────────────
const BRAND_GREEN = '#1B5E37';
const BRAND_MID = '#2D6A4F';
const BRAND_LIGHT = '#52B788';
const BG_OUTER = '#F0F4F1';
const BG_CARD = '#FFFFFF';
const TEXT_DARK = '#1A2E22';
const TEXT_BODY = '#374151';
const TEXT_MUTED = '#6B7280';
const TEXT_FOOTER = '#9CA3AF';
const BORDER_CARD = '#E5E7EB';
const YEAR = new Date().getFullYear();

function getClientUrl() {
  const fallbackOrigin = (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',')[0]
    .trim();
  const configuredOrigins = (process.env.CLIENT_URL || 'http://localhost:5174')
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
  const clientUrl = configuredOrigins.find(origin => !/localhost|127\.0\.0\.1/.test(origin)) || fallbackOrigin;
  return clientUrl.replace(/\/$/, '');
}

function emailWrapper(bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>Ethio Matric Academy</title>
</head>
<body style="margin:0;padding:0;background-color:${BG_OUTER};font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${BG_OUTER};min-height:100vh;">
    <tr>
      <td align="center" style="padding:40px 16px 40px 16px;">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:${BG_CARD};border-radius:12px;border:1px solid ${BORDER_CARD};box-shadow:0 4px 24px rgba(0,0,0,0.07);">

          <!-- Header bar -->
          <tr>
            <td style="background:linear-gradient(135deg,${BRAND_GREEN} 0%,${BRAND_MID} 100%);border-radius:12px 12px 0 0;padding:32px 40px;text-align:center;">
              <!-- Logo mark -->
              <div style="display:inline-block;width:44px;height:44px;background-color:rgba(255,255,255,0.15);border-radius:10px;line-height:44px;text-align:center;margin-bottom:14px;font-size:22px;">📚</div>
              <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;letter-spacing:0.3px;">Ethio Matric Academy</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.80);font-size:13px;letter-spacing:0.5px;text-transform:uppercase;">Ethiopia's #1 Matric Exam Preparation Platform</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px 40px;">
              ${bodyContent}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 40px 32px 40px;border-top:1px solid ${BORDER_CARD};padding-top:24px;">
              <p style="margin:0;color:${TEXT_FOOTER};font-size:12px;text-align:center;line-height:1.7;">
                You received this email because an account was created or an action was taken on<br/>
                <a href="https://ethiomatric.com" style="color:${BRAND_LIGHT};text-decoration:none;">Ethio Matric Academy</a>.
                &nbsp;|&nbsp;
                <a href="https://ethiomatric.com/privacy" style="color:${BRAND_LIGHT};text-decoration:none;">Privacy Policy</a>
              </p>
              <p style="margin:10px 0 0;color:${TEXT_FOOTER};font-size:11px;text-align:center;">
                &copy; ${YEAR} Ethio Matric Academy. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
        <!-- /Card -->

      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Email templates ──────────────────────────────────────────

/**
 * Send an email verification link to a newly registered user.
 * @param {string} to          - Recipient email
 * @param {string} firstName   - User's first name for personalisation
 * @param {string} token       - Verification UUID token
 */
async function sendVerificationEmail(to, firstName, token) {
  const clientUrl = getClientUrl();
  const verifyLink = `${clientUrl}/verify-email/${token}`;

  const bodyHtml = `
    <!-- Greeting -->
    <h2 style="margin:0 0 8px;color:${TEXT_DARK};font-size:22px;font-weight:700;letter-spacing:-0.3px;">Verify your email address</h2>
    <p style="margin:0 0 24px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="margin:0 0 28px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
      Welcome to Ethio Matric Academy! To activate your account and start practising with thousands of past-year exam questions, please verify your email address by clicking the button below.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:0 0 28px 0;">
          <a href="${verifyLink}"
             style="display:inline-block;background:linear-gradient(135deg,${BRAND_GREEN} 0%,${BRAND_MID} 100%);color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.2px;mso-padding-alt:14px 40px;">
            ✉️ &nbsp;Verify My Email
          </a>
        </td>
      </tr>
    </table>

    <!-- Expiry notice -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background-color:#F8FBF9;border-left:4px solid ${BRAND_LIGHT};border-radius:0 6px 6px 0;margin:0 0 28px 0;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;color:${TEXT_BODY};font-size:13px;line-height:1.6;">
            ⏱ &nbsp;This link expires in <strong>24 hours</strong>. After that you will need to request a new verification link.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback URL -->
    <p style="margin:0 0 8px;color:${TEXT_MUTED};font-size:13px;line-height:1.6;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 28px;word-break:break-all;">
      <a href="${verifyLink}" style="color:${BRAND_MID};font-size:13px;text-decoration:underline;">${verifyLink}</a>
    </p>

    <!-- Security note -->
    <p style="margin:0;color:${TEXT_MUTED};font-size:13px;line-height:1.6;border-top:1px solid ${BORDER_CARD};padding-top:20px;">
      🔒 &nbsp;If you did not create an Ethio Matric Academy account, you can safely ignore this email. No action is required.
    </p>
  `;

  const html = emailWrapper(bodyHtml);

  const text = [
    'Ethio Matric Academy — Verify Your Email',
    '==========================================',
    '',
    `Hi ${firstName},`,
    '',
    'Welcome to Ethio Matric Academy!',
    '',
    'Please verify your email address by visiting the link below:',
    '',
    verifyLink,
    '',
    'This link expires in 24 hours.',
    '',
    'If you did not create an account, please ignore this email.',
    '',
    '---',
    `© ${YEAR} Ethio Matric Academy`,
  ].join('\n');

  await sendMail({
    to,
    subject: 'Verify your Ethio Matric Academy email address',
    html,
    text,
  });
}

/**
 * Send a password reset link.
 * @param {string} to          - Recipient email
 * @param {string} firstName   - User's first name
 * @param {string} token       - Password reset UUID token
 */
async function sendPasswordResetEmail(to, firstName, token) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5174';
  const resetLink = `${clientUrl}/reset-password?token=${token}`;

  const bodyHtml = `
    <h2 style="margin:0 0 8px;color:${TEXT_DARK};font-size:22px;font-weight:700;letter-spacing:-0.3px;">Reset your password</h2>
    <p style="margin:0 0 24px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
      Hi <strong>${firstName}</strong>,
    </p>
    <p style="margin:0 0 28px;color:${TEXT_BODY};font-size:15px;line-height:1.6;">
      We received a request to reset the password for your Ethio Matric Academy account. Click the button below to choose a new password.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
      <tr>
        <td align="center" style="padding:0 0 28px 0;">
          <a href="${resetLink}"
             style="display:inline-block;background:linear-gradient(135deg,#7F1D1D 0%,#B91C1C 100%);color:#FFFFFF;text-decoration:none;font-size:16px;font-weight:600;padding:14px 40px;border-radius:8px;letter-spacing:0.2px;mso-padding-alt:14px 40px;">
            🔑 &nbsp;Reset My Password
          </a>
        </td>
      </tr>
    </table>

    <!-- Expiry notice -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"
           style="background-color:#FFF8F8;border-left:4px solid #EF4444;border-radius:0 6px 6px 0;margin:0 0 28px 0;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0;color:${TEXT_BODY};font-size:13px;line-height:1.6;">
            ⏱ &nbsp;This link expires in <strong>1 hour</strong>. After that you will need to request a new reset link.
          </p>
        </td>
      </tr>
    </table>

    <!-- Fallback URL -->
    <p style="margin:0 0 8px;color:${TEXT_MUTED};font-size:13px;line-height:1.6;">
      If the button above does not work, copy and paste this link into your browser:
    </p>
    <p style="margin:0 0 28px;word-break:break-all;">
      <a href="${resetLink}" style="color:#B91C1C;font-size:13px;text-decoration:underline;">${resetLink}</a>
    </p>

    <!-- Security note -->
    <p style="margin:0;color:${TEXT_MUTED};font-size:13px;line-height:1.6;border-top:1px solid ${BORDER_CARD};padding-top:20px;">
      🔒 &nbsp;If you did not request a password reset, please ignore this email — your account remains secure and your password has not changed.
    </p>
  `;

  const html = emailWrapper(bodyHtml);

  const text = [
    'Ethio Matric Academy — Password Reset',
    '=======================================',
    '',
    `Hi ${firstName},`,
    '',
    'We received a request to reset your Ethio Matric Academy password.',
    '',
    'Click the link below to reset it:',
    '',
    resetLink,
    '',
    'This link expires in 1 hour.',
    '',
    'If you did not request a password reset, please ignore this email.',
    '',
    '---',
    `© ${YEAR} Ethio Matric Academy`,
  ].join('\n');

  await sendMail({
    to,
    subject: 'Reset your Ethio Matric Academy password',
    html,
    text,
  });
}

module.exports = { sendVerificationEmail, sendPasswordResetEmail };
