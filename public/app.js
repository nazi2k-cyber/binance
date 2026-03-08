// ─── State ───
const state = {
  currentSymbol: 'BTCUSDT',
  currentInterval: '1h',
  orderSide: 'BUY',
  orderType: 'LIMIT',
  tickers: [],
  klines: [],
  ws: null,
};

// ─── API Helper ───
async function api(path, options = {}) {
  try {
    const res = await fetch(`/api${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'API Error');
    return data;
  } catch (err) {
    showToast(err.message, 'error');
    throw err;
  }
}

// ─── Toast ───
function showToast(msg, type = '') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ─── Tab Navigation ───
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

    if (btn.dataset.tab === 'market') loadTickers();
    if (btn.dataset.tab === 'portfolio') loadPortfolio();
    if (btn.dataset.tab === 'bot') loadBotStatus();
  });
});

// ─── Market Tab ───
async function loadTickers() {
  try {
    const data = await api('/prices');
    const usdtPairs = data.filter(t => t.symbol.endsWith('USDT')).slice(0, 30);

    // Get 24h changes
    const tickers24h = await api('/ticker/24h');
    const changeMap = {};
    if (Array.isArray(tickers24h)) {
      tickers24h.forEach(t => { changeMap[t.symbol] = t; });
    }

    state.tickers = usdtPairs.map(t => ({
      symbol: t.symbol,
      price: parseFloat(t.price),
      change: changeMap[t.symbol] ? parseFloat(changeMap[t.symbol].priceChangePercent) : 0,
      volume: changeMap[t.symbol] ? parseFloat(changeMap[t.symbol].volume) : 0,
    }));

    // Sort by volume
    state.tickers.sort((a, b) => b.volume - a.volume);
    renderTickers(state.tickers);
  } catch {
    document.getElementById('tickerList').innerHTML = '<div class="loading">Failed to load market data</div>';
  }
}

function renderTickers(tickers) {
  const list = document.getElementById('tickerList');
  list.innerHTML = tickers.map(t => `
    <div class="ticker-item" data-symbol="${t.symbol}">
      <div class="ticker-info">
        <span class="ticker-symbol">${t.symbol.replace('USDT', '')}</span>
        <span class="ticker-name">${t.symbol}</span>
      </div>
      <div class="ticker-price-col">
        <span class="ticker-price">${formatPrice(t.price)}</span>
        <span class="ticker-change ${t.change >= 0 ? 'up' : 'down'}">${t.change >= 0 ? '+' : ''}${t.change.toFixed(2)}%</span>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.ticker-item').forEach(item => {
    item.addEventListener('click', () => {
      selectSymbol(item.dataset.symbol);
    });
  });
}

// Search
document.getElementById('symbolSearch').addEventListener('input', (e) => {
  const q = e.target.value.toUpperCase();
  const filtered = state.tickers.filter(t => t.symbol.includes(q));
  renderTickers(filtered);
});

// ─── Symbol Selection ───
function selectSymbol(symbol) {
  state.currentSymbol = symbol;
  document.getElementById('tradeSymbol').textContent = symbol;

  // Switch to trade tab
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelector('[data-tab="trade"]').classList.add('active');
  document.getElementById('tab-trade').classList.add('active');

  loadTradeData();
  connectWebSocket(symbol);
}

// ─── Trade Data ───
async function loadTradeData() {
  try {
    const [ticker, klines] = await Promise.all([
      api(`/ticker/${state.currentSymbol}`),
      api(`/klines/${state.currentSymbol}?interval=${state.currentInterval}&limit=100`),
    ]);

    const price = parseFloat(ticker.lastPrice);
    const change = parseFloat(ticker.priceChangePercent);

    document.getElementById('tradePrice').textContent = formatPrice(price);
    const changeEl = document.getElementById('tradeChange');
    changeEl.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
    changeEl.className = `price-change ${change >= 0 ? 'up' : 'down'}`;

    document.getElementById('orderPrice').value = price.toFixed(2);
    updateOrderButton();

    state.klines = klines;
    drawChart(klines);
  } catch {}
}

