/**
 * Tests for Lucky Bank protection functions
 */

const optimizer = require('../optimizer');
const { getLuckyBank, canAffordWithLuckyBank } = optimizer;

describe('getLuckyBank', () => {
  it('should use Cookie Monster Lucky cache value when available', () => {
    const cmCache = { Lucky: 1000000 };
    expect(getLuckyBank(cmCache, 1000)).toBe(1000000);
  });

  it('should fallback to 6000x CpS when cache not available', () => {
    expect(getLuckyBank(null, 1000)).toBe(6000000);
    expect(getLuckyBank(undefined, 1000)).toBe(6000000);
    expect(getLuckyBank({}, 1000)).toBe(6000000);
  });

  it('should fallback when cache values are invalid', () => {
    expect(getLuckyBank({ Lucky: 0 }, 1000)).toBe(6000000);
    expect(getLuckyBank({ Lucky: -100 }, 1000)).toBe(6000000);
    expect(getLuckyBank({ Lucky: NaN }, 1000)).toBe(6000000);
  });

  it('should handle zero CpS fallback', () => {
    expect(getLuckyBank(null, 0)).toBe(0);
  });
});

describe('canAffordWithLuckyBank', () => {
  it('should return true when purchase keeps cookies above threshold', () => {
    // 100k cookies, buy 20k item, 50k bank threshold = 80k remaining >= 50k
    expect(canAffordWithLuckyBank(100000, 20000, 50000)).toBe(true);
  });

  it('should return true when purchase leaves exactly at threshold', () => {
    // 100k cookies, buy 50k item, 50k bank threshold = 50k remaining >= 50k
    expect(canAffordWithLuckyBank(100000, 50000, 50000)).toBe(true);
  });

  it('should return false when purchase would drop below threshold', () => {
    // 100k cookies, buy 60k item, 50k bank threshold = 40k remaining < 50k
    expect(canAffordWithLuckyBank(100000, 60000, 50000)).toBe(false);
  });

  it('should return false when cookies are already below threshold', () => {
    // 40k cookies, buy 10k item, 50k bank threshold = 30k remaining < 50k
    expect(canAffordWithLuckyBank(40000, 10000, 50000)).toBe(false);
  });

  it('should return true with zero bank threshold (Gold: OFF behavior)', () => {
    // When Gold is OFF, luckyBank is 0, so any affordable item is allowed
    expect(canAffordWithLuckyBank(1000, 500, 0)).toBe(true);
    expect(canAffordWithLuckyBank(1000, 1000, 0)).toBe(true);
  });

  it('should return false when price exceeds cookies even with zero bank', () => {
    // Can't afford if price > cookies regardless of bank
    expect(canAffordWithLuckyBank(1000, 2000, 0)).toBe(false);
  });
});
