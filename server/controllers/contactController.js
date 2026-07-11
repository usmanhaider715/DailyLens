import { sendContactFormEmail, isMailerConfigured } from '../lib/mailer.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cleanText(value, maxLen) {
  return String(value || '').trim().slice(0, maxLen);
}

export async function submitContact(req, res, next) {
  try {
    if (req.body?.website) {
      return res.json({ ok: true, message: 'Thank you — your message has been sent.' });
    }

    if (!isMailerConfigured()) {
      return res.status(503).json({ message: 'Contact form is temporarily unavailable.' });
    }

    const name = cleanText(req.body?.name, 100);
    const email = cleanText(req.body?.email, 254).toLowerCase();
    const subject = cleanText(req.body?.subject, 150);
    const message = cleanText(req.body?.message, 5000);

    if (!name) return res.status(400).json({ message: 'Please enter your name.' });
    if (!email || !EMAIL_RE.test(email)) {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }
    if (!subject) return res.status(400).json({ message: 'Please enter a subject.' });
    if (message.length < 10) {
      return res.status(400).json({ message: 'Message must be at least 10 characters.' });
    }

    const result = await sendContactFormEmail({ name, email, subject, message });
    if (!result.ok) {
      return res.status(502).json({ message: result.error || 'Could not send your message.' });
    }

    res.json({ ok: true, message: 'Thank you — your message has been sent.' });
  } catch (e) {
    next(e);
  }
}