// ─── Chart ───
function drawChart(klines) {
  const canvas = document.getElementById('priceChart');
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = 200 * dpr;
  ctx.scale(dpr, dpr);

  const w = canvas.offsetWidth;
  const h = 200;
  ctx.clearRect(0, 0, w, h);

  if (!klines.length) return;

  const closes = klines.map(k => k.close);
  const min = Math.min(...closes) * 0.999;
  const max = Math.max(...closes) * 1.001;
  const range = max - min || 1;

  // Grid
  ctx.strokeStyle = '#2b3139';
  ctx.lineWidth = 0.5;
  for (let i = 0; i < 4; i++) {
    const y = h * (i / 3) * 0.9 + h * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Candlesticks
  const candleW = Math.max((w / closes.length) * 0.7, 2);
  const gap = w / closes.length;

  klines.forEach((k, i) => {
    const x = i * gap + gap / 2;
    const openY = h * 0.05 + (1 - (k.open - min) / range) * h * 0.9;
    const closeY = h * 0.05 + (1 - (k.close - min) / range) * h * 0.9;
    const highY = h * 0.05 + (1 - (k.high - min) / range) * h * 0.9;
    const lowY = h * 0.05 + (1 - (k.low - min) / range) * h * 0.9;
    const isGreen = k.close >= k.open;

    ctx.strokeStyle = isGreen ? '#0ecb81' : '#f6465d';
    ctx.fillStyle = isGreen ? '#0ecb81' : '#f6465d';

    // Wick
    ctx.beginPath();
    ctx.moveTo(x, highY);
    ctx.lineTo(x, lowY);
    ctx.lineWidth = 1;
    ctx.stroke();

    // Body
    const bodyTop = Math.min(openY, closeY);
    const bodyH = Math.max(Math.abs(closeY - openY), 1);
    ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
  });

  // Current price line
  const lastClose = closes[closes.length - 1];
  const priceY = h * 0.05 + (1 - (lastClose - min) / range) * h * 0.9;
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#f0b90b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, priceY);
  ctx.lineTo(w, priceY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Price label
  ctx.fillStyle = '#f0b90b';
  ctx.font = '10px sans-serif';
  ctx.fillText(formatPrice(lastClose), w - 60, priceY - 4);
}

// Interval buttons
document.querySelectorAll('.interval-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.currentInterval = btn.dataset.interval;
    loadTradeData();
  });
});

// ─── Analysis ───
document.getElementById('analyzeBtn').addEventListener('click', async () => {
  const strategy = document.getElementById('strategySelect').value;
  const resultEl = document.getElementById('analysisResult');
  resultEl.innerHTML = '<div class="loading">Analyzing...</div>';

  try {
    const data = await api(`/analyze/${state.currentSymbol}?strategy=${strategy}&interval=${state.currentInterval}`);
    renderAnalysis(data);
  } catch {
    resultEl.innerHTML = '<div class="loading">Analysis failed</div>';
  }
});

function renderAnalysis(data) {
  const el = document.getElementById('analysisResult');
  const signalColor = data.signal === 'BUY' ? '#0ecb81' : data.signal === 'SELL' ? '#f6465d' : '#f0b90b';

  let html = `
    <div class="signal-badge ${data.signal}">${data.signal}</div>
    <div class="confidence-bar">
      <div class="fill" style="width:${data.confidence}%;background:${signalColor}"></div>
    </div>
    <div style="font-size:12px;color:var(--text-secondary);margin-bottom:8px">
      Confidence: ${data.confidence}%
    </div>
  `;

  if (data.indicators) {
    html += '<div class="indicator-grid">';
    for (const [key, val] of Object.entries(data.indicators)) {
      html += `<span>${key}:</span><span class="val">${val}</span>`;
    }
    html += '</div>';
  }

  if (data.strategies) {
    html += '<div class="strategy-breakdown">';
    for (const s of data.strategies) {
      html += `
        <div class="strategy-row">
          <span class="name">${s.name}</span>
          <span class="sig ${s.signal}">${s.signal} (${s.confidence}%)</span>
        </div>
      `;
    }
    html += '</div>';
  }

  el.innerHTML = html;
}

