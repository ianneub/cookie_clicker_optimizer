/**
 * Factory for creating Game object mocks
 * Mimics Cookie Clicker's Game global
 */

import { mock } from 'bun:test';
import type { Building, Upgrade, Game, Shimmer } from '../../types/game';

export function createBuildingMock(
  name: string,
  amount = 0,
  locked = false,
  basePrice = 100
): Building {
  return {
    name,
    amount,
    locked,
    price: basePrice,
    getSumPrice: mock((qty: number) => {
      // Simplified price calculation (actual game uses geometric series)
      let total = 0;
      for (let i = 0; i < qty; i++) {
        total += Math.ceil(basePrice * Math.pow(1.15, amount + i));
      }
      return total;
    }),
    buy: mock(),
  };
}

export function createUpgradeMock(
  name: string,
  price = 1000,
  bought = false
): Upgrade {
  return {
    name,
    basePrice: price,
    bought,
    unlocked: true,
    getPrice: mock(() => price),
    buy: mock(),
  };
}

export interface GameMockOptions {
  cookies?: number;
  cookiesPs?: number;
  buildings?: Record<string, Building>;
  upgrades?: Record<string, Upgrade>;
  upgradesInStore?: Upgrade[];
  upgradesOwned?: number;
  shimmers?: Shimmer[];
}

export function createGameMock(options: GameMockOptions = {}): Game {
  const {
    cookies = 1000000,
    cookiesPs = 1000,
    buildings = {},
    upgrades = {},
    upgradesInStore = [],
    upgradesOwned = 0,
    shimmers = [],
  } = options;

  // Default buildings if not provided
  const defaultBuildings: Record<string, Building> = {
    Cursor: createBuildingMock('Cursor', 50, false, 15),
    Grandma: createBuildingMock('Grandma', 40, false, 100),
    Farm: createBuildingMock('Farm', 30, false, 1100),
    Mine: createBuildingMock('Mine', 25, false, 12000),
    Factory: createBuildingMock('Factory', 20, false, 130000),
    Bank: createBuildingMock('Bank', 15, false, 1400000),
    Temple: createBuildingMock('Temple', 10, false, 20000000),
    'Wizard Tower': createBuildingMock('Wizard Tower', 8, false, 330000000),
    ...buildings,
  };

  // Default upgrades if not provided
  const defaultUpgrades: Record<string, Upgrade> = {
    'Lucky day': createUpgradeMock('Lucky day', 777777777),
    Serendipity: createUpgradeMock('Serendipity', 77777777777),
    'Get lucky': createUpgradeMock('Get lucky', 77777777777777),
    'Reinforced index finger': createUpgradeMock(
      'Reinforced index finger',
      100
    ),
    ...upgrades,
  };

  return {
    cookies,
    cookiesPs,
    unbuffedCps: cookiesPs,
    elderWrath: 0,
    Objects: defaultBuildings,
    Upgrades: defaultUpgrades,
    UpgradesInStore: upgradesInStore,
    UpgradesOwned: upgradesOwned,
    shimmers,
    wrinklers: [],
    mods: {},
    Has: mock(() => false),
    LoadMod: mock(),
  };
}
