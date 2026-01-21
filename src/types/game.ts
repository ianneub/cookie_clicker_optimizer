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
  type: string;
  wrath: number;
  pop: () => void;
}

export interface Wrinkler {
  phase: number; // 0 = inactive, 1 = spawning, 2 = active
  type: number; // 0 = normal, 1 = shiny
  sucked: number;
  hp: number;
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
  Has: (name: string) => boolean;
  LoadMod: (url: string) => void;
  getWrinklersMax?: () => number;
  ClosePrompt?: () => void;
}

declare global {
  var Game: Game;
}
