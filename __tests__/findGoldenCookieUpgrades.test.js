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
  it('should find golden cookie upgrades in store', () => {
    const luckyDay = createUpgradeMock('Lucky day', 777777777);
    const serendipity = createUpgradeMock('Serendipity', 77777777777);
    const regularUpgrade = createUpgradeMock('Reinforced index finger', 100);

    const upgradesInStore = [luckyDay, serendipity, regularUpgrade];

    const result = findGoldenUpgradesInStore(upgradesInStore, 1e12);

    expect(result).toHaveLength(2);
    expect(result.some(u => u.name === 'Lucky day')).toBe(true);
    expect(result.some(u => u.name === 'Serendipity')).toBe(true);
    expect(result.some(u => u.name === 'Reinforced index finger')).toBe(false);
  });

  it('should sort by price (cheapest first)', () => {
    const expensive = createUpgradeMock('Get lucky', 77777777777777);
    const cheap = createUpgradeMock('Lucky day', 777777777);
    const medium = createUpgradeMock('Serendipity', 77777777777);

    const result = findGoldenUpgradesInStore([expensive, cheap, medium], 1e15);

    expect(result[0].name).toBe('Lucky day');
    expect(result[1].name).toBe('Serendipity');
    expect(result[2].name).toBe('Get lucky');
  });

  it('should correctly mark affordability', () => {
    const cheap = createUpgradeMock('Lucky day', 1000);
    const expensive = createUpgradeMock('Serendipity', 1000000);

    const result = findGoldenUpgradesInStore([cheap, expensive], 5000);

    expect(result[0].affordable).toBe(true);
    expect(result[1].affordable).toBe(false);
  });

  it('should return empty array when no golden upgrades in store', () => {
    const regular1 = createUpgradeMock('Reinforced index finger', 100);
    const regular2 = createUpgradeMock('Carpal tunnel prevention cream', 500);

    const result = findGoldenUpgradesInStore([regular1, regular2], 1e6);

    expect(result).toEqual([]);
  });

  it('should return empty array for empty store', () => {
    const result = findGoldenUpgradesInStore([], 1e6);

    expect(result).toEqual([]);
  });

  it('should include gameUpgrade reference', () => {
    const upgrade = createUpgradeMock('Lucky day', 1000);
    const result = findGoldenUpgradesInStore([upgrade], 1e6);

    expect(result[0].gameUpgrade).toBe(upgrade);
  });

  it('should set type to GoldenUpgrade', () => {
    const upgrade = createUpgradeMock('Lucky day', 1000);
    const result = findGoldenUpgradesInStore([upgrade], 1e6);

    expect(result[0].type).toBe('GoldenUpgrade');
  });
});
