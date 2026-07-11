import 'dotenv/config';
import { isMailerConfigured, verifyMailerConnection, sendAdminLoginAlert } from '../lib/mailer.js';

if (!isMailerConfigured()) {
  console.error('SMTP_USER and SMTP_APP_PASSWORD must be set in server/.env');
  process.exit(1);
}

const ok = await verifyMailerConnection();
if (!ok) {
  console.error('\nFix: https://myaccount.google.com/apppasswords → create App Password → update SMTP_APP_PASSWORD (no spaces)');
  process.exit(1);
}

const sent = await sendAdminLoginAlert({
  email: 'test@dailylens.com',
  ip: '127.0.0.1',
  location: 'Test location',
  userAgent: 'test-smtp.js',
  lastRunSummary: 'SMTP test from DailyLens',
});

console.log(sent ? '\nTest email sent successfully.' : '\nTest email failed.');
process.exit(sent ? 0 : 1);
