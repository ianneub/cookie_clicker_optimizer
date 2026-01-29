/**
 * Cookie Clicker Game API type definitions
 */

export interface Building {
  name: string;
  amount: number;
  price: number;
  locked: boolean;
  buy: (quantity: number) => void;
  getSumPrice: (quantity: number) => number;
}

export interface Upgrade {
  name: string;
  basePrice: number;
  bought: boolean;
  unlocked: boolean;
  buy: () => void;
  getPrice: () => number;
}

export interface Shimmer {
  type: string; // 'golden' | 'reindeer' - golden includes wrath cookies (wrath=1)
  wrath: number;
  pop: () => void;
}

export interface Wrinkler {
  phase: number; // 0 = inactive, 1 = spawning, 2 = active
  type: number; // 0 = normal, 1 = shiny
  sucked: number;
  hp: number;
}

export interface Buff {
  name: string;
  time: number;
  multCpS?: number;
}

export interface DragonLevel {
  name: string;
  cost: () => boolean;
  costStr: () => string;
}

export interface Game {
  cookies: number;
  cookiesPs: number;
  unbuffedCps: number;
  elderWrath: number;
  UpgradesOwned: number;
  Objects: Record<string, Building>;
  Upgrades: Record<string, Upgrade>;
  UpgradesInStore: Upgrade[];
  wrinklers: Wrinkler[];
  shimmers: Shimmer[];
  mods: Record<string, unknown>;
  buffs: Record<string, Buff>;
  dragonLevel: number;
  dragonLevels: DragonLevel[];
  dragonAura: number;
  dragonAura2: number;
  UpgradeDragon: () => void;
  recalculateGains: number;
  Has: (name: string) => boolean;
  hasAura: (name: string) => boolean;
  SelectDragonAura: (slot: number, aura: number) => void;
  SetDragonAura: (aura: number, slot: number) => void;
  LoadMod: (url: string) => void;
  ToggleSpecialMenu?: (on: number) => void;
  specialTab: string;
  getWrinklersMax?: () => number;
  ClosePrompt?: () => void;
  ConfirmPrompt?: () => void;
}

declare global {
  var Game: Game;
}
