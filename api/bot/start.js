import { isDemoMode, getDemoKlines } from '../../lib/demo-data.js';
import { smaCrossover, rsiStrategy, macdStrategy, bollingerStrategy, combinedStrategy } from '../../lib/strategies.js';

// In-memory bot state (note: serverless functions don't persist state between calls)
// This provides a demo experience
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { symbol, strategy = 'combined', interval = '1m', tradeAmount, stopLoss, takeProfit } = req.body;

    // Generate initial analysis
    const klines = getDemoKlines(symbol, interval, 100);
    const closePrices = klines.map(k => k.close);

    let analysis;
    switch (strategy) {
      case 'sma': analysis = smaCrossover(closePrices); break;
      case 'rsi': analysis = rsiStrategy(closePrices); break;
      case 'macd': analysis = macdStrategy(closePrices); break;
      case 'bollinger': analysis = bollingerStrategy(closePrices); break;
      default: analysis = combinedStrategy(closePrices);
    }

    const bot = {
      symbol,
      strategy,
      interval,
      tradeAmount: parseFloat(tradeAmount) || 100,
      stopLoss: parseFloat(stopLoss) || 2,
      takeProfit: parseFloat(takeProfit) || 3,
      running: true,
      startTime: Date.now(),
      pnl: 0,
      trades: [{
        time: Date.now(),
        price: closePrices[closePrices.length - 1],
        signal: analysis.signal,
        confidence: analysis.confidence,
        executed: analysis.confidence > 60 && analysis.signal !== 'HOLD',
        action: analysis.signal,
      }],
    };

    res.json({ message: `Bot started for ${symbol}`, bot });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
