/**
 * Internal types for the Cookie Clicker Optimizer
 */

export type Phase = 'Early' | 'Mid' | 'Late' | 'Endgame';

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

export interface PurchaseCheckResult {
  purchased: boolean;
  newState: Pick<OptimizerState, 'lastBuildingCount' | 'lastUpgradeCount'>;
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
}

// Re-export game types
export * from './game';
export * from './cookieMonster';
