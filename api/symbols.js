import { createBinanceAPI } from '../lib/binance-api.js';
import { isDemoMode, getDemoPrices } from '../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    if (isDemoMode()) {
      const prices = getDemoPrices();
      return res.json(prices.map(p => ({
        symbol: p.symbol,
        baseAsset: p.symbol.replace('USDT', ''),
        quoteAsset: 'USDT',
        filters: [],
      })));
    }
    const binance = createBinanceAPI();
    const info = await binance.getExchangeInfo();
    const symbols = info.symbols
      .filter(s => s.status === 'TRADING' && s.quoteAsset === 'USDT')
      .map(s => ({
        symbol: s.symbol,
        baseAsset: s.baseAsset,
        quoteAsset: s.quoteAsset,
        filters: s.filters,
      }))
      .slice(0, 50);
    res.json(symbols);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
