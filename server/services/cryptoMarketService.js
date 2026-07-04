import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService.js';
import { CRYPTO_RANGE_OPTIONS, DEFAULT_CRYPTO_COIN_ID } from '../data/cryptoCoins.js';
import { logger } from '../utils/logger.js';

const COINGECKO = 'https://api.coingecko.com/api/v3';

async function geckoGet(path, params = {}, ttl = 120) {
  const cacheKey = `crypto:${path}:${JSON.stringify(params)}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const { data } = await axios.get(`${COINGECKO}${path}`, {
    params,
    timeout: 20000,
    headers: { Accept: 'application/json', 'User-Agent': 'DailyLensBot/1.0' },
    validateStatus: (s) => s < 500,
  });

  if (!data || data.error) {
    throw new Error(data?.error || 'CoinGecko request failed');
  }

  await cacheSet(cacheKey, data, ttl);
  return data;
}

export function getCryptoRangeOptions() {
  return CRYPTO_RANGE_OPTIONS;
}

export async function listCryptoCoins() {
  try {
    const rows = await geckoGet(
      '/coins/markets',
      {
        vs_currency: 'usd',
        order: 'market_cap_desc',
        per_page: 80,
        page: 1,
        sparkline: false,
        price_change_percentage: '24h',
      },
      300
    );
    return (rows || []).map((c) => ({
      id: c.id,
      symbol: (c.symbol || '').toUpperCase(),
      name: c.name,
      image: c.image,
      price: c.current_price,
      change24h: c.price_change_percentage_24h,
      marketCap: c.market_cap,
    }));
  } catch (err) {
    logger.warn('crypto coin list:', err.message);
    return [
      { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
      { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
      { id: 'solana', symbol: 'SOL', name: 'Solana' },
      { id: 'ripple', symbol: 'XRP', name: 'XRP' },
      { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
      { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
    ];
  }
}

function formatChartLabel(ts, rangeId) {
  const d = new Date(ts);
  if (rangeId === '1d') {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (rangeId === '1m') {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
}

export async function getCryptoChart(coinId, rangeId = '1m') {
  const id = (coinId || DEFAULT_CRYPTO_COIN_ID).toLowerCase();
  const range = CRYPTO_RANGE_OPTIONS.find((r) => r.id === rangeId) || CRYPTO_RANGE_OPTIONS[1];
  const days = range.days;

  const data = await geckoGet(
    `/coins/${id}/market_chart`,
    { vs_currency: 'usd', days },
    rangeId === '1d' ? 60 : 300
  );

  const prices = (data.prices || []).map(([t, p]) => ({
    t,
    price: p,
    label: formatChartLabel(t, range.id),
  }));

  if (!prices.length) {
    return { coinId: id, range: range.id, prices: [], stats: null };
  }

  const first = prices[0].price;
  const last = prices[prices.length - 1].price;
  const min = Math.min(...prices.map((p) => p.price));
  const max = Math.max(...prices.map((p) => p.price));
  const change = first ? ((last - first) / first) * 100 : 0;

  const coinMeta = (await listCryptoCoins()).find((c) => c.id === id);

  return {
    coinId: id,
    range: range.id,
    rangeLabel: range.label,
    name: coinMeta?.name || id,
    symbol: coinMeta?.symbol || id.toUpperCase().slice(0, 4),
    image: coinMeta?.image || null,
    prices,
    stats: {
      price: last,
      changePercent: change,
      high: max,
      low: min,
      first,
    },
    updatedAt: new Date().toISOString(),
    source: 'CoinGecko',
  };
}
