import crypto from 'crypto';

export class BinanceAPI {
  constructor(apiKey, apiSecret, useTestnet = true) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.baseUrl = useTestnet
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
    this.wsBaseUrl = useTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
  }

  sign(queryString) {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex');
  }

  async request(method, endpoint, params = {}, signed = false) {
    const url = new URL(`${this.baseUrl}${endpoint}`);
    const headers = { 'X-MBX-APIKEY': this.apiKey };

    if (signed) {
      params.timestamp = Date.now();
      params.recvWindow = 5000;
    }

    const queryString = new URLSearchParams(params).toString();

    if (signed) {
      params.signature = this.sign(queryString);
    }

    const fullQuery = new URLSearchParams(params).toString();

    if (method === 'GET') {
      url.search = fullQuery;
    }

    const options = {
      method,
      headers,
      ...(method === 'POST' || method === 'DELETE'
        ? { body: fullQuery, headers: { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' } }
        : {}),
    };

    const response = await fetch(url.toString(), options);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.msg || `Binance API error: ${response.status}`);
    }

    return data;
  }

  // Market Data
  async getExchangeInfo() {
    return this.request('GET', '/v3/exchangeInfo');
  }

  async getTicker24h(symbol) {
    return this.request('GET', '/v3/ticker/24hr', symbol ? { symbol } : {});
  }

  async getKlines(symbol, interval, limit = 100) {
    return this.request('GET', '/v3/klines', { symbol, interval, limit });
  }

  async getOrderBook(symbol, limit = 20) {
    return this.request('GET', '/v3/depth', { symbol, limit });
  }

  async getRecentTrades(symbol, limit = 50) {
    return this.request('GET', '/v3/trades', { symbol, limit });
  }

  async getTickerPrice(symbol) {
    return this.request('GET', '/v3/ticker/price', symbol ? { symbol } : {});
  }

  // Account
  async getAccount() {
    return this.request('GET', '/v3/account', {}, true);
  }

  // Orders
  async createOrder(symbol, side, type, params = {}) {
    return this.request('POST', '/v3/order', {
      symbol,
      side,
      type,
      ...params,
    }, true);
  }

  async createMarketOrder(symbol, side, quantity) {
    return this.createOrder(symbol, side, 'MARKET', { quantity });
  }

  async createLimitOrder(symbol, side, quantity, price) {
    return this.createOrder(symbol, side, 'LIMIT', {
      quantity,
      price,
      timeInForce: 'GTC',
    });
  }

  async cancelOrder(symbol, orderId) {
    return this.request('DELETE', '/v3/order', { symbol, orderId }, true);
  }

  async getOpenOrders(symbol) {
    return this.request('GET', '/v3/openOrders', symbol ? { symbol } : {}, true);
  }

  async getAllOrders(symbol, limit = 50) {
    return this.request('GET', '/v3/allOrders', { symbol, limit }, true);
  }

  updateKeys(apiKey, apiSecret) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
  }

  setTestnet(useTestnet) {
    this.baseUrl = useTestnet
      ? 'https://testnet.binance.vision/api'
      : 'https://api.binance.com/api';
    this.wsBaseUrl = useTestnet
      ? 'wss://testnet.binance.vision/ws'
      : 'wss://stream.binance.com:9443/ws';
  }

  hasKeys() {
    return !!(this.apiKey && this.apiSecret);
  }
}
