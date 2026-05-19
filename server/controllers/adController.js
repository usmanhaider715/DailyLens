import { AdSlot } from '../models/AdSlot.js';

function isActiveSlot(doc) {
  if (!doc?.isActive) return false;
  const now = Date.now();
  if (doc.startDate && new Date(doc.startDate) > now) return false;
  if (doc.endDate && new Date(doc.endDate) < now) return false;
  return true;
}

export async function getAdByPosition(req, res, next) {
  try {
    const { position } = req.params;
    const category = req.query.category;
    const candidates = await AdSlot.find({ position }).sort({ updatedAt: -1 }).lean();
    const match =
      candidates.find((c) => isActiveSlot(c) && (!c.category || c.category === category)) ||
      candidates.find((c) => isActiveSlot(c));
    res.json(match || null);
  } catch (e) {
    next(e);
  }
}

export async function trackImpression(req, res, next) {
  try {
    setImmediate(() => {
      AdSlot.updateOne({ _id: req.params.id }, { $inc: { impressions: 1 } }).exec();
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}

export async function trackClick(req, res, next) {
  try {
    setImmediate(() => {
      AdSlot.updateOne({ _id: req.params.id }, { $inc: { clicks: 1 } }).exec();
    });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
}
