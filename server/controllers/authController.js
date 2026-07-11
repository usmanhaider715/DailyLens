import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { sendAdminLoginAlert } from '../lib/mailer.js';
import { getClientIp, lookupIpLocation } from '../lib/ipGeo.js';
import { buildLastRunSummary } from '../lib/lastRunSummary.js';
import { logger } from '../utils/logger.js';

async function notifyAdminLogin({ user, ip, userAgent }) {
  try {
    const location = await lookupIpLocation(ip);
    let lastRunSummary = 'No recent runs recorded';
    try {
      lastRunSummary = await buildLastRunSummary();
    } catch (err) {
      logger.warn('Last run summary failed for login alert', err.message);
    }
    await sendAdminLoginAlert({
      email: user.email,
      ip,
      location,
      userAgent,
      lastRunSummary,
    });
  } catch (err) {
    logger.warn('Login alert failed', err.message);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '8h' }
    );

    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    if (['admin', 'editor'].includes(user.role)) {
      void notifyAdminLogin({ user, ip, userAgent });
    }

    res.json({ token, user: { email: user.email, role: user.role } });
  } catch (e) {
    next(e);
  }
}
