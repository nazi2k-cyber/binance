import { createBinanceAPI } from '../../lib/binance-api.js';
import { isDemoMode, getDemoKlines } from '../../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query;
  const interval = req.query.interval || '1h';
  const limit = parseInt(req.query.limit || '100');

  try {
    if (isDemoMode()) {
      return res.json(getDemoKlines(symbol, interval, limit));
    }
    const binance = createBinanceAPI();
    const data = await binance.getKlines(symbol, interval, limit);
    const klines = data.map(k => ({
      openTime: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      closeTime: k[6],
    }));
    res.json(klines);
  } catch (err) {
    res.json(getDemoKlines(symbol, interval, limit));
  }
}
