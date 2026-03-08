import express from 'express';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';
import { BinanceAPI } from './binance-api.js';
import { smaCrossover, rsiStrategy, macdStrategy, bollingerStrategy, combinedStrategy } from './strategies.js';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

const binance = new BinanceAPI(
  process.env.BINANCE_API_KEY || '',
  process.env.BINANCE_API_SECRET || '',
  process.env.USE_TESTNET !== 'false'
);

// Active algo trading bots
const activeBots = new Map();

// WebSocket clients (declared early for use in addErrorLog)
const wsClients = new Set();

// ─── Error Log Store ───
const errorLogs = [];
const MAX_ERROR_LOGS = 500;

function addErrorLog(level, source, message, details = null) {
  const entry = {
    id: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
    timestamp: Date.now(),
    level,
    source,
    message,
    details,
  };
  errorLogs.push(entry);
  if (errorLogs.length > MAX_ERROR_LOGS) errorLogs.shift();

  // Broadcast to WebSocket clients
  const msg = JSON.stringify({ type: 'error_log', data: entry });
  for (const client of wsClients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// ─── API Key Management ───

// Update API keys at runtime
app.post('/api/settings', (req, res) => {
  const { apiKey, apiSecret, useTestnet } = req.body;

  if (!apiKey || !apiSecret) {
    return res.status(400).json({ error: 'API Key and Secret are required' });
  }

  binance.updateKeys(apiKey, apiSecret);

  if (typeof useTestnet === 'boolean') {
    binance.setTestnet(useTestnet);
  }

  res.json({ message: 'API keys updated successfully', hasKeys: true });
});

// Check API key status
app.get('/api/settings/status', (req, res) => {
  res.json({ hasKeys: binance.hasKeys() });
});

// ─── REST API Routes ───

// Get available trading pairs
app.get('/api/symbols', async (req, res) => {
  try {
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
    addErrorLog('error', 'API', `GET /api/symbols failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get all 24h tickers
app.get('/api/ticker/24h', async (req, res) => {
  try {
    const data = await binance.getTicker24h();
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'API', `GET /api/ticker/24h failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get ticker data for specific symbol
app.get('/api/ticker/:symbol', async (req, res) => {
  try {
    const data = await binance.getTicker24h(req.params.symbol);
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'API', `GET /api/ticker/${req.params.symbol} failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get klines/candlestick data
app.get('/api/klines/:symbol', async (req, res) => {
  try {
    const { interval = '1h', limit = '100' } = req.query;
    const data = await binance.getKlines(req.params.symbol, interval, parseInt(limit));
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
    addErrorLog('error', 'API', `GET /api/klines/${req.params.symbol} failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get order book
app.get('/api/orderbook/:symbol', async (req, res) => {
  try {
    const data = await binance.getOrderBook(req.params.symbol, parseInt(req.query.limit || '20'));
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'API', `GET /api/orderbook/${req.params.symbol} failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get account info
app.get('/api/account', async (req, res) => {
  try {
    const data = await binance.getAccount();
    const balances = data.balances.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0);
    res.json({ ...data, balances });
  } catch (err) {
    addErrorLog('error', 'Account', `GET /api/account failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get prices
app.get('/api/prices', async (req, res) => {
  try {
    const data = await binance.getTickerPrice();
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'API', `GET /api/prices failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Place order
app.post('/api/order', async (req, res) => {
  try {
    const { symbol, side, type, quantity, price } = req.body;
    let data;
    if (type === 'MARKET') {
      data = await binance.createMarketOrder(symbol, side, quantity);
    } else {
      data = await binance.createLimitOrder(symbol, side, quantity, price);
    }
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'Order', `POST /api/order failed: ${err.message}`, req.body);
    res.status(500).json({ error: err.message });
  }
});

// Cancel order
app.delete('/api/order', async (req, res) => {
  try {
    const { symbol, orderId } = req.body;
    const data = await binance.cancelOrder(symbol, orderId);
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'Order', `DELETE /api/order failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// Get open orders
app.get('/api/orders/:symbol', async (req, res) => {
  try {
    const data = await binance.getOpenOrders(req.params.symbol);
    res.json(data);
  } catch (err) {
    addErrorLog('error', 'Order', `GET /api/orders/${req.params.symbol} failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── Strategy Analysis ───

app.get('/api/analyze/:symbol', async (req, res) => {
  try {
    const { strategy = 'combined', interval = '1h' } = req.query;
    const klines = await binance.getKlines(req.params.symbol, interval, 100);
    const closePrices = klines.map(k => parseFloat(k[4]));

    let result;
    switch (strategy) {
      case 'sma': result = smaCrossover(closePrices); break;
      case 'rsi': result = rsiStrategy(closePrices); break;
      case 'macd': result = macdStrategy(closePrices); break;
      case 'bollinger': result = bollingerStrategy(closePrices); break;
      default: result = combinedStrategy(closePrices);
    }

    res.json({
      symbol: req.params.symbol,
      interval,
      strategy,
      currentPrice: closePrices[closePrices.length - 1],
      ...result,
    });
  } catch (err) {
    addErrorLog('error', 'Strategy', `GET /api/analyze/${req.params.symbol} failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// ─── Algo Trading Bot Control ───

app.post('/api/bot/start', async (req, res) => {
  try {
    const { symbol, strategy = 'combined', interval = '1m', tradeAmount, stopLoss, takeProfit } = req.body;

    if (activeBots.has(symbol)) {
      return res.status(400).json({ error: `Bot already running for ${symbol}` });
    }

    const bot = {
      symbol,
      strategy,
      interval,
      tradeAmount: parseFloat(tradeAmount),
      stopLoss: parseFloat(stopLoss) || 2,
      takeProfit: parseFloat(takeProfit) || 3,
      running: true,
      trades: [],
      startTime: Date.now(),
      pnl: 0,
    };

    const intervalMs = {
      '1m': 60000, '5m': 300000, '15m': 900000,
      '30m': 1800000, '1h': 3600000,
    }[interval] || 60000;

    bot.timer = setInterval(async () => {
      if (!bot.running) return;
      try {
        const klines = await binance.getKlines(symbol, interval, 100);
        const closePrices = klines.map(k => parseFloat(k[4]));
        const currentPrice = closePrices[closePrices.length - 1];

        let analysis;
        switch (strategy) {
          case 'sma': analysis = smaCrossover(closePrices); break;
          case 'rsi': analysis = rsiStrategy(closePrices); break;
          case 'macd': analysis = macdStrategy(closePrices); break;
          case 'bollinger': analysis = bollingerStrategy(closePrices); break;
          default: analysis = combinedStrategy(closePrices);
        }

        const tradeLog = {
          time: Date.now(),
          price: currentPrice,
          signal: analysis.signal,
          confidence: analysis.confidence,
          executed: false,
        };

        // Only execute trades with high confidence
        if (analysis.confidence > 60 && analysis.signal !== 'HOLD') {
          tradeLog.executed = true;
          tradeLog.action = analysis.signal;
        }

        bot.trades.push(tradeLog);
        if (bot.trades.length > 100) bot.trades.shift();

        // Broadcast to WebSocket clients
        broadcastBotUpdate(symbol, { ...bot, latestAnalysis: analysis, timer: undefined });
      } catch (err) {
        addErrorLog('error', 'Bot', `Bot error for ${symbol}: ${err.message}`);
      }
    }, intervalMs);

    activeBots.set(symbol, bot);
    res.json({ message: `Bot started for ${symbol}`, bot: { ...bot, timer: undefined } });
  } catch (err) {
    addErrorLog('error', 'Bot', `POST /api/bot/start failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bot/stop', (req, res) => {
  const { symbol } = req.body;
  const bot = activeBots.get(symbol);
  if (!bot) {
    return res.status(404).json({ error: `No bot running for ${symbol}` });
  }
  bot.running = false;
  clearInterval(bot.timer);
  activeBots.delete(symbol);
  res.json({ message: `Bot stopped for ${symbol}`, trades: bot.trades });
});

app.get('/api/bot/status', (req, res) => {
  const bots = {};
  for (const [symbol, bot] of activeBots) {
    bots[symbol] = { ...bot, timer: undefined };
  }
  res.json(bots);
});

// ─── Error Log API ───

app.get('/api/logs', (req, res) => {
  const { level, source, limit = '100' } = req.query;
  let logs = [...errorLogs];
  if (level) logs = logs.filter(l => l.level === level);
  if (source) logs = logs.filter(l => l.source === source);
  logs.reverse();
  res.json(logs.slice(0, parseInt(limit)));
});

app.delete('/api/logs', (req, res) => {
  errorLogs.length = 0;
  res.json({ message: 'All logs cleared' });
});

// ─── WebSocket ───

wss.on('connection', (ws) => {
  wsClients.add(ws);

  // Subscribe to Binance price stream
  let binanceWs = null;

  ws.on('message', async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.action === 'subscribe' && data.symbol) {
        const symbol = data.symbol.toLowerCase();
        if (binanceWs) binanceWs.close();

        const { default: WebSocket } = await import('ws');
        binanceWs = new WebSocket(`${binance.wsBaseUrl}/${symbol}@trade`);
        binanceWs.on('message', (raw) => {
          if (ws.readyState === 1) {
            const trade = JSON.parse(raw);
            ws.send(JSON.stringify({
              type: 'trade',
              symbol: trade.s,
              price: trade.p,
              quantity: trade.q,
              time: trade.T,
              isBuyerMaker: trade.m,
            }));
          }
        });
        binanceWs.on('error', (err) => {
          addErrorLog('warn', 'WebSocket', `Binance WS error for ${symbol}: ${err.message || 'Connection error'}`);
        });
      }
    } catch {}
  });

  ws.on('close', () => {
    wsClients.delete(ws);
    if (binanceWs) binanceWs.close();
  });
});

function broadcastBotUpdate(symbol, data) {
  const msg = JSON.stringify({ type: 'bot_update', symbol, data });
  for (const client of wsClients) {
    if (client.readyState === 1) client.send(msg);
  }
}

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '..', 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Testnet mode: ${process.env.USE_TESTNET !== 'false'}`);
});