// ─── Order Form ───
document.querySelectorAll('.order-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.order-tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.orderSide = btn.dataset.side;
    updateOrderButton();
  });
});

document.querySelectorAll('.type-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.orderType = btn.dataset.type;
    document.getElementById('priceGroup').style.display = btn.dataset.type === 'MARKET' ? 'none' : 'block';
  });
});

function updateOrderButton() {
  const btn = document.getElementById('placeOrderBtn');
  btn.textContent = `${state.orderSide} ${state.currentSymbol}`;
  btn.className = `btn btn-full ${state.orderSide === 'BUY' ? 'btn-buy' : 'btn-sell'}`;
}

// Calculate total
['orderPrice', 'orderAmount'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => {
    const price = parseFloat(document.getElementById('orderPrice').value) || 0;
    const amount = parseFloat(document.getElementById('orderAmount').value) || 0;
    document.getElementById('orderTotal').textContent = (price * amount).toFixed(2);
  });
});

// Place order
document.getElementById('placeOrderBtn').addEventListener('click', async () => {
  const price = document.getElementById('orderPrice').value;
  const quantity = document.getElementById('orderAmount').value;

  if (!quantity) {
    showToast('Please enter amount', 'error');
    return;
  }

  try {
    const body = {
      symbol: state.currentSymbol,
      side: state.orderSide,
      type: state.orderType,
      quantity,
    };
    if (state.orderType === 'LIMIT') body.price = price;

    await api('/order', { method: 'POST', body });
    showToast(`${state.orderSide} order placed!`, 'success');
  } catch {}
});

// ─── Bot Control ───
document.getElementById('startBotBtn').addEventListener('click', async () => {
  const body = {
    symbol: document.getElementById('botSymbol').value,
    strategy: document.getElementById('botStrategy').value,
    interval: document.getElementById('botInterval').value,
    tradeAmount: document.getElementById('botAmount').value,
    stopLoss: document.getElementById('botStopLoss').value,
    takeProfit: document.getElementById('botTakeProfit').value,
  };

  try {
    await api('/bot/start', { method: 'POST', body });
    showToast(`Bot started for ${body.symbol}`, 'success');
    loadBotStatus();
  } catch {}
});

async function loadBotStatus() {
  try {
    const bots = await api('/bot/status');
    const list = document.getElementById('botList');

    if (Object.keys(bots).length === 0) {
      list.innerHTML = '<p class="no-bots">No active bots</p>';
      return;
    }

    list.innerHTML = Object.entries(bots).map(([symbol, bot]) => `
      <div class="bot-card">
        <div class="bot-card-header">
          <span class="symbol">${symbol}</span>
          <span class="running-badge">Running</span>
        </div>
        <div class="bot-info">
          <span>Strategy:</span><span class="val">${bot.strategy}</span>
          <span>Interval:</span><span class="val">${bot.interval}</span>
          <span>Amount:</span><span class="val">${bot.tradeAmount} USDT</span>
          <span>Signals:</span><span class="val">${bot.trades.length}</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="stopBot('${symbol}')">Stop Bot</button>
      </div>
    `).join('');

    // Show recent signals
    const allSignals = Object.values(bots).flatMap(b => b.trades.map(t => ({ ...t, symbol: b.symbol })));
    allSignals.sort((a, b) => b.time - a.time);
    renderSignals(allSignals.slice(0, 20));
  } catch {}
}

async function stopBot(symbol) {
  try {
    await api('/bot/stop', { method: 'POST', body: { symbol } });
    showToast(`Bot stopped for ${symbol}`, 'success');
    loadBotStatus();
  } catch {}
}
// Expose to onclick
window.stopBot = stopBot;

