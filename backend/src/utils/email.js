const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;
let attemptedInit = false;

// Built lazily (and only once) so a missing SMTP config doesn't crash the app at
// boot — email just silently no-ops with a log line, same spirit as the voice
// feature's "not configured" behavior.
const getTransporter = () => {
  if (attemptedInit) return transporter;
  attemptedInit = true;

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    logger.warn('Email: SMTP_HOST/SMTP_USER/SMTP_PASS not set — emails will be logged, not sent.');
    return null;
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return transporter;
};

// Never throws — a failed/unconfigured email should never break the calling
// request (e.g. an admin approving a user shouldn't fail because SMTP is down).
const sendMail = async ({ to, subject, html }) => {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@panchayat.local';
  const client = getTransporter();

  if (!client) {
    logger.info(`Email (not sent — SMTP not configured): to=${to} subject="${subject}"`);
    return { sent: false };
  }

  try {
    await client.sendMail({ from, to, subject, html });
    logger.info(`Email sent: to=${to} subject="${subject}"`);
    return { sent: true };
  } catch (err) {
    logger.error(`Email failed: to=${to} subject="${subject}" — ${err.message}`);
    return { sent: false, error: err.message };
  }
};

const sendApprovalEmail = (user) => sendMail({
  to: user.email,
  subject: 'Your Panchayat Community Hub account has been approved',
  html: `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #943D28;">Welcome, ${user.name}!</h2>
      <p>Your account on <strong>Panchayat Community Hub</strong> has been approved by the community admin.</p>
      <p>You can now sign in and start using the app.</p>
      <p style="margin-top: 24px; color: #89726D; font-size: 12px;">If you didn't request this account, please contact your community office.</p>
    </div>
  `,
});

module.exports = { sendMail, sendApprovalEmail };
