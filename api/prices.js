import { createBinanceAPI } from '../lib/binance-api.js';
import { isDemoMode, getDemoPrices } from '../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (isDemoMode()) {
      return res.json(getDemoPrices());
    }
    const binance = createBinanceAPI();
    const data = await binance.getTickerPrice();
    res.json(data);
  } catch (err) {
    res.json(getDemoPrices());
  }
}
