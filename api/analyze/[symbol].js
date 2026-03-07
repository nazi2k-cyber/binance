import { createBinanceAPI } from '../../lib/binance-api.js';
import { isDemoMode, getDemoKlines } from '../../lib/demo-data.js';
import { smaCrossover, rsiStrategy, macdStrategy, bollingerStrategy, combinedStrategy } from '../../lib/strategies.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { symbol } = req.query;
  const strategy = req.query.strategy || 'combined';
  const interval = req.query.interval || '1h';

  try {
    let closePrices;

    if (isDemoMode()) {
      const klines = getDemoKlines(symbol, interval, 100);
      closePrices = klines.map(k => k.close);
    } else {
      const binance = createBinanceAPI();
      const klines = await binance.getKlines(symbol, interval, 100);
      closePrices = klines.map(k => parseFloat(k[4]));
    }

    let result;
    switch (strategy) {
      case 'sma': result = smaCrossover(closePrices); break;
      case 'rsi': result = rsiStrategy(closePrices); break;
      case 'macd': result = macdStrategy(closePrices); break;
      case 'bollinger': result = bollingerStrategy(closePrices); break;
      default: result = combinedStrategy(closePrices);
    }

    res.json({
      symbol,
      interval,
      strategy,
      currentPrice: closePrices[closePrices.length - 1],
      ...result,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
