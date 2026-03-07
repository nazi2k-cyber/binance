import { createBinanceAPI } from '../../lib/binance-api.js';
import { isDemoMode } from '../../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query;

  try {
    if (isDemoMode()) {
      return res.json([]);
    }
    const binance = createBinanceAPI();
    const data = await binance.getOpenOrders(symbol);
    res.json(data);
  } catch (err) {
    res.json([]);
  }
}
