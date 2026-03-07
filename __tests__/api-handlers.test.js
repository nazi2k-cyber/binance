import { jest } from '@jest/globals';

// Mock handler test utilities
function createMockReq(method = 'GET', query = {}, body = {}) {
  return { method, query, body };
}

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(data) { this.body = data; return this; },
    end() { return this; },
  };
  return res;
}

// Import handlers
import pricesHandler from '../api/prices.js';
import accountHandler from '../api/account.js';
import symbolsHandler from '../api/symbols.js';

describe('API Handlers', () => {
  describe('GET /api/prices', () => {
    test('returns array of prices', async () => {
      const req = createMockReq('GET');
      const res = createMockRes();

      await pricesHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
      res.body.forEach(p => {
        expect(p).toHaveProperty('symbol');
        expect(p).toHaveProperty('price');
      });
    });

    test('sets CORS header', async () => {
      const req = createMockReq('GET');
      const res = createMockRes();

      await pricesHandler(req, res);

      expect(res.headers['Access-Control-Allow-Origin']).toBe('*');
    });

    test('handles OPTIONS preflight', async () => {
      const req = createMockReq('OPTIONS');
      const res = createMockRes();

      await pricesHandler(req, res);

      expect(res.statusCode).toBe(200);
    });

    test('rejects non-GET methods', async () => {
      const req = createMockReq('POST');
      const res = createMockRes();

      await pricesHandler(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  describe('GET /api/account', () => {
    test('returns account data in demo mode', async () => {
      const req = createMockReq('GET');
      const res = createMockRes();

      await accountHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('balances');
      expect(Array.isArray(res.body.balances)).toBe(true);
    });
  });

  describe('GET /api/symbols', () => {
    test('returns array of symbols in demo mode', async () => {
      const req = createMockReq('GET');
      const res = createMockRes();

      await symbolsHandler(req, res);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      res.body.forEach(s => {
        expect(s).toHaveProperty('symbol');
        expect(s).toHaveProperty('baseAsset');
        expect(s).toHaveProperty('quoteAsset');
      });
    });
  });
});
