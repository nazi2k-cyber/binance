import { createBinanceAPI } from '../lib/binance-api.js';
import { isDemoMode, getDemoAccount } from '../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (isDemoMode()) {
      return res.json(getDemoAccount());
    }
    const binance = createBinanceAPI();
    const data = await binance.getAccount();
    const balances = data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    res.json({ ...data, balances });
  } catch (err) {
    res.json(getDemoAccount());
  }
}
