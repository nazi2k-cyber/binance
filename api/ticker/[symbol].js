import { createBinanceAPI } from '../../lib/binance-api.js';
import { isDemoMode, getDemoTicker24h } from '../../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query;

  // _all means fetch all tickers (no symbol filter)
  const isAll = symbol === '_all' || symbol === '' || !symbol;

  try {
    if (isDemoMode()) {
      const data = getDemoTicker24h(isAll ? undefined : symbol);
      return res.json(data);
    }
    const binance = createBinanceAPI();
    const data = await binance.getTicker24h(isAll ? undefined : symbol);
    res.json(data);
  } catch (err) {
    // Fallback to demo data on error
    const data = getDemoTicker24h(isAll ? undefined : symbol);
    res.json(data);
  }
}
