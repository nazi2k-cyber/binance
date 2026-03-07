import { createBinanceAPI } from '../lib/binance-api.js';
import { isDemoMode } from '../lib/demo-data.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { symbol, side, type, quantity, price } = req.body;

      if (isDemoMode()) {
        return res.json({
          symbol,
          orderId: Date.now(),
          side,
          type,
          status: 'DEMO_FILLED',
          origQty: quantity,
          price: price || '0',
          executedQty: quantity,
          transactTime: Date.now(),
          demo: true,
        });
      }

      const binance = createBinanceAPI();
      let data;
      if (type === 'MARKET') {
        data = await binance.createMarketOrder(symbol, side, quantity);
      } else {
        data = await binance.createLimitOrder(symbol, side, quantity, price);
      }
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { symbol, orderId } = req.body;

      if (isDemoMode()) {
        return res.json({ symbol, orderId, status: 'CANCELED', demo: true });
      }

      const binance = createBinanceAPI();
      const data = await binance.cancelOrder(symbol, orderId);
      res.json(data);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
