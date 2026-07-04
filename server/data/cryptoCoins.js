/** Top coins by market cap (CoinGecko ids) — used as fallback if API list fails */
export const DEFAULT_CRYPTO_COIN_ID = 'bitcoin';

export const CRYPTO_RANGE_OPTIONS = [
  { id: '1d', label: '1D', days: 1 },
  { id: '1m', label: '1M', days: 30 },
  { id: '6m', label: '6M', days: 180 },
  { id: '1y', label: '1Y', days: 365 },
];
