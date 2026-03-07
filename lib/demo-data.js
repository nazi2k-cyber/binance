/**
 * Demo/mock data for when Binance API is unavailable.
 * Provides realistic-looking data so the app works without API keys.
 */

const DEMO_SYMBOLS = [
  { symbol: 'BTCUSDT', baseAsset: 'BTC', price: 67234.50, change: 2.34, volume: 28456.12 },
  { symbol: 'ETHUSDT', baseAsset: 'ETH', price: 3456.78, change: -1.23, volume: 195432.45 },
  { symbol: 'BNBUSDT', baseAsset: 'BNB', price: 598.32, change: 0.87, volume: 45678.90 },
  { symbol: 'SOLUSDT', baseAsset: 'SOL', price: 142.56, change: 5.67, volume: 89012.34 },
  { symbol: 'XRPUSDT', baseAsset: 'XRP', price: 0.6234, change: -0.45, volume: 567890.12 },
  { symbol: 'ADAUSDT', baseAsset: 'ADA', price: 0.4567, change: 1.89, volume: 234567.89 },
  { symbol: 'DOGEUSDT', baseAsset: 'DOGE', price: 0.1234, change: 3.45, volume: 789012.34 },
  { symbol: 'DOTUSDT', baseAsset: 'DOT', price: 7.89, change: -2.34, volume: 56789.01 },
  { symbol: 'AVAXUSDT', baseAsset: 'AVAX', price: 34.56, change: 4.56, volume: 45678.90 },
  { symbol: 'MATICUSDT', baseAsset: 'MATIC', price: 0.7890, change: -0.67, volume: 123456.78 },
  { symbol: 'LINKUSDT', baseAsset: 'LINK', price: 14.56, change: 1.23, volume: 67890.12 },
  { symbol: 'UNIUSDT', baseAsset: 'UNI', price: 9.87, change: -1.56, volume: 34567.89 },
  { symbol: 'ATOMUSDT', baseAsset: 'ATOM', price: 8.76, change: 2.01, volume: 23456.78 },
  { symbol: 'LTCUSDT', baseAsset: 'LTC', price: 72.34, change: 0.34, volume: 12345.67 },
  { symbol: 'NEARUSDT', baseAsset: 'NEAR', price: 5.43, change: -3.21, volume: 78901.23 },
  { symbol: 'AAVEUSDT', baseAsset: 'AAVE', price: 98.76, change: 1.78, volume: 8901.23 },
  { symbol: 'FILUSDT', baseAsset: 'FIL', price: 5.67, change: -0.89, volume: 45678.90 },
  { symbol: 'ARBUSDT', baseAsset: 'ARB', price: 1.12, change: 2.45, volume: 234567.89 },
  { symbol: 'OPUSDT', baseAsset: 'OP', price: 2.34, change: 3.78, volume: 123456.78 },
  { symbol: 'APTUSDT', baseAsset: 'APT', price: 8.90, change: -1.01, volume: 56789.01 },
];

function randomFluctuation(base, pct = 0.02) {
  return base * (1 + (Math.random() - 0.5) * pct);
}

export function getDemoPrices() {
  return DEMO_SYMBOLS.map(s => ({
    symbol: s.symbol,
    price: randomFluctuation(s.price, 0.005).toString(),
  }));
}

export function getDemoTicker24h(symbol) {
  if (symbol) {
    const s = DEMO_SYMBOLS.find(d => d.symbol === symbol) || DEMO_SYMBOLS[0];
    const price = randomFluctuation(s.price, 0.005);
    return {
      symbol: s.symbol,
      lastPrice: price.toString(),
      priceChange: (price * s.change / 100).toString(),
      priceChangePercent: s.change.toString(),
      highPrice: (price * 1.03).toString(),
      lowPrice: (price * 0.97).toString(),
      volume: s.volume.toString(),
      quoteVolume: (s.volume * price).toString(),
    };
  }
  return DEMO_SYMBOLS.map(s => {
    const price = randomFluctuation(s.price, 0.005);
    return {
      symbol: s.symbol,
      lastPrice: price.toString(),
      priceChange: (price * s.change / 100).toString(),
      priceChangePercent: s.change.toString(),
      highPrice: (price * 1.03).toString(),
      lowPrice: (price * 0.97).toString(),
      volume: s.volume.toString(),
      quoteVolume: (s.volume * price).toString(),
    };
  });
}

export function getDemoKlines(symbol, interval, limit = 100) {
  const s = DEMO_SYMBOLS.find(d => d.symbol === symbol) || DEMO_SYMBOLS[0];
  const basePrice = s.price;
  const now = Date.now();

  const intervalMs = {
    '1m': 60000, '3m': 180000, '5m': 300000, '15m': 900000,
    '30m': 1800000, '1h': 3600000, '4h': 14400000, '1d': 86400000,
  }[interval] || 3600000;

  const klines = [];
  let prevClose = basePrice * (1 - 0.05 * Math.random());

  for (let i = 0; i < limit; i++) {
    const openTime = now - (limit - i) * intervalMs;
    const open = prevClose;
    const changeRange = basePrice * 0.015;
    const close = open + (Math.random() - 0.48) * changeRange;
    const high = Math.max(open, close) + Math.random() * changeRange * 0.5;
    const low = Math.min(open, close) - Math.random() * changeRange * 0.5;
    const volume = s.volume / 24 * (0.5 + Math.random());

    klines.push({
      openTime,
      open: Math.max(open, 0.0001),
      high: Math.max(high, 0.0001),
      low: Math.max(low, 0.0001),
      close: Math.max(close, 0.0001),
      volume,
      closeTime: openTime + intervalMs - 1,
    });

    prevClose = close;
  }

  return klines;
}

export function getDemoOrderBook(symbol, limit = 20) {
  const s = DEMO_SYMBOLS.find(d => d.symbol === symbol) || DEMO_SYMBOLS[0];
  const midPrice = s.price;
  const bids = [];
  const asks = [];

  for (let i = 0; i < limit; i++) {
    const spread = midPrice * 0.0001 * (i + 1);
    bids.push([
      (midPrice - spread).toFixed(8),
      (Math.random() * 2).toFixed(8),
    ]);
    asks.push([
      (midPrice + spread).toFixed(8),
      (Math.random() * 2).toFixed(8),
    ]);
  }

  return { bids, asks, lastUpdateId: Date.now() };
}

export function getDemoAccount() {
  return {
    balances: [
      { asset: 'BTC', free: '0.05432100', locked: '0.00000000' },
      { asset: 'ETH', free: '1.23456789', locked: '0.00000000' },
      { asset: 'USDT', free: '5432.10000000', locked: '100.00000000' },
      { asset: 'BNB', free: '2.34567890', locked: '0.00000000' },
    ],
  };
}

export function isDemoMode() {
  return !process.env.BINANCE_API_KEY || process.env.BINANCE_API_KEY === '';
}
