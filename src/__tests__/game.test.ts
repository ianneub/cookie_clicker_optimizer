/**
 * Tests for game browser functions
 */

import { describe, it, expect } from 'bun:test';
import { getTotalBuildings, executePurchaseItem, isCMDataReady } from '../browser/game';

describe('getTotalBuildings', () => {
  it('should sum all building amounts', () => {
    const gameObjects = {
      Cursor: { amount: 50, name: 'Cursor', price: 100, locked: false, buy: () => {}, getSumPrice: () => 100 },
      Grandma: { amount: 30, name: 'Grandma', price: 1000, locked: false, buy: () => {}, getSumPrice: () => 1000 },
      Farm: { amount: 20, name: 'Farm', price: 10000, locked: false, buy: () => {}, getSumPrice: () => 10000 },
    };

    expect(getTotalBuildings(gameObjects)).toBe(100);
  });

  it('should return 0 for empty objects', () => {
    expect(getTotalBuildings({})).toBe(0);
  });
});

describe('executePurchaseItem', () => {
  it('should buy single building', () => {
    let bought = false;
    const gameObjects = {
      Cursor: { buy: () => { bought = true; } },
    };

    const result = executePurchaseItem({ name: 'Cursor', type: 'Building' }, gameObjects as any, {});
    expect(result).toBe(true);
    expect(bought).toBe(true);
  });

  it('should buy multiple buildings', () => {
    let boughtQty = 0;
    const gameObjects = {
      Cursor: { buy: (qty: number) => { boughtQty = qty; } },
    };

    const result = executePurchaseItem({ name: 'Cursor x10', type: 'Building' }, gameObjects as any, {});
    expect(result).toBe(true);
    expect(boughtQty).toBe(10);
  });

  it('should buy upgrade', () => {
    let bought = false;
    const gameUpgrades = {
      'Lucky day': { buy: () => { bought = true; } },
    };

    const result = executePurchaseItem({ name: 'Lucky day', type: 'Upgrade' }, {}, gameUpgrades as any);
    expect(result).toBe(true);
    expect(bought).toBe(true);
  });

  it('should return false for null item', () => {
    expect(executePurchaseItem(null, {}, {})).toBe(false);
  });

  it('should return false for non-existent building', () => {
    expect(executePurchaseItem({ name: 'NonExistent', type: 'Building' }, {}, {})).toBe(false);
  });

  it('should buy One mind upgrade', () => {
    let bought = false;
    const gameUpgrades = {
      'One mind': { buy: () => { bought = true; } },
    };

    const result = executePurchaseItem({ name: 'One mind', type: 'Upgrade' }, {}, gameUpgrades as any);
    expect(result).toBe(true);
    expect(bought).toBe(true);
  });
});

describe('isCMDataReady', () => {
  it('should return false for undefined', () => {
    expect(isCMDataReady(undefined)).toBe(false);
  });

  it('should return false for empty Objects1', () => {
    expect(isCMDataReady({ Objects1: {} })).toBe(false);
  });

  it('should return true when PP values are valid', () => {
    expect(isCMDataReady({
      Objects1: { Cursor: { pp: 100 } },
    })).toBe(true);
  });

  it('should return false when PP is NaN', () => {
    expect(isCMDataReady({
      Objects1: { Cursor: { pp: NaN } },
    })).toBe(false);
  });

  it('should return false when PP is undefined', () => {
    expect(isCMDataReady({
      Objects1: { Cursor: { pp: undefined } },
    })).toBe(false);
  });

  it('should return false when building has no pp property', () => {
    expect(isCMDataReady({
      Objects1: { Cursor: {} },
    })).toBe(false);
  });
});
