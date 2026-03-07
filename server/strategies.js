/**
 * Algorithm Trading Strategies
 * Each strategy analyzes market data and returns trading signals.
 */

// Calculate Simple Moving Average
function sma(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((sum, p) => sum + p, 0) / period;
}

// Calculate Exponential Moving Average
function ema(prices, period) {
  if (prices.length < period) return null;
  const k = 2 / (period + 1);
  let emaVal = sma(prices.slice(0, period), period);
  for (let i = period; i < prices.length; i++) {
    emaVal = prices[i] * k + emaVal * (1 - k);
  }
  return emaVal;
}

// Calculate RSI (Relative Strength Index)
function rsi(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = prices.length - period; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff;
    else losses -= diff;
  }
  if (losses === 0) return 100;
  const rs = (gains / period) / (losses / period);
  return 100 - (100 / (1 + rs));
}

// Calculate MACD
function macd(prices) {
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  if (ema12 === null || ema26 === null) return null;
  const macdLine = ema12 - ema26;
  // Simplified signal line
  const signal = ema(prices.slice(-9).map((_, i) => {
    const sub = prices.slice(0, prices.length - 8 + i);
    return ema(sub, 12) - ema(sub, 26);
  }).filter(v => v !== null), 9) || macdLine * 0.9;
  return { macdLine, signal, histogram: macdLine - signal };
}

// Calculate Bollinger Bands
function bollingerBands(prices, period = 20, stdDev = 2) {
  if (prices.length < period) return null;
  const middle = sma(prices, period);
  const slice = prices.slice(-period);
  const variance = slice.reduce((sum, p) => sum + Math.pow(p - middle, 2), 0) / period;
  const sd = Math.sqrt(variance);
  return {
    upper: middle + stdDev * sd,
    middle,
    lower: middle - stdDev * sd,
  };
}

/**
 * Strategy: SMA Crossover
 * Buy when short SMA crosses above long SMA
 * Sell when short SMA crosses below long SMA
 */
export function smaCrossover(closePrices, shortPeriod = 7, longPeriod = 25) {
  const shortSma = sma(closePrices, shortPeriod);
  const longSma = sma(closePrices, longPeriod);
  if (shortSma === null || longSma === null) {
    return { signal: 'HOLD', confidence: 0, indicators: {} };
  }

  const prevShort = sma(closePrices.slice(0, -1), shortPeriod);
  const prevLong = sma(closePrices.slice(0, -1), longPeriod);

  let signal = 'HOLD';
  let confidence = 0;
  if (prevShort <= prevLong && shortSma > longSma) {
    signal = 'BUY';
    confidence = Math.min(((shortSma - longSma) / longSma) * 100, 100);
  } else if (prevShort >= prevLong && shortSma < longSma) {
    signal = 'SELL';
    confidence = Math.min(((longSma - shortSma) / longSma) * 100, 100);
  }

  return {
    signal,
    confidence: Math.round(confidence * 10) / 10,
    indicators: {
      shortSma: Math.round(shortSma * 100) / 100,
      longSma: Math.round(longSma * 100) / 100,
    },
  };
}

/**
 * Strategy: RSI Oversold/Overbought
 * Buy when RSI < 30 (oversold)
 * Sell when RSI > 70 (overbought)
 */
export function rsiStrategy(closePrices, period = 14, oversold = 30, overbought = 70) {
  const rsiVal = rsi(closePrices, period);
  if (rsiVal === null) {
    return { signal: 'HOLD', confidence: 0, indicators: {} };
  }

  let signal = 'HOLD';
  let confidence = 0;
  if (rsiVal < oversold) {
    signal = 'BUY';
    confidence = ((oversold - rsiVal) / oversold) * 100;
  } else if (rsiVal > overbought) {
    signal = 'SELL';
    confidence = ((rsiVal - overbought) / (100 - overbought)) * 100;
  }

  return {
    signal,
    confidence: Math.round(Math.min(confidence, 100) * 10) / 10,
    indicators: { rsi: Math.round(rsiVal * 100) / 100 },
  };
}

/**
 * Strategy: MACD Signal
 */
export function macdStrategy(closePrices) {
  const m = macd(closePrices);
  if (!m) return { signal: 'HOLD', confidence: 0, indicators: {} };

  let signal = 'HOLD';
  let confidence = 0;
  if (m.histogram > 0 && m.macdLine > 0) {
    signal = 'BUY';
    confidence = Math.min(Math.abs(m.histogram) * 50, 100);
  } else if (m.histogram < 0 && m.macdLine < 0) {
    signal = 'SELL';
    confidence = Math.min(Math.abs(m.histogram) * 50, 100);
  }

  return {
    signal,
    confidence: Math.round(confidence * 10) / 10,
    indicators: {
      macd: Math.round(m.macdLine * 100) / 100,
      signal: Math.round(m.signal * 100) / 100,
      histogram: Math.round(m.histogram * 100) / 100,
    },
  };
}

/**
 * Strategy: Bollinger Band Bounce
 */
export function bollingerStrategy(closePrices, period = 20) {
  const bb = bollingerBands(closePrices, period);
  if (!bb) return { signal: 'HOLD', confidence: 0, indicators: {} };

  const currentPrice = closePrices[closePrices.length - 1];
  const bandwidth = bb.upper - bb.lower;
  let signal = 'HOLD';
  let confidence = 0;

  if (currentPrice <= bb.lower) {
    signal = 'BUY';
    confidence = Math.min(((bb.lower - currentPrice) / bandwidth) * 200, 100);
  } else if (currentPrice >= bb.upper) {
    signal = 'SELL';
    confidence = Math.min(((currentPrice - bb.upper) / bandwidth) * 200, 100);
  }

  return {
    signal,
    confidence: Math.round(confidence * 10) / 10,
    indicators: {
      upper: Math.round(bb.upper * 100) / 100,
      middle: Math.round(bb.middle * 100) / 100,
      lower: Math.round(bb.lower * 100) / 100,
      price: Math.round(currentPrice * 100) / 100,
    },
  };
}

/**
 * Combined Strategy - aggregates signals from all strategies
 */
export function combinedStrategy(closePrices) {
  const strategies = [
    { name: 'SMA Crossover', result: smaCrossover(closePrices) },
    { name: 'RSI', result: rsiStrategy(closePrices) },
    { name: 'MACD', result: macdStrategy(closePrices) },
    { name: 'Bollinger Bands', result: bollingerStrategy(closePrices) },
  ];

  let buyScore = 0, sellScore = 0, count = 0;
  for (const s of strategies) {
    if (s.result.signal === 'BUY') buyScore += s.result.confidence;
    else if (s.result.signal === 'SELL') sellScore += s.result.confidence;
    count++;
  }

  let signal = 'HOLD';
  let confidence = 0;
  if (buyScore > sellScore && buyScore > 50) {
    signal = 'BUY';
    confidence = buyScore / count;
  } else if (sellScore > buyScore && sellScore > 50) {
    signal = 'SELL';
    confidence = sellScore / count;
  }

  return {
    signal,
    confidence: Math.round(confidence * 10) / 10,
    strategies: strategies.map(s => ({ name: s.name, ...s.result })),
  };
}
