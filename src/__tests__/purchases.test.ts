/**
 * Tests for purchase-related functions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { executePurchaseItem, checkForPurchaseState } from '../browser/game';
import { collectUpgradeCandidates, findGoldenUpgradesInStore } from '../browser/purchases';
import {
  createBuildingMock,
  createUpgradeMock,
} from './mocks/game';
import type { Building, Upgrade } from '../types/game';
import type { CMUpgradeData } from '../types/cookieMonster';

describe('executePurchaseItem', () => {
  let gameObjects: Record<string, Building>;
  let gameUpgrades: Record<string, Upgrade>;

  beforeEach(() => {
    gameObjects = {
      Cursor: createBuildingMock('Cursor', 50),
      Grandma: createBuildingMock('Grandma', 40),
      Farm: createBuildingMock('Farm', 30),
      'Wizard Tower': createBuildingMock('Wizard Tower', 8),
    };

    gameUpgrades = {
      'Lucky day': createUpgradeMock('Lucky day', 777777777),
      'Reinforced index finger': createUpgradeMock(
        'Reinforced index finger',
        100
      ),
    };
  });

  describe('building purchases', () => {
    it('should buy single building', () => {
      const item = {
        name: 'Cursor',
        type: 'Building',
        price: 100,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Cursor']?.buy).toHaveBeenCalledWith(1);
    });

    it('should buy multiple buildings (x10)', () => {
      const item = {
        name: 'Grandma x10',
        type: 'Building',
        price: 10000,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Grandma']?.buy).toHaveBeenCalledWith(10);
    });

    it('should buy bulk buildings (x100)', () => {
      const item = {
        name: 'Farm x100',
        type: 'Building',
        price: 100000,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Farm']?.buy).toHaveBeenCalledWith(100);
    });

    it('should handle building names with spaces', () => {
      const item = {
        name: 'Wizard Tower x10',
        type: 'Building',
        price: 100000,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameObjects['Wizard Tower']?.buy).toHaveBeenCalledWith(10);
    });

    it('should return false for non-existent building', () => {
      const item = {
        name: 'NonExistent',
        type: 'Building',
        price: 100,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });

    it('should return false for non-existent building with quantity', () => {
      const item = {
        name: 'NonExistent x10',
        type: 'Building',
        price: 100,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });

  describe('upgrade purchases', () => {
    it('should buy upgrade', () => {
      const item = {
        name: 'Lucky day',
        type: 'Upgrade',
        price: 777777777,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(true);
      expect(gameUpgrades['Lucky day']?.buy).toHaveBeenCalled();
    });

    it('should return false for non-existent upgrade', () => {
      const item = {
        name: 'NonExistent',
        type: 'Upgrade',
        price: 100,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for null item', () => {
      expect(executePurchaseItem(null, gameObjects, gameUpgrades)).toBe(false);
    });

    it('should return false for unknown type', () => {
      const item = {
        name: 'Something',
        type: 'Unknown',
        price: 100,
        affordable: true,
      };

      const result = executePurchaseItem(item, gameObjects, gameUpgrades);

      expect(result).toBe(false);
    });
  });
});

describe('checkForPurchaseState', () => {
  it('should detect building purchase', () => {
    const state = { lastBuildingCount: 10, lastUpgradeCount: 5 };

    const result = checkForPurchaseState(state, 11, 5);

    expect(result.purchased).toBe(true);
    expect(result.newState.lastBuildingCount).toBe(11);
  });

  it('should detect upgrade purchase', () => {
    const state = { lastBuildingCount: 10, lastUpgradeCount: 5 };

    const result = checkForPurchaseState(state, 10, 6);

    expect(result.purchased).toBe(true);
    expect(result.newState.lastUpgradeCount).toBe(6);
  });

  it('should return false when no change', () => {
    const state = { lastBuildingCount: 10, lastUpgradeCount: 5 };

    const result = checkForPurchaseState(state, 10, 5);

    expect(result.purchased).toBe(false);
  });
});

describe('findGoldenUpgradesInStore', () => {
  it('should find golden cookie upgrades in store', () => {
    const upgradesInStore = [
      createUpgradeMock('Lucky day', 777777777),
      createUpgradeMock('Reinforced index finger', 100),
    ];

    const result = findGoldenUpgradesInStore(
      upgradesInStore,
      1e12, // cookies
      1e9, // CpS
      0.5 // phaseProgress (mid-game)
    );

    expect(result.length).toBe(1);
    expect(result[0]?.name).toBe('Lucky day');
  });

  it('should return empty array when no golden upgrades available', () => {
    const upgradesInStore = [
      createUpgradeMock('Reinforced index finger', 100),
      createUpgradeMock('Carpal tunnel prevention cream', 200),
    ];

    const result = findGoldenUpgradesInStore(upgradesInStore, 1e12, 1e9, 0.5);

    expect(result.length).toBe(0);
  });

  it('should mark affordable upgrades correctly', () => {
    const upgradesInStore = [createUpgradeMock('Lucky day', 1000)];

    const result = findGoldenUpgradesInStore(upgradesInStore, 500, 100, 0.5);

    expect(result[0]?.affordable).toBe(false);
  });

  it('should sort prioritized upgrades first', () => {
    const upgradesInStore = [
      createUpgradeMock('Serendipity', 77777777777),
      createUpgradeMock('Lucky day', 777777777),
    ];

    const result = findGoldenUpgradesInStore(
      upgradesInStore,
      1e15, // enough cookies
      1e12, // high CpS (endgame)
      0.9 // late game - should prioritize
    );

    // Both should be found, sorted by prioritized then price
    expect(result.length).toBe(2);
  });

  it('should include deferReason when not prioritized', () => {
    const upgradesInStore = [createUpgradeMock('Lucky day', 777777777)];

    const result = findGoldenUpgradesInStore(
      upgradesInStore,
      1e6, // low cookies
      100, // low CpS (early game)
      0.1 // early game - should defer
    );

    expect(result.length).toBe(1);
    expect(result[0]?.prioritized).toBe(false);
    expect(result[0]?.deferReason).toBeDefined();
  });

  it('should calculate hoursToAfford', () => {
    const upgradesInStore = [createUpgradeMock('Lucky day', 777777777)];

    const result = findGoldenUpgradesInStore(
      upgradesInStore,
      0, // no cookies
      1000, // 1000 CpS
      0.5
    );

    expect(result[0]?.hoursToAfford).toBeGreaterThan(0);
  });
});

describe('collectUpgradeCandidates', () => {
  let gameUpgrades: Record<string, Upgrade>;
  let cmUpgrades: Record<string, CMUpgradeData>;

  beforeEach(() => {
    gameUpgrades = {
      'Reinforced index finger': createUpgradeMock('Reinforced index finger', 100),
      'One mind': createUpgradeMock('One mind', 1600000000),
      'Communal brainsweep': createUpgradeMock('Communal brainsweep', 16000000000),
      'Arcane sugar': createUpgradeMock('Arcane sugar', 160000000000),
      'Elder Pact': createUpgradeMock('Elder Pact', 1600000000000),
      'Elder Pledge': createUpgradeMock('Elder Pledge', 1000000),
      'Lucky day': createUpgradeMock('Lucky day', 777777777),
    };

    cmUpgrades = {
      'Reinforced index finger': { pp: 50 },
      'One mind': { pp: 100 },
      'Communal brainsweep': { pp: 150 },
      'Arcane sugar': { pp: 200 },
      'Elder Pact': { pp: 250 },
      'Elder Pledge': { pp: 30 },
      'Lucky day': { pp: 500 },
    };
  });

  it('should exclude grandmapocalypse research upgrades', () => {
    const upgradesInStore = [
      gameUpgrades['Reinforced index finger']!,
      gameUpgrades['One mind']!,
      gameUpgrades['Communal brainsweep']!,
      gameUpgrades['Arcane sugar']!,
      gameUpgrades['Elder Pact']!,
    ];

    const result = collectUpgradeCandidates(
      cmUpgrades,
      gameUpgrades,
      upgradesInStore,
      1e15,
      0,
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Reinforced index finger');
    expect(result.find(c => c.name === 'One mind')).toBeUndefined();
    expect(result.find(c => c.name === 'Communal brainsweep')).toBeUndefined();
    expect(result.find(c => c.name === 'Arcane sugar')).toBeUndefined();
    expect(result.find(c => c.name === 'Elder Pact')).toBeUndefined();
  });

  it('should exclude toggle upgrades', () => {
    const upgradesInStore = [
      gameUpgrades['Reinforced index finger']!,
      gameUpgrades['Elder Pledge']!,
    ];

    const result = collectUpgradeCandidates(
      cmUpgrades,
      gameUpgrades,
      upgradesInStore,
      1e15,
      0,
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Reinforced index finger');
    expect(result.find(c => c.name === 'Elder Pledge')).toBeUndefined();
  });

  it('should include regular upgrades', () => {
    const upgradesInStore = [
      gameUpgrades['Reinforced index finger']!,
      gameUpgrades['Lucky day']!,
    ];

    const result = collectUpgradeCandidates(
      cmUpgrades,
      gameUpgrades,
      upgradesInStore,
      1e15,
      0,
      false
    );

    expect(result).toHaveLength(2);
    expect(result.find(c => c.name === 'Reinforced index finger')).toBeDefined();
    expect(result.find(c => c.name === 'Lucky day')).toBeDefined();
  });

  it('should only include upgrades in store', () => {
    const upgradesInStore = [
      gameUpgrades['Reinforced index finger']!,
    ];

    const result = collectUpgradeCandidates(
      cmUpgrades,
      gameUpgrades,
      upgradesInStore,
      1e15,
      0,
      false
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.name).toBe('Reinforced index finger');
  });
});
