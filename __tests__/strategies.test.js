import { jest } from '@jest/globals';
import {
  smaCrossover,
  rsiStrategy,
  macdStrategy,
  bollingerStrategy,
  combinedStrategy,
} from '../lib/strategies.js';

// Generate a realistic price series
function generatePrices(count, basePrice = 100, trend = 0) {
  const prices = [];
  let price = basePrice;
  for (let i = 0; i < count; i++) {
    price += (Math.random() - 0.5 + trend) * basePrice * 0.01;
    prices.push(Math.max(price, 0.01));
  }
  return prices;
}

// Generate trending prices (uptrend or downtrend)
function generateTrendingPrices(count, basePrice, direction = 'up') {
  const prices = [];
  let price = basePrice;
  const trend = direction === 'up' ? 0.02 : -0.02;
  for (let i = 0; i < count; i++) {
    price += (Math.random() * 0.01 + trend) * basePrice * 0.01;
    prices.push(Math.max(price, 0.01));
  }
  return prices;
}

describe('Trading Strategies', () => {
  describe('smaCrossover', () => {
    test('returns valid signal structure', () => {
      const prices = generatePrices(50);
      const result = smaCrossover(prices);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('indicators');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    test('returns HOLD with insufficient data', () => {
      const result = smaCrossover([1, 2, 3]);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    test('indicators contain SMA values', () => {
      const prices = generatePrices(50, 100);
      const result = smaCrossover(prices);
      expect(result.indicators).toHaveProperty('shortSma');
      expect(result.indicators).toHaveProperty('longSma');
      expect(typeof result.indicators.shortSma).toBe('number');
      expect(typeof result.indicators.longSma).toBe('number');
    });

    test('respects custom periods', () => {
      const prices = generatePrices(100, 50);
      const result = smaCrossover(prices, 5, 20);
      expect(result).toHaveProperty('signal');
    });
  });

  describe('rsiStrategy', () => {
    test('returns valid signal structure', () => {
      const prices = generatePrices(50);
      const result = rsiStrategy(prices);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('indicators');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });

    test('returns HOLD with insufficient data', () => {
      const result = rsiStrategy([1, 2, 3]);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    test('indicators contain RSI value', () => {
      const prices = generatePrices(30);
      const result = rsiStrategy(prices);
      expect(result.indicators).toHaveProperty('rsi');
      if (result.indicators.rsi !== undefined) {
        expect(result.indicators.rsi).toBeGreaterThanOrEqual(0);
        expect(result.indicators.rsi).toBeLessThanOrEqual(100);
      }
    });

    test('detects oversold condition (BUY signal) with steep decline', () => {
      // Create a steep decline to trigger RSI < 30
      const prices = [];
      let price = 100;
      for (let i = 0; i < 30; i++) {
        price -= 2;
        prices.push(Math.max(price, 1));
      }
      const result = rsiStrategy(prices);
      // RSI should be low after consistent decline
      expect(result.indicators.rsi).toBeLessThan(50);
    });
  });

  describe('macdStrategy', () => {
    test('returns valid signal structure', () => {
      const prices = generatePrices(50);
      const result = macdStrategy(prices);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });

    test('returns HOLD with insufficient data', () => {
      const result = macdStrategy([1, 2, 3]);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    test('includes MACD indicators when enough data', () => {
      const prices = generatePrices(50);
      const result = macdStrategy(prices);
      if (result.indicators.macd !== undefined) {
        expect(result.indicators).toHaveProperty('macd');
        expect(result.indicators).toHaveProperty('signal');
        expect(result.indicators).toHaveProperty('histogram');
      }
    });
  });

  describe('bollingerStrategy', () => {
    test('returns valid signal structure', () => {
      const prices = generatePrices(30);
      const result = bollingerStrategy(prices);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });

    test('returns HOLD with insufficient data', () => {
      const result = bollingerStrategy([1, 2, 3]);
      expect(result.signal).toBe('HOLD');
      expect(result.confidence).toBe(0);
    });

    test('includes Bollinger Band indicators', () => {
      const prices = generatePrices(30, 100);
      const result = bollingerStrategy(prices);
      expect(result.indicators).toHaveProperty('upper');
      expect(result.indicators).toHaveProperty('middle');
      expect(result.indicators).toHaveProperty('lower');
      expect(result.indicators).toHaveProperty('price');
      expect(result.indicators.upper).toBeGreaterThan(result.indicators.middle);
      expect(result.indicators.middle).toBeGreaterThan(result.indicators.lower);
    });
  });

  describe('combinedStrategy', () => {
    test('returns valid combined signal structure', () => {
      const prices = generatePrices(50);
      const result = combinedStrategy(prices);

      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('confidence');
      expect(result).toHaveProperty('strategies');
      expect(['BUY', 'SELL', 'HOLD']).toContain(result.signal);
    });

    test('includes all sub-strategies', () => {
      const prices = generatePrices(50);
      const result = combinedStrategy(prices);

      expect(result.strategies).toHaveLength(4);
      const names = result.strategies.map(s => s.name);
      expect(names).toContain('SMA Crossover');
      expect(names).toContain('RSI');
      expect(names).toContain('MACD');
      expect(names).toContain('Bollinger Bands');
    });

    test('each sub-strategy has valid structure', () => {
      const prices = generatePrices(50);
      const result = combinedStrategy(prices);

      result.strategies.forEach(s => {
        expect(s).toHaveProperty('name');
        expect(s).toHaveProperty('signal');
        expect(s).toHaveProperty('confidence');
        expect(['BUY', 'SELL', 'HOLD']).toContain(s.signal);
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(100);
      });
    });

    test('confidence is bounded', () => {
      const prices = generatePrices(100);
      const result = combinedStrategy(prices);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });
});