function renderSignals(signals) {
  const list = document.getElementById('signalList');
  if (!signals.length) {
    list.innerHTML = '<p class="no-bots">No signals yet</p>';
    return;
  }
  list.innerHTML = signals.map(s => `
    <div class="signal-item">
      <span class="time">${new Date(s.time).toLocaleTimeString()}</span>
      <span>${s.symbol || ''}</span>
      <span>$${formatPrice(s.price)}</span>
      <span class="sig ${s.signal}">${s.signal}</span>
      <span>${s.confidence}%</span>
    </div>
  `).join('');
}

// ─── Portfolio ───
async function loadPortfolio() {
  try {
    const account = await api('/account');
    const balances = account.balances || [];

    document.getElementById('balanceList').innerHTML = balances.length
      ? balances.map(b => `
        <div class="balance-item">
          <span class="balance-asset">${b.asset}</span>
          <div class="balance-amounts">
            <div class="balance-free">${parseFloat(b.free).toFixed(8)}</div>
            <div class="balance-locked">Locked: ${parseFloat(b.locked).toFixed(8)}</div>
          </div>
        </div>
      `).join('')
      : '<div class="loading">No balances found</div>';
  } catch {
    document.getElementById('balanceList').innerHTML = '<div class="loading">Connect API keys in Settings</div>';
  }
}

// ─── WebSocket ───
function connectWebSocket(symbol) {
  if (state.ws) state.ws.close();

  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  state.ws = new WebSocket(`${protocol}//${location.host}/ws`);

  state.ws.onopen = () => {
    document.getElementById('connectionStatus').className = 'status-dot connected';
    state.ws.send(JSON.stringify({ action: 'subscribe', symbol }));
  };

  state.ws.onmessage = (e) => {
    const data = JSON.parse(e.data);
    if (data.type === 'trade') {
      document.getElementById('tradePrice').textContent = formatPrice(parseFloat(data.price));
    }
    if (data.type === 'bot_update') {
      loadBotStatus();
    }
  };

  state.ws.onclose = () => {
    document.getElementById('connectionStatus').className = 'status-dot disconnected';
  };
}

// ─── Settings Modal ───
document.getElementById('settingsBtn').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.remove('hidden');
});

document.getElementById('closeSettings').addEventListener('click', () => {
  document.getElementById('settingsModal').classList.add('hidden');
});

document.getElementById('saveSettings').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKeyInput').value.trim();
  const apiSecret = document.getElementById('apiSecretInput').value.trim();
  const useTestnet = document.getElementById('testnetToggle').checked;

  if (!apiKey || !apiSecret) {
    showToast('API Key and Secret are required', 'error');
    return;
  }

  try {
    await api('/settings', {
      method: 'POST',
      body: { apiKey, apiSecret, useTestnet },
    });
    showToast('API keys saved successfully!', 'success');
    document.getElementById('settingsModal').classList.add('hidden');
  } catch {
    showToast('Failed to save settings', 'error');
  }
});

// Close modal on backdrop click
document.getElementById('settingsModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) {
    document.getElementById('settingsModal').classList.add('hidden');
  }
});

// ─── Utility ───
function formatPrice(price) {
  if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1) return price.toFixed(4);
  return price.toFixed(6);
}

// ─── Init ───
// Check API key status on startup
(async () => {
  try {
    const status = await api('/settings/status');
    if (!status.hasKeys) {
      showToast('API keys not configured. Go to Settings to add your Binance API keys.', 'error');
    }
  } catch {}
})();

loadTickers();

// Auto-refresh tickers every 30s
setInterval(() => {
  const marketTab = document.querySelector('[data-tab="market"]');
  if (marketTab.classList.contains('active')) loadTickers();
}, 30000);

// Auto-refresh bot status every 10s
setInterval(() => {
  const botTab = document.querySelector('[data-tab="bot"]');
  if (botTab.classList.contains('active')) loadBotStatus();
}, 10000);
