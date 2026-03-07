import { createBinanceAPI } from '../../lib/binance-api.js';
import { isDemoMode, getDemoOrderBook } from '../../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query;
  const limit = parseInt(req.query.limit || '20');

  try {
    if (isDemoMode()) {
      return res.json(getDemoOrderBook(symbol, limit));
    }
    const binance = createBinanceAPI();
    const data = await binance.getOrderBook(symbol, limit);
    res.json(data);
  } catch (err) {
    res.json(getDemoOrderBook(symbol, limit));
  }
}
