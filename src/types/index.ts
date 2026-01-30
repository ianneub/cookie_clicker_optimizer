/**
 * Internal types for the Cookie Clicker Optimizer
 */

export interface Candidate {
  name: string;
  type: 'Building' | 'Upgrade';
  pp: number;
  price: number;
  affordable: boolean;
}

export interface GoldenUpgrade {
  name: string;
  type: 'GoldenUpgrade';
  price: number;
  affordable: boolean;
  prioritized: boolean;
  deferReason: string;
  hoursToAfford: number;
  gameUpgrade: { buy: () => void };
}

export interface GoldenUpgradeEvaluation {
  shouldPrioritize: boolean;
  reason: string;
  hoursToAfford: number;
}

export interface WrinklerStats {
  count: number;
  max: number;
  normalCount: number;
  shinyCount: number;
  totalSucked: number;
  popReward: number;
  multiplier: number;
}

export interface PopDecision {
  shouldPop: boolean;
  reason: string;
}

export type DragonAura =
  | 'No aura'
  | 'Breath of Milk'
  | 'Dragon Cursor'
  | 'Elder Battalion'
  | 'Reaper of Fields'
  | 'Earth Shatterer'
  | 'Master of the Armory'
  | 'Fierce Hoarder'
  | 'Dragon God'
  | 'Arcane Aura'
  | 'Dragonflight'
  | 'Ancestral Metamorphosis'
  | 'Unholy Dominion'
  | 'Epoch Manipulator'
  | 'Mind Over Matter'
  | 'Radiant Appetite'
  | "Dragon's Fortune"
  | "Dragon's Curve"
  | 'Reality Bending'
  | 'Dragon Orbs'
  | 'Supreme Intellect'
  | 'Dragon Guts';

export interface DragonConfig {
  aura1: DragonAura;
  aura2: DragonAura;
}

export interface DragonState {
  level: number;
  currentAura1: DragonAura;
  currentAura2: DragonAura;
  hasDualAuras: boolean;
}

export interface SwitchDecision {
  shouldSwitch: boolean;
  reason: string;
}

export interface OptimizerState {
  lastBuildingCount: number;
  lastUpgradeCount: number;
  refreshTimer: ReturnType<typeof setInterval> | null;
  isRunning: boolean;
  displayElement: HTMLElement | null;
  autoPurchase: boolean;
  autoGolden: boolean;
  autoWrath: boolean;
  autoWrinklers: boolean;
  autoDragon: boolean;
  lastDragonSwitch: number;
}

export interface AscensionInput {
  currentPrestige: number;
  cookiesReset: number;
  cookiesEarned: number;
  howMuchPrestige: (cookies: number) => number;
  heavenlyChips: number;
  unpurchasedUpgradeCost: number;
}

export interface AscensionStats {
  currentPrestige: number;
  pendingPrestige: number;
  percentIncrease: number;
  unpurchasedUpgradeCost: number;
  chipsDeficit: number;
  isGoodToAscend: boolean;
}

// Re-export game types
export * from './game';
export * from './cookieMonster';
