import nodemailer from 'nodemailer';
import { logger } from '../utils/logger.js';

let transporter = null;

function normalizeAppPassword(raw) {
  return String(raw || '').replace(/\s+/g, '').trim();
}

function getSmtpConfig() {
  const user = process.env.SMTP_USER?.trim();
  const pass = normalizeAppPassword(process.env.SMTP_APP_PASSWORD);
  if (!user || !pass) return null;

  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== 'false';

  return { user, pass, host, port, secure };
}

function getTransporter() {
  if (transporter) return transporter;
  const config = getSmtpConfig();
  if (!config) return null;

  transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
  });
  return transporter;
}

export function isMailerConfigured() {
  return !!getSmtpConfig();
}

export async function verifyMailerConnection() {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('SMTP not configured — login alert emails disabled (set SMTP_USER + SMTP_APP_PASSWORD in server/.env)');
    return false;
  }

  try {
    await transport.verify();
    logger.info(`SMTP ready (${process.env.SMTP_HOST || 'smtp.gmail.com'}) — login alerts will send to ${process.env.ADMIN_ALERT_EMAIL?.trim() || process.env.SMTP_USER?.trim()}`);
    return true;
  } catch (err) {
    logger.error(
      'SMTP verification failed — login alert emails will not send. Regenerate a Gmail App Password at https://myaccount.google.com/apppasswords and update SMTP_APP_PASSWORD in server/.env',
      err.message,
    );
    transporter = null;
    return false;
  }
}

export async function sendAdminLoginAlert({ email, ip, location, userAgent, lastRunSummary }) {
  const transport = getTransporter();
  if (!transport) {
    logger.warn('Login alert skipped — SMTP not configured');
    return false;
  }

  const config = getSmtpConfig();
  const to = process.env.ADMIN_ALERT_EMAIL?.trim() || config.user;
  const fromName = process.env.SMTP_FROM_NAME?.trim() || 'The Daily Lens';
  const from = `"${fromName}" <${config.user}>`;

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
    logger.info(`Login alert email sent to ${to}`);
    return true;
  } catch (err) {
    if (err.code === 'EAUTH') {
      logger.error(
        'Failed to send login alert — Gmail rejected SMTP credentials (535). Generate a new App Password and update SMTP_APP_PASSWORD in server/.env',
        err.message,
      );
      transporter = null;
    } else {
      logger.error('Failed to send login alert email', err.message);
    }
    return false;
  }
}
