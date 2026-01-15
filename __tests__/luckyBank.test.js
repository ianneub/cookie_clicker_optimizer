/**
 * Tests for Lucky Bank protection functions
 */

const optimizer = require('../optimizer');
const { getBaseLuckyBank, getLuckyBank, canAffordWithLuckyBank, getScaledLuckyBank } = optimizer;

describe('getBaseLuckyBank', () => {
  it('should use Cookie Monster Lucky cache value when available', () => {
    const cmCache = { Lucky: 1000000 };
    expect(getBaseLuckyBank(cmCache, 1000)).toBe(1000000);
  });

  it('should fallback to 6000x CpS when cache not available', () => {
    expect(getBaseLuckyBank(null, 1000)).toBe(6000000);
    expect(getBaseLuckyBank(undefined, 1000)).toBe(6000000);
    expect(getBaseLuckyBank({}, 1000)).toBe(6000000);
  });

  it('should fallback when cache values are invalid', () => {
    expect(getBaseLuckyBank({ Lucky: 0 }, 1000)).toBe(6000000);
    expect(getBaseLuckyBank({ Lucky: -100 }, 1000)).toBe(6000000);
    expect(getBaseLuckyBank({ Lucky: NaN }, 1000)).toBe(6000000);
  });

  it('should handle zero CpS fallback', () => {
    expect(getBaseLuckyBank(null, 0)).toBe(0);
  });
});

describe('getLuckyBank (with phase scaling)', () => {
  it('should return object with scaled, base, phaseProgress, and phaseName', () => {
    const result = getLuckyBank(null, 1000000); // 1M CpS = mid phase
    expect(result).toHaveProperty('scaled');
    expect(result).toHaveProperty('base');
    expect(result).toHaveProperty('phaseProgress');
    expect(result).toHaveProperty('phaseName');
  });

  it('should return 0 scaled bank in early game (< 1M CpS)', () => {
    const result = getLuckyBank(null, 10000); // 10K CpS = early phase
    expect(result.base).toBe(60000000); // 6000 * 10000
    expect(result.scaled).toBe(0); // Early game = no bank protection
    expect(result.phaseName).toBe('Early');
  });

  it('should return partial scaled bank in mid game', () => {
    const result = getLuckyBank(null, 10000000); // 10M CpS = mid phase
    expect(result.base).toBe(60000000000); // 6000 * 10M
    expect(result.scaled).toBeGreaterThan(0);
    expect(result.scaled).toBeLessThan(result.base);
    expect(result.phaseName).toBe('Mid');
  });

  it('should return full scaled bank in late game (> 100M CpS)', () => {
    const result = getLuckyBank(null, 1000000000); // 1B CpS = late/endgame phase
    expect(result.base).toBe(6000000000000); // 6000 * 1B
    expect(result.scaled).toBe(result.base); // Late game = full protection
  });

  it('should use Cookie Monster cache value as base when available', () => {
    const cmCache = { Lucky: 42000000 }; // 42M
    const result = getLuckyBank(cmCache, 1000000);
    expect(result.base).toBe(42000000);
  });
});

describe('getScaledLuckyBank', () => {
  it('should return 0 for very early phase progress', () => {
    expect(getScaledLuckyBank(1000000, 0.1)).toBe(0);
    expect(getScaledLuckyBank(1000000, 0.2)).toBe(0);
  });

  it('should return partial value for mid phase progress', () => {
    const result = getScaledLuckyBank(1000000, 0.5);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(1000000);
  });

  it('should return full value for late phase progress', () => {
    expect(getScaledLuckyBank(1000000, 0.8)).toBe(1000000);
    expect(getScaledLuckyBank(1000000, 1.0)).toBe(1000000);
  });

  it('should return 0 when base is 0', () => {
    expect(getScaledLuckyBank(0, 0.5)).toBe(0);
    expect(getScaledLuckyBank(0, 1.0)).toBe(0);
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
