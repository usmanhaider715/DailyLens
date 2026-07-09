import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_APP_PASSWORD?.trim();
  if (!user || !pass) return null;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });
  return transporter;
}

export function isMailerConfigured() {
  return !!(process.env.SMTP_USER?.trim() && process.env.SMTP_APP_PASSWORD?.trim());
}

export async function sendAdminLoginAlert({ email, ip, location, userAgent, lastRunSummary }) {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Login alert skipped — SMTP not configured');
    return false;
  }

  const to = process.env.ADMIN_ALERT_EMAIL?.trim() || process.env.SMTP_USER?.trim();
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'The Daily Lens';
  const from = `"${fromName}" <${process.env.SMTP_USER?.trim()}>`;

  const html = `
    <h2>Admin login — The Daily Lens</h2>
    <p><strong>Account:</strong> ${email}</p>
    <p><strong>Time (UTC):</strong> ${new Date().toISOString()}</p>
    <p><strong>IP address:</strong> ${ip || 'unknown'}</p>
    <p><strong>Location:</strong> ${location || 'unknown'}</p>
    <p><strong>Browser:</strong> ${userAgent || 'unknown'}</p>
    <hr />
    <p><strong>Last background run:</strong></p>
    <pre style="white-space:pre-wrap;font-family:monospace">${lastRunSummary || 'No recent runs recorded'}</pre>
    <p style="color:#666;font-size:12px">If this was not you, change the admin password immediately.</p>
  `;

  try {
    await transport.sendMail({
      from,
      to,
      subject: `[The Daily Lens] Admin login from ${ip || 'unknown IP'}`,
      html,
    });
    return true;
  } catch (err) {
    logger.error('Failed to send login alert email', err);
    return false;
  }
}
