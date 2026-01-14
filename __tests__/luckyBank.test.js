/**
 * Tests for Lucky Bank protection functions
 */

const optimizer = require('../optimizer');
const { getLuckyBank, getBaseCpS, canAffordWithLuckyBank } = optimizer;

describe('getLuckyBank', () => {
  it('should use Cookie Monster LuckyFrenzy cache value when available', () => {
    const cmCache = { LuckyFrenzy: 5000000 };
    expect(getLuckyBank(cmCache, 1000)).toBe(5000000);
  });

  it('should use Cookie Monster Lucky cache value when LuckyFrenzy not available', () => {
    const cmCache = { Lucky: 1000000 };
    expect(getLuckyBank(cmCache, 1000)).toBe(1000000);
  });

  it('should prefer LuckyFrenzy over Lucky when both available', () => {
    const cmCache = { LuckyFrenzy: 5000000, Lucky: 1000000 };
    expect(getLuckyBank(cmCache, 1000)).toBe(5000000);
  });

  it('should fallback to 6000x CpS when cache not available', () => {
    expect(getLuckyBank(null, 1000)).toBe(6000000);
    expect(getLuckyBank(undefined, 1000)).toBe(6000000);
    expect(getLuckyBank({}, 1000)).toBe(6000000);
  });

  it('should fallback when cache values are invalid', () => {
    expect(getLuckyBank({ LuckyFrenzy: 0 }, 1000)).toBe(6000000);
    expect(getLuckyBank({ LuckyFrenzy: -100 }, 1000)).toBe(6000000);
    expect(getLuckyBank({ LuckyFrenzy: NaN }, 1000)).toBe(6000000);
  });

  it('should handle zero CpS fallback', () => {
    expect(getLuckyBank(null, 0)).toBe(0);
  });
});

describe('getBaseCpS', () => {
  it('should return current CpS when no buffs are active', () => {
    expect(getBaseCpS(1000, {})).toBe(1000);
    expect(getBaseCpS(5000, {})).toBe(5000);
  });

  it('should return current CpS when buffs is null or undefined', () => {
    expect(getBaseCpS(1000, null)).toBe(1000);
    expect(getBaseCpS(1000, undefined)).toBe(1000);
  });

  it('should divide out Frenzy multiplier (7x)', () => {
    const buffs = { 'Frenzy': { multCpS: 7 } };
    expect(getBaseCpS(7000, buffs)).toBe(1000);
  });

  it('should use default Frenzy multiplier when multCpS not specified', () => {
    const buffs = { 'Frenzy': {} };
    expect(getBaseCpS(7000, buffs)).toBe(1000);
  });

  it('should divide out Dragon Harvest multiplier (15x)', () => {
    const buffs = { 'Dragon Harvest': { multCpS: 15 } };
    expect(getBaseCpS(15000, buffs)).toBe(1000);
  });

  it('should divide out Elder frenzy multiplier (666x)', () => {
    const buffs = { 'Elder frenzy': { multCpS: 666 } };
    expect(getBaseCpS(666000, buffs)).toBe(1000);
  });

  it('should divide out Clot multiplier (0.5x)', () => {
    const buffs = { 'Clot': { multCpS: 0.5 } };
    expect(getBaseCpS(500, buffs)).toBe(1000);
  });

  it('should handle multiple buffs', () => {
    // Frenzy (7x) + Dragon Harvest (15x) = 105x total
    const buffs = {
      'Frenzy': { multCpS: 7 },
      'Dragon Harvest': { multCpS: 15 }
    };
    expect(getBaseCpS(105000, buffs)).toBe(1000);
  });

  it('should handle Frenzy + Clot combination', () => {
    // Frenzy (7x) * Clot (0.5x) = 3.5x total
    const buffs = {
      'Frenzy': { multCpS: 7 },
      'Clot': { multCpS: 0.5 }
    };
    expect(getBaseCpS(3500, buffs)).toBe(1000);
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
