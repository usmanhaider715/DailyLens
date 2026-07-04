import {
  getCryptoChart,
  getCryptoRangeOptions,
  listCryptoCoins,
} from '../services/cryptoMarketService.js';

export async function getCoins(req, res, next) {
  try {
    const coins = await listCryptoCoins();
    res.json({ coins, ranges: getCryptoRangeOptions() });
  } catch (e) {
    next(e);
  }
}

export async function getChart(req, res, next) {
  try {
    const coinId = (req.query.coin || req.query.id || 'bitcoin').trim();
    const range = (req.query.range || '1m').trim();
    const chart = await getCryptoChart(coinId, range);
    res.json(chart);
  } catch (e) {
    const msg = e?.response?.data?.error || e.message || 'Could not load chart';
    if (e?.response?.status === 429) {
      return res.status(429).json({ message: 'Rate limit — try again in a moment.' });
    }
    next(new Error(msg));
  }
}
