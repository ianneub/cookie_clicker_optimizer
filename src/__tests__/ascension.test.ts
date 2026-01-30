import { describe, expect, it } from 'bun:test';
import { calculateAscensionStats, calculateUnpurchasedHeavenlyCost } from '../core/ascension';

describe('calculateAscensionStats', () => {
  it('calculates pending prestige correctly', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 100,
      cookiesReset: 1000,
      cookiesEarned: 500,
      howMuchPrestige: (c) => Math.floor(c / 10), // 150 total
      heavenlyChips: 50,
      unpurchasedUpgradeCost: 200,
    });
    expect(stats.pendingPrestige).toBe(50);
    expect(stats.percentIncrease).toBe(50);
    expect(stats.isGoodToAscend).toBe(false);
  });

  it('returns isGoodToAscend true when gain >= 100%', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 100,
      cookiesReset: 1000,
      cookiesEarned: 2000,
      howMuchPrestige: (c) => Math.floor(c / 10), // 300 total
      heavenlyChips: 50,
      unpurchasedUpgradeCost: 100,
    });
    expect(stats.pendingPrestige).toBe(200);
    expect(stats.percentIncrease).toBe(200);
    expect(stats.isGoodToAscend).toBe(true);
  });

  it('calculates chips deficit correctly', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 100,
      cookiesReset: 0,
      cookiesEarned: 0,
      howMuchPrestige: () => 100,
      heavenlyChips: 50,
      unpurchasedUpgradeCost: 200,
    });
    expect(stats.chipsDeficit).toBe(150);
  });

  it('clamps deficit to 0 when chips exceed cost', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 100,
      cookiesReset: 0,
      cookiesEarned: 0,
      howMuchPrestige: () => 100,
      heavenlyChips: 500,
      unpurchasedUpgradeCost: 200,
    });
    expect(stats.chipsDeficit).toBe(0);
  });

  it('returns Infinity percent when currentPrestige is 0 but pending > 0', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 0,
      cookiesReset: 0,
      cookiesEarned: 1000,
      howMuchPrestige: (c) => Math.floor(c / 10),
      heavenlyChips: 0,
      unpurchasedUpgradeCost: 0,
    });
    expect(stats.pendingPrestige).toBe(100);
    expect(stats.percentIncrease).toBe(Infinity);
    expect(stats.isGoodToAscend).toBe(true);
  });

  it('returns 0 percent when no pending prestige', () => {
    const stats = calculateAscensionStats({
      currentPrestige: 100,
      cookiesReset: 500,
      cookiesEarned: 500,
      howMuchPrestige: () => 100, // same as current
      heavenlyChips: 100,
      unpurchasedUpgradeCost: 50,
    });
    expect(stats.pendingPrestige).toBe(0);
    expect(stats.percentIncrease).toBe(0);
    expect(stats.isGoodToAscend).toBe(false);
  });
});

describe('calculateUnpurchasedHeavenlyCost', () => {
  it('sums only prestige pool upgrades that are not bought', () => {
    const upgrades = [
      { pool: 'prestige', basePrice: 100, bought: false },
      { pool: 'prestige', basePrice: 50, bought: true },
      { pool: 'cookie', basePrice: 1000, bought: false },
      { pool: 'prestige', basePrice: 200, bought: false },
    ];
    expect(calculateUnpurchasedHeavenlyCost(upgrades)).toBe(300);
  });

  it('returns 0 when all prestige upgrades are bought', () => {
    const upgrades = [{ pool: 'prestige', basePrice: 100, bought: true }];
    expect(calculateUnpurchasedHeavenlyCost(upgrades)).toBe(0);
  });

  it('returns 0 for empty array', () => {
    expect(calculateUnpurchasedHeavenlyCost([])).toBe(0);
  });

  it('handles upgrades without pool property', () => {
    const upgrades = [
      { basePrice: 100, bought: false },
      { pool: 'prestige', basePrice: 50, bought: false },
    ];
    expect(calculateUnpurchasedHeavenlyCost(upgrades)).toBe(50);
  });
});
