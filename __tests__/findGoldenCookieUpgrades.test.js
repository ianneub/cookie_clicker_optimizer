/**
 * Tests for findGoldenUpgradesInStore and isGoldenCookieUpgrade functions
 */

const optimizer = require('../optimizer');
const { findGoldenUpgradesInStore, isGoldenCookieUpgrade } = optimizer;
const { createUpgradeMock } = require('./mocks/game');

describe('isGoldenCookieUpgrade', () => {
  it('should return true for golden cookie upgrades', () => {
    expect(isGoldenCookieUpgrade('Lucky day')).toBe(true);
    expect(isGoldenCookieUpgrade('Serendipity')).toBe(true);
    expect(isGoldenCookieUpgrade('Get lucky')).toBe(true);
    expect(isGoldenCookieUpgrade('Golden goose egg')).toBe(true);
    expect(isGoldenCookieUpgrade('Heavenly luck')).toBe(true);
    expect(isGoldenCookieUpgrade('Dragon fang')).toBe(true);
  });

  it('should return false for non-golden upgrades', () => {
    expect(isGoldenCookieUpgrade('Reinforced index finger')).toBe(false);
    expect(isGoldenCookieUpgrade('Carpal tunnel prevention cream')).toBe(false);
    expect(isGoldenCookieUpgrade('Forwards from grandma')).toBe(false);
  });

  it('should return false for non-existent upgrades', () => {
    expect(isGoldenCookieUpgrade('Not A Real Upgrade')).toBe(false);
    expect(isGoldenCookieUpgrade('')).toBe(false);
  });
});

describe('findGoldenUpgradesInStore', () => {
  // Use high CpS (late game) and phaseProgress for most tests so upgrades are prioritized
  const lateGameCpS = 100000000; // 100M CpS
  const lateGameProgress = 0.8;

  it('should find golden cookie upgrades in store', () => {
    const luckyDay = createUpgradeMock('Lucky day', 777777777);
    const serendipity = createUpgradeMock('Serendipity', 77777777777);
    const regularUpgrade = createUpgradeMock('Reinforced index finger', 100);

    const upgradesInStore = [luckyDay, serendipity, regularUpgrade];

    const result = findGoldenUpgradesInStore(upgradesInStore, 1e12, lateGameCpS, lateGameProgress);

    expect(result).toHaveLength(2);
    expect(result.some(u => u.name === 'Lucky day')).toBe(true);
    expect(result.some(u => u.name === 'Serendipity')).toBe(true);
    expect(result.some(u => u.name === 'Reinforced index finger')).toBe(false);
  });

  it('should sort prioritized first, then by price', () => {
    const expensive = createUpgradeMock('Get lucky', 77777777777777);
    const cheap = createUpgradeMock('Lucky day', 777777777);
    const medium = createUpgradeMock('Serendipity', 77777777777);

    const result = findGoldenUpgradesInStore([expensive, cheap, medium], 1e15, lateGameCpS, lateGameProgress);

    // All should be prioritized in late game, so sorted by price
    expect(result[0].name).toBe('Lucky day');
    expect(result[1].name).toBe('Serendipity');
    expect(result[2].name).toBe('Get lucky');
  });

  it('should correctly mark affordability', () => {
    const cheap = createUpgradeMock('Lucky day', 1000);
    const expensive = createUpgradeMock('Serendipity', 1000000);

    const result = findGoldenUpgradesInStore([cheap, expensive], 5000, lateGameCpS, lateGameProgress);

    expect(result[0].affordable).toBe(true);
    expect(result[1].affordable).toBe(false);
  });

  it('should return empty array when no golden upgrades in store', () => {
    const regular1 = createUpgradeMock('Reinforced index finger', 100);
    const regular2 = createUpgradeMock('Carpal tunnel prevention cream', 500);

    const result = findGoldenUpgradesInStore([regular1, regular2], 1e6, lateGameCpS, lateGameProgress);

    expect(result).toEqual([]);
  });

  it('should return empty array for empty store', () => {
    const result = findGoldenUpgradesInStore([], 1e6, lateGameCpS, lateGameProgress);

    expect(result).toEqual([]);
  });

  it('should include gameUpgrade reference', () => {
    const upgrade = createUpgradeMock('Lucky day', 1000);
    const result = findGoldenUpgradesInStore([upgrade], 1e6, lateGameCpS, lateGameProgress);

    expect(result[0].gameUpgrade).toBe(upgrade);
  });

  it('should set type to GoldenUpgrade', () => {
    const upgrade = createUpgradeMock('Lucky day', 1000);
    const result = findGoldenUpgradesInStore([upgrade], 1e6, lateGameCpS, lateGameProgress);

    expect(result[0].type).toBe('GoldenUpgrade');
  });

  // New tests for phase-aware priority
  describe('phase-aware priority', () => {
    it('should mark upgrades as prioritized in late game', () => {
      const upgrade = createUpgradeMock('Lucky day', 777777777);
      const result = findGoldenUpgradesInStore([upgrade], 1e12, lateGameCpS, lateGameProgress);

      expect(result[0].prioritized).toBe(true);
    });

    it('should mark expensive upgrades as not prioritized in early game', () => {
      const earlyGameCpS = 1000; // 1K CpS
      const earlyGameProgress = 0.2;
      // 777M at 1K CpS = 216 hours, way over 0.5 hour limit
      const upgrade = createUpgradeMock('Lucky day', 777777777);
      const result = findGoldenUpgradesInStore([upgrade], 1e12, earlyGameCpS, earlyGameProgress);

      expect(result[0].prioritized).toBe(false);
      expect(result[0].deferReason).toMatch(/\d+\.?\d*h.*limit/);
    });

    it('should mark cheap upgrades as prioritized even in early game', () => {
      const earlyGameCpS = 10000; // 10K CpS
      const earlyGameProgress = 0.2;
      // 1000 cookies at 10K CpS = 0.0001 hours, well under 0.5 hour limit
      const upgrade = createUpgradeMock('Lucky day', 1000);
      const result = findGoldenUpgradesInStore([upgrade], 1e12, earlyGameCpS, earlyGameProgress);

      expect(result[0].prioritized).toBe(true);
    });

    it('should sort prioritized upgrades before non-prioritized', () => {
      const midGameCpS = 1000000; // 1M CpS
      const midGameProgress = 0.5;
      // With mid game ~2.25 hour limit:
      // - 1B upgrade = 0.28 hours - should be prioritized
      // - 100T upgrade = 27.8 hours - should not be prioritized
      const cheapUpgrade = createUpgradeMock('Lucky day', 1000000000); // 1B
      const expensiveUpgrade = createUpgradeMock('Get lucky', 100000000000000); // 100T

      const result = findGoldenUpgradesInStore(
        [expensiveUpgrade, cheapUpgrade],
        1e15,
        midGameCpS,
        midGameProgress
      );

      expect(result[0].prioritized).toBe(true);
      expect(result[0].name).toBe('Lucky day');
      expect(result[1].prioritized).toBe(false);
      expect(result[1].name).toBe('Get lucky');
    });

    it('should include hoursToAfford in result', () => {
      // 3.6B cookies at 1M CpS = 3600 seconds = 1 hour
      const upgrade = createUpgradeMock('Lucky day', 3600000000);
      const result = findGoldenUpgradesInStore([upgrade], 1e12, 1000000, 0.5);

      expect(result[0].hoursToAfford).toBeCloseTo(1, 1);
    });
  });
});
