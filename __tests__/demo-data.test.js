import { jest } from '@jest/globals';
import {
  getDemoPrices,
  getDemoTicker24h,
  getDemoKlines,
  getDemoOrderBook,
  getDemoAccount,
  isDemoMode,
} from '../lib/demo-data.js';

describe('Demo Data', () => {
  describe('getDemoPrices', () => {
    test('returns array of price objects', () => {
      const prices = getDemoPrices();
      expect(Array.isArray(prices)).toBe(true);
      expect(prices.length).toBeGreaterThan(0);
    });

    test('each price has symbol and price', () => {
      const prices = getDemoPrices();
      prices.forEach(p => {
        expect(p).toHaveProperty('symbol');
        expect(p).toHaveProperty('price');
        expect(typeof p.symbol).toBe('string');
        expect(typeof p.price).toBe('string');
        expect(parseFloat(p.price)).toBeGreaterThan(0);
      });
    });

    test('includes major trading pairs', () => {
      const prices = getDemoPrices();
      const symbols = prices.map(p => p.symbol);
      expect(symbols).toContain('BTCUSDT');
      expect(symbols).toContain('ETHUSDT');
    });
  });

  describe('getDemoTicker24h', () => {
    test('returns single ticker for specific symbol', () => {
      const ticker = getDemoTicker24h('BTCUSDT');
      expect(ticker).toHaveProperty('symbol', 'BTCUSDT');
      expect(ticker).toHaveProperty('lastPrice');
      expect(ticker).toHaveProperty('priceChangePercent');
      expect(ticker).toHaveProperty('volume');
    });

    test('returns array of tickers when no symbol specified', () => {
      const tickers = getDemoTicker24h();
      expect(Array.isArray(tickers)).toBe(true);
      expect(tickers.length).toBeGreaterThan(0);
      tickers.forEach(t => {
        expect(t).toHaveProperty('symbol');
        expect(t).toHaveProperty('lastPrice');
      });
    });

    test('falls back to first symbol for unknown symbol', () => {
      const ticker = getDemoTicker24h('UNKNOWNUSDT');
      expect(ticker).toHaveProperty('symbol');
      expect(ticker).toHaveProperty('lastPrice');
    });
  });

  describe('getDemoKlines', () => {
    test('returns correct number of klines', () => {
      const klines = getDemoKlines('BTCUSDT', '1h', 50);
      expect(klines).toHaveLength(50);
    });

    test('each kline has OHLCV data', () => {
      const klines = getDemoKlines('ETHUSDT', '15m', 10);
      klines.forEach(k => {
        expect(k).toHaveProperty('openTime');
        expect(k).toHaveProperty('open');
        expect(k).toHaveProperty('high');
        expect(k).toHaveProperty('low');
        expect(k).toHaveProperty('close');
        expect(k).toHaveProperty('volume');
        expect(k).toHaveProperty('closeTime');
        expect(k.high).toBeGreaterThanOrEqual(k.low);
        expect(k.open).toBeGreaterThan(0);
        expect(k.close).toBeGreaterThan(0);
      });
    });

    test('klines are in chronological order', () => {
      const klines = getDemoKlines('BTCUSDT', '1h', 20);
      for (let i = 1; i < klines.length; i++) {
        expect(klines[i].openTime).toBeGreaterThan(klines[i - 1].openTime);
      }
    });

    test('defaults to 100 klines', () => {
      const klines = getDemoKlines('BTCUSDT', '1h');
      expect(klines).toHaveLength(100);
    });
  });

  describe('getDemoOrderBook', () => {
    test('returns bids and asks', () => {
      const book = getDemoOrderBook('BTCUSDT');
      expect(book).toHaveProperty('bids');
      expect(book).toHaveProperty('asks');
      expect(Array.isArray(book.bids)).toBe(true);
      expect(Array.isArray(book.asks)).toBe(true);
    });

    test('respects limit parameter', () => {
      const book = getDemoOrderBook('BTCUSDT', 10);
      expect(book.bids).toHaveLength(10);
      expect(book.asks).toHaveLength(10);
    });

    test('bids are below asks', () => {
      const book = getDemoOrderBook('BTCUSDT', 5);
      const highestBid = parseFloat(book.bids[0][0]);
      const lowestAsk = parseFloat(book.asks[0][0]);
      expect(lowestAsk).toBeGreaterThan(highestBid);
    });
  });

  describe('getDemoAccount', () => {
    test('returns account with balances', () => {
      const account = getDemoAccount();
      expect(account).toHaveProperty('balances');
      expect(Array.isArray(account.balances)).toBe(true);
      expect(account.balances.length).toBeGreaterThan(0);
    });

    test('balances have required fields', () => {
      const account = getDemoAccount();
      account.balances.forEach(b => {
        expect(b).toHaveProperty('asset');
        expect(b).toHaveProperty('free');
        expect(b).toHaveProperty('locked');
      });
    });

    test('includes USDT balance', () => {
      const account = getDemoAccount();
      const usdt = account.balances.find(b => b.asset === 'USDT');
      expect(usdt).toBeDefined();
      expect(parseFloat(usdt.free)).toBeGreaterThan(0);
    });
  });

  describe('isDemoMode', () => {
    const originalEnv = process.env.BINANCE_API_KEY;

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.BINANCE_API_KEY = originalEnv;
      } else {
        delete process.env.BINANCE_API_KEY;
      }
    });

    test('returns true when no API key is set', () => {
      delete process.env.BINANCE_API_KEY;
      expect(isDemoMode()).toBe(true);
    });

    test('returns true when API key is empty', () => {
      process.env.BINANCE_API_KEY = '';
      expect(isDemoMode()).toBe(true);
    });

    test('returns false when API key is set', () => {
      process.env.BINANCE_API_KEY = 'test-key-123';
      expect(isDemoMode()).toBe(false);
    });
  });
});
